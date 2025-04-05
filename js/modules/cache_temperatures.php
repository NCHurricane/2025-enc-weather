<?php
// Improved cache_temperatures.php with error handling and preferred station ID support

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1); // Set to 0 for production

// Configuration
$cache_file = __DIR__ . '/weather_cache.json';
// Set cache duration (e.g., 1 hour) - MAKE SURE THIS MATCHES get_weather_data.php
$cache_duration = 60 * 60; // 1 hour in seconds
$debug_log = __DIR__ . '/temperature_debug.log';
$counties_path = __DIR__ . '/../../counties/counties.json'; // Adjusted path relative to this script

// Start log
$log_content = "Script started at: " . date('Y-m-d H:i:s') . "\n";

// Load county data
$log_content .= "Loading counties from: $counties_path\n";

if (!file_exists($counties_path)) {
    $log_content .= "ERROR: Counties file not found at $counties_path!\n";
    file_put_contents($debug_log, $log_content, FILE_APPEND); // Append to log
    die("Counties file not found at $counties_path");
}

$counties_json = file_get_contents($counties_path);
if ($counties_json === false) {
    $log_content .= "ERROR: Could not read counties file!\n";
    file_put_contents($debug_log, $log_content, FILE_APPEND);
    die("Could not read counties file");
}

$counties_data = json_decode($counties_json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $log_content .= "ERROR: JSON decode error for counties file: " . json_last_error_msg() . "\n";
    file_put_contents($debug_log, $log_content, FILE_APPEND);
    die("JSON decode error: " . json_last_error_msg());
}

if (!isset($counties_data['counties']) || !is_array($counties_data['counties'])) {
     $log_content .= "ERROR: Invalid structure in counties JSON data.\n";
     file_put_contents($debug_log, $log_content, FILE_APPEND);
     die("Invalid structure in counties JSON data.");
}


$log_content .= "Found " . count($counties_data['counties']) . " counties in config\n";

/**
 * Fetches temperature for a county, using preferred station ID if available.
 *
 * @param float $lat Latitude.
 * @param float $lon Longitude.
 * @param string &$log_content Reference to the log string.
 * @param string|null $preferred_station_id Optional preferred NWS station ID.
 * @return array|null Array with temp, condition, timestamp on success, null on failure.
 */
function fetchCountyTemperature($lat, $lon, &$log_content, $preferred_station_id = null) {
    $log_content .= "Fetching data for coordinates: $lat, $lon";
    if ($preferred_station_id) {
        $log_content .= " (Preferred Station ID: $preferred_station_id)\n";
    } else {
        $log_content .= " (Using coordinates to find station)\n";
    }

    // Set up a context for API requests
    $context = stream_context_create([
        'http' => [
            'timeout' => 30, // 30 second timeout
            'user_agent' => 'PHP Weather Cache Script (YourWebsite.com)', // Identify your script
            'header' => "Accept: application/geo+json\r\n" // Request GeoJSON
        ]
    ]);

    $station_id = null;

    // --- Logic to determine station ID ---
    if ($preferred_station_id) {
        // If a preferred station ID is given, use it directly
        $station_id = $preferred_station_id;
        $log_content .= "Using preferred station ID: $station_id\n";
    } else {
        // --- Original Logic: Find station via coordinates ---
        $points_url = "https://api.weather.gov/points/{$lat},{$lon}";
        $log_content .= "Requesting points data from: $points_url\n";

        $points_response = @file_get_contents($points_url, false, $context);
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
            $log_content .= "ERROR: 'observationStations' URL not found in points data for $lat, $lon\n";
            return null;
        }

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
            $log_content .= "ERROR: No stations found in stations data response from $stations_url\n";
            return null;
        }

        // Get the first station ID from the list (original behavior)
        if (!isset($stations_data['features'][0]['properties']['stationIdentifier'])) {
             $log_content .= "ERROR: 'stationIdentifier' not found for the first station.\n";
             return null;
        }
        $station_id = $stations_data['features'][0]['properties']['stationIdentifier'];
        $log_content .= "Found station via coordinates: $station_id (using first in list)\n";
        // --- End of Original Logic ---
    }
    // --- End of logic to determine station ID ---


    // Ensure we have a station ID before proceeding
    if (!$station_id) {
         $log_content .= "ERROR: Could not determine a station ID to use.\n";
         return null;
    }

    // Get latest observation for the determined station ID
    $obs_url = "https://api.weather.gov/stations/{$station_id}/observations/latest";
    $log_content .= "Requesting observation from: $obs_url\n";

    $obs_response = @file_get_contents($obs_url, false, $context);
     if ($obs_response === false) {
        $error = error_get_last();
        $log_content .= "ERROR: Failed to get observation data for station $station_id: " . ($error ? $error['message'] : 'Unknown error') . "\n";
        return null;
    }

    $obs_data = json_decode($obs_response, true);
     if (json_last_error() !== JSON_ERROR_NONE) {
        $log_content .= "ERROR: Observation JSON decode error for station $station_id: " . json_last_error_msg() . "\n";
        return null;
    }

    // Extract and convert temperature
    if (isset($obs_data['properties']['temperature']['value'])) {
        $temp_celsius = $obs_data['properties']['temperature']['value'];

        if ($temp_celsius === null) {
            // Handle cases where temperature is present but null
            $log_content .= "WARNING: Temperature value is null for station $station_id\n";
             // Decide if you want to return null or a default value here
             // Returning null means the county won't be in the cache for this run.
            return null;
        }

        $temp_fahrenheit = round(($temp_celsius * 9/5) + 32);
        $condition = $obs_data['properties']['textDescription'] ?? 'N/A'; // Use null coalescing operator

        $log_content .= "SUCCESS: Got Temp:{$temp_fahrenheit}°F Cond:'{$condition}' for station $station_id\n";

        // Return the data package
        return [
            'temp' => $temp_fahrenheit,
            'condition' => $condition,
            'timestamp' => time() // Use current time for the cache entry timestamp
        ];
    } else {
        $log_content .= "ERROR: Temperature data ('properties.temperature.value') not found in observation for station $station_id\n";
        // Optional: Log available properties for debugging
        if (isset($obs_data['properties'])) {
            $log_content .= "Available properties: " . implode(', ', array_keys($obs_data['properties'])) . "\n";
        }
        return null;
    }
}

/**
 * Updates the main weather cache file.
 *
 * @param array $counties_data Parsed county data from JSON file.
 * @param string &$log_content Reference to the log string.
 * @return array|false The updated cache data array on success, false on failure.
 */
function updateTemperatureCache($counties_data, &$log_content) {
    global $cache_file; // Use the global cache file path

    $cache_data = [
        'timestamp' => time(), // Overall timestamp for the cache file generation
        'temperatures' => []
    ];

    $success_count = 0;
    $failure_count = 0;

    // Loop through each county defined in the config
    foreach ($counties_data['counties'] as $county) {
        // Basic validation for county entry
        if (!isset($county['name']) || !isset($county['lat']) || !isset($county['lon'])) {
             $log_content .= "WARNING: Skipping county entry due to missing name, lat, or lon.\n";
             continue; // Skip this county
        }

        $log_content .= "\n--- Processing county: {$county['name']} ---\n";

        // Check if a preferred station ID is set for this county
        $preferred_station_id = isset($county['station_id']) ? $county['station_id'] : null;

        // Pass the preferred ID (or null) to the fetch function
        $temperature_data = fetchCountyTemperature($county['lat'], $county['lon'], $log_content, $preferred_station_id);

        // If data was successfully fetched, add it to the cache
        if ($temperature_data) {
            $cache_data['temperatures'][$county['name']] = $temperature_data;
            $success_count++;
        } else {
             $log_content .= "Failed to get temperature for {$county['name']}.\n";
            $failure_count++;
        }

        // Add a small delay between API calls to be polite
        usleep(500000); // 0.5 second delay
    }

    $log_content .= "\n--- Update Summary ---\n";
    $log_content .= "Counties Processed: " . count($counties_data['counties']) . "\n";
    $log_content .= "Successful Fetches: $success_count\n";
    $log_content .= "Failed Fetches: $failure_count\n";

    // Write the collected data to the cache file
    $json_result = json_encode($cache_data, JSON_PRETTY_PRINT);
    if ($json_result === false) {
        $log_content .= "ERROR: Failed to encode cache data to JSON: " . json_last_error_msg() . "\n";
        return false; // Indicate failure
    }

    // Attempt to write the file
    $write_result = file_put_contents($cache_file, $json_result);
    if ($write_result === false) {
        $log_content .= "ERROR: Failed to write to cache file: $cache_file\n";
        return false; // Indicate failure
    }

    $log_content .= "Successfully wrote " . $write_result . " bytes to cache file: $cache_file\n";
    return $cache_data; // Return the data array on success
}

// --- Main Script Execution ---

// Check if cache exists and is valid before proceeding
$should_update = true;
if (file_exists($cache_file)) {
    $log_content .= "Cache file exists ($cache_file), checking age...\n";
    $cache_file_content = file_get_contents($cache_file);
    $existing_cache = json_decode($cache_file_content, true);

    // Check JSON validity and timestamp presence
    if (json_last_error() === JSON_ERROR_NONE && isset($existing_cache['timestamp'])) {
        $cache_age = time() - $existing_cache['timestamp'];
        // Check cache age against duration
        if ($cache_age < $cache_duration) {
            $log_content .= "Cache is still valid (Age: $cache_age seconds, Max: $cache_duration seconds). No update needed.\n";
            $should_update = false;
            echo "Using existing cache (valid for " . ($cache_duration - $cache_age) . " more seconds)";
        } else {
            $log_content .= "Cache is expired (Age: $cache_age seconds, Max: $cache_duration seconds).\n";
        }
    } else {
         $log_content .= "Cache file is invalid (JSON error or missing timestamp).\n";
    }
} else {
    $log_content .= "Cache file does not exist ($cache_file).\n";
}

// Update cache if needed
if ($should_update) {
    $log_content .= "Updating temperature cache...\n";
    $updated_cache = updateTemperatureCache($counties_data, $log_content);

    if ($updated_cache !== false) {
        $count = count($updated_cache['temperatures']);
        $log_content .= "Cache update process completed. $count temperatures stored.\n";
        echo "Cache updated successfully with $count temperatures."; // Output for cron job/user
    } else {
        $log_content .= "Cache update FAILED during processing or writing.\n";
        echo "Cache update FAILED."; // Output for cron job/user
    }
}

// Write the accumulated log content to the debug file
file_put_contents($debug_log, $log_content, FILE_APPEND); // Append to log

?>