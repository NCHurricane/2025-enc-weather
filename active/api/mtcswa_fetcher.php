<?php
// mtcswa_fetcher.php
// Fetches latest "0hr" MTCSWA images for Atlantic and EPac storms from NOAA and saves to storm directories
// Run every 3 hours on the half hour via cron

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Config
$js_url = 'https://www.ospo.noaa.gov/Visualization01/cData/Ocean/Tropical/MTCSWA/mtcswa_list.js'; // legacy, not used
$stormlist_url = 'https://www.ospo.noaa.gov/Visualization01/cData/Ocean/Tropical/MTCSWA/mtcswa_list.js'; // fallback, not used
$stormlist_new_url = 'https://www.ospo.noaa.gov/Visualization01/cData/Ocean/Tropical/MTCSWA/mtcswa_list.js'; // fallback, not used
$base_img_url = 'https://www.ospo.noaa.gov/Visualization01/cData/Ocean/Tropical/MTCSWA/';
$storm_dir_base = __DIR__ . '/../storms/';

$log_dir = __DIR__ . '/../logs';
$log_file = $log_dir . '/mtcswa_fetcher.log';
if (!is_dir($log_dir)) {
    mkdir($log_dir, 0775, true);
}

function log_msg($msg) {
    global $log_file;
    $ts = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[$ts] $msg\n", FILE_APPEND);
}

function fetch_js($url) {
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: NCHurricane.com Weather App/1.0\r\n",
            'timeout' => 30
        ]
    ];
    $ctx = stream_context_create($opts);
    $js = @file_get_contents($url, false, $ctx);
    if ($js === false) throw new Exception("Failed to fetch JS file");
    return $js;
}


function parse_stormlist($js) {
    // Extract the array from the JS file (var stormlist = [ ... ];)
    if (!preg_match('/var stormlist\s*=\s*(\[.*?\]);/s', $js, $m)) {
        throw new Exception("Could not find stormlist array in JS");
    }
    $json = $m[1];
    $arr = json_decode($json, true);
    if (!is_array($arr)) throw new Exception("Failed to decode stormlist");
    return $arr;
}

function get_latest_0hr_image($images) {
    // Find the latest image with "0hr" in the filename
    $latest = null;
    foreach ($images as $img) {
        if (strpos($img, '0hr') !== false) {
            if ($latest === null || $img > $latest) {
                $latest = $img;
            }
        }
    }
    return $latest;
}

function save_image($url, $dest) {
    $tmp = $dest . '.tmp';
    $data = @file_get_contents($url);
    if ($data === false) throw new Exception("Failed to download $url");
    if (file_put_contents($tmp, $data) === false) throw new Exception("Failed to write $tmp");
    if (!rename($tmp, $dest)) throw new Exception("Failed to move $tmp to $dest");
}

try {
    $js = fetch_js($js_url);
    $list = parse_stormlist($js);
    $count = 0;
    foreach ($list as $entry) {
        if (!isset($entry['basin'], $entry['storm'], $entry['0hr'])) continue;
        if ($entry['basin'] !== 'AL' && $entry['basin'] !== 'EP') continue;
        if (isset($entry['id']) && strtoupper($entry['id']) === 'INVEST') continue; // Skip INVESTs
        $storm_dir = $storm_dir_base . $entry['storm'] . '/';
        if (!is_dir($storm_dir)) {
            if (!mkdir($storm_dir, 0775, true)) {
                log_msg("Failed to create directory $storm_dir");
                continue;
            }
        }
        foreach ($entry['0hr'] as $imgset) {
            foreach (['SWND', 'SWHR'] as $type) {
                if (!empty($imgset[$type])) {
                    // Insert storm subdirectory in the URL
                    $img_url = $base_img_url . $entry['storm'] . '/' . $imgset[$type];
                    // Rename output file as requested
                    if (str_ends_with($imgset[$type], '_SWND.png')) {
                        $img_dest = $storm_dir . 'wind_analysis.png';
                    } elseif (str_ends_with($imgset[$type], '_SWHR.png')) {
                        $img_dest = $storm_dir . 'wind_analysis_zoom.png';
                    } else {
                        $img_dest = $storm_dir . basename($imgset[$type]);
                    }
                    try {
                        save_image($img_url, $img_dest);
                        log_msg("Saved $img_url to $img_dest");
                        $count++;
                    } catch (Exception $e) {
                        log_msg("Error saving $img_url: " . $e->getMessage());
                    }
                }
            }
        }
    }
    log_msg("Done. $count images saved.");
} catch (Exception $e) {
    log_msg("Fatal error: " . $e->getMessage());
    exit(1);
}
