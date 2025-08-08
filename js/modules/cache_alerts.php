<?php
// cache_alerts.php - Fetches and caches active weather alerts

// ===== DEBUGGING ADDITIONS (START) =====
if (php_sapi_name() !== 'cli') {
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
    ob_start();
    echo "<pre>Running cache_alerts.php - " . date('Y-m-d H:i:s') . "\n\n";
}

// Debug logging helper
$debugLog = [];
function addDebugLog($message)
{
    global $debugLog;
    $debugLog[] = date('[H:i:s] ') . $message;
}
// ===== DEBUGGING ADDITIONS (END) =====

// Configuration
$cacheDir = 'cache/';
$masterAlertsFile = 'master_alerts.json';
$userAgent = "NCHurricane.com Weather App/1.0 (your@email.com)";

// Ensure cache directory exists
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
    error_log("Created cache directory: $cacheDir");
    addDebugLog("Created cache directory: $cacheDir");
}

/**
 * Enhanced function to fetch data with rate limit awareness
 */
function fetchData($url, $userAgent, $retries = 3)
{
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
        // ===== DEBUGGING ADDITION =====
        global $debugLog;
        $debugLog[] = date('[H:i:s] ') . "Rate limit hit. Backing off for {$backoffSeconds} seconds.";
        // ===== END DEBUGGING ADDITION =====

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
        // ===== DEBUGGING ADDITION =====
        global $debugLog;
        $debugLog[] = date('[H:i:s] ') . "API request failed: HTTP {$httpCode}, Error: {$error}";
        // ===== END DEBUGGING ADDITION =====

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

/**
 * Check if an alert is currently active (not expired)
 * @param array $alert Alert data from NWS API
 * @return bool True if alert is active, false if expired
 */
function isAlertActive($alert) {
    $expires = $alert['properties']['expires'] ?? null;
    
    if (!$expires) {
        // If no expiration date, consider it active
        return true;
    }
    
    try {
        $expirationTime = new DateTime($expires);
        $currentTime = new DateTime();
        
        // Alert is active if current time is before expiration
        $isActive = $currentTime < $expirationTime;
        
        // Log for debugging
        addDebugLog("Alert expires: $expires, Current: " . $currentTime->format('c') . ", Active: " . ($isActive ? 'YES' : 'NO'));
        
        return $isActive;
    } catch (Exception $e) {
        // If we can't parse the date, assume it's active to be safe
        addDebugLog("Error parsing expiration date '$expires': " . $e->getMessage());
        return true;
    }
}

/**
 * Remove duplicate alerts based on ID
 * @param array $alerts Array of alert objects
 * @return array Deduplicated alerts
 */
function removeDuplicateAlerts($alerts) {
    $seenIds = [];
    $uniqueAlerts = [];
    
    foreach ($alerts as $alert) {
        $alertId = $alert['id'] ?? uniqid('alert_');
        
        if (!in_array($alertId, $seenIds)) {
            $seenIds[] = $alertId;
            $uniqueAlerts[] = $alert;
        } else {
            addDebugLog("Removed duplicate alert with ID: $alertId");
        }
    }
    
    addDebugLog("Removed " . (count($alerts) - count($uniqueAlerts)) . " duplicate alerts");
    return $uniqueAlerts;
}

// Function to read county configuration
function getCountyConfig()
{
    $countiesFile = '../../counties/counties.json';
    if (file_exists($countiesFile)) {
        $jsonContent = file_get_contents($countiesFile);
        $countiesData = json_decode($jsonContent, true);
        return $countiesData['counties'] ?? [];
    } else {
        // Fallback to hardcoded counties
        return [
            ["name" => "Bertie", "city" => "Windsor", "lat" => 35.9985, "lon" => -76.9461],
            ["name" => "Pitt", "city" => "Greenville", "lat" => 35.6115, "lon" => -77.3752],
            ["name" => "Martin", "city" => "Williamston", "lat" => 35.8500, "lon" => -77.0600],
            ["name" => "Beaufort", "city" => "Washington", "lat" => 35.57056, "lon" => -77.04972],
            ["name" => "Mainland Dare", "city" => "Manteo", "lat" => 35.91667, "lon" => -77.7],
            ["name" => "Northern OBX", "city" => "Kitty Hawk", "lat" => 36.0646, "lon" => -75.7057],
            ["name" => "Hatteras Island", "city" => "Hatteras", "lat" => 35.2195, "lon" => -76.6903],
            ["name" => "Washington", "city" => "Plymouth", "lat" => 35.8668, "lon" => -76.7488],
            ["name" => "Tyrrell", "city" => "Columbia", "lat" => 35.9177, "lon" => -76.2522],
            ["name" => "Mainland Hyde", "city" => "Swan Quarter", "lat" => 35.4085, "lon" => -76.3302],
            ["name" => "Ocracoke Island", "city" => "Ocracoke", "lat" => 35.1146, "lon" => -75.9810],
            // Add more hardcoded counties if needed
        ];
    }
}

/**
 * Enhanced function to map alert geometry to county names
 * Improved to prevent false matches like "Martin" matching "Martinsville"
 */
function mapAlertToCounties($alert, $counties)
{
    global $debugLog;
    $affectedCounties = [];

    // Get alert properties
    $alertUGCCodes = [];
    if (isset($alert['properties']['geocode']['UGC']) && is_array($alert['properties']['geocode']['UGC'])) {
        $alertUGCCodes = $alert['properties']['geocode']['UGC'];
        addDebugLog("Found UGC codes in alert: " . implode(", ", $alertUGCCodes));
    }

    $affectedZones = [];
    if (isset($alert['properties']['affectedZones']) && is_array($alert['properties']['affectedZones'])) {
        $affectedZones = $alert['properties']['affectedZones'];
        addDebugLog("Found affected zones in alert: " . implode(", ", $affectedZones));
    }

    $alertEvent = $alert['properties']['event'] ?? 'Unknown Alert';
    $areaDesc = $alert['properties']['areaDesc'] ?? '';

    // Define coastal vs inland zone types to prevent geographic mismatches
    $coastalZones = [
        'NCZ203', // Northern Outer Banks
        'NCZ204', // Ocracoke Island  
        'NCZ205', // Hatteras Island
    ];

    $coastalAlertTypes = [
        'Beach Hazards Statement',
        'Coastal Flood Advisory',
        'Coastal Flood Warning',
        'High Surf Advisory',
        'Marine Weather Statement'
    ];

    // Check if this is a coastal-only alert
    $isCoastalAlert = in_array($alertEvent, $coastalAlertTypes);
    
    if ($isCoastalAlert) {
        addDebugLog("This is a coastal alert type: $alertEvent");
    }

    // Check each county for matches
    foreach ($counties as $county) {
        $countyName = $county['name'];
        $matchFound = false;

        addDebugLog("Checking if alert affects county: $countyName");

        // METHOD 1: Direct UGC code matching (most reliable)
        if (isset($county['ugcCode']) && in_array($county['ugcCode'], $alertUGCCodes)) {
            addDebugLog("Match found: County UGC code {$county['ugcCode']} in alert");
            $matchFound = true;
        }

        // METHOD 2: Zone URL matching
        if (!$matchFound && isset($county['zoneURL']) && in_array($county['zoneURL'], $affectedZones)) {
            addDebugLog("Match found: County zone URL {$county['zoneURL']} in alert");
            $matchFound = true;
        }

        // METHOD 3: Area description matching WITH GEOGRAPHIC VALIDATION
        if (!$matchFound && !empty($areaDesc)) {
            // Special handling for Washington County to prevent coastal mismatches
            if (strtolower($countyName) === 'washington') {
                // Washington County should NEVER match coastal alerts
                if ($isCoastalAlert) {
                    addDebugLog("Skipping Washington County for coastal alert: $alertEvent");
                    continue;
                }
                
                // For non-coastal alerts, be very specific about Washington County matching
                $washingtonPatterns = [
                    '/\bWashington\s+County\b/i',           // "Washington County"
                    '/\bWashington\s+Co\b/i',               // "Washington Co"
                    '/(?<!city\s)(?<!town\s)Washington(?!\s+(?:NC|North\s+Carolina|city|downtown))/i'  // "Washington" but not "Washington, NC" or "Washington city"
                ];
                
                foreach ($washingtonPatterns as $pattern) {
                    if (preg_match($pattern, $areaDesc)) {
                        addDebugLog("Match found: Washington County pattern matched in area description");
                        $matchFound = true;
                        break;
                    }
                }
                
                if (!$matchFound) {
                    addDebugLog("No specific Washington County match found in: $areaDesc");
                }
            } else {
                // For other counties, use standard word boundary matching
                $countyNamePattern = '/\b' . preg_quote($countyName, '/') . '\b/i';
                if (preg_match($countyNamePattern, $areaDesc)) {
                    // Additional validation for inland counties vs coastal alerts
                    if ($isCoastalAlert && !isset($county['isCoastal'])) {
                        // Check if county has any coastal zones
                        $hasCoastalZone = false;
                        if (isset($county['ugcCode']) && in_array($county['ugcCode'], $coastalZones)) {
                            $hasCoastalZone = true;
                        }
                        
                        if (!$hasCoastalZone) {
                            addDebugLog("Skipping inland county $countyName for coastal alert");
                            continue;
                        }
                    }
                    
                    addDebugLog("Match found: County name '$countyName' found in area description");
                    $matchFound = true;
                }
            }
        }

        if ($matchFound) {
            $affectedCounties[] = $countyName;
            addDebugLog("County $countyName affected by alert: " . ($alert['properties']['id'] ?? 'unknown'));
        }
    }

    // Enhanced debugging
    addDebugLog("Alert: $alertEvent");
    addDebugLog("Area description: $areaDesc");
    addDebugLog("UGC codes: " . implode(", ", $alertUGCCodes));
    addDebugLog("Affected counties: " . implode(", ", $affectedCounties));

    return array_unique($affectedCounties);
}

// Get counties configuration BEFORE using it
$counties = getCountyConfig();
error_log("Found " . count($counties) . " counties to process for alerts");
addDebugLog("Found " . count($counties) . " counties to process for alerts");

// NOW it's safe to log this (moved this line from earlier in the file)
error_log("Starting alert cache process at " . date('Y-m-d H:i:s'));
addDebugLog("Starting alert cache process with " . count($counties) . " counties");

// Initialize alert tracking
$masterAlerts = [
    'timestamp' => time(),
    'lastUpdated' => date('Y-m-d H:i:s'),
    'alerts' => []
];

// Fetch alerts for the region
// To simplify, we'll use a bounding box approach
$minLat = 34.0;
$maxLat = 37.0;
$minLon = -79.0;
$maxLon = -75.0;

// Define region URL
$regionUrl = "https://api.weather.gov/alerts/active?status=actual&area=NC";

addDebugLog("About to fetch alerts for region");
addDebugLog("Fetching from: $regionUrl");

$alertsResponse = fetchData($regionUrl, $userAgent);

// Process the alerts response
if ($alertsResponse) {
    addDebugLog("Received response from NWS API (" . strlen($alertsResponse) . " bytes)");

    $alertsData = json_decode($alertsResponse, true);
    if (isset($alertsData['features']) && !empty($alertsData['features'])) {
        $alertFeatures = $alertsData['features'];

        // FILTER OUT EXPIRED ALERTS FIRST
        $activeAlerts = [];
        foreach ($alertFeatures as $alert) {
            if (isAlertActive($alert)) {
                $activeAlerts[] = $alert;
            } else {
                $alertEvent = $alert['properties']['event'] ?? 'Unknown Alert';
                $expires = $alert['properties']['expires'] ?? 'No expiration';
                addDebugLog("Filtered out expired alert: $alertEvent (expired: $expires)");
            }
        }
        
        addDebugLog("Filtered " . count($alertFeatures) . " total alerts down to " . count($activeAlerts) . " active alerts");

        if (!empty($activeAlerts)) {
            // Extract and log alert types for active alerts only
            $alertTypes = [];
            foreach ($activeAlerts as $alert) {
                if (isset($alert['properties']['event'])) {
                    $eventType = $alert['properties']['event'];
                    if (!isset($alertTypes[$eventType])) {
                        $alertTypes[$eventType] = 0;
                    }
                    $alertTypes[$eventType]++;
                }
            }

            addDebugLog("Found " . count($activeAlerts) . " active alerts in the region");

            // Log the types of active alerts found
            foreach ($alertTypes as $type => $count) {
                addDebugLog("- $count x $type");
            }

            error_log("Found " . count($activeAlerts) . " active alerts in the region");

            // Process each ACTIVE alert
            foreach ($activeAlerts as $alert) {
                // Extract alert data
                $alertId = $alert['properties']['id'] ?? uniqid('alert_');
                $alertEvent = $alert['properties']['event'] ?? 'Unknown Alert';
                $alertHeadline = $alert['properties']['headline'] ?? '';
                $alertDescription = $alert['properties']['description'] ?? '';
                $alertInstruction = $alert['properties']['instruction'] ?? '';
                $alertSeverity = $alert['properties']['severity'] ?? 'Unknown';
                $alertCertainty = $alert['properties']['certainty'] ?? 'Unknown';
                $alertUrgency = $alert['properties']['urgency'] ?? 'Unknown';
                $alertSent = $alert['properties']['sent'] ?? null;
                $alertEffective = $alert['properties']['effective'] ?? null;
                $alertExpires = $alert['properties']['expires'] ?? null;

                // Map alert to affected counties
                $affectedCounties = mapAlertToCounties($alert, $counties);

                // Add to master alerts list
                $masterAlerts['alerts'][] = [
                    'id' => $alertId,
                    'event' => $alertEvent,
                    'headline' => $alertHeadline,
                    'description' => $alertDescription,
                    'instruction' => $alertInstruction,
                    'severity' => $alertSeverity,
                    'certainty' => $alertCertainty,
                    'urgency' => $alertUrgency,
                    'sent' => $alertSent,
                    'effective' => $alertEffective,
                    'expires' => $alertExpires,
                    'affectedCounties' => $affectedCounties
                ];

                // Create county-specific alert entries
                foreach ($affectedCounties as $countyName) {
                    $countyFile = $cacheDir . strtolower($countyName) . '_alerts.json';

                    // Read existing alerts if file exists
                    $countyAlerts = [];
                    if (file_exists($countyFile)) {
                        $jsonContent = file_get_contents($countyFile);
                        $countyData = json_decode($jsonContent, true);
                        if (isset($countyData['alerts'])) {
                            // FILTER EXISTING ALERTS TO REMOVE EXPIRED ONES
                            $existingActiveAlerts = [];
                            foreach ($countyData['alerts'] as $existingAlert) {
                                $expires = $existingAlert['expires'] ?? null;
                                if ($expires) {
                                    try {
                                        $expirationTime = new DateTime($expires);
                                        $currentTime = new DateTime();
                                        if ($currentTime < $expirationTime) {
                                            $existingActiveAlerts[] = $existingAlert;
                                        }
                                    } catch (Exception $e) {
                                        // If we can't parse, keep the alert to be safe
                                        $existingActiveAlerts[] = $existingAlert;
                                    }
                                } else {
                                    // No expiration date, keep it
                                    $existingActiveAlerts[] = $existingAlert;
                                }
                            }
                            $countyAlerts = $existingActiveAlerts;
                        }
                    }

                    // Add this alert to county's alerts
                    $countyAlerts[] = [
                        'id' => $alertId,
                        'event' => $alertEvent,
                        'headline' => $alertHeadline,
                        'description' => $alertDescription,
                        'instruction' => $alertInstruction,
                        'severity' => $alertSeverity,
                        'certainty' => $alertCertainty,
                        'urgency' => $alertUrgency,
                        'sent' => $alertSent,
                        'effective' => $alertEffective,
                        'expires' => $alertExpires
                    ];

                    // Remove duplicates from county alerts
                    $countyAlerts = removeDuplicateAlerts($countyAlerts);

                    // Save county-specific alerts file
                    $countyData = [
                        'timestamp' => time(),
                        'lastUpdated' => date('Y-m-d H:i:s'),
                        'alerts' => $countyAlerts
                    ];

                    file_put_contents($countyFile, json_encode($countyData));
                    error_log("Alert cache updated for {$countyName}: {$alertEvent}");
                    addDebugLog("Alert cache updated for {$countyName}: {$alertEvent}");
                }
            }
        } else {
            addDebugLog("No active alerts found after filtering");
        }
    } else {
        error_log("No active alerts found in the region");
        addDebugLog("No alerts found in API response");
        // Create empty master alerts file
        $emptyMasterAlerts = [
            'timestamp' => time(),
            'lastUpdated' => date('Y-m-d H:i:s'),
            'alerts' => []
        ];
        file_put_contents($cacheDir . $masterAlertsFile, json_encode($emptyMasterAlerts));
        addDebugLog("Created empty master alerts file");
    }

    // Remove duplicates from master alerts and save
    $masterAlerts['alerts'] = removeDuplicateAlerts($masterAlerts['alerts']);
    file_put_contents($cacheDir . $masterAlertsFile, json_encode($masterAlerts));
    error_log("Master alerts file updated with " . count($masterAlerts['alerts']) . " active alerts");
    addDebugLog("Master alerts file updated with " . count($masterAlerts['alerts']) . " active alerts");
} else {
    error_log("Failed to fetch alerts for the region");
    addDebugLog("Failed to fetch alerts from NWS API");
}

// Ensure master alerts file exists
if (!file_exists($cacheDir . $masterAlertsFile)) {
    addDebugLog("Master alerts file not created during processing, creating empty one");
    $emptyMasterAlerts = [
        'timestamp' => time(),
        'lastUpdated' => date('Y-m-d H:i:s'),
        'alerts' => []
    ];
    file_put_contents($cacheDir . $masterAlertsFile, json_encode($emptyMasterAlerts));
}

// Display debug information for browser requests
if (php_sapi_name() !== 'cli') {
    echo "\nFinished processing alerts\n";
    echo "Cache directory: " . realpath($cacheDir) . "\n";

    // Display cached files
    echo "\nFiles in cache directory:\n";
    $files = glob($cacheDir . '*.json');
    if ($files) {
        foreach ($files as $file) {
            echo "- " . basename($file) . " (" . filesize($file) . " bytes)\n";
        }
    } else {
        echo "- No JSON files found\n";
    }

    // Check directory permissions
    echo "\nDirectory permissions:\n";
    echo "- Cache dir: " . substr(sprintf('%o', fileperms($cacheDir)), -4) . "\n";

    // Check for write permissions
    echo "\nWrite permission test:\n";
    $testFile = $cacheDir . 'write_test.txt';
    $result = @file_put_contents($testFile, 'Test');
    if ($result !== false) {
        echo "- Write test succeeded (" . $result . " bytes written)\n";
        unlink($testFile); // Clean up test file
    } else {
        echo "- Write test failed: " . error_get_last()['message'] . "\n";
    }

    // Display debug log
    echo "\nDebug log:\n";
    foreach ($debugLog as $logMessage) {
        echo "- $logMessage\n";
    }

    // Display any PHP errors or warnings that occurred
    echo "\nPHP errors/warnings:\n";
    $errors = ob_get_contents();
    if (trim($errors) !== "<pre>Running cache_alerts.php - " . date('Y-m-d H:i:s') . "\n\n") {
        echo $errors;
    } else {
        echo "- No PHP errors detected\n";
    }

    echo "</pre>";
    ob_end_flush();
}
?>