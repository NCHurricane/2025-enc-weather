<?php
// cache_weather.php - Weather data caching script for NCHurricane.com

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configuration - Update these values
$config = [
    'user_agent' => 'NCHurricane.com Weather App/1.0 (your-email@example.com)',
    'locations' => [
        'greenville' => [
            'name' => 'Greenville',
            'lat' => 35.64,
            'lon' => -77.39,
            'cache_file' => 'cache/greenville_weather.json',
        ]
        // Add more locations as needed
    ],
    'cache_dir' => 'cache/',
    'main_cache_file' => 'weather_cache.json',
    'backup_api_enabled' => false, // Set to true to enable Open-Meteo as backup
];

// Create cache directory if it doesn't exist
if (!file_exists($config['cache_dir'])) {
    mkdir($config['cache_dir'], 0755, true);
}

// Log function to record operation progress
function logMessage($message) {
    echo $message . "<br>";
    error_log('[' . date('Y-m-d H:i:s') . '] ' . $message);
}

logMessage("Weather caching script started");

// Fetches data from a URL with proper headers
function fetchData($url, $config) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FAILONERROR, true);
    
    // Set required headers for the NWS API
    $headers = [
        "User-Agent: " . $config['user_agent'],
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
        logMessage("API request failed for URL {$url}: HTTP {$http_code}, Error: {$error}");
        return false;
    }
    
    curl_close($ch);
    return $result;
}

// Fetch fallback data from Open-Meteo when NWS fails
function fetchBackupData($lat, $lon) {
    $url = "https://api.open-meteo.com/v1/forecast?latitude={$lat}&longitude={$lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    
    $result = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch) || $http_code !== 200) {
        curl_close($ch);
        return false;
    }
    
    curl_close($ch);
    $data = json_decode($result, true);
    
    // Map Open-Meteo data to our format
    if (isset($data['current'])) {
        $current = $data['current'];
        return [
            'temperature' => $current['temperature_2m'] ?? null,
            'skyConditions' => mapWeatherCode($current['weather_code'] ?? 0),
            'humidity' => $current['relative_humidity_2m'] ?? null,
            'windSpeed' => $current['wind_speed_10m'] ?? null,
            'windDirection' => $current['wind_direction_10m'] ?? null,
            'pressure' => $current['pressure_msl'] ?? null,
            'visibility' => null,  // Not provided by Open-Meteo
            'dewPoint' => null,    // Calculate if needed
            'source' => 'open-meteo',
            'timestamp' => time()
        ];
    }
    
    return false;
}

// Map Open-Meteo weather codes to text descriptions
function mapWeatherCode($code) {
    $codes = [
        0 => 'Clear',
        1 => 'Mainly Clear',
        2 => 'Partly Cloudy',
        3 => 'Overcast',
        45 => 'Fog',
        48 => 'Depositing Rime Fog',
        51 => 'Light Drizzle',
        53 => 'Moderate Drizzle',
        55 => 'Dense Drizzle',
        56 => 'Light Freezing Drizzle',
        57 => 'Dense Freezing Drizzle',
        61 => 'Slight Rain',
        63 => 'Moderate Rain',
        65 => 'Heavy Rain',
        66 => 'Light Freezing Rain',
        67 => 'Heavy Freezing Rain',
        71 => 'Slight Snow Fall',
        73 => 'Moderate Snow Fall',
        75 => 'Heavy Snow Fall',
        77 => 'Snow Grains',
        80 => 'Slight Rain Showers',
        81 => 'Moderate Rain Showers',
        82 => 'Violent Rain Showers',
        85 => 'Slight Snow Showers',
        86 => 'Heavy Snow Showers',
        95 => 'Thunderstorm',
        96 => 'Thunderstorm with Slight Hail',
        99 => 'Thunderstorm with Heavy Hail'
    ];
    
    return $codes[$code] ?? 'Unknown';
}

// Process each location
foreach ($config['locations'] as $id => $location) {
    logMessage("Processing {$location['name']}...");
    
    $lat = $location['lat'];
    $lon = $location['lon'];
    
    // Step 1: Get grid information from the points endpoint
    $pointsUrl = "https://api.weather.gov/points/{$lat},{$lon}";
    $pointsResponse = fetchData($pointsUrl, $config);
    
    if ($pointsResponse === false) {
        logMessage("Error fetching data from points endpoint for {$location['name']}");
        if ($config['backup_api_enabled']) {
            logMessage("Attempting to use backup API for {$location['name']}");
            $backupData = fetchBackupData($lat, $lon);
            if ($backupData !== false) {
                $cacheData = [
                    'timestamp' => time(),
                    'location' => $location['name'],
                    'coords' => ['lat' => $lat, 'lon' => $lon],
                    'weather' => $backupData,
                    'source' => 'backup'
                ];
                file_put_contents($location['cache_file'], json_encode($cacheData));
                logMessage("Backup weather data cached for {$location['name']}");
            } else {
                logMessage("Backup API also failed for {$location['name']}");
            }
        }
        continue; // Move to the next location
    }
    
    $pointsData = json_decode($pointsResponse, true);
    if (!isset($pointsData['properties'])) {
        logMessage("Invalid data from points endpoint for {$location['name']}");
        continue;
    }
    
    // Extract grid information
    $gridId = $pointsData['properties']['gridId'];
    $gridX = $pointsData['properties']['gridX'];
    $gridY = $pointsData['properties']['gridY'];
    
    // Step 2: Get observation stations for this grid point
    $stationsUrl = "https://api.weather.gov/gridpoints/{$gridId}/{$gridX},{$gridY}/stations";
    $stationsResponse = fetchData($stationsUrl, $config);
    
    if ($stationsResponse === false) {
        logMessage("Error fetching stations for {$location['name']}");
        continue;
    }
    
    $stationsData = json_decode($stationsResponse, true);
    if (!isset($stationsData['features']) || count($stationsData['features']) === 0) {
        logMessage("No observation stations found for {$location['name']}");
        continue;
    }
    
    // Use the first station (usually closest)
    $stationId = $stationsData['features'][0]['properties']['stationIdentifier'];
    
    // Step 3: Get latest observation from the station
    $obsUrl = "https://api.weather.gov/stations/{$stationId}/observations/latest";
    $obsResponse = fetchData($obsUrl, $config);
    
    if ($obsResponse === false) {
        logMessage("Error fetching observation data for {$location['name']}");
        continue;
    }
    
    $obsData = json_decode($obsResponse, true);
    if (!isset($obsData['properties'])) {
        logMessage("Invalid observation data for {$location['name']}");
        continue;
    }
    
    // Process the observation data
    $props = $obsData['properties'];
    
    // Extract and format weather data
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
    
    // Convert wind direction from degrees to cardinal
    if (isset($weather['windDirection'])) {
        $weather['windDirectionCardinal'] = degreesToCardinal($weather['windDirection']);
    }
    
    // Create the cache data structure
$cacheData = [
    'timestamp' => time(),
    'lastUpdated' => date('Y-m-d H:i:s'),
    'location' => $location['name'],
    'coords' => ['lat' => $lat, 'lon' => $lon],
    'weather' => $weather
];
    
    // Save the cache to the location-specific file
    file_put_contents($location['cache_file'], json_encode($cacheData));
    logMessage("Weather data cached successfully for {$location['name']}");
}

// Helper function to convert degrees to cardinal direction

logMessage("Weather caching script completed successfully");
?>