<?php
// cache_health.php - Simple endpoint to check cache health

header('Content-Type: application/json');

// Configuration
$cacheDir = 'cache/';
$statusFile = 'cache_status.json';
$maxCacheAge = 3600; // 1 hour maximum cache age

// Check if status file exists
if (!file_exists($statusFile)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Cache status file not found',
        'lastRun' => null,
        'cacheAge' => null,
        'isFresh' => false
    ]);
    exit;
}

// Read status file
$statusJson = file_get_contents($statusFile);
$status = json_decode($statusJson, true);

if (!$status || !isset($status['lastRun'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid cache status format',
        'lastRun' => null,
        'cacheAge' => null,
        'isFresh' => false
    ]);
    exit;
}

// Calculate cache age
$currentTime = time();
$cacheAge = $currentTime - $status['lastRun'];
$isFresh = $cacheAge < $maxCacheAge;

// Check if cache directory exists and is readable
$isCacheDirValid = is_dir($cacheDir) && is_readable($cacheDir);

// Count cache files
$cacheFileCount = 0;
if ($isCacheDirValid) {
    $cacheFiles = glob($cacheDir . '*.json');
    $cacheFileCount = count($cacheFiles);
}

// Return health status
echo json_encode([
    'status' => $isFresh && $isCacheDirValid ? 'ok' : 'stale',
    'message' => $isFresh && $isCacheDirValid ? 'Cache is fresh' : 'Cache is stale or invalid',
    'lastRun' => $status['lastRunFormatted'],
    'cacheAge' => [
        'seconds' => $cacheAge,
        'minutes' => round($cacheAge / 60, 1),
        'hours' => round($cacheAge / 3600, 2)
    ],
    'isFresh' => $isFresh,
    'cacheDir' => [
        'valid' => $isCacheDirValid,
        'fileCount' => $cacheFileCount
    ]
]);
?>