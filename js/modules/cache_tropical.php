<?php
// cache_tropical.php - Fetches and caches NHC tropical data from XML sources

// Configuration
$cacheDir = 'cache/';
$logDir = 'logs/';
$userAgent = "NCHurricane.com Weather App/1.0 (info@nchurricane.com)";

// NHC XML Endpoints
$xmlEndpoints = [
    'twoat' => 'https://www.nhc.noaa.gov/xml/TWOAT.xml',      // Tropical Weather Outlook (Atlantic)
    'twosat' => 'https://www.nhc.noaa.gov/xml/TWOSAT.xml',    // Tropical Weather Outlook in Spanish
    'twdat' => 'https://www.nhc.noaa.gov/xml/TWDAT.xml',      // Tropical Weather Discussion (Atlantic)
    'twsat' => 'https://www.nhc.noaa.gov/xml/TWSAT.xml'       // Monthly Tropical Weather Summary
];

// Cache filenames
$cacheFiles = [
    'twoat' => 'tropical_two_at.json',       // TWO Atlantic
    'twosat' => 'tropical_two_sat.json',     // TWO Spanish
    'twdat' => 'tropical_disc_at.json',      // Tropical Discussion
    'twsat' => 'tropical_summary_at.json'    // Monthly Summary
];

// Ensure directories exist
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
    error_log("Created cache directory: $cacheDir");
}

if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
    error_log("Created log directory: $logDir");
}

// Configure logging
$logFile = $logDir . 'cron_tropical.log';
$logLevel = 'info'; // 'debug', 'info', 'warning', 'error'

/**
 * Custom logging function
 * @param string $message Log message
 * @param string $level Log level (debug, info, warning, error)
 */
function writeLog($message, $level = 'info')
{
    global $logFile, $logLevel;

    $levelsPriority = [
        'debug' => 0,
        'info' => 1,
        'warning' => 2,
        'error' => 3
    ];

    // Only log if level is high enough
    if ($levelsPriority[$level] >= $levelsPriority[$logLevel]) {
        $date = date('Y-m-d H:i:s');
        $levelUpper = strtoupper($level);
        $logMessage = "[$date] [$levelUpper] $message" . PHP_EOL;

        file_put_contents($logFile, $logMessage, FILE_APPEND);
    }
}

/**
 * Enhanced function to fetch data with rate limit awareness
 * @param string $url API URL
 * @param string $userAgent User agent string
 * @param int $retries Number of retries on failure
 * @return string|false Response body or false on failure
 */
function fetchData($url, $userAgent, $retries = 3)
{
    writeLog("Fetching URL: $url", 'debug');

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "User-Agent: " . $userAgent,
        "Accept: text/xml,application/xml"
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
        writeLog("Rate limiting: Adding delay of {$delay}s", 'debug');
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

        writeLog("Rate limit hit for URL {$url}. Backing off for {$backoffSeconds} seconds.", 'warning');

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

        writeLog("API request failed for URL {$url}: HTTP {$httpCode}, Error: {$error}", 'error');

        // If we have retries left and this is a 5xx error (server error), try again
        if ($retries > 0 && $httpCode >= 500) {
            sleep(1); // Brief pause before retry
            return fetchData($url, $userAgent, $retries - 1);
        }

        return false;
    }

    curl_close($ch);
    writeLog("Successfully fetched data from $url", 'debug');
    return $result;
}

/**
 * Parse TWO (Tropical Weather Outlook) XML data
 * @param string $xmlData The XML data as a string
 * @return array Parsed data in a structured format
 */
function parseTwoXml($xmlData)
{
    if (empty($xmlData)) {
        writeLog("Empty XML data provided to parseTwoXml", 'error');
        return [];
    }

    try {
        $xml = new SimpleXMLElement($xmlData);

        // Extract header information
        $issueTime = (string)$xml->issueTime;
        $productID = (string)$xml->productID;
        $basin = (string)$xml->basin;

        // Extract outlook sections (usually 2: 48-hour and 5-day)
        $outlooks = [];
        foreach ($xml->outlooksection as $section) {
            $outlook = [
                'timeframe' => (string)$section->timeframe,
                'text' => (string)$section->text,
                'areas' => []
            ];

            // Extract disturbance areas
            if (isset($section->areatype)) {
                foreach ($section->areatype as $area) {
                    $areaInfo = [
                        'id' => (string)$area->id,
                        'location' => (string)$area->location,
                        'text' => (string)$area->text,
                        'formation_chance' => [
                            '48hour' => (string)$area->{"48hourprob"},
                            '5day' => (string)$area->{"5dayprob"}
                        ]
                    ];

                    $outlook['areas'][] = $areaInfo;
                }
            }

            $outlooks[] = $outlook;
        }

        return [
            'issueTime' => $issueTime,
            'productID' => $productID,
            'basin' => $basin,
            'outlooks' => $outlooks,
            'timestamp' => time()
        ];
    } catch (Exception $e) {
        writeLog("Error parsing TWO XML: " . $e->getMessage(), 'error');
        return [];
    }
}

/**
 * Parse Tropical Weather Discussion XML data
 * @param string $xmlData The XML data as a string
 * @return array Parsed data in a structured format
 */
function parseTwdXml($xmlData)
{
    if (empty($xmlData)) {
        writeLog("Empty XML data provided to parseTwdXml", 'error');
        return [];
    }

    try {
        $xml = new SimpleXMLElement($xmlData);

        // Extract basic info
        $issueTime = (string)$xml->issueTime;
        $productID = (string)$xml->productID;

        // Extract discussion sections
        $discussion = (string)$xml->discussion;

        // Format the text content for better readability
        $formattedText = formatNhcText($discussion);

        return [
            'issueTime' => $issueTime,
            'productID' => $productID,
            'discussion' => $formattedText,
            'timestamp' => time()
        ];
    } catch (Exception $e) {
        writeLog("Error parsing TWD XML: " . $e->getMessage(), 'error');
        return [];
    }
}

/**
 * Format NHC text content for better display
 * @param string $text Raw text content
 * @return string Formatted text
 */
function formatNhcText($text)
{
    // Replace multiple consecutive spaces with a single space
    $text = preg_replace('/\s+/', ' ', $text);

    // Replace $$ with paragraph breaks
    $text = str_replace('$$', "\n\n", $text);

    // Clean up extra whitespace around newlines
    $text = preg_replace('/\s*\n\s*/', "\n", $text);

    // Add paragraph tags for HTML formatting
    $paragraphs = explode("\n\n", $text);
    $formattedParagraphs = [];

    foreach ($paragraphs as $paragraph) {
        if (trim($paragraph) !== '') {
            $formattedParagraphs[] = "<p>" . htmlspecialchars(trim($paragraph)) . "</p>";
        }
    }

    return implode("\n", $formattedParagraphs);
}

/**
 * Check if cache is stale
 * @param string $cacheFile Path to cache file
 * @param int $maxAge Maximum age in seconds
 * @return bool True if cache is stale or doesn't exist
 */
function isCacheStale($cacheFile, $maxAge = 3600)
{
    if (!file_exists($cacheFile)) {
        return true;
    }

    $fileTime = filemtime($cacheFile);
    $currentTime = time();

    return ($currentTime - $fileTime) > $maxAge;
}

/**
 * Process each XML product and update cache
 */
function processXmlProducts()
{
    global $xmlEndpoints, $cacheFiles, $cacheDir, $userAgent;

    foreach ($xmlEndpoints as $productKey => $url) {
        $cacheFile = $cacheDir . $cacheFiles[$productKey];
        $maxAge = ($productKey === 'twsat') ? 86400 : 3600; // Monthly summary cached longer

        if (isCacheStale($cacheFile, $maxAge)) {
            writeLog("Cache is stale for $productKey, fetching new data", 'info');

            $xmlData = fetchData($url, $userAgent);
            if ($xmlData === false) {
                writeLog("Failed to fetch data for $productKey", 'error');
                continue;
            }

            // Parse based on product type
            $parsedData = [];
            if ($productKey === 'twoat' || $productKey === 'twosat') {
                $parsedData = parseTwoXml($xmlData);
            } elseif ($productKey === 'twdat' || $productKey === 'twsat') {
                $parsedData = parseTwdXml($xmlData);
            }

            if (empty($parsedData)) {
                writeLog("No parsed data for $productKey", 'warning');
                continue;
            }

            // Add metadata
            $parsedData['source'] = $url;
            $parsedData['cacheTime'] = time();

            // Save to cache
            $jsonData = json_encode($parsedData, JSON_PRETTY_PRINT);
            file_put_contents($cacheFile, $jsonData);

            writeLog("Updated cache for $productKey", 'info');
        } else {
            writeLog("Cache is still fresh for $productKey", 'debug');
        }
    }
}

// Run the main processing logic
writeLog("Starting tropical data cache update", 'info');
processXmlProducts();
writeLog("Completed tropical data cache update", 'info');
