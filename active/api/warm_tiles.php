<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * Pre-download USGS XYZ tiles for a lon/lat bbox and zoom range.
 *
 * Usage (CLI):
 *   php warm_tiles.php --styles=topo,imagery --zmin=6 --zmax=8 --lonMin=-106 --lonMax=-60 --latMin=18 --latMax=50 [--sleepMs=40] [--purge=1]
 *
 * Styles: topo | imagery | shaded
 * Saves to: /js/data/tiles/{style}/{z}/{x}/{y}.{ext}
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../active/logs/warm_tiles_error.log');

if (!defined('STDERR')) {
  if (php_sapi_name() === 'cli') {
    define('STDERR', fopen('php://stderr', 'w'));
  } else {
    define('STDERR', null);
  }
}

if (php_sapi_name() !== 'cli') {
  if (defined('STDERR') && STDERR) {
    fwrite(STDERR, "Run from CLI.\n");
  } else {
    error_log("Run from CLI.\n");
  }
  exit(1);
}

// --- CONFIGURABLE ---
$ZMIN   = 5;
$ZMAX   = 8;
$styles = ['topo','imagery','shaded'];
$SLEEP  = 40;
$PURGE  = false;

function arg(string $k, $def = null) {
  foreach ($GLOBALS['argv'] as $a) {
    if (strpos($a, "--{$k}=") === 0) return substr($a, strlen($k) + 3);
  }
  return $def;
}
$ZMIN   = (int) arg('zmin', $ZMIN);
$ZMAX   = (int) arg('zmax', $ZMAX);
$stylesArg = arg('styles', implode(',', $styles));
$styles = array_values(array_filter(array_map('trim', explode(',', $stylesArg))));
$SLEEP  = (int) arg('sleepMs', $SLEEP);
$PURGE  = (bool) arg('purge', $PURGE);

$activeDir = __DIR__;
$siteRoot  = dirname(dirname($activeDir));

$TEMPLATES = [
  'topo'    => 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
  'imagery' => 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
  'shaded'  => 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}',
];

$stormDirs = glob($siteRoot . '/active/storms/*', GLOB_ONLYDIR);
$zoneIds = [];
foreach ($stormDirs as $stormDir) {
  $tcv = $stormDir . '/tcv.json';
  if (!is_file($tcv)) continue;
  $data = json_decode(file_get_contents($tcv), true);
  if (!isset($data['events']) || !is_array($data['events'])) continue;
  foreach ($data['events'] as $event) {
    if (!isset($event['zoneId'], $event['hazard'])) continue;
    $hazard = strtolower($event['hazard']);
    if ($hazard === 'wind' || $hazard === 'surge') {
      $zoneIds[$event['zoneId']] = true;
    }
  }
}
$zoneIds = array_keys($zoneIds);
if (!$zoneIds) {
  fwrite(STDERR, "No active wind/surge zones found in tcv.json files.\n");
  exit(0);
}

$geojsonPath = $siteRoot . '/active/cache/us_states_counties.geojson';
if (!is_file($geojsonPath)) {
  fwrite(STDERR, "GeoJSON not found: $geojsonPath\n");
  exit(1);
}
$geo = json_decode(file_get_contents($geojsonPath), true);
if (!isset($geo['features']) || !is_array($geo['features'])) {
  fwrite(STDERR, "Invalid GeoJSON structure.\n");
  exit(1);
}

$zoneGeoms = [];
foreach ($geo['features'] as $f) {
  if (!isset($f['properties']['zoneId']) && !isset($f['properties']['ZONE']) && !isset($f['properties']['GEOID'])) continue;
  $props = $f['properties'];
  $id = $props['zoneId'] ?? $props['ZONE'] ?? $props['GEOID'] ?? null;
  if ($id && in_array($id, $zoneIds, true)) {
    $zoneGeoms[$id] = $f['geometry'];
  }
}


$logDir = $siteRoot . '/active/logs';
if (!is_dir($logDir)) @mkdir($logDir, 0775, true);
$logFile = $logDir . '/warm_tiles_log';
function logmsg($msg) {
  global $logFile;
  $ts = date('Y-m-d H:i:s');
  @file_put_contents($logFile, "[$ts] $msg\n", FILE_APPEND | LOCK_EX);
  echo $msg . "\n";
}

logmsg('LOG TEST: Script started, log file path is: ' . $logFile);

if (!$zoneGeoms) {
  $msg = "No matching zone geometries found in GeoJSON. (Script ran, no alerts present.)";
  logmsg($msg);
  fwrite(STDERR, $msg . "\n");
  exit(0);
}

function bbox($geom) {
  $minLat =  90; $maxLat = -90; $minLon =  180; $maxLon = -180;
  $coords = [];
  if ($geom['type'] === 'Polygon') {
    $coords = $geom['coordinates'];
  } elseif ($geom['type'] === 'MultiPolygon') {
    foreach ($geom['coordinates'] as $poly) $coords = array_merge($coords, $poly);
  }
  foreach ($coords as $ring) {
    foreach ($ring as $pt) {
      $lon = $pt[0]; $lat = $pt[1];
      $minLat = min($minLat, $lat); $maxLat = max($maxLat, $lat);
      $minLon = min($minLon, $lon); $maxLon = max($maxLon, $lon);
    }
  }
  return [$minLon, $maxLon, $minLat, $maxLat];
}

$bboxes = [];
foreach ($zoneGeoms as $id => $geom) {
  $bboxes[] = bbox($geom);
}

echo "DONE. total={$done}, saved={$saved}, skipped={$skipped}, errors={$errors}\n";

$totalPlanned = 0;
foreach ($bboxes as $bbox) {
  list($LONMIN, $LONMAX, $LATMIN, $LATMAX) = $bbox;
  for ($z = $ZMIN; $z <= $ZMAX; $z++) {
    $x0 = lon2tileX($LONMIN, $z);
    $x1 = lon2tileX($LONMAX, $z);
    $y0 = lat2tileY($LATMAX, $z); // note: y increases southward
    $y1 = lat2tileY($LATMIN, $z);
    if ($x0 > $x1) [$x0, $x1] = [$x1, $x0];
    if ($y0 > $y1) [$y0, $y1] = [$y1, $y0];
    $count = ($x1 - $x0 + 1) * ($y1 - $y0 + 1);
    $totalPlanned += $count * count($styles);
  }
}
logmsg("Warming styles=[" . implode(',', $styles) . "] z={$ZMIN}..{$ZMAX} for " . count($bboxes) . " zone bboxes");
logmsg("Planned tiles: ~{$totalPlanned}");

$done = 0; $saved = 0; $skipped = 0; $errors = 0;

foreach ($bboxes as $bbox) {
  list($LONMIN, $LONMAX, $LATMIN, $LATMAX) = $bbox;
  foreach ($styles as $style) {
    $tpl = $TEMPLATES[$style];
    for ($z = $ZMIN; $z <= $ZMAX; $z++) {
      $x0 = lon2tileX($LONMIN, $z);
      $x1 = lon2tileX($LONMAX, $z);
      $y0 = lat2tileY($LATMAX, $z);
      $y1 = lat2tileY($LATMIN, $z);
      if ($x0 > $x1) [$x0, $x1] = [$x1, $x0];
      if ($y0 > $y1) [$y0, $y1] = [$y1, $y0];

      for ($x = $x0; $x <= $x1; $x++) {
        for ($y = $y0; $y <= $y1; $y++) {
          $destDir = "{$siteRoot}/js/data/tiles/{$style}/{$z}/{$x}";
          if (!is_dir($destDir)) @mkdir($destDir, 0775, true);
          $base = "{$destDir}/{$y}";

          $existing = null;
          foreach (['jpg','jpeg','png','webp'] as $e) {
            $p = "{$base}.{$e}"; if (is_file($p)) { $existing = $p; break; }
          }
          if ($existing && !$PURGE) { $skipped++; $done++; continue; }

          $url = str_replace(['{z}','{x}','{y}'], [$z,$x,$y], $tpl);
          $path = saveTile($url, $base);
          if ($path) { $saved++; }
          else { $errors++; }
          $done++;

          if ($done % 200 === 0) {
            logmsg("Progress: {$done}/{$totalPlanned} (saved={$saved}, skipped={$skipped}, errors={$errors})");
          }
          usleep($SLEEP * 1000);
        }
      }
    }
  }
}

logmsg("DONE. total={$done}, saved={$saved}, skipped={$skipped}, errors={$errors}");

const MAX_LAT = 85.05112878;
function clipLat(float $lat): float { return max(-MAX_LAT, min(MAX_LAT, $lat)); }
function lon2tileX(float $lon, int $z): int {
  return (int) floor( (($lon + 180.0) / 360.0) * (1 << $z) );
}
function lat2tileY(float $lat, int $z): int {
  $lat = clipLat($lat);
  $sin = sin($lat * M_PI / 180.0);
  $y = 0.5 - (log((1 + $sin) / (1 - $sin)) / (4 * M_PI));
  return (int) floor( $y * (1 << $z) );
}

function saveTile(string $url, string $destBase): ?string {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_USERAGENT      => 'NCHurricane/TileWarm (+https://nchurricane.com)',
    CURLOPT_HTTPHEADER     => ['Accept: image/avif,image/webp,*/*;q=0.8'],
  ]);
  $body = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $ct   = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
  curl_close($ch);

  if ($body === false || $code !== 200 || !$ct) return null;

  $ext = 'jpg';
  if (stripos($ct, 'png') !== false) $ext = 'png';
  elseif (stripos($ct, 'webp') !== false) $ext = 'webp';
  elseif (stripos($ct, 'jpeg') !== false) $ext = 'jpg';

  $path = "{$destBase}.{$ext}";
  @file_put_contents($path, $body);
  return $path;
}

$totalPlanned = 0;
for ($z = $ZMIN; $z <= $ZMAX; $z++) {
  $x0 = lon2tileX($LONMIN, $z);
  $x1 = lon2tileX($LONMAX, $z);
  $y0 = lat2tileY($LATMAX, $z); // note: y increases southward
  $y1 = lat2tileY($LATMIN, $z);
  if ($x0 > $x1) [$x0, $x1] = [$x1, $x0];
  if ($y0 > $y1) [$y0, $y1] = [$y1, $y0];
  $count = ($x1 - $x0 + 1) * ($y1 - $y0 + 1);
  $totalPlanned += $count * count($styles);
}
echo "Warming styles=[" . implode(',', $styles) . "] z={$ZMIN}..{$ZMAX} over lon=[{$LONMIN},{$LONMAX}] lat=[{$LATMIN},{$LATMAX}]\n";
echo "Planned tiles: ~{$totalPlanned}\n";

$done = 0; $saved = 0; $skipped = 0; $errors = 0;

foreach ($styles as $style) {
  $tpl = $TEMPLATES[$style];
  for ($z = $ZMIN; $z <= $ZMAX; $z++) {
    $x0 = lon2tileX($LONMIN, $z);
    $x1 = lon2tileX($LONMAX, $z);
    $y0 = lat2tileY($LATMAX, $z);
    $y1 = lat2tileY($LATMIN, $z);
    if ($x0 > $x1) [$x0, $x1] = [$x1, $x0];
    if ($y0 > $y1) [$y0, $y1] = [$y1, $y0];

    for ($x = $x0; $x <= $x1; $x++) {
      for ($y = $y0; $y <= $y1; $y++) {
        $destDir = "{$siteRoot}/js/data/tiles/{$style}/{$z}/{$x}";
        if (!is_dir($destDir)) @mkdir($destDir, 0775, true);
        $base = "{$destDir}/{$y}";

        $existing = null;
        foreach (['jpg','jpeg','png','webp'] as $e) {
          $p = "{$base}.{$e}"; if (is_file($p)) { $existing = $p; break; }
        }
        if ($existing && !$PURGE) { $skipped++; $done++; continue; }

        $url = str_replace(['{z}','{x}','{y}'], [$z,$x,$y], $tpl);
        $path = saveTile($url, $base);
        if ($path) { $saved++; }
        else { $errors++; }
        $done++;

        if ($done % 200 === 0) {
          echo "Progress: {$done}/{$totalPlanned} (saved={$saved}, skipped={$skipped}, errors={$errors})\n";
        }
        usleep($SLEEP * 1000);
      }
    }
  }
}

echo "DONE. total={$done}, saved={$saved}, skipped={$skipped}, errors={$errors}\n";
