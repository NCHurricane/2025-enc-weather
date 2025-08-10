<?php
// cache_weather.php - Fetches and caches current weather data for all counties
// Enhanced with intelligent station selection

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
 * ENHANCED STATION SELECTION FUNCTIONS
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param float $lat1 First latitude
 * @param float $lon1 First longitude  
 * @param float $lat2 Second latitude
 * @param float $lon2 Second longitude
 * @return float Distance in miles
 */
function calculateDistance($lat1, $lon1, $lat2, $lon2) {
    $earthRadius = 3959; // Earth radius in miles
    
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    
    $a = sin($dLat/2) * sin($dLat/2) + 
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * 
         sin($dLon/2) * sin($dLon/2);
    
    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    
    return $earthRadius * $c;
}

/**
 * Evaluate station data quality by checking recent observation
 * @param string $stationId Station identifier
 * @param string $userAgent User agent for API call
 * @return float Quality score (0-1)
 */
function evaluateStationDataQuality($stationId, $userAgent) {
    try {
        $obsUrl = "https://api.weather.gov/stations/{$stationId}/observations/latest";
        $obsResponse = fetchData($obsUrl, $userAgent);
        
        if (!$obsResponse) {
            return 0.1; // Very low score for no response
        }
        
        $obsData = json_decode($obsResponse, true);
        if (!isset($obsData['properties'])) {
            return 0.1;
        }
        
        $props = $obsData['properties'];
        $score = 0.0;
        $maxScore = 0.0;
        
        // Check for key observation fields (each worth points)
        $criticalFields = [
            'temperature' => 0.3,        // Most important
            'dewpoint' => 0.2,
            'relativeHumidity' => 0.15,
            'windSpeed' => 0.15,
            'windDirection' => 0.1,
            'barometricPressure' => 0.1
        ];
        
        foreach ($criticalFields as $field => $weight) {
            $maxScore += $weight;
            if (isset($props[$field]['value']) && $props[$field]['value'] !== null) {
                $score += $weight;
            }
        }
        
        // Check observation age (more recent = better)
        if (isset($props['timestamp'])) {
            $obsTime = strtotime($props['timestamp']);
            $ageHours = (time() - $obsTime) / 3600;
            
            if ($ageHours <= 1) {
                $ageScore = 1.0;  // Perfect for very recent
            } elseif ($ageHours <= 3) {
                $ageScore = 0.8;  // Good for recent
            } elseif ($ageHours <= 6) {
                $ageScore = 0.6;  // OK for somewhat recent
            } else {
                $ageScore = 0.3;  // Poor for old data
            }
            
            // Age counts as 20% of total score
            $score = ($score / $maxScore) * 0.8 + $ageScore * 0.2;
        } else {
            $score = $score / $maxScore * 0.8; // No age bonus
        }
        
        return min(1.0, $score);
        
    } catch (Exception $e) {
        error_log("Error evaluating station {$stationId}: " . $e->getMessage());
        return 0.2; // Low but not zero score for API errors
    }
}

/**
 * Get provider preference score
 * @param string $provider Provider name from station metadata
 * @return float Score (0-1)
 */
function getProviderScore($provider) {
    $provider = strtoupper($provider);
    
    $providerScores = [
        'ASOS' => 1.0,      // Automated Surface Observing System (best)
        'AWOS' => 0.9,      // Automated Weather Observing System  
        'MESOWEST' => 0.7,  // MesoWest network
        'MADIS' => 0.7,     // Meteorological Assimilation Data Ingest System
        'COOP' => 0.6,      // Cooperative Observer Program
        'RAWS' => 0.6,      // Remote Automated Weather Station
        'UNKNOWN' => 0.5    // Unknown provider
    ];
    
    return $providerScores[$provider] ?? 0.5;
}

/**
 * Get station type preference score based on name patterns
 * @param string $name Station name
 * @return float Score (0-1)
 */
function getStationTypeScore($name) {
    $name = strtoupper($name);
    
    // Airport weather stations tend to be more reliable
    if (strpos($name, 'AIRPORT') !== false || 
        strpos($name, 'FIELD') !== false ||
        strpos($name, 'AFB') !== false ||  // Air Force Base
        strpos($name, 'ARP') !== false) {  // Airport
        return 1.0;
    }
    
    // Coast Guard stations are also typically good
    if (strpos($name, 'COAST GUARD') !== false) {
        return 0.9;
    }
    
    // University/research stations
    if (strpos($name, 'UNIVERSITY') !== false ||
        strpos($name, 'COLLEGE') !== false) {
        return 0.8;
    }
    
    // Default score for other stations
    return 0.7;
}

/**
 * Select best observation station from available options
 * @param array $stations Array of station features from NWS API
 * @param float $targetLat Target latitude
 * @param float $targetLon Target longitude
 * @param string $userAgent User agent for API calls
 * @return array Best station info with scoring details
 */
function selectBestStation($stations, $targetLat, $targetLon, $userAgent) {
    $scoredStations = [];
    $maxStationsToEvaluate = min(5, count($stations)); // Limit API calls
    
    error_log("Evaluating top {$maxStationsToEvaluate} stations for best selection");
    
    for ($i = 0; $i < $maxStationsToEvaluate; $i++) {
        $station = $stations[$i];
        $props = $station['properties'];
        
        // Extract coordinates from geometry
        $coords = $station['geometry']['coordinates']; // [lon, lat]
        $stationLat = $coords[1];
        $stationLon = $coords[0];
        
        // Calculate distance score (closer = better)
        $distance = calculateDistance($targetLat, $targetLon, $stationLat, $stationLon);
        $distanceScore = max(0, (100 - $distance) / 100); // 0-1 scale
        
        // Evaluate data quality by checking recent observation
        $qualityScore = evaluateStationDataQuality($props['stationIdentifier'], $userAgent);
        
        // Provider preference score (ASOS/AWOS are typically more reliable)
        $providerScore = getProviderScore($props['provider'] ?? 'unknown');
        
        // Station type preference (airports often have better equipment)
        $typeScore = getStationTypeScore($props['name'] ?? '');
        
        // Calculate composite score (weighted average)
        $compositeScore = (
            $distanceScore * 0.4 +      // 40% distance weight
            $qualityScore * 0.35 +       // 35% data quality weight  
            $providerScore * 0.15 +      // 15% provider weight
            $typeScore * 0.1             // 10% station type weight
        );
        
        $scoredStations[] = [
            'station' => $station,
            'distance' => round($distance, 1),
            'scores' => [
                'distance' => round($distanceScore, 3),
                'quality' => round($qualityScore, 3),
                'provider' => round($providerScore, 3),
                'type' => round($typeScore, 3),
                'composite' => round($compositeScore, 3)
            ],
            'stationId' => $props['stationIdentifier'],
            'name' => $props['name'],
            'provider' => $props['provider'] ?? 'unknown'
        ];
        
        // Add small delay between station evaluations
        usleep(200000); // 0.2 second delay
    }
    
    // Sort by composite score (highest first)
    usort($scoredStations, function($a, $b) {
        return $b['scores']['composite'] <=> $a['scores']['composite'];
    });
    
    $bestStation = $scoredStations[0];
    
    error_log(sprintf(
        "Selected station %s (%s) - Distance: %s mi, Quality: %s, Score: %s",
        $bestStation['stationId'],
        $bestStation['name'],
        $bestStation['distance'],
        $bestStation['scores']['quality'],
        $bestStation['scores']['composite']
    ));
    
    return $bestStation;
}

/**
 * Enhanced version of the existing station selection logic
 */
function selectStationForCounty($stationsData, $lat, $lon, $userAgent) {
    if (!isset($stationsData['features']) || empty($stationsData['features'])) {
        throw new Exception("No observation stations found");
    }
    
    $bestStation = selectBestStation($stationsData['features'], $lat, $lon, $userAgent);
    
    return [
        'stationId' => $bestStation['stationId'],
        'stationName' => $bestStation['name'],
        'distance' => $bestStation['distance'],
        'quality_score' => $bestStation['scores']['composite'],
        'provider' => $bestStation['provider'],
        'scores' => $bestStation['scores'] // Include detailed scores for debugging
    ];
}

/**
 * EXISTING UTILITY FUNCTIONS (preserved)
 */

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
        
        if ($retries > 0) {
            sleep($backoffSeconds);
            curl_close($ch);
            return fetchData($url, $userAgent, $retries - 1);
        }
    }
    
    if ($result === false || $httpCode >= 400) {
        error_log("Error fetching {$url}: HTTP {$httpCode} - " . curl_error($ch));
        
        if ($retries > 0) {
            sleep(2); // Brief pause before retry
            curl_close($ch);
            return fetchData($url, $userAgent, $retries - 1);
        }
        
        curl_close($ch);
        return false;
    }
    
    curl_close($ch);
    return $result;
}

/**
 * Convert degrees to cardinal direction
 * @param float $degrees Wind direction in degrees
 * @return string Cardinal direction
 */
function degreesToCardinal($degrees) {
    $directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    $index = round($degrees / 22.5) % 16;
    return $directions[$index];
}

/**
 * COUNTY CONFIGURATION
 */

// Define counties with their coordinates
$counties = [
    ['name' => 'Pitt', 'lat' => 35.5782, 'lon' => -77.3803, 'city' => 'Greenville'],
    ['name' => 'Beaufort', 'lat' => 35.4732, 'lon' => -76.6663, 'city' => 'Washington'],
    ['name' => 'Martin', 'lat' => 35.7796, 'lon' => -77.0552, 'city' => 'Williamston'],
    ['name' => 'Washington', 'lat' => 35.9465, 'lon' => -76.6074, 'city' => 'Plymouth'],
    ['name' => 'Tyrrell', 'lat' => 35.8896, 'lon' => -76.1827, 'city' => 'Columbia'],
    ['name' => 'Bertie', 'lat' => 36.0907, 'lon' => -77.0052, 'city' => 'Windsor'],
    ['name' => 'Hyde', 'lat' => 35.3949, 'lon' => -76.1724, 'city' => 'Swan Quarter'],
    ['name' => 'Dare', 'lat' => 35.9099, 'lon' => -75.6999, 'city' => 'Manteo']
];

// Initialize main cache
$mainCache = [
    'timestamp' => time(),
    'lastUpdated' => date('Y-m-d H:i:s'),
    'temperatures' => [],
    'sources' => 'nws'
];

/**
 * MAIN PROCESSING LOOP
 */

error_log("Starting weather cache update for " . count($counties) . " counties");

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
        
        // Step 3: Select the best station using enhanced logic
        $stationInfo = selectStationForCounty($stationsData, $lat, $lon, $userAgent);
        $stationId = $stationInfo['stationId'];
        $stationName = $stationInfo['stationName'];
        
        error_log("Using station: {$stationId} ({$stationName}) - Distance: {$stationInfo['distance']} mi, Score: {$stationInfo['quality_score']}");
        
        // Step 4: Get the latest observation from the selected station
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
        
        // Extract additional weather fields (heat index, wind chill, precipitation)
        $heatIndex = isset($props['heatIndex']['value']) && $props['heatIndex']['value'] !== null ?
                    round($props['heatIndex']['value'] * 9/5 + 32) : null;
        
        $windChill = isset($props['windChill']['value']) && $props['windChill']['value'] !== null ?
                    round($props['windChill']['value'] * 9/5 + 32) : null;
        
        $precipLastHour = isset($props['precipitationLastHour']['value']) && $props['precipitationLastHour']['value'] !== null ?
                         round($props['precipitationLastHour']['value'] * 0.0393701, 2) : null; // Convert mm to inches
        
        // Extract other weather data
        $weather = [
            'temperature' => $temp,
            'skyConditions' => $condition,
            'humidity' => $props['relativeHumidity']['value'] ?? null,
            'windSpeed' => isset($props['windSpeed']['value']) ? 
                round($props['windSpeed']['value'] * 0.621371) : null, // Convert m/s to mph
            'windDirection' => $props['windDirection']['value'] ?? null,
            'windDirectionCardinal' => isset($props['windDirection']['value']) ? 
                degreesToCardinal($props['windDirection']['value']) : 'N/A',
            'pressure' => isset($props['barometricPressure']['value']) ? 
                round($props['barometricPressure']['value'] / 100) : null, // Convert Pa to mb
            'dewPoint' => isset($props['dewpoint']['value']) ? 
                round($props['dewpoint']['value'] * 9/5 + 32) : null, // Convert C to F
            'visibility' => isset($props['visibility']['value']) ? 
                round($props['visibility']['value'] * 0.000621371) : null, // Convert m to mi
            'heatIndex' => $heatIndex,                        // NEW FIELD
            'windChill' => $windChill,                        // NEW FIELD
            'precipitationLastHour' => $precipLastHour,       // NEW FIELD
            'timestamp' => strtotime($props['timestamp'] ?? 'now'),
            'source' => 'nws',
            'station' => $stationId,
            'stationName' => $stationName,
            'iconUrl' => $iconUrl
        ];
        
        // Create enhanced county-specific cache file
        $cacheData = [
            'timestamp' => time(),
            'lastUpdated' => date('Y-m-d H:i:s'),
            'location' => $county['city'] ?? $countyName,
            'coords' => ['lat' => $lat, 'lon' => $lon],
            'weather' => $weather,
            'station' => [                                    // NEW STATION METADATA
                'id' => $stationId,
                'name' => $stationName,
                'distance' => $stationInfo['distance'],
                'quality_score' => $stationInfo['quality_score'],
                'provider' => $stationInfo['provider'],
                'scores' => $stationInfo['scores']
            ]
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