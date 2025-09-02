<?php
declare(strict_types=1);

/**
 * Simple USGS XYZ tile proxy + disk cache
 * GET /2025_weather/active/api/tiles.php?style=topo&z=8&x=99&y=69[&ttl=2592000][&purge=1]
 *
 * Cache path: /2025_weather/js/data/tiles/{style}/{z}/{x}/{y}.{ext}
 * Default TTL: 30 days (set via ?ttl=SECONDS). Use &purge=1 to force re-fetch.
 */

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
if (!isset($styles[$style])) respond_error(400, 'Unknown style');

$z = isset($_GET['z']) ? (int)$_GET['z'] : null;
$x = isset($_GET['x']) ? (int)$_GET['x'] : null;
$y = isset($_GET['y']) ? (int)$_GET['y'] : null;
if ($z === null || $x === null || $y === null || $z < 0 || $z > 18 || $x < 0 || $y < 0) {
  respond_error(400, 'Invalid z/x/y');
}
$ttl   = isset($_GET['ttl']) ? max(0, (int)$_GET['ttl']) : 60*60*24*30; // default 30d
$purge = isset($_GET['purge']); // any truthy value forces re-fetch

// Resolve site root: .../2025_weather
$activeDir = dirname(__DIR__);           // /active
$siteRoot  = dirname($activeDir);        // /2025_weather
$cacheDir  = $siteRoot . "/js/data/tiles/{$style}/{$z}/{$x}";
@mkdir($cacheDir, 0775, true);

$base = "{$cacheDir}/{$y}";
$knownExts = ['jpg','jpeg','png','webp'];
$cacheFile = null;
foreach ($knownExts as $ext) {
  $candidate = "{$base}.{$ext}";
  if (is_file($candidate)) { $cacheFile = $candidate; break; }
}

$serve = function(string $path, int $ttl) {
  $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
  $ct = ($ext === 'png') ? 'image/png' : (($ext === 'webp') ? 'image/webp' : 'image/jpeg');
  header("Content-Type: {$ct}");
  header("Cache-Control: public, max-age={$ttl}");
  readfile($path);
  exit;
};

// Serve cached if fresh and not purging
if ($cacheFile && !$purge && (time() - (int)@filemtime($cacheFile) < $ttl)) {
  $serve($cacheFile, $ttl);
}

// Fetch from USGS
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
curl_close($ch);

if ($body === false || $code !== 200 || !$ct) {
  // Fallback to stale cache if we have it
  if ($cacheFile && is_file($cacheFile)) $serve($cacheFile, $ttl);
  respond_error(502, 'Upstream tile fetch failed');
}

// Decide extension from content type
$ext = 'jpg';
if (stripos($ct, 'png') !== false) $ext = 'png';
elseif (stripos($ct, 'webp') !== false) $ext = 'webp';
elseif (stripos($ct, 'jpeg') !== false) $ext = 'jpg';

$cacheFile = "{$base}.{$ext}";
@file_put_contents($cacheFile, $body);

$serve($cacheFile, $ttl);
