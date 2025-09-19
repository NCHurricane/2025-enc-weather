<?php
/**
 * NHC CXML Writer, Atlantic - cxml_writer.php
 * Fetch NHC CXML for Atlantic storms, convert to compact JSON, and write cache:
 *   ../storms/{ALnnYYYY}/storm.json
 *
 * Query:
 *   ?storm=ALnnYYYY  or ?storm=ALL
 */

declare(strict_types=1);
error_reporting(E_ALL);

// Add headers for web requests
if (PHP_SAPI !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
}

$USER_AGENT = "NCHurricane CXMLWriter/1.0 (admin@nchurricane.com)";

function out($s){
  $line = "[" . date('Y-m-d H:i:s') . "] $s";
  if (PHP_SAPI === 'cli') {
    fwrite(STDERR, $line . "\n");
  } else {
    error_log("[cxml_writer] " . $line);
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

if ($stormParam === '') bail('missing --storm=ALnnYYYY or --all');

$cacheRoot = realpath(__DIR__ . '/..');
if ($cacheRoot === false) $cacheRoot = __DIR__ . '/..';
$stormsRoot = $cacheRoot . '/storms';

function expand_short_id(string $id, string $stormsRoot): string {
  if (!preg_match('/^[A-Z]{2}\d{2}$/', $id)) return $id;
  $list = realpath(__DIR__ . '/../../js/modules/cache/nhc_current_storms.json');
  if ($list && ($raw = @file_get_contents($list))) {
    $arr = json_decode($raw, true);
    if (is_array($arr)) {
      foreach ($arr['data']['activeStorms'] as $s) {
        $sid = strtoupper((string)($s['id'] ?? ''));
        if ($sid && strpos($sid, substr($id,0,2)) === 0 && substr($sid,2,2) === substr($id,2,2)) {
          return $sid;
        }
      }
    }
  }
  return $id;
}

$stormId = expand_short_id($stormParam, $stormsRoot);
$shortId = strtolower(substr($stormId, 0, 2) . substr($stormId, 2, 2));

if ($stormParam === 'ALL') {
    out("Entering ALL mode - calling processAllALStormsCXML()");
    processAllALStormsCXML($stormsRoot);
    exit;
}



try {
    processSingleStormCXML($stormId, $stormsRoot);
} catch (Exception $e) {
    bail($e->getMessage());
}

function processAllALStormsCXML(string $stormsRoot): void {
    $currentStormsPath = __DIR__ . '/../../js/modules/cache/nhc_current_storms.json';
    
    if (!file_exists($currentStormsPath)) {
        out("ERROR: Current storms cache not found at {$currentStormsPath}");
        exit(1);
    }
    
    $rawStorms = file_get_contents($currentStormsPath);
    $stormsData = json_decode($rawStorms, true);
    
    if (!$stormsData || !isset($stormsData['data']['activeStorms'])) {
        out("ERROR: Invalid storms data format");
        exit(1);
    }
    
    $alStorms = [];
    foreach ($stormsData['data']['activeStorms'] as $storm) {
        $stormId = strtoupper(trim($storm['id'] ?? ''));
        if (preg_match('/^AL\d{2}\d{4}$/', $stormId)) {
            $alStorms[] = $stormId;
        }
    }
    
    if (empty($alStorms)) {
        out("INFO: No active AT storms found");
        exit(0);
    }
    
    $successCount = 0;
    foreach ($alStorms as $stormId) {
        out("Processing {$stormId}...");
        
        try {
            processSingleStormCXML($stormId, $stormsRoot);
            $successCount++;
            out("  SUCCESS: {$stormId}");
        } catch (Exception $e) {
            out("  ERROR: {$stormId} - " . $e->getMessage());
        }
    }
    
    out("Completed: {$successCount}/" . count($alStorms) . " storms processed successfully");
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