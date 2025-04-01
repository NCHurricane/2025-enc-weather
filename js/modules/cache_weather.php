<?php
// cache_weather.php

// Set the default timezone
date_default_timezone_set('America/New_York');

// Define the path for weather_cache.json using the current directory
$jsonFilePath = __DIR__ . '/weather_cache.json';

// Define the location (for Greenville, NC or your chosen location)
$lat = '35.6127';
$lon = '-77.3664';

// Helper function to fetch data via cURL
function fetchData($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15); // Set a timeout
    curl_setopt($ch, CURLOPT_USERAGENT, 'NCHurricane.com Weather App'); // Set a user agent
    $response = curl_exec($ch);
    
    // Check for cURL errors
    if (curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new Exception("cURL Error: $error");
    }
    
    // Check HTTP status code
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($statusCode >= 400) {
        throw new Exception("HTTP Error: Status code $statusCode");
    }
    
    return $response;
}

try {
    // Fetch point information
    $pointsUrl = "https://api.weather.gov/points/{$lat},{$lon}";
    $pointsResponse = fetchData($pointsUrl);
    $pointsData = json_decode($pointsResponse, true);

    if (!isset($pointsData['properties'])) {
        throw new Exception('Error fetching point data: Invalid response format');
    }

    // Fetch observation stations
    $stationsUrl = $pointsData['properties']['observationStations'];
    $stationsResponse = fetchData($stationsUrl);
    $stationsData = json_decode($stationsResponse, true);

    if (!isset($stationsData['features'][0])) {
        throw new Exception('No available weather stations found');
    }

    $stationId = $stationsData['features'][0]['properties']['stationIdentifier'];

    // Fetch latest observation
    $obsUrl = "https://api.weather.gov/stations/{$stationId}/observations/latest";
    $obsResponse = fetchData($obsUrl);
    $obsData = json_decode($obsResponse, true);

    // Create the cache data structure
    $cacheData = [
        'status' => 'ok',
        'timestamp' => time(),
        'generated' => date('c'),
        'location' => [
            'lat' => $lat,
            'lon' => $lon,
            'stationId' => $stationId,
            'stationName' => $stationsData['features'][0]['properties']['name']
        ],
        'points' => $pointsData,
        'stations' => $stationsData,
        'observation' => $obsData
    ];

    // Write the data to a cache file with pretty printing
    $jsonString = json_encode($cacheData, JSON_PRETTY_PRINT);
    if (file_put_contents($jsonFilePath, $jsonString) === false) {
        throw new Exception("Error writing to {$jsonFilePath}");
    }
    
    echo "Weather cache updated successfully at " . date('Y-m-d H:i:s');

} catch (Exception $e) {
    // Log the error
    error_log("Weather cache error: " . $e->getMessage());
    
    // Create a fallback/error cache entry
    $errorData = [
        'status' => 'error',
        'timestamp' => time(),
        'generated' => date('c'),
        'error' => $e->getMessage()
    ];
    
    // Still try to write the error data to the cache file
    file_put_contents($jsonFilePath, json_encode($errorData, JSON_PRETTY_PRINT));
    
    echo "Error: " . $e->getMessage();
}
?>