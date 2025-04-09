<?php
// force_refresh.php - Endpoint to force refresh specific cache types

header('Content-Type: application/json');

// Validate request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

// Get request data
$requestData = json_decode(file_get_contents('php://input'), true);
$type = $requestData['type'] ?? 'all';
$county = $requestData['county'] ?? null;

// Valid cache types
$validTypes = ['weather', 'alerts', 'forecasts', 'afd', 'all'];
if (!in_array($type, $validTypes)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid cache type specified']);
    exit;
}

// Initialize response
$response = [
    'status' => 'success',
    'message' => '',
    'details' => []
];

// Execute the appropriate refresh script based on type
switch ($type) {
    case 'weather':
        // Run weather cache refresh
        $output = [];
        $return = 0;
        exec('php cache_weather.php', $output, $return);
        $response['details']['weather'] = [
            'success' => $return === 0,
            'output' => $output
        ];
        $response['message'] = 'Weather cache refreshed';
        break;
    
    case 'alerts':
        // Run alerts cache refresh
        $output = [];
        $return = 0;
        exec('php cache_alerts.php', $output, $return);
        $response['details']['alerts'] = [
            'success' => $return === 0,
            'output' => $output
        ];
        $response['message'] = 'Alerts cache refreshed';
        break;
    
    case 'forecasts':
        // Run forecasts cache refresh
        $output = [];
        $return = 0;
        exec('php cache_forecasts.php', $output, $return);
        $response['details']['forecasts'] = [
            'success' => $return === 0,
            'output' => $output
        ];
        $response['message'] = 'Forecasts cache refreshed';
        break;
    
    case 'afd':
        // Run AFD cache refresh
        $output = [];
        $return = 0;
        exec('php cache_afd.php', $output, $return);
        $response['details']['afd'] = [
            'success' => $return === 0,
            'output' => $output
        ];
        $response['message'] = 'AFD cache refreshed';
        break;
    
    case 'all':
        // Run full refresh script
        $output = [];
        $return = 0;
        exec('php refresh_all.php', $output, $return);
        $response['details']['all'] = [
            'success' => $return === 0,
            'output' => $output
        ];
        $response['message'] = 'All caches refreshed';
        break;
}

// Return response
echo json_encode($response);
?>