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
    // Function implementation remains the same
    // ...

    // Rest of the fetchData function code
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

// Get counties configuration BEFORE using it
$counties = getCountyConfig();
error_log("Found " . count($counties) . " counties to process for alerts");
addDebugLog("Found " . count($counties) . " counties to process for alerts");

// NOW it's safe to log this (moved this line from earlier in the file)
error_log("Starting alert cache process at " . date('Y-m-d H:i:s'));
addDebugLog("Starting alert cache process with " . count($counties) . " counties");

/**
 * Enhanced function to map alert geometry to county names
 */
/**
 * Enhanced function to map alert geometry to county names
 * Improved to prevent false matches like "Martin" matching "Martinsville"
 */
function mapAlertToCounties($alert, $counties)
{
    // Function for logging
    global $debugLog;
    $affectedCounties = [];

    // Check if the alert has UGC codes from geocode
    $alertUGCCodes = [];
    if (isset($alert['properties']['geocode']['UGC']) && is_array($alert['properties']['geocode']['UGC'])) {
        $alertUGCCodes = $alert['properties']['geocode']['UGC'];
        addDebugLog("Found UGC codes in alert: " . implode(", ", $alertUGCCodes));
    }

    // Get affected zone URLs from the alert
    $affectedZones = [];
    if (isset($alert['properties']['affectedZones']) && is_array($alert['properties']['affectedZones'])) {
        $affectedZones = $alert['properties']['affectedZones'];
        addDebugLog("Found affected zones in alert: " . implode(", ", $affectedZones));
    }

    // If no UGC codes or zones, this alert might not be properly formatted
    if (empty($alertUGCCodes) && empty($affectedZones)) {
        addDebugLog("WARNING: Alert has no UGC codes or affected zones");
    }

    // Check for each county if it's affected by this alert
    foreach ($counties as $county) {
        $countyName = $county['name'];
        $matchFound = false;

        // Debug log the county we're checking
        addDebugLog("Checking if alert affects county: $countyName");

        // Check if county's UGC code matches any in the alert
        if (isset($county['ugcCode']) && in_array($county['ugcCode'], $alertUGCCodes)) {
            addDebugLog("Match found: County UGC code {$county['ugcCode']} in alert");
            $matchFound = true;
        }

        // Check if county's zone URL matches any affected zones
        if (!$matchFound && isset($county['zoneURL']) && in_array($county['zoneURL'], $affectedZones)) {
            addDebugLog("Match found: County zone URL {$county['zoneURL']} in alert");
            $matchFound = true;
        }

        // As a fallback, check if alert affects this county by area description
        if (!$matchFound && isset($alert['properties']['areaDesc'])) {
            $areaDesc = $alert['properties']['areaDesc'];

            // ------------------------
            // NEW PRECISE MATCHING CODE
            // ------------------------

            // 1. Check for exact county name with word boundaries
            $countyNamePattern = '/\b' . preg_quote($countyName, '/') . '\b/i';
            if (preg_match($countyNamePattern, $areaDesc)) {
                // Further verify it's not part of a larger word or place name
                $contextWordsPattern = '/\b' . preg_quote($countyName, '/') . 's?ville\b|\b' .
                    preg_quote($countyName, '/') . 'boro\b|\bCity of ' .
                    preg_quote($countyName, '/') . '\b/i';

                // If it matches a known pattern for false positives, reject it
                if (preg_match($contextWordsPattern, $areaDesc)) {
                    addDebugLog("FALSE MATCH AVOIDED: '$countyName' found but appears to be part of place name like 'Martinsville'");
                } else {
                    addDebugLog("Match found: County name '$countyName' found in area description with word boundaries");
                    $matchFound = true;
                }
            }

            // 2. Check for specific context patterns that confirm it's a county
            if (!$matchFound) {
                $countyContextPatterns = [
                    '/' . preg_quote($countyName, '/') . '\s+County\b/i',  // "Martin County"
                    '/\b' . preg_quote($countyName, '/') . ',/i',          // "Martin," (comma after)
                    '/,\s+' . preg_quote($countyName, '/') . '\b/i',       // ", Martin" (comma before)
                    '/counties.*?\b' . preg_quote($countyName, '/') . '\b/i', // "counties... Martin"
                    '/\bareas.*?\b' . preg_quote($countyName, '/') . '\b/i'   // "areas... Martin"
                ];

                foreach ($countyContextPatterns as $pattern) {
                    if (preg_match($pattern, $areaDesc)) {
                        addDebugLog("Match found: County name '$countyName' found with confirming context pattern");
                        $matchFound = true;
                        break;
                    }
                }
            }

            // ------------------------
            // END NEW MATCHING CODE
            // ------------------------
        }

        // If we found a match, add this county to affected counties
        if ($matchFound) {
            $affectedCounties[] = $countyName;
            addDebugLog("Added $countyName to affected counties list");
        }
    }

    // If still empty, log it for investigation
    if (empty($affectedCounties)) {
        addDebugLog("WARNING: Could not determine affected counties for alert: " .
            ($alert['properties']['id'] ?? 'unknown'));

        // For debugging, extract the area description
        if (isset($alert['properties']['areaDesc'])) {
            $areaDesc = $alert['properties']['areaDesc'];
            addDebugLog("Area description is: " . $areaDesc);
        }
    }

    // Remove duplicates and return
    return array_unique($affectedCounties);
}

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

// Rest of the script processing the alerts response
// ...

// The remainder of the script stays the same
if ($alertsResponse) {
    // Processing code remains the same
    addDebugLog("Received response from NWS API (" . strlen($alertsResponse) . " bytes)");

    // Process the alerts from the response
    // ...

    $alertsData = json_decode($alertsResponse, true);
    if (isset($alertsData['features']) && !empty($alertsData['features'])) {
        $alertFeatures = $alertsData['features'];

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

        error_log("Found " . count($alertFeatures) . " active alerts in the region");

        // Process each alert
        foreach ($alertFeatures as $alert) {
            // Process alert code remains the same
            // ...
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
                addDebugLog("Alert cache updated for {$countyName}: {$alertEvent}");
            }
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

    // Save master alerts file
    file_put_contents($cacheDir . $masterAlertsFile, json_encode($masterAlerts));
    error_log("Master alerts file updated with " . count($masterAlerts['alerts']) . " alerts");
    addDebugLog("Master alerts file updated with " . count($masterAlerts['alerts']) . " alerts");
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
