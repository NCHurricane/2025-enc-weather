<?php
// cache_afd.php - Fetches and caches Area Forecast Discussion text

// Configuration
$cacheDir = 'cache/';
$userAgent = "NCHurricane.com Weather App/1.0 (your@email.com)";

// Ensure cache directory exists
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
    error_log("Created cache directory: $cacheDir");
}

/**
 * Enhanced function to fetch data with rate limit awareness
 * @param string $url API URL
 * @param string $userAgent User agent string
 * @param int $retries Number of retries on failure
 * @return string|false Response body or false on failure
 */
function fetchData($url, $userAgent, $retries = 3) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "User-Agent: " . $userAgent,
        "Accept: application/geo+json"
    ]);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    // Track rate limiting metrics
    static $requestCount = 0;
    static $lastRequestTime = 0;
    static $rateLimitHits = 0;
    
    // Ensure we're not making requests too quickly
    $currentTime = microtime(true);
    $timeSinceLastRequest = $currentTime - $lastRequestTime;
    
    // If making requests too quickly (more than 5 per second), add delay
    if ($timeSinceLastRequest < 0.2 && $lastRequestTime > 0) {
        $delay = 0.2 - $timeSinceLastRequest;
        usleep($delay * 1000000); // Convert to microseconds
    }
    
    // Update tracking variables
    $requestCount++;
    $lastRequestTime = microtime(true);
    
    // Execute request
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // Handle rate limiting responses (429)
    if ($httpCode === 429) {
        $rateLimitHits++;
        
        // If we've been rate limited multiple times, increase backoff time
        $backoffSeconds = min(30, pow(2, $rateLimitHits));
        
        error_log("Rate limit hit for URL {$url}. Backing off for {$backoffSeconds} seconds.");
        
        // If we have retries left, wait and try again
        if ($retries > 0) {
            curl_close($ch);
            sleep($backoffSeconds);
            return fetchData($url, $userAgent, $retries - 1);
        }
    }
    
    // Handle other errors
    if (curl_errno($ch) || ($httpCode !== 200 && $httpCode !== 304)) {
        $error = curl_error($ch);
        curl_close($ch);
        
        error_log("API request failed for URL {$url}: HTTP {$httpCode}, Error: {$error}");
        
        // If we have retries left and this is a 5xx error (server error), try again
        if ($retries > 0 && $httpCode >= 500) {
            sleep(1); // Brief pause before retry
            return fetchData($url, $userAgent, $retries - 1);
        }
        
        return false;
    }
    
    curl_close($ch);
    return $result;
}

// Function to clean and format AFD text
function cleanAFDText($rawText) {
    // Remove special characters and format for display
    $cleanText = preg_replace('/&&/', '', $rawText);
    $cleanText = preg_replace('/\r\n/', "\n", $cleanText);
    
    // Split into paragraphs
    $paragraphs = preg_split('/\n\s*\n/', $cleanText);
    
    // Format as HTML paragraphs
    $formatted = '';
    foreach ($paragraphs as $paragraph) {
        $paragraph = preg_replace('/\n/', ' ', $paragraph);
        $formatted .= "<p>" . htmlspecialchars($paragraph) . "</p>\n";
    }
    
    return $formatted;
}

// List of Weather Forecast Offices to fetch AFDs for
$wfoList = [
    'MHX', // Newport/Morehead City, NC
    'RAH', // Raleigh, NC
    'ILM', // Wilmington, NC
    'AKQ'  // Wakefield, VA
];

// Process each WFO
foreach ($wfoList as $wfo) {
    error_log("Processing AFD for WFO: {$wfo}");
    
    // Construct URL for AFD product
    $afdUrl = "https://forecast.weather.gov/product.php?site={$wfo}&issuedby={$wfo}&product=AFD&format=txt&version=1&glossary=0";
    $response = fetchData($afdUrl, $userAgent);
    
    if (!$response) {
        error_log("Failed to fetch AFD for WFO: {$wfo}");
        continue;
    }
    
    // Extract AFD text
    if (preg_match('/<pre[^>]*>(.*?)<\/pre>/s', $response, $matches)) {
        $afdText = $matches[1];
        
        // Clean and format the text
        $formattedText = cleanAFDText($afdText);
        
        // Create cache data
        $cacheData = [
            'timestamp' => time(),
            'lastUpdated' => date('Y-m-d H:i:s'),
            'wfo' => $wfo,
            'content' => $formattedText,
            'raw' => $afdText
        ];
        
        // Save to WFO-specific cache file
        $wfoFile = $cacheDir . strtolower($wfo) . '_afd.json';
        file_put_contents($wfoFile, json_encode($cacheData));
        
        error_log("AFD cache updated for WFO: {$wfo}");
    } else {
        error_log("Could not extract AFD text for WFO: {$wfo}");
    }
    
    // Add a delay between requests
    sleep(1);
}

error_log("AFD caching completed");
?>