<?php

/**
 * NHC Data Cron Fetcher
 * 
 * This script is meant to be run via cron to pre-fetch and cache NHC data
 */

// Define source URL and cache file
$source_url = 'https://www.nhc.noaa.gov/CurrentStorms.json';
$cache_file = __DIR__ . '/cache/nhc_current_storms.json';

// Fetch data from NHC
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => [
            'User-Agent: NCHurricane.com Weather App/1.0 (Cron)',
            'Accept: application/json'
        ],
        'timeout' => 30
    ]
]);

echo "Fetching data from NHC...\n";
$data = @file_get_contents($source_url, false, $context);

if ($data === false) {
    echo "Failed to fetch data using file_get_contents()\n";

    // Try curl as fallback
    if (function_exists('curl_init')) {
        echo "Trying curl as fallback...\n";
        $ch = curl_init($source_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'User-Agent: NCHurricane.com Weather App/1.0 (Cron)',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $data = curl_exec($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($data === false) {
            echo "Curl fetch failed: $curl_error\n";
            exit(1);
        }
    } else {
        echo "Curl not available. Exiting.\n";
        exit(1);
    }
}

// Validate JSON
$decoded = json_decode($data);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "Received invalid JSON data. Exiting.\n";
    exit(1);
}

// Ensure cache directory exists
$cache_dir = dirname($cache_file);
if (!is_dir($cache_dir)) {
    echo "Creating cache directory: $cache_dir\n";
    mkdir($cache_dir, 0755, true);
}

// Save to cache file
$bytes = file_put_contents($cache_file, $data);
echo "Saved " . $bytes . " bytes to cache file: $cache_file\n";

// Count active storms
$activeCount = count($decoded->activeStorms ?? []);
echo "Active storms: $activeCount\n";

// Output success
echo "NHC data successfully updated at " . date('Y-m-d H:i:s') . "\n";
exit(0);
