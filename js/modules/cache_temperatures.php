<?php
// Improved cache_temperatures.php with error handling

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configuration
$cache_file = __DIR__ . '/weather_cache.json';
$cache_duration = 15 * 60; // 15 minutes in seconds
$debug_log = __DIR__ . '/temperature_debug.log';

// Start log
$log_content = "Script started at: " . date('Y-m-d H:i:s') . "\n";

// Load county data
$counties_path = __DIR__ . '/counties.json';
$log_content .= "Loading counties from: $counties_path\n";

if (!file_exists($counties_path)) {
    $log_content .= "ERROR: Counties file not found!\n";
    file_put_contents($debug_log, $log_content);
    die("Counties file not found at $counties_path");
}

$counties_json = file_get_contents($counties_path);
if ($counties_json === false) {
    $log_content .= "ERROR: Could not read counties file!\n";
    file_put_contents($debug_log, $log_content);
    die("Could not read counties file");
}

$counties_data = json_decode($counties_json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $log_content .= "ERROR: JSON decode error: " . json_last_error_msg() . "\n";
    file_put_contents($debug_log, $log_content);
    die("JSON decode error: " . json_last_error_msg());
}

$log_content .= "Found " . count($counties_data['counties']) . " counties in config\n";

// Function to fetch temperature for a single county with error handling
function fetchCountyTemperature($lat, $lon, &$log_content) {
    $log_content .= "Fetching data for coordinates: $lat, $lon\n";
    
    // Set up a context for better error handling
    $context = stream_context_create([
        'http' => [
            'timeout' => 30,
            'user_agent' => 'PHP Weather Cache Script'
        ]
    ]);
    
    $url = "https://api.weather.gov/points/{$lat},{$lon}";
    $log_content .= "Requesting points data from: $url\n";
    
    // Get points data
    $points_response = @file_get_contents($url, false, $context);
    if ($points_response === false) {
        $error = error_get_last();
        $log_content .= "ERROR: Failed to get points data: " . ($error ? $error['message'] : 'Unknown error') . "\n";
        return null;
    }
    
    $points_data = json_decode($points_response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $log_content .= "ERROR: Points JSON decode error: " . json_last_error_msg() . "\n";
        return null;
    }
    
    if (!isset($points_data['properties']['observationStations'])) {
        $log_content .= "ERROR: No observation stations found in points data\n";
        return null;
    }
    
    // Get stations
    $stations_url = $points_data['properties']['observationStations'];
    $log_content .= "Requesting stations from: $stations_url\n";
    
    $stations_response = @file_get_contents($stations_url, false, $context);
    if ($stations_response === false) {
        $error = error_get_last();
        $log_content .= "ERROR: Failed to get stations data: " . ($error ? $error['message'] : 'Unknown error') . "\n";
        return null;
    }
    
    $stations_data = json_decode($stations_response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $log_content .= "ERROR: Stations JSON decode error: " . json_last_error_msg() . "\n";
        return null;
    }
    
    if (empty($stations_data['features'])) {
        $log_content .= "ERROR: No stations found in stations data\n";
        return null;
    }
    
    // Get latest observation
    $station_id = $stations_data['features'][0]['properties']['stationIdentifier'];
    $obs_url = "https://api.weather.gov/stations/{$station_id}/observations/latest";
    $log_content .= "Requesting observation from: $obs_url\n";
    
    $obs_response = @file_get_contents($obs_url, false, $context);
    if ($obs_response === false) {
        $error = error_get_last();
        $log_content .= "ERROR: Failed to get observation data: " . ($error ? $error['message'] : 'Unknown error') . "\n";
        return null;
    }
    
    $obs_data = json_decode($obs_response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $log_content .= "ERROR: Observation JSON decode error: " . json_last_error_msg() . "\n";
        return null;
    }
    
    // Extract and convert temperature
    if (isset($obs_data['properties']['temperature']['value'])) {
        $temp_celsius = $obs_data['properties']['temperature']['value'];
        if ($temp_celsius === null) {
            $log_content .= "WARNING: Temperature value is null\n";
            return null;
        }
        
        $temp_fahrenheit = round(($temp_celsius * 9/5) + 32);
        
        $log_content .= "SUCCESS: Got temperature: {$temp_fahrenheit}°F\n";
        
        return [
            'temp' => $temp_fahrenheit,
            'condition' => $obs_data['properties']['textDescription'] ?? 'N/A',
            'timestamp' => time()
        ];
    } else {
        $log_content .= "ERROR: Temperature data not found in observation\n";
        if (isset($obs_data['properties'])) {
            $log_content .= "Available properties: " . implode(', ', array_keys($obs_data['properties'])) . "\n";
        }
        return null;
    }
}

// Main caching function
function updateTemperatureCache($counties, &$log_content) {
    global $cache_file;
    
    $cache_data = [
        'timestamp' => time(),
        'temperatures' => []
    ];
    
    $success_count = 0;
    $failure_count = 0;
    
    foreach ($counties['counties'] as $county) {
        $log_content .= "\n--- Processing county: {$county['name']} ---\n";
        
        $temperature = fetchCountyTemperature($county['lat'], $county['lon'], $log_content);
        
        if ($temperature) {
            $cache_data['temperatures'][$county['name']] = $temperature;
            $success_count++;
        } else {
            $failure_count++;
        }
        
        // Add a small delay to avoid overwhelming the API
        usleep(500000); // 0.5 second
    }
    
    $log_content .= "\nSummary: $success_count counties succeeded, $failure_count counties failed\n";
    
    // Write to cache file
    $json_result = json_encode($cache_data, JSON_PRETTY_PRINT);
    if ($json_result === false) {
        $log_content .= "ERROR: Failed to encode cache data to JSON: " . json_last_error_msg() . "\n";
        return false;
    }
    
    $write_result = file_put_contents($cache_file, $json_result);
    if ($write_result === false) {
        $log_content .= "ERROR: Failed to write to cache file\n";
        return false;
    }
    
    $log_content .= "Successfully wrote " . strlen($json_result) . " bytes to cache file\n";
    return $cache_data;
}

// Check if cache exists and is valid
$should_update = true;
if (file_exists($cache_file)) {
    $log_content .= "Cache file exists, checking age\n";
    $existing_cache = json_decode(file_get_contents($cache_file), true);
    
    // Check cache age
    if (isset($existing_cache['timestamp']) && 
        (time() - $existing_cache['timestamp']) < $cache_duration) {
        $log_content .= "Cache is still valid (age: " . (time() - $existing_cache['timestamp']) . " seconds)\n";
        $should_update = false;
        echo "Using existing cache";
    } else {
        $log_content .= "Cache is expired or invalid\n";
    }
} else {
    $log_content .= "Cache file does not exist\n";
}

// Update cache if needed
if ($should_update) {
    $log_content .= "Updating temperature cache...\n";
    $updated_cache = updateTemperatureCache($counties_data, $log_content);
    if ($updated_cache) {
        $count = count($updated_cache['temperatures']);
        $log_content .= "Cache updated successfully with $count temperatures\n";
        echo "Cache updated successfully with $count temperatures";
    } else {
        $log_content .= "Cache update FAILED\n";
        echo "Cache update FAILED";
    }
}

// Write log
file_put_contents($debug_log, $log_content);
?>