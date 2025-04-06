<?php
// get_weather_data.php - Serves cached weather data for all locations

// Set content type to JSON
header('Content-Type: application/json');

// Configuration
$cacheDir = 'cache/';
$mainCacheFile = 'weather_cache.json';

// Function to read county configuration
function getCountyConfig() {
    $countiesFile = '../../counties/counties.json';
    if (file_exists($countiesFile)) {
        $jsonContent = file_get_contents($countiesFile);
        $countiesData = json_decode($jsonContent, true);
        return $countiesData['counties'] ?? [];
    } else {
        // Fallback to hardcoded counties if file doesn't exist
        return [
            [
                "name" => "Bertie",
                "city" => "Windsor",
                "lat" => 35.9985,
                "lon" => -76.9461
            ],
            [
                "name" => "Pitt",
                "city" => "Greenville",
                "lat" => 35.6115,
                "lon" => -77.3752
            ],
            [
                "name" => "Beaufort",
                "city" => "Washington",
                "lat" => 35.5465,
                "lon" => -77.0519
            ],
            [
                "name" => "Martin",
                "city" => "Williamston",
                "lat" => 35.86,
                "lon" => -77.18
            ],
            [
                "name" => "Dare",
                "city" => "Manteo",
                "lat" => 35.9082,
                "lon" => -75.6757
            ],
            [
                "name" => "Washington",
                "city" => "Plymouth",
                "lat" => 35.8668,
                "lon" => -76.7488
            ],
            [
                "name" => "Tyrrell",
                "city" => "Columbia",
                "lat" => 35.9177,
                "lon" => -76.2522
            ],
            [
                "name" => "Hyde",
                "city" => "Swan Quarter",
                "lat" => 35.4085,
                "lon" => -76.3302
            ]
        ];
    }
}

// Function to load cached data for all counties
function loadCachedWeatherData() {
    global $cacheDir;
    
    $counties = getCountyConfig();
    $result = [
        'timestamp' => time(),
        'lastUpdated' => date('Y-m-d H:i:s'),
        'temperatures' => []
    ];
    
    foreach ($counties as $county) {
        $countyName = $county['name'];
        $cacheFile = $cacheDir . strtolower($countyName) . '_weather.json';
        
        if (file_exists($cacheFile)) {
            $data = json_decode(file_get_contents($cacheFile), true);
            
            if ($data && isset($data['weather']['temperature'])) {
                $result['temperatures'][$countyName] = [
                    'temp' => $data['weather']['temperature'],
                    'condition' => $data['weather']['skyConditions'] ?? 'Unknown',
                    'timestamp' => $data['weather']['timestamp'] ?? time()
                ];
            }
        }
    }
    
    return $result;
}

// Load and return cached weather data
$weatherData = loadCachedWeatherData();
echo json_encode($weatherData);
?>