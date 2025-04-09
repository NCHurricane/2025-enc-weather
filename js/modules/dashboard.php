<?php
// dashboard.php - Simple dashboard to monitor cache health

// Set content type to HTML
header('Content-Type: text/html');

// Configuration
$cacheDir = 'cache/';
$logDir = 'logs/';

// Get all cache files
$cacheFiles = glob($cacheDir . '*.json');

// Function to get file details
function getFileDetails($file) {
    $details = [];
    $details['name'] = basename($file);
    $details['size'] = filesize($file);
    $details['mtime'] = filemtime($file);
    $details['age'] = time() - $details['mtime'];
    $details['ageFormatted'] = formatTimeAgo($details['age']);
    
    // Check if file is valid JSON
    $content = file_get_contents($file);
    $details['isValid'] = isValidJson($content);
    
    return $details;
}

// Function to check if content is valid JSON
function isValidJson($content) {
    json_decode($content);
    return (json_last_error() === JSON_ERROR_NONE);
}

// Function to format time ago
function formatTimeAgo($seconds) {
    if ($seconds < 60) {
        return $seconds . " seconds ago";
    } elseif ($seconds < 3600) {
        return floor($seconds / 60) . " minutes ago";
    } elseif ($seconds < 86400) {
        return floor($seconds / 3600) . " hours ago";
    } else {
        return floor($seconds / 86400) . " days ago";
    }
}

// Get status of all files
$fileDetails = [];
foreach ($cacheFiles as $file) {
    $fileDetails[] = getFileDetails($file);
}

// Sort by name
usort($fileDetails, function($a, $b) {
    return strcmp($a['name'], $b['name']);
});

// Group files by type
$filesByType = [
    'weather' => [],
    'alerts' => [],
    'forecasts' => [],
    'afd' => [],
    'other' => []
];

foreach ($fileDetails as $file) {
    if (strpos($file['name'], 'weather') !== false) {
        $filesByType['weather'][] = $file;
    } elseif (strpos($file['name'], 'alert') !== false) {
        $filesByType['alerts'][] = $file;
    } elseif (strpos($file['name'], 'forecast') !== false) {
        $filesByType['forecasts'][] = $file;
    } elseif (strpos($file['name'], 'afd') !== false) {
        $filesByType['afd'][] = $file;
    } else {
        $filesByType['other'][] = $file;
    }
}

// Get the latest log entries
$logEntries = [];
$logFiles = glob($logDir . '*.log');
foreach ($logFiles as $logFile) {
    $logName = basename($logFile);
    $logContent = file_exists($logFile) ? file_get_contents($logFile) : '';
    
    // Get the last 5 lines
    $lines = explode("\n", $logContent);
    $lines = array_filter($lines);
    $lastLines = array_slice($lines, -5);
    
    $logEntries[$logName] = $lastLines;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Cache Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .valid { color: green; }
        .invalid { color: red; }
        .old { color: orange; }
        .fresh { color: green; }
        .section { margin-bottom: 30px; }
        pre { background: #f5f5f5; padding: 10px; overflow: auto; }
    </style>
</head>
<body>
    <h1>Weather Cache Dashboard</h1>
    <p>Current time: <?= date('Y-m-d H:i:s') ?></p>
    
    <div class="section">
        <h2>Quick Actions</h2>
        <button onclick="location.href='force_refresh.php?type=all'">Force Full Refresh</button>
        <button onclick="location.href='force_refresh.php?type=weather'">Refresh Weather</button>
        <button onclick="location.href='force_refresh.php?type=alerts'">Refresh Alerts</button>
        <button onclick="location.href='force_refresh.php?type=forecasts'">Refresh Forecasts</button>
        <button onclick="location.href='force_refresh.php?type=afd'">Refresh AFD</button>
    </div>
    
    <?php foreach ($filesByType as $type => $files): ?>
        <?php if (!empty($files)): ?>
            <div class="section">
                <h2><?= ucfirst($type) ?> Files</h2>
                <table>
                    <tr>
                        <th>Filename</th>
                        <th>Size</th>
                        <th>Last Updated</th>
                        <th>Status</th>
                    </tr>
                    <?php foreach ($files as $file): ?>
                        <tr>
                            <td><?= $file['name'] ?></td>
                            <td><?= number_format($file['size']) ?> bytes</td>
                            <td>
                                <?= date('Y-m-d H:i:s', $file['mtime']) ?>
                                <br>
                                <span class="<?= $file['age'] < 3600 ? 'fresh' : 'old' ?>">
                                    <?= $file['ageFormatted'] ?>
                                </span>
                            </td>
                            <td class="<?= $file['isValid'] ? 'valid' : 'invalid' ?>">
                                <?= $file['isValid'] ? 'Valid' : 'Invalid JSON' ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </table>
            </div>
        <?php endif; ?>
    <?php endforeach; ?>
    
    <div class="section">
        <h2>Recent Log Entries</h2>
        <?php foreach ($logEntries as $logName => $entries): ?>
            <h3><?= $logName ?></h3>
            <pre><?= implode("\n", $entries) ?></pre>
        <?php endforeach; ?>
    </div>
</body>
</html>