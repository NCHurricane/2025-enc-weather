<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * NWS API Current Conditions Script - cache_current.php
 * Fetches NWS API current conditions and caches them as JSON.
 *
 * Multi-zone county:
 * - Hyde County, NC (county code: NCC095)
 * - Mainland Hyde County, NC (zone: NCZ081)
 * - Ocracoke Island (zone: NCZ204)
 *
 */

$root = dirname(__DIR__);
$dataDir = $root . '/data';
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
    
}

/**
 * Get grid point data from NWS API
 */
function getGridPoint($lat, $lon, $userAgent) {
    $url = "https://api.weather.gov/points/{$lat},{$lon}";
    
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
    <?php
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($result, true);
        return $data['properties'] ?? null;
    }
    
    error_log("Failed to get grid point for {$lat},{$lon}: HTTP {$httpCode}");
    return null;
}

/**
 * Fetch forecast data from NWS API
 */
function fetchForecast($forecastUrl, $userAgent) {
    $ch = curl_init($forecastUrl);
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
    
    error_log("Failed to fetch forecast from {$forecastUrl}: HTTP {$httpCode}");
    return null;
}

/**
 * Process forecast periods (standard format)
 */
function processForecastPeriods($periods) {
    if (!$periods) return [];
    
    $processed = [];
    
    foreach ($periods as $period) {
        // Ensure icon uses large size
        $icon = $period['icon'] ?? null;
        if ($icon) {
            $icon = str_replace('size=medium', 'size=large', $icon);
        }
        
        $processed[] = [
            'number' => $period['number'] ?? null,
            'name' => $period['name'] ?? null,
            'startTime' => $period['startTime'] ?? null,
            'endTime' => $period['endTime'] ?? null,
            'isDaytime' => $period['isDaytime'] ?? null,
            'temperature' => $period['temperature'] ?? null,
            'temperatureUnit' => $period['temperatureUnit'] ?? 'F',
            'windSpeed' => $period['windSpeed'] ?? null,
            'windDirection' => $period['windDirection'] ?? null,
            'icon' => $icon,
            'shortForecast' => $period['shortForecast'] ?? null,
            'detailedForecast' => $period['detailedForecast'] ?? null
        ];
    }
    
    return $processed;
}

/**
 * Process hourly periods to Bertie-compatible format
 */
function processHourlyPeriods($periods) {
    if (!$periods) return [];
    
    $processed = [];
    
    foreach ($periods as $period) {
        // Extract dewpoint from NWS format: { unitCode: "wmoUnit:degC", value: 24.444 }
        $dewpointCelsius = $period['dewpoint']['value'] ?? null;
        $dewpointFahrenheit = $dewpointCelsius !== null ? round(($dewpointCelsius * 9/5) + 32) : null;
        
        // Extract relative humidity from NWS format: { unitCode: "wmoUnit:percent", value: 78 }
        $relativeHumidity = $period['relativeHumidity']['value'] ?? null;
        $relativeHumidityRounded = $relativeHumidity !== null ? round($relativeHumidity) : null;
        
        // Extract precipitation probability
        $precipProb = $period['probabilityOfPrecipitation']['value'] ?? null;
        
        // Convert to Bertie format: simple direct values
        $hourData = [
            'startTime' => $period['startTime'] ?? null,
            'temperature' => $period['temperature'] ?? null,
            'temperatureUnit' => $period['temperatureUnit'] ?? 'F',
            'dewpoint' => $dewpointFahrenheit,  // Converted to Fahrenheit
            'relativeHumidity' => $relativeHumidityRounded,  // Rounded percentage
            'windSpeed' => $period['windSpeed'] ?? null,
            'windDirection' => $period['windDirection'] ?? null,
            'shortForecast' => $period['shortForecast'] ?? null,
            'probabilityOfPrecipitation' => $precipProb,
        ];
        
        // Add icon if available (ensure large size)
        if (isset($period['icon'])) {
            $icon = $period['icon'];
            if ($icon && !strpos($icon, 'size=large')) {
                $icon .= (strpos($icon, '?') !== false ? '&' : '?') . 'size=large';
            }
            $hourData['icon'] = $icon;
        }
        
        $processed[] = $hourData;
    }
    
    return $processed;
}

/**
 * Process zone forecast data
 */
function processZoneForecast($zoneConfig, $userAgent) {
    $lat = $zoneConfig['lat'];
    $lon = $zoneConfig['lon'];
    $city = $zoneConfig['city'] ?? 'Unknown';
    
    error_log("Processing forecast for {$city} at {$lat}, {$lon}");
    
    // Get grid point information
    $gridPoint = getGridPoint($lat, $lon, $userAgent);
    
    if (!$gridPoint) {
        error_log("Failed to get grid point for {$lat}, {$lon}");
        return null;
    }
    
    // Get forecast URLs
    $forecastUrl = $gridPoint['forecast'] ?? null;
    $hourlyUrl = $gridPoint['forecastHourly'] ?? null;
    
    if (!$forecastUrl) {
        error_log("No forecast URL found for grid point");
        return null;
    }
    
    // Fetch forecast data
    $forecastData = fetchForecast($forecastUrl, $userAgent);
    $hourlyData = $hourlyUrl ? fetchForecast($hourlyUrl, $userAgent) : null;
    
    if (!$forecastData) {
        error_log("Failed to fetch forecast data");
        return null;
    }
    
    // Process periods
    $periods = processForecastPeriods($forecastData['periods'] ?? []);
    $hourlyPeriods = $hourlyData ? processHourlyPeriods($hourlyData['periods'] ?? []) : [];
    
    error_log("Processed " . count($periods) . " forecast periods and " . count($hourlyPeriods) . " hourly periods");
    
    return [
        'forecast' => [
            'generated' => gmdate('Y-m-d\TH:i:s\Z'),
            'location' => [
                'city' => $city,
                'lat' => $lat,
                'lon' => $lon
            ],
            'periods' => $periods
        ],
        'hourly' => [
            'generated' => gmdate('Y-m-d\TH:i:s\Z'),
            'hours' => $hourlyPeriods  // ← KEY CHANGE: Use "hours" array like Bertie
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
    
    error_log("Processing forecasts for {$countyName} County (multi-zone: " . ($isMultiZone ? 'yes' : 'no') . ")");
    
    if ($isMultiZone) {
        // Multi-zone county: process each zone separately
        $zones = $config['zones'] ?? [];
        
        foreach ($zones as $zoneName => $zoneConfig) {
            error_log("Processing forecast for zone: {$zoneName}");
            
            // Create zone directory
            $zoneDataDir = $dataDir . '/' . $zoneName;
            if (!is_dir($zoneDataDir)) {
                mkdir($zoneDataDir, 0755, true);
            }
            
            // Process forecast for this zone
            $forecastResult = processZoneForecast($zoneConfig, $userAgent);
            
            if ($forecastResult) {
                // Write forecast file
                $forecastPath = $zoneDataDir . '/forecast.json';
                if (atomic_write_json($forecastPath, $forecastResult['forecast'])) {
                    error_log("Successfully wrote forecast for zone {$zoneName} to {$forecastPath}");
                } else {
                    error_log("Failed to write forecast for zone {$zoneName} to {$forecastPath}");
                }
                
                // Write hourly file (now in Bertie format)
                $hourlyPath = $zoneDataDir . '/hourly.json';
                if (atomic_write_json($hourlyPath, $forecastResult['hourly'])) {
                    error_log("Successfully wrote hourly data for zone {$zoneName} to {$hourlyPath}");
                } else {
                    error_log("Failed to write hourly data for zone {$zoneName} to {$hourlyPath}");
                }
            } else {
                error_log("Failed to process forecast for zone {$zoneName}");
            }
        }
        
    } else {
        // Single-zone county: use location from config
        error_log("Processing single-zone county forecast");
        
        $location = $config['location'] ?? null;
        if (!$location) {
            throw new Exception("No location found in single-zone config");
        }
        
        $forecastResult = processZoneForecast($location, $userAgent);
        
        if ($forecastResult) {
            // Write forecast file
            $forecastPath = $dataDir . '/forecast.json';
            if (atomic_write_json($forecastPath, $forecastResult['forecast'])) {
                error_log("Successfully wrote forecast to {$forecastPath}");
            } else {
                error_log("Failed to write forecast to {$forecastPath}");
            }
            
            // Write hourly file
            $hourlyPath = $dataDir . '/hourly.json';
            if (atomic_write_json($hourlyPath, $forecastResult['hourly'])) {
                error_log("Successfully wrote hourly data to {$hourlyPath}");
            } else {
                error_log("Failed to write hourly data to {$hourlyPath}");
            }
        } else {
            error_log("Failed to process forecast for single-zone county");
        }
    }
    
    error_log("Forecast cache update completed for {$countyName} County");
    echo "OK\n";
    
} catch (Exception $e) {
    error_log("Error in cache_forecast.php: " . $e->getMessage());
    exit(1);
}
?>