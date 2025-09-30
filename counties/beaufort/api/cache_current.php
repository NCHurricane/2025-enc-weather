<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * NWS API Current Conditions Script - cache_current.php
 * Fetches NWS current conditions for configured stations and caches them as JSON.
 *
 * Beaufort County, NC
 *
 */

declare(strict_types=1);
error_reporting(E_ALL);

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$configPath = $dataDir . '/config.json';
$outPath = $dataDir . '/current.json';

function http_get_json(string $url, int $timeout = 10, int $retries = 2) {
  $attempt = 0;
  $delay = 250000;
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

function convert_temperature($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:degC') {
    return round(($value * 9/5) + 32);
  }
  return round($value);
}

function convert_wind_speed($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:km_h-1') {
    return round($value * 0.621371);
  } elseif ($unitCode === 'wmoUnit:m_s-1') {
    return round($value * 2.236936);
  }
  return round($value);
}

function convert_pressure($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:Pa') {
    return round($value / 100, 1);
  }
  return round($value, 1);
}

function convert_visibility($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:m') {
    return round($value / 1609.344);
  }
  return round($value);
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

foreach ($stations as $index => $station) {
  if (!isset($station['id'])) {
    error_log("Warning: Station at index {$index} missing ID, skipping");
    continue;
  }
  
  $sid = $station['id'];
  $stationName = $station['name'] ?? $station['friendlyName'] ?? $sid;
  
  error_log("Processing station: {$sid}");
  
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
    
    error_log("Successfully processed {$sid}: temp={$entry['data']['temperature']}, wind={$entry['data']['windSpeed']}");
  } else {
    error_log("Failed to get data for station: {$sid}");
  }

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