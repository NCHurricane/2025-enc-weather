<?php
// cache_temperatures.php

// Configuration
$cache_file = __DIR__ . '/weather_cache.json';
$cache_duration = 15 * 60; // 15 minutes in seconds

// Load county data
$counties_json = file_get_contents(__DIR__ . '/../counties/counties.json');
$counties_data = json_decode($counties_json, true);

// Function to fetch temperature for a single county
function fetchCountyTemperature($lat, $lon) {
    $url = "https://api.weather.gov/points/{$lat},{$lon}";
    
    // Get points data
    $points_response = file_get_contents($url);
    if ($points_response === false) {
        return null;
    }
    
    $points_data = json_decode($points_response, true);
    
    if (!isset($points_data['properties']['observationStations'])) {
        return null;
    }
    
    // Get stations
    $stations_url = $points_data['properties']['observationStations'];
    $stations_response = file_get_contents($stations_url);
    
    if ($stations_response === false) {
        return null;
    }
    
    $stations_data = json_decode($stations_response, true);
    
    if (empty($stations_data['features'])) {
        return null;
    }
    
    // Get latest observation
    $station_id = $stations_data['features'][0]['properties']['stationIdentifier'];
    $obs_url = "https://api.weather.gov/stations/{$station_id}/observations/latest";
    
    $obs_response = file_get_contents($obs_url);
    
    if ($obs_response === false) {
        return null;
    }
    
    $obs_data = json_decode($obs_response, true);
    
    // Extract and convert temperature
    if (isset($obs_data['properties']['temperature']['value'])) {
        $temp_celsius = $obs_data['properties']['temperature']['value'];
        $temp_fahrenheit = round(($temp_celsius * 9/5) + 32);
        
        return [
            'temp' => $temp_fahrenheit,
            'condition' => $obs_data['properties']['textDescription'] ?? 'N/A',
            'timestamp' => time()
        ];
    }
    
    return null;
}

// Main caching function
function updateTemperatureCache($counties) {
    global $cache_file;
    
    $cache_data = [
        'timestamp' => time(),
        'temperatures' => []
    ];
    
    foreach ($counties['counties'] as $county) {
        $temperature = fetchCountyTemperature($county['lat'], $county['lon']);
        
        if ($temperature) {
            $cache_data['temperatures'][$county['name']] = $temperature;
        }
    }
    
    // Write to cache file
    file_put_contents($cache_file, json_encode($cache_data, JSON_PRETTY_PRINT));
    
    return $cache_data;
}

// Check if cache exists and is valid
if (file_exists($cache_file)) {
    $existing_cache = json_decode(file_get_contents($cache_file), true);
    
    // Check cache age
    if (isset($existing_cache['timestamp']) && 
        (time() - $existing_cache['timestamp']) < $cache_duration) {
        echo "Using existing cache";
        return;
    }
}

// Update cache
$updated_cache = updateTemperatureCache($counties_data);
echo "Cache updated successfully";
?>