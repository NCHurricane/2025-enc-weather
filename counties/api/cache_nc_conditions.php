<?php
declare(strict_types=1);

error_reporting(E_ALL);

/**
 * Build the shared North Carolina conditions cache used by county maps.
 *
 * The Synoptic token must be supplied by the server environment as
 * SYNOPTIC_API_TOKEN. This script is intended to run from cron every 30 minutes.
 */

$countiesRoot = dirname(__DIR__);
$catalogPath = $countiesRoot . '/nc-weather-stations.json';
$dataDir = $countiesRoot . '/data';
$outputPath = $dataDir . '/nc-current.json';
$lockPath = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
  . DIRECTORY_SEPARATOR
  . 'nchurricane-nc-conditions.lock';

const SYNOPTIC_LATEST_URL = 'https://api.synopticdata.com/v2/stations/latest';
const MIN_REPORTING_STATIONS = 100;

function fail(string $message): void {
  throw new RuntimeException($message);
}

function read_json_file(string $path): array {
  $body = @file_get_contents($path);
  if ($body === false) fail("Unable to read {$path}");

  $decoded = json_decode($body, true);
  if (!is_array($decoded)) fail("Invalid JSON in {$path}");
  return $decoded;
}

function http_get_json(string $url): array {
  $ch = curl_init($url);
  if ($ch === false) fail('Unable to initialize Synoptic request');

  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_USERAGENT => 'NCHurricaneNCConditions/1.0',
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
  ]);

  $body = curl_exec($ch);
  $curlError = curl_error($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($body === false) fail("Synoptic request failed: {$curlError}");
  if ($status < 200 || $status >= 300) fail("Synoptic request returned HTTP {$status}");

  $decoded = json_decode($body, true);
  if (!is_array($decoded)) fail('Synoptic response was not valid JSON');
  return $decoded;
}

function observation_for(array $observations, string $variable): ?array {
  $pattern = '/^' . preg_quote($variable, '/') . '_value_[0-9]+d?$/';
  $best = null;
  $bestTime = PHP_INT_MIN;

  foreach ($observations as $key => $observation) {
    if (!is_string($key) || preg_match($pattern, $key) !== 1 || !is_array($observation)) {
      continue;
    }

    $value = $observation['value'] ?? null;
    if (!is_numeric($value)) continue;

    $dateTime = $observation['date_time'] ?? null;
    $timestamp = is_string($dateTime) ? strtotime($dateTime) : false;
    $sortableTime = $timestamp === false ? PHP_INT_MIN + 1 : $timestamp;
    if ($best !== null && $sortableTime <= $bestTime) continue;

    $best = [
      'value' => (float) $value,
      'date_time' => is_string($dateTime) ? $dateTime : null,
    ];
    $bestTime = $sortableTime;
  }

  return $best;
}

function rounded_value(?array $observation, int $precision = 0): ?float {
  if ($observation === null) return null;
  return round((float) $observation['value'], $precision);
}

function newest_observation_time(array $observations): ?string {
  $newestIso = null;
  $newestTime = PHP_INT_MIN;

  foreach ($observations as $observation) {
    $dateTime = $observation['date_time'] ?? null;
    if (!is_string($dateTime)) continue;
    $timestamp = strtotime($dateTime);
    if ($timestamp === false || $timestamp <= $newestTime) continue;
    $newestIso = $dateTime;
    $newestTime = $timestamp;
  }

  return $newestIso;
}

function degrees_to_compass(?array $observation): ?string {
  if ($observation === null) return null;
  $directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  $degrees = fmod((float) $observation['value'], 360.0);
  if ($degrees < 0) $degrees += 360.0;
  $index = ((int) round($degrees / 22.5)) % 16;
  return $directions[$index];
}

function empty_station_entry(array $station): array {
  $id = (string) $station['id'];
  return [
    'id' => $id,
    'name' => (string) ($station['name'] ?? $station['friendlyName'] ?? $id),
    'observation' => [
      'timestamp' => null,
      'age_minutes' => null,
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
      'icon' => null,
    ],
  ];
}

function populate_station_entry(array $entry, array $station): array {
  $observations = is_array($station['OBSERVATIONS'] ?? null)
    ? $station['OBSERVATIONS']
    : [];
  $values = [
    'temperature' => observation_for($observations, 'air_temp'),
    'dewpoint' => observation_for($observations, 'dew_point_temperature'),
    'humidity' => observation_for($observations, 'relative_humidity'),
    'pressure' => observation_for($observations, 'sea_level_pressure'),
    'windSpeed' => observation_for($observations, 'wind_speed'),
    'windDirection' => observation_for($observations, 'wind_direction'),
    'windGust' => observation_for($observations, 'wind_gust'),
    'visibility' => observation_for($observations, 'visibility'),
    'heatIndex' => observation_for($observations, 'heat_index'),
    'windChill' => observation_for($observations, 'wind_chill'),
  ];

  $observedAt = newest_observation_time(array_values(array_filter($values)));
  $ageMinutes = $observedAt === null
    ? null
    : (int) max(0, round((time() - (int) strtotime($observedAt)) / 60));

  $entry['observation'] = [
    'timestamp' => $observedAt,
    'age_minutes' => $ageMinutes,
  ];
  $entry['data'] = [
    'temperature' => rounded_value($values['temperature']),
    'dewpoint' => rounded_value($values['dewpoint']),
    'humidity' => rounded_value($values['humidity']),
    'pressure' => rounded_value($values['pressure'], 1),
    'windSpeed' => rounded_value($values['windSpeed']),
    'windDirection' => degrees_to_compass($values['windDirection']),
    'windGust' => rounded_value($values['windGust']),
    'visibility' => rounded_value($values['visibility'], 1),
    'conditions' => null,
    'heatIndex' => rounded_value($values['heatIndex']),
    'windChill' => rounded_value($values['windChill']),
    'feelsLike' => null,
    'icon' => null,
  ];

  $temperature = $entry['data']['temperature'];
  $humidity = $entry['data']['humidity'];
  $heatIndex = $entry['data']['heatIndex'];
  $windChill = $entry['data']['windChill'];
  $showHeatIndex = $heatIndex !== null
    && $temperature !== null
    && $temperature >= 80
    && ($humidity === null || $humidity >= 40);
  $showWindChill = !$showHeatIndex
    && $windChill !== null
    && $temperature !== null
    && $temperature <= 50;

  if ($showHeatIndex) {
    $entry['data']['feelsLike'] = ['type' => 'heatIndex', 'value' => $heatIndex];
  } elseif ($showWindChill) {
    $entry['data']['feelsLike'] = ['type' => 'windChill', 'value' => $windChill];
  }

  return $entry;
}

function has_map_observation(array $entry): bool {
  $data = $entry['data'] ?? [];
  foreach (['temperature', 'dewpoint', 'humidity', 'pressure', 'windSpeed', 'windGust', 'visibility'] as $field) {
    if (($data[$field] ?? null) !== null) return true;
  }
  return false;
}

function atomic_write_json(string $path, array $data): void {
  $json = json_encode($data, JSON_UNESCAPED_SLASHES);
  if ($json === false) fail('Unable to encode shared conditions cache');

  $temporaryPath = $path . '.' . getmypid() . '.tmp';
  if (file_put_contents($temporaryPath, $json . PHP_EOL, LOCK_EX) === false) {
    fail("Unable to write {$temporaryPath}");
  }
  if (!rename($temporaryPath, $path)) {
    @unlink($temporaryPath);
    fail("Unable to publish {$path}");
  }
}

if (!is_dir($dataDir) && !mkdir($dataDir, 0775, true) && !is_dir($dataDir)) {
  fwrite(STDERR, "Unable to create shared data directory\n");
  exit(1);
}

$lockHandle = @fopen($lockPath, 'c');
if ($lockHandle === false) {
  fwrite(STDERR, "Unable to open shared cache lock\n");
  exit(1);
}
if (!flock($lockHandle, LOCK_EX | LOCK_NB)) {
  fclose($lockHandle);
  echo "SKIP: shared NC conditions cache is already running\n";
  exit(0);
}

try {
  $token = trim((string) getenv('SYNOPTIC_API_TOKEN'));
  if ($token === '') fail('SYNOPTIC_API_TOKEN is not configured');

  $catalog = read_json_file($catalogPath);
  $entries = [];
  foreach ($catalog as $station) {
    if (!is_array($station) || empty($station['id'])) continue;
    $id = strtoupper((string) $station['id']);
    if (isset($entries[$id])) fail("Duplicate station ID in catalog: {$id}");
    $entries[$id] = empty_station_entry($station);
  }
  if (count($entries) < MIN_REPORTING_STATIONS) fail('NC station catalog is unexpectedly small');

  $query = http_build_query([
    'token' => $token,
    'country' => 'US',
    'state' => 'NC',
    'status' => 'active',
    'vars' => implode(',', [
      'air_temp',
      'dew_point_temperature',
      'relative_humidity',
      'wind_speed',
      'wind_direction',
      'wind_gust',
      'sea_level_pressure',
      'visibility',
      'heat_index',
      'wind_chill',
    ]),
    'within' => 120,
    'showemptyvars' => 1,
    'showemptystations' => 1,
    'units' => 'english,temp|F,speed|mph,pres|mb',
  ], '', '&', PHP_QUERY_RFC3986);
  $response = http_get_json(SYNOPTIC_LATEST_URL . '?' . $query);

  $responseCode = (int) ($response['SUMMARY']['RESPONSE_CODE'] ?? 0);
  if ($responseCode !== 1) {
    $message = (string) ($response['SUMMARY']['RESPONSE_MESSAGE'] ?? 'unknown response');
    fail("Synoptic response was not successful: {$message}");
  }

  foreach (($response['STATION'] ?? []) as $station) {
    if (!is_array($station)) continue;
    $id = strtoupper((string) ($station['STID'] ?? ''));
    if ($id === '' || !isset($entries[$id])) continue;
    $entries[$id] = populate_station_entry($entries[$id], $station);
  }

  $reportingCount = count(array_filter($entries, 'has_map_observation'));
  if ($reportingCount < MIN_REPORTING_STATIONS) {
    fail("Only {$reportingCount} catalog stations returned map observations");
  }

  $result = [
    'generated' => gmdate('c'),
    'source' => 'Synoptic Data',
    'coverage' => 'statewide',
    'reportingStationCount' => $reportingCount,
    'stations' => $entries,
  ];
  atomic_write_json($outputPath, $result);
  echo 'OK: wrote ' . count($entries) . " stations ({$reportingCount} reporting)\n";
} catch (Throwable $error) {
  error_log('[cache_nc_conditions] ' . $error->getMessage());
  fwrite(STDERR, 'ERROR: ' . $error->getMessage() . "\n");
  exit(1);
} finally {
  flock($lockHandle, LOCK_UN);
  fclose($lockHandle);
}
