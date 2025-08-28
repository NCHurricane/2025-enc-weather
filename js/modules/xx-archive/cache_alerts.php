<?php
// Simplified cache_alerts.php for zone-based workflow

$cacheDir = 'cache/';
$userAgent = "NCHurricane.com Weather App/1.0 (your@email.com)";

if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Get counties with zone mappings from existing config
function getCountyConfig() {
    $countiesFile = '../../counties/counties.json';
    if (file_exists($countiesFile)) {
        $jsonContent = file_get_contents($countiesFile);
        $countiesData = json_decode($jsonContent, true);
        
        // Extract zones from ugcCode field and group by county
        $counties = [];
        $processedCounties = [];
        
        foreach ($countiesData['counties'] ?? [] as $county) {
            $countyName = $county['name'];
            
            // Map multi-zone entries to base county names
            $countyNameMap = [
                'Mainland Hyde' => 'Hyde',
                'Ocracoke Island' => 'Hyde', 
                'Mainland Dare' => 'Dare',
                'Northern OBX' => 'Dare',
                'Hatteras Island' => 'Dare'
            ];
            $baseCountyName = $countyNameMap[$countyName] ?? $countyName;
            
            if (!isset($processedCounties[$baseCountyName])) {
                $processedCounties[$baseCountyName] = [
                    'name' => $baseCountyName,
                    'zones' => []
                ];
            }
            
            if (isset($county['ugcCode'])) {
                $processedCounties[$baseCountyName]['zones'][] = $county['ugcCode'];
            }
        }
        
        return array_values($processedCounties);
    }
    
    // Fallback if file doesn't exist
    return [
        ["name" => "Bertie", "zones" => ["NCZ030"]],
        ["name" => "Pitt", "zones" => ["NCZ044"]],
        ["name" => "Martin", "zones" => ["NCZ029"]],
        ["name" => "Beaufort", "zones" => ["NCZ080"]],
        ["name" => "Dare", "zones" => ["NCZ047", "NCZ203", "NCZ205"]],
        ["name" => "Washington", "zones" => ["NCZ045"]],
        ["name" => "Tyrrell", "zones" => ["NCZ046"]],
        ["name" => "Hyde", "zones" => ["NCZ081", "NCZ204"]]
    ];
}

// Fetch alerts for specific zone
function fetchZoneAlerts($zoneId, $userAgent) {
    $url = "https://api.weather.gov/alerts/active/zone/{$zoneId}";
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "User-Agent: " . $userAgent,
        "Accept: application/geo+json"
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($result, true);
        return $data['features'] ?? [];
    }
    
    return [];
}

// Check if alert is still active
function isAlertActive($alert) {
    $expires = $alert['properties']['expires'] ?? null;
    if (!$expires) return true;
    
    try {
        $expirationTime = new DateTime($expires);
        $currentTime = new DateTime();
        return $currentTime < $expirationTime;
    } catch (Exception $e) {
        return true; // Keep if we can't parse
    }
}

$counties = getCountyConfig();

foreach ($counties as $county) {
    $countyName = strtolower($county['name']);
    $zones = $county['zones'] ?? [];
    
    if (empty($zones)) continue;
    
    $countyAlerts = [];
    
    // Fetch alerts for each zone
    foreach ($zones as $zoneId) {
        $zoneAlerts = fetchZoneAlerts($zoneId, $userAgent);
        $countyAlerts = array_merge($countyAlerts, $zoneAlerts);
    }
    
    // Remove duplicates and filter active
    $uniqueAlerts = [];
    $seenIds = [];
    
    foreach ($countyAlerts as $alert) {
        if (!isAlertActive($alert)) continue;
        
        $alertId = $alert['id'] ?? $alert['properties']['id'] ?? uniqid();
        if (!in_array($alertId, $seenIds)) {
            $seenIds[] = $alertId;
            $uniqueAlerts[] = $alert['properties'] ?? $alert;
        }
    }
    
    // Save county file
    $countyData = [
        'timestamp' => time(),
        'lastUpdated' => date('Y-m-d H:i:s'),
        'county' => $county['name'],
        'zones' => $zones,
        'alerts' => $uniqueAlerts
    ];
    
    $countyFile = $cacheDir . $countyName . '_alerts.json';
    file_put_contents($countyFile, json_encode($countyData, JSON_PRETTY_PRINT));
    
    error_log("Updated {$countyName}: " . count($uniqueAlerts) . " alerts");
}

// Create master alerts file
$masterAlerts = [
    'timestamp' => time(),
    'lastUpdated' => date('Y-m-d H:i:s'),
    'alerts' => []
];

file_put_contents($cacheDir . 'master_alerts.json', json_encode($masterAlerts));
?>