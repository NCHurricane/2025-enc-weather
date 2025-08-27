<?php
// counties/dare/api/cache_afd.php
declare(strict_types=1);

// AFD is county-wide (not zone-specific) and fetches from forecast office
// For Dare County: uses MHX (Newport/Morehead City) forecast office

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$configPath = $dataDir . '/config.json';
$outPath = $dataDir . '/discussion.json';

function http_get_json(string $url, int $timeout = 30, int $retries = 2) {
  $attempt = 0;
  $delay = 250000; // 0.25s
  while (true) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => $timeout,
      CURLOPT_TIMEOUT => $timeout,
      CURLOPT_USERAGENT => 'NCHurricaneCache/1.0',
      CURLOPT_HTTPHEADER => ['Accept: application/geo+json, application/json;q=0.9'],
    ]);
    $body = curl_exec($ch);
    $err  = curl_errno($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$err && $code >= 200 && $code < 300 && $body) {
      $json = json_decode($body, true);
      if (json_last_error() === JSON_ERROR_NONE) return $json;
    }

    if ($attempt >= $retries) return null;
    usleep($delay);
    $delay *= 2;
    $attempt++;
  }
}

function http_get_text(string $url, int $timeout = 30, int $retries = 2) {
  $attempt = 0;
  $delay = 250000; // 0.25s
  while (true) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => $timeout,
      CURLOPT_TIMEOUT => $timeout,
      CURLOPT_USERAGENT => 'NCHurricaneCache/1.0',
    ]);
    $body = curl_exec($ch);
    $err  = curl_errno($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$err && $code >= 200 && $code < 300 && $body) {
      return $body;
    }

    if ($attempt >= $retries) return null;
    usleep($delay);
    $delay *= 2;
    $attempt++;
  }
}

function atomic_write_json(string $path, array $data): bool {
  $tmp = $path . '.tmp';
  $json = json_encode($data, JSON_UNESCAPED_SLASHES);
  if ($json === false) return false;
  if (file_put_contents($tmp, $json) === false) return false;
  return rename($tmp, $path);
}

/**
 * Extract AFD text from HTML page
 */
function extractAfdFromHtml(string $html): ?string {
  // Try to find the AFD content in <pre> tags
  if (preg_match('/<pre[^>]*>(.*?)<\/pre>/s', $html, $matches)) {
    $afdText = $matches[1];
    
    // Clean up the text
    $afdText = html_entity_decode($afdText, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $afdText = trim($afdText);
    
    return $afdText;
  }
  
  return null;
}

/**
 * Fetch AFD from NWS API (try JSON first, then HTML fallback)
 */
function fetchAfd(string $officeId): ?string {
  error_log("Fetching AFD for office: {$officeId}");
  
  // Try API endpoint first
  $apiUrl = "https://api.weather.gov/products/types/AFD/locations/{$officeId}";
  $apiData = http_get_json($apiUrl);
  
  if ($apiData && isset($apiData['@graph']) && is_array($apiData['@graph'])) {
    // Get the most recent AFD
    $products = $apiData['@graph'];
    if (!empty($products)) {
      $latestProduct = $products[0]; // First item should be most recent
      $productUrl = $latestProduct['@id'] ?? null;
      
      if ($productUrl) {
        error_log("Fetching AFD content from: {$productUrl}");
        $productData = http_get_json($productUrl);
        
        if ($productData && isset($productData['productText'])) {
          error_log("Successfully retrieved AFD via API");
          return $productData['productText'];
        }
      }
    }
  }
  
  error_log("API method failed, trying HTML fallback");
  
  // Fallback to HTML scraping
  $htmlUrl = "https://forecast.weather.gov/product.php?site={$officeId}&product=AFD&issuedby={$officeId}";
  $html = http_get_text($htmlUrl);
  
  if ($html) {
    $afdText = extractAfdFromHtml($html);
    if ($afdText) {
      error_log("Successfully retrieved AFD via HTML scraping");
      return $afdText;
    }
  }
  
  error_log("Failed to retrieve AFD from both API and HTML methods");
  return null;
}

/**
 * Main execution
 */
try {
  // Load configuration
  if (!file_exists($configPath)) {
    throw new Exception("Config file not found: {$configPath}");
  }
  
  $config = json_decode(file_get_contents($configPath), true);
  if (!$config) {
    throw new Exception("Failed to parse config.json");
  }

  $countyName = $config['county']['name'] ?? 'Unknown';
  $forecastOffice = $config['forecastOffice'] ?? null;
  
  if (!$forecastOffice || !isset($forecastOffice['id'])) {
    throw new Exception("No forecast office found in config");
  }
  
  $officeId = $forecastOffice['id'];
  $officeName = $forecastOffice['name'] ?? $officeId;
  
  error_log("Processing AFD for {$countyName} County from {$officeName} ({$officeId})");
  
  // Fetch AFD text
  $afdText = fetchAfd($officeId);
  
  if (!$afdText) {
    throw new Exception("Failed to fetch AFD from {$officeId}");
  }
  
  // Build result
  $result = [
    'generated' => gmdate('c'),
    'office' => $officeId,
    'text' => $afdText
  ];
  
  // Write AFD file (county-wide, not zone-specific)
  if (atomic_write_json($outPath, $result)) {
    error_log("Successfully wrote AFD to {$outPath}");
    echo "OK\n";
  } else {
    error_log("Failed to write AFD to {$outPath}");
    echo "ERROR\n";
    exit(1);
  }
  
} catch (Exception $e) {
  error_log("Error in cache_afd.php: " . $e->getMessage());
  echo "ERROR\n";
  exit(1);
}
?>