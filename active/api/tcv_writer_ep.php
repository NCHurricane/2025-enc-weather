#!/usr/bin/env php
<?php
declare(strict_types=1);
error_reporting(E_ALL);
require_once __DIR__ . '/pacific_writer_common.php';
require_once __DIR__ . '/tcv_product_state.php';

/**
 * NHC TCV Writer (Pacific)
 * Fixes:
 *  1) Correct MIATCVEP source URLs (no .YYYY; use FTP raw text or .shtml as fallback).
 *  2) Prevent unhandled exceptions from zone geometry fetches (cache_zone_geo wrapped).
 *  3) Keep --storm=ALL loop resilient (per-storm try/catch so one failure doesn't abort).
 *  4) Ensure HTTP headers are passed as a string for PHP 8.4 stream context.
 *
 * tcv_writer_cp.php defines Central Pacific settings and delegates to this
 * shared implementation. Central Pacific uses WFO Honolulu's local TCVHFO
 * product because CPHC national basin-number TCV products were discontinued.
 */


if (PHP_SAPI !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
}

$PACIFIC_BASIN = defined('NCH_PACIFIC_BASIN') ? strtoupper((string) NCH_PACIFIC_BASIN) : 'EP';
$PACIFIC_LABEL = defined('NCH_PACIFIC_LABEL') ? (string) NCH_PACIFIC_LABEL : 'Eastern Pacific';
$PACIFIC_REMOTE_STORMS_FIRST = defined('NCH_PACIFIC_REMOTE_STORMS_FIRST') && NCH_PACIFIC_REMOTE_STORMS_FIRST;
if (!in_array($PACIFIC_BASIN, ['EP', 'CP'], true)) {
    throw new RuntimeException('Unsupported Pacific basin: ' . $PACIFIC_BASIN);
}
$PACIFIC_LOG_SUFFIX = strtolower($PACIFIC_BASIN);

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
$CACHE_DIR = $ACTIVE . '/cache/zones';
@mkdir($ACTIVE, 0775, true);
@mkdir($CACHE_DIR, 0775, true);

function out(string $msg): void {
    global $PACIFIC_LOG_SUFFIX;
    $ROOT = realpath(dirname(__DIR__, 2));
    $logDir = $ROOT . '/active/logs';
    if (!is_dir($logDir)) {@mkdir($logDir, 0775, true);}
    $logFile = $logDir . '/tcv_writer_' . $PACIFIC_LOG_SUFFIX . '.log';
    $ts = date('Y-m-d H:i:s');
    @file_put_contents($logFile, "[$ts] $msg\n", FILE_APPEND);
}

$localStormsPath = $ACTIVE . '/cache/nhc_current_storms.json';
$remoteStormsUrl = 'https://www.nhc.noaa.gov/CurrentStorms.json';
$stormListCandidates = $PACIFIC_REMOTE_STORMS_FIRST
    ? [$remoteStormsUrl, $localStormsPath]
    : [$localStormsPath, $remoteStormsUrl];

$currentStormsPath = null;
$currentStormsJson = '';
foreach ($stormListCandidates as $p) {
    if (preg_match('#^https?://#i', $p)) {
        $candidateJson = pacific_writer_fetch_url($p, [
            'User-Agent: NCHurricane.com TCV fetcher',
            'Accept: application/json',
        ], 10) ?? '';
    } else {
        $candidateJson = is_readable($p) ? (file_get_contents($p) ?: '') : '';
    }
    $decodedCandidate = json_decode($candidateJson, true);
    $candidateData = is_array($decodedCandidate) ? pacific_writer_normalize_storms($decodedCandidate) : null;
    if ($candidateData !== null) {
        $currentStormsJson = $candidateJson;
        $currentStormsPath = $p;
        $stormsData = $candidateData;
        break;
    }
}
if ($currentStormsJson === '') {
    $msg = 'Missing or invalid storms list. Tried ' . implode(' | ', $stormListCandidates);
    if (PHP_SAPI === 'cli') { fwrite(STDERR, 'FATAL: ' . $msg . "\n"); } else { web_json(['error' => $msg], 500); }
    exit(1);
}
$stormsData = $stormsData ?? null;
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
    $normalized = preg_replace('/^--/', '', $p);
    if (stripos($normalized, 'storm=') === 0) {
        $stormArg = strtoupper(trim(substr($normalized, strlen('storm='))));
    } elseif (strcasecmp($normalized, 'storm=ALL') === 0) {
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
    for ($i = 0; $i < $tries; $i++) {
        $res = pacific_writer_fetch_url($url, ["User-Agent: $ua", 'Accept: */*'], $timeout);
        if ($res !== null && $res !== '') return $res;
        $last = error_get_last()['message'] ?? 'unknown';
        usleep(250_000);
    }
    throw new RuntimeException("Failed GET $url: $last");
}

function cache_zone_geo(string $zoneId): ?array {
    global $CACHE_DIR;
    return nch_cache_tcv_zone_feature(
        $zoneId,
        $CACHE_DIR,
        static fn(string $url): string => http_get($url, 2, 8)
    );
}

function write_storm_tcv(string $stormId, array $payload): void {
    global $ACTIVE;
    $stormPath = $ACTIVE . '/storms/' . $stormId;
    @mkdir($stormPath, 0775, true);
    $outFile = $stormPath . '/tcv.json';
    nch_atomic_write_json($outFile, $payload);
}

function tcv_product_candidates(): array {
    global $PACIFIC_BASIN;
    $candidates = [];
    if ($PACIFIC_BASIN === 'CP') {
        for ($version = 1; $version <= 10; $version++) {
            $candidates[] = 'https://forecast.weather.gov/product.php?site=HFO&issuedby=HFO&product=TCV'
                . '&format=TXT&version=' . $version . '&glossary=0';
        }
        return $candidates;
    }

    for ($n = 1; $n <= 5; $n++) {
        $candidates[] = sprintf('https://www.nhc.noaa.gov/ftp/pub/forecasts/public/MIATCVEP%d', $n);
    }
    for ($n = 1; $n <= 5; $n++) {
        $candidates[] = sprintf('https://www.nhc.noaa.gov/text/MIATCVEP%d.shtml', $n);
    }
    return $candidates;
}

function process_storm(string $stormId, array $stormsData, bool $force, bool $log): bool {
    global $PACIFIC_BASIN;
    vlog($log, "Processing TCV for $stormId...\n");

    $stormRec = null;
    foreach (($stormsData['data']['activeStorms'] ?? []) as $s) {
        if (strtoupper($s['id'] ?? '') === $stormId) { $stormRec = $s; break; }
    }
    if (!$stormRec) {
        vlog($log, "  WARN: Storm not in active list: $stormId\n");
        write_storm_tcv($stormId, nch_compose_tcv_payload(
            $stormId,
            'not-issued',
            'storm-not-active'
        ));
        vlog($log, "  SUCCESS: $stormId (empty)\n");
        return true;
    }

    $candidates = tcv_product_candidates();

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
        vlog($log, "  INFO: No current TCV issued for $stormId; writing explicit not-issued state.\n");
        write_storm_tcv($stormId, nch_compose_tcv_payload(
            $stormId,
            'not-issued',
            'no-matching-current-product'
        ));
        vlog($log, "  SUCCESS: $stormId (empty)\n");
        return true;
    }

    $parsed = nch_parse_tcv_text($chosenRaw);

    $currentAdvisory = (string) ($stormRec['publicAdvisory']['advNum'] ?? '');
    $classification = nch_classify_tcv($parsed, $currentAdvisory);
    if ($classification['state'] !== 'available') {
        $state = $classification['state'];
        $reason = $classification['reason'];
        vlog($log, "  INFO: TCV state for {$stormId} is {$state} ({$reason}); writing no active zones.\n");
        write_storm_tcv($stormId, nch_compose_tcv_payload(
            $stormId,
            $state,
            $reason,
            $chosen,
            $parsed,
            null,
            [
                'sourceAdvisory' => $classification['sourceAdvisory'],
                'sourceIssued' => $parsed['issued'],
            ]
        ));
        vlog($log, "  SUCCESS: $stormId (empty)\n");
        return true;
    }

    $zoneResolver = static function (string $zoneId, string $zoneType) use ($log): ?array {
        try {
            return cache_zone_geo($zoneId);
        } catch (Throwable $e) {
            vlog($log, "  WARN: zone cache failed for $zoneId: " . $e->getMessage() . "\n");
            return null;
        }
    };
    $payload = nch_compose_tcv_payload(
        $stormId,
        'available',
        null,
        $chosen,
        $parsed,
        $zoneResolver
    );
    write_storm_tcv($stormId, $payload);
    vlog($log, "  SUCCESS: $stormId\n");
    return true;
}

try {
    if ($stormArg === 'ALL') {
        $pacificStorms = [];
        foreach (($stormsData['data']['activeStorms'] ?? []) as $storm) {
            $sid = strtoupper(trim($storm['id'] ?? ''));
            if (preg_match('/^' . preg_quote($PACIFIC_BASIN, '/') . '\d{2}\d{4}$/', $sid)) { $pacificStorms[] = $sid; }
        }
        if (!$pacificStorms) { vlog($log, "INFO: No active {$PACIFIC_LABEL} storms found\n"); if (PHP_SAPI !== 'cli') web_json(['info'=>"No active {$PACIFIC_LABEL} storms found"]); exit(0); }

        vlog($log, "Executing TCV Writer ({$PACIFIC_BASIN})...\n");
        foreach ($pacificStorms as $sid) {
            try {
                $ok = process_storm($sid, $stormsData, $force, $log);
                if (!$ok) vlog($log, "  ERROR: processing failed for $sid\n");
            } catch (Throwable $e) {
                vlog($log, "  ERROR: unhandled for $sid: " . $e->getMessage() . "\n");
                write_storm_tcv($sid, nch_compose_tcv_payload(
                    $sid,
                    'unavailable',
                    'writer-error',
                    null,
                    null,
                    null,
                    ['error' => $e->getMessage()]
                ));
            }
        }
        if (PHP_SAPI !== 'cli') web_json(['ok'=>true,'processed'=>$pacificStorms]);
        exit(0);
    }

    if (!preg_match('/^' . preg_quote($PACIFIC_BASIN, '/') . '\d{2}\d{4}$/', $stormArg)) {
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
