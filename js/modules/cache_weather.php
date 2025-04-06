<?php
// cache_weather.php - Fixed version that consistently uses fetchData

error_reporting(E_ALL);
ini_set('display_errors', 1);
echo "Script started.<br>";

// Define the user agent string - CRITICAL for NWS API
$userAgent = "NCHurricane.com Weather App/1.0 (your-email@example.com)";

/**
 * Fetches data from a URL with proper headers
 * @param string $url The URL to fetch data from
 * @return string|false The response body or false on failure
 */
function fetchData($url, $userAgent) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    // Set required headers for the NWS API
    $headers = [
        "User-Agent: " . $userAgent,
        "Accept: application/geo+json"
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $result = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch) || $http_code !== 200) {
        $error = curl_error($ch);
        curl_close($ch);
        echo "API request failed for URL {$url}: HTTP {$http_code}, Error: {$error}<br>";
        return false;
    }
    
    curl_close($ch);
    return $result;
}

// Coordinates for Greenville, NC
$lat = 35.64;
$lon = -77.39;

// STEP 1: Fetch the /points endpoint data
$pointsUrl = "https://api.weather.gov/points/{$lat},{$lon}";
$pointsResponse = fetchData($pointsUrl, $userAgent);

if ($pointsResponse === false) {
    exit("Error fetching weather data from points endpoint.");
}

$pointsData = json_decode($pointsResponse, true);
if (!isset($pointsData['properties'])) {
    exit("Invalid response from points endpoint.");
}

// Extract grid information
$gridId = $pointsData['properties']['gridId'];
$gridX = $pointsData['properties']['gridX'];
$gridY = $pointsData['properties']['gridY'];

echo "Grid information: {$gridId}/{$gridX},{$gridY}<br>";

// STEP 2: Fetch the gridpoints/stations data
$gridpointsUrl = "https://api.weather.gov/gridpoints/{$gridId}/{$gridX},{$gridY}/stations";
$gridpointsResponse = fetchData($gridpointsUrl, $userAgent);

if ($gridpointsResponse === false) {
    exit("Error fetching weather data from gridpoints endpoint.");
}

$gridpointsData = json_decode($gridpointsResponse, true);
if (!isset($gridpointsData['features']) || empty($gridpointsData['features'])) {
    exit("No stations found in gridpoints response.");
}

// STEP 3: Fetch station data
// Get the first station (usually closest)
$stationId = $gridpointsData['features'][0]['properties']['stationIdentifier'];
echo "Using station: {$stationId}<br>";

$obsUrl = "https://api.weather.gov/stations/{$stationId}/observations/latest";
$obsResponse = fetchData($obsUrl, $userAgent);

if ($obsResponse === false) {
    exit("Error fetching weather data from observations endpoint.");
}

$obsData = json_decode($obsResponse, true);
if (!isset($obsData['properties'])) {
    exit("Invalid response from observations endpoint.");
}

// Process the observation data
$props = $obsData['properties'];

// Build an array with weather parameters
$weather = [
    'temperature' => isset($props['temperature']['value']) ? 
        round($props['temperature']['value'] * 9/5 + 32) : null, // Convert C to F
    'skyConditions' => $props['textDescription'] ?? null,
    'humidity' => $props['relativeHumidity']['value'] ?? null,
    'windSpeed' => isset($props['windSpeed']['value']) ? 
        round($props['windSpeed']['value'] * 2.237) : null, // Convert m/s to mph
    'windDirection' => $props['windDirection']['value'] ?? null, // Keep degrees for frontend
    'pressure' => isset($props['barometricPressure']['value']) ? 
        round($props['barometricPressure']['value'] / 100) : null, // Convert Pa to mb
    'dewPoint' => isset($props['dewpoint']['value']) ? 
        round($props['dewpoint']['value'] * 9/5 + 32) : null, // Convert C to F
    'visibility' => isset($props['visibility']['value']) ? 
        round($props['visibility']['value'] * 0.000621371) : null, // Convert m to mi
    'timestamp' => strtotime($props['timestamp'] ?? 'now'),
    'source' => 'nws',
    'station' => $stationId
];

// Create the cache structure
$cacheData = [
    'timestamp' => time(),
    'lastUpdated' => date('Y-m-d H:i:s'),
    'location' => 'Greenville',
    'coords' => ['lat' => $lat, 'lon' => $lon],
    'weather' => $weather
];

// Ensure cache directory exists
$cacheDir = 'cache/';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
    echo "Created cache directory<br>";
}

// Save to location-specific cache
$locationCacheFile = $cacheDir . 'greenville_weather.json';
file_put_contents($locationCacheFile, json_encode($cacheData));
echo "Weather cache updated successfully at " . date('Y-m-d H:i:s') . "<br>";

// Also save to the main cache file for backward compatibility
file_put_contents('weather_cache.json', json_encode($cacheData));
echo "Main cache file updated<br>";

echo "Script completed successfully.";
?>