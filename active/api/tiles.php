<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * Simple USGS XYZ tile proxy + disk cache
 * GET /2025_weather/active/api/tiles.php?style=topo&z=8&x=99&y=69[&ttl=2592000][&purge=1]
 *
 * Cache path: /2025_weather/js/data/tiles/{style}/{z}/{x}/{y}.{ext}
 * Default TTL: 30 days (set via ?ttl=SECONDS). Use &purge=1 to force re-fetch.
 */

$activeDir = dirname(__DIR__);
$siteRoot  = dirname($activeDir);

$logFile = $siteRoot . '/logs/tiles_debug.log';
function log_debug($msg) {
  global $logFile;
  $ts = date('Y-m-d H:i:s');
  @file_put_contents($logFile, "[$ts] $msg\n", FILE_APPEND);
}

function respond_error(int $code, string $msg): void {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode(['ok'=>false, 'error'=>$msg], JSON_PRETTY_PRINT);
  exit;
}

$styles = [
  'topo'    => 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
  'imagery' => 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
  'shaded'  => 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}',
];


$style = $_GET['style'] ?? 'topo';
if (!isset($styles[$style])) {
  log_debug("Invalid style: " . print_r($_GET, true));
  respond_error(400, 'Unknown style');
}

$z = isset($_GET['z']) ? (int)$_GET['z'] : null;
$x = isset($_GET['x']) ? (int)$_GET['x'] : null;
$y = isset($_GET['y']) ? (int)$_GET['y'] : null;
if ($z === null || $x === null || $y === null || $z < 0 || $z > 18 || $x < 0 || $y < 0) {
  log_debug("Invalid z/x/y: z=$z x=$x y=$y GET=" . print_r($_GET, true));
  respond_error(400, 'Invalid z/x/y');
}
$ttl   = isset($_GET['ttl']) ? max(0, (int)$_GET['ttl']) : 60*60*24*30;
$purge = isset($_GET['purge']);
log_debug("Request: style=$style z=$z x=$x y=$y ttl=$ttl purge=$purge");

$cacheDir  = $siteRoot . "/js/data/tiles/{$style}/{$z}/{$x}";
if (!is_dir($cacheDir)) {
  $mk = @mkdir($cacheDir, 0775, true);
  log_debug("mkdir $cacheDir: " . ($mk ? 'ok' : 'fail'));
}

$base = "{$cacheDir}/{$y}";
$knownExts = ['jpg','jpeg','png','webp'];
$cacheFile = null;
foreach ($knownExts as $ext) {
  $candidate = "{$base}.{$ext}";
  if (is_file($candidate)) {
    log_debug("Found cached tile: $candidate");
    $cacheFile = $candidate;
    break;
  }
}

$serve = function(string $path, int $ttl) {
  $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
  $ct = ($ext === 'png') ? 'image/png' : (($ext === 'webp') ? 'image/webp' : 'image/jpeg');
  header("Content-Type: {$ct}");
  header("Cache-Control: public, max-age={$ttl}");
  readfile($path);
  exit;
};

if ($cacheFile && !$purge && (time() - (int)@filemtime($cacheFile) < $ttl)) {
  log_debug("Serving fresh cached tile: $cacheFile");
  $serve($cacheFile, $ttl);
}

log_debug("Fetching from USGS: style=$style z=$z x=$x y=$y");
$url = str_replace(['{z}','{x}','{y}'], [$z, $x, $y], $styles[$style]);
$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT        => 20,
  CURLOPT_USERAGENT      => 'NCHurricane/TileProxy (+https://nchurricane.com)',
  CURLOPT_HTTPHEADER     => ['Accept: image/avif,image/webp,image/*;q=0.9'],
]);

$body = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$ct   = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
if ($body === false) log_debug("curl_exec error: " . curl_error($ch));
log_debug("USGS response: code=$code ct=$ct len=" . ($body !== false ? strlen($body) : 'false'));
curl_close($ch);

if ($body === false || $code !== 200 || !$ct) {
  log_debug("Upstream fetch failed: code=$code ct=$ct");
  if ($cacheFile && is_file($cacheFile)) {
    log_debug("Serving stale cache: $cacheFile");
    $serve($cacheFile, $ttl);
  }
  log_debug("Responding 502 Upstream tile fetch failed");
  respond_error(502, 'Upstream tile fetch failed');
}

$ext = 'jpg';
if (stripos($ct, 'png') !== false) $ext = 'png';
elseif (stripos($ct, 'webp') !== false) $ext = 'webp';
elseif (stripos($ct, 'jpeg') !== false) $ext = 'jpg';


$cacheFile = "{$base}.{$ext}";
$w = @file_put_contents($cacheFile, $body);
log_debug("Wrote tile: $cacheFile bytes=" . ($w === false ? 'fail' : $w));

$serve($cacheFile, $ttl);
