<?php
declare(strict_types=1);
error_reporting(E_ALL);

// nhc_graphics_cache_ep.php
// Downloads and caches NHC storm graphics for all active EP storms for the current year
// Uses js/modules/cache/nhc_current_storms.json (fallback: live NHC JSON)
// Saves to active/storms/{STORM}/
// Overwrites existing files, logs errors to active/logs/nhc_graphics_cache_ep.log

$local_json = __DIR__ . '/cache/nhc_current_storms.json';
$remote_json = 'https://www.nhc.noaa.gov/CurrentStorms.json';
$base_url = 'https://www.nhc.noaa.gov/storm_graphics';
$storm_dir_base = __DIR__ . '/../storms/';
$log_dir = __DIR__ . '/../logs';
$log_file = $log_dir . '/nhc_graphics_cache_ep.log';
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

function save_image($url, $dest) {
    $tmp = $dest . '.tmp';
    $data = @file_get_contents($url);
    if ($data === false) throw new Exception("Failed to download $url");
    if (file_put_contents($tmp, $data) === false) throw new Exception("Failed to write $tmp");
    if (!rename($tmp, $dest)) throw new Exception("Failed to move $tmp to $dest");
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
        if ($basin !== 'EP') continue;
        if (substr($stormId, 4, 4) !== $current_year) continue;
        $stormNum = substr($stormId, 2, 2);
        $basinFolder = 'EP' . $stormNum;
        $storm_dir = $storm_dir_base . $stormId . '/';
        if (!is_dir($storm_dir)) {
            if (!mkdir($storm_dir, 0775, true)) {
                log_msg("Failed to create directory $storm_dir");
                continue;
            }
        }
        $graphics = [
            // Track and Messages
            ["{$base_url}/$basinFolder/{$stormId}_3day_cone_no_line_and_wind_sm2.png", '3day_cone_no_line_and_wind.png'],
            ["{$base_url}/$basinFolder/{$stormId}_5day_cone_no_line_and_wind_sm2.png", '5day_cone_no_line_and_wind.png'],
            ["{$base_url}/$basinFolder/{$stormId}_key_messages_sm2.png", 'key_messages.png'],
            ["{$base_url}/$basinFolder/{$stormId}_spanish_key_messages_sm2.png", 'spanish_key_messages.png'],
            // Wind Field/History/Arrival
            ["{$base_url}/$basinFolder/{$stormId}_current_wind_sm2.png", 'current_wind.png'],
            ["{$base_url}/$basinFolder/{$stormId}_wind_history_sm2.png", 'wind_history.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_earliest_reasonable_toa_34_sm2.png", '3day_earliest_reasonable_toa_34.png'],
            ["{$base_url}/$basinFolder/{$stormId}_3day_most_likely_toa_34_sm2.png", '3day_most_likely_toa_34.png'],
            // Peak Surge
            ["{$base_url}/$basinFolder/{$stormId}_peak_surge_sm2.png", 'peak_surge.png'],
            // Rainfall/Excess Rain (2-digit year)
            ["{$base_url}/$basinFolder/{$basin}{$stormNum}{$current_yy}WPCQPF_sm2.gif", 'WPCQPF.gif'],
            ["{$base_url}/$basinFolder/{$basin}{$stormNum}{$current_yy}INTQPF_sm2.gif", 'INTQPF.gif'],
            ["{$base_url}/$basinFolder/{$basin}{$stormNum}{$current_yy}WPCERO_sm2.gif", 'WPCERO.gif'],
        ];
        // Wind Probabilities (all timeframes)
        foreach ([34, 50, 64] as $kt) {
            foreach (['000','012','024','036','048','060'] as $tf) {
                $graphics[] = [
                    "{$base_url}/$basinFolder/{$stormId}_wind_probs_{$kt}_F{$tf}_sm2.png",
                    "wind_probs_{$kt}_F{$tf}_sm2.png"
                ];
            }
        }
        foreach ($graphics as [$url, $filename]) {
            $dest = $storm_dir . $filename;
            try {
                save_image($url, $dest);
                log_msg("Saved $url to $dest");
                $count++;
            } catch (Exception $e) {
                log_msg("Error saving $url: " . $e->getMessage());
            }
        }
    }
    log_msg("Done. $count images saved.");
} catch (Exception $e) {
    log_msg("Fatal error: " . $e->getMessage());
    exit(1);
}
