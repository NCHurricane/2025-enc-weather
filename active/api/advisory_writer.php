#!/usr/bin/env php
<?php
/**
 * NHC Advisory Writer, Atlantic - advisory_writer.php
 * Fetches NHC advisory XML (Atlantic only) and caches a compact advisory.json under:
 * /active/storms/ALnnYYYY/advisory.json
 *
 * Query (Web Mode):
 * ?storm=ALnnYYYY  or ?storm=ALL
 *
 * Execution (CLI Mode):
 * php advisory_writer.php --storm=ALnnYYYY
 * php advisory_writer.php --storm=ALL
 * php advisory_writer.php (defaults to --storm=ALL)
 */

// --- Basic Setup ---
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../active/logs/advisory_writer_error.log');

// --- Core Logic Start ---

// Determine execution mode (Command Line or Web)
$isCli = (PHP_SAPI === 'cli' || defined('STDIN'));

// Initialize storm variable
$storm = '';

if ($isCli) {
    // --- CLI Mode ---
    echo "--- Running in CLI mode ---\n";
    $storm = 'ALL'; // Default for CLI
    if (isset($argv)) {
        foreach ($argv as $arg) {
            if (strpos($arg, '--storm=') === 0) {
                $storm = strtoupper(trim(substr($arg, 8)));
                break;
            }
        }
    }
    echo "Processing storm target: $storm\n";
    // Manually set $_GET so the rest of the script can use it consistently
    $_GET['storm'] = $storm;

} else {
    // --- Web Mode ---
    // Set headers FIRST before any potential output to avoid errors.
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');

    $storm = isset($_GET['storm']) ? strtoupper(trim($_GET['storm'])) : '';
}

// --- Functions ---

$LOWERCASE_ALL = false;

/**
 * File-based logging function. Also echos to console in CLI mode.
 * @param string $msg The message to log.
 * @param string $level The log level (e.g., INFO, ERROR, DEBUG).
 */
function adv_log($msg, $level = 'INFO') {
    global $isCli;
    
    $logDir = __DIR__ . '/../../active/logs/';
    $logFile = $logDir . 'advisory_writer.log';

    if (!is_dir($logDir)) {
        if (!@mkdir($logDir, 0755, true)) {
            error_log("advisory_writer.php: CRITICAL - Failed to create log directory: {$logDir}");
            return;
        }
    }

    $timestamp = date('Y-m-d H:i:s');
    $entry = "[$timestamp] [$level] $msg\n";

    if ($isCli) {
        echo $entry;
    }

    @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
}

/**
 * Exits the script with a JSON error message.
 * @param int $code HTTP response code.
 * @param string $msg The error message.
 */
function bail($code, $msg) {
  global $isCli;
  adv_log($msg, 'ERROR');
  if (!$isCli) {
    http_response_code($code);
  }
  echo json_encode(['ok' => false, 'error' => $msg]);
  exit;
}

/**
 * Exits the script with a JSON success message.
 * @param array $d The data payload.
 */
function ok($d) {
  echo json_encode($d);
  exit;
}

// --- Data Formatting and Helper Functions ---

function formatToShortDateTime($dateTimeStr, $monthStyle = 'short') {
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

    static $MONTHS_SHORT = array('', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec');
    $monthName = ($monthStyle === 'long' ? $MONTHS_SHORT[$month] : $MONTHS_SHORT[$month]);

    return sprintf('%s %d %d:%02d %s %s',
      $monthName, $day, $displayHour, $minute, $displayAmPm, $tz
    );
  }

  return $s;
}

function strval_safe($x) { return trim((string)$x); }

function intval_safe($x) {
  $s = trim((string)$x);
  if ($s === '' || strtoupper($s) === 'N/A') return null;
  if (!preg_match('/^-?\d+$/', $s)) return null;
  return (int)$s;
}

function isoUtcFromNhcUtc($s) {
  $s = trim((string)$s);
  if ($s === '') return null;
  if (preg_match('/^(\d{4})(\d{2})(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+([AP]M)\s+UTC$/i', $s, $m)) {
    $hour = (int)$m[4];
    if (strtoupper($m[7]) === 'PM' && $hour !== 12) $hour += 12;
    if (strtoupper($m[7]) === 'AM' && $hour === 12) $hour = 0;
    return sprintf('%04d-%02d-%02dT%02d:%02d:%02dZ',
      (int)$m[1], (int)$m[2], (int)$m[3], $hour, (int)$m[5], (int)$m[6]);
  }
  if (preg_match('/Z$/', $s)) return $s;
  try {
    $dt = new DateTime($s, new DateTimeZone('UTC'));
    return $dt->format(DateTime::ATOM);
  } catch (Exception $e) {
    return null;
  }
}

function lc_str($s) {
  if ($s === '') return $s;
  return function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
}

function array_lowercase_values_recursive($a) {
  $out = array();
  foreach ($a as $k => $v) {
    if (is_array($v)) $out[$k] = array_lowercase_values_recursive($v);
    elseif (is_string($v)) $out[$k] = lc_str($v);
    else $out[$k] = $v;
  }
  return $out;
}

function apply_selective_lowercase($adv) {
  foreach (array('messageType','systemType','systemName','systemSaffirSimpsonCategory','message') as $k) {
    if (isset($adv[$k]) && is_string($adv[$k])) $adv[$k] = lc_str($adv[$k]);
  }

  if (
      isset($adv['motion']) &&
      is_array($adv['motion']) &&
      isset($adv['motion']['direction']) &&
      is_string($adv['motion']['direction'])
  ) {
      $adv['motion']['direction'] = lc_str($adv['motion']['direction']);
  }

  if (isset($adv['geo']) && is_array($adv['geo'])) {
    $adv['geo'] = array_map(function($s) { return is_string($s) ? lc_str($s) : $s; }, $adv['geo']);
  }

  return $adv;
}

function lc_str_if_string($s) {
    return is_string($s) ? lc_str($s) : $s;
}

function array_filter_non_empty($s) {
    return $s !== '';
}

// --- Core Processing Functions ---

function processSingleStorm($stormId) {
    $stormId = strtoupper($stormId);
    adv_log("Processing single storm: {$stormId}", 'INFO');
    
    $number = substr($stormId, 2, 2);
    $folder = sprintf('AT%02d', (int)$number);
    $fname  = 'atcf-' . strtolower($stormId) . '.xml';
    $srcUrl = "https://www.nhc.noaa.gov/storm_graphics/{$folder}/{$fname}";

    $rootDir = dirname(__FILE__) . '/../..';
    $cacheDir = $rootDir . '/active/storms/' . $stormId;
    $dest = $cacheDir . '/advisory.json';

    adv_log("Source URL: {$srcUrl}", 'DEBUG');
    adv_log("Cache directory: {$cacheDir}", 'DEBUG');

    if (!is_dir($cacheDir) && !mkdir($cacheDir, 0755, true)) {
        throw new Exception('Unable to create cache directory: ' . $cacheDir);
    }

    $ctx = stream_context_create(array('http' => array('timeout' => 8, 'user_agent' => 'NCHurricane/1.0')));
    $raw = @file_get_contents($srcUrl, false, $ctx);
    
    if ($raw === false || strlen($raw) < 64) {
        adv_log("Primary source failed for {$stormId}, trying FTP fallback.", 'WARN');
        $ftpUrl = "ftp://ftp.nhc.noaa.gov/atcf/adv/" . strtolower(substr($stormId, 0, 2)) . substr($stormId, 2) . "_info.xml";
        $raw = @file_get_contents($ftpUrl, false, $ctx);

        if ($raw === false || strlen($raw) < 64) {
            throw new Exception('Failed to fetch advisory XML from both HTTPS and FTP sources.');
        }
        adv_log("FTP fallback successful for {$stormId}", 'INFO');
    }

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($raw);
    if ($xml === false) {
        throw new Exception('Failed to parse advisory XML.');
    }
    
    $messageRaw = strval_safe(isset($xml->message) ? $xml->message : '');
    $headlines = array();
    if ($messageRaw !== '') {
        // Split into lines, normalize line endings
        $lines = preg_split('/\r?\n|(?<=\s)\n|(?<=\n)/', $messageRaw);
        $foundDate = false;
        $collect = false;
        $headlineLines = array();
        foreach ($lines as $i => $line) {
            $trimmed = trim($line);
            // Find the date/time line (e.g., '300 PM GMT Fri Sep 26 2025')
            if (!$foundDate && preg_match('/\d{1,4}\s*(AM|PM)\s+[A-Z]{2,4}\s+.+\d{4}/i', $trimmed)) {
                $foundDate = true;
                $collect = true;
                continue;
            }
            if ($collect) {
                // Stop at first line containing 'ADVISORY' or 'SUMMARY' (case-insensitive)
                if (stripos($trimmed, 'ADVISORY') !== false || stripos($trimmed, 'SUMMARY') !== false) {
                    break;
                }
                // Only collect non-empty lines
                if ($trimmed !== '') {
                    $headlineLines[] = $trimmed;
                }
            }
        }
        // Now join lines into logical headlines: group consecutive lines, join, remove leading/trailing ...
        $current = '';
        foreach ($headlineLines as $line) {
            // If line starts with ... it's a new headline
            if (preg_match('/^\.\.\./', $line)) {
                if ($current !== '') {
                    // Clean up: remove leading/trailing ... and whitespace, collapse spaces
                    $clean = preg_replace('/^\.*|\.*$/', '', $current);
                    $clean = preg_replace('/\s+/', ' ', $clean);
                    $clean = trim($clean);
                    if ($clean !== '') $headlines[] = $clean . '...';
                }
                $current = $line;
            } else {
                // Continuation of previous headline
                $current .= ' ' . $line;
            }
        }
        // Add last headline
        if ($current !== '') {
            $clean = preg_replace('/^\.*|\.*$/', '', $current);
            $clean = preg_replace('/\s+/', ' ', $clean);
            $clean = trim($clean);
            if ($clean !== '') $headlines[] = $clean . '...';
        }
        // Remove duplicate trailing ... if present
        $headlines = array_map(function($h) {
            return preg_replace('/\.\.\.$/', '...', $h);
        }, $headlines);
    }
    $advisory = array(
        'atcfID' => $stormId,
        'generated' => gmdate('c'),
        'messageTimeUTC'   => isoUtcFromNhcUtc(isset($xml->messageDateTimeUTC) ? $xml->messageDateTimeUTC : ''),
        'messageTimeLocal' => formatToShortDateTime(isset($xml->messageDateTimeLocal) ? $xml->messageDateTimeLocal : (isset($xml->messageDateTimeLocalStr) ? $xml->messageDateTimeLocalStr : '')),
        'messageType'      => strval_safe(isset($xml->messageType) ? $xml->messageType : ''),
        'advisoryNumber'   => strval_safe(isset($xml->advisoryNumber) ? $xml->advisoryNumber : ''),
        'systemType'       => strval_safe(isset($xml->systemType) ? $xml->systemType : ''),
        'systemName'       => strval_safe(isset($xml->systemName) ? $xml->systemName : ''),
        'systemSaffirSimpsonCategory' => strval_safe(isset($xml->systemSaffirSimpsonCategory) ? $xml->systemSaffirSimpsonCategory : ''),
        'loc' => array(
            'lat'     => is_numeric(isset($xml->centerLocLatitude) ? (string)$xml->centerLocLatitude : null) ? (float)$xml->centerLocLatitude : null,
            'lon'     => is_numeric(isset($xml->centerLocLongitude) ? (string)$xml->centerLocLongitude : null) ? (float)$xml->centerLocLongitude : null,
            'latText' => strval_safe(isset($xml->centerLocLatitudeExpanded) ? $xml->centerLocLatitudeExpanded : ''),
            'lonText' => strval_safe(isset($xml->centerLocLongitudeExpanded) ? $xml->centerLocLongitudeExpanded : ''),
        ),
        'intensity' => array(
            'mph' => intval_safe(isset($xml->systemIntensityMph) ? $xml->systemIntensityMph : ''),
            'kph' => intval_safe(isset($xml->systemIntensityKph) ? $xml->systemIntensityKph : ''),
            'kts' => intval_safe(isset($xml->systemIntensityKts) ? $xml->systemIntensityKts : ''),
            'mb'  => intval_safe(isset($xml->systemMslpMb) ? $xml->systemMslpMb : ''),
        ),
        'motion' => array(
            'direction' => strval_safe(isset($xml->systemDirectionOfMotion) ? $xml->systemDirectionOfMotion : ''),
            'speed' => array(
                'mph'     => intval_safe(isset($xml->systemSpeedMph) ? $xml->systemSpeedMph : ''),
                'kph'     => intval_safe(isset($xml->systemSpeedKph) ? $xml->systemSpeedKph : ''),
                'kts'     => intval_safe(isset($xml->systemSpeedKts) ? $xml->systemSpeedKts : ''),
            )
        ),
        'geo' => array_values(array_filter(array(
            strval_safe(isset($xml->systemGeoRefPt1) ? $xml->systemGeoRefPt1 : ''),
            strval_safe(isset($xml->systemGeoRefPt2) ? $xml->systemGeoRefPt2 : ''),
        ), 'array_filter_non_empty')),
        'message' => $messageRaw,
        'headlines' => $headlines,
    );
    
    if ($advisory['intensity']['mph'] !== null) {
        if (!isset($advisory['intensity']['kph'])) {
            $advisory['intensity']['kph'] = (int)round($advisory['intensity']['mph'] * 1.609344);
        }
        if (!isset($advisory['intensity']['kts'])) {
            $advisory['intensity']['kts'] = (int)round($advisory['intensity']['mph'] / 1.15078);
        }
    }
    
    global $LOWERCASE_ALL;
    if ($LOWERCASE_ALL) {
        $advisory = array_lowercase_values_recursive($advisory);
    } else {
        $advisory = apply_selective_lowercase($advisory);
    }

    $tmp = $dest . '.tmp';
    if (file_put_contents($tmp, json_encode($advisory)) === false) {
        throw new Exception('Failed to write temp advisory file.');
    }
    
    if (!rename($tmp, $dest)) {
        @unlink($tmp);
        throw new Exception('Failed to finalize advisory file.');
    }
    
    adv_log("Successfully cached advisory for {$stormId}", 'INFO');
    return array('storm' => $stormId, 'cached' => basename($dest));
}

function processAllALStorms() {
    global $isCli;
    $currentStormsPath = dirname(__FILE__) . '/../../js/modules/cache/nhc_current_storms.json';
    adv_log("Looking for active storms file: {$currentStormsPath}", 'DEBUG');
    
    if (!file_exists($currentStormsPath)) {
        bail(500, "Current storms cache not found at {$currentStormsPath}");
    }
    
    $rawStorms = file_get_contents($currentStormsPath);
    $stormsData = json_decode($rawStorms, true);
    
    if (!$stormsData || !isset($stormsData['data']['activeStorms'])) {
        bail(500, 'Invalid storms data format in nhc_current_storms.json');
    }
    
    $stormIds = array();
    foreach($stormsData['data']['activeStorms'] as $storm) {
        $stormIds[] = $storm['id'];
    }

    $alStorms = array_filter($stormIds, 'is_al_storm');
    
    if (empty($alStorms)) {
        adv_log("No active AL storms found to process.", 'INFO');
        if (!$isCli) {
            ok(array('ok' => true, 'message' => 'No active AL storms', 'processed' => array()));
        }
        return;
    }
    
    adv_log("Found active storms: " . implode(', ', $alStorms), 'INFO');
    $results = array();
    foreach ($alStorms as $stormId) {
        try {
            $result = processSingleStorm($stormId);
            $results[] = array('storm' => $stormId, 'status' => 'success', 'result' => $result);
        } catch (Exception $e) {
            adv_log("Failed processing {$stormId}: " . $e->getMessage(), 'ERROR');
            $results[] = array('storm' => $stormId, 'status' => 'error', 'error' => $e->getMessage());
        }
    }
    
    $successCount = 0;
    foreach($results as $r) {
        if ($r['status'] === 'success') {
            $successCount++;
        }
    }
    adv_log("Completed: {$successCount}/" . count($results) . " storms processed.", 'INFO');
    
    if (!$isCli) {
        ok(array('ok' => true, 'processed' => $results));
    }
}

function is_al_storm($id) {
    return preg_match('/^AL\d{2}\d{4}$/', strtoupper(trim($id)));
}

// --- Main Execution Block ---
try {
    adv_log("Script execution started for target: {$storm}", 'INFO');
    
    if ($storm === 'ALL') {
        processAllALStorms();
    } elseif ($storm !== '') {
        if (!preg_match('/^AL\d{2}\d{4}$/', $storm)) {
            bail(400, 'Invalid storm id. Expected ALnnYYYY.');
        }
        $result = processSingleStorm($storm);
        ok(array('ok' => true, 'storm' => $storm, 'cached' => $result['cached']));
    } else {
        bail(400, 'No storm specified. Use ?storm=ALL or ?storm=ALnnYYYY');
    }
    adv_log("Script execution finished.", 'INFO');

} catch (Exception $e) {
    bail(500, $e->getMessage());
}

?>

