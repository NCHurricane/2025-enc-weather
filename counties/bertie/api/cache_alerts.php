<?php
declare(strict_types=1);
error_reporting(E_ALL);

require_once dirname(__DIR__, 2) . '/api/hwo_products.php';

/**
 * NWS API/ATOM Alert Script - cache_alerts.php
 * Fetches NWS API alerts and caches them as JSON.
 *
 * Single-zone county:
 * - Bertie County, NC (zone: NCZ030)
 * - Bertie County, NC (zone: NCC015)
 * 
 */

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$configPath = $dataDir . '/config.json';
$userAgent = "NCHurricane.com Weather App/1.0";

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

function atomic_write_json($filepath, $data) {
    $temp_file = $filepath . '.tmp';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
    if (file_put_contents($temp_file, $json, LOCK_EX) !== false) {
        if (rename($temp_file, $filepath)) {
            return true;
        }
    }
    
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

function isAlertActive($alert) {
    $expires = $alert['properties']['expires'] ?? null;
    
    if (!$expires) {
        return true;
    }
    
    $expiresTime = strtotime($expires);
    return $expiresTime > time();
}

function processAlert($alertFeature) {
    $props = $alertFeature['properties'] ?? [];
    
    $rawDescription = $props['description'] ?? null;
    $formattedDescription = $rawDescription ? formatNwsDescription($rawDescription) : null;
    
    $rawInstruction = $props['instruction'] ?? null;
    $formattedInstruction = $rawInstruction ? formatNwsDescription($rawInstruction) : null;
    
    return [
        'id' => $alertFeature['id'] ?? null,
        'type' => $props['event'] ?? null,
        'severity' => $props['severity'] ?? null,
        'urgency' => $props['urgency'] ?? null,
        'status' => $props['status'] ?? null,
        'headline' => $props['headline'] ?? null,
        'description' => $formattedDescription,
        'instruction' => $formattedInstruction,
        'onset' => $props['onset'] ?? null,
        'expires' => $props['expires'] ?? null,
        'areaDesc' => $props['areaDesc'] ?? null
    ];
}

function processZoneAlerts($zoneConfig, $userAgent) {
    $forecastZone = $zoneConfig['forecast'] ?? null;
    
    if (!$forecastZone) {
        error_log("No forecast zone found in zone config");
        return [];
    }
    
    error_log("Fetching alerts for zone: {$forecastZone}");
    
    $alertFeatures = fetchZoneAlerts($forecastZone, $userAgent);
    
    if (empty($alertFeatures)) {
        error_log("No alerts found for zone {$forecastZone}");
        return [];
    }
    
    $activeAlerts = [];
    
    foreach ($alertFeatures as $alertFeature) {
        if (isAlertActive($alertFeature)) {
            $processedAlert = processAlert($alertFeature);
            $activeAlerts[] = $processedAlert;
        }
    }
    
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
            $aOnset = strtotime($a['onset'] ?? '1970-01-01');
            $bOnset = strtotime($b['onset'] ?? '1970-01-01');
            return $bOnset - $aOnset;
        }
        
        return $aSeverity - $bSeverity;
    });
    
    error_log("Found " . count($activeAlerts) . " active alerts for zone {$forecastZone}");
    
    return $activeAlerts;
}

try {
    if (!file_exists($configPath)) {
        throw new Exception("Config file not found: {$configPath}");
    }
    
    $configContent = file_get_contents($configPath);
    $config = json_decode($configContent, true);
    
    if (!$config) {
        throw new Exception("Failed to parse config.json");
    }

    $forecastOfficeId = strtoupper((string) ($config['forecastOffice']['id'] ?? ''));
    $forecastOfficeName = (string) ($config['forecastOffice']['name'] ?? $forecastOfficeId);
    $hwoProduct = $forecastOfficeId !== ''
        ? nch_hwo_fetch_latest_product($forecastOfficeId, $userAgent)
        : nch_hwo_unavailable('', 'No forecast office is configured');
    
    $countyName = $config['county']['name'] ?? 'Unknown';
    $isMultiZone = $config['county']['multiZone'] ?? false;
    
    error_log("Processing alerts for {$countyName} County (multi-zone: " . ($isMultiZone ? 'yes' : 'no') . ")");
    
    if ($isMultiZone) {
        $zones = $config['zones'] ?? [];
        
        foreach ($zones as $zoneName => $zoneConfig) {
            error_log("Processing alerts for zone: {$zoneName}");
            
            $zoneDataDir = $dataDir . '/' . $zoneName;
            if (!is_dir($zoneDataDir)) {
                mkdir($zoneDataDir, 0755, true);
            }
            
            $alerts = processZoneAlerts($zoneConfig, $userAgent);
            
            $result = [
                'generated' => gmdate('Y-m-d\TH:i:s\Z'),
                'zone' => $zoneConfig['forecast'] ?? null,
                'alerts' => $alerts,
                'outlook' => nch_hwo_outlook_for_zone(
                    $hwoProduct,
                    (string) ($zoneConfig['forecast'] ?? ''),
                    $forecastOfficeName
                )
            ];
            
            $outPath = $zoneDataDir . '/alerts.json';
            if (atomic_write_json($outPath, $result)) {
                error_log("Successfully wrote alerts for zone {$zoneName} to {$outPath}");
            } else {
                error_log("Failed to write alerts for zone {$zoneName} to {$outPath}");
            }
        }
        
    } else {
        error_log("Processing single-zone county alerts");
        
        $zones = $config['zones'] ?? [];
        $forecastZone = $zones['forecast'] ?? null;
        
        if (!$forecastZone) {
            throw new Exception("No forecast zone found in single-zone config");
        }
        
        $tempZoneConfig = ['forecast' => $forecastZone];
        $alerts = processZoneAlerts($tempZoneConfig, $userAgent);
        
        $result = [
            'generated' => gmdate('Y-m-d\TH:i:s\Z'),
            'zone' => $forecastZone,
            'alerts' => $alerts,
            'outlook' => nch_hwo_outlook_for_zone(
                $hwoProduct,
                (string) $forecastZone,
                $forecastOfficeName
            )
        ];
        
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
