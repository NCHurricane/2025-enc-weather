<?php
// maintain_cache.php - Cleans up corrupted files and performs maintenance

// Configuration
$cacheDir = 'cache/';
$logFile = 'cache_maintain.log';
$maxFileAge = 86400; // 24 hours

// Get all JSON files
$cacheFiles = glob($cacheDir . '*.json');
logMessage("Starting cache maintenance. Found " . count($cacheFiles) . " files");

$corrupted = 0;
$tooOld = 0;
$zeroSize = 0;

// Check each file for issues
foreach ($cacheFiles as $file) {
    $filename = basename($file);
    $fileSize = filesize($file);
    $fileAge = time() - filemtime($file);
    
    // Check if file is empty
    if ($fileSize === 0) {
        logMessage("Removing zero-size file: $filename");
        unlink($file);
        $zeroSize++;
        continue;
    }
    
    // Check if file is too old (24 hours)
    if ($fileAge > $maxFileAge) {
        logMessage("Removing too old file: $filename (age: " . round($fileAge/3600, 1) . " hours)");
        unlink($file);
        $tooOld++;
        continue;
    }
    
    // Check if file is corrupted JSON
    $content = file_get_contents($file);
    json_decode($content);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logMessage("Removing corrupted file: $filename (JSON error: " . json_last_error_msg() . ")");
        unlink($file);
        $corrupted++;
    }
}

// Report results
$message = "Maintenance completed. Removed files: $corrupted corrupted, $tooOld too old, $zeroSize zero-size";
logMessage($message);

// Function to log message
function logMessage($message) {
    global $logFile;
    
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}
?>