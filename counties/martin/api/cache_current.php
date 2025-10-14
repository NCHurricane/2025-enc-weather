<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * NWS API Current Conditions Script - cache_current.php
 * Fetches NWS current conditions for configured stations and caches them as JSON.
 *
 * Martin County, NC
 *
 */

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$configPath = $dataDir . '/config.json';
$outPath = $dataDir . '/current.json';

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

// Unit conversion functions with unit code awareness
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

$config = json_decode(file_get_contents($configPath), true);
$stations = $config['stations'] ?? [];

if (!is_array($stations)) {
  error_log("Error: stations config is not an array");
  exit(1);
}

$nowIso = gmdate('c');

$result = [
  'generated' => $nowIso,
  'stations' => []
];

// Process each station in the array
foreach ($stations as $index => $station) {
  if (!isset($station['id'])) {
    error_log("Warning: Station at index {$index} missing ID, skipping");
    continue;
  }
  
  $sid = $station['id'];
  $stationName = $station['name'] ?? $station['friendlyName'] ?? $sid;
  
  error_log("Processing station: {$sid}");
  
  // NWS obs endpoint pattern: /stations/{id}/observations/latest
  // Fetch the list of recent observations to find the latest one with a temperature reading.
  $url = "https://api.weather.gov/stations/{$sid}/observations?limit=5";
  $json = http_get_json($url);

  $observationProperties = null;

  if ($json && isset($json['features']) && is_array($json['features'])) {
      foreach ($json['features'] as $observation) {
          // Check if this observation has a non-null temperature value.
          if (isset($observation['properties']['temperature']['value']) && $observation['properties']['temperature']['value'] !== null) {
              $observationProperties = $observation['properties'];
              error_log("Found valid observation for {$sid} at timestamp: " . ($observationProperties['timestamp'] ?? 'N/A'));
              break; // Use the first one found (which is the most recent).
          }
      }
  } else if ($json && isset($json['properties'])) {
      $observationProperties = $json['properties'];
  }

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
      'feelsLike' => null,
      'icon' => null
    ]
  ];

  if ($observationProperties) {
    $p = $observationProperties;
    $tObs = $p['timestamp'] ?? null;
    $ageMin = null;
    if ($tObs) {
      $ageMin = (int) max(0, round((time() - strtotime($tObs)) / 60));
    }
    $entry['observation']['timestamp'] = $tObs;
    $entry['observation']['age_minutes'] = $ageMin;

    // Extract values and unit codes
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

    // Determine canonical feels-like selection while preserving raw values
    $T  = $entry['data']['temperature'];
    $RH = $entry['data']['humidity'];
    $HI = $entry['data']['heatIndex'];
    $WCv = $entry['data']['windChill'];

    $showHI = ($HI !== null) && ($T !== null && $T >= 80) && ($RH === null || $RH >= 40);
    $showWC = ($WCv !== null) && ($T !== null && $T <= 50);

    if ($showHI && $showWC) {
      // Prefer heat index in warm scenarios if both conditions somehow trip
      $showWC = false;
    }

    $feelsLike = null;
    if ($showHI) {
      $feelsLike = ['type' => 'heatIndex', 'value' => $HI];
    } elseif ($showWC) {
      $feelsLike = ['type' => 'windChill', 'value' => $WCv];
    }

    $entry['data']['feelsLike'] = $feelsLike;
    
  $flType = $entry['data']['feelsLike']['type'] ?? 'none';
  error_log("Successfully processed {$sid}: temp={$entry['data']['temperature']}, wind={$entry['data']['windSpeed']}, feelsLike={$flType}");
  } else {
    error_log("Failed to get data for station: {$sid}");
  }

  // Use station ID as key for easy lookup
  $result['stations'][$sid] = $entry;
}

if (atomic_write_json($outPath, $result)) {
  error_log("Successfully wrote current.json with " . count($result['stations']) . " stations");
  echo "OK\n";
} else {
  error_log("Failed to write current.json");
  echo "ERROR\n";
}
?>