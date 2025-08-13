<?php
// counties/bertie/api/cache_current.php
declare(strict_types=1);

// Requirements ref: instructions.txt (Current Conditions Cache) 
// - poll all stations in config (primary/secondary/tertiary)
// - normalize units, compute age_minutes, allow nulls; write data/current.json

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

function f_to_f($c) { return ($c === null) ? null : round(($c * 9/5) + 32); }
function ms_to_mph($ms) { return ($ms === null) ? null : round($ms * 2.236936); }
function pa_to_mb($pa) { return ($pa === null) ? null : round($pa / 100, 1); } // 1 mb = 100 Pa
function m_to_miles($m) { return ($m === null) ? null : round($m / 1609.344); }

function atomic_write_json(string $path, array $data): bool {
  $tmp = $path . '.tmp';
  $json = json_encode($data, JSON_UNESCAPED_SLASHES);
  if ($json === false) return false;
  if (file_put_contents($tmp, $json) === false) return false;
  return rename($tmp, $path);
}

$config = json_decode(file_get_contents($configPath), true);
$stations = $config['stations'] ?? null;
if (!$stations) {
  // single-zone config format per spec
  // (multi-zone format not used for Bertie)
}

$nowIso = gmdate('c');

$result = [
  'generated' => $nowIso,
  'stations' => []
];

$slots = ['primary', 'secondary', 'tertiary'];
foreach ($slots as $slot) {
  if (!isset($stations[$slot]['id'])) continue;
  $sid = $stations[$slot]['id'];
  // NWS obs endpoint pattern: /stations/{id}/observations/latest
  $url = "https://api.weather.gov/stations/{$sid}/observations/latest";
  $json = http_get_json($url);

  $entry = [
    'id' => $sid,
    'name' => $stations[$slot]['name'] ?? $sid,
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

    $tempC = $p['temperature']['value'] ?? null;
    $dewC  = $p['dewpoint']['value'] ?? null;
    $relH  = $p['relativeHumidity']['value'] ?? null;
    $pressPa = $p['barometricPressure']['value'] ?? null;
    $windMs = $p['windSpeed']['value'] ?? null;
    $windDir = $p['windDirection']['value'] ?? null;
    $gustMs = $p['windGust']['value'] ?? null;
    $visM = $p['visibility']['value'] ?? null;
    $icon = $p['icon'] ?? null;
    $wx   = $p['textDescription'] ?? null;

    $entry['data'] = [
      'temperature' => $tempC !== null ? f_to_f($tempC) : null,
      'dewpoint' => $dewC !== null ? f_to_f($dewC) : null,
      'humidity' => ($relH !== null) ? round($relH) : null,
      'pressure' => pa_to_mb($pressPa),
      'windSpeed' => ms_to_mph($windMs),
      'windDirection' => ($windDir !== null) ? degToCompass((float)$windDir) : null,
      'windGust' => ms_to_mph($gustMs),
      'visibility' => m_to_miles($visM),
      'conditions' => $wx,
      'heatIndex' => null, // can be derived later if needed
      'windChill' => null,
      'icon' => $icon
    ];
  }

  $result['stations'][$slot] = $entry;
}

function degToCompass(float $deg): string {
  $dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  $ix = (int) round(($deg % 360) / 22.5) % 16;
  return $dirs[$ix];
}

atomic_write_json($outPath, $result);
echo "OK\n";
