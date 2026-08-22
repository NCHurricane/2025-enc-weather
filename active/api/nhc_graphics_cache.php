<?php
declare(strict_types=1);
error_reporting(E_ALL);
require_once __DIR__ . '/pacific_writer_common.php';

// nhc_graphics_cache.php
// Downloads and caches NHC storm graphics for all active AL/EP storms for the current year
// Uses js/modules/cache/nhc_current_storms.json (fallback: live NHC JSON)
// Saves to active/storms/{STORM}/
// Overwrites existing files, logs errors to active/logs/nhc_graphics_cache.log

$local_json = dirname(__DIR__) . '/cache/nhc_current_storms.json';
$remote_json = 'https://www.nhc.noaa.gov/CurrentStorms.json';
$base_url = 'https://www.nhc.noaa.gov/storm_graphics';
$storm_dir_base = __DIR__ . '/../storms/';
$log_dir = __DIR__ . '/../logs';
$log_file = $log_dir . '/nhc_graphics_cache.log';
    // Delete files older than 24 hours in the storm/{stormID} directory
    function delete_old_files($stormDir) {
        if (!is_dir($stormDir)) return;
        $now = time();
        $files = glob($stormDir . '/*');
        foreach ($files as $file) {
            if (is_file($file) && ($now - filemtime($file)) > 86400) {
                @unlink($file);
            }
        }
    }
    $stormID = isset($stormID) ? $stormID : (isset($_GET['storm']) ? $_GET['storm'] : null);
    if ($stormID) {
        $stormDir = __DIR__ . '/../storms/' . $stormID;
        delete_old_files($stormDir);
    }
if (!is_dir($log_dir)) {
    mkdir($log_dir, 0775, true);
}

function log_msg($msg) {
    global $log_file;
    $ts = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[$ts] $msg\n", FILE_APPEND);
}

function fetch_json($local, $remote) {
    if (file_exists($local)) {
        $data = file_get_contents($local);
        $json = json_decode($data, true);
        if (is_array($json)) return $json;
    }
    $data = @file_get_contents($remote);
    if ($data !== false) {
        $json = json_decode($data, true);
        if (is_array($json)) return $json;
    }
    throw new Exception('Could not load storm list from local or remote');
}

try {
    $storms_json = fetch_json($local_json, $remote_json);
    $active_storms = [];
    if (isset($storms_json['data']['activeStorms']) && is_array($storms_json['data']['activeStorms'])) {
        $active_storms = $storms_json['data']['activeStorms'];
    } elseif (isset($storms_json[0]['id'])) {
        $active_storms = $storms_json;
    }
    $current_year = date('Y');
    $current_yy = substr($current_year, 2, 2);
    $count = 0;
    foreach ($active_storms as $storm) {
        if (!isset($storm['id'])) continue;
        $stormId = strtoupper($storm['id']);
        $basin = substr($stormId, 0, 2);
        if ($basin !== 'AL') continue;
        if (substr($stormId, 4, 4) !== $current_year) continue;
        $stormNum = substr($stormId, 2, 2);
        $basinFolder = 'AT' . $stormNum;
        $storm_dir = $storm_dir_base . $stormId . '/';
        if (!is_dir($storm_dir)) {
            if (!mkdir($storm_dir, 0775, true)) {
                log_msg("Failed to create directory $storm_dir");
                continue;
            }
        }
        // Graphics to download
        $graphics = [
            // Track and Messages
            ["{$base_url}/$basinFolder/{$stormId}_3day_cone.png", '3day_cone_no_line_and_wind.png'],
            ["{$base_url}/$basinFolder/{$stormId}_5day_cone.png", '5day_cone_no_line_and_wind.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_cone_es.png", '3day_cone_es.png'],
            ["{$base_url}/$basinFolder/{$stormId}_5day_cone_es.png", '5day_cone_es.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_cone_fr.png", '3day_cone_fr.png'],
            ["{$base_url}/$basinFolder/{$stormId}_5day_cone_fr.png", '5day_cone_fr.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_expCone.png", '3day_expCone.png'],
            ["{$base_url}/$basinFolder/{$stormId}_5day_expCone.png", '5day_expCone.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_expCone_es.png", '3day_expCone_es.png'],
            ["{$base_url}/$basinFolder/{$stormId}_5day_expCone_es.png", '5day_expCone_es.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_expCone_fr.png", '3day_expCone_fr.png'],
            ["{$base_url}/$basinFolder/{$stormId}_5day_expCone_fr.png", '5day_expCone_fr.png'],
            ["{$base_url}/$basinFolder/{$stormId}_key_messages.png", 'key_messages.png'],
            ["{$base_url}/$basinFolder/{$stormId}_spanish_key_messages.png", 'spanish_key_messages.png'],
            // Wind Field/History/Arrival
            ["{$base_url}/$basinFolder/{$stormId}_current_wind.png", 'current_wind.png'],
            ["{$base_url}/$basinFolder/{$stormId}_wind_history.png", 'wind_history.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_earliest_reasonable_toa_34.png", '3day_earliest_reasonable_toa_34.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_most_likely_toa_34.png", '3day_most_likely_toa_34.png'],
            // Peak Surge
            ["{$base_url}/$basinFolder/{$stormId}_peak_surge.png", 'peak_surge.png'],
            // Rainfall/Excess Rain (2-digit year)
            ["{$base_url}/$basinFolder/{$basin}{$stormNum}{$current_yy}WPCQPF.gif", 'WPCQPF.gif'],
            ["{$base_url}/$basinFolder/{$basin}{$stormNum}{$current_yy}INTQPF.gif", 'INTQPF.gif'],
            ["{$base_url}/$basinFolder/{$basin}{$stormNum}{$current_yy}WPCERO.gif", 'WPCERO.gif'],
        ];
        // Wind Probabilities (all timeframes)
        foreach ([34, 50, 64] as $kt) {
            foreach (['000','012','024','036','048','060'] as $tf) {
                $graphics[] = [
                    "{$base_url}/$basinFolder/{$stormId}_wind_probs_{$kt}_F{$tf}.png",
                    "wind_probs_{$kt}_F{$tf}.png"
                ];
            }
        }
        $manifest = [
            'schemaVersion' => '1.0.0',
            'kind' => 'storm-graphics',
            'stormId' => $stormId,
            'generatedAt' => gmdate('c'),
            'products' => [],
        ];
        $age_sensitive = ['WPCQPF.gif', 'INTQPF.gif', 'WPCERO.gif', 'peak_surge.png'];
        foreach ($graphics as [$url, $filename]) {
            $dest = $storm_dir . $filename;
            $result = nch_writer_download_image(
                $url,
                $dest,
                [
                    'User-Agent: NCHurricane Atlantic graphics cache/1.0',
                    'Accept: image/*,*/*;q=0.8',
                ],
                30,
                in_array($filename, $age_sensitive, true) ? 86400 : null
            );
            $manifest['products'][$filename] = $result;
            if ($result['state'] === 'available') {
                log_msg("Saved $url to $dest");
                $count++;
            } elseif ($result['state'] === 'not-issued') {
                log_msg("Not issued: $url");
            } else {
                log_msg("{$result['state']}: $url" . (isset($result['error']) ? " ({$result['error']})" : ''));
            }
        }
        nch_writer_publish_json($storm_dir . 'graphics-manifest.json', $manifest);
    }
    log_msg("Done. $count images saved.");
} catch (Exception $e) {
    log_msg("Fatal error: " . $e->getMessage());
    exit(1);
}
