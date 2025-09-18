<?php
/**
 * NHC Text Products Cache Script - text_products_cache.php
 * 
 * This script polls the latest advisories from the NHC for current storms
 * in the Atlantic and Pacific basins. It reads active storms from the
 * nhc_current_storms.json file and caches all relevant text products.
 * 
 * Products cached:
 * - Tropical Cyclone Public Advisory (TCP) - English & Spanish
 * - Tropical Cyclone Forecast/Advisory (TCM)
 * - Tropical Cyclone Discussion (TCD) - English & Spanish
 * - Wind Speed Probabilities (PWS)
 * - Tropical Cyclone Update (TCU) - English & Spanish (optional)
 * - Monthly Tropical Weather Summary (TWS)
 * 
 * Files are saved as JSON in the active/storms/{AL|EP}nnYYYY directory
 * with WMO naming convention (TCPAT1.json, TASEP2.json, etc.)
 */

define('CACHE_DIR', __DIR__ . '/../../js/modules/cache/');
define('STORMS_DIR', __DIR__ . '/../storms/');
define('LOG_DIR', __DIR__ . '/../../js/modules/logs/');
define('USER_AGENT', 'Mozilla/5.0 (Weather App Cache Bot 1.0)');
define('TIMEOUT', 30);

if (!is_dir(LOG_DIR)) {
    mkdir(LOG_DIR, 0755, true);
}

function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    file_put_contents(LOG_DIR . 'text_products_cache.log', $logEntry, FILE_APPEND | LOCK_EX);
    
    if (php_sapi_name() === 'cli') {
        echo $logEntry;
    }
}

function fetchContent($url) {
    $context = stream_context_create([
        'http' => [
            'timeout' => TIMEOUT,
            'user_agent' => USER_AGENT,
            'ignore_errors' => true
        ]
    ]);
    
    $content = @file_get_contents($url, false, $context);
    
    if ($content === false) {
        $error = error_get_last();
        logMessage("Failed to fetch {$url}: " . ($error['message'] ?? 'Unknown error'), 'ERROR');
        return false;
    }
    
    if (isset($http_response_header)) {
        $statusLine = $http_response_header[0];
        if (!preg_match('/HTTP\/\d\.\d\s+200\s+/', $statusLine)) {
            logMessage("HTTP error for {$url}: {$statusLine}", 'WARNING');
            return false;
        }
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

function getAdvisoryNumber($stormId) {
    $stormId = strtoupper(trim($stormId));
    preg_match('/^(AL|EP)(\d{2})(\d{4})$/', $stormId, $matches);
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
    $cacheFile = CACHE_DIR . 'nhc_current_storms.json';
    
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
                    if (preg_match('/^(AL|EP)\d{6}$/', $dir)) {
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
        'TCP' => [
            'name' => 'Tropical Cyclone Public Advisory',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TCP{BASIN}{NUM}.xml',
            'required' => true
        ],
        'TCM' => [
            'name' => 'Tropical Cyclone Forecast/Advisory',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TCM{BASIN}{NUM}.xml',
            'required' => true
        ],
        'TCD' => [
            'name' => 'Tropical Cyclone Discussion',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TCD{BASIN}{NUM}.xml',
            'required' => true
        ],
        'PWS' => [
            'name' => 'Wind Speed Probabilities',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/PWS{BASIN}{NUM}.xml',
            'required' => true
        ],
        'TCU' => [
            'name' => 'Tropical Cyclone Update',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TCU{BASIN}{NUM}.xml',
            'required' => false
        ],
        
        'TAS' => [
            'name' => 'Tropical Cyclone Public Advisory (Spanish)',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TAS{BASIN}{NUM}.xml',
            'required' => false,
            'atlantic_only' => true
        ],
        'TDS' => [
            'name' => 'Tropical Cyclone Discussion (Spanish)',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TDS{BASIN}{NUM}.xml',
            'required' => false,
            'atlantic_only' => true
        ],
        'TUS' => [
            'name' => 'Tropical Cyclone Update (Spanish)',
            'url_pattern' => 'https://www.nhc.noaa.gov/xml/TUS{BASIN}{NUM}.xml',
            'required' => false,
            'atlantic_only' => true
        ]
    ];
}

function getMonthlyProducts() {
    return [
        'TWSAT' => [
            'name' => 'Atlantic Monthly Tropical Weather Summary',
            'url' => 'https://www.nhc.noaa.gov/xml/TWSAT.xml'
        ],
        'TWSEP' => [
            'name' => 'Eastern Pacific Monthly Tropical Weather Summary',
            'url' => 'https://www.nhc.noaa.gov/xml/TWSEP.xml'
        ]
    ];
}

function cacheStormProducts($stormId) {
    $stormId = strtoupper($stormId);
    $advisoryNumber = getAdvisoryNumber($stormId);
    if ($advisoryNumber === false) {
        return false;
    }
    
    $basin = substr($stormId, 0, 2);
    $basinCode = ($basin === 'AL') ? 'AT' : 'EP';
    
    $stormDir = STORMS_DIR . $stormId . '/';
    
    if (!is_dir($stormDir)) {
        if (!mkdir($stormDir, 0755, true)) {
            logMessage("Failed to create storm directory: {$stormDir}", 'ERROR');
            return false;
        }
    }
    
    $products = getTextProductTypes();
    $successCount = 0;
    $totalAttempts = 0;
    
    foreach ($products as $productCode => $product) {
        if (isset($product['atlantic_only']) && $product['atlantic_only'] && $basin !== 'AL') {
            continue;
        }
        
        $url = str_replace(['{BASIN}', '{NUM}'], [$basinCode, $advisoryNumber], $product['url_pattern']);
        $filename = $productCode . $basinCode . $advisoryNumber . '.json';
        $filepath = $stormDir . $filename;
        
        $totalAttempts++;
        
        logMessage("Fetching {$product['name']} for {$stormId} from {$url}", 'INFO');
        
        $content = fetchContent($url);
        
        if ($content === false) {
            if ($product['required']) {
                logMessage("Failed to fetch required product {$productCode} for {$stormId}", 'ERROR');
            } else {
                logMessage("Optional product {$productCode} not available for {$stormId}", 'INFO');
            }
            continue;
        }
        
        $jsonContent = xmlToJson($content);
        
        if ($jsonContent === false) {
            logMessage("Failed to convert {$productCode} to JSON for {$stormId}", 'ERROR');
            continue;
        }
        
        if (file_put_contents($filepath, $jsonContent, LOCK_EX) === false) {
            logMessage("Failed to write {$filename} for {$stormId}", 'ERROR');
            continue;
        }
        
        logMessage("Successfully cached {$filename} for {$stormId}", 'INFO');
        $successCount++;
    }
    
    logMessage("Cached {$successCount}/{$totalAttempts} products for {$stormId}", 'INFO');
    return $successCount > 0;
}

function cacheMonthlyProducts() {
    $products = getMonthlyProducts();
    $successCount = 0;
    
    foreach ($products as $productCode => $product) {
        $filename = $productCode . '.json';
        $filepath = CACHE_DIR . $filename;
        
        logMessage("Fetching {$product['name']} from {$product['url']}", 'INFO');
        
        $content = fetchContent($product['url']);
        
        if ($content === false) {
            logMessage("Failed to fetch {$productCode}", 'ERROR');
            continue;
        }
        
        $jsonContent = xmlToJson($content);
        
        if ($jsonContent === false) {
            logMessage("Failed to convert {$productCode} to JSON", 'ERROR');
            continue;
        }
        
        if (file_put_contents($filepath, $jsonContent, LOCK_EX) === false) {
            logMessage("Failed to write {$filename}", 'ERROR');
            continue;
        }
        
        logMessage("Successfully cached {$filename}", 'INFO');
        $successCount++;
    }
    
    return $successCount;
}

function main() {
    logMessage("Starting NHC text products cache update", 'INFO');
    
    $startTime = microtime(true);
    
    $activeStorms = getActiveStorms();
    
    if (empty($activeStorms)) {
        logMessage("No active storms found", 'INFO');
    } else {
        logMessage("Found " . count($activeStorms) . " active storms", 'INFO');
        
        $stormsProcessed = 0;
        foreach ($activeStorms as $storm) {
            $stormId = isset($storm['id']) ? $storm['id'] : (isset($storm['stormId']) ? $storm['stormId'] : null);
            
            if (!$stormId) {
                logMessage("Storm missing ID field: " . json_encode($storm), 'ERROR');
                continue;
            }
            
            if (cacheStormProducts($stormId)) {
                $stormsProcessed++;
            }
        }
        
        logMessage("Successfully processed products for {$stormsProcessed}/" . count($activeStorms) . " storms", 'INFO');
    }
    
    $monthlyCount = cacheMonthlyProducts();
    logMessage("Cached {$monthlyCount}/2 monthly products", 'INFO');
    
    $executionTime = round(microtime(true) - $startTime, 2);
    logMessage("NHC text products cache update completed in {$executionTime} seconds", 'INFO');
    
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'timestamp' => date('c'),
            'execution_time' => $executionTime,
            'storms_processed' => $stormsProcessed ?? 0,
            'monthly_products_cached' => $monthlyCount,
            'active_storms_count' => count($activeStorms)
        ], JSON_PRETTY_PRINT);
    }
}

try {
    main();
} catch (Exception $e) {
    logMessage("Fatal error: " . $e->getMessage(), 'ERROR');
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json', true, 500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit(1);
}

?>