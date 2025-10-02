<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * NWS API Current Conditions Script - cache_current.php
 * Fetches NWS current conditions for configured stations and caches them as JSON.
 *
 * - Hyde County, NC
 *
 */

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$configPath = $dataDir . '/config.json';

function http_get_json(string $url, int $timeout = 10, int $retries = 2) {
  $attempt = 0;
  $delay = 250000; // 0.25s
  while (true) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => $timeout,
      CURLOPT_TIMEOUT => $timeout,
      CURLOPT_USERAGENT => 'NCHurricaneCache/1.0',
      CURLOPT_HTTPHEADER => ['Accept: application/geo+json, application/json;q=0.9'],
    ]);
    $body = curl_exec($ch);
    $err  = curl_errno($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$err && $code >= 200 && $code < 300 && $body) {
      $json = json_decode($body, true);
      if (json_last_error() === JSON_ERROR_NONE) return $json;
    }

    if ($attempt >= $retries) return null;
    usleep($delay);
    $delay *= 2;
    $attempt++;
  }
}

// Unit conversion functions (same as Bertie)
function convert_temperature($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:degC') {
    return round(($value * 9/5) + 32); // Celsius to Fahrenheit
  }
  return round($value); // Already Fahrenheit or other
}

function convert_wind_speed($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:km_h-1') {
    return round($value * 0.621371); // km/h to mph
  } elseif ($unitCode === 'wmoUnit:m_s-1') {
    return round($value * 2.236936); // m/s to mph
  }
  return round($value); // Already mph or other
}

function convert_pressure($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:Pa') {
    return round($value / 100, 1); // Pascals to millibars
  }
  return round($value, 1); // Already millibars or other
}

function convert_visibility($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:m') {
    return round($value / 1609.344); // meters to miles
  }
  return round($value); // Already miles or other
}

function atomic_write_json(string $path, array $data): bool {
  $tmp = $path . '.tmp';
  $json = json_encode($data, JSON_UNESCAPED_SLASHES);
  if ($json === false) return false;
  if (file_put_contents($tmp, $json) === false) return false;
  return rename($tmp, $path);
}

function degToCompass(float $deg): string {
  $dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  $ix = (int) round(($deg % 360) / 22.5) % 16;
  return $dirs[$ix];
}

/**
 * Process stations for a single zone using Bertie's proven logic
 */
function processZoneStations(array $stations, string $zoneName): array {
  $nowIso = gmdate('c');
  
  $result = [
    'generated' => $nowIso,
    'stations' => []
  ];
  
  error_log("Processing {$zoneName} with " . count($stations) . " stations");

  foreach ($stations as $index => $station) {
    if (!isset($station['id'])) {
      error_log("Warning: Station at index {$index} in zone {$zoneName} missing ID, skipping");
      continue;
    }
    
    $sid = $station['id'];
    $stationName = $station['name'] ?? $station['friendlyName'] ?? $sid;
    
    error_log("Processing zone {$zoneName}, station: {$sid}");
    
    // NWS obs endpoint pattern: /stations/{id}/observations/latest
    $url = "https://api.weather.gov/stations/{$sid}/observations/latest?require_qc=false";
    $json = http_get_json($url);

    $entry = [
      'id' => $sid,
      'name' => $stationName,
      'observation' => [
        'timestamp' => null,
        'age_minutes' => null
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

    if ($json && isset($json['properties'])) {
      $p = $json['properties'];
      $tObs = $p['timestamp'] ?? null;
      $ageMin = null;
      if ($tObs) {
        $ageMin = (int) max(0, round((time() - strtotime($tObs)) / 60));
      }
      $entry['observation']['timestamp'] = $tObs;
      $entry['observation']['age_minutes'] = $ageMin;

      // Extract values and unit codes (same as Bertie)
      $temp = $p['temperature']['value'] ?? null;
      $tempUnit = $p['temperature']['unitCode'] ?? null;
      
      $dew = $p['dewpoint']['value'] ?? null;
      $dewUnit = $p['dewpoint']['unitCode'] ?? null;
      
      $relH = $p['relativeHumidity']['value'] ?? null;
      
      $press = $p['barometricPressure']['value'] ?? null;
      $pressUnit = $p['barometricPressure']['unitCode'] ?? null;
      
      $wind = $p['windSpeed']['value'] ?? null;
      $windUnit = $p['windSpeed']['unitCode'] ?? null;
      
      $windDir = $p['windDirection']['value'] ?? null;
      
      $gust = $p['windGust']['value'] ?? null;
      $gustUnit = $p['windGust']['unitCode'] ?? null;
      
      $vis = $p['visibility']['value'] ?? null;
      $visUnit = $p['visibility']['unitCode'] ?? null;
      
      $heatIdx = $p['heatIndex']['value'] ?? null;
      $heatIdxUnit = $p['heatIndex']['unitCode'] ?? null;
      
      $windChill = $p['windChill']['value'] ?? null;
      $windChillUnit = $p['windChill']['unitCode'] ?? null;
      
      $icon = $p['icon'] ?? null;
      $wx = $p['textDescription'] ?? null;

      $entry['data'] = [
        'temperature' => convert_temperature($temp, $tempUnit),
        'dewpoint' => convert_temperature($dew, $dewUnit),
        'humidity' => ($relH !== null) ? round($relH) : null,
        'pressure' => convert_pressure($press, $pressUnit),
        'windSpeed' => convert_wind_speed($wind, $windUnit),
        'windDirection' => ($windDir !== null) ? degToCompass((float)$windDir) : null,
        'windGust' => convert_wind_speed($gust, $gustUnit),
        'visibility' => convert_visibility($vis, $visUnit),
        'conditions' => $wx,
        'heatIndex' => convert_temperature($heatIdx, $heatIdxUnit),
        'windChill' => convert_temperature($windChill, $windChillUnit),
        'icon' => $icon ? str_replace('size=medium', 'size=large', $icon) : null,
      ];
      
      error_log("Successfully processed {$zoneName}:{$sid}: temp={$entry['data']['temperature']}, wind={$entry['data']['windSpeed']}");
    } else {
      error_log("Failed to get data for station: {$zoneName}:{$sid}");
    }

    // Use station ID as key for easy lookup (same as Bertie)
    $result['stations'][$sid] = $entry;
  }

  return $result;
}

/**
 * Main execution
 */
try {
  // Load configuration
  if (!file_exists($configPath)) {
    throw new Exception("Config file not found: {$configPath}");
  }
  
  $config = json_decode(file_get_contents($configPath), true);
  if (!$config) {
    throw new Exception("Failed to parse config.json");
  }

  $countyName = $config['county']['name'] ?? 'Unknown';
  $isMultiZone = $config['county']['multiZone'] ?? false;
  
  if (!$isMultiZone) {
    throw new Exception("This script is for multi-zone counties only");
  }
  
  error_log("Processing current conditions for {$countyName} County (multi-zone)");
  
  $zones = $config['zones'] ?? [];
  if (empty($zones)) {
    throw new Exception("No zones found in config");
  }
  
  $processedZones = 0;
  
  foreach ($zones as $zoneName => $zoneConfig) {
    error_log("Processing zone: {$zoneName}");
    
    // Create zone directory
    $zoneDataDir = $dataDir . '/' . $zoneName;
    if (!is_dir($zoneDataDir)) {
      if (!mkdir($zoneDataDir, 0755, true)) {
        error_log("Failed to create directory: {$zoneDataDir}");
        continue;
      }
    }
    
    // Get stations for this zone
    $stations = $zoneConfig['stations'] ?? [];
    error_log("Found " . count($stations) . " stations for zone {$zoneName}");
    
    if (empty($stations)) {
      error_log("Warning: No stations found for zone {$zoneName}");
      // Still create empty file for consistency
      $emptyResult = [
        'generated' => gmdate('c'),
        'stations' => []
      ];
      $outPath = $zoneDataDir . '/current.json';
      atomic_write_json($outPath, $emptyResult);
      continue;
    }
    
    // Process stations for this zone
    $zoneResult = processZoneStations($stations, $zoneName);
    
    // Write zone-specific current.json file
    $outPath = $zoneDataDir . '/current.json';
    if (atomic_write_json($outPath, $zoneResult)) {
      error_log("Successfully wrote {$outPath} with " . count($zoneResult['stations']) . " stations");
      $processedZones++;
    } else {
      error_log("Failed to write {$outPath}");
    }
  }
  
  if ($processedZones > 0) {
    echo "OK - Processed {$processedZones} zones\n";
  } else {
    echo "ERROR - No zones processed successfully\n";
    exit(1);
  }
  
} catch (Exception $e) {
  error_log("Error in cache_current.php: " . $e->getMessage());
  echo "ERROR\n";
  exit(1);
}
?>