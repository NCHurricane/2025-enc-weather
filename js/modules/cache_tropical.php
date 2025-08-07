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
 * Unified RSS parser for all NHC products
 * Handles TWO Atlantic, TWO Spanish, TWD Atlantic, and Monthly Summary
 * @param string $xmlData The RSS XML data as a string
 * @param string $productType The type of product (twoat, twosat, twdat, twsat)
 * @return array Parsed data in a structured format
 */
function parseNhcRssXml($xmlData, $productType)
{
    if (empty($xmlData)) {
        writeLog("Empty XML data provided for $productType", 'error');
        return [];
    }

    try {
        // Parse the RSS XML
        $xml = new SimpleXMLElement($xmlData);
        
        // Extract from RSS structure
        $channel = $xml->channel;
        $item = $channel->item;
        
        // Get the CDATA content which contains the actual text
        $description = (string)$item->description;
        $pubDate = (string)$item->pubDate;
        $title = (string)$item->title;
        $link = (string)$item->link;
        
        // Clean up the description but PRESERVE line breaks for formatting functions
        $cleanText = html_entity_decode($description);
        
        // Convert HTML breaks to newlines FIRST
        $cleanText = str_replace(['<br />', '<br/>', '<br>', '<BR>', '<BR/>'], "\n", $cleanText);
        
        // NOW strip remaining HTML tags
        $cleanText = strip_tags($cleanText);
        
        // Clean up spaces but preserve newlines
        $cleanText = preg_replace('/[ \t]+/', ' ', $cleanText); // Multiple spaces to single space
        $cleanText = preg_replace('/\n[ \t]+/', "\n", $cleanText); // Remove spaces after newlines
        $cleanText = preg_replace('/[ \t]+\n/', "\n", $cleanText); // Remove spaces before newlines
        $cleanText = trim($cleanText);
        
        // Format based on product type - formatters now get proper line breaks
        $formattedText = '';
        $outlooks = [];
        
        switch ($productType) {
            case 'twoat': // Atlantic Tropical Weather Outlook (English)
                $formattedText = formatTwoText($cleanText);
                $outlooks = parseFormationChances($cleanText);
                break;
                
            case 'twosat': // Atlantic Tropical Weather Outlook (Spanish)
                $formattedText = formatTwoSpanishText($cleanText);
                $outlooks = parseFormationChancesSpanish($cleanText);
                break;
                
            case 'twdat': // Tropical Weather Discussion (Atlantic)
                $formattedText = formatTwdText($cleanText);
                break;
                
            case 'twsat': // Monthly Tropical Weather Summary
                $formattedText = formatSummaryText($cleanText);
                break;
                
            default:
                $formattedText = formatGenericText($cleanText);
        }
        
        // Extract issue time from the text content
        $issueTime = extractIssueTime($cleanText, $productType);
        
        // Extract product ID
        $productID = extractProductId($cleanText, $productType);
        
        return [
            'issueTime' => $issueTime,
            'productID' => $productID,
            'basin' => 'Atlantic',
            'title' => $title,
            'pubDate' => $pubDate,
            'link' => $link,
            'discussion' => $formattedText,
            'rawContent' => $cleanText,
            'outlooks' => $outlooks,
            'timestamp' => time()
        ];
        
    } catch (Exception $e) {
        writeLog("Error parsing $productType RSS XML: " . $e->getMessage(), 'error');
        return [];
    }
}

/**
 * Extract issue time from text content
 */
function extractIssueTime($text, $productType)
{
    $patterns = [
        '/(\d{1,2}:\d{2}\s*[AP]M\s*[A-Z]{3,4}.*?202\d)/i', // English format
        '/(\d{1,2}:\d{2}\s*[AP]M\s*[A-Z]{3,4}.*?202\d)/i', // Spanish format (similar)
        '/(\d{4}\s*UTC.*?202\d)/i' // UTC format
    ];
    
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $text, $matches)) {
            return trim($matches[1]);
        }
    }
    
    return '';
}

/**
 * Extract product ID from text content  
 */
function extractProductId($text, $productType)
{
    // Try to find product ID in text
    if (preg_match('/([A-Z]{4,6}\d{0,2})\s+[A-Z]{4}\s+\d{6}/i', $text, $matches)) {
        return $matches[1];
    }
    
    // Default based on product type
    $defaults = [
        'twoat' => 'TWOAT',
        'twosat' => 'TWOSAT', 
        'twdat' => 'TWDAT',
        'twsat' => 'TWSAT'
    ];
    
    return $defaults[$productType] ?? 'UNKNOWN';
}

/**
 * Format English TWO text
 */
function formatTwoText($text)
{
    // Remove unwanted technical headers at the very beginning
    $text = preg_replace('/^\d+\s*\n/', '', $text);
    $text = preg_replace('/^[A-Z]{4,6}\d{0,2}\s+[A-Z]{4}\s+\d{6}\s*\n/m', '', $text);
    $text = preg_replace('/^[A-Z]{4,6}\s*\n/', '', $text);
    
    // Remove the specific technical header pattern we see
    $text = preg_replace('/^247 ABNT20 KNHC \d+TWOAT\s*/i', '', $text);
    
    // Normalize multiple newlines to double newlines
    $text = preg_replace('/\n\s*\n\s*\n+/', "\n\n", $text);
    
    // Split into sections on natural breaks
    $sections = preg_split('/\n\s*\n(?=\S)/', $text);
    
    $formattedSections = [];
    
    foreach ($sections as $section) {
        $section = trim($section);
        
        if (empty($section) || strlen($section) < 10) {
            continue;
        }
        
        // Skip remaining technical headers
        if (preg_match('/^[A-Z]{3,6}\d{0,2}\s+[A-Z]{4}/', $section) || 
            preg_match('/^\d{3,4}\s*$/', $section) ||
            preg_match('/^247 ABNT20/i', $section)) {
            continue;
        }
        
        // Handle different content types
        if (preg_match('/^(Active Systems?|For the North Atlantic)/i', $section)) {
            $formattedSections[] = "<h4>" . htmlspecialchars($section) . "</h4>";
        } elseif (preg_match('/^\d+\.\s+(.+?):\s*/s', $section, $matches)) {
            // Numbered geographic sections like "1. Off the Southeastern United States:"
            $lines = explode("\n", $section);
            $title = array_shift($lines);
            $content = implode("\n", $lines);
            
            $formattedSections[] = "<h5>" . htmlspecialchars($title) . "</h5>";
            if (!empty(trim($content))) {
                // Split content into paragraphs
                $paragraphs = preg_split('/\n\s*\n/', $content);
                foreach ($paragraphs as $para) {
                    $para = trim($para);
                    if (!empty($para)) {
                        if (strpos($para, 'Formation chance') !== false) {
                            $formattedSections[] = "<p><strong>" . htmlspecialchars($para) . "</strong></p>";
                        } else {
                            $formattedSections[] = "<p>" . htmlspecialchars($para) . "</p>";
                        }
                    }
                }
            }
        } elseif (strpos($section, 'Formation chance') !== false) {
            $formattedSections[] = "<p><strong>" . htmlspecialchars($section) . "</strong></p>";
        } elseif (preg_match('/^\$?\$?Forecaster\s+\w+/i', $section)) {
            $formattedSections[] = "<p style='text-align: right; font-style: italic;'>" . htmlspecialchars($section) . "</p>";
        } else {
            // Regular content - split into paragraphs if it's long
            if (strlen($section) > 200 && strpos($section, "\n") !== false) {
                $paragraphs = preg_split('/\n\s*\n/', $section);
                foreach ($paragraphs as $para) {
                    $para = trim($para);
                    if (!empty($para)) {
                        $formattedSections[] = "<p>" . htmlspecialchars($para) . "</p>";
                    }
                }
            } else {
                $formattedSections[] = "<p>" . htmlspecialchars($section) . "</p>";
            }
        }
    }
    
    return implode("\n", $formattedSections);
}
/**
 * Format Spanish TWO text 
 */
/**
 * Improved Spanish TWO text formatting
 */
function formatTwoSpanishText($text)
{
    // Remove unwanted technical headers at the very beginning (same patterns work)
    $text = preg_replace('/^\d+\s*\n/', '', $text);
    $text = preg_replace('/^[A-Z]{4,6}\d{0,2}\s+[A-Z]{4}\s+\d{6}\s*\n/m', '', $text);
    $text = preg_replace('/^[A-Z]{4,6}\s*\n/', '', $text);
    
    // Remove Spanish-specific technical headers
    $text = preg_replace('/^247 ABNT20 KNHC \d+TWOSAT\s*/i', '', $text);
    
    // Normalize multiple newlines to double newlines
    $text = preg_replace('/\n\s*\n\s*\n+/', "\n\n", $text);
    
    // Split into sections on natural breaks
    $sections = preg_split('/\n\s*\n(?=\S)/', $text);
    
    $formattedSections = [];
    
    foreach ($sections as $section) {
        $section = trim($section);
        
        if (empty($section) || strlen($section) < 10) {
            continue;
        }
        
        // Skip remaining technical headers
        if (preg_match('/^[A-Z]{3,6}\d{0,2}\s+[A-Z]{4}/', $section) || 
            preg_match('/^\d{3,4}\s*$/', $section) ||
            preg_match('/^247 ABNT20/i', $section)) {
            continue;
        }
        
        // Handle different content types - SPANISH SPECIFIC
        if (preg_match('/^(Sistemas Activos?|Sistemas Tropicales Activos?|Para el Atlántico Norte|En el Atlántico Norte)/i', $section)) {
            $formattedSections[] = "<h4>" . htmlspecialchars($section) . "</h4>";
        } elseif (preg_match('/^\d+\.\s+(.+?):\s*/s', $section, $matches)) {
            // Numbered geographic sections like "1. Al este de las Antillas Menores:"
            $lines = explode("\n", $section);
            $title = array_shift($lines);
            $content = implode("\n", $lines);
            
            $formattedSections[] = "<h5>" . htmlspecialchars($title) . "</h5>";
            if (!empty(trim($content))) {
                // Split content into paragraphs
                $paragraphs = preg_split('/\n\s*\n/', $content);
                foreach ($paragraphs as $para) {
                    $para = trim($para);
                    if (!empty($para)) {
                        if (strpos($para, 'probabilidad de formación') !== false || 
                            strpos($para, 'Probabilidad de formación') !== false ||
                            strpos($para, 'por ciento') !== false) {
                            $formattedSections[] = "<p><strong>" . htmlspecialchars($para) . "</strong></p>";
                        } else {
                            $formattedSections[] = "<p>" . htmlspecialchars($para) . "</p>";
                        }
                    }
                }
            }
        } elseif (strpos($section, 'probabilidad de formación') !== false || 
                  strpos($section, 'Probabilidad de formación') !== false ||
                  strpos($section, 'por ciento') !== false) {
            // Spanish formation chance lines
            $formattedSections[] = "<p><strong>" . htmlspecialchars($section) . "</strong></p>";
        } elseif (preg_match('/^\$?\$?(Pronosticador|Meteorólogo)\s+\w+/i', $section)) {
            // Spanish forecaster signatures
            $formattedSections[] = "<p style='text-align: right; font-style: italic;'>" . htmlspecialchars($section) . "</p>";
        } elseif (preg_match('/^(En el|Al|Cerca de|Sobre el|Frente a)/i', $section)) {
            // Geographic headers in Spanish
            $formattedSections[] = "<h5>" . htmlspecialchars($section) . "</h5>";
        } else {
            // Regular content - split into paragraphs if it's long
            if (strlen($section) > 200 && strpos($section, "\n") !== false) {
                $paragraphs = preg_split('/\n\s*\n/', $section);
                foreach ($paragraphs as $para) {
                    $para = trim($para);
                    if (!empty($para)) {
                        $formattedSections[] = "<p>" . htmlspecialchars($para) . "</p>";
                    }
                }
            } else {
                $formattedSections[] = "<p>" . htmlspecialchars($section) . "</p>";
            }
        }
    }
    
    return implode("\n", $formattedSections);
}

/**
 * Format TWD discussion text
 */
function formatTwdText($text)
{
    // Remove unwanted codes
    $text = preg_replace('/^\d+\s*<br\s*\/?>\s*/i', '', $text);
    $text = preg_replace('/^[A-Z]{4,6}\d{0,2}\s+[A-Z]{4}\s+\d{6}\s*<br\s*\/?>\s*/i', '', $text);
    
    // Replace HTML breaks
    $text = str_replace(['<br />', '<br/>', '<br>'], "\n", $text);
    
    // Split on $$ separators and paragraph breaks
    $sections = preg_split('/\$\$|\n\s*\n/', $text);
    $formattedSections = [];
    
    foreach ($sections as $section) {
        $section = trim($section);
        
        if (empty($section) || strlen($section) < 10) {
            continue;
        }
        
        // Skip technical headers
        if (preg_match('/^[A-Z]{3,6}\d{0,2}\s+[A-Z]{4}/', $section)) {
            continue;
        }
        
        // Check if it's a header (short, all caps, no numbers)
        if (strlen($section) < 100 && strtoupper($section) === $section && 
            !preg_match('/\d{2,}/', $section) && !strpos($section, '.')) {
            $formattedSections[] = "<h4>" . htmlspecialchars($section) . "</h4>";
        } else {
            $formattedSections[] = "<p>" . htmlspecialchars($section) . "</p>";
        }
    }
    
    return implode("\n", $formattedSections);
}

/**
 * Format summary text
 */
function formatSummaryText($text)
{
    return formatGenericText($text);
}

/**
 * Generic text formatter
 */
function formatGenericText($text)
{
    // Remove unwanted header codes at the beginning
    $text = preg_replace('/^\d+\s*<br\s*\/?>\s*/i', '', $text);
    $text = preg_replace('/^[A-Z]{4,6}\d{0,2}\s+[A-Z]{4}\s+\d{6}\s*<br\s*\/?>\s*/i', '', $text);
    $text = preg_replace('/^[A-Z]{4,6}\s*<br\s*\/?>\s*/i', '', $text);
    
    // Replace HTML line breaks with newlines first
    $text = str_replace(['<br />', '<br/>', '<br>', '<BR>', '<BR/>'], "\n", $text);
    
    // Clean up extra whitespace but preserve intentional line breaks
    $text = preg_replace('/[ \t]+/', ' ', $text); // Multiple spaces/tabs to single space
    $text = preg_replace('/\n\s*\n\s*\n+/', "\n\n", $text); // Multiple newlines to double newline
    
    // Split into paragraphs on double newlines or specific patterns
    $paragraphs = preg_split('/\n\s*\n|\n(?=\d+\.\s)|\n(?=[A-Z][^:]*:)/', $text);
    
    $formattedParagraphs = [];
    
    foreach ($paragraphs as $paragraph) {
        $paragraph = trim($paragraph);
        
        // Skip very short or empty paragraphs
        if (empty($paragraph) || strlen($paragraph) < 5) {
            continue;
        }
        
        // Skip technical headers we don't want
        if (preg_match('/^[A-Z]{3,6}\d{0,2}\s+[A-Z]{4}\s+\d{6}/', $paragraph)) {
            continue;
        }
        
        // Skip numeric codes at start
        if (preg_match('/^\d{3,4}\s*$/', $paragraph)) {
            continue;
        }
        
        // Handle special sections
        if (preg_match('/^\d+\.\s+(.+)/', $paragraph)) {
            // Numbered sections (like "1. Off the Southeastern United States:")
            $formattedParagraphs[] = "<p><strong>" . htmlspecialchars($paragraph) . "</strong></p>";
        } elseif (preg_match('/^[A-Z][^:]*:\s*$/', $paragraph)) {
            // Section headers (like "Active Systems:")
            $formattedParagraphs[] = "<h4>" . htmlspecialchars($paragraph) . "</h4>";
        } elseif (strpos($paragraph, 'Formation chance') !== false) {
            // Formation chance lines - make them stand out
            $formattedParagraphs[] = "<p><em>" . htmlspecialchars($paragraph) . "</em></p>";
        } elseif (preg_match('/Forecaster\s+\w+\s*$/', $paragraph)) {
            // Forecaster signature
            $formattedParagraphs[] = "<p style='text-align: right; font-style: italic;'>" . htmlspecialchars($paragraph) . "</p>";
        } else {
            // Regular paragraph
            $formattedParagraphs[] = "<p>" . htmlspecialchars($paragraph) . "</p>";
        }
    }
    
    return implode("\n", $formattedParagraphs);
}

/**
 * Parse formation chances from English text
 */
function parseFormationChances($text)
{
    $outlooks = [];
    $areas = [];
    
    // Look for formation chance patterns
    $sections = preg_split('/(?=\w+[^:]*:)/', $text);
    
    foreach ($sections as $section) {
        if (stripos($section, 'Formation chance') !== false) {
            $area = [
                'text' => trim($section),
                'formation_chance' => []
            ];
            
            // Extract 48-hour chance
            if (preg_match('/Formation chance through 48 hours\.\.\.[\w\s]*\.\.\.(\d+)\s*percent/i', $section, $matches)) {
                $area['formation_chance']['48hour'] = intval($matches[1]);
            }
            
            // Extract 7-day chance  
            if (preg_match('/Formation chance through 7 days\.\.\.[\w\s]*\.\.\.(\d+)\s*percent/i', $section, $matches)) {
                $area['formation_chance']['5day'] = intval($matches[1]);
            }
            
            if (!empty($area['formation_chance'])) {
                $areas[] = $area;
            }
        }
    }
    
    if (!empty($areas)) {
        $outlooks[] = [
            'timeframe' => '7-day outlook',
            'text' => $text,
            'areas' => $areas
        ];
    }
    
    return $outlooks;
}

/**
 * Parse formation chances from Spanish text
 */
function parseFormationChancesSpanish($text)
{
    $outlooks = [];
    $areas = [];
    
    // Spanish patterns for formation chances - improved regex
    $sections = preg_split('/\n\s*\n|\n(?=\d+\.\s)|\n(?=\*\s*Probabilidad)/', $text);
    
    foreach ($sections as $section) {
        if (stripos($section, 'probabilidad') !== false || 
            stripos($section, 'formaci') !== false ||
            stripos($section, 'por ciento') !== false) {
            
            $area = [
                'text' => trim($section),
                'formation_chance' => []
            ];
            
            // Extract Spanish formation chance patterns - more flexible
            // Pattern: "48 horas...bajo...cerca de 0 por ciento"
            if (preg_match('/48\s*horas[^\.]*\.{2,}[^\.]*\.{2,}[^0-9]*(\d+)\s*por\s*ciento/i', $section, $matches)) {
                $area['formation_chance']['48hour'] = intval($matches[1]);
            }
            
            // Pattern: "7 días...bajo...30 por ciento"
            if (preg_match('/7\s*d[íi]as[^\.]*\.{2,}[^\.]*\.{2,}[^0-9]*(\d+)\s*por\s*ciento/i', $section, $matches)) {
                $area['formation_chance']['5day'] = intval($matches[1]);
            }
            
            // Alternative patterns for different Spanish formats
            if (preg_match('/próximas\s*48\s*horas[^0-9]*(\d+)\s*por\s*ciento/i', $section, $matches)) {
                $area['formation_chance']['48hour'] = intval($matches[1]);
            }
            
            if (preg_match('/próximos\s*7\s*días[^0-9]*(\d+)\s*por\s*ciento/i', $section, $matches)) {
                $area['formation_chance']['5day'] = intval($matches[1]);
            }
            
            if (!empty($area['formation_chance'])) {
                $areas[] = $area;
            }
        }
    }
    
    if (!empty($areas)) {
        $outlooks[] = [
            'timeframe' => 'perspectiva de 7 días',
            'text' => $text,
            'areas' => $areas
        ];
    }
    
    return $outlooks;
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
 * Updated main processing function
 */
function processXmlProducts()
{
    global $xmlEndpoints, $cacheFiles, $cacheDir, $userAgent;

    foreach ($xmlEndpoints as $productKey => $url) {
        $cacheFile = $cacheDir . $cacheFiles[$productKey];
        $maxAge = ($productKey === 'twsat') ? 86400 : 3600;

        if (isCacheStale($cacheFile, $maxAge)) {
            writeLog("Cache is stale for $productKey, fetching new data", 'info');

            $xmlData = fetchData($url, $userAgent);
            if ($xmlData === false) {
                writeLog("Failed to fetch data for $productKey", 'error');
                continue;
            }

            // Use unified RSS parser for all products
            $parsedData = parseNhcRssXml($xmlData, $productKey);

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