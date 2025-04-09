<?php
// cache_weather.php - Fetches and caches current weather data for all counties

// Configuration
$cacheDir = 'cache/';
$consolidatedFile = 'weather_cache.json';
$userAgent = "NCHurricane.com Weather App/1.0 (your@email.com)";

// Ensure cache directory exists
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
    error_log("Created cache directory: $cacheDir");
}

/**
 * Enhanced function to fetch data with rate limit awareness
 * @param string $url API URL
 * @param string $userAgent User agent string
 * @param int $retries Number of retries on failure
 * @return string|false Response body or false on failure
 */
function fetchData($url, $userAgent, $retries = 3) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "User-Agent: " . $userAgent,
        "Accept: application/geo+json"
    ]);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    // Track rate limiting metrics
    static $requestCount = 0;
    static $lastRequestTime = 0;
    static $rateLimitHits = 0;
    
    // Ensure we're not making requests too quickly
    $currentTime = microtime(true);
    $timeSinceLastRequest = $currentTime - $lastRequestTime;
    
    // If making requests too quickly (more than 5 per second), add delay
    if ($timeSinceLastRequest < 0.2 && $lastRequestTime > 0) {
        $delay = 0.2 - $timeSinceLastRequest;
        usleep($delay * 1000000); // Convert to microseconds
    }
    
    // Update tracking variables
    $requestCount++;
    $lastRequestTime = microtime(true);
    
    // Execute request
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // Handle rate limiting responses (429)
    if ($httpCode === 429) {
        $rateLimitHits++;
        
        // If we've been rate limited multiple times, increase backoff time
        $backoffSeconds = min(30, pow(2, $rateLimitHits));
        
        error_log("Rate limit hit for URL {$url}. Backing off for {$backoffSeconds} seconds.");
        
        // If we have retries left, wait and try again
        if ($retries > 0) {
            curl_close($ch);
            sleep($backoffSeconds);
            return fetchData($url, $userAgent, $retries - 1);
        }
    }
    
    // Handle other errors
    if (curl_errno($ch) || ($httpCode !== 200 && $httpCode !== 304)) {
        $error = curl_error($ch);
        curl_close($ch);
        
        error_log("API request failed for URL {$url}: HTTP {$httpCode}, Error: {$error}");
        
        // If we have retries left and this is a 5xx error (server error), try again
        if ($retries > 0 && $httpCode >= 500) {
            sleep(1); // Brief pause before retry
            return fetchData($url, $userAgent, $retries - 1);
        }
        
        return false;
    }
    
    curl_close($ch);
    return $result;
}

// Function to read county configuration from counties.json
function getCountyConfig() {
    $countiesFile = '../../counties/counties.json';
    if (file_exists($countiesFile)) {
        $jsonContent = file_get_contents($countiesFile);
        $countiesData = json_decode($jsonContent, true);
        return $countiesData['counties'] ?? [];
    } else {
        // Fallback to hardcoded counties if file doesn't exist
        return [
            ["name" => "Bertie", "city" => "Windsor", "lat" => 35.9985, "lon" => -76.9461],
            ["name" => "Pitt", "city" => "Greenville", "lat" => 35.6115, "lon" => -77.3752],
            // Add more hardcoded counties if needed
        ];
    }
}

// Function to convert degrees to cardinal direction
function degreesToCardinal($deg) {
    if ($deg === null) return 'N/A';
    
    // Ensure deg is between 0-360
    $deg = ((floatval($deg) % 360) + 360) % 360;
    
    $directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    
    return $directions[round($deg / 22.5) % 16];
}

// Initialize consolidated cache file
$mainCache = [
    'timestamp' => time(),
    'lastUpdated' => date('Y-m-d H:i:s'),
    'temperatures' => []
];

// Get counties configuration
$counties = getCountyConfig();
error_log("Found " . count($counties) . " counties to process");

// Process each county
foreach ($counties as $county) {
    $countyName = $county['name'];
    $lat = $county['lat'];
    $lon = $county['lon'];
    
    error_log("Processing {$countyName} County ({$lat}, {$lon})");
    
    try {
        // Step 1: Get the forecast office and grid coordinates
        $pointsUrl = "https://api.weather.gov/points/{$lat},{$lon}";
        $pointsResponse = fetchData($pointsUrl, $userAgent);
        
        if (!$pointsResponse) {
            error_log("Error: Failed to fetch points data for {$countyName}");
            continue;
        }
        
        $pointsData = json_decode($pointsResponse, true);
        if (!isset($pointsData['properties'])) {
            error_log("Error: Invalid points data for {$countyName}");
            continue;
        }
        
        // Step 2: Get nearby observation stations
        $stationUrl = $pointsData['properties']['observationStations'];
        $stationsResponse = fetchData($stationUrl, $userAgent);
        
        if (!$stationsResponse) {
            error_log("Error: Failed to fetch stations data for {$countyName}");
            continue;
        }
        
        $stationsData = json_decode($stationsResponse, true);
        if (!isset($stationsData['features']) || empty($stationsData['features'])) {
            error_log("Error: No observation stations found for {$countyName}");
            continue;
        }
        
        // Step 3: Get the latest observation from the first station
        $stationId = $stationsData['features'][0]['properties']['stationIdentifier'];
        $stationName = $stationsData['features'][0]['properties']['name'];
        
        error_log("Using station: {$stationId} ({$stationName})");
        
        $obsUrl = "https://api.weather.gov/stations/{$stationId}/observations/latest";
        $obsResponse = fetchData($obsUrl, $userAgent);
        
        if (!$obsResponse) {
            error_log("Error: Failed to fetch observation data for {$countyName}");
            continue;
        }
        
        $obsData = json_decode($obsResponse, true);
        if (!isset($obsData['properties'])) {
            error_log("Error: Invalid observation data for {$countyName}");
            continue;
        }
        
        // Process the observation data
        $props = $obsData['properties'];
        
        // Extract temperature (convert C to F)
        $temp = isset($props['temperature']['value']) && $props['temperature']['value'] !== null ? 
                round($props['temperature']['value'] * 9/5 + 32) : 'N/A';
                
        // Extract condition
        $condition = $props['textDescription'] ?? 'Unknown';

        // Get the icon URL and upgrade size from medium to large
$iconUrl = $props['icon'] ?? null;
if ($iconUrl) {
    // Replace size=medium with size=large in the URL
    $iconUrl = str_replace('size=medium', 'size=large', $iconUrl);
}
        
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
            'stationName' => $stationName,
            'iconUrl' => $iconUrl
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
        
        error_log("Weather cache updated for {$countyName}: {$temp}°F, {$condition}");
        
        // Add to main cache
        $mainCache['temperatures'][$countyName] = [
            'temp' => $temp,
            'condition' => $condition,
            'timestamp' => $weather['timestamp']
        ];
        
    } catch (Exception $e) {
        error_log("Error processing {$countyName}: " . $e->getMessage());
    }
    
    // Add a small delay between API calls to avoid rate limiting
    usleep(500000); // 0.5 second delay
}

// Save the consolidated cache
file_put_contents($cacheDir . $consolidatedFile, json_encode($mainCache));
error_log("Main cache file updated with data for " . count($mainCache['temperatures']) . " counties.");
?>