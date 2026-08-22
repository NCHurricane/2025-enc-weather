#!/usr/bin/env php
<?php
declare(strict_types=1);
error_reporting(E_ALL);
require_once __DIR__ . '/pacific_writer_common.php';

/**
 * NHC Text Products Cache Script - text_products_cache.php
 * * This script polls the latest advisories from the NHC for current storms
 * in the Atlantic, Eastern Pacific, and Central Pacific basins. It reads active storms from the
 * nhc_current_storms.json file and caches all relevant text products.
 * * Products cached:
 * - Tropical Cyclone Public Advisory (TCP) - English & Spanish
 * - Tropical Cyclone Forecast/Advisory (TCM)
 * - Tropical Cyclone Discussion (TCD) - English & Spanish
 * - Wind Speed Probabilities (PWS)
 * - Tropical Cyclone Update (TCU) - English & Spanish (optional)
 * - Monthly Tropical Weather Summary (TWS)
 * * Files are saved as JSON in the active/storms/{AL|EP|CP}nnYYYY directory with WMO naming convention (TCPAT1.json, TCPCP2.json, etc.)
 */

if (PHP_SAPI !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
}

define('CACHE_DIR', __DIR__ . '/../cache/');
define('STORMS_DIR', __DIR__ . '/../storms/');
define('LOG_DIR', __DIR__ . '/../../active/logs/');
define('USER_AGENT', 'Mozilla/5.0 (Weather App Cache Bot 1.0)');
define('TIMEOUT', 30);

if (!is_dir(LOG_DIR)) {
    if (!mkdir(LOG_DIR, 0755, true)) {
        error_log("Failed to create log directory: " . LOG_DIR);
        exit(1);
    }
}

if (PHP_SAPI === 'cli') {
    foreach ($argv as $arg) {
        if (strpos($arg, '--storm=') === 0) {
            $_GET['storm'] = substr($arg, 8);
            break;
        }
    }
}

function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    file_put_contents(LOG_DIR . 'text_products_cache.log', $logEntry, FILE_APPEND | LOCK_EX);
    
    if (PHP_SAPI === 'cli') {
        echo $logEntry;
    }
}

function fetchContentResponse($url) {
    return pacific_writer_fetch_response($url, [
        'User-Agent: ' . USER_AGENT,
        'Accept: application/xml,text/xml;q=0.9,*/*;q=0.8',
    ], TIMEOUT);
}

function fetchContent($url) {
    $response = fetchContentResponse($url);
    $status = (int)($response['status'] ?? 0);
    $content = $response['body'] ?? null;
    if ($status < 200 || $status >= 300 || !is_string($content) || $content === '') {
        logMessage("Failed to fetch {$url} (HTTP {$status})", 'WARNING');
        return false;
    }
    return $content;
}

function xmlToJson($xmlContent) {
    libxml_use_internal_errors(true);
    
    $xml = simplexml_load_string($xmlContent);
    
    if ($xml === false) {
        $errors = libxml_get_errors();
        $errorMsg = 'XML parsing failed';
        if (!empty($errors)) {
            $errorMsg .= ': ' . $errors[0]->message;
        }
        logMessage($errorMsg, 'ERROR');
        libxml_clear_errors();
        return false;
    }
    
    $array = json_decode(json_encode($xml), true);
    
    $textContent = null;
    if (isset($array['channel']['item']['description'])) {
        $rawDescription = $array['channel']['item']['description'];
        
        if (empty($rawDescription) || is_array($rawDescription)) {
            $descriptionElement = $xml->channel->item->description;
            if ($descriptionElement) {
                $rawDescription = (string)$descriptionElement;
            }
        }
        
        $textContent = formatNHCTextContent($rawDescription);
    }
    
    $result = [
        'metadata' => [
            'cached_at' => time(),
            'cached_at_iso' => date('c'),
            'format' => 'xml_converted',
            'has_text_content' => !empty($textContent)
        ],
        'data' => $array,
        'text_content' => $textContent
    ];
    
    return json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function formatNHCTextContent($rawDescription) {
    if (empty($rawDescription)) {
        return null;
    }
    
    $text = $rawDescription;
    if (strpos($text, '<![CDATA[') !== false) {
        $text = str_replace(['<![CDATA[', ']]>'], '', $text);
    }
    
    $text = str_replace('<br />', "\n", $text);
    $text = str_replace('<br/>', "\n", $text);
    $text = str_replace('<br>', "\n", $text);
    
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML401, 'UTF-8');
    
    $text = preg_replace('/\r\n|\r/', "\n", $text);
    $text = preg_replace('/\n\s*\n\s*\n/', "\n\n", $text);
    $text = trim($text);
    
    return $text;
}

function xmlToOutlookJson($xmlContent, $sourceUrl) {
    try {
        $xml = new SimpleXMLElement($xmlContent);
        $ns = $xml->getNamespaces(true);

        $item = $xml->channel->item[0] ?? null;
        if (!$item) {
            logMessage("No <item> found in XML from {$sourceUrl}", 'WARN');
            return false;
        }

        $title = (string)($item->title ?? '');
        $link = (string)($item->link ?? '');
        $guid = (string)($item->guid ?? '');
        $pubDate = (string)($item->pubDate ?? '');
        $description = (string)($item->description ?? '');

        $rawContent = html_entity_decode($description);
        $rawContent = preg_replace('/<br\s?\/?>/i', "\n", $rawContent);
        $rawContent = strip_tags($rawContent);
        
        $rawContent = trim(str_replace($title, '', $rawContent));

        $data = [
            'title' => $title,
            'link' => $link,
            'guid' => $guid,
            'pubDate' => $pubDate,
            'discussion' => '',
            'rawContent' => $rawContent,
            'metadata' => [
                'source_url' => $sourceUrl,
                'cached_at_iso' => date('c')
            ]
        ];

        return json_encode($data, JSON_PRETTY_PRINT);
    } catch (Exception $e) {
        logMessage("Error parsing XML from {$sourceUrl}: " . $e->getMessage(), 'ERROR');
        return false;
    }
}

function getAdvisoryNumber($stormId) {
    $stormId = strtoupper(trim($stormId));
    preg_match('/^(AL|EP|CP)(\d{2})(\d{4})$/', $stormId, $matches);
    if (count($matches) !== 4) {
        logMessage("Invalid storm ID format after uppercasing: {$stormId}", 'ERROR');
        return false;
    }
    
    $basin = $matches[1];
    $stormNumber = intval($matches[2]);
    
    $advisoryNumber = (($stormNumber - 1) % 5) + 1;
    
    return $advisoryNumber;
}

function getActiveStorms() {
    $cacheFile = dirname(__DIR__) . '/cache/nhc_current_storms.json';
    
    if (!file_exists($cacheFile)) {
        logMessage("Current storms cache file not found: {$cacheFile}", 'ERROR');
        return [];
    }
    
    $content = file_get_contents($cacheFile);
    $data = json_decode($content, true);
    
    if (!$data || !isset($data['data']['activeStorms'])) {
        logMessage("Invalid current storms data format", 'ERROR');
        return [];
    }
    
    if (empty($data['data']['activeStorms'])) {
        logMessage("No active storms in cache, checking existing storm directories", 'INFO');
        $storms = [];
        
        if (is_dir(STORMS_DIR)) {
            $dirs = scandir(STORMS_DIR);
            foreach ($dirs as $dir) {
                if ($dir !== '.' && $dir !== '..' && is_dir(STORMS_DIR . $dir)) {
                    if (preg_match('/^(AL|EP|CP)\d{6}$/', $dir)) {
                        $storms[] = ['id' => $dir];
                    }
                }
            }
        }
        
        return $storms;
    }
    
    return $data['data']['activeStorms'];
}

function getTextProductTypes() {
    return [
        // General products
        'TWOAT' => [
            'url' => 'https://www.nhc.noaa.gov/xml/TWOAT.xml',
            'filename' => 'twoat.json',
            'parser' => 'xmlToOutlookJson',
            'type' => 'general'
        ],
        'TWOEP' => [
            'url' => 'https://www.nhc.noaa.gov/xml/TWOEP.xml',
            'filename' => 'twoep.json',
            'parser' => 'xmlToOutlookJson',
            'type' => 'general'
        ],
        'TWOSAT' => [
            'url' => 'https://www.nhc.noaa.gov/xml/TWOSAT.xml',
            'filename' => 'twosat.json',
            'parser' => 'xmlToOutlookJson',
            'type' => 'general'
        ],
        'TWOSEP' => [
            'url' => 'https://www.nhc.noaa.gov/xml/TWOSEP.xml',
            'filename' => 'twosep.json',
            'parser' => 'xmlToOutlookJson',
            'type' => 'general'
        ],
        'TWDAT' => [
            'url' => 'https://www.nhc.noaa.gov/xml/TWDAT.xml',
            'filename' => 'twdat.json',
            'parser' => 'xmlToOutlookJson',
            'type' => 'general'
        ],
        'TWDEP' => [
            'url' => 'https://www.nhc.noaa.gov/xml/TWDEP.xml',
            'filename' => 'twdep.json',
            'parser' => 'xmlToOutlookJson',
            'type' => 'general'
        ],
        'TWSAT' => [
            'url' => 'https://www.nhc.noaa.gov/xml/TWSAT.xml',
            'filename' => 'twsat.json',
            'parser' => 'xmlToOutlookJson',
            'type' => 'general'
        ],
        'TWSEP' => [
            'url' => 'https://www.nhc.noaa.gov/xml/TWSEP.xml',
            'filename' => 'twsep.json',
            'parser' => 'xmlToOutlookJson',
            'type' => 'general'
        ],

        // Storm-specific products
        'TCP' => [
            'name' => 'Tropical Cyclone Public Advisory',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TCP%s%d.xml',
            'filename' => 'TCP',
            'required' => true,
            'type' => 'storm'
        ],
        'TCM' => [
            'name' => 'Tropical Cyclone Forecast/Advisory',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TCM%s%d.xml',
            'filename' => 'TCM',
            'required' => true,
            'type' => 'storm'
        ],
        'TCD' => [
            'name' => 'Tropical Cyclone Discussion',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TCD%s%d.xml',
            'filename' => 'TCD',
            'required' => true,
            'type' => 'storm'
        ],
        'PWS' => [
            'name' => 'Wind Speed Probabilities',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/PWS%s%d.xml',
            'filename' => 'PWS',
            'required' => true,
            'type' => 'storm'
        ],
        'TCU' => [
            'name' => 'Tropical Cyclone Update',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TCU%s%d.xml',
            'filename' => 'TCU',
            'required' => false,
            'type' => 'storm'
        ],
        
        'TAS' => [
            'name' => 'Tropical Cyclone Public Advisory (Spanish)',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TAS%s%d.xml',
            'filename' => 'TAS',
            'required' => false,
            'atlantic_only' => true,
            'type' => 'storm'
        ],
        'TDS' => [
            'name' => 'Tropical Cyclone Discussion (Spanish)',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TDS%s%d.xml',
            'filename' => 'TDS',
            'required' => false,
            'atlantic_only' => true,
            'type' => 'storm'
        ],
        'TUS' => [
            'name' => 'Tropical Cyclone Update (Spanish)',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TUS%s%d.xml',
            'filename' => 'TUS',
            'required' => false,
            'atlantic_only' => true,
            'type' => 'storm'
        ],
    ];
}

function getStormProductRoute(array $storm) {
    $stormId = strtoupper(trim((string)($storm['id'] ?? '')));
    if (!preg_match('/^(AL|EP|CP)\d{6}$/', $stormId)) {
        return false;
    }

    $binNumber = strtoupper(trim((string)($storm['binNumber'] ?? '')));
    if (preg_match('/^(AT|EP|CP)([1-5])$/', $binNumber, $matches)) {
        return ['basinCode' => $matches[1], 'slot' => (int)$matches[2]];
    }

    $basin = substr($stormId, 0, 2);
    $basinCode = ['AL' => 'AT', 'EP' => 'EP', 'CP' => 'CP'][$basin] ?? null;
    $slot = getAdvisoryNumber($stormId);
    return $basinCode !== null && $slot !== false
        ? ['basinCode' => $basinCode, 'slot' => $slot]
        : false;
}

function cacheTextProducts() {
    $products = getTextProductTypes();
    $activeStorms = getActiveStorms();
    $generalProductsCached = 0;
    $stormProductsCached = 0;

    logMessage("Processing general products...", 'INFO');
    foreach ($products as $productCode => $product) {
        if ($product['type'] !== 'general') {
            continue;
        }

        $content = fetchContent($product['url']);
        if ($content === false) {
            logMessage("No content fetched for general product {$productCode}, skipping", 'WARN');
            continue;
        }

        $parser = $product['parser'];
        $jsonContent = $parser($content, $product['url']);

        if ($jsonContent === false) {
            logMessage("Failed to parse general product {$productCode}", 'ERROR');
            continue;
        }

        $filePath = CACHE_DIR . strtolower($product['filename']);
        if (file_put_contents($filePath, $jsonContent) === false) {
            logMessage("Failed to write cache file for {$productCode} at {$filePath}", 'ERROR');
        } else {
            logMessage("Successfully cached {$productCode} to {$filePath}", 'INFO');
            $generalProductsCached++;
        }
    }
    logMessage("Finished processing general products. Cached: {$generalProductsCached}", 'INFO');

    if (empty($activeStorms)) {
        logMessage("No active storms found, skipping storm-specific products.", 'INFO');
    } else {
        logMessage("Processing storm-specific products for " . count($activeStorms) . " active storms...", 'INFO');
        foreach ($activeStorms as $storm) {
            $stormId = strtoupper($storm['id']);
            $route = getStormProductRoute($storm);
            if ($route === false) {
                logMessage("No text-product route for {$stormId}", 'ERROR');
                continue;
            }

            $basin = substr($stormId, 0, 2);
            $basinCode = $route['basinCode'];
            $advisoryNumber = $route['slot'];
            $stormDir = STORMS_DIR . $stormId . '/';
            $manifest = [
                'schemaVersion' => '1.0.0',
                'kind' => 'storm-text-products',
                'stormId' => $stormId,
                'generatedAt' => gmdate('c'),
                'products' => [],
            ];

            if (!is_dir($stormDir) && !mkdir($stormDir, 0755, true)) {
                logMessage("Failed to create directory: {$stormDir}", 'ERROR');
                continue;
            }

            foreach ($products as $productCode => $product) {
                if ($product['type'] !== 'storm') {
                    continue;
                }

                if (isset($product['atlantic_only']) && $product['atlantic_only'] && $basin !== 'AL') {
                    continue;
                }

                $fileName = $product['filename'] . $basinCode . $advisoryNumber . '.json';
                $url = sprintf($product['url_pattern'], $basinCode, $advisoryNumber);
                $response = fetchContentResponse($url);
                $status = (int)($response['status'] ?? 0);
                $content = $response['body'] ?? null;

                if ($status < 200 || $status >= 300 || !is_string($content) || $content === '') {
                    $notIssued = !$product['required'] && in_array($status, [404, 410], true);
                    $manifest['products'][$productCode] = [
                        'state' => $notIssued ? 'not-issued' : 'unavailable',
                        'required' => (bool)$product['required'],
                        'file' => null,
                        'sourceUrl' => $url,
                        'httpStatus' => $status !== 0 ? $status : null,
                    ];
                    if ($notIssued) {
                        logMessage("Optional product {$productCode} is not issued for {$stormId}", 'INFO');
                    } elseif ($product['required']) {
                        logMessage("Failed to fetch required product {$productCode} for {$stormId} (HTTP {$status})", 'ERROR');
                    } else {
                        logMessage("Optional product {$productCode} is unavailable for {$stormId} (HTTP {$status})", 'WARNING');
                    }
                    continue;
                }

                $jsonContent = xmlToJson($content);
                if ($jsonContent === false) {
                    $manifest['products'][$productCode] = [
                        'state' => 'unavailable',
                        'required' => (bool)$product['required'],
                        'file' => null,
                        'sourceUrl' => $url,
                        'httpStatus' => $status,
                        'reason' => 'parse-failed',
                    ];
                    logMessage("Failed to parse {$productCode} for {$stormId}", 'ERROR');
                    continue;
                }

                if (file_put_contents($stormDir . $fileName, $jsonContent) === false) {
                    $manifest['products'][$productCode] = [
                        'state' => 'unavailable',
                        'required' => (bool)$product['required'],
                        'file' => null,
                        'sourceUrl' => $url,
                        'httpStatus' => $status,
                        'reason' => 'publish-failed',
                    ];
                    logMessage("Failed to write cache file for {$productCode} for {$stormId}", 'ERROR');
                } else {
                    $manifest['products'][$productCode] = [
                        'state' => 'available',
                        'required' => (bool)$product['required'],
                        'file' => $fileName,
                        'sourceUrl' => $url,
                        'httpStatus' => $status,
                    ];
                    logMessage("Successfully cached {$productCode} for {$stormId} as {$fileName}", 'INFO');
                    $stormProductsCached++;
                }
            }
            try {
                nch_writer_publish_json($stormDir . 'text-products-manifest.json', $manifest);
            } catch (Throwable $error) {
                logMessage("Failed to publish text-product manifest for {$stormId}: {$error->getMessage()}", 'ERROR');
            }
        }
        logMessage("Finished processing storm-specific products. Cached: {$stormProductsCached}", 'INFO');
    }
    
    return ['general' => $generalProductsCached, 'storm' => $stormProductsCached];
}


function main() {
    logMessage("Starting NHC text products cache update", 'INFO');
    
    $startTime = microtime(true);
    
    $counts = cacheTextProducts();
    
    $executionTime = round(microtime(true) - $startTime, 2);
    logMessage("NHC text products cache update completed in {$executionTime} seconds", 'INFO');
    
    if (PHP_SAPI !== 'cli') {
        $response = [
            'status' => 'success',
            'message' => "Cache update completed in {$executionTime} seconds.",
            'general_products_cached' => $counts['general'],
            'storm_products_cached' => $counts['storm']
        ];
        echo json_encode($response);
    }
}

main();
?>
