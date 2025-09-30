#!/usr/bin/env php
<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * NHC TCV Writer (Atlantic)
 * Fixes:
 *  1) Correct MIATCVAT source URLs (no .YYYY; use FTP raw text or .shtml as fallback).
 *  2) Prevent unhandled exceptions from zone geometry fetches (cache_zone_geo wrapped).
 *  3) Keep --storm=ALL loop resilient (per-storm try/catch so one failure doesn't abort).
 *  4) Ensure HTTP headers are passed as a string for PHP 8.4 stream context.
 */


if (PHP_SAPI !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
}

function web_json($data, int $status = 200): void {
    if (PHP_SAPI === 'cli') return;
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

$ROOT = realpath(dirname(__DIR__, 2));
if ($ROOT === false) {
    if (PHP_SAPI === 'cli') { fwrite(STDERR, 'FATAL: Unable to resolve project ROOT from ' . __DIR__ . "
"); }
    else { web_json(['error' => 'Unable to resolve project ROOT'], 500); }
    exit(1);
}
$PUBLIC    = $ROOT;
$ACTIVE    = $ROOT . '/active';
$CACHE_DIR = $ROOT . '/js/data/zones/cache';
@mkdir($ACTIVE, 0775, true);
@mkdir($CACHE_DIR, 0775, true);

function out(string $msg): void {
    $ROOT = realpath(dirname(__DIR__, 2));
    $logDir = $ROOT . '/active/logs';
    if (!is_dir($logDir)) {@mkdir($logDir, 0775, true);}
    $logFile = $logDir . '/tcv_writer.log';
    $ts = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$ts] $msg\n", FILE_APPEND);
}

$stormListCandidates = [
    $ACTIVE . '/cache/nhc_current_storms.json',
];

$currentStormsPath = null;
foreach ($stormListCandidates as $p) {
    if (is_readable($p)) { $currentStormsPath = $p; break; }
}
$currentStormsJson = '';
if ($currentStormsPath !== null) {
    $currentStormsJson = file_get_contents($currentStormsPath);
} else {
    $remote = 'https://www.nhc.noaa.gov/CurrentStorms.json';
    $ctx = stream_context_create([
        'http' => [
            'method'  => 'GET',
            'timeout' => 10,
            'header'  => "User-Agent: NCHurricane.com TCV fetcher
Accept: application/json
",
        ],
        'ssl' => [ 'verify_peer' => true, 'verify_peer_name' => true ],
    ]);
    $currentStormsJson = @file_get_contents($remote, false, $ctx) ?: '';
    if ($currentStormsJson !== '') { $currentStormsPath = 'REMOTE:' . $remote; }
}
if ($currentStormsJson === '') {
    $msg = 'Missing storms list. Tried local ' . implode(' | ', $stormListCandidates) . ' and remote https://www.nhc.noaa.gov/CurrentStorms.json';
    if (PHP_SAPI === 'cli') { fwrite(STDERR, 'FATAL: ' . $msg . "\n"); } else { web_json(['error' => $msg], 500); }
    exit(1);
}
$stormsData = json_decode($currentStormsJson, true);
if (!is_array($stormsData)) {
    $msg = 'Invalid JSON from ' . $currentStormsPath;
    if (PHP_SAPI === 'cli') { fwrite(STDERR, 'FATAL: ' . $msg . "\n"); } else { web_json(['error' => $msg], 500); }
    exit(1);
}

vlog($log ?? false, "Using storms list: $currentStormsPath\n");

$argvStr = PHP_SAPI === 'cli' ? implode(' ', array_slice($argv, 1)) : '';
$qs      = $_SERVER['QUERY_STRING'] ?? '';
$stormArg = null; $force = false; $log = false;
$input = trim($argvStr . ' ' . $qs);
$parts = preg_split('/[&\s]+/', $input, -1, PREG_SPLIT_NO_EMPTY);
foreach ($parts as $p) {
    if (stripos($p, 'storm=') === 0) {
        $stormArg = strtoupper(trim(substr($p, strlen('storm='))));
    } elseif (strcasecmp($p, '--storm=ALL') === 0 || strcasecmp($p, 'storm=ALL') === 0) {
        $stormArg = 'ALL';
    } elseif (strcasecmp($p, '--force') === 0) {
        $force = true;
    } elseif (strcasecmp($p, '--log') === 0 || strcasecmp($p, 'log=1') === 0) {
        $log = true;
    }
}
if (!$stormArg) { $stormArg = 'ALL'; }
function vlog(bool $on, string $msg): void {
    if ($on) echo $msg;
    out($msg);
}


function http_get(string $url, int $tries = 3, int $timeout = 12): string {
    $last = '';
    $ua = "NCHurricane.com TCV fetcher";
    $hdr = "User-Agent: $ua\r\nAccept: */*\r\n";
    for ($i = 0; $i < $tries; $i++) {
        $ctx = stream_context_create([
            'http' => [
                'method'        => 'GET',
                'timeout'       => $timeout,
                'header'        => $hdr,
                'ignore_errors' => true,
            ],
            'ssl' => [
                'verify_peer'      => true,
                'verify_peer_name' => true,
            ],
        ]);
        $res = @file_get_contents($url, false, $ctx);
        if ($res !== false && $res !== '') return $res;
        $last = error_get_last()['message'] ?? 'unknown';
        usleep(250_000);
    }
    throw new RuntimeException("Failed GET $url: $last");
}

function parse_tcv_text(string $txt): array {
    $lines = preg_split("/\r?\n/", $txt);
    $adv = null; $issued = null; $zones = [];
    foreach ($lines as $ln) {
        if ($adv === null && preg_match('/Advisory\s+(Number\s+)?(\d+)/i', $ln, $m)) { $adv = (int)$m[2]; }
        if ($issued === null && preg_match('/\b(\d{1,2}:\d{2}\s*[AP]M\s*(?:EDT|EST|CDT|CST|UTC))\b/i', $ln, $m)) { $issued = trim($m[1]); }
        if (preg_match_all('/\b([A-Z]{3}\d{3})\b/', $ln, $mm)) {
            foreach ($mm[1] as $z) { $zones[] = strtoupper($z); }
        }
    }
    $zones = array_values(array_unique($zones));
    return ['advisory'=>$adv, 'issued'=>$issued, 'zones'=>$zones, 'raw'=>$txt];
}

function cache_zone_geo(string $zoneId) {
    global $CACHE_DIR;
    $zoneId = strtoupper(trim($zoneId));
    if (!preg_match('/^[A-Z]{3}\d{3}$/', $zoneId)) return;
    $out = $CACHE_DIR . '/' . $zoneId . '.json';
    if (is_file($out)) return;
    $json = http_get("https://api.weather.gov/zones/forecast/$zoneId", 2, 8);
    $data = json_decode($json, true);
    if (!is_array($data) || empty($data['geometry'])) return;
    @file_put_contents($out, json_encode($data['geometry'], JSON_UNESCAPED_SLASHES));
}

function write_storm_tcv(string $stormId, array $payload): void {
    global $ACTIVE;
    $stormPath = $ACTIVE . '/storms/' . $stormId;
    @mkdir($stormPath, 0775, true);
    $outFile = $stormPath . '/tcv.json';
    @file_put_contents($outFile, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
}

function process_storm(string $stormId, array $stormsData, bool $force, bool $log): bool {
    vlog($log, "Processing TCV for $stormId...\n");

    $stormRec = null;
    foreach (($stormsData['data']['activeStorms'] ?? []) as $s) {
        if (strtoupper($s['id'] ?? '') === $stormId) { $stormRec = $s; break; }
    }
    if (!$stormRec) {
        vlog($log, "  WARN: Storm not in active list: $stormId\n");
        write_storm_tcv($stormId, ['stormId'=>$stormId,'tcv'=>null,'zones'=>[],'note'=>'not active']);
        vlog($log, "  SUCCESS: $stormId (empty)\n");
        return true;
    }

    $candidates = [];
    for ($n = 1; $n <= 5; $n++) {
        $candidates[] = sprintf('https://www.nhc.noaa.gov/ftp/pub/forecasts/public/MIATCVAT%d', $n);
    }
    for ($n = 1; $n <= 5; $n++) {
        $candidates[] = sprintf('https://www.nhc.noaa.gov/text/MIATCVAT%d.shtml', $n);
    }

    $chosen = null; $chosenRaw = null;
    foreach ($candidates as $url) {
        try {
            $txt = http_get($url, 2, 10);
        } catch (Throwable $e) {
            continue;
        }
        if (!is_string($txt) || trim($txt) === '') continue;

        $ok = (stripos($txt, $stormId) !== false);
        if (!$ok) {
            $name = strtoupper(trim($stormRec['name'] ?? ''));
            $yr   = substr($stormId, 4, 4);
            $ok = $name && stripos(strtoupper($txt), $name) !== false && stripos($txt, $yr) !== false;
        }
        if (!$ok) continue;

        $chosen = $url; $chosenRaw = $txt; break;
    }

    if ($chosenRaw === null) {
        vlog($log, "  INFO: No TCV text matched for $stormId; writing empty file.\n");
        write_storm_tcv($stormId, ['stormId'=>$stormId,'tcv'=>null,'zones'=>[]]);
        vlog($log, "  SUCCESS: $stormId (empty)\n");
        return true;
    }

    $parsed = parse_tcv_text($chosenRaw);

    foreach ($parsed['zones'] as $z) {
        try { cache_zone_geo($z); }
        catch (Throwable $e) { vlog($log, "  WARN: zone cache failed for $z: " . $e->getMessage() . "\n"); }
    }

    $payload = [
        'stormId' => $stormId,
        'source'  => $chosen,
        'tcv'     => [ 'advisory'=>$parsed['advisory'], 'issued'=>$parsed['issued'], 'zones'=>$parsed['zones'] ],
    ];
    write_storm_tcv($stormId, $payload);
    vlog($log, "  SUCCESS: $stormId\n");
    return true;
}

try {
    if ($stormArg === 'ALL') {
        $alStorms = [];
        foreach (($stormsData['data']['activeStorms'] ?? []) as $storm) {
            $sid = strtoupper(trim($storm['id'] ?? ''));
            if (preg_match('/^AL\d{2}\d{4}$/', $sid)) { $alStorms[] = $sid; }
        }
        if (!$alStorms) { vlog($log, "INFO: No active AL storms found\n"); if (PHP_SAPI !== 'cli') web_json(['info'=>'No active AL storms found']); exit(0); }

        vlog($log, "Executing TCV Writer (AT)...\n");
        foreach ($alStorms as $sid) {
            try {
                $ok = process_storm($sid, $stormsData, $force, $log);
                if (!$ok) vlog($log, "  ERROR: processing failed for $sid\n");
            } catch (Throwable $e) {
                vlog($log, "  ERROR: unhandled for $sid: " . $e->getMessage() . "\n");
                write_storm_tcv($sid, ['stormId'=>$sid,'tcv'=>null,'zones'=>[],'error'=>$e->getMessage()]);
            }
        }
        if (PHP_SAPI !== 'cli') web_json(['ok'=>true,'processed'=>$alStorms]);
        exit(0);
    }

    if (!preg_match('/^AL\d{2}\d{4}$/', $stormArg)) {
        $msg = "ERROR: Invalid storm id: $stormArg\n"; vlog($log, $msg); if (PHP_SAPI !== 'cli') web_json(['error'=>$msg], 400); exit(1);
    }
    $ok = process_storm($stormArg, $stormsData, $force, $log);
    if (!$ok) { $msg = "ERROR: processing failed for $stormArg\n"; vlog($log, $msg); if (PHP_SAPI !== 'cli') web_json(['error'=>$msg], 500); exit(1); }
    if (PHP_SAPI !== 'cli') web_json(['ok'=>true,'processed'=>[$stormArg]]);
    exit(0);
} catch (Throwable $e) {
    $msg = 'FATAL: ' . $e->getMessage();
    if (PHP_SAPI === 'cli') { fwrite(STDERR, $msg . "\n"); } else { web_json(['error'=>$msg], 500); }
    exit(1);
}
