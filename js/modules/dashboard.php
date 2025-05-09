<?php

/**
 * Weather System Dashboard
 * 
 * Provides administrative interface and monitoring for the weather 
 * data caching system, shows status of cache files, and allows
 * manual refresh of data.
 */

// Configuration
$cacheDir = 'cache/';
$logDir = 'logs/';
$refreshToken = '1a2b3c4d5e'; // Change this to a secure random token

// Simple authentication - CHANGE THESE!
$username = 'nchadmin';
$password = 'Bella2018?!';  // You should change this to a secure password

// Basic authentication
$authenticated = false;

// Check if already logged in
session_start();
if (isset($_SESSION['dashboard_authenticated']) && $_SESSION['dashboard_authenticated'] === true) {
    $authenticated = true;
}

// Process login
if (isset($_POST['username']) && isset($_POST['password'])) {
    if ($_POST['username'] === $username && $_POST['password'] === $password) {
        $_SESSION['dashboard_authenticated'] = true;
        $authenticated = true;
    } else {
        $loginError = "Invalid username or password";
    }
}

// Redirect to login page if not authenticated
if (!$authenticated) {
    // Display login form and exit
    displayLoginForm(isset($loginError) ? $loginError : null);
    exit;
}

// Required parameters for timestamp formatting
date_default_timezone_set('America/New_York');

// Handle refresh requests
if (isset($_GET['refresh']) && isset($_GET['token'])) {
    if ($_GET['token'] !== $refreshToken) {
        die("Invalid security token");
    }

    $refreshType = $_GET['refresh'];
    $output = "";

    switch ($refreshType) {
        case 'all':
            // Run all cache scripts
            $output .= runScript('cache_weather.php');
            $output .= runScript('cache_forecasts.php');
            $output .= runScript('cache_alerts.php');
            $output .= runScript('cache_afd.php');
            $output .= runScript('cache_tropical.php');
            $output .= runScript('cache_health.php');
            break;

        case 'weather':
            $output .= runScript('cache_weather.php');
            break;

        case 'forecasts':
            $output .= runScript('cache_forecasts.php');
            break;

        case 'alerts':
            $output .= runScript('cache_alerts.php');
            break;

        case 'afd':
            $output .= runScript('cache_afd.php');
            break;

        case 'tropical':
            $output .= runScript('cache_tropical.php');
            break;

        case 'health':
            $output .= runScript('cache_health.php');
            break;

        default:
            $output = "Invalid refresh type specified";
    }

    // If AJAX request, return just the output
    if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
        echo $output;
        exit;
    }

    // Otherwise, set a flash message to display after redirect
    $_SESSION['flash_message'] = $output;
    header("Location: dashboard.php");
    exit;
}

/**
 * Run a PHP script and capture its output
 * 
 * @param string $scriptName Name of script to run
 * @return string Output from the script execution
 */
function runScript($scriptName)
{
    $output = "<h3>Running $scriptName</h3>";
    $output .= "<pre>";

    // Route script execution through PHP CLI if available
    if (function_exists('exec')) {
        $command = 'php ' . __DIR__ . '/' . $scriptName . ' 2>&1';
        exec($command, $outputArray, $returnCode);
        $output .= implode("\n", $outputArray);
        $output .= "\nExit code: $returnCode";
    } else {
        // Fallback to include if exec is not available
        ob_start();
        include($scriptName);
        $scriptOutput = ob_get_clean();
        $output .= $scriptOutput;
    }

    $output .= "</pre>";
    return $output;
}

/**
 * Display login form
 * 
 * @param string $error Optional error message
 */
function displayLoginForm($error = null)
{
?>
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weather Dashboard Login</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }

            .login-container {
                background: white;
                padding: 30px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                width: 350px;
            }

            h1 {
                text-align: center;
                color: #0077cc;
                margin-top: 0;
            }

            form {
                display: flex;
                flex-direction: column;
            }

            label {
                margin-bottom: 5px;
                font-weight: bold;
            }

            input[type="text"],
            input[type="password"] {
                padding: 10px;
                margin-bottom: 20px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }

            button {
                padding: 10px;
                background: #0077cc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }

            button:hover {
                background: #005fa3;
            }

            .error {
                color: red;
                margin-bottom: 15px;
                text-align: center;
            }
        </style>
    </head>

    <body>
        <div class="login-container">
            <h1>Weather Dashboard</h1>

            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <form method="post" action="">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>

                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>

                <button type="submit">Login</button>
            </form>
        </div>
    </body>

    </html>
<?php
}

/**
 * Get cache file statistics
 * 
 * @param string $cacheDir Directory containing cache files
 * @return array Cache file information
 */
function getCacheStats($cacheDir)
{
    $files = glob($cacheDir . '*.json');
    $stats = [];

    foreach ($files as $file) {
        $filename = basename($file);
        $stats[$filename] = [
            'size' => filesize($file),
            'modified' => filemtime($file),
            'ago' => time() - filemtime($file)
        ];
    }

    return $stats;
}

/**
 * Get the most recent logs
 * 
 * @param string $logDir Directory containing log files
 * @param int $lines Number of lines to retrieve
 * @return array Log entries
 */
function getRecentLogs($logDir, $lines = 20)
{
    $logs = [];
    $logFiles = glob($logDir . '*.log');

    foreach ($logFiles as $logFile) {
        $filename = basename($logFile);

        // Read the last X lines from the log file
        if (file_exists($logFile) && filesize($logFile) > 0) {
            $logContent = file($logFile);
            $logContent = array_slice($logContent, -$lines);

            $logs[$filename] = [
                'content' => $logContent,
                'modified' => filemtime($logFile)
            ];
        }
    }

    return $logs;
}

// Get cache stats and logs
$cacheStats = getCacheStats($cacheDir);
$recentLogs = getRecentLogs($logDir);

// Calculate system health
$systemHealth = [
    'total_files' => count($cacheStats),
    'old_files' => 0,
    'status' => 'good'
];

// Check for files older than 6 hours (21600 seconds)
foreach ($cacheStats as $stat) {
    if ($stat['ago'] > 21600) {
        $systemHealth['old_files']++;
    }
}

// Determine system health status
if ($systemHealth['old_files'] > ($systemHealth['total_files'] / 2)) {
    $systemHealth['status'] = 'critical';
} elseif ($systemHealth['old_files'] > 0) {
    $systemHealth['status'] = 'warning';
}

// Function to format time ago in a human-readable format
function formatTimeAgo($seconds)
{
    if ($seconds < 60) {
        return "$seconds seconds ago";
    } elseif ($seconds < 3600) {
        return round($seconds / 60) . " minutes ago";
    } elseif ($seconds < 86400) {
        return round($seconds / 3600) . " hours ago";
    } else {
        return round($seconds / 86400) . " days ago";
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather System Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #333;
        }

        h1,
        h2,
        h3 {
            color: #0077cc;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .panel {
            background: white;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-bottom: 20px;
        }

        .panel-header {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        table th,
        table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        .status-good {
            color: green;
        }

        .status-warning {
            color: orange;
        }

        .status-critical {
            color: red;
        }

        .button {
            display: inline-block;
            padding: 8px 16px;
            background: #0077cc;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            border: none;
            cursor: pointer;
        }

        .button:hover {
            background: #005fa3;
        }

        .button-small {
            padding: 4px 8px;
            font-size: 0.9em;
        }

        .code-block {
            background: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 3px;
            padding: 10px;
            font-family: monospace;
            overflow-x: auto;
        }

        .flash-message {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
        }

        .tabs {
            display: flex;
            border-bottom: 1px solid #ccc;
            margin-bottom: 15px;
        }

        .tab {
            padding: 10px 15px;
            cursor: pointer;
            margin-right: 5px;
            border: 1px solid transparent;
        }

        .tab.active {
            border: 1px solid #ccc;
            border-bottom-color: white;
            border-radius: 3px 3px 0 0;
            margin-bottom: -1px;
            background-color: white;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .user-info {
            margin-left: auto;
            display: flex;
            align-items: center;
        }

        .logout-link {
            margin-left: 15px;
            color: #0077cc;
            text-decoration: none;
        }

        @media (max-width: 768px) {
            .panel-header {
                flex-direction: column;
                align-items: flex-start;
            }

            .panel-header .button {
                margin-top: 10px;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h1>Weather System Dashboard</h1>
            <div class="user-info">
                <span>Logged in as <?php echo htmlspecialchars($username); ?></span>
                <a href="dashboard.php?logout=1" class="logout-link">Logout</a>
            </div>
        </header>

        <?php if (isset($_SESSION['flash_message'])): ?>
            <div class="flash-message">
                <?php echo $_SESSION['flash_message'];
                unset($_SESSION['flash_message']); ?>
            </div>
        <?php endif; ?>

        <!-- System Health Panel -->
        <div class="panel">
            <div class="panel-header">
                <h2>System Health</h2>
                <a href="dashboard.php?refresh=health&token=<?php echo $refreshToken; ?>" class="button">Run Health Check</a>
            </div>

            <div>
                <p>
                    <strong>Status:</strong>
                    <span class="status-<?php echo $systemHealth['status']; ?>">
                        <?php echo ucfirst($systemHealth['status']); ?>
                    </span>
                </p>
                <p><strong>Total cache files:</strong> <?php echo $systemHealth['total_files']; ?></p>
                <p><strong>Files older than 6 hours:</strong> <?php echo $systemHealth['old_files']; ?></p>
                <p><strong>Last dashboard refresh:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
            </div>
        </div>

        <!-- Quick Actions Panel -->
        <div class="panel">
            <div class="panel-header">
                <h2>Quick Actions</h2>
            </div>

            <div>
                <a href="dashboard.php?refresh=all&token=<?php echo $refreshToken; ?>" class="button">Refresh All Data</a>
                <a href="dashboard.php?refresh=weather&token=<?php echo $refreshToken; ?>" class="button">Refresh Weather</a>
                <a href="dashboard.php?refresh=forecasts&token=<?php echo $refreshToken; ?>" class="button">Refresh Forecasts</a>
                <a href="dashboard.php?refresh=alerts&token=<?php echo $refreshToken; ?>" class="button">Refresh Alerts</a>
                <a href="dashboard.php?refresh=afd&token=<?php echo $refreshToken; ?>" class="button">Refresh AFD</a>
                <a href="dashboard.php?refresh=tropical&token=<?php echo $refreshToken; ?>" class="button">Refresh Tropical</a>
            </div>
        </div>

        <!-- Cache Files Panel -->
        <div class="panel">
            <div class="panel-header">
                <h2>Cache Files</h2>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Filename</th>
                        <th>Size</th>
                        <th>Last Modified</th>
                        <th>Age</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($cacheStats as $filename => $stat): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($filename); ?></td>
                            <td><?php echo number_format($stat['size'] / 1024, 2); ?> KB</td>
                            <td><?php echo date('Y-m-d H:i:s', $stat['modified']); ?></td>
                            <td><?php echo formatTimeAgo($stat['ago']); ?></td>
                        </tr>
                    <?php endforeach; ?>

                    <?php if (empty($cacheStats)): ?>
                        <tr>
                            <td colspan="4">No cache files found.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <!-- Recent Logs Panel -->
        <div class="panel">
            <div class="panel-header">
                <h2>Recent Logs</h2>
            </div>

            <div class="tabs">
                <?php $firstLog = true; ?>
                <?php foreach ($recentLogs as $filename => $log): ?>
                    <div class="tab <?php echo $firstLog ? 'active' : ''; ?>"
                        data-tab="log-<?php echo md5($filename); ?>">
                        <?php echo htmlspecialchars($filename); ?>
                    </div>
                    <?php $firstLog = false; ?>
                <?php endforeach; ?>
            </div>

            <?php $firstLog = true; ?>
            <?php foreach ($recentLogs as $filename => $log): ?>
                <div class="tab-content <?php echo $firstLog ? 'active' : ''; ?>"
                    id="log-<?php echo md5($filename); ?>">
                    <p><strong>Last modified:</strong> <?php echo date('Y-m-d H:i:s', $log['modified']); ?></p>
                    <div class="code-block">
                        <?php foreach ($log['content'] as $line): ?>
                            <?php echo htmlspecialchars($line); ?>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php $firstLog = false; ?>
            <?php endforeach; ?>

            <?php if (empty($recentLogs)): ?>
                <p>No log files found.</p>
            <?php endif; ?>
        </div>

        <!-- Crontab Configuration Panel -->
        <div class="panel">
            <div class="panel-header">
                <h2>Crontab Configuration</h2>
            </div>

            <p>Copy and paste these commands into your crontab file to set up automated data refresh:</p>

            <div class="code-block">
                # Weather data - every 15 minutes
                */15 * * * * php <?php echo __DIR__; ?>/cache_weather.php > /dev/null 2>&1

                # Forecast data - every hour
                0 * * * * php <?php echo __DIR__; ?>/cache_forecasts.php > /dev/null 2>&1

                # Alert data - every 5 minutes
                */5 * * * * php <?php echo __DIR__; ?>/cache_alerts.php > /dev/null 2>&1

                # AFD data - every 6 hours
                0 */6 * * * php <?php echo __DIR__; ?>/cache_afd.php > /dev/null 2>&1

                # Tropical data - every 30 minutes
                */30 * * * * php <?php echo __DIR__; ?>/cache_tropical.php > /dev/null 2>&1

                # Health check - daily at midnight
                0 0 * * * php <?php echo __DIR__; ?>/cache_health.php > /dev/null 2>&1
            </div>
        </div>
    </div>

    <script>
        // Tab switching functionality
        document.addEventListener('DOMContentLoaded', function() {
            const tabs = document.querySelectorAll('.tab');

            tabs.forEach(function(tab) {
                tab.addEventListener('click', function() {
                    // Remove active class from all tabs
                    document.querySelectorAll('.tab').forEach(function(t) {
                        t.classList.remove('active');
                    });

                    // Remove active class from all tab contents
                    document.querySelectorAll('.tab-content').forEach(function(c) {
                        c.classList.remove('active');
                    });

                    // Add active class to clicked tab
                    this.classList.add('active');

                    // Add active class to corresponding content
                    const tabId = this.getAttribute('data-tab');
                    document.getElementById(tabId).classList.add('active');
                });
            });

            // Add AJAX refresh functionality
            const refreshButtons = document.querySelectorAll('a[href^="dashboard.php?refresh="]');

            refreshButtons.forEach(function(button) {
                button.addEventListener('click', function(e) {
                    e.preventDefault();

                    const href = this.getAttribute('href');
                    const refreshSection = document.createElement('div');
                    refreshSection.className = 'panel';
                    refreshSection.innerHTML = '<div class="panel-header"><h2>Refresh Results</h2></div><div id="refresh-results">Loading...</div>';

                    // Insert at the top after the flash message or the first h1
                    const container = document.querySelector('.container');
                    const firstPanel = container.querySelector('.panel');
                    container.insertBefore(refreshSection, firstPanel);

                    // Scroll to the refresh section
                    refreshSection.scrollIntoView({
                        behavior: 'smooth'
                    });

                    // Fetch the results
                    fetch(href + '&ajax=1')
                        .then(response => response.text())
                        .then(data => {
                            document.getElementById('refresh-results').innerHTML = data;

                            // Refresh the page after 5 seconds to update cache stats
                            setTimeout(function() {
                                window.location.reload();
                            }, 5000);
                        })
                        .catch(error => {
                            document.getElementById('refresh-results').innerHTML =
                                '<div class="status-critical">Error: ' + error.message + '</div>';
                        });
                });
            });
        });
    </script>
</body>

</html>