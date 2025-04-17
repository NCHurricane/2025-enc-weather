<?php
// update_tropical.php - Script to execute tropical data caching via cron job

// Add debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set execution time limit to 5 minutes
set_time_limit(300);

// Create a log function
function logMessage($message)
{
    $logDir = dirname(__FILE__) . '/logs/';

    // Create log directory if it doesn't exist
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }

    $logFile = $logDir . 'update_tropical.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message\n";

    file_put_contents($logFile, $logEntry, FILE_APPEND);

    // If running from CLI, also output to console
    if (php_sapi_name() === 'cli') {
        echo $logEntry;
    }
}

// Log start time and script information
logMessage("Starting tropical data update");
logMessage("PHP version: " . phpversion());
logMessage("Current user: " . get_current_user());
logMessage("Script path: " . __FILE__);
logMessage("Current directory: " . getcwd());

try {
    // Change to the directory of this script
    $scriptDir = dirname(__FILE__);
    logMessage("Changing to script directory: $scriptDir");
    chdir($scriptDir);

    // Check if cache directory exists, create if not
    $cacheDir = 'cache/';
    if (!is_dir($cacheDir)) {
        logMessage("Creating cache directory");
        mkdir($cacheDir, 0777, true);
        chmod($cacheDir, 0777);
    }

    // Verify the cache_tropical.php file exists
    $cacheScript = 'cache_tropical.php';
    if (!file_exists($cacheScript)) {
        throw new Exception("Cache script not found: $cacheScript");
    }

    // Execute the cache script
    logMessage("Executing cache_tropical.php");
    include_once($cacheScript);

    // Check if cache files were created
    $expectedFiles = [
        'tropical_two_at.json',
        'tropical_two_sat.json',
        'tropical_disc_at.json',
        'tropical_summary_at.json'
    ];

    foreach ($expectedFiles as $file) {
        $fullPath = $cacheDir . $file;
        if (file_exists($fullPath)) {
            $fileSize = filesize($fullPath);
            $timestamp = date('Y-m-d H:i:s', filemtime($fullPath));
            logMessage("Cache file exists: $file ($fileSize bytes, modified: $timestamp)");
        } else {
            logMessage("WARNING: Expected cache file not found: $file");
        }
    }

    // Log completion
    logMessage("Tropical data update completed successfully");
} catch (Exception $e) {
    logMessage("ERROR: " . $e->getMessage());
    logMessage("Stack trace: " . $e->getTraceAsString());
    exit(1);
}
