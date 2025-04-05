<?php
// get_weather_data.php

// Configuration (should match cache_temperatures.php)
$cache_file = __DIR__ . '/weather_cache.json';
$cache_duration = 60 * 60; // 1 hour in seconds

header('Content-Type: application/json'); // Set response type

$response_data = ['error' => 'Cache unavailable or stale.'];
$serve_cache = false;

// Check if cache file exists
if (file_exists($cache_file)) {
    $cache_content = file_get_contents($cache_file);
    $existing_cache = json_decode($cache_content, true);

    // Check if JSON is valid and timestamp exists
    if (json_last_error() === JSON_ERROR_NONE && isset($existing_cache['timestamp'])) {
        // Check cache age using the server's current time
        // Note: This uses the server's clock, but consistently.
        $cache_age = time() - $existing_cache['timestamp'];

        if ($cache_age < $cache_duration) {
            // Cache is valid, prepare to serve its content
            $serve_cache = true;
            $response_data = $existing_cache; // Use the actual cached data
        } else {
            // Cache is expired according to server's clock
            $response_data['error'] = 'Cache expired (age: ' . $cache_age . 's).';
        }
    } else {
         $response_data['error'] = 'Cache file invalid format.';
    }
} else {
     $response_data['error'] = 'Cache file not found.';
}

// Output the JSON response
echo json_encode($response_data);
exit; // Important to prevent further output

?>