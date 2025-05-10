<?php

/**
 * Tropical Storm Data Handler
 * 
 * This consolidated script serves multiple purposes:
 * 1. Acts as an API endpoint for browser-based JavaScript requests
 * 2. Handles caching of tropical storm data from NHC
 * 3. Can be run as a cron job to refresh the cache periodically
 * 
 * Usage as API: Simply request this script from the browser
 * Usage as cron: php /path/to/tropical_data.php --cron
 */

// Basic error handling
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Configuration
$config = [
    'source_url' => 'https://www.nhc.noaa.gov/CurrentStorms.json',
    'cache_file' => __DIR__ . '/cache/nhc_current_storms.json',
    'cache_ttl' => 1800, // Cache Time-To-Live in seconds (30 minutes)
    'user_agent' => 'NCHurricane.com Weather App/1.0 (Weather Data Handler)',
    'log_file' => __DIR__ . '/logs/tropical_data.log'
];

// Determine execution context
$is_cli = (php_sapi_name() === 'cli');
$is_cron = $is_cli && (isset($argv[1]) && $argv[1] === '--cron');
$force_refresh = isset($_GET['refresh']) || $is_cron;

// Ensure necessary directories exist
ensureDirectories();

// Set appropriate headers for browser requests
if (!$is_cli) {
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, must-revalidate');
}

// Start logging
logMessage("Tropical data handler initiated" . ($is_cron ? " (cron mode)" : "") .
    ($force_refresh ? " (forced refresh)" : ""));

// Main process
try {
    // Check if we need fresh data
    $need_fresh_data = $force_refresh || !isCacheFresh();

    if ($need_fresh_data) {
        // Fetch fresh data
        logMessage("Fetching fresh data from NHC");
        $data = fetchData($config['source_url']);

        if ($data !== false) {
            // Validate data
            if (isValidJson($data)) {
                // Save to cache
                if (saveCache($data)) {
                    logMessage("Fresh data cached successfully");
                } else {
                    logMessage("Failed to write cache file", "ERROR");
                }
            } else {
                logMessage("Received invalid JSON data", "ERROR");
                $data = loadCache(); // Fall back to cache
            }
        } else {
            logMessage("Failed to fetch data from source", "ERROR");
            $data = loadCache(); // Fall back to cache
        }
    } else {
        // Use cached data
        logMessage("Using cached data (age: " . getCacheAge() . " seconds)");
        $data = loadCache();
    }

    // Output or return the data
    if ($is_cli) {
        logMessage("Process completed successfully");
        if ($is_cron) {
            exit(0); // Success for cron
        } else {
            echo "Data retrieved successfully.\n";
            exit(0);
        }
    } else {
        // Browser request - return the JSON data
        echo $data ?: json_encode(['activeStorms' => []]);
        exit;
    }
} catch (Exception $e) {
    $error_message = "Error: " . $e->getMessage();
    logMessage($error_message, "ERROR");

    if ($is_cli) {
        echo $error_message . "\n";
        exit(1); // Error code for CLI
    } else {
        // Return empty data structure for browser requests
        echo json_encode(['activeStorms' => [], 'error' => $error_message]);
        exit;
    }
}

/**
 * UTILITY FUNCTIONS
 */

/**
 * Ensures all necessary directories exist
 */
function ensureDirectories()
{
    global $config;

    $directories = [
        dirname($config['cache_file']), // Cache directory
        dirname($config['log_file'])    // Log directory
    ];

    foreach ($directories as $dir) {
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0777, true)) {
                $error = error_get_last();
                throw new Exception("Failed to create directory {$dir}: " .
                    ($error ? $error['message'] : 'Unknown error'));
            }
            chmod($dir, 0777); // Ensure writable permissions
        }
    }
}

/**
 * Logs a message with timestamp
 * @param string $message Message to log
 * @param string $level Log level (INFO, WARNING, ERROR)
 */
function logMessage($message, $level = "INFO")
{
    global $config, $is_cli;

    $date = date('Y-m-d H:i:s');
    $log_entry = "[$date] [$level] $message\n";

    // Append to log file
    file_put_contents($config['log_file'], $log_entry, FILE_APPEND);

    // Echo to console if CLI
    if ($is_cli) {
        echo $log_entry;
    }
}

/**
 * Checks if the cache file exists and is not expired
 * @return bool True if cache is fresh, false otherwise
 */
function isCacheFresh()
{
    global $config;

    if (!file_exists($config['cache_file'])) {
        return false;
    }

    $cache_age = getCacheAge();
    return ($cache_age < $config['cache_ttl']);
}

/**
 * Gets the age of the cache file in seconds
 * @return int Age in seconds or PHP_INT_MAX if file doesn't exist
 */
function getCacheAge()
{
    global $config;

    if (!file_exists($config['cache_file'])) {
        return PHP_INT_MAX;
    }

    return time() - filemtime($config['cache_file']);
}

/**
 * Fetches data from the source URL
 * @param string $url Source URL
 * @return string|false Data or false on failure
 */
function fetchData($url)
{
    global $config;

    // Try file_get_contents first
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => [
                'User-Agent: ' . $config['user_agent'],
                'Accept: application/json'
            ],
            'timeout' => 30
        ]
    ]);

    $data = @file_get_contents($url, false, $context);

    // If file_get_contents fails, try curl as fallback
    if ($data === false && function_exists('curl_init')) {
        logMessage("file_get_contents failed, trying curl fallback");

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'User-Agent: ' . $config['user_agent'],
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $data = curl_exec($ch);

        if (curl_errno($ch)) {
            logMessage("Curl error: " . curl_error($ch), "ERROR");
        }

        curl_close($ch);
    }

    return $data;
}

/**
 * Validates if a string is valid JSON
 * @param string $data JSON string to validate
 * @return bool True if valid JSON, false otherwise
 */
function isValidJson($data)
{
    json_decode($data);
    return (json_last_error() === JSON_ERROR_NONE);
}

/**
 * Saves data to the cache file
 * @param string $data Data to save
 * @return bool True on success, false on failure
 */
function saveCache($data)
{
    global $config;

    $result = file_put_contents($config['cache_file'], $data);

    if ($result !== false) {
        // Count active storms for logging
        $decoded = json_decode($data, true);
        $active_count = count($decoded['activeStorms'] ?? []);
        logMessage("Cached data with $active_count active storms");

        return true;
    }

    return false;
}

/**
 * Loads data from the cache file
 * @return string|false Data or false if cache doesn't exist
 */
function loadCache()
{
    global $config;

    if (file_exists($config['cache_file'])) {
        return file_get_contents($config['cache_file']);
    }

    return false;
}
