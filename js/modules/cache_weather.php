<?php
// cache_weather.php - Fetches and caches weather data for all counties

error_reporting(E_ALL);
ini_set('display_errors', 1);

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

/**
 * Converts degrees to cardinal direction
 * @param int $deg Degrees (0-360)
 * @return string Cardinal direction
 */
function degreesToCardinal($deg) {
    if ($deg === null) return 'N/A';
    
    // Ensure deg is between 0-360
    $deg = ((floatval($deg) % 360) + 360) % 360;
    
    $directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    
    return $directions[round($deg / 22.5) % 16];
}

// Function to read county configuration
function getCountyConfig() {
    $countiesFile = '../../counties/counties.json';
    if (file_exists($countiesFile)) {
        $jsonContent = file_get_contents($countiesFile);
        $countiesData = json_decode($jsonContent, true);
        return $countiesData['counties'] ?? [];
    } else {
        // Fallback to hardcoded counties if file doesn't exist
        return [
            [
                "name" => "Bertie",
                "city" => "Windsor",
                "lat" => 35.9985,
                "lon" => -76.9461
            ],
            [
                "name" => "Pitt",
                "city" => "Greenville",
                "lat" => 35.6115,
                "lon" => -77.3752
            ],
            [
                "name" => "Beaufort",
                "city" => "Washington",
                "lat" => 35.5465,
                "lon" => -77.0519
            ],
            [
                "name" => "Martin",
                "city" => "Williamston",
                "lat" => 35.86,
                "lon" => -77.18
            ],
            [
                "name" => "Dare",
                "city" => "Manteo",
                "lat" => 35.9082,
                "lon" => -75.6757
            ],
            [
                "name" => "Washington",
                "city" => "Plymouth",
                "lat" => 35.8668,
                "lon" => -76.7488
            ],
            [
                "name" => "Tyrrell",
                "city" => "Columbia",
                "lat" => 35.9177,
                "lon" => -76.2522
            ],
            [
                "name" => "Hyde",
                "city" => "Swan Quarter",
                "lat" => 35.4085,
                "lon" => -76.3302
            ]
        ];
    }
}

// Ensure cache directory exists
$cacheDir = 'cache/';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
    echo "Created cache directory<br>";
}

// Get counties configuration
$counties = getCountyConfig();
echo "Found " . count($counties) . " counties to process<br>";

$mainCache = [
    'timestamp' => time(),
    'lastUpdated' => date('Y-m-d H:i:s'),
    'temperatures' => []
];

// Process each county
foreach ($counties as $county) {
    $countyName = $county['name'];
    $lat = $county['lat'];
    $lon = $county['lon'];
    
    echo "<hr>Processing {$countyName} County ({$lat}, {$lon})<br>";
    
    try {
        // Step 1: Get the forecast office and grid coordinates
        $pointsUrl = "https://api.weather.gov/points/{$lat},{$lon}";
        $pointsResponse = fetchData($pointsUrl, $userAgent);
        
        if (!$pointsResponse) {
            echo "Error: Failed to fetch points data for {$countyName}<br>";
            continue;
        }
        
        $pointsData = json_decode($pointsResponse, true);
        if (!isset($pointsData['properties'])) {
            echo "Error: Invalid points data for {$countyName}<br>";
            continue;
        }
        
        $gridId = $pointsData['properties']['gridId'];
        $gridX = $pointsData['properties']['gridX'];
        $gridY = $pointsData['properties']['gridY'];
        
        echo "Grid: {$gridId}/{$gridX},{$gridY}<br>";
        
        // Step 2: Get nearby observation stations
        $stationUrl = $pointsData['properties']['observationStations'];
        $stationsResponse = fetchData($stationUrl, $userAgent);
        
        if (!$stationsResponse) {
            echo "Error: Failed to fetch stations data for {$countyName}<br>";
            continue;
        }
        
        $stationsData = json_decode($stationsResponse, true);
        if (!isset($stationsData['features']) || empty($stationsData['features'])) {
            echo "Error: No observation stations found for {$countyName}<br>";
            continue;
        }
        
        // Step 3: Get the latest observation from the first station
        $stationId = $stationsData['features'][0]['properties']['stationIdentifier'];
        $stationName = $stationsData['features'][0]['properties']['name'];
        
        echo "Using station: {$stationId} ({$stationName})<br>";
        
        $obsUrl = "https://api.weather.gov/stations/{$stationId}/observations/latest";
        $obsResponse = fetchData($obsUrl, $userAgent);
        
        if (!$obsResponse) {
            echo "Error: Failed to fetch observation data for {$countyName}<br>";
            continue;
        }
        
        $obsData = json_decode($obsResponse, true);
        if (!isset($obsData['properties'])) {
            echo "Error: Invalid observation data for {$countyName}<br>";
            continue;
        }
        
        // Process the observation data
        $props = $obsData['properties'];
        
        // Extract temperature (convert C to F)
        $temp = isset($props['temperature']['value']) && $props['temperature']['value'] !== null ? 
                round($props['temperature']['value'] * 9/5 + 32) : 'N/A';
                
        // Extract condition
        $condition = $props['textDescription'] ?? 'Unknown';
        
        // Extract other weather data
        $weather = [
            'temperature' => $temp,
            'skyConditions' => $condition,
            'humidity' => $props['relativeHumidity']['value'] ?? null,
            'windSpeed' => isset($props['windSpeed']['value']) ? 
                round($props['windSpeed']['value'] * 2.237) : null, // Convert m/s to mph
            'windDirection' => $props['windDirection']['value'] ?? null,
            'windDirectionCardinal' => isset($props['windDirection']['value']) ? 
                degreesToCardinal($props['windDirection']['value']) : 'N/A',
            'pressure' => isset($props['barometricPressure']['value']) ? 
                round($props['barometricPressure']['value'] / 100) : null, // Convert Pa to mb
            'dewPoint' => isset($props['dewpoint']['value']) ? 
                round($props['dewpoint']['value'] * 9/5 + 32) : null, // Convert C to F
            'visibility' => isset($props['visibility']['value']) ? 
                round($props['visibility']['value'] * 0.000621371) : null, // Convert m to mi
            'timestamp' => strtotime($props['timestamp'] ?? 'now'),
            'source' => 'nws',
            'station' => $stationId,
            'stationName' => $stationName
        ];
        
        // Create county-specific cache file
        $cacheData = [
            'timestamp' => time(),
            'lastUpdated' => date('Y-m-d H:i:s'),
            'location' => $county['city'] ?? $countyName,
            'coords' => ['lat' => $lat, 'lon' => $lon],
            'weather' => $weather
        ];
        
        // Save to county-specific cache file
        $countyFile = $cacheDir . strtolower($countyName) . '_weather.json';
        file_put_contents($countyFile, json_encode($cacheData));
        
        echo "Weather cache updated for {$countyName}: {$temp}°F, {$condition}<br>";
        
        // Add to main cache
$mainCache['temperatures'][$countyName] = [
    'temp' => $temp,
    'condition' => $condition,
    'timestamp' => time() // Use current time instead of $weather['timestamp']
];
        
    } catch (Exception $e) {
        echo "Error processing {$countyName}: " . $e->getMessage() . "<br>";
    }
    
    // Add a small delay between API calls to avoid rate limiting
    usleep(500000); // 0.5 second delay
}

// Save the consolidated cache
file_put_contents('weather_cache.json', json_encode($mainCache));
echo "<hr>Main cache file updated with data for " . count($mainCache['temperatures']) . " counties.<br>";
echo "Script completed at " . date('Y-m-d H:i:s');
?>