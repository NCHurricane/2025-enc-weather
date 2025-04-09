<?php
// refresh_all.php - Master script to run all caching operations

// Configuration
$logFile = 'cache_log.txt';
$lockFile = 'cache_lock.txt';

// Check if another process is already running
if (file_exists($lockFile)) {
    $lockTime = filectime($lockFile);
    $currentTime = time();
    
    // If lock file is older than 30 minutes, it's probably stale
    if ($currentTime - $lockTime < 1800) {
        die("Another caching process is already running. If this is incorrect, delete the lock file: $lockFile\n");
    } else {
        error_log("Found stale lock file. Continuing execution.");
    }
}

// Create lock file
file_put_contents($lockFile, date('Y-m-d H:i:s'));

// Initialize log with timestamp
$logMessage = "=== Cache Refresh Started at " . date('Y-m-d H:i:s') . " ===\n";

// Function to run a script and capture output
function runScript($scriptName) {
    global $logMessage;
    
    $logMessage .= "\n--- Running $scriptName ---\n";
    $startTime = microtime(true);
    
    // Start output buffering to capture error messages
    ob_start();
    
    // Run the script
    include_once($scriptName);
    
    // Get any output
    $output = ob_get_clean();
    
    $endTime = microtime(true);
    $executionTime = round($endTime - $startTime, 2);
    
    $logMessage .= "$scriptName completed in $executionTime seconds\n";
    if (!empty($output)) {
        $logMessage .= "Output: $output\n";
    }
    
    return $executionTime;
}

// Run each caching script
$scripts = [
    'cache_weather.php',
    'cache_alerts.php',
    'cache_forecasts.php',
    'cache_afd.php'
];

$totalTime = 0;
foreach ($scripts as $script) {
    $scriptTime = runScript($script);
    $totalTime += $scriptTime;
    
    // Add a small delay between scripts
    sleep(2);
}

// Write status file for monitoring
$statusData = [
    'lastRun' => time(),
    'lastRunFormatted' => date('Y-m-d H:i:s'),
    'executionTime' => $totalTime,
    'success' => true
];
file_put_contents('cache_status.json', json_encode($statusData));

// Clean up lock file
unlink($lockFile);

// Complete the log
$logMessage .= "\n=== Cache Refresh Completed at " . date('Y-m-d H:i:s') . " ===\n";
$logMessage .= "Total execution time: $totalTime seconds\n";

// Append to log file
file_put_contents($logFile, $logMessage, FILE_APPEND);

// Output completion message
echo "Cache refresh completed successfully in $totalTime seconds.\n";
?>