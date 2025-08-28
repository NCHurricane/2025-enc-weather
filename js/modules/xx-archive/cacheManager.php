<?php

/**
 * Unified Cache Manager
 * Consolidates all cache operations into a single, maintainable script
 * Replaces: refresh_all.php, force_refresh.php, maintain_cache.php, and dashboard refresh logic
 */

class CacheManager
{
    private $config;
    private $lockFile;
    private $logFile;
    private $isCliMode;

    public function __construct()
    {
        $this->config = [
            'cache_dir' => __DIR__ . '/cache/',
            'log_dir' => __DIR__ . '/logs/',
            'lock_file' => __DIR__ . '/cache.lock',
            'log_file' => __DIR__ . '/logs/cache_manager.log',
            'ttl' => [
                'weather' => 900,        // 15 minutes
                'alerts' => 300,         // 5 minutes
                'forecasts' => 1800,     // 30 minutes
                'afd' => 3600,          // 1 hour
                'tropical' => 1800,      // 30 minutes
                'health' => 86400       // 24 hours
            ],
            'api_delay' => 500000,      // 0.5 seconds between API calls
            'lock_timeout' => 1800      // 30 minutes
        ];

        $this->isCliMode = (php_sapi_name() === 'cli');
        $this->ensureDirectories();
    }

    /**
     * Main entry point for cache operations
     */
    public function execute($action = 'status', $params = [])
    {
        // Acquire lock to prevent concurrent executions
        if (!$this->acquireLock()) {
            return $this->response('error', 'Another cache operation is in progress');
        }

        try {
            switch ($action) {
                case 'refresh':
                    return $this->refresh($params['type'] ?? 'all', $params['county'] ?? null);

                case 'status':
                    return $this->getStatus();

                case 'health':
                    return $this->checkHealth();

                case 'clear':
                    return $this->clearCache($params['type'] ?? 'all');

                case 'schedule':
                    return $this->getSchedule();

                default:
                    return $this->response('error', 'Invalid action');
            }
        } finally {
            $this->releaseLock();
        }
    }

    /**
     * Refresh cache for specified type(s)
     */
    private function refresh($type = 'all', $county = null)
    {
        $this->log("Starting cache refresh: type=$type" . ($county ? ", county=$county" : ""));

        $types = ($type === 'all') ? ['weather', 'alerts', 'forecasts', 'afd', 'tropical'] : [$type];
        $results = [];
        $success = true;

        foreach ($types as $cacheType) {
            $startTime = microtime(true);

            try {
                switch ($cacheType) {
                    case 'weather':
                        $result = $this->refreshWeather($county);
                        break;

                    case 'alerts':
                        $result = $this->refreshAlerts($county);
                        break;

                    case 'forecasts':
                        $result = $this->refreshForecasts($county);
                        break;

                    case 'afd':
                        $result = $this->refreshAFD();
                        break;

                    case 'tropical':
                        $result = $this->refreshTropical();
                        break;

                    default:
                        throw new Exception("Unknown cache type: $cacheType");
                }

                $executionTime = round(microtime(true) - $startTime, 2);
                $results[$cacheType] = [
                    'success' => true,
                    'time' => $executionTime,
                    'message' => $result
                ];

                $this->log("$cacheType refresh completed in {$executionTime}s");
            } catch (Exception $e) {
                $success = false;
                $results[$cacheType] = [
                    'success' => false,
                    'error' => $e->getMessage()
                ];

                $this->log("Error refreshing $cacheType: " . $e->getMessage(), 'ERROR');
            }

            // Delay between cache operations to avoid rate limiting
            if (count($types) > 1) {
                usleep($this->config['api_delay']);
            }
        }

        // Update status file
        $this->updateStatus([
            'lastRun' => time(),
            'lastRunType' => $type,
            'success' => $success,
            'results' => $results
        ]);

        return $this->response(
            $success ? 'success' : 'partial',
            'Cache refresh completed',
            $results
        );
    }

    /**
     * Get current cache status
     */
    private function getStatus()
    {
        $status = [
            'cache_files' => [],
            'system' => [
                'uptime' => $this->getSystemUptime(),
                'memory' => $this->getMemoryUsage(),
                'disk' => $this->getDiskUsage()
            ]
        ];

        // Check each cache file
        $files = glob($this->config['cache_dir'] . '*.json');
        foreach ($files as $file) {
            $filename = basename($file);
            $fileInfo = [
                'size' => filesize($file),
                'modified' => filemtime($file),
                'age' => time() - filemtime($file),
                'age_formatted' => $this->formatAge(time() - filemtime($file))
            ];

            // Determine if cache is stale
            $type = $this->getCacheTypeFromFilename($filename);
            $ttl = $this->config['ttl'][$type] ?? 3600;
            $fileInfo['stale'] = $fileInfo['age'] > $ttl;

            $status['cache_files'][$filename] = $fileInfo;
        }

        // Read last run status if available
        $statusFile = $this->config['cache_dir'] . 'cache_status.json';
        if (file_exists($statusFile)) {
            $lastRun = json_decode(file_get_contents($statusFile), true);
            $status['last_run'] = $lastRun;
        }

        return $this->response('success', 'Status retrieved', $status);
    }

    /**
     * Check system health
     */
    private function checkHealth()
    {
        $health = [
            'status' => 'healthy',
            'checks' => []
        ];

        // Check cache directory is writable
        $health['checks']['cache_writable'] = is_writable($this->config['cache_dir']);

        // Check for stale cache files
        $staleCount = 0;
        $totalCount = 0;
        $files = glob($this->config['cache_dir'] . '*.json');

        foreach ($files as $file) {
            $totalCount++;
            $age = time() - filemtime($file);
            $type = $this->getCacheTypeFromFilename(basename($file));
            $ttl = $this->config['ttl'][$type] ?? 3600;

            if ($age > $ttl * 2) { // Consider stale if twice the TTL
                $staleCount++;
            }
        }

        $health['checks']['stale_files'] = [
            'count' => $staleCount,
            'total' => $totalCount,
            'percentage' => $totalCount > 0 ? round(($staleCount / $totalCount) * 100, 2) : 0
        ];

        // Check API connectivity (quick test)
        $health['checks']['nws_api'] = $this->checkAPIConnectivity();

        // Determine overall health
        if (!$health['checks']['cache_writable'] || !$health['checks']['nws_api']) {
            $health['status'] = 'critical';
        } elseif ($health['checks']['stale_files']['percentage'] > 50) {
            $health['status'] = 'warning';
        }

        // Run refresh if health is poor
        if ($health['status'] !== 'healthy') {
            $health['auto_refresh'] = true;
            $this->refresh('all');
        }

        return $this->response('success', 'Health check completed', $health);
    }

    /**
     * Clear cache files
     */
    private function clearCache($type = 'all')
    {
        $cleared = 0;
        $pattern = ($type === 'all') ? '*.json' : "*_{$type}.json";
        $files = glob($this->config['cache_dir'] . $pattern);

        foreach ($files as $file) {
            if (unlink($file)) {
                $cleared++;
                $this->log("Cleared cache file: " . basename($file));
            }
        }

        return $this->response('success', "Cleared $cleared cache files");
    }

    /**
     * Get recommended cache refresh schedule
     */
    private function getSchedule()
    {
        $schedule = [];

        foreach ($this->config['ttl'] as $type => $seconds) {
            $schedule[$type] = [
                'ttl_seconds' => $seconds,
                'ttl_minutes' => round($seconds / 60),
                'recommended_cron' => $this->getCronExpression($seconds)
            ];
        }

        return $this->response('success', 'Schedule generated', $schedule);
    }

    /**
     * Individual cache refresh methods
     */
    private function refreshWeather($county = null)
    {
        // Implementation will call the existing cache_weather.php logic
        // but return structured data instead of just logging
        ob_start();
        include __DIR__ . '/cache_weather.php';
        $output = ob_get_clean();
        return "Weather data refreshed" . ($county ? " for $county" : " for all counties");
    }

    private function refreshAlerts($county = null)
    {
        ob_start();
        include __DIR__ . '/cache_alerts.php';
        $output = ob_get_clean();
        return "Alerts refreshed";
    }

    private function refreshForecasts($county = null)
    {
        ob_start();
        include __DIR__ . '/cache_forecasts.php';
        $output = ob_get_clean();
        return "Forecasts refreshed";
    }

    private function refreshAFD()
    {
        ob_start();
        include __DIR__ . '/cache_afd.php';
        $output = ob_get_clean();
        return "AFD refreshed";
    }

    private function refreshTropical()
    {
        ob_start();
        include __DIR__ . '/cache_tropical.php';
        $output = ob_get_clean();
        return "Tropical data refreshed";
    }

    /**
     * Utility methods
     */
    private function acquireLock()
    {
        if (file_exists($this->config['lock_file'])) {
            $lockAge = time() - filemtime($this->config['lock_file']);
            if ($lockAge < $this->config['lock_timeout']) {
                return false;
            }
            // Stale lock, remove it
            unlink($this->config['lock_file']);
        }

        return file_put_contents($this->config['lock_file'], getmypid() . "\n" . date('Y-m-d H:i:s'));
    }

    private function releaseLock()
    {
        if (file_exists($this->config['lock_file'])) {
            unlink($this->config['lock_file']);
        }
    }

    private function log($message, $level = 'INFO')
    {
        $entry = sprintf("[%s] [%s] %s\n", date('Y-m-d H:i:s'), $level, $message);
        file_put_contents($this->config['log_file'], $entry, FILE_APPEND);

        if ($this->isCliMode) {
            echo $entry;
        }
    }

    private function response($status, $message, $data = null)
    {
        $response = [
            'status' => $status,
            'message' => $message,
            'timestamp' => time()
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        if (!$this->isCliMode) {
            header('Content-Type: application/json');
            echo json_encode($response);
        } else {
            echo $message . "\n";
            if ($data && is_array($data)) {
                print_r($data);
            }
        }

        return $response;
    }

    private function ensureDirectories()
    {
        foreach (['cache_dir', 'log_dir'] as $dir) {
            if (!is_dir($this->config[$dir])) {
                mkdir($this->config[$dir], 0755, true);
            }
        }
    }

    private function updateStatus($data)
    {
        $statusFile = $this->config['cache_dir'] . 'cache_status.json';
        file_put_contents($statusFile, json_encode($data, JSON_PRETTY_PRINT));
    }

    private function getCacheTypeFromFilename($filename)
    {
        if (strpos($filename, '_weather.json') !== false) return 'weather';
        if (strpos($filename, '_alerts.json') !== false) return 'alerts';
        if (strpos($filename, '_forecast.json') !== false) return 'forecasts';
        if (strpos($filename, 'afd_') !== false) return 'afd';
        if (strpos($filename, 'tropical') !== false) return 'tropical';
        return 'unknown';
    }

    private function formatAge($seconds)
    {
        if ($seconds < 60) return $seconds . 's';
        if ($seconds < 3600) return round($seconds / 60) . 'm';
        if ($seconds < 86400) return round($seconds / 3600) . 'h';
        return round($seconds / 86400) . 'd';
    }

    private function getCronExpression($seconds)
    {
        if ($seconds <= 300) return '*/5 * * * *';      // Every 5 minutes
        if ($seconds <= 900) return '*/15 * * * *';     // Every 15 minutes  
        if ($seconds <= 1800) return '*/30 * * * *';    // Every 30 minutes
        if ($seconds <= 3600) return '0 * * * *';       // Every hour
        return '0 */6 * * *';                           // Every 6 hours
    }

    private function checkAPIConnectivity()
    {
        $testUrl = 'https://api.weather.gov/';
        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'user_agent' => 'NCHurricane.com CacheManager/1.0'
            ]
        ]);

        $result = @file_get_contents($testUrl, false, $context);
        return $result !== false;
    }

    private function getSystemUptime()
    {
        if ($this->isCliMode && file_exists('/proc/uptime')) {
            $uptime = file_get_contents('/proc/uptime');
            $seconds = (int)explode(' ', $uptime)[0];
            return $this->formatAge($seconds);
        }
        return 'N/A';
    }

    private function getMemoryUsage()
    {
        return [
            'current' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB',
            'peak' => round(memory_get_peak_usage() / 1024 / 1024, 2) . ' MB'
        ];
    }

    private function getDiskUsage()
    {
        $free = disk_free_space($this->config['cache_dir']);
        $total = disk_total_space($this->config['cache_dir']);

        return [
            'free' => round($free / 1024 / 1024 / 1024, 2) . ' GB',
            'total' => round($total / 1024 / 1024 / 1024, 2) . ' GB',
            'used_percentage' => round((($total - $free) / $total) * 100, 2) . '%'
        ];
    }
}

// Entry point
if (php_sapi_name() === 'cli') {
    // CLI mode
    $manager = new CacheManager();

    // Parse command line arguments
    $action = $argv[1] ?? 'status';
    $params = [];

    // Parse additional parameters
    for ($i = 2; $i < $argc; $i++) {
        if (strpos($argv[$i], '--') === 0) {
            $parts = explode('=', substr($argv[$i], 2), 2);
            $params[$parts[0]] = $parts[1] ?? true;
        }
    }

    // Execute action
    $manager->execute($action, $params);
} else {
    // Web mode - act as API endpoint
    header('Content-Type: application/json');

    // Get parameters from request
    $action = $_REQUEST['action'] ?? 'status';
    $params = [
        'type' => $_REQUEST['type'] ?? null,
        'county' => $_REQUEST['county'] ?? null
    ];

    // Execute action
    $manager = new CacheManager();
    $manager->execute($action, $params);
}
