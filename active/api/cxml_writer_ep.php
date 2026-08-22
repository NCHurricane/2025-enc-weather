#!/usr/bin/env php
<?php
declare(strict_types=1);
error_reporting(E_ALL);
require_once __DIR__ . '/pacific_writer_common.php';

/**
 * NHC CXML Writer, Pacific
 * Fetch NHC CXML for Pacific storms, convert to compact JSON, and write cache:
 *   ../storms/{basin}nnYYYY/storm.json
 *
 * Query:
 *   ?storm=EPnnYYYY  or ?storm=ALL
 *
 * cxml_writer_cp.php defines the Central Pacific basin settings and delegates
 * to this shared Pacific implementation.
 */

if (PHP_SAPI !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
}

$PACIFIC_BASIN = defined('NCH_PACIFIC_BASIN') ? strtoupper((string) NCH_PACIFIC_BASIN) : 'EP';
$PACIFIC_LABEL = defined('NCH_PACIFIC_LABEL') ? (string) NCH_PACIFIC_LABEL : 'Eastern Pacific';
$PACIFIC_REMOTE_STORMS_FIRST = defined('NCH_PACIFIC_REMOTE_STORMS_FIRST') && NCH_PACIFIC_REMOTE_STORMS_FIRST;
if (!in_array($PACIFIC_BASIN, ['EP', 'CP'], true)) {
    throw new RuntimeException('Unsupported Pacific basin: ' . $PACIFIC_BASIN);
}
$PACIFIC_LOG_SUFFIX = strtolower($PACIFIC_BASIN);

$USER_AGENT = "NCHurricane CXMLWriter{$PACIFIC_BASIN}/1.0 (admin@nchurricane.com)";

function out($s){
    global $PACIFIC_LOG_SUFFIX;
    $line = "[" . date('Y-m-d H:i:s') . "] $s";
    $logDir = __DIR__ . '/../../active/logs/';
    $logFile = $logDir . 'cxml_writer_' . $PACIFIC_LOG_SUFFIX . '.log';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    @file_put_contents($logFile, $line . "\n", FILE_APPEND | LOCK_EX);
    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, $line . "\n");
    }
}

function bail($msg, $code=1){ out("ERROR: $msg"); exit($code); }
function asText($x){ return trim((string)$x); }
function asNum($x){
  $s = trim((string)$x);
  if ($s === '' || !is_numeric($s)) return null;
  return 0 + $s;
}
function asRadius($x){
  $n = asNum($x);
  if ($n === null) return 0;
  if ($n < 0) return 0;
  return (int) round($n);
}

$stormParam = strtoupper(trim($_GET['storm'] ?? ''));
if (!$stormParam && PHP_SAPI === 'cli') {
  foreach ($argv as $arg) {
    if (strpos($arg, '--storm=') === 0) { 
      $stormParam = strtoupper(substr($arg, 8)); 
      break; 
    }
    if ($arg === '--all') {
      $stormParam = 'ALL';
      break;
    }
  }
}

if ($stormParam === '') bail("missing --storm={$PACIFIC_BASIN}nnYYYY or --all");

$cacheRoot = realpath(__DIR__ . '/..');
if ($cacheRoot === false) $cacheRoot = __DIR__ . '/..';
$stormsRoot = $cacheRoot . '/storms';

function expand_short_id(string $id, string $stormsRoot): string {
  global $PACIFIC_BASIN;
  if (!preg_match('/^[A-Z]{2}\d{2}$/', $id)) return $id;
  $arr = loadPacificCurrentStormsCxml();
  foreach (($arr['data']['activeStorms'] ?? []) as $s) {
    $sid = strtoupper((string)($s['id'] ?? ''));
    if ($sid && strpos($sid, $PACIFIC_BASIN) === 0 && substr($sid,2,2) === substr($id,2,2)) {
      return $sid;
    }
  }
  return $id;
}

function loadPacificCurrentStormsCxml(): array {
  global $PACIFIC_REMOTE_STORMS_FIRST;
  $local = dirname(__DIR__) . '/cache/nhc_current_storms.json';
  $remote = 'https://www.nhc.noaa.gov/CurrentStorms.json';
  $sources = $PACIFIC_REMOTE_STORMS_FIRST ? [$remote, $local] : [$local, $remote];
  foreach ($sources as $source) {
    $raw = preg_match('#^https?://#i', $source)
      ? pacific_writer_fetch_url($source, [
          'User-Agent: NCHurricane Pacific CXML writer/1.0',
          'Accept: application/json',
        ], 10)
      : @file_get_contents($source);
    if ($raw === false || trim($raw) === '') continue;
    $decoded = json_decode($raw, true);
    $arr = is_array($decoded) ? pacific_writer_normalize_storms($decoded) : null;
    if ($arr !== null) {
      return $arr;
    }
  }
  throw new RuntimeException('Unable to load a valid current-storms source.');
}

$stormId = expand_short_id($stormParam, $stormsRoot);

if ($stormParam === 'ALL') {
    out("Entering ALL mode - calling processAllPacificStormsCXML()");
    processAllPacificStormsCXML($stormsRoot);
    exit;
}

if (!preg_match('/^' . preg_quote($PACIFIC_BASIN, '/') . '\d{2}\d{4}$/', $stormId)) {
    bail("invalid storm id; expected {$PACIFIC_BASIN}nnYYYY");
}

try {
    processSingleStormCXML($stormId, $stormsRoot);
} catch (Exception $e) {
    bail($e->getMessage());
}

function processAllPacificStormsCXML(string $stormsRoot): void {
    global $PACIFIC_BASIN, $PACIFIC_LABEL;
    try {
        $stormsData = loadPacificCurrentStormsCxml();
    } catch (Throwable $e) {
        out("ERROR: " . $e->getMessage());
        exit(1);
    }
    $pacificStorms = [];
    foreach ($stormsData['data']['activeStorms'] as $storm) {
        $stormId = strtoupper(trim($storm['id'] ?? ''));
        if (preg_match('/^' . preg_quote($PACIFIC_BASIN, '/') . '\d{2}\d{4}$/', $stormId)) {
            $pacificStorms[] = $stormId;
        }
    }
    if (empty($pacificStorms)) {
        out("INFO: No active {$PACIFIC_LABEL} storms found");
        exit(0);
    }
    $successCount = 0;
    foreach ($pacificStorms as $stormId) {
        out("Processing {$stormId}...");
        try {
            processSingleStormCXML($stormId, $stormsRoot);
            $successCount++;
            out("  SUCCESS: {$stormId}");
        } catch (Exception $e) {
            out("  ERROR: {$stormId} - " . $e->getMessage());
        }
    }
    out("Completed: {$successCount}/" . count($pacificStorms) . " storms processed successfully");
}

function processSingleStormCXML(string $stormId, string $stormsRoot): void {
    global $USER_AGENT;    
    $shortId = strtolower(substr($stormId, 0, 2) . substr($stormId, 2, 2));

    $srcUrl = "https://ftp.nhc.noaa.gov/atcf/cxml/" . strtolower($stormId) . "_cxml.xml";
    out("Fetch: $srcUrl");

    $ch = curl_init($srcUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            "User-Agent: $USER_AGENT",
            "Accept: application/xml, text/xml;q=0.9,*/*;q=0.8"
        ],
    ]);
    $xmlRaw = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    
    if (!$xmlRaw || $http !== 200) {
    $ftpUrl = "ftp://ftp.nhc.noaa.gov/atcf/cxml/" . strtolower($stormId) . "_cxml.xml";
    out("Primary failed, trying FTP: $ftpUrl");

        $ftpCtx = stream_context_create(['ftp' => ['timeout' => 10]]);
        $xmlRaw = @file_get_contents($ftpUrl, false, $ftpCtx);

        if (!$xmlRaw) {
            throw new Exception("fetch failed from both HTTPS ($http $err) and FTP sources");
        }

        out("FTP fallback successful for $stormId");
    }

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlRaw);
    if (!$xml) throw new Exception('XML parse failed');

    $hdr  = $xml->header ?? null;
    $data = $xml->data->disturbance ?? null;

    $meta = [
        'id'       => asText($data->localID ?? ''),
        'name'     => asText($data->cycloneName ?? ''),
        'advisory' => preg_replace('/^\D+/', '', asText($hdr->generatingApplication->applicationType ?? '')),
        'created'  => asText($hdr->creationTime ?? ''),
    ];

    $currentFix = null;
    $fixes = [];
    $radii = [ 'r34' => null, 'r50' => null, 'r64' => null, 'seas12' => null ];

    foreach ($data->fix as $fix) {
        $h   = (string)$fix['hour'];
        $vt  = asText($fix->validTime ?? '');
        $lat = asNum($fix->latitude ?? null);
        $lon = asNum($fix->longitude ?? null);
        $cd  = $fix->cycloneData ?? null;

        $one = [
            'hour' => $h,
            'validTime' => $vt,
            'lat' => $lat,
            'lon' => $lon,
            'motion' => [
                'dir' => asNum($cd->stormMotion->directionToward ?? null),
                'speedKt' => asNum($cd->stormMotion->speed ?? null),
            ],
            'wind' => [
                'maxKt' => asNum($cd->maximumWind->speed ?? null),
                'gustKt'=> asNum($cd->maximumWind->gusts ?? null),
            ],
            'type' => asText($cd->development ?? ''),
        ];

        $wc = $cd->windContours->windSpeed ?? [];
        foreach ($wc as $ws) {
            $sp = trim((string)$ws);
            $key = $sp === '34' ? 'r34' : ($sp === '50' ? 'r50' : ($sp === '64' ? 'r64' : null));
            if ($key) {
                $r = [
                    'NE' => asRadius($ws->radius[0] ?? null),
                    'SE' => asRadius($ws->radius[1] ?? null),
                    'SW' => asRadius($ws->radius[2] ?? null),
                    'NW' => asRadius($ws->radius[3] ?? null),
                    'validTime' => $vt,
                    'hour' => $h,
                ];
                $one[$key] = $r;
                if ($h === '000') $radii[$key] = $r;
            }
        }

        $sc = $cd->seaContours->waveHeight ?? null;
        if ($sc && trim((string)$sc) === '12') {
            $r = [
                'NE' => asRadius($sc->radius[0] ?? null),
                'SE' => asRadius($sc->radius[1] ?? null),
                'SW' => asRadius($sc->radius[2] ?? null),
                'NW' => asRadius($sc->radius[3] ?? null),
                'validTime' => $vt,
                'hour' => $h,
            ];
            $one['seas12'] = $r;
            if ($h === '000') $radii['seas12'] = $r;
        }

        if ($h === '000' && !$currentFix) $currentFix = $one;
        $fixes[] = $one;
    }

    $stormDir = $stormsRoot . '/' . strtoupper($stormId);
    if (!is_dir($stormDir)) {
        @mkdir($stormDir, 0775, true);
    }
    $cacheFile = $stormDir . '/storm.json';

    $out = [
        'metadata' => $meta,
        'current'  => $currentFix,
        'radii'    => $radii,
        'fixes'    => $fixes,
    ];

    $tmp = $cacheFile . '.tmp';
    if (@file_put_contents($tmp, json_encode($out, JSON_UNESCAPED_SLASHES)) === false) {
        throw new Exception("write tmp failed: $tmp");
    }
    if (!@rename($tmp, $cacheFile)) {
        throw new Exception("rename failed: $cacheFile");
    }

    @chmod($cacheFile, 0644);
    out("Wrote $cacheFile");
}
?>
