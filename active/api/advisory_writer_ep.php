<?php
/**
 * NHC Advisory Writer, Eastern Pacific - advisory_writer.php
 * Fetches NHC advisory XML (Pacific only) and caches a compact advisory.json under:
 *   /active/storms/EPnnYYYY/advisory.json
 *
 * Query:
 *   ?storm=EPnnYYYY  or ?storm=ALL
 *
 * Notes:
 * - Atomic write (tmp -> rename)
 * - UTC timestamps in ISO-8601 for `generated` and `messageTimeUTC`
 * - `messageTimeLocal` is passed through verbatim (no conversions)
 */
// File-based logging setup (must be defined before any usage)
$ADV_LOG_DIR = __DIR__ . '/../../js/modules/logs/';
$ADV_LOG_FILE = $ADV_LOG_DIR . 'advisory_writer_ep.log';

function adv_log($msg, $level = 'INFO') {
    global $ADV_LOG_DIR, $ADV_LOG_FILE;
    if (!is_dir($ADV_LOG_DIR)) {
        @mkdir($ADV_LOG_DIR, 0775, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    $entry = "[$timestamp] [$level] $msg\n";
    @file_put_contents($ADV_LOG_FILE, $entry, FILE_APPEND | LOCK_EX);
}

function adv_out($msg, $level = 'INFO') {
    adv_log($msg, $level);
    if (PHP_SAPI === 'cli' && defined('STDERR')) {
        fwrite(STDERR, "[" . date('Y-m-d H:i:s') . "] $msg\n");
    }
}

declare(strict_types=1);

// Only output headers if not CLI
if (PHP_SAPI !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
}

$LOWERCASE_ALL = false;

function bail(int $code, string $msg): void {
  if (PHP_SAPI !== 'cli') {
    http_response_code($code);
  }
  echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_SLASHES);
  exit;
}

function formatToShortDateTime($dateTimeStr, string $monthStyle = 'short'): string {
  $s = trim((string)$dateTimeStr);
  if ($s === '') return '';

  if (preg_match('/^(\d{4})(\d{2})(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+([AP]M)\s+([A-Z]{3,4})$/i', $s, $m)) {
    $month  = (int)$m[2];
    $day    = (int)$m[3];
    $hour   = (int)$m[4];
    $minute = (int)$m[5];
    $ampm   = strtoupper($m[7]);
    $tz     = strtoupper($m[8]);

    if ($ampm === 'PM' && $hour !== 12) $hour += 12;
    if ($ampm === 'AM' && $hour === 12) $hour  = 0;

    $displayHour = $hour === 0 ? 12 : ($hour > 12 ? $hour - 12 : $hour);
    $displayAmPm = ($hour >= 12 ? 'PM' : 'AM');

    static $MONTHS_SHORT = ['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    $monthName = ($monthStyle === 'long' ? $MONTHS_SHORT[$month] : $MONTHS_SHORT[$month]);

    return sprintf('%s %d %d:%02d %s %s',
      $monthName, $day, $displayHour, $minute, $displayAmPm, $tz
    );
  }

  return $s;
}

function strval_safe($x): string { return trim((string)$x); }
function intval_safe($x): ?int {
  $s = trim((string)$x);
  if ($s === '' || strtoupper($s) === 'N/A') return null;
  if (!preg_match('/^-?\d+$/', $s)) return null;
  return (int)$s;
}

function isoUtcFromNhcUtc($s): ?string {
  $s = trim((string)$s);
  if ($s === '') return null;
  if (preg_match('/^(\d{4})(\d{2})(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+([AP]M)\s+UTC$/i', $s, $m)) {
    $hour = (int)$m[4] % 12;
    if (strtoupper($m[7]) === 'PM') $hour += 12;
    return sprintf('%04d-%02d-%02dT%02d:%02d:%02dZ',
      (int)$m[1], (int)$m[2], (int)$m[3], $hour, (int)$m[5], (int)$m[6]);
  }
  if (preg_match('/Z$/', $s)) return $s;
  try {
    $dt = new DateTime($s, new DateTimeZone('UTC'));
    return $dt->format('c');
  } catch (Throwable $e) {
    return null;
  }
}

function lc_str(string $s): string {
  if ($s === '') return $s;
  return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

function array_lowercase_values_recursive(array $a): array {
  $out = [];
  foreach ($a as $k => $v) {
    if (is_array($v)) $out[$k] = array_lowercase_values_recursive($v);
    elseif (is_string($v)) $out[$k] = lc_str($v);
    else $out[$k] = $v;
  }
  return $out;
}

function apply_selective_lowercase(array $adv): array {
  foreach (['atcfID','messageType','systemType','systemName','systemSaffirSimpsonCategory','message'] as $k) {
    if (isset($adv[$k]) && is_string($adv[$k])) $adv[$k] = lc_str($adv[$k]);
  }

  if (
      isset($adv['motion']) &&
      is_array($adv['motion']) &&
      isset($adv['motion']['dirText']) &&
      is_string($adv['motion']['dirText'])
  ) {
      $adv['motion']['dirText'] = lc_str($adv['motion']['dirText']);
  }

  if (isset($adv['geo']) && is_array($adv['geo'])) {
    $adv['geo'] = array_map(fn($s) => is_string($s) ? lc_str($s) : $s, $adv['geo']);
  }

  return $adv;
}

$storm = $_GET['storm'] ?? '';
$storm = strtoupper(trim($storm));

if (PHP_SAPI === 'cli') {
    $storm = null;
    foreach ($argv as $arg) {
        if (str_starts_with($arg, '--storm=')) {
            $storm = strtoupper(trim(substr($arg, 8)));
            break;
        }
    }
    if ($storm === null || $storm === '') {
        $storm = 'ALL';
    }
    $_GET['storm'] = $storm;
}

if ($storm === 'ALL') {
    processAllEPStorms();
    exit;
} else {
    if (!preg_match('/^EP\d{2}\d{4}$/', $storm)) {
        bail(400, 'Invalid storm id. Expected EPnnYYYY.');
    }
}

function processSingleStorm(string $stormId): array {
    $number = substr($stormId, 2, 2);
    $folder = sprintf('EP%02d', (int)$number);
    $fname  = 'atcf-' . strtolower($stormId) . '.xml';
    $srcUrl = "https://www.nhc.noaa.gov/storm_graphics/{$folder}/{$fname}";

    $rootDir = dirname(__DIR__, 1); 
    $cacheDir = $rootDir . '/storms/' . $stormId;
    $dest = $cacheDir . '/advisory.json';

    if (!is_dir($cacheDir) && !mkdir($cacheDir, 0775, true)) {
        throw new Exception('Unable to create cache directory.');
    }

    $ctx = stream_context_create(['http' => ['timeout' => 8]]);
    $raw = @file_get_contents($srcUrl, false, $ctx);
    if ($raw === false || strlen($raw) < 64) {
        $ftpUrl = "ftp://ftp.nhc.noaa.gov/atcf/adv/{$stormId}_info.xml";
        error_log("[advisory_writer_ep] Primary failed, trying FTP: {$ftpUrl}");

        $ftpCtx = stream_context_create(['ftp' => ['timeout' => 10]]);
        $raw = @file_get_contents($ftpUrl, false, $ftpCtx);

        if ($raw === false || strlen($raw) < 64) {
            throw new Exception('Failed to fetch advisory XML from both HTTPS and FTP sources.');
        }

        error_log("[advisory_writer_ep] FTP fallback successful for {$stormId}");
    }

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($raw);
    if ($xml === false) {
        throw new Exception('Failed to parse advisory XML.');
    }

    $advisory = [
        'atcfID' => $stormId,
        'generated' => gmdate('c'),
        'messageTimeUTC'   => isoUtcFromNhcUtc($xml->messageDateTimeUTC ?? ''),
        'messageTimeLocal' => formatToShortDateTime($xml->messageDateTimeLocal ?? ($xml->messageDateTimeLocalStr ?? '')),
        'messageTimeUTC_formatted' => formatToShortDateTime($xml->messageDateTimeUTC ?? ''),
        'messageType'      => strval_safe($xml->messageType ?? ''),
        'advisoryNumber'   => intval_safe($xml->advisoryNumber ?? ''),
        'systemType'       => strval_safe($xml->systemType ?? ''),
        'systemName'       => strval_safe($xml->systemName ?? ''),
        'systemSaffirSimpsonCategory' => strval_safe($xml->systemSaffirSimpsonCategory ?? ''),
        'loc' => [
            'lat'     => is_numeric($xml->centerLocLatitude ?? null) ? (float)$xml->centerLocLatitude : null,
            'lon'     => is_numeric($xml->centerLocLongitude ?? null) ? (float)$xml->centerLocLongitude : null,
            'latText' => strval_safe($xml->centerLocLatitudeExpanded ?? ''),
            'lonText' => strval_safe($xml->centerLocLongitudeExpanded ?? ''),
        ],
        'intensity' => [
            'mph' => intval_safe($xml->systemIntensityMph ?? ''),
            'kph' => intval_safe($xml->systemIntensityKph ?? ''),
            'kts' => intval_safe($xml->systemIntensityKts ?? ''),
            'mb'  => intval_safe($xml->systemMslpMb ?? ''),
        ],
        'motion' => [
            'dirText' => strval_safe($xml->systemDirectionOfMotion ?? ''),
            'mph'     => intval_safe($xml->systemSpeedMph ?? ''),
            'kph'     => intval_safe($xml->systemSpeedKph ?? ''),
            'kts'     => intval_safe($xml->systemSpeedKts ?? ''),
        ],
        'geo' => array_values(array_filter([
            strval_safe($xml->systemGeoRefPt1 ?? ''),
            strval_safe($xml->systemGeoRefPt2 ?? ''),
        ], fn($s) => $s !== '')),
        'message' => strval_safe($xml->message ?? ''),
    ];

    if ($advisory['intensity']['mph'] !== null) {
        $advisory['intensity']['kph'] ??= (int)round($advisory['intensity']['mph'] * 1.609344);
        $advisory['intensity']['kts'] ??= (int)round($advisory['intensity']['mph'] / 1.15078);
    } elseif ($advisory['intensity']['kts'] !== null) {
        $advisory['intensity']['mph'] ??= (int)round($advisory['intensity']['kts'] * 1.15078);
        $advisory['intensity']['kph'] ??= (int)round($advisory['intensity']['kts'] * 1.852);
    }
    if ($advisory['motion']['mph'] !== null) {
        $advisory['motion']['kph'] ??= (int)round($advisory['motion']['mph'] * 1.609344);
        $advisory['motion']['kts'] ??= (int)round($advisory['motion']['mph'] / 1.15078);
    } elseif ($advisory['motion']['kts'] !== null) {
        $advisory['motion']['mph'] ??= (int)round($advisory['motion']['kts'] * 1.15078);
        $advisory['motion']['kph'] ??= (int)round($advisory['motion']['kts'] * 1.852);
    }

    global $LOWERCASE_ALL;
    if ($LOWERCASE_ALL) {
        $advisory = array_lowercase_values_recursive($advisory);
    } else {
        $advisory = apply_selective_lowercase($advisory);
    }

    $tmp = $dest . '.tmp';
    if (file_put_contents($tmp, json_encode($advisory, JSON_UNESCAPED_SLASHES)) === false) {
        throw new Exception('Failed to write temp advisory.');
    }
    if (!rename($tmp, $dest)) {
        @unlink($tmp);
        throw new Exception('Failed to finalize advisory.');
    }

    return ['storm' => $stormId, 'cached' => basename($dest)];
}

function processAllEPStorms(): void {
    $currentStormsPath = __DIR__ . '/../../js/modules/cache/nhc_current_storms.json';
    
    if (!file_exists($currentStormsPath)) {
        adv_out("ERROR: Current storms cache not found at {$currentStormsPath}", 'ERROR');
        if (PHP_SAPI !== 'cli') {
            bail(500, 'Current storms cache not available');
        }
        return;
    }
    
    $rawStorms = file_get_contents($currentStormsPath);
    $stormsData = json_decode($rawStorms, true);
    
    if (!$stormsData || !isset($stormsData['data']['activeStorms'])) {
        adv_out("ERROR: Invalid storms data format", 'ERROR');
        if (PHP_SAPI !== 'cli') {
            bail(500, 'Invalid storms data');
        }
        return;
    }
    
    $epStorms = [];
    foreach ($stormsData['data']['activeStorms'] as $storm) {
        $stormId = strtoupper(trim($storm['id'] ?? ''));
        if (preg_match('/^EP\d{2}\d{4}$/', $stormId)) {
            $epStorms[] = $stormId;
        }
    }
    
    if (empty($epStorms)) {
        adv_out("INFO: No active EP storms found", 'INFO');
        if (PHP_SAPI !== 'cli') {
            echo json_encode(['ok' => true, 'message' => 'No active EP storms', 'processed' => []], JSON_UNESCAPED_SLASHES);
        }
        return;
    }
    
    $results = [];
    foreach ($epStorms as $stormId) {
        adv_out("Processing {$stormId}...", 'INFO');
        
        try {
            $result = processSingleStorm($stormId);
            $results[] = ['storm' => $stormId, 'status' => 'success', 'result' => $result];
            
            if (PHP_SAPI === 'cli') {
                adv_out("  SUCCESS: {$stormId}", 'INFO');
            }
        } catch (Exception $e) {
            $results[] = ['storm' => $stormId, 'status' => 'error', 'error' => $e->getMessage()];
            
            if (PHP_SAPI === 'cli') {
                adv_out("  ERROR: {$stormId} - " . $e->getMessage(), 'ERROR');
            }
        }
    }
    
    if (PHP_SAPI === 'cli') {
        $successCount = count(array_filter($results, fn($r) => $r['status'] === 'success'));
        adv_out("Completed: {$successCount}/" . count($results) . " storms processed successfully", 'INFO');
    } else {
        echo json_encode(['ok' => true, 'processed' => $results], JSON_UNESCAPED_SLASHES);
    }
}

try {
    $result = processSingleStorm($storm);
    echo json_encode(['ok' => true, 'storm' => $storm, 'cached' => $result['cached']], JSON_UNESCAPED_SLASHES);
} catch (Exception $e) {
    bail(500, $e->getMessage());
}