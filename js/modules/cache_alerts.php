<?php
// cache_alerts.php - Fetches and caches active weather alerts

// ===== DEBUGGING ADDITIONS (START) - Added during chat session =====
// At the very top of the file, add these lines to enable displaying errors when run directly in browser
if (php_sapi_name() !== 'cli') {
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
    // Start output buffer to collect any errors
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
    // ===== DEBUGGING ADDITION =====
    addDebugLog("Created cache directory: $cacheDir");
    // ===== END DEBUGGING ADDITION =====
}

/**
 * Enhanced function to fetch data with rate limit awareness
 * @param string $url API URL
 * @param string $userAgent User agent string
 * @param int $retries Number of retries on failure
 * @return string|false Response body or false on failure
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
            // Add more hardcoded counties if needed
        ];
    }
}

/**
 * Enhanced function to map alert geometry to county names
 * @param array $alert The alert data
 * @param array $counties County configuration
 * @return array List of affected county names
 */
// function mapAlertToCounties($alert, $counties)
// {
//     $affectedCounties = [];

//     // Check if the alert has explicitly listed counties
//     if (isset($alert['properties']['affectedZones'])) {
//         foreach ($alert['properties']['affectedZones'] as $zone) {
//             // Extract county name from zone URL if possible
//             if (preg_match('/\/zones\/county\/([A-Z]{2})C(\d+)/', $zone, $matches)) {
//                 // For debugging
//                 error_log("Found zone code: " . $matches[1] . 'C' . $matches[2]);

//                 // Look for this county in our counties array
//                 // This could be enhanced with a lookup table of NWS zone codes to county names
//                 foreach ($counties as $county) {
//                     // For now, append county name to affected counties if we find NWS data
//                     // This ensures we don't miss any alerts
//                     $affectedCounties[] = $county['name'];
//                 }
//             }
//         }
//     }

//     // If the alert has a geometry, check if any county coordinates fall within it
//     // This would require a proper geospatial library to implement fully

//     // For now, as a fallback, include all counties if we couldn't determine specific ones
//     // This ensures we don't miss any alerts
//     if (empty($affectedCounties)) {
//         foreach ($counties as $county) {
//             $affectedCounties[] = $county['name'];
//         }
//     }

//     // Remove duplicates and return
//     return array_unique($affectedCounties);
// }

function mapAlertToCounties($alert, $counties)
{
    $affectedCounties = [];

    // Check if the alert has explicitly listed counties
    if (isset($alert['properties']['affectedZones'])) {
        foreach ($alert['properties']['affectedZones'] as $zone) {
            // Extract county name from zone URL if possible
            if (preg_match('/\/zones\/county\/([A-Z]{2})C(\d+)/', $zone, $matches)) {
                $stateCode = $matches[1];
                $countyCode = $matches[2];

                // Only continue if the state is NC (North Carolina)
                if ($stateCode === 'NC') {
                    // Log the zone for debugging
                    error_log("Found NC zone code: {$stateCode}C{$countyCode}");

                    // Look for matches in our counties array
                    // For now, we'll need to determine if the alert applies
                    // to each county by checking if the county is coastal or inland
                    foreach ($counties as $county) {
                        $countyName = $county['name'];
                        $isCoastal = in_array(strtolower($countyName), ['dare', 'hyde', 'carteret', 'pamlico', 'beaufort']);

                        // Handle special alert types
                        $eventType = $alert['properties']['event'] ?? '';
                        if (stripos($eventType, 'Rip Current') !== false && !$isCoastal) {
                            // Skip rip current alerts for non-coastal counties
                            continue;
                        }

                        // TODO: Add more specific county matching logic here
                        // For now, add the county to affected counties if no better method
                        $affectedCounties[] = $countyName;
                    }
                }
            }
        }
    }

    // Check for geometry to determine affected counties
    if (isset($alert['properties']['geocode']['UGC']) && is_array($alert['properties']['geocode']['UGC'])) {
        foreach ($alert['properties']['geocode']['UGC'] as $ugc) {
            // UGCs are in format NCC001 (NC County 001)
            if (preg_match('/^([A-Z]{2})C(\d{3})$/', $ugc, $matches)) {
                $stateCode = $matches[1];
                $countyCode = $matches[2];

                // Only continue if the state is NC
                if ($stateCode === 'NC') {
                    // Try to match county code to a county name
                    // This would require a mapping table of county codes to names
                    // For now, log the code for debugging
                    error_log("Found UGC code: {$ugc}");
                }
            }
        }
    }

    // If still no counties found, use alert description to make a best guess
    if (empty($affectedCounties) && isset($alert['properties']['description'])) {
        $description = $alert['properties']['description'];

        // Check for county names in the description
        foreach ($counties as $county) {
            $countyName = $county['name'];
            if (stripos($description, $countyName) !== false) {
                $affectedCounties[] = $countyName;
            }
        }
    }

    // IMPORTANT: Do not assign to all counties if we couldn't determine specific ones
    // Instead, log this for investigation
    if (empty($affectedCounties)) {
        error_log("Warning: Could not determine affected counties for alert ID: " .
            ($alert['properties']['id'] ?? 'unknown'));
        // Only return counties that are explicitly mentioned or matching geographic criteria
    }

    // Remove duplicates and return
    return array_unique($affectedCounties);
}

// Get counties configuration
$counties = getCountyConfig();
error_log("Found " . count($counties) . " counties to process for alerts");
// ===== DEBUGGING ADDITION =====
addDebugLog("Found " . count($counties) . " counties to process for alerts");
// ===== END DEBUGGING ADDITION =====

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

// ===== MODIFIED URL (START) - Changed during chat session =====
// Original:
// $regionUrl = "https://api.weather.gov/alerts/active?status=actual&message_type=alert&region_type=land&area=NC";
// Modified to include watches and all other alert types (removed message_type filter):
$regionUrl = "https://api.weather.gov/alerts/active?status=actual&area=NC";
// ===== MODIFIED URL (END) =====

// ===== DEBUGGING ADDITION =====
addDebugLog("About to fetch alerts for region");
addDebugLog("Fetching from: $regionUrl");
// ===== END DEBUGGING ADDITION =====

$alertsResponse = fetchData($regionUrl, $userAgent);

if ($alertsResponse) {
    // ===== DEBUGGING ADDITION =====
    addDebugLog("Received response from NWS API (" . strlen($alertsResponse) . " bytes)");
    // ===== END DEBUGGING ADDITION =====

    $alertsData = json_decode($alertsResponse, true);
    if (isset($alertsData['features']) && !empty($alertsData['features'])) {
        $alertFeatures = $alertsData['features'];

        // ===== DEBUGGING ADDITION (START) - Added alert type tracking =====
        // Extract and log alert types
        $alertTypes = [];
        foreach ($alertFeatures as $alert) {
            if (isset($alert['properties']['event'])) {
                $eventType = $alert['properties']['event'];
                if (!isset($alertTypes[$eventType])) {
                    $alertTypes[$eventType] = 0;
                }
                $alertTypes[$eventType]++;
            }
        }

        addDebugLog("Found " . count($alertFeatures) . " active alerts in the region");

        // Log the types of alerts found
        foreach ($alertTypes as $type => $count) {
            addDebugLog("- $count x $type");
        }
        // ===== DEBUGGING ADDITION (END) =====

        error_log("Found " . count($alertFeatures) . " active alerts in the region");

        // Process each alert
        foreach ($alertFeatures as $alert) {
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
                        $countyAlerts = $countyData['alerts'];
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

                // Save county-specific alerts file
                $countyData = [
                    'timestamp' => time(),
                    'lastUpdated' => date('Y-m-d H:i:s'),
                    'alerts' => $countyAlerts
                ];

                file_put_contents($countyFile, json_encode($countyData));
                error_log("Alert cache updated for {$countyName}: {$alertEvent}");
                // ===== DEBUGGING ADDITION =====
                addDebugLog("Alert cache updated for {$countyName}: {$alertEvent}");
                // ===== END DEBUGGING ADDITION =====
            }
        }
    } else {
        error_log("No active alerts found in the region");
        // ===== DEBUGGING ADDITION =====
        addDebugLog("No alerts found in API response");
        // Create empty master alerts file
        $emptyMasterAlerts = [
            'timestamp' => time(),
            'lastUpdated' => date('Y-m-d H:i:s'),
            'alerts' => []
        ];
        file_put_contents($cacheDir . $masterAlertsFile, json_encode($emptyMasterAlerts));
        addDebugLog("Created empty master alerts file");
        // ===== END DEBUGGING ADDITION =====
    }

    // Save master alerts file
    file_put_contents($cacheDir . $masterAlertsFile, json_encode($masterAlerts));
    error_log("Master alerts file updated with " . count($masterAlerts['alerts']) . " alerts");
    // ===== DEBUGGING ADDITION =====
    addDebugLog("Master alerts file updated with " . count($masterAlerts['alerts']) . " alerts");
    // ===== END DEBUGGING ADDITION =====
} else {
    error_log("Failed to fetch alerts for the region");
    // ===== DEBUGGING ADDITION =====
    addDebugLog("Failed to fetch alerts from NWS API");
    // ===== END DEBUGGING ADDITION =====
}

// ===== DEBUGGING ADDITION (START) - Ensure master alerts file exists =====
// At the end of the script, just before outputting the final message
if (!file_exists($cacheDir . $masterAlertsFile)) {
    addDebugLog("Master alerts file not created during processing, creating empty one");
    $emptyMasterAlerts = [
        'timestamp' => time(),
        'lastUpdated' => date('Y-m-d H:i:s'),
        'alerts' => []
    ];
    file_put_contents($cacheDir . $masterAlertsFile, json_encode($emptyMasterAlerts));
}
// ===== DEBUGGING ADDITION (END) =====

// ===== DEBUGGING ADDITIONS (START) - Added during chat session =====
if (php_sapi_name() !== 'cli') {
    echo "\nFinished processing alerts\n";
    echo "Cache directory: " . realpath($cacheDir) . "\n";

    // List files in cache directory
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
// ===== DEBUGGING ADDITIONS (END) =====