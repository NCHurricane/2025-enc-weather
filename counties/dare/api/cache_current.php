<?php
// cache_current.php - Multi-zone version for Dare County
error_reporting(E_ALL);
ini_set('display_errors', 1);

$dataDir = '../data';
$configPath = $dataDir . '/config.json';
$userAgent = "NCHurricane.com Weather App/1.0";

// Create data directory if it doesn't exist
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

/**
 * Atomic write function to prevent partial file reads
 */
function atomic_write_json($filepath, $data) {
    $temp_file = $filepath . '.tmp';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
    if (file_put_contents($temp_file, $json, LOCK_EX) !== false) {
        if (rename($temp_file, $filepath)) {
            return true;
        }
    }
    
    // Cleanup on failure
    if (file_exists($temp_file)) {
        unlink($temp_file);
    }
    
    return false;
}

/**
 * Fetch station observation data from NWS API
 */
function fetchStationData($stationId, $userAgent) {
    $url = "https://api.weather.gov/stations/{$stationId}/observations/latest";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "User-Agent: " . $userAgent,
        "Accept: application/geo+json"
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($result, true);
        return $data['properties'] ?? null;
    }
    
    error_log("Failed to fetch station {$stationId}: HTTP {$httpCode}");
    return null;
}

/**
 * Convert celsius to fahrenheit
 */
function celsiusToFahrenheit($celsius) {
    if ($celsius === null) return null;
    return round(($celsius * 9/5) + 32);
}

/**
 * Convert meters per second to miles per hour
 */
function mpsToMph($mps) {
    if ($mps === null) return null;
    return round($mps * 2.237);
}

/**
 * Convert meters to miles
 */
function metersToMiles($meters) {
    if ($meters === null) return null;
    return round($meters * 0.000621371, 1);
}

/**
 * Convert pascals to millibars
 */
function pascalsToMillibars($pascals) {
    if ($pascals === null) return null;
    return round($pascals / 100, 1);
}

/**
 * Convert wind direction degrees to cardinal direction
 */
function degreesToCardinal($degrees) {
    if ($degrees === null) return null;
    
    $directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                   'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    
    $index = round($degrees / 22.5) % 16;
    return $directions[$index];
}

/**
 * Process station observation data
 */
function processStationData($stationConfig, $userAgent) {
    $stationId = $stationConfig['id'];
    $stationName = $stationConfig['friendlyName'] ?? $stationConfig['name'];
    
    error_log("Fetching data for station: {$stationId} ({$stationName})");
    
    $rawData = fetchStationData($stationId, $userAgent);
    
    if (!$rawData) {
        error_log("No data returned for station: {$stationId}");
        return [
            'id' => $stationId,
            'name' => $stationName,
            'observation' => [
                'timestamp' => null,
                'age_minutes' => 999
            ],
            'data' => [
                'temperature' => null,
                'dewpoint' => null,
                'humidity' => null,
                'pressure' => null,
                'windSpeed' => null,
                'windDirection' => null,
                'windGust' => null,
                'visibility' => null,
                'conditions' => null,
                'heatIndex' => null,
                'windChill' => null,
                'icon' => null
            ]
        ];
    }
    
    // Calculate observation age
    $observationTime = $rawData['timestamp'] ?? null;
    $ageMinutes = 999;
    
    if ($observationTime) {
        $obsDateTime = new DateTime($observationTime);
        $now = new DateTime();
        $ageMinutes = floor(($now->getTimestamp() - $obsDateTime->getTimestamp()) / 60);
    }
    
    // Process temperature values
    $temperature = isset($rawData['temperature']['value']) ? 
        celsiusToFahrenheit($rawData['temperature']['value']) : null;
    
    $dewpoint = isset($rawData['dewpoint']['value']) ? 
        celsiusToFahrenheit($rawData['dewpoint']['value']) : null;
    
    $heatIndex = isset($rawData['heatIndex']['value']) ? 
        celsiusToFahrenheit($rawData['heatIndex']['value']) : null;
    
    $windChill = isset($rawData['windChill']['value']) ? 
        celsiusToFahrenheit($rawData['windChill']['value']) : null;
    
    // Process wind values
    $windSpeed = isset($rawData['windSpeed']['value']) ? 
        mpsToMph($rawData['windSpeed']['value']) : null;
    
    $windGust = isset($rawData['windGust']['value']) ? 
        mpsToMph($rawData['windGust']['value']) : null;
    
    $windDirection = isset($rawData['windDirection']['value']) ? 
        degreesToCardinal($rawData['windDirection']['value']) : null;
    
    // Process other values
    $humidity = isset($rawData['relativeHumidity']['value']) ? 
        round($rawData['relativeHumidity']['value']) : null;
    
    $pressure = isset($rawData['barometricPressure']['value']) ? 
        pascalsToMillibars($rawData['barometricPressure']['value']) : null;
    
    $visibility = isset($rawData['visibility']['value']) ? 
        metersToMiles($rawData['visibility']['value']) : null;
    
    // Text conditions and icon
    $conditions = $rawData['textDescription'] ?? null;
    $icon = $rawData['icon'] ?? null;
    
    error_log("Processed station {$stationId}: temp={$temperature}°F, age={$ageMinutes}min");
    
    return [
        'id' => $stationId,
        'name' => $stationName,
        'observation' => [
            'timestamp' => $observationTime,
            'age_minutes' => $ageMinutes
        ],
        'data' => [
            'temperature' => $temperature,
            'dewpoint' => $dewpoint,
            'humidity' => $humidity,
            'pressure' => $pressure,
            'windSpeed' => $windSpeed,
            'windDirection' => $windDirection,
            'windGust' => $windGust,
            'visibility' => $visibility,
            'conditions' => $conditions,
            'heatIndex' => $heatIndex,
            'windChill' => $windChill,
            'icon' => $icon
        ]
    ];
}

/**
 * Main execution
 */
try {
    // Load configuration
    if (!file_exists($configPath)) {
        throw new Exception("Config file not found: {$configPath}");
    }
    
    $configContent = file_get_contents($configPath);
    $config = json_decode($configContent, true);
    
    if (!$config) {
        throw new Exception("Failed to parse config.json");
    }
    
    $countyName = $config['county']['name'] ?? 'Unknown';
    $isMultiZone = $config['county']['multiZone'] ?? false;
    
    error_log("Processing current conditions for {$countyName} County (multi-zone: " . ($isMultiZone ? 'yes' : 'no') . ")");
    
    if ($isMultiZone) {
        // Multi-zone county: process each zone separately
        $zones = $config['zones'] ?? [];
        
        foreach ($zones as $zoneName => $zoneConfig) {
            error_log("Processing zone: {$zoneName}");
            
            // Create zone directory
            $zoneDataDir = $dataDir . '/' . $zoneName;
            if (!is_dir($zoneDataDir)) {
                mkdir($zoneDataDir, 0755, true);
            }
            
            // Process stations for this zone (array format)
            $stations = $zoneConfig['stations'] ?? [];
            $stationData = [];
            
            foreach ($stations as $index => $stationConfig) {
                $processedData = processStationData($stationConfig, $userAgent);
                $stationData[$stationConfig['id']] = $processedData; // Use station ID as key
            }
            
            // Build result for this zone
            $result = [
                'generated' => gmdate('Y-m-d\TH:i:s\Z'),
                'zone' => $zoneName,
                'stations' => $stationData
            ];
            
            // Write zone-specific file
            $outPath = $zoneDataDir . '/current.json';
            if (atomic_write_json($outPath, $result)) {
                error_log("Successfully wrote current conditions for zone {$zoneName} to {$outPath}");
            } else {
                error_log("Failed to write current conditions for zone {$zoneName} to {$outPath}");
            }
        }
        
    } else {
        // Single-zone county: process all stations into one file (array format)
        error_log("Processing single-zone county");
        
        $stations = $config['stations'] ?? [];
        $stationData = [];
        
        foreach ($stations as $index => $stationConfig) {
            $processedData = processStationData($stationConfig, $userAgent);
            $stationData[$stationConfig['id']] = $processedData; // Use station ID as key
        }
        
        // Build result
        $result = [
            'generated' => gmdate('Y-m-d\TH:i:s\Z'),
            'stations' => $stationData
        ];
        
        // Write single file
        $outPath = $dataDir . '/current.json';
        if (atomic_write_json($outPath, $result)) {
            error_log("Successfully wrote current conditions to {$outPath}");
        } else {
            error_log("Failed to write current conditions to {$outPath}");
        }
    }
    
    error_log("Current conditions cache update completed for {$countyName} County");
    echo "OK\n";
    
} catch (Exception $e) {
    error_log("Error in cache_current.php: " . $e->getMessage());
    exit(1);
}
?>