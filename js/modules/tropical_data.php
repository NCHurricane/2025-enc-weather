<?php
/**
 * Tropical Storm Data Handler (NCHurricane 2025)
 *
 * Roles:
 *  1) Writer: fetch NHC JSON and cache it (cron or manual)
 *  2) API:   serve cached JSON to the browser
 *
 * Usage:
 *  - Browser/API:  /js/modules/tropical_data.php
 *  - Cron:         php8.4 /path/to/js/modules/tropical_data.php --cron
 *
 * Notes:
 *  - Writes BOTH:
 *      cache/nhc_current_storms.json        (legacy/primary)
 *      cache/tropical_summary_at.json       (explicit for your JS readers)
 *  - Atomic writes (temp + rename) to avoid partial files
 *  - TTL: 30 minutes (1800s) per project playbook
 *  - Per your request: NO references to any hurricane-season on/off logic.
 */

declare(strict_types=1);

// ---- CONFIG ----
$config = [
    // Primary source for current storms
    'source_url'  => 'https://www.nhc.noaa.gov/CurrentStorms.json',

    // Cache outputs (absolute, using script directory)
    'cache_file'  => __DIR__ . '/cache/nhc_current_storms.json',
    'summary_file'=> __DIR__ . '/cache/tropical_summary_at.json',

    // TTL policy (seconds): 30 minutes
    'cache_ttl'   => 1800,

    // Headers + logging
    'user_agent'  => 'NCHurricane.com Weather App/1.0 (Tropical Data Handler)',
    'log_file'    => __DIR__ . '/logs/tropical_data.log'
];

// Execution context
$is_cli   = (php_sapi_name() === 'cli');
$is_cron  = $is_cli && in_array('--cron', $argv ?? [], true);
$force    = isset($_GET['refresh']) || $is_cron;

// ---- UTILS ----
function ensureDirectories(): void {
    global $config;
    $dirs = [
        dirname($config['cache_file']),
        dirname($config['summary_file']),
        dirname($config['log_file'])
    ];
    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0777, true)) {
                $e = error_get_last();
                throw new RuntimeException("Failed to create dir {$dir}: " . ($e['message'] ?? 'unknown'));
            }
            @chmod($dir, 0777);
        }
    }
}

function logMessage(string $msg, string $level = 'INFO'): void {
    global $config, $is_cli;
    $line = '[' . date('Y-m-d H:i:s') . "][{$level}] {$msg}\n";
    if ($is_cli) {
        // Send to STDERR for cron piping; file log too
        file_put_contents('php://stderr', $line);
    }
    @file_put_contents($config['log_file'], $line, FILE_APPEND);
}

function writeJsonAtomic(string $filepath, array $payload): bool {
    $dir = dirname($filepath);
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
        logMessage("Cannot create cache dir: {$dir}", 'ERROR');
        return false;
    }
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        logMessage("JSON encode failed for {$filepath}", 'ERROR');
        return false;
    }
    $tmp = $filepath . '.tmp-' . bin2hex(random_bytes(4));
    $fp = @fopen($tmp, 'wb');
    if (!$fp) {
        logMessage("Cannot open temp file: {$tmp}", 'ERROR');
        return false;
    }
    $ok = false;
    try {
        if (!flock($fp, LOCK_EX)) {
            throw new RuntimeException("LOCK_EX failed: {$tmp}");
        }
        if (fwrite($fp, $json) === false) {
            throw new RuntimeException("Write failed: {$tmp}");
        }
        fflush($fp);
        $ok = true;
    } catch (Throwable $t) {
        logMessage($t->getMessage(), 'ERROR');
    } finally {
        fclose($fp);
    }
    if (!$ok) {
        @unlink($tmp);
        return false;
    }
    if (!@rename($tmp, $filepath)) {
        @unlink($tmp);
        logMessage("Atomic rename failed to {$filepath}", 'ERROR');
        return false;
    }
    return true;
}

function isCacheFresh(string $file, int $ttl): bool {
    if (!is_file($file)) return false;
    return (time() - filemtime($file)) <= $ttl;
}

function getCacheAge(string $file): int {
    if (!is_file($file)) return PHP_INT_MAX;
    return time() - filemtime($file);
}

function fetchData(string $url): ?array {
    global $config;

    // Try file_get_contents first
    $context = stream_context_create([
        'http' => [
            'method'  => 'GET',
            'header'  => [
                'User-Agent: ' . $config['user_agent'],
                'Accept: application/json'
            ],
            'timeout' => 30,
            'follow_location' => 1
        ]
    ]);
    $body = @file_get_contents($url, false, $context);

    if ($body === false) {
        logMessage("file_get_contents failed; falling back to cURL");
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_USERAGENT      => $config['user_agent'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);
        if ($body === false || $code < 200 || $code >= 300) {
            logMessage("cURL failed (HTTP {$code}): {$err}", 'ERROR');
            return null;
        }
    }

    $data = json_decode($body, true);
    if ($data === null) {
        logMessage("JSON decode failed for {$url}", 'ERROR');
        return null;
    }
    return $data;
}

function loadCache(): ?array {
    global $config;
    if (!is_file($config['cache_file'])) return null;
    $raw = @file_get_contents($config['cache_file']);
    if ($raw === false) return null;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

function saveBothCaches(array $sourcePayload): bool {
    global $config;

    // We wrap the source payload with minimal metadata so both files share a shape.
    $wrapped = [
        'metadata' => [
            'cached_at'            => time(),
            'cached_at_iso'        => date('c'),
            'source'               => $config['source_url'],
            'ttl_seconds'          => $config['cache_ttl'],
            'note'                 => 'Atomic write; identical payload written to both files',
        ],
        'data' => $sourcePayload
    ];

    $ok1 = writeJsonAtomic($config['cache_file'], $wrapped);
    $ok2 = writeJsonAtomic($config['summary_file'], $wrapped);

    if (!$ok1 || !$ok2) {
        if (!$ok1) logMessage('Failed to write cache_file', 'ERROR');
        if (!$ok2) logMessage('Failed to write summary_file', 'ERROR');
        return false;
    }
    logMessage('Wrote cache_file and summary_file successfully');
    return true;
}

// ---- MAIN ----
try {
    ensureDirectories();

    $fresh = isCacheFresh($config['cache_file'], $config['cache_ttl']);
    if ($force) {
        logMessage('Force refresh requested');
    } else {
        logMessage('Cache age: ' . getCacheAge($config['cache_file']) . 's; fresh=' . ($fresh ? 'yes' : 'no'));
    }

    if ($force || !$fresh) {
        $src = fetchData($config['source_url']);
        if ($src !== null) {
            if (!saveBothCaches($src)) {
                // Failed to write new cache; try to serve the last-known-good cache
                $cached = loadCache();
                if ($cached === null) {
                    throw new RuntimeException('No cache available after failed write');
                }
            }
        } else {
            logMessage('Fetch failed; falling back to existing cache', 'ERROR');
            $cached = loadCache();
            if ($cached === null) {
                throw new RuntimeException('No cache available and fetch failed');
            }
        }
    }

    // Serve current cache content (consistent API result)
    $current = loadCache();
    if ($current === null) {
        // If still null, serve safe empty structure
        $current = ['metadata' => ['cached_at' => null, 'cached_at_iso' => null], 'data' => []];
    }

    if ($is_cli) {
        // For cron/logs
        echo "OK " . ($current['metadata']['cached_at_iso'] ?? 'n/a') . PHP_EOL;
        exit(0);
    } else {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($current, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

} catch (Throwable $e) {
    logMessage('Unhandled exception: ' . $e->getMessage(), 'ERROR');
    if ($is_cli) {
        fwrite(STDERR, "ERROR: " . $e->getMessage() . PHP_EOL);
        exit(1);
    } else {
        header('Content-Type: application/json; charset=utf-8', true, 500);
        echo json_encode(['error' => 'tropical_data failure', 'detail' => $e->getMessage()]);
        exit;
    }
}