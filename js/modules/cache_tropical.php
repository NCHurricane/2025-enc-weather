<?php
// cache_tropical.php - Fetches and caches NHC tropical data from XML sources

// Add debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
file_put_contents('logs/debug_tropical.log', 'Script started at ' . date('Y-m-d H:i:s') . "\n", FILE_APPEND);

// Configuration
$cacheDir = 'cache/';
$logDir = 'logs/';
$userAgent = "NCHurricane.com Weather App/1.0 (info@nchurricane.com)";

// Hurricane season dates - to match configuration in siteConfig.js
$hurricaneSeasonStart = "05-15"; // May 15
$hurricaneSeasonEnd = "11-30";   // November 30

// Log directory and permissions
file_put_contents('logs/debug_tropical.log', "Cache dir: $cacheDir\nLog dir: $logDir\n", FILE_APPEND);
file_put_contents('logs/debug_tropical.log', "Script executed by user: " . get_current_user() . "\n", FILE_APPEND);
file_put_contents('logs/debug_tropical.log', "Script path: " . __FILE__ . "\n", FILE_APPEND);

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

// Ensure directories exist with proper permissions
if (!is_dir($cacheDir)) {
    $oldUmask = umask(0);
    $mkdir_result = mkdir($cacheDir, 0777, true);
    umask($oldUmask);
    file_put_contents('logs/debug_tropical.log', "Created cache directory: $cacheDir (result: " .
        ($mkdir_result ? "success" : "failed") . ")\n", FILE_APPEND);
}

if (!is_dir($logDir)) {
    $oldUmask = umask(0);
    $mkdir_result = mkdir($logDir, 0777, true);
    umask($oldUmask);
    file_put_contents('logs/debug_tropical.log', "Created log directory: $logDir (result: " .
        ($mkdir_result ? "success" : "failed") . ")\n", FILE_APPEND);
}

// Manually check and set directory permissions
if (is_dir($cacheDir)) {
    chmod($cacheDir, 0777);
    file_put_contents('logs/debug_tropical.log', "Set cache directory permissions to 0777\n", FILE_APPEND);
}

if (is_dir($logDir)) {
    chmod($logDir, 0777);
    file_put_contents('logs/debug_tropical.log', "Set log directory permissions to 0777\n", FILE_APPEND);
}

// Configure logging
$logFile = $logDir . 'cron_tropical.log';
$logLevel = 'info'; // 'debug', 'info', 'warning', 'error'

/**
 * Check if the current date is within hurricane season
 * Replicates the JavaScript isDateInHurricaneSeason function
 * 
 * @param DateTime|null $date Optional date to check (defaults to current date)
 * @return bool Whether the date is in hurricane season
 */
function isDateInHurricaneSeason($date = null, $seasonStart = "05-15", $seasonEnd = "11-30")
{
    // Use provided date or current date
    if ($date === null) {
        $date = new DateTime();
    }

    // Get current year
    $year = $date->format('Y');

    // Define season dates
    $seasonStartDate = DateTime::createFromFormat('Y-m-d', "$year-$seasonStart");
    $seasonEndDate = DateTime::createFromFormat('Y-m-d', "$year-$seasonEnd");

    // Check if current date is within season
    return ($date >= $seasonStartDate && $date <= $seasonEndDate);
}

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
    file_put_contents('logs/debug_tropical.log', "Fetching URL: $url\n", FILE_APPEND);

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
        usleep((int)($delay * 1000000)); // Convert to microseconds
    }

    // Update tracking variables
    $requestCount++;
    $lastRequestTime = microtime(true);

    // Execute request
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    // Log the result
    file_put_contents('logs/debug_tropical.log', "HTTP Response Code: $httpCode\n", FILE_APPEND);
    if ($result === false) {
        file_put_contents('logs/debug_tropical.log', "Curl error: " . curl_error($ch) . "\n", FILE_APPEND);
    } else {
        file_put_contents('logs/debug_tropical.log', "Response length: " . strlen($result) . " bytes\n", FILE_APPEND);
    }

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
    file_put_contents('logs/debug_tropical.log', "Successfully fetched data from $url\n", FILE_APPEND);
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
        file_put_contents('logs/debug_tropical.log', "Empty XML data provided to parseTwoXml\n", FILE_APPEND);
        return [];
    }

    try {
        // Remove non-XML content before the XML declaration
        $xmlStart = strpos($xmlData, '<?xml');
        if ($xmlStart !== false && $xmlStart > 0) {
            $xmlData = substr($xmlData, $xmlStart);
            file_put_contents('logs/debug_tropical.log', "Cleaned XML data, removed " . $xmlStart . " bytes\n", FILE_APPEND);
        }

        $xml = new SimpleXMLElement($xmlData);
        $parsedData = [];

        // Check if we have an RSS format (new XML structure)
        if (isset($xml->channel) && isset($xml->channel->item)) {
            file_put_contents('logs/debug_tropical.log', "Detected RSS format XML\n", FILE_APPEND);

            // Extract header information
            $issueTime = (string)$xml->channel->pubDate;
            $productID = "TWO" . (strpos((string)$xml->channel->title, "Spanish") !== false ? "S" : "");

            // Get the description content from CDATA
            $rawContent = "";
            foreach ($xml->channel->item as $item) {
                if (isset($item->description)) {
                    $rawContent = (string)$item->description;
                    break;  // Just use the first item
                }
            }

            // Clean up CDATA content
            $rawContent = str_replace('<![CDATA[', '', $rawContent);
            $rawContent = str_replace(']]>', '', $rawContent);

            // Format the raw content
            $discussion = formatNhcText($rawContent);

            $parsedData = [
                'issueTime' => $issueTime,
                'productID' => $productID,
                'discussion' => $discussion,
                'rawContent' => $rawContent,
                'timestamp' => time()
            ];

            return $parsedData;
        }
        // Original format parsing (legacy format)
        else {
            $issueTime = (string)$xml->issueTime;
            $productID = (string)$xml->productID;
            $rawContent = '';

            // Try to extract the raw text content
            if (isset($xml->product)) {
                $rawContent = (string)$xml->product;
            }

            // Format the raw content
            $discussion = formatNhcText($rawContent);

            return [
                'issueTime' => $issueTime,
                'productID' => $productID,
                'discussion' => $discussion,
                'rawContent' => $rawContent,
                'timestamp' => time()
            ];
        }
    } catch (Exception $e) {
        writeLog("Error parsing TWO XML: " . $e->getMessage(), 'error');
        file_put_contents('logs/debug_tropical.log', "XML parsing error: " . $e->getMessage() . "\n", FILE_APPEND);
        // Save problematic XML to debug file
        file_put_contents('logs/problem_xml.txt', $xmlData);
        file_put_contents('logs/debug_tropical.log', "Saved problematic XML to logs/problem_xml.txt\n", FILE_APPEND);
        return [];
    }
}

/**
 * Parse outlook content from NHC text format
 * @param string $textContent Raw text content from NHC
 * @param bool $isSpanish Whether the content is in Spanish
 * @return array Structured array of outlook information
 */
function parseOutlookContentFromText($textContent, $isSpanish = false)
{
    // Initialize return array
    $result = [
        'active_systems' => [],
        'areas' => [],
        'formation_chances' => [],
        'outlookText' => '',
        'season_info' => ''
    ];

    file_put_contents('logs/debug_tropical.log', "Parsing TWO text content, length: " . strlen($textContent) . " bytes\n", FILE_APPEND);
    file_put_contents('logs/debug_tropical.log', "Is Spanish: " . ($isSpanish ? "Yes" : "No") . "\n", FILE_APPEND);

    // Get the main outlook text
    if (preg_match('/For the (North Atlantic|Atlántico Norte).*?:(.*?)(?:Active Systems|Sistemas Activos|\$\$|$)/si', $textContent, $matches)) {
        $result['outlookText'] = trim($matches[2]);
        file_put_contents('logs/debug_tropical.log', "Found main outlook text\n", FILE_APPEND);
    }

    // Check for formation probability information
    $formationPatterns = $isSpanish ?
        [
            '48h' => '/(?:48 Horas|48 horas).*?(\d+)%/si',
            '5d' => '/(?:5 [Dd]ías?).*?(\d+|undefined)%/si'
        ] :
        [
            '48h' => '/(?:48-Hour|48 Hour|48-hour|48 hour).*?(\d+)%/si',
            '5d' => '/(?:5-Day|5 Day|5-day|5 day).*?(\d+|undefined)%/si'
        ];

    $formationChances = [];
    if (preg_match($formationPatterns['48h'], $textContent, $matches)) {
        $formationChances['48hour'] = $matches[1];
        file_put_contents('logs/debug_tropical.log', "Found 48-hour formation chance: {$matches[1]}%\n", FILE_APPEND);
    } else {
        // Check for "Formation chance" followed by line with percentage
        if (preg_match('/(?:Formation [Cc]hance|Probabilidad de Formación).*?(?:\n|<br>)(.*?)(\d+)%/si', $textContent, $matches)) {
            $formationChances['48hour'] = $matches[2];
            file_put_contents('logs/debug_tropical.log', "Found alternate 48-hour formation chance: {$matches[2]}%\n", FILE_APPEND);
        }
    }

    if (preg_match($formationPatterns['5d'], $textContent, $matches)) {
        $formationChances['5day'] = $matches[1];
        file_put_contents('logs/debug_tropical.log', "Found 5-day formation chance: {$matches[1]}%\n", FILE_APPEND);
    }

    if (!empty($formationChances)) {
        $result['formation_chances'] = $formationChances;
    }

    // Check for "not expected" text to set formation chances to 0%
    if (
        stripos($textContent, 'not expected') !== false ||
        stripos($textContent, 'no se espera') !== false
    ) {
        file_put_contents('logs/debug_tropical.log', "Found 'not expected' text, setting formation chances to 0%\n", FILE_APPEND);
        if (empty($result['formation_chances']['48hour'])) {
            $result['formation_chances']['48hour'] = '0';
        }
        if (empty($result['formation_chances']['5day'])) {
            $result['formation_chances']['5day'] = '0';
        }
    }

    // Check for season information (typically included in off-season TWOs)
    if (preg_match('/(?:Routine issuance|La emisión rutinaria).*?\.(.*?)(?:\$\$|$)/s', $textContent, $matches)) {
        $result['season_info'] = trim($matches[1]);
        file_put_contents('logs/debug_tropical.log', "Found season information\n", FILE_APPEND);
    }

    // Check for active systems
    if (preg_match('/(?:Active Systems|Sistemas Activos):(.*?)(?:For the|Para el|\$\$|$)/si', $textContent, $matches)) {
        $activeSystemsText = trim($matches[1]);
        // Parse out each system
        if (preg_match_all('/(?:issuing advisories on|emitiendo avisos sobre) (.*?)(?:,|\.|$)/si', $activeSystemsText, $sysMatches)) {
            foreach ($sysMatches[1] as $system) {
                $result['active_systems'][] = trim($system);
            }
            file_put_contents('logs/debug_tropical.log', "Found " . count($result['active_systems']) . " active systems\n", FILE_APPEND);
        }
    }

    // Find disturbance areas by looking for numbered identifiers or regional identifiers
    $areaPattern = '/(?:(\d+)\. |Eastern|Central|Western|Northwestern|Southwestern|Northern|Southern|Gulf of Mexico|Este|Centro|Oeste|Noroeste|Suroeste|Norte|Sur|Golfo de México)[^\n]*?:?\n(.*?)(?=(?:\d+\. |Eastern|Central|Western|Northwestern|Southwestern|Northern|Southern|Gulf of Mexico|Este|Centro|Oeste|Noroeste|Suroeste|Norte|Sur|Golfo de México)|$)/si';

    if (preg_match_all($areaPattern, $textContent, $matches, PREG_SET_ORDER)) {
        file_put_contents('logs/debug_tropical.log', "Found " . count($matches) . " disturbance areas\n", FILE_APPEND);

        foreach ($matches as $match) {
            $location = '';
            $text = '';

            // Check if we have a numbered identifier or a regional identifier
            if (!empty($match[1])) {
                // Numbered identifier
                $location = $isSpanish ? "Área {$match[1]}" : "Area {$match[1]}";
                $text = trim($match[2]);
            } else {
                // Regional identifier - extract it from the match
                $regionPattern = $isSpanish ?
                    '/(Este|Centro|Oeste|Noroeste|Suroeste|Norte|Sur|Golfo de México)[^\n]*?:?/si' :
                    '/(Eastern|Central|Western|Northwestern|Southwestern|Northern|Southern|Gulf of Mexico)[^\n]*?:?/si';

                if (preg_match($regionPattern, $match[0], $locMatch)) {
                    $location = trim($locMatch[0]);
                    // Remove the location from the text
                    $text = trim(str_replace($locMatch[0], '', $match[0]));
                } else {
                    // Fallback if no clear identifier
                    $location = $isSpanish ? "Área Sin Nombre" : "Unnamed Area";
                    $text = trim($match[0]);
                }
            }

            // Extract formation chances
            $formation48 = 0;
            $formation7day = 0;

            if (preg_match('/Formation chance through (?:48 hours|48 horas).*?(\d+)\s*percent/si', $text, $chance48)) {
                $formation48 = (int)$chance48[1];
            } elseif (preg_match('/Probabilidad de formación durante 48 horas.*?(\d+)\s*por ciento/si', $text, $chance48)) {
                $formation48 = (int)$chance48[1];
            }

            if (preg_match('/Formation chance through (?:5|7) days.*?(\d+)\s*percent/si', $text, $chance7)) {
                $formation7day = (int)$chance7[1];
            } elseif (preg_match('/Probabilidad de formación durante (?:5|7) días.*?(\d+)\s*por ciento/si', $text, $chance7)) {
                $formation7day = (int)$chance7[1];
            }

            // Check if this area has an ID (e.g., AL91, etc.)
            $areaId = '';
            if (preg_match('/\(([A-Z]{2}\d{2})\)/si', $text, $idMatch)) {
                $areaId = $idMatch[1];
            }

            // Add this area to our result
            $area = [
                'id' => $areaId,
                'location' => $location,
                'text' => $text,
                'formation_chance' => [
                    '48hour' => $formation48,
                    '7day' => $formation7day
                ]
            ];

            $result['areas'][] = $area;
        }
    } else if (
        stripos($textContent, 'tropical cyclone formation is not expected') !== false ||
        stripos($textContent, 'no se espera la formación de ciclones tropicales') !== false
    ) {
        // No active disturbances
        file_put_contents('logs/debug_tropical.log', "No active disturbances found\n", FILE_APPEND);

        // Add a generic area for "no formation expected"
        $result['areas'][] = [
            'id' => '',
            'location' => $isSpanish ? 'Cuenca Atlántica' : 'Atlantic Basin',
            'text' => $isSpanish ?
                'No se espera la formación de ciclones tropicales durante los próximos 7 días.' :
                'Tropical cyclone formation is not expected during the next 7 days.',
            'formation_chance' => [
                '48hour' => 0,
                '7day' => 0
            ]
        ];
    } else {
        file_put_contents('logs/debug_tropical.log', "Could not parse areas from text content\n", FILE_APPEND);
    }

    return $result;
}

/**
 * Parse Tropical Weather Discussion XML data or Monthly Summary
 * @param string $xmlData The XML data as a string
 * @param string $type Type of data to parse (twdat or twsat)
 * @return array Parsed data in a structured format
 */
function parseTwdXml($xmlData, $type = 'twdat')
{
    if (empty($xmlData)) {
        writeLog("Empty XML data provided to parseTwdXml", 'error');
        file_put_contents('logs/debug_tropical.log', "Empty XML data provided to parseTwdXml\n", FILE_APPEND);
        return [];
    }

    try {
        // Remove non-XML content before the XML declaration
        $xmlStart = strpos($xmlData, '<?xml');
        if ($xmlStart !== false && $xmlStart > 0) {
            $xmlData = substr($xmlData, $xmlStart);
        }

        file_put_contents('logs/debug_tropical.log', "Processing " . strtoupper($type) . " XML, length: " . strlen($xmlData) . " bytes\n", FILE_APPEND);

        // Attempt to parse as XML
        $xml = new SimpleXMLElement($xmlData);

        // For RSS format (current NHC format)
        if (isset($xml->channel) && isset($xml->channel->item)) {
            // Extract basic info
            $issueTime = (string)$xml->channel->pubDate;
            $productID = strtoupper($type);
            $discussion = "";

            // Get the description content from CDATA
            foreach ($xml->channel->item as $item) {
                if (isset($item->description)) {
                    $discussion = (string)$item->description;
                    break;  // Just use the first item
                }
            }

            // If description is empty or not found, check for link to direct content
            if (empty($discussion) && isset($xml->channel->item->link)) {
                $directUrl = (string)$xml->channel->item->link;

                // If we have a direct link, try to fetch the actual content
                if (!empty($directUrl)) {
                    writeLog("XML description empty, trying direct URL: " . $directUrl, 'info');
                    file_put_contents('logs/debug_tropical.log', "Trying direct URL: " . $directUrl . "\n", FILE_APPEND);

                    // Fetch from direct URL
                    global $userAgent;
                    $directContent = fetchData($directUrl, $userAgent);

                    if ($directContent) {
                        // For TWDAT, find the text content
                        if ($type == 'twdat') {
                            if (preg_match('/<pre[^>]*>(.*?)<\/pre>/s', $directContent, $matches)) {
                                $discussion = $matches[1];
                            } else {
                                // Try a more direct approach - check if it's plain text
                                $discussion = strip_tags($directContent);
                            }
                        }
                    }
                }
            }

            // Strip CDATA markers
            $discussion = str_replace('<![CDATA[', '', $discussion);
            $discussion = str_replace(']]>', '', $discussion);

            // ----- preserve paragraph breaks -----
            // 1) Any time two or more <br>‑variants occur in a row, turn them into a blank line:
            //    this captures &lt;br /&gt;&lt;br /&gt; as well as "<br/><br />" etc.
            $discussion = preg_replace(
                '/(?:&lt;br\s*\/&gt;\s*|<br\s*\/?>\s*){2,}/i',
                "\n\n",
                $discussion
            );

            // 2) Now convert *any remaining* single <br> (escaped or raw) into a single newline
            $discussion = preg_replace(
                '/(?:&lt;br\s*\/&gt;|<br\s*\/?>)/i',
                "\n",
                $discussion
            );

            // Finally, hand off to your formatter
            $formattedText = formatNhcText($discussion);

            file_put_contents('logs/debug_tropical.log', strtoupper($type) . " parse successful (RSS format), issueTime: $issueTime\n", FILE_APPEND);

            return [
                'issueTime' => $issueTime,
                'productID' => $productID,
                'discussion' => $formattedText,
                'rawContent' => $discussion,
                'timestamp' => time()
            ];
        }
        // Original format (legacy)
        else if (isset($xml->issueTime)) {
            // Extract basic info
            $issueTime = (string)$xml->issueTime;
            $productID = (string)$xml->productID;

            // Extract discussion sections
            $discussion = "";
            if (isset($xml->discussion)) {
                $discussion = (string)$xml->discussion;
            } else if (isset($xml->product)) {
                // Try alternate location
                $discussion = (string)$xml->product;
            }

            // Format the text content for better readability
            $formattedText = formatNhcText($discussion);

            file_put_contents('logs/debug_tropical.log', strtoupper($type) . " parse successful (standard format), issueTime: $issueTime\n", FILE_APPEND);

            return [
                'issueTime' => $issueTime,
                'productID' => $productID,
                'discussion' => $formattedText,
                'rawContent' => $discussion,
                'timestamp' => time()
            ];
        }

        // Failed to parse XML - let's try direct access to text product
        writeLog("Could not find " . strtoupper($type) . " content in XML, trying direct URL", 'info');

        // Direct URLs for specific products
        $directUrls = [
            'twdat' => 'https://www.nhc.noaa.gov/text/MIATWDAT.shtml',
            'twsat' => 'https://www.nhc.noaa.gov/text/MIATWOSAT.shtml',
            'twoat' => 'https://www.nhc.noaa.gov/text/MIATWOAT.shtml'
        ];

        if (isset($directUrls[$type])) {
            global $userAgent;
            $directUrl = $directUrls[$type];

            file_put_contents('logs/debug_tropical.log', "Trying direct URL: " . $directUrl . "\n", FILE_APPEND);
            $directContent = fetchData($directUrl, $userAgent);

            if ($directContent && !empty($directContent)) {
                // Extract content from HTML
                if (preg_match('/<pre[^>]*>(.*?)<\/pre>/s', $directContent, $matches)) {
                    $discussion = $matches[1];
                    // Format for display
                    $formattedText = formatNhcText($discussion);

                    file_put_contents('logs/debug_tropical.log', "Successfully extracted content from direct URL\n", FILE_APPEND);

                    return [
                        'issueTime' => date('Y-m-d\TH:i:s\Z'),
                        'productID' => strtoupper($type) . '_DIRECT',
                        'discussion' => $formattedText,
                        'rawContent' => $discussion,
                        'timestamp' => time()
                    ];
                }
            }
        }

        // Could not find content in any expected format
        file_put_contents('logs/debug_tropical.log', "Could not find " . strtoupper($type) . " content in expected XML format or direct URL\n", FILE_APPEND);
        return [];
    } catch (Exception $e) {
        writeLog("Error parsing " . strtoupper($type) . " XML: " . $e->getMessage(), 'error');
        file_put_contents('logs/debug_tropical.log', "Error parsing " . strtoupper($type) . " XML: " . $e->getMessage() . "\n", FILE_APPEND);

        // Try direct URL as fallback in case of XML parsing error
        try {
            global $userAgent;
            $directUrl = ($type == 'twdat') ? 'https://www.nhc.noaa.gov/text/MIATWDAT.shtml' : (($type == 'twsat') ? 'https://www.nhc.noaa.gov/text/MIATWOSAT.shtml' : '');

            if (!empty($directUrl)) {
                file_put_contents('logs/debug_tropical.log', "Trying direct URL after XML parse error: " . $directUrl . "\n", FILE_APPEND);
                $directContent = fetchData($directUrl, $userAgent);

                if ($directContent && !empty($directContent)) {
                    // Extract content from HTML
                    if (preg_match('/<pre[^>]*>(.*?)<\/pre>/s', $directContent, $matches)) {
                        $discussion = $matches[1];
                        // Format for display
                        $formattedText = formatNhcText($discussion);

                        file_put_contents('logs/debug_tropical.log', "Successfully extracted content from direct URL\n", FILE_APPEND);

                        return [
                            'issueTime' => date('Y-m-d\TH:i:s\Z'),
                            'productID' => strtoupper($type) . '_DIRECT',
                            'discussion' => $formattedText,
                            'rawContent' => $discussion,
                            'timestamp' => time()
                        ];
                    }
                }
            }

            return [];
        } catch (Exception $innerEx) {
            writeLog("Error retrieving direct URL: " . $innerEx->getMessage(), 'error');
            return [];
        }
    }
}

/**
 * Alternative method to fetch tropical weather discussion from direct URL
 * This can be used as a fallback when XML parsing fails
 * @return array Discussion data or empty array on failure
 */
function fetchTwdDirectly()
{
    global $userAgent;
    $urls = [
        'primary' => 'https://www.nhc.noaa.gov/text/MIATWDAT.shtml',
        'backup' => 'https://www.nhc.noaa.gov/ftp/pub/forecasts/discussion/MIATWDAT'
    ];

    writeLog("Attempting to fetch TWD directly from NHC text products", 'info');

    foreach ($urls as $label => $url) {
        try {
            $content = fetchData($url, $userAgent);
            if ($content) {
                // Try to extract pre-formatted text (common format for NHC products)
                if (preg_match('/<pre[^>]*>(.*?)<\/pre>/s', $content, $matches)) {
                    $text = $matches[1];
                } else {
                    // Might be plain text already
                    $text = strip_tags($content);
                }

                // Clean up text
                $text = trim($text);
                if (!empty($text)) {
                    // Format for display
                    $formattedText = formatNhcText($text);

                    writeLog("Successfully fetched TWD directly from {$label} URL", 'info');

                    // Extract date if possible - typical format includes a date line
                    $issueTime = date('Y-m-d\TH:i:s\Z'); // Default current time
                    if (preg_match('/(\d{4}) UTC ([A-Za-z]{3} [A-Za-z]{3} \d{1,2} \d{4})/', $text, $dateParts)) {
                        $issueTime = date('Y-m-d\TH:i:s\Z', strtotime($dateParts[2] . ' ' . $dateParts[1]));
                    }

                    return [
                        'issueTime' => $issueTime,
                        'productID' => 'TWDAT_DIRECT',
                        'discussion' => $formattedText,
                        'rawContent' => $text,
                        'timestamp' => time()
                    ];
                }
            }
        } catch (Exception $e) {
            writeLog("Error fetching TWD from {$label} URL: " . $e->getMessage(), 'error');
            continue; // Try next URL
        }
    }

    writeLog("All direct TWD fetch attempts failed", 'error');
    return [];
}

/**
 * Format NHC text content for display, preserving exact spacing
 * @param string $text Raw text content
 * @return string Formatted text
 */
function formatNhcText($text)
{
    // Decode HTML entities
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5);

    // Convert HTML line breaks to newlines
    $text = str_replace(['<br />', '<br/>', '<br>', '&lt;br /&gt;', '&lt;br/&gt;', '&lt;br&gt;'], "\n", $text);

    // Remove any leading/trailing whitespace
    $text = trim($text);

    // Filter out WMO headers and bulletin markers
    $lines = explode("\n", $text);
    $filteredLines = [];

    foreach ($lines as $line) {
        // Skip these specific metadata lines
        if (
            preg_match('/^[0-9]{3,4}$/', trim($line)) ||
            preg_match('/^A[A-Z]{3}[0-9]{2}/', trim($line)) ||
            preg_match('/^ZCZC/', trim($line)) ||
            preg_match('/^TTAA00/', trim($line)) ||
            trim($line) === '$$' ||
            trim($line) === 'NNNN'
        ) {
            continue;
        }

        $filteredLines[] = $line;
    }

    // Rejoin the lines preserving exact spacing
    $filteredText = implode("\n", $filteredLines);

    // Return pre-formatted text
    return '<pre>' . htmlspecialchars($filteredText) . '</pre>';
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
        file_put_contents('logs/debug_tropical.log', "Cache file does not exist: $cacheFile\n", FILE_APPEND);
        return true;
    }

    $fileTime = filemtime($cacheFile);
    $currentTime = time();
    $age = $currentTime - $fileTime;

    file_put_contents('logs/debug_tropical.log', "Cache file age: " . $age . " seconds (max: $maxAge)\n", FILE_APPEND);

    return ($age > $maxAge);
}

/**
 * Create a default cache file when data fetch fails
 * @param string $productKey The product key
 * @param string $cacheFile The cache file path
 * @param string $url The source URL
 * @param bool $isHurricaneSeason Whether it's currently hurricane season
 */
function createDefaultCacheFile($productKey, $cacheFile, $url, $isHurricaneSeason)
{
    writeLog("Creating default data for $productKey", 'info');
    file_put_contents('logs/debug_tropical.log', "Creating default data for $productKey (In hurricane season: " .
        ($isHurricaneSeason ? "Yes" : "No") . ")\n", FILE_APPEND);

    $parsedData = [];
    $currentYear = date('Y');
    $lastYear = $currentYear - 1;

    if ($productKey === 'twoat' || $productKey === 'twosat') {
        // TWO products are seasonal - change based on hurricane season status
        $isSpanish = ($productKey === 'twosat');

        if ($isHurricaneSeason) {
            // Default content for hurricane season
            $seasonStatus = $isSpanish ? 'TEMPORADA ACTIVA' : 'ACTIVE SEASON';
            $defaultText = $isSpanish ?
                'La información tropical no está disponible actualmente. Por favor, visite nhc.noaa.gov para obtener la información más reciente.' :
                'Tropical information is currently unavailable. Please visit nhc.noaa.gov for the latest information.';
            $productID = 'ACTIVE_SEASON_TWO';
        } else {
            // Default content for off-season
            $seasonStatus = $isSpanish ? 'TEMPORADA INACTIVA' : 'OFF SEASON';
            $defaultText = $isSpanish ?
                'No se espera la formación de ciclones tropicales durante los próximos 7 días.' :
                'Tropical cyclone formation is not expected during the next 7 days.';
            $productID = 'OFF_SEASON_TWO';
        }

        $parsedData = [
            'issueTime' => date('Y-m-d\TH:i:s\Z'),
            'productID' => $productID,
            'basin' => 'Atlantic',
            'outlooks' => [
                [
                    'timeframe' => $isSpanish ? 'Próximos 7 días' : 'Next 7 Days',
                    'text' => $defaultText,
                    'areas' => []
                ]
            ],
            'active_systems' => [],
            'rawContent' => "$seasonStatus - " . ($isSpanish ?
                'No hay datos de actividad tropical disponibles' :
                'No tropical activity data available'),
            'timestamp' => time(),
            'source' => $url,
            'cacheTime' => time()
        ];
    } elseif ($productKey === 'twdat') {
        // TWD is issued year-round - don't change based on season status
        $parsedData = [
            'issueTime' => date('Y-m-d\TH:i:s\Z'),
            'productID' => 'TWD_DEFAULT',
            'discussion' => '<p>Tropical Weather Discussion is currently unavailable. ' .
                'Please visit the National Hurricane Center website for the latest information.</p>',
            'rawContent' => 'Tropical Weather Discussion data unavailable',
            'timestamp' => time(),
            'source' => $url,
            'cacheTime' => time()
        ];
    } elseif ($productKey === 'twsat') {
        // Monthly summary - changes seasonally
        if ($isHurricaneSeason) {
            // Default content for hurricane season
            $parsedData = [
                'issueTime' => date('Y-m-d\TH:i:s\Z'),
                'productID' => 'ACTIVE_SEASON_TWSAT',
                'discussion' => "<p>Monthly summary for the {$currentYear} Atlantic hurricane season. Data currently unavailable.</p>",
                'rawContent' => "Monthly summary for the {$currentYear} Atlantic hurricane season",
                'timestamp' => time(),
                'source' => $url,
                'cacheTime' => time()
            ];
        } else {
            // Default content for off-season
            $parsedData = [
                'issueTime' => date('Y-m-d\TH:i:s\Z'),
                'productID' => 'OFF_SEASON_TWSAT',
                'discussion' => "<p>Summary of the {$lastYear} Atlantic hurricane season. The next season begins May 15, {$currentYear}.</p>",
                'rawContent' => "Summary of the {$lastYear} Atlantic hurricane season",
                'timestamp' => time(),
                'source' => $url,
                'cacheTime' => time()
            ];
        }
    }

    // Save to cache
    if (!empty($parsedData)) {
        $jsonData = json_encode($parsedData, JSON_PRETTY_PRINT);
        $writeResult = file_put_contents($cacheFile, $jsonData);

        if ($writeResult === false) {
            writeLog("Failed to write default cache for $productKey", 'error');
            file_put_contents('logs/debug_tropical.log', "Failed to write default cache: $cacheFile\n", FILE_APPEND);
        } else {
            writeLog("Created default cache for $productKey", 'info');
            file_put_contents('logs/debug_tropical.log', "Created default cache: $cacheFile ($writeResult bytes)\n", FILE_APPEND);
            // Ensure file permissions
            chmod($cacheFile, 0666);
        }
    }
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

        file_put_contents('logs/debug_tropical.log', "Processing product: $productKey, cache file: $cacheFile\n", FILE_APPEND);

        if (isCacheStale($cacheFile, $maxAge)) {
            writeLog("Cache is stale for $productKey, fetching new data", 'info');
            file_put_contents('logs/debug_tropical.log', "Cache is stale for $productKey, fetching new data\n", FILE_APPEND);

            $xmlData = fetchData($url, $userAgent);
            if ($xmlData === false) {
                writeLog("Failed to fetch XML data for $productKey, skipping cache update", 'error');
                file_put_contents('logs/debug_tropical.log', "Failed to fetch XML data for $productKey\n", FILE_APPEND);
                continue;
            }

            // Parse XML data based on product type
            $parsedData = [];
            if ($productKey === 'twoat' || $productKey === 'twosat') {
                $parsedData = parseTwoXml($xmlData);
            } else if ($productKey === 'twdat' || $productKey === 'twsat') {
                $parsedData = parseTwdXml($xmlData, $productKey);
            }

            // Check if we have valid data (even if minimal)
            if (empty($parsedData)) {
                writeLog("No valid data found for $productKey, skipping cache update", 'warning');
                file_put_contents('logs/debug_tropical.log', "No valid data found for $productKey, skipping cache update\n", FILE_APPEND);
                continue;
            }

            // Add metadata
            $parsedData['source'] = $url;
            $parsedData['cacheTime'] = time();

            // Save to cache with error checking
            $jsonData = json_encode($parsedData, JSON_PRETTY_PRINT);
            if ($jsonData === false) {
                writeLog("JSON encoding failed for $productKey: " . json_last_error_msg(), 'error');
                file_put_contents('logs/debug_tropical.log', "JSON encoding failed: " . json_last_error_msg() . "\n", FILE_APPEND);
                continue;
            }

            $writeResult = file_put_contents($cacheFile, $jsonData);
            if ($writeResult === false) {
                writeLog("Failed to write cache file for $productKey: $cacheFile", 'error');
                file_put_contents('logs/debug_tropical.log', "Failed to write cache file: $cacheFile\n", FILE_APPEND);
                file_put_contents('logs/debug_tropical.log', "Is writable: " . (is_writable(dirname($cacheFile)) ? "yes" : "no") . "\n", FILE_APPEND);
            } else {
                writeLog("Updated cache for $productKey", 'info');
                file_put_contents('logs/debug_tropical.log', "Successfully wrote cache file: $cacheFile ($writeResult bytes)\n", FILE_APPEND);

                // Ensure file permissions
                chmod($cacheFile, 0666);
            }
        } else {
            writeLog("Cache is still fresh for $productKey", 'debug');
            file_put_contents('logs/debug_tropical.log', "Cache is still fresh for $productKey\n", FILE_APPEND);
        }
    }
}

// Run the main processing logic
writeLog("Starting tropical data cache update", 'info');
file_put_contents('logs/debug_tropical.log', "Starting tropical data cache update\n", FILE_APPEND);

try {
    processXmlProducts();
    writeLog("Completed tropical data cache update", 'info');
    file_put_contents('logs/debug_tropical.log', "Completed tropical data cache update\n", FILE_APPEND);
} catch (Exception $e) {
    writeLog("Uncaught exception: " . $e->getMessage(), 'error');
    file_put_contents('logs/debug_tropical.log', "FATAL ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n", FILE_APPEND);
}
