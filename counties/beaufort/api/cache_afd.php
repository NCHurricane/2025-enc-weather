<?php
/**
 * NWS Area Forecast Discussion (AFD) Script - cache_afd.php
 * Fetches NWS Area Forecast Discussion and caches it as JSON.
 * 
 * AFD Office - Newport/Morehead City (MHX)
 *
 * For Beaufort County, NC Page
 */
declare(strict_types=1);

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$config = json_decode(file_get_contents($dataDir . '/config.json'), true);
$office = $config['forecastOffice']['id'] ?? 'MHX';

$userAgent = "NCHurricane.com Weather App/1.0 (admin@nchurricane.com)";

function fetchData($url, $userAgent, $retries = 3) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["User-Agent: " . $userAgent]);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch) || ($httpCode !== 200 && $httpCode !== 304)) {
        $error = curl_error($ch);
        curl_close($ch);
        error_log("AFD request failed for URL {$url}: HTTP {$httpCode}, Error: {$error}");
        return false;
    }
    
    curl_close($ch);
    return $result;
}

function cleanAFDText($rawText) {
    $cleanText = preg_replace('/&&/', '', $rawText);
    $cleanText = preg_replace('/\r\n/', "\n", $cleanText);
    return trim($cleanText);
}

function atomic_write_json($path, $data) {
    $temp = $path . '.tmp';
    $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) return false;
    if (file_put_contents($temp, $json) === false) return false;
    return rename($temp, $path);
}

error_log("AFD: Processing AFD for office: {$office}");

$afdUrl = "https://forecast.weather.gov/product.php?site={$office}&issuedby={$office}&product=AFD&format=txt&version=1&glossary=0";
$response = fetchData($afdUrl, $userAgent);

$text = '';
if ($response) {
    if (preg_match('/<pre[^>]*>(.*?)<\/pre>/s', $response, $matches)) {
        $afdText = $matches[1];
        $text = cleanAFDText($afdText);
        error_log("AFD: Successfully extracted " . strlen($text) . " characters");
    } else {
        error_log("AFD: Could not find <pre> tag in HTML response");
    }
} else {
    error_log("AFD: Failed to fetch HTML from {$afdUrl}");
}

$out = [
    'generated' => gmdate('c'),
    'office' => $office,
    'text' => $text
];

if (atomic_write_json($dataDir . '/discussion.json', $out)) {
    error_log("AFD: Successfully wrote discussion.json");
    echo "OK\n";
} else {
    error_log("AFD: Failed to write discussion.json");
    echo "ERROR\n";
}
?>