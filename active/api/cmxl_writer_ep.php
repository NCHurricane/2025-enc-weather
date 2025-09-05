<?php
// /active/api/cxml_writer_ep.php
// Fetch NHC CXML for Eastern Pacific storms, convert to compact JSON, and write cache:
//   ../storms/{EPnnYYYY}/storm.json
echo "Script started\n";
echo "PHP SAPI: " . PHP_SAPI . "\n";
echo "Storm param: '" . ($_GET['storm'] ?? 'NOT SET') . "'\n";
flush();

declare(strict_types=1);
error_reporting(E_ALL);

// ---------- config ----------
$USER_AGENT = "NCHurricane CXMLWriter/1.0 (admin@nchurricane.com)";

// ---------- helpers ----------
function out($s){ fwrite(STDERR, "[".date('Y-m-d H:i:s')."] $s\n"); }
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
  if ($n < 0) return 0;       // clamp sentinels like -999 to 0
  return (int) round($n);
}

// ---------- args: --storm=EPnnYYYY or ?storm=EPnnYYYY ----------
$stormParam = strtoupper(trim($_GET['storm'] ?? ''));
if (!$stormParam && PHP_SAPI === 'cli') {
  foreach ($argv as $arg) {
    if (strpos($arg, '--storm=') === 0) { $stormParam = strtoupper(substr($arg, 8)); break; }
  }
}
if ($stormParam === '') bail('missing --storm=EPnnYYYY');

// ---------- resolve cache root ----------
$cacheRoot = realpath(__DIR__ . '/..');
if ($cacheRoot === false) $cacheRoot = __DIR__ . '/..';
$stormsRoot = $cacheRoot . '/storms';

// ---------- expand short id function ----------
function expand_short_id(string $id, string $stormsRoot): string {
  if (!preg_match('/^[A-Z]{2}\d{2}$/', $id)) return $id;
  $list = realpath(__DIR__ . '/../../js/modules/cache/nhc_current_storms.json');
  if ($list && ($raw = @file_get_contents($list))) {
    $arr = json_decode($raw, true);
    if (is_array($arr)) {
      foreach ($arr['data']['activeStorms'] as $s) {
        $sid = strtoupper((string)($s['id'] ?? ''));
        if ($sid && str_starts_with($sid, substr($id,0,2)) && substr($sid,2,2) === substr($id,2,2)) {
          return $sid;
        }
      }
    }
  }
  return $id;
}

// ---------- batch processing for all EP storms ----------
if ($stormParam === 'ALL') {
    processAllEPStormsCXML();
    exit;
}

// ---------- single storm processing ----------
$stormId = expand_short_id($stormParam, $stormsRoot);
$shortId = strtolower(substr($stormId, 0, 2) . substr($stormId, 2, 2));

try {
    processSingleStormCXML($stormId);
} catch (Exception $e) {
    bail($e->getMessage());
}

// ---------- batch processing function ----------
function processAllEPStormsCXML(): void {
    global $stormsRoot;
    
    // Path to current storms cache
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
    
    $epStorms = [];
    foreach ($stormsData['data']['activeStorms'] as $storm) {
        $stormId = strtoupper(trim($storm['id'] ?? ''));
        if (preg_match('/^EP\d{2}\d{4}$/', $stormId)) {
            $epStorms[] = $stormId;
        }
    }
    
    if (empty($epStorms)) {
        out("INFO: No active EP storms found");
        exit(0);
    }
    
    $successCount = 0;
    foreach ($epStorms as $stormId) {
        out("Processing {$stormId}...");
        
        try {
            processSingleStormCXML($stormId);
            $successCount++;
            out("  SUCCESS: {$stormId}");
        } catch (Exception $e) {
            out("  ERROR: {$stormId} - " . $e->getMessage());
        }
    }
    
    out("Completed: {$successCount}/" . count($epStorms) . " storms processed successfully");
}

// ---------- single storm processing function ----------
function processSingleStormCXML(string $stormId): void {
    global $stormsRoot, $USER_AGENT;
    
    $shortId = strtolower(substr($stormId, 0, 2) . substr($stormId, 2, 2));
    
    // ---------- source URL ----------
    $srcUrl = "https://ftp.nhc.noaa.gov/atcf/cxml/" . strtolower($stormId) . "_cxml.xml";
    out("Fetch: $srcUrl");

    // ---------- fetch ----------
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
    if (!$xmlRaw || $http !== 200) throw new Exception("fetch failed ($http) $err");

    // ---------- parse ----------
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlRaw);
    if (!$xml) throw new Exception('XML parse failed');

    $hdr  = $xml->header ?? null;
    $data = $xml->data->disturbance ?? null;

    $meta = [
        'id'       => asText($data->localID ?? ''),
        'name'     => asText($data->cycloneName ?? ''),
        'advisory' => preg_replace('/^\D+/', '', asText($hdr->generatingApplication->applicationType ?? '')),
        'created'  => asText($hdr->creationTime ?? ''), // ISO Z
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

        // wind radii (34/50/64 kt)
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

        // 12 ft seas (optional)
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

    // ---------- write cache ----------
    $stormDir = $stormsRoot . '/' . $shortId;
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