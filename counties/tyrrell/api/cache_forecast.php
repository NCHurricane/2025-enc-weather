<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * NWS API Current Conditions Script - cache_current.php
 * Fetches NWS API current conditions and caches them as JSON.
 *
 * Single-zone county:
 * - Tyrrell County, NC (zone: NCZ046)
 * - Tyrrell County, NC (zone: NCC177)
 * 
 */

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$config = json_decode(file_get_contents($dataDir . '/config.json'), true);
$lat = $config['location']['lat'] ?? null;
$lon = $config['location']['lon'] ?? null;

function http_get_json($url, $timeout=10, $retries=2) {
  $attempt=0; $delay=250000;
  while (true) {
    $ch=curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>$timeout, CURLOPT_TIMEOUT=>$timeout,
      CURLOPT_USERAGENT=>'NCHurricaneCache/1.0', CURLOPT_HTTPHEADER=>['Accept: application/geo+json, application/json;q=0.9']
    ]);
    $body=curl_exec($ch); $err=curl_errno($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    if(!$err && $code>=200 && $code<300 && $body){ $j=json_decode($body,true); if(json_last_error()===JSON_ERROR_NONE) return $j; }
    if($attempt>=2) return null; usleep($delay); $delay*=2; $attempt++;
  }
}

function atomic_write_json($path,$arr){
  $tmp=$path.'.tmp'; $json=json_encode($arr, JSON_UNESCAPED_SLASHES);
  if($json===false) return false; if(file_put_contents($tmp,$json)===false) return false; return rename($tmp,$path);
}
function ensure_large_icon($url) {
  if (!$url) return $url;
  // Replace size=medium with size=large
  return str_replace('size=medium', 'size=large', $url);
}

// Helper function to convert Celsius to Fahrenheit
function celsiusToFahrenheit($celsius) {
  return $celsius !== null ? round(($celsius * 9/5) + 32) : null;
}

if ($lat===null || $lon===null) { http_response_code(500); exit("Missing lat/lon\n"); }
$points = http_get_json("https://api.weather.gov/points/{$lat},{$lon}");
$fcUrl = $points['properties']['forecast'] ?? null;
$hrUrl = $points['properties']['forecastHourly'] ?? null;

$forecast = $fcUrl ? http_get_json($fcUrl) : null;
$hourly   = $hrUrl ? http_get_json($hrUrl) : null;

$nowIso = gmdate('c');

// Build forecast.json
$outForecast = [
  'generated' => $nowIso,
  'location' => [
    'city' => $config['location']['city'] ?? ($config['county']['name'] ?? 'Bertie'),
    'lat' => $lat, 'lon' => $lon
  ],
  'periods' => []
];

if ($forecast && isset($forecast['properties']['periods'])) {
  foreach ($forecast['properties']['periods'] as $p) {
    $outForecast['periods'][] = [
      'number' => $p['number'] ?? null,
      'name' => $p['name'] ?? null,
      'startTime' => $p['startTime'] ?? null,
      'endTime' => $p['endTime'] ?? null,
      'isDaytime' => $p['isDaytime'] ?? null,
      'temperature' => $p['temperature'] ?? null,
      'temperatureUnit' => $p['temperatureUnit'] ?? 'F',
      'windSpeed' => $p['windSpeed'] ?? null,
      'windDirection' => $p['windDirection'] ?? null,
      'icon' => ensure_large_icon($p['icon'] ?? null),
      'shortForecast' => $p['shortForecast'] ?? null,
      'detailedForecast' => $p['detailedForecast'] ?? null
    ];
  }
}

atomic_write_json($dataDir . '/forecast.json', $outForecast);

// Build hourly.json (write raw-ish but present) - ENHANCED with dewpoint and humidity
$outHourly = [
  'generated' => $nowIso,
];
if ($hourly && isset($hourly['properties']['periods'])) {
  foreach ($hourly['properties']['periods'] as $h) {
    // Extract dewpoint from NWS format: { unitCode: "wmoUnit:degC", value: 24.444 }
    $dewpointCelsius = $h['dewpoint']['value'] ?? null;
    $dewpointFahrenheit = celsiusToFahrenheit($dewpointCelsius);
    
    // Extract relative humidity from NWS format: { unitCode: "wmoUnit:percent", value: 78 }
    $relativeHumidity = $h['relativeHumidity']['value'] ?? null;
    $relativeHumidityRounded = $relativeHumidity !== null ? round($relativeHumidity) : null;
    
    $outHourly['hours'][] = [
      'startTime' => $h['startTime'] ?? null,
      'temperature' => $h['temperature'] ?? null,
      'temperatureUnit' => $h['temperatureUnit'] ?? 'F',
      'dewpoint' => $dewpointFahrenheit,  // NEW: Converted to Fahrenheit
      'relativeHumidity' => $relativeHumidityRounded,  // NEW: Rounded percentage
      'windSpeed' => $h['windSpeed'] ?? null,
      'windDirection' => $h['windDirection'] ?? null,
      'shortForecast' => $h['shortForecast'] ?? null,
      'icon' => ensure_large_icon($h['icon'] ?? null),
      'probabilityOfPrecipitation' => $h['probabilityOfPrecipitation']['value'] ?? null
    ];
  }
}
atomic_write_json($dataDir . '/hourly.json', $outHourly);
echo "OK\n";