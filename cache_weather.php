<?php
// cache_weather.php

// Define the location (for Greenville, NC or your chosen location)
$lat = '35.6127';
$lon = '-77.3664';

// Helper function to fetch data via cURL
function fetchData($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // Optionally, set a timeout or headers here.
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

// Fetch point information
$pointsUrl = "https://api.weather.gov/points/{$lat},{$lon}";
$pointsResponse = fetchData($pointsUrl);
$pointsData = json_decode($pointsResponse, true);

if (!isset($pointsData['properties'])) {
    file_put_contents('weather_cache.json', json_encode(['error' => 'Error fetching point data.']));
    exit;
}

// Fetch observation stations
$stationsUrl = $pointsData['properties']['observationStations'];
$stationsResponse = fetchData($stationsUrl);
$stationsData = json_decode($stationsResponse, true);

if (!isset($stationsData['features'][0])) {
    file_put_contents('weather_cache.json', json_encode(['error' => 'No available weather stations.']));
    exit;
}

$stationId = $stationsData['features'][0]['properties']['stationIdentifier'];

// Fetch latest observation
$obsUrl = "https://api.weather.gov/stations/{$stationId}/observations/latest";
$obsResponse = fetchData($obsUrl);
$obsData = json_decode($obsResponse, true);

// You can add more API calls (e.g., forecast) here and merge the results
// For this example, we'll only cache the observation data.

$cacheData = [
    'points' => $pointsData,
    'stations' => $stationsData,
    'observation' => $obsData,
    'timestamp' => time()
];

// Write the data to a cache file
file_put_contents('weather_cache.json', json_encode($cacheData));
?>