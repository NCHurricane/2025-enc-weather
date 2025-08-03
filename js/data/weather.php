<?php
// weather.php - Central weather data endpoint
// Usage: weather.php?type=current|forecast|alerts|tropical&lat=xx&lon=yy

header('Content-Type: application/json');

$type = $_GET['type'] ?? null;
$lat = $_GET['lat'] ?? '35.5'; // Default lat/lon for ENC
$lon = $_GET['lon'] ?? '-77.0';

if (!$type) {
    echo json_encode(['error' => 'Missing type parameter']);
    exit;
}

function fetch_json($url)
{
    $opts = ["http" => ["header" => "User-Agent: Weather2025"]];
    $context = stream_context_create($opts);
    $json = file_get_contents($url, false, $context);
    return json_decode($json, true);
}

switch ($type) {
    case 'current':
        $pointMeta = fetch_json("https://api.weather.gov/points/$lat,$lon");
        if (!isset($pointMeta['properties']['observationStations'])) {
            echo json_encode(['error' => 'Invalid point metadata']);
            exit;
        }
        $stationsUrl = $pointMeta['properties']['observationStations'];
        $stations = fetch_json($stationsUrl);
        $stationId = $stations['features'][0]['properties']['stationIdentifier'] ?? null;
        $obs = $stationId ? fetch_json("https://api.weather.gov/stations/$stationId/observations/latest") : [];
        echo json_encode([
            'station' => $stationId,
            'current_observation' => $obs['properties'] ?? []
        ]);
        break;

    case 'forecast':
        $forecast = fetch_json("https://api.weather.gov/points/$lat,$lon");
        $gridUrl = $forecast['properties']['forecast'] ?? null;
        $gridHourly = $forecast['properties']['forecastHourly'] ?? null;
        $forecastData = $gridUrl ? fetch_json($gridUrl) : [];
        $hourlyData = $gridHourly ? fetch_json($gridHourly) : [];
        echo json_encode([
            'forecast' => $forecastData['properties'] ?? [],
            'hourly' => $hourlyData['properties'] ?? []
        ]);
        break;

    case 'alerts':
        $alerts = fetch_json("https://api.weather.gov/alerts/active?point=$lat,$lon");
        echo json_encode([
            'alerts' => $alerts['features'] ?? []
        ]);
        break;

    case 'tropical':
        // For now, load local XML/JSON tropical data (or scrape NHC)
        $tropical = [
            'active_systems' => [
                // Placeholder
                ['name' => '01L', 'status' => 'Tropical Storm', 'advisory' => '10'],
                ['name' => '02L', 'status' => 'Hurricane', 'advisory' => '5']
            ]
        ];
        echo json_encode($tropical);
        break;

    default:
        echo json_encode(['error' => 'Invalid type parameter']);
        break;
}
