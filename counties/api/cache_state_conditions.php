<?php
declare(strict_types=1);

error_reporting(E_ALL);

/**
 * Build a shared statewide conditions cache used by county maps.
 *
 * Station IDs come from {state}-weather-stations.json. Live observations come from
 * the NWS API using the same five-observation workflow as county cache scripts.
 * This script is intended to run from cron every 30 minutes.
 */

$options = PHP_SAPI === 'cli' ? getopt('', ['state:']) : [];
$requestedState = $conditionsState ?? ($options['state'] ?? '');
$state = strtoupper(trim((string) $requestedState));
if (preg_match('/^[A-Z]{2}$/', $state) !== 1) {
  fwrite(STDERR, "Usage: php cache_state_conditions.php --state=NC\n");
  exit(1);
}

$countiesRoot = dirname(__DIR__);
$stateSlug = strtolower($state);
$catalogPath = $countiesRoot . "/{$stateSlug}-weather-stations.json";
$dataDir = $countiesRoot . '/data';
$outputPath = $dataDir . "/{$stateSlug}-current.json";
$lockPath = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
  . DIRECTORY_SEPARATOR
  . "nchurricane-{$stateSlug}-conditions.lock";

const NWS_OBSERVATIONS_BASE_URL = 'https://api.weather.gov/stations';
const NWS_USER_AGENT = 'NCHurricane.com conditions cache (https://www.nchurricane.com)';
const MAX_CONCURRENT_REQUESTS = 8;
const MAX_REQUEST_ATTEMPTS = 2;
const MIN_EXPECTED_STATIONS = 100;

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

function station_observations_url(string $stationId): string {
  return NWS_OBSERVATIONS_BASE_URL
    . '/'
    . rawurlencode($stationId)
    . '/observations?limit=5';
}

function create_nws_handle(string $stationId) {
  $handle = curl_init(station_observations_url($stationId));
  if ($handle === false) fail("Unable to initialize NWS request for {$stationId}");

  curl_setopt_array($handle, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_USERAGENT => NWS_USER_AGENT,
    CURLOPT_HTTPHEADER => ['Accept: application/geo+json, application/json;q=0.9'],
    CURLOPT_ENCODING => '',
  ]);
  return $handle;
}

function execute_nws_batch(array $stationIds): array {
  $multiHandle = curl_multi_init();
  if ($multiHandle === false) fail('Unable to initialize NWS request batch');

  $handles = [];
  foreach ($stationIds as $stationId) {
    $handle = create_nws_handle($stationId);
    curl_multi_add_handle($multiHandle, $handle);
    $handles[$stationId] = $handle;
  }

  do {
    $multiStatus = curl_multi_exec($multiHandle, $active);
  } while ($multiStatus === CURLM_CALL_MULTI_PERFORM);

  while ($active && $multiStatus === CURLM_OK) {
    if (curl_multi_select($multiHandle, 1.0) === -1) usleep(10000);
    do {
      $multiStatus = curl_multi_exec($multiHandle, $active);
    } while ($multiStatus === CURLM_CALL_MULTI_PERFORM);
  }

  $results = [];
  foreach ($handles as $stationId => $handle) {
    $body = curl_multi_getcontent($handle);
    $curlError = curl_errno($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
    $payload = null;
    if ($curlError === CURLE_OK && $status >= 200 && $status < 300 && $body !== '') {
      $decoded = json_decode($body, true);
      if (is_array($decoded)) $payload = $decoded;
    }

    $results[$stationId] = [
      'payload' => $payload,
      'retryable' => $payload === null && (
        $curlError !== CURLE_OK
        || $status === 0
        || $status === 429
        || $status >= 500
      ),
      'status' => $status,
    ];
    curl_multi_remove_handle($multiHandle, $handle);
    curl_close($handle);
  }
  curl_multi_close($multiHandle);
  return $results;
}

function fetch_nws_observations(array $stationIds, callable $onResponse): array {
  $pending = array_values($stationIds);
  $retriedCount = 0;
  $availableCount = 0;

  for ($attempt = 1; $attempt <= MAX_REQUEST_ATTEMPTS && $pending; $attempt++) {
    $retry = [];
    foreach (array_chunk($pending, MAX_CONCURRENT_REQUESTS) as $batch) {
      foreach (execute_nws_batch($batch) as $stationId => $result) {
        if (is_array($result['payload'])) {
          $availableCount++;
          $onResponse($stationId, $result['payload']);
        } elseif ($result['retryable'] && $attempt < MAX_REQUEST_ATTEMPTS) {
          $retry[] = $stationId;
        }
      }
      usleep(50000);
    }

    $pending = array_values(array_unique($retry));
    if ($pending) {
      $retriedCount += count($pending);
      sleep($attempt);
    }
  }

  return [
    'availableCount' => $availableCount,
    'retriedCount' => $retriedCount,
  ];
}

function convert_temperature($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:degC') return round(((float) $value * 9 / 5) + 32);
  return round((float) $value);
}

function convert_wind_speed($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:km_h-1') return round((float) $value * 0.621371);
  if ($unitCode === 'wmoUnit:m_s-1') return round((float) $value * 2.236936);
  return round((float) $value);
}

function convert_pressure($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:Pa') return round((float) $value / 100, 1);
  return round((float) $value, 1);
}

function convert_visibility($value, $unitCode) {
  if ($value === null) return null;
  if ($unitCode === 'wmoUnit:m') return round((float) $value / 1609.344, 1);
  return round((float) $value, 1);
}

function degrees_to_compass(float $degrees): string {
  $directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  $normalized = fmod($degrees, 360.0);
  if ($normalized < 0) $normalized += 360.0;
  return $directions[((int) round($normalized / 22.5)) % 16];
}

function empty_station_entry(array $station): array {
  $id = strtoupper((string) $station['id']);
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

function select_observation_properties(?array $response): ?array {
  if ($response === null) return null;

  if (isset($response['features']) && is_array($response['features'])) {
    foreach ($response['features'] as $observation) {
      $properties = $observation['properties'] ?? null;
      if (!is_array($properties)) continue;
      if (($properties['temperature']['value'] ?? null) !== null) return $properties;
    }
  } elseif (isset($response['properties']) && is_array($response['properties'])) {
    return $response['properties'];
  }

  return null;
}

function populate_station_entry(array $entry, array $properties): array {
  $observedAt = isset($properties['timestamp']) && is_string($properties['timestamp'])
    ? $properties['timestamp']
    : null;
  $observedTimestamp = $observedAt === null ? false : strtotime($observedAt);
  $entry['observation'] = [
    'timestamp' => $observedAt,
    'age_minutes' => $observedTimestamp === false
      ? null
      : (int) max(0, round((time() - $observedTimestamp) / 60)),
  ];

  $temperature = convert_temperature(
    $properties['temperature']['value'] ?? null,
    $properties['temperature']['unitCode'] ?? null
  );
  $humidity = ($properties['relativeHumidity']['value'] ?? null) === null
    ? null
    : round((float) $properties['relativeHumidity']['value']);
  $heatIndex = convert_temperature(
    $properties['heatIndex']['value'] ?? null,
    $properties['heatIndex']['unitCode'] ?? null
  );
  $windChill = convert_temperature(
    $properties['windChill']['value'] ?? null,
    $properties['windChill']['unitCode'] ?? null
  );
  $windDirection = $properties['windDirection']['value'] ?? null;
  $icon = $properties['icon'] ?? null;

  $entry['data'] = [
    'temperature' => $temperature,
    'dewpoint' => convert_temperature(
      $properties['dewpoint']['value'] ?? null,
      $properties['dewpoint']['unitCode'] ?? null
    ),
    'humidity' => $humidity,
    'pressure' => convert_pressure(
      $properties['barometricPressure']['value'] ?? null,
      $properties['barometricPressure']['unitCode'] ?? null
    ),
    'windSpeed' => convert_wind_speed(
      $properties['windSpeed']['value'] ?? null,
      $properties['windSpeed']['unitCode'] ?? null
    ),
    'windDirection' => $windDirection === null
      ? null
      : degrees_to_compass((float) $windDirection),
    'windGust' => convert_wind_speed(
      $properties['windGust']['value'] ?? null,
      $properties['windGust']['unitCode'] ?? null
    ),
    'visibility' => convert_visibility(
      $properties['visibility']['value'] ?? null,
      $properties['visibility']['unitCode'] ?? null
    ),
    'conditions' => $properties['textDescription'] ?? null,
    'heatIndex' => $heatIndex,
    'windChill' => $windChill,
    'feelsLike' => null,
    'icon' => is_string($icon) ? str_replace('size=medium', 'size=large', $icon) : null,
  ];

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
  echo "SKIP: shared {$state} conditions cache is already running\n";
  exit(0);
}

try {
  $catalog = read_json_file($catalogPath);
  $entries = [];
  foreach ($catalog as $station) {
    if (!is_array($station) || empty($station['id'])) continue;
    $id = strtoupper((string) $station['id']);
    if (isset($entries[$id])) fail("Duplicate station ID in catalog: {$id}");
    $entries[$id] = empty_station_entry($station);
  }
  if (count($entries) < MIN_EXPECTED_STATIONS) fail("{$state} station catalog is unexpectedly small");

  $fetch = fetch_nws_observations(
    array_keys($entries),
    function (string $stationId, array $response) use (&$entries): void {
      $properties = select_observation_properties($response);
      if ($properties === null) return;
      $entries[$stationId] = populate_station_entry($entries[$stationId], $properties);
    }
  );

  $successfulResponseCount = $fetch['availableCount'];
  $reportingCount = count(array_filter($entries, 'has_map_observation'));
  if ($successfulResponseCount < MIN_EXPECTED_STATIONS || $reportingCount < MIN_EXPECTED_STATIONS) {
    fail(
      "NWS response was unexpectedly small: {$successfulResponseCount} available, "
      . "{$reportingCount} reporting"
    );
  }

  $result = [
    'generated' => gmdate('c'),
    'source' => 'National Weather Service API',
    'coverage' => 'statewide',
    'state' => $state,
    'requestedStationCount' => count($entries),
    'availableStationCount' => $successfulResponseCount,
    'reportingStationCount' => $reportingCount,
    'stations' => $entries,
  ];
  atomic_write_json($outputPath, $result);
  echo 'OK: wrote ' . count($entries)
    . " stations ({$successfulResponseCount} available, {$reportingCount} reporting, "
    . $fetch['retriedCount'] . " retries)\n";
} catch (Throwable $error) {
  error_log("[cache_state_conditions:{$state}] " . $error->getMessage());
  fwrite(STDERR, 'ERROR: ' . $error->getMessage() . "\n");
  exit(1);
} finally {
  flock($lockHandle, LOCK_UN);
  fclose($lockHandle);
}
