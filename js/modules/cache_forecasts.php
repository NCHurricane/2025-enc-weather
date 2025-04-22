<?php
// cache_forecasts.php - Fetches and caches forecast data

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
function fetchData($url, $userAgent, $retries = 3)
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "User-Agent: " . $userAgent,
        "Accept: application/geo+json"
    ]);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    // Rate limiting logic
    static $requestCount = 0;
    static $lastRequestTime = 0;

    $currentTime = microtime(true);
    $timeSinceLastRequest = $currentTime - $lastRequestTime;

    // Add delay if making requests too quickly
    if ($timeSinceLastRequest < 0.2 && $lastRequestTime > 0) {
        $delay = 0.2 - $timeSinceLastRequest;
        usleep($delay * 1000000); // microseconds
    }

    $requestCount++;
    $lastRequestTime = microtime(true);

    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($httpCode === 429 && $retries > 0) {
        // Rate limited - back off and retry
        curl_close($ch);
        sleep(pow(2, 4 - $retries)); // Exponential backoff
        return fetchData($url, $userAgent, $retries - 1);
    }

    if (curl_errno($ch) || ($httpCode !== 200 && $httpCode !== 304)) {
        $error = curl_error($ch);
        curl_close($ch);
        error_log("API request failed for URL {$url}: HTTP {$httpCode}, Error: {$error}");
        return false;
    }

    curl_close($ch);
    return $result;
}

// Function to read county configuration
function getCountyConfig()
{
    $countiesFile = '../../counties/counties.json';
    if (file_exists($countiesFile)) {
        $jsonContent = file_get_contents($countiesFile);
        $countiesData = json_decode($jsonContent, true);
        return $countiesData['counties'] ?? [];
    } else {
        // Fallback to hardcoded counties
        return [
            ["name" => "Bertie", "city" => "Windsor", "lat" => 35.9985, "lon" => -76.9461],
            ["name" => "Pitt", "city" => "Greenville", "lat" => 35.6115, "lon" => -77.3752],
        ];
    }
}

// Get counties configuration
$counties = getCountyConfig();
error_log("Found " . count($counties) . " counties to process for forecasts");

// Process each county
foreach ($counties as $county) {
    $countyName = $county['name'];
    $lat = $county['lat'];
    $lon = $county['lon'];

    error_log("Processing forecast for {$countyName} County ({$lat}, {$lon})");

    try {
        // Step 1: Get the forecast office and grid coordinates
        $pointsUrl = "https://api.weather.gov/points/{$lat},{$lon}";
        $pointsResponse = fetchData($pointsUrl, $userAgent);

        if (!$pointsResponse) {
            error_log("Error: Failed to fetch points data for {$countyName}");
            continue;
        }

        $pointsData = json_decode($pointsResponse, true);
        if (!isset($pointsData['properties'])) {
            error_log("Error: Invalid points data for {$countyName}");
            continue;
        }

        $gridId = $pointsData['properties']['gridId'];
        $gridX = $pointsData['properties']['gridX'];
        $gridY = $pointsData['properties']['gridY'];

        // Step 2: Fetch hourly forecast (most important for meteogram)
        $hourlyForecastUrl = $pointsData['properties']['forecastHourly'];
        $hourlyResponse = fetchData($hourlyForecastUrl, $userAgent);

        $hourlyData = [];
        if ($hourlyResponse) {
            $hourlyParsedData = json_decode($hourlyResponse, true);

            if (isset($hourlyParsedData['properties']['periods'])) {
                // Process hourly data - limit to next 120 hours (5 days)
                $hourlyData = array_slice($hourlyParsedData['properties']['periods'], 0, 120);
            } else {
                error_log("Warning: Hourly forecast structure invalid for {$countyName}");
            }
        } else {
            error_log("Warning: Failed to retrieve hourly forecast for {$countyName}");
        }

        // Step 3: Fetch daily forecast (for context)
        $forecastUrl = $pointsData['properties']['forecast'];
        $forecastResponse = fetchData($forecastUrl, $userAgent);

        $dailyData = [];
        if ($forecastResponse) {
            $forecastData = json_decode($forecastResponse, true);

            if (isset($forecastData['properties']['periods'])) {
                $dailyData = $forecastData['properties']['periods'];
            } else {
                error_log("Warning: Daily forecast structure invalid for {$countyName}");
            }
        } else {
            error_log("Warning: Failed to retrieve daily forecast for {$countyName}");
        }

        // Create comprehensive forecast cache data
        $cacheData = [
            'timestamp' => time(),
            'lastUpdated' => date('Y-m-d H:i:s'),
            'location' => $county['city'] ?? $countyName,
            'coords' => ['lat' => $lat, 'lon' => $lon],
            'forecast' => [
                'daily' => $dailyData,
                'hourly' => $hourlyData
            ]
        ];

        // Save to county-specific forecast file, forcing icons to large
        $countyFile = $cacheDir . strtolower($countyName) . '_forecast.json';

        // 1) serialize
        $json = json_encode($cacheData, JSON_PRETTY_PRINT);

        // 2) swap every '?size=medium' → '?size=large'
        $json = str_replace('?size=medium', '?size=large', $json);

        // 3) write out
        file_put_contents($countyFile, $json);

        error_log("Forecast cache updated for {$countyName} with " . count($hourlyData) . " hourly records");
    } catch (Exception $e) {
        error_log("Error processing {$countyName}: " . $e->getMessage());
    }

    // Add a delay between API calls to avoid rate limiting
    sleep(1);
}

error_log("Forecast caching completed");
