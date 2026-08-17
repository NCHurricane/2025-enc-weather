<?php
declare(strict_types=1);

error_reporting(E_ALL);

const NWS_STATIONS_URL = 'https://api.weather.gov/stations';
const NWS_COUNTY_ZONES_URL = 'https://api.weather.gov/zones/county';
const NWS_CATALOG_USER_AGENT = 'NCHurricane.com station catalog (https://www.nchurricane.com)';
const MIN_CATALOG_STATIONS = 100;

function fail(string $message): void {
  throw new RuntimeException($message);
}

function fetch_json(string $url): array {
  $handle = curl_init($url);
  if ($handle === false) fail('Unable to initialize NWS station request');
  curl_setopt_array($handle, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_USERAGENT => NWS_CATALOG_USER_AGENT,
    CURLOPT_HTTPHEADER => ['Accept: application/geo+json, application/json;q=0.9'],
    CURLOPT_ENCODING => '',
  ]);
  $body = curl_exec($handle);
  $error = curl_error($handle);
  $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
  curl_close($handle);

  if ($body === false) fail("NWS station request failed: {$error}");
  if ($status < 200 || $status >= 300) fail("NWS station request returned HTTP {$status}");
  $decoded = json_decode($body, true);
  if (!is_array($decoded)) fail('NWS station response was not valid JSON');
  return $decoded;
}

function atomic_write_json(string $path, array $data): void {
  $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
  if ($json === false) fail('Unable to encode station catalog');

  $temporaryPath = $path . '.' . getmypid() . '.tmp';
  if (file_put_contents($temporaryPath, $json . PHP_EOL, LOCK_EX) === false) {
    fail("Unable to write {$temporaryPath}");
  }
  if (!rename($temporaryPath, $path)) {
    @unlink($temporaryPath);
    fail("Unable to publish {$path}");
  }
}

function state_fips(string $state): string {
  $codes = [
    'AL' => '01', 'AK' => '02', 'AZ' => '04', 'AR' => '05', 'CA' => '06',
    'CO' => '08', 'CT' => '09', 'DE' => '10', 'DC' => '11', 'FL' => '12',
    'GA' => '13', 'HI' => '15', 'ID' => '16', 'IL' => '17', 'IN' => '18',
    'IA' => '19', 'KS' => '20', 'KY' => '21', 'LA' => '22', 'ME' => '23',
    'MD' => '24', 'MA' => '25', 'MI' => '26', 'MN' => '27', 'MS' => '28',
    'MO' => '29', 'MT' => '30', 'NE' => '31', 'NV' => '32', 'NH' => '33',
    'NJ' => '34', 'NM' => '35', 'NY' => '36', 'NC' => '37', 'ND' => '38',
    'OH' => '39', 'OK' => '40', 'OR' => '41', 'PA' => '42', 'RI' => '44',
    'SC' => '45', 'SD' => '46', 'TN' => '47', 'TX' => '48', 'UT' => '49',
    'VT' => '50', 'VA' => '51', 'WA' => '53', 'WV' => '54', 'WI' => '55',
    'WY' => '56', 'AS' => '60', 'GU' => '66', 'MP' => '69', 'PR' => '72',
    'VI' => '78',
  ];
  if (!isset($codes[$state])) fail("No state FIPS mapping is available for {$state}");
  return $codes[$state];
}

function county_reference(string $state, string $stateFips): array {
  $url = NWS_COUNTY_ZONES_URL . '?' . http_build_query([
    'area' => $state,
    'limit' => 500,
  ], '', '&', PHP_QUERY_RFC3986);
  $geojson = fetch_json($url);
  $countyNames = [];
  foreach (($geojson['features'] ?? []) as $feature) {
    $properties = $feature['properties'] ?? [];
    $zoneId = strtoupper(trim((string) ($properties['id'] ?? '')));
    if (preg_match('/^' . preg_quote($state, '/') . 'C([0-9]{3})$/', $zoneId, $matches) !== 1) continue;
    $countyFips = $stateFips . $matches[1];
    $countyName = trim((string) ($properties['name'] ?? ''));
    if ($countyFips !== '' && $countyName !== '') $countyNames[$countyFips] = $countyName;
  }
  if (!$countyNames) fail("NWS county reference data is unavailable for {$state}");
  return $countyNames;
}

function county_fips_from_url(?string $countyUrl, string $state, string $stateFips): ?string {
  if ($countyUrl === null) return null;
  if (preg_match('#/([A-Z]{2})C([0-9]{3})$#', strtoupper($countyUrl), $matches) !== 1) {
    return null;
  }
  if ($matches[1] !== $state) return null;
  return $stateFips . $matches[2];
}

$options = getopt('', ['state:']);
$state = strtoupper(trim((string) ($options['state'] ?? '')));
if (preg_match('/^[A-Z]{2}$/', $state) !== 1) {
  fwrite(STDERR, "Usage: php build_state_station_catalog.php --state=FL\n");
  exit(1);
}

$countiesRoot = dirname(__DIR__);
$stateFips = state_fips($state);
$countyNames = county_reference($state, $stateFips);
$outputPath = $countiesRoot . '/' . strtolower($state) . '-weather-stations.json';

try {
  $url = NWS_STATIONS_URL . '?' . http_build_query([
    'state' => $state,
    'limit' => 500,
  ], '', '&', PHP_QUERY_RFC3986);
  $visitedUrls = [];
  $catalogById = [];
  $stats = [
    'pages' => 0,
    'returned' => 0,
    'omittedLongId' => 0,
    'missingId' => 0,
    'missingCoordinates' => 0,
    'missingCounty' => 0,
    'duplicateId' => 0,
  ];

  while ($url !== null) {
    if (isset($visitedUrls[$url])) fail('NWS station pagination repeated a URL');
    $visitedUrls[$url] = true;
    if (++$stats['pages'] > 100) fail('NWS station pagination exceeded 100 pages');

    $response = fetch_json($url);
    $features = $response['features'] ?? [];
    if (!is_array($features) || $features === []) break;

    foreach ($features as $feature) {
      $stats['returned']++;
      $properties = $feature['properties'] ?? [];
      $id = strtoupper(trim((string) ($properties['stationIdentifier'] ?? '')));
      if ($id === '') {
        $stats['missingId']++;
        continue;
      }
      if (strlen((string) preg_replace('/[^A-Za-z]/', '', $id)) > 4) {
        $stats['omittedLongId']++;
        continue;
      }
      if (isset($catalogById[$id])) {
        $stats['duplicateId']++;
        continue;
      }

      $coordinates = $feature['geometry']['coordinates'] ?? null;
      if (($feature['geometry']['type'] ?? null) !== 'Point'
          || !is_array($coordinates)
          || count($coordinates) < 2
          || !is_numeric($coordinates[0])
          || !is_numeric($coordinates[1])) {
        $stats['missingCoordinates']++;
        continue;
      }

      $countyFips = county_fips_from_url(
        isset($properties['county']) ? (string) $properties['county'] : null,
        $state,
        $stateFips
      );
      $countyName = $countyFips === null ? null : ($countyNames[$countyFips] ?? null);
      if ($countyFips === null || $countyName === null) {
        $stats['missingCounty']++;
        continue;
      }

      $name = trim((string) ($properties['name'] ?? ''));
      if ($name === '') $name = $id;
      $catalogById[$id] = [
        'id' => $id,
        'name' => $name,
        'friendlyName' => $name,
        'locationName' => $name,
        'county' => $countyName,
        'countyFips' => $countyFips,
        'url' => 'https://www.weather.gov/wrh/timeseries?site=' . rawurlencode($id),
        'lat' => (float) $coordinates[1],
        'lon' => (float) $coordinates[0],
      ];
    }

    $next = $response['pagination']['next'] ?? null;
    $url = is_string($next) && trim($next) !== '' ? $next : null;
  }

  uksort($catalogById, 'strnatcasecmp');
  $catalog = array_values($catalogById);
  if (count($catalog) < MIN_CATALOG_STATIONS) {
    fail("Only " . count($catalog) . " eligible stations were found for {$state}");
  }
  atomic_write_json($outputPath, $catalog);

  echo "OK {$state}: wrote " . count($catalog) . " stations to {$outputPath}\n";
  echo json_encode($stats, JSON_UNESCAPED_SLASHES) . "\n";
} catch (Throwable $error) {
  error_log('[build_state_station_catalog] ' . $error->getMessage());
  fwrite(STDERR, 'ERROR: ' . $error->getMessage() . "\n");
  exit(1);
}
