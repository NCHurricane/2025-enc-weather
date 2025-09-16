<?php
// cache_alerts.php - Multi-zone version for Dare County
error_reporting(E_ALL);
ini_set('display_errors', 1);

$scriptDir = dirname(__FILE__);
$dataDir = $scriptDir . '/../data';
$configPath = $scriptDir . '/../data/config.json';
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

function formatNwsDescription($text) {
    $text = htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $text = preg_replace("/\r?\n/", "<br>", $text);

    $patterns = [
        '/\* WHAT\.\.\./i',
        '/\* WHERE\.\.\./i',
        '/\* WHEN\.\.\./i',
        '/\* IMPACTS?\.\.\./i'
    ];
    $replacements = [
        '<strong>WHAT...</strong>',
        '<strong>WHERE...</strong>',
        '<strong>WHEN...</strong>',
        '<strong>IMPACTS...</strong>'
    ];
    $text = preg_replace($patterns, $replacements, $text);

    $text = preg_replace('/(<br>\s*){2,}/', '</p><p>', $text);
    $text = '<p>' . $text . '</p>';

    return $text;
}

/**
 * Fetch alerts for specific zone from NWS API
 */
function fetchZoneAlerts($zoneId, $userAgent) {
    $url = "https://api.weather.gov/alerts/active/zone/{$zoneId}";
    
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
        return $data['features'] ?? [];
    }
    
    error_log("Failed to fetch alerts for zone {$zoneId}: HTTP {$httpCode}");
    return [];
}

/**
 * Check if alert is still active
 */
function isAlertActive($alert) {
    $expires = $alert['properties']['expires'] ?? null;
    
    if (!$expires) {
        return true; // No expiration time means it's still active
    }
    
    $expiresTime = strtotime($expires);
    return $expiresTime > time();
}

/**
 * Process alert data
 */
function processAlert($alertFeature) {
    $props = $alertFeature['properties'] ?? [];
    
    // Get raw description and format it
    $rawDescription = $props['description'] ?? null;
    $formattedDescription = $rawDescription ? formatNwsDescription($rawDescription) : null;
    
    // Get raw instruction and format it if present
    $rawInstruction = $props['instruction'] ?? null;
    $formattedInstruction = $rawInstruction ? formatNwsDescription($rawInstruction) : null;
    
    return [
        'id' => $alertFeature['id'] ?? null,
        'type' => $props['event'] ?? null,
        'severity' => $props['severity'] ?? null,
        'urgency' => $props['urgency'] ?? null,
        'status' => $props['status'] ?? null,
        'headline' => $props['headline'] ?? null,
        'description' => $formattedDescription,        // Now formatted
        'instruction' => $formattedInstruction,        // Also format instructions
        'onset' => $props['onset'] ?? null,
        'expires' => $props['expires'] ?? null,
        'areaDesc' => $props['areaDesc'] ?? null
    ];
}

/**
 * Process alerts for a zone
 */
function processZoneAlerts($zoneConfig, $userAgent) {
    $forecastZone = $zoneConfig['forecast'] ?? null;
    
    if (!$forecastZone) {
        error_log("No forecast zone found in zone config");
        return [];
    }
    
    error_log("Fetching alerts for zone: {$forecastZone}");
    
    // Fetch alerts for this zone
    $alertFeatures = fetchZoneAlerts($forecastZone, $userAgent);
    
    if (empty($alertFeatures)) {
        error_log("No alerts found for zone {$forecastZone}");
        return [];
    }
    
    // Process and filter active alerts
    $activeAlerts = [];
    
    foreach ($alertFeatures as $alertFeature) {
        if (isAlertActive($alertFeature)) {
            $processedAlert = processAlert($alertFeature);
            $activeAlerts[] = $processedAlert;
        }
    }
    
    // Sort alerts by severity (most severe first)
    $severityOrder = [
        'Extreme' => 1,
        'Severe' => 2,
        'Moderate' => 3,
        'Minor' => 4,
        'Unknown' => 5
    ];
    
    usort($activeAlerts, function($a, $b) use ($severityOrder) {
        $aSeverity = $severityOrder[$a['severity']] ?? 5;
        $bSeverity = $severityOrder[$b['severity']] ?? 5;
        
        if ($aSeverity === $bSeverity) {
            // Secondary sort by onset time (newer first)
            $aOnset = strtotime($a['onset'] ?? '1970-01-01');
            $bOnset = strtotime($b['onset'] ?? '1970-01-01');
            return $bOnset - $aOnset;
        }
        
        return $aSeverity - $bSeverity;
    });
    
    error_log("Found " . count($activeAlerts) . " active alerts for zone {$forecastZone}");
    
    return $activeAlerts;
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
    
    error_log("Processing alerts for {$countyName} County (multi-zone: " . ($isMultiZone ? 'yes' : 'no') . ")");
    
    if ($isMultiZone) {
        // Multi-zone county: process each zone separately
        $zones = $config['zones'] ?? [];
        
        foreach ($zones as $zoneName => $zoneConfig) {
            error_log("Processing alerts for zone: {$zoneName}");
            
            // Create zone directory
            $zoneDataDir = $dataDir . '/' . $zoneName;
            if (!is_dir($zoneDataDir)) {
                mkdir($zoneDataDir, 0755, true);
            }
            
            // Process alerts for this zone
            $alerts = processZoneAlerts($zoneConfig, $userAgent);
            
            // Build result for this zone
            $result = [
                'generated' => gmdate('Y-m-d\TH:i:s\Z'),
                'zone' => $zoneConfig['forecast'] ?? null,
                'alerts' => $alerts
            ];
            
            // Write zone-specific file
            $outPath = $zoneDataDir . '/alerts.json';
            if (atomic_write_json($outPath, $result)) {
                error_log("Successfully wrote alerts for zone {$zoneName} to {$outPath}");
            } else {
                error_log("Failed to write alerts for zone {$zoneName} to {$outPath}");
            }
        }
        
    } else {
        // Single-zone county: process all zones into one file
        error_log("Processing single-zone county alerts");
        
        $zones = $config['zones'] ?? [];
        $forecastZone = $zones['forecast'] ?? null;
        
        if (!$forecastZone) {
            throw new Exception("No forecast zone found in single-zone config");
        }
        
        // Create a temporary zone config for processing
        $tempZoneConfig = ['forecast' => $forecastZone];
        $alerts = processZoneAlerts($tempZoneConfig, $userAgent);
        
        // Build result
        $result = [
            'generated' => gmdate('Y-m-d\TH:i:s\Z'),
            'zone' => $forecastZone,
            'alerts' => $alerts
        ];
        
        // Write single file
        $outPath = $dataDir . '/alerts.json';
        if (atomic_write_json($outPath, $result)) {
            error_log("Successfully wrote alerts to {$outPath}");
        } else {
            error_log("Failed to write alerts to {$outPath}");
        }
    }
    
    error_log("Alerts cache update completed for {$countyName} County");
    
} catch (Exception $e) {
    error_log("Error in cache_alerts.php: " . $e->getMessage());
    exit(1);
}
?>