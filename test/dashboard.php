<?php
/**
 * Weather System Health Dashboard - Clean Version (No Batch Operations)
 * Monitors PHP scripts, logs, and system health for the 2025 weather project
 * 
 * Features:
 * - Script monitoring and manual execution
 * - Log file management and viewing
 * - Health checks and file age monitoring
 * - Rate limiting and audit logging
 */

session_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load environment configuration
loadEnvironmentConfig();

/**
 * Safely get remote IP address (handles CLI context)
 */
function getRemoteIP() {
    return $_SERVER['REMOTE_ADDR'] ?? 'CLI';
}

/**
 * Check if running in CLI mode
 */
function isCLI() {
    return php_sapi_name() === 'cli' || !isset($_SERVER['REMOTE_ADDR']);
}

// Configuration
$baseDir = dirname(__DIR__);
if (!is_dir($baseDir . '/active')) {
    $baseDir = __DIR__;
}
define('BASE_DIR', $baseDir);
define('LOGS_DIR', BASE_DIR . '/active/logs');
define('AUDIT_LOG', __DIR__ . '/dashboard_audit.log');

// Ensure logs directory exists
if (!file_exists(LOGS_DIR)) {
    mkdir(LOGS_DIR, 0755, true);
}

// Check IP restrictions if configured
checkIPRestriction();

// Authentication check
if (!isset($_SESSION['dashboard_authenticated']) || $_SESSION['dashboard_authenticated'] !== true) {
    if (isset($_POST['password'])) {
        if (verifyPassword($_POST['password'])) {
            $_SESSION['dashboard_authenticated'] = true;
            auditLog("Login successful from " . getRemoteIP());
            header('Location: ' . $_SERVER['PHP_SELF']);
            exit;
        } else {
            $loginError = 'Invalid password. Please try again.';
            auditLog("Login failed from " . getRemoteIP());
        }
    }
    showLoginForm($loginError ?? null);
    exit;
}

// Handle logout
if (isset($_GET['logout'])) {
    auditLog("Logout from " . getRemoteIP());
    session_destroy();
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// Rate limiting check
checkRateLimit();

// AJAX handlers
if (isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    switch ($_POST['action']) {
        case 'execute_script':
            handleScriptExecution();
            break;
        case 'get_log':
            handleGetLog();
            break;
        case 'delete_log':
            handleDeleteLog();
            break;
        case 'check_health':
            handleHealthCheck();
            break;
        case 'debug_paths':
            handleDebugPaths();
            break;
        case 'get_scripts':
            handleGetScripts();
            break;
        default:
            echo json_encode(['error' => 'Invalid action']);
    }
    exit;
}

// Main dashboard display
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather System Dashboard</title>
    <style>
        /* Modern Dashboard Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: rgba(255, 255, 255, 0.95);
            padding: 20px 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }

        .header h1 {
            color: #2c3e50;
            font-size: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .header-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .status-indicator {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 500;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .status-healthy {
            background: #d4edda;
            color: #155724;
        }

        .status-warning {
            background: #fff3cd;
            color: #856404;
        }

        .status-error {
            background: #f8d7da;
            color: #721c24;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }

        .card {
            background: rgba(255, 255, 255, 0.95);
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }

        .card h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .county-filter {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e1e8ed;
            margin-bottom: 15px;
        }

        .county-filter label {
            font-size: 14px;
            color: #495057;
            margin-right: 10px;
            font-weight: 500;
        }

        .county-filter select {
            padding: 8px 12px;
            border: 2px solid #e1e8ed;
            border-radius: 4px;
            font-size: 14px;
            background: white;
            color: #495057;
            transition: border-color 0.3s;
            min-width: 160px;
        }

        .county-filter select:focus {
            outline: none;
            border-color: #007bff;
        }

        .script-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #007bff;
        }

        .script-item:last-child {
            margin-bottom: 0;
        }

        .script-info {
            margin-bottom: 10px;
        }

        .script-name {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .script-status {
            font-size: 14px;
            color: #6c757d;
        }

        .script-actions {
            display: flex;
            gap: 8px;
        }

        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .btn-primary {
            background: #007bff;
            color: white;
        }

        .btn-primary:hover {
            background: #0056b3;
        }

        .btn-warning {
            background: #ffc107;
            color: #212529;
        }

        .btn-warning:hover {
            background: #e0a800;
        }

        .btn-danger {
            background: #dc3545;
            color: white;
        }

        .btn-danger:hover {
            background: #c82333;
        }

        .btn-success {
            background: #28a745;
            color: white;
        }

        .btn-success:hover {
            background: #218838;
        }

        .execution-output {
            background: #1e1e1e;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
            margin-top: 15px;
            display: none;
        }

        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
        }

        .modal-content {
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border-radius: 8px;
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
        }

        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }

        .close:hover {
            color: black;
        }

        .log-viewer {
            background: #1e1e1e;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            max-height: 500px;
            overflow-y: auto;
        }

        @media (max-width: 768px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            
            .header {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            .header-controls {
                justify-content: center;
            }
            
            .script-actions {
                flex-wrap: wrap;
            }
        }

        .loading {
            text-align: center;
            padding: 20px;
        }

        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #007bff;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="header">
            <h1>🌊 Weather System Dashboard</h1>
            <div class="header-controls">
                <div id="system-status" class="status-indicator status-healthy">
                    <span>🟢</span><span>System Healthy</span>
                </div>
                <button class="btn btn-warning" onclick="debugPaths()">Debug</button>
                <button class="btn btn-success" onclick="testScripts()">Test Scripts</button>
                <button class="btn btn-danger" onclick="window.location.href='?logout=1'">Logout</button>
            </div>
        </div>

        <div class="dashboard-grid">
            <!-- Tropical Systems -->
            <div class="card">
                <h2>🌀 Tropical Systems</h2>
                <div id="tropical-scripts" class="loading">
                    <div class="spinner"></div>
                    <p>Loading scripts...</p>
                </div>
            </div>

            <!-- County Weather -->
            <div class="card">
                <h2>🏘️ County Weather</h2>
                <div class="county-filter">
                    <label for="county-select">Filter by County:</label>
                    <select id="county-select" onchange="filterCountyScripts()">
                        <option value="">All Counties</option>
                        <option value="beaufort">Beaufort</option>
                        <option value="bertie">Bertie</option>
                        <option value="dare">Dare</option>
                        <option value="hyde">Hyde</option>
                        <option value="martin">Martin</option>
                        <option value="pitt">Pitt</option>
                        <option value="tyrrell">Tyrrell</option>
                        <option value="washington">Washington</option>
                    </select>
                </div>
                <div id="county-scripts" class="loading">
                    <div class="spinner"></div>
                    <p>Loading scripts...</p>
                </div>
            </div>

            <!-- Cache Management -->
            <div class="card">
                <h2>🗄️ Cache Management</h2>
                <div id="cache-scripts" class="loading">
                    <div class="spinner"></div>
                    <p>Loading scripts...</p>
                </div>
            </div>

            <!-- System Health -->
            <div class="card">
                <h2>🔍 System Health</h2>
                <div id="health-info" class="loading">
                    <div class="spinner"></div>
                    <p>Loading health info...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    <div id="logModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="log-title">Log Viewer</h2>
            <div id="log-content" class="log-viewer"></div>
        </div>
    </div>

    <div id="executeModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="execute-title">Execute Script</h2>
            <div id="execute-form">
                <label for="script-params">Parameters:</label>
                <input type="text" id="script-params" placeholder="Enter parameters (e.g., --storm=ALL)">
                <button onclick="runScript('custom')" class="btn btn-primary">Run with Parameters</button>
                <button onclick="runScript('default')" class="btn btn-success">Run with Defaults</button>
            </div>
            <div id="execution-output" class="execution-output"></div>
        </div>
    </div>

    <script>
        // Dashboard JavaScript functionality
        let currentScript = null;
        let executionQueue = [];
        let isExecuting = false;
        let allCountyScripts = []; // Store all county scripts for filtering

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadScripts();
            loadHealthInfo();
            
            // Setup modal handlers
            setupModals();
            
            // Auto-refresh every 5 minutes
            setInterval(() => {
                loadScripts();
                loadHealthInfo();
            }, 300000);
        });

        function setupModals() {
            const modals = document.querySelectorAll('.modal');
            const closes = document.querySelectorAll('.close');
            
            closes.forEach(close => {
                close.onclick = function() {
                    modals.forEach(modal => modal.style.display = "none");
                }
            });
            
            window.onclick = function(event) {
                modals.forEach(modal => {
                    if (event.target == modal) {
                        modal.style.display = "none";
                    }
                });
            }
        }

        function loadScripts() {
            console.log('Loading scripts...');
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'action=get_scripts'
            })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text(); // Get as text first to see raw response
            })
            .then(text => {
                console.log('Raw response:', text);
                try {
                    const data = JSON.parse(text);
                    console.log('Parsed data:', data);
                    
                    // Render scripts for each category
                    renderScripts('tropical-scripts', data.tropical || []);
                    
                    // Store county scripts and apply current filter
                    allCountyScripts = data.county || [];
                    filterCountyScripts(); // Apply current filter
                    
                    renderScripts('cache-scripts', data.cache || []);
                } catch (e) {
                    console.error('JSON parse error:', e);
                    throw new Error('Invalid JSON response: ' + text.substring(0, 200));
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                // Show error message in UI
                document.getElementById('tropical-scripts').innerHTML = '<div style="color: red;">Error loading scripts: ' + error.message + '</div>';
                document.getElementById('county-scripts').innerHTML = '<div style="color: red;">Error loading scripts: ' + error.message + '</div>';
                document.getElementById('cache-scripts').innerHTML = '<div style="color: red;">Error loading scripts: ' + error.message + '</div>';
            });
        }

        function loadHealthInfo() {
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'action=check_health'
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('health-info').innerHTML = renderHealthInfo(data);
                updateSystemStatus(data.overall_status);
            })
            .catch(error => console.error('Error:', error));
        }

        function renderScripts(containerId, scripts) {
            const container = document.getElementById(containerId);
            if (!scripts || scripts.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">No scripts found</div>';
                return;
            }
            
            container.innerHTML = scripts.map(script => `
                <div class="script-item">
                    <div class="script-info">
                        <div class="script-name">${script.name}</div>
                        <div class="script-status">
                            Last run: ${script.last_run || 'Never'} | 
                            Log size: ${script.log_size || 'No log'}
                        </div>
                    </div>
                    <div class="script-actions">
                        <button class="btn btn-primary" onclick="executeScript('${script.path}', '${script.name}')">Execute</button>
                        <button class="btn btn-warning" onclick="viewLog('${script.log_path}', '${script.name}')">View Log</button>
                        <button class="btn btn-danger" onclick="deleteLog('${script.log_path}', '${script.name}')">Delete Log</button>
                    </div>
                </div>
            `).join('');
        }

        function filterCountyScripts() {
            const selectedCounty = document.getElementById('county-select').value;
            let filteredScripts = allCountyScripts;
            
            if (selectedCounty) {
                // Filter scripts to show only the selected county
                filteredScripts = allCountyScripts.filter(script => 
                    script.name.toLowerCase().includes(selectedCounty.toLowerCase())
                );
            }
            
            renderScripts('county-scripts', filteredScripts);
        }

        function renderHealthInfo(health) {
            let failedScriptsHtml = '';
            if (health.failed_script_details && health.failed_script_details.length > 0) {
                failedScriptsHtml = `
                    <details style="margin-top: 10px;">
                        <summary>Failed Scripts Details (${health.failed_script_details.length})</summary>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            ${health.failed_script_details.map(script => 
                                `<li><strong>${script.script}</strong>: ${script.error_count} errors, last: ${script.last_error_time}</li>`
                            ).join('')}
                        </ul>
                    </details>
                `;
            }
            
            return `
                <div style="margin-bottom: 15px;">
                    <strong>NHC Status:</strong> <span style="color: ${health.nhc_status === 'healthy' ? 'green' : 'red'};">${health.nhc_status.toUpperCase()}</span>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Old Logs:</strong> ${health.old_logs} files older than 7 days
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Failed Scripts (24h):</strong> 
                    <span style="color: ${health.failed_scripts > 5 ? 'red' : health.failed_scripts > 0 ? 'orange' : 'green'};">${health.failed_scripts}</span>
                </div>
                <div>
                    <strong>Overall Status:</strong> <span style="color: ${health.overall_status === 'healthy' ? 'green' : health.overall_status === 'warning' ? 'orange' : 'red'};">${health.overall_status.toUpperCase()}</span>
                </div>
                ${failedScriptsHtml}
            `;
        }

        function updateSystemStatus(status) {
            const statusEl = document.getElementById('system-status');
            statusEl.className = `status-indicator status-${status}`;
            
            const statusText = {
                'healthy': '🟢 System Healthy',
                'warning': '🟡 System Warning',
                'error': '🔴 System Error'
            };
            
            statusEl.innerHTML = `<span>${statusText[status].split(' ')[0]}</span><span>${statusText[status].substring(2)}</span>`;
        }

        function executeScript(scriptPath, scriptName) {
            currentScript = {path: scriptPath, name: scriptName};
            document.getElementById('execute-title').textContent = `Execute: ${scriptName}`;
            
            // Set appropriate default parameters based on script type
            let defaultParams = '';
            let placeholder = '';
            if (scriptName.includes('Writer') || scriptName.includes('TCV') || scriptName.includes('CXML')) {
                // Tropical scripts need storm parameter
                defaultParams = '--storm=ALL';
                placeholder = '--storm=ALL or --storm=AL012025';
            } else {
                // County and cache scripts typically don't need parameters
                defaultParams = '';
                placeholder = 'No parameters needed for this script';
            }
            
            const paramsInput = document.getElementById('script-params');
            paramsInput.value = defaultParams;
            paramsInput.placeholder = placeholder;
            
            document.getElementById('execution-output').style.display = 'none';
            document.getElementById('executeModal').style.display = 'block';
        }

        function runScript(mode = 'custom') {
            if (isExecuting) {
                alert('A script is already running. Please wait...');
                return;
            }
            
            let params;
            if (mode === 'default') {
                // Use script-specific defaults
                if (currentScript.name.includes('Writer') || currentScript.name.includes('TCV') || currentScript.name.includes('CXML')) {
                    params = '--storm=ALL';
                } else {
                    params = ''; // No parameters for county/cache scripts
                }
            } else {
                params = document.getElementById('script-params').value;
            }
            
            const outputDiv = document.getElementById('execution-output');
            
            outputDiv.style.display = 'block';
            outputDiv.textContent = `Executing ${currentScript.name}...\n`;
            
            isExecuting = true;
            
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: `action=execute_script&script=${encodeURIComponent(currentScript.path)}&params=${encodeURIComponent(params)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    outputDiv.textContent += `Error: ${data.error}\n`;
                } else {
                    outputDiv.textContent += data.output || 'Script completed successfully.';
                }
                isExecuting = false;
                
                // Refresh script list after execution
                setTimeout(loadScripts, 1000);
            })
            .catch(error => {
                outputDiv.textContent += `Error: ${error}\n`;
                isExecuting = false;
            });
        }

        function viewLog(logPath, scriptName) {
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: `action=get_log&log_path=${encodeURIComponent(logPath)}`
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('log-title').textContent = `Log: ${scriptName}`;
                document.getElementById('log-content').textContent = data.content || 'No log content available.';
                document.getElementById('logModal').style.display = 'block';
            })
            .catch(error => console.error('Error:', error));
        }

        function deleteLog(logPath, scriptName) {
            if (!confirm(`Are you sure you want to delete the LOG FILE for ${scriptName}?\n\nThis will only delete the log file, not the script itself.`)) {
                return;
            }
            
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: `action=delete_log&log_path=${encodeURIComponent(logPath)}`
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Log deleted successfully');
                    loadScripts();
                } else {
                    alert('Error deleting log: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => console.error('Error:', error));
        }

        function debugPaths() {
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'action=debug_paths'
            })
            .then(response => response.json())
            .then(data => {
                console.log('Debug paths:', data);
                alert('Debug info logged to console. Check browser console (F12).');
            })
            .catch(error => console.error('Error:', error));
        }

        function testScripts() {
            console.log('Testing script loading...');
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'action=get_scripts'
            })
            .then(response => {
                console.log('Test - Response status:', response.status);
                return response.text();
            })
            .then(text => {
                console.log('Test - Raw response:', text);
                const data = JSON.parse(text);
                console.log('Test - Parsed data:', data);
                console.log('Test - Tropical scripts count:', data.tropical ? data.tropical.length : 'undefined');
                console.log('Test - County scripts count:', data.county ? data.county.length : 'undefined');
                console.log('Test - Cache scripts count:', data.cache ? data.cache.length : 'undefined');
                alert('Test completed. Check console for results.');
            })
            .catch(error => {
                console.error('Test - Error:', error);
                alert('Test failed: ' + error.message);
            });
        }
    </script>
</body>
</html>

<?php

// PHP Functions

function loadEnvironmentConfig() {
    $envFile = __DIR__ . '/.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue; // Skip comments
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Set both $_ENV and putenv for maximum compatibility
                $_ENV[$key] = $value;
                putenv("$key=$value");
            }
        }
    }
}

function getConfig($key, $default = null) {
    // Check $_ENV first (requires variables_order = "EGPCS" in php.ini)
    if (isset($_ENV[$key])) {
        return $_ENV[$key];
    }
    
    // Fallback to getenv() which works with CLI
    $value = getenv($key);
    if ($value !== false) {
        return $value;
    }
    
    return $default;
}

function verifyPassword($inputPassword) {
    $storedPassword = getConfig('DASHBOARD_PASSWORD');
    
    if (!$storedPassword) {
        // Fallback to default for initial setup
        return $inputPassword === 'weather2025admin';
    }
    
    // Check if stored password is already hashed
    if (password_get_info($storedPassword)['algo']) {
        return password_verify($inputPassword, $storedPassword);
    } else {
        // Plain text comparison for backward compatibility
        return $inputPassword === $storedPassword;
    }
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_ARGON2ID);
}

function checkIPRestriction() {
    $allowedIPs = getConfig('ALLOWED_IPS');
    if ($allowedIPs) {
        $allowedIPList = array_map('trim', explode(',', $allowedIPs));
        $clientIP = getRemoteIP();
        
        if ($clientIP !== 'CLI' && !in_array($clientIP, $allowedIPList)) {
            auditLog("Access denied for IP: $clientIP");
            http_response_code(403);
            die('Access denied: IP not allowed');
        }
    }
}

function showLoginForm($error = null) {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weather Dashboard Login</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
            }
            .login-form {
                background: rgba(255, 255, 255, 0.95);
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
                width: 100%;
                max-width: 400px;
            }
            .login-form h1 {
                text-align: center;
                margin-bottom: 30px;
                color: #2c3e50;
            }
            .form-group {
                margin-bottom: 20px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #555;
            }
            .form-group input {
                width: 100%;
                padding: 12px;
                border: 2px solid #e1e8ed;
                border-radius: 6px;
                font-size: 16px;
                transition: border-color 0.3s;
            }
            .form-group input:focus {
                outline: none;
                border-color: #667eea;
            }
            .login-btn {
                width: 100%;
                padding: 12px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.3s;
            }
            .login-btn:hover {
                background: #5a6fd8;
            }
            .recovery-info {
                text-align: center;
                margin-top: 20px;
                font-size: 14px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <form class="login-form" method="post">
            <h1>🌊 Weather Dashboard</h1>
            <?php if ($error): ?>
                <div style="background: #f8d7da; color: #721c24; padding: 12px; border-radius: 6px; margin-bottom: 20px; text-align: center;">
                    <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="login-btn">Login</button>
            <div class="recovery-info">
                Password recovery: <?= htmlspecialchars(getConfig('ADMIN_EMAIL', 'admin@example.com')) ?>
            </div>
        </form>
    </body>
    </html>
    <?php
}

function auditLog($message) {
    $timestamp = date('Y-m-d H:i:s');
    $entry = "[$timestamp] $message\n";
    file_put_contents(AUDIT_LOG, $entry, FILE_APPEND | LOCK_EX);
}

function checkRateLimit() {
    $maxExecutions = getConfig('MAX_EXECUTIONS_PER_HOUR', 10);
    $hour = date('H');
    $rateLimitFile = __DIR__ . "/rate_limit_$hour.json";
    
    $data = file_exists($rateLimitFile) ? json_decode(file_get_contents($rateLimitFile), true) : [];
    $ip = getRemoteIP();
    
    if (!isset($data[$ip])) {
        $data[$ip] = 0;
    }
    
    if ($data[$ip] >= $maxExecutions) {
        http_response_code(429);
        die('Rate limit exceeded. Maximum ' . $maxExecutions . ' executions per hour.');
    }
    
    if (isset($_POST['action']) && $_POST['action'] === 'execute_script') {
        $data[$ip]++;
        file_put_contents($rateLimitFile, json_encode($data));
    }
}

function getScripts() {
    $scripts = [
        'tropical' => [],
        'county' => [],
        'cache' => []
    ];
    
    // Tropical scripts
    $tropicalScripts = [
        'advisory_writer.php' => 'Advisory Writer (AT)',
        'advisory_writer_ep.php' => 'Advisory Writer (EP)',
        'tcv_writer.php' => 'TCV Writer (AT)',
        'tcv_writer_ep.php' => 'TCV Writer (EP)',
        'cxml_writer.php' => 'CXML Writer (AT)',
        'cxml_writer_ep.php' => 'CXML Writer (EP)',
        'mtcswa_fetcher.php' => 'MTCSWA Fetcher (AT/EP)',
        'nhc_graphics_cache.php' => 'NHC Graphics Cache (AT)',
        'nhc_graphics_cache_ep.php' => 'NHC Graphics Cache (EP)'
    ];

    foreach ($tropicalScripts as $file => $name) {
        $path = BASE_DIR . "/active/api/$file";
        if (file_exists($path)) {
            $logPath = LOGS_DIR . '/' . str_replace('.php', '.log', $file);
            $scripts['tropical'][] = [
                'name' => $name,
                'path' => $path,
                'log_path' => $logPath,
                'last_run' => file_exists($logPath) ? date('M j, H:i', filemtime($logPath)) : null,
                'log_size' => file_exists($logPath) ? formatBytes(filesize($logPath)) : null
            ];
        }
    }

    // Add warm_tiles.php as a special tropical script
    $warmTilesPath = BASE_DIR . '/active/api/warm_tiles.php';
    if (file_exists($warmTilesPath)) {
        $logPath = LOGS_DIR . '/warm_tiles_log';
        $scripts['tropical'][] = [
            'name' => 'Tile Warmer (All Styles)',
            'path' => $warmTilesPath,
            'log_path' => $logPath,
            'last_run' => file_exists($logPath) ? date('M j, H:i', filemtime($logPath)) : null,
            'log_size' => file_exists($logPath) ? formatBytes(filesize($logPath)) : null,
            'extra_params' => '--purge=1 (optional, to force overwrite)'
        ];
    }
    
    // Cache scripts
    $cacheScripts = [
        'text_products_cache.php' => 'Text Products Cache',
        'tropical_data.php' => 'Tropical Data Cache',
        'cache_tropical.php' => 'Tropical Coordination Guard'
    ];

    foreach ($cacheScripts as $file => $name) {
        $path = BASE_DIR . "/active/api/$file";
        if (file_exists($path)) {
            $logPath = LOGS_DIR . '/' . str_replace('.php', '.log', $file);
            $scripts['cache'][] = [
                'name' => $name,
                'path' => $path,
                'log_path' => $logPath,
                'last_run' => file_exists($logPath) ? date('M j, H:i', filemtime($logPath)) : null,
                'log_size' => file_exists($logPath) ? formatBytes(filesize($logPath)) : null
            ];
        }
    }
    
    // County scripts
    $counties = ['bertie', 'pitt', 'beaufort', 'martin', 'dare', 'hyde', 'washington', 'tyrrell'];
    $countyScripts = ['cache_current.php', 'cache_forecast.php', 'cache_alerts.php', 'cache_afd.php'];
    
    foreach ($counties as $county) {
        foreach ($countyScripts as $script) {
            $path = BASE_DIR . "/counties/$county/api/$script";
            if (file_exists($path)) {
                $logPath = BASE_DIR . "/counties/$county/logs/cron_" . str_replace('cache_', '', str_replace('.php', '.log', $script));
                $scripts['county'][] = [
                    'name' => ucfirst($county) . ' ' . ucfirst(str_replace(['cache_', '.php'], ['', ''], $script)),
                    'path' => $path,
                    'log_path' => $logPath,
                    'last_run' => file_exists($logPath) ? date('M j, H:i', filemtime($logPath)) : null,
                    'log_size' => file_exists($logPath) ? formatBytes(filesize($logPath)) : null
                ];
            }
        }
    }
    
    return $scripts;
}

function handleScriptExecution() {
    $scriptPath = $_POST['script'] ?? '';
    $params = $_POST['params'] ?? '';
    
    if (!file_exists($scriptPath)) {
        echo json_encode(['error' => 'Script not found']);
        return;
    }
    
    auditLog("Script execution: $scriptPath with params: $params from " . getRemoteIP());
    
    // Build command
    $cmd = "/usr/bin/php8.4-cli " . escapeshellarg($scriptPath);
    if (!empty($params)) {
        $cmd .= " -- " . escapeshellarg($params);
    }
    $cmd .= " 2>&1";
    
    // Execute and capture output
    $output = shell_exec($cmd);
    
    echo json_encode(['output' => $output]);
}

function handleGetLog() {
    $logPath = $_POST['log_path'] ?? '';
    
    if (!file_exists($logPath)) {
        echo json_encode(['content' => 'Log file not found']);
        return;
    }
    
    // Read last 1000 lines to avoid memory issues
    $content = shell_exec("tail -n 1000 " . escapeshellarg($logPath));
    echo json_encode(['content' => $content]);
}

function handleDeleteLog() {
    $logPath = $_POST['log_path'] ?? '';
    
    if (!file_exists($logPath)) {
        echo json_encode(['error' => 'Log file not found']);
        return;
    }
    
    auditLog("Log deletion: $logPath from " . getRemoteIP());
    
    if (unlink($logPath)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Failed to delete log file']);
    }
}

function handleHealthCheck() {
    $health = [
        'overall_status' => 'healthy',
        'nhc_status' => checkNHCAvailability(),
        'old_logs' => countOldLogs(),
        'failed_scripts' => 0,
        'failed_script_details' => []
    ];
    
    // Get detailed failure information
    $failureDetails = getFailedScriptDetails();
    $health['failed_scripts'] = count($failureDetails);
    $health['failed_script_details'] = $failureDetails;
    
    // Determine overall status
    if ($health['nhc_status'] !== 'healthy' || $health['failed_scripts'] > 5) {
        $health['overall_status'] = 'error';
    } elseif ($health['old_logs'] > 10 || $health['failed_scripts'] > 0) {
        $health['overall_status'] = 'warning';
    }
    
    echo json_encode($health);
}

function checkNHCAvailability() {
    $url = 'https://www.nhc.noaa.gov/CurrentStorms.json';
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ($httpCode === 200 && !empty($result)) ? 'healthy' : 'error';
}

function countOldLogs() {
    $count = 0;
    $files = glob(LOGS_DIR . '/*.log');
    foreach ($files as $file) {
        if (filemtime($file) < strtotime('-7 days')) {
            $count++;
        }
    }
    return $count;
}

function getFailedScriptDetails() {
    $failures = [];
    $since24h = strtotime('-24 hours');
    
    // Check main logs directory
    $files = glob(LOGS_DIR . '/*.log');
    foreach ($files as $file) {
        if (filemtime($file) > $since24h) {
            $scriptName = basename($file, '.log');
            $content = file_get_contents($file);
            
            // Count errors and get last error time
            $errorCount = substr_count(strtolower($content), 'error') + substr_count(strtolower($content), 'failed');
            
            if ($errorCount > 0) {
                // Try to extract the last error timestamp
                $lines = explode("\n", $content);
                $lastErrorTime = 'Unknown';
                
                // Look for recent error lines (reverse order to find latest)
                for ($i = count($lines) - 1; $i >= 0; $i--) {
                    $line = strtolower($lines[$i]);
                    if (strpos($line, 'error') !== false || strpos($line, 'failed') !== false) {
                        // Try to extract timestamp from line
                        if (preg_match('/\[?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]?/', $lines[$i], $matches)) {
                            $lastErrorTime = $matches[1];
                        }
                        break;
                    }
                }
                
                $failures[] = [
                    'script' => ucwords(str_replace(['_', '.log'], [' ', ''], $scriptName)),
                    'error_count' => $errorCount,
                    'last_error_time' => $lastErrorTime,
                    'log_file' => $file
                ];
            }
        }
    }
    
    // Check county logs
    $counties = ['bertie', 'pitt', 'beaufort', 'martin', 'dare', 'hyde', 'washington', 'tyrrell'];
    foreach ($counties as $county) {
        $countyLogDir = BASE_DIR . "/counties/$county/logs";
        if (is_dir($countyLogDir)) {
            $countyFiles = glob($countyLogDir . '/cron_*.log');
            foreach ($countyFiles as $file) {
                if (filemtime($file) > $since24h) {
                    $content = file_get_contents($file);
                    $errorCount = substr_count(strtolower($content), 'error') + substr_count(strtolower($content), 'failed');
                    
                    if ($errorCount > 0) {
                        $scriptName = basename($file, '.log');
                        $scriptName = str_replace('cron_', '', $scriptName);
                        
                        // Extract last error time
                        $lines = explode("\n", $content);
                        $lastErrorTime = 'Unknown';
                        
                        for ($i = count($lines) - 1; $i >= 0; $i--) {
                            $line = strtolower($lines[$i]);
                            if (strpos($line, 'error') !== false || strpos($line, 'failed') !== false) {
                                if (preg_match('/\[?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]?/', $lines[$i], $matches)) {
                                    $lastErrorTime = $matches[1];
                                }
                                break;
                            }
                        }
                        
                        $failures[] = [
                            'script' => ucfirst($county) . ' ' . ucwords(str_replace('_', ' ', $scriptName)),
                            'error_count' => $errorCount,
                            'last_error_time' => $lastErrorTime,
                            'log_file' => $file
                        ];
                    }
                }
            }
        }
    }
    
    // Sort by error count (highest first)
    usort($failures, function($a, $b) {
        return $b['error_count'] - $a['error_count'];
    });
    
    return $failures;
}

function formatBytes($size, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB'];
    for ($i = 0; $size >= 1024 && $i < count($units) - 1; $i++) {
        $size /= 1024;
    }
    return round($size, $precision) . ' ' . $units[$i];
}

// Provide richer diagnostics for path checks while keeping debug output backward compatible
function diagnosePath($path) {
    $exists   = file_exists($path);
    $isDir    = $exists ? is_dir($path) : null;
    $isFile   = $exists ? is_file($path) : null;
    $readable = $exists ? is_readable($path) : null;
    $writable = $exists ? is_writable($path) : null;
    $real     = $exists ? realpath($path) : null;
    $perms    = $exists ? substr(sprintf('%o', @fileperms($path)), -3) : null;

    $owner = $group = null;
    if ($exists) {
        $ownerId = @fileowner($path);
        $groupId = @filegroup($path);
        if (function_exists('posix_getpwuid') && $ownerId !== false) {
            $pw = @posix_getpwuid($ownerId);
            $owner = $pw['name'] ?? $ownerId;
        } else {
            $owner = $ownerId;
        }
        if (function_exists('posix_getgrgid') && $groupId !== false) {
            $gr = @posix_getgrgid($groupId);
            $group = $gr['name'] ?? $groupId;
        } else {
            $group = $groupId;
        }
    }

    return [
        'exists'   => $exists,
        'type'     => $exists ? ($isDir ? 'dir' : ($isFile ? 'file' : 'other')) : null,
        'readable' => $readable,
        'writable' => $writable,
        'perms'    => $perms,
        'owner'    => $owner,
        'group'    => $group,
        'realpath' => $real,
    ];
}

function handleDebugPaths() {
    $debug = [
        'BASE_DIR' => BASE_DIR,
        'LOGS_DIR' => LOGS_DIR,
        'current_dir' => __DIR__,
        'parent_dir' => dirname(__DIR__),
        'active_api_exists' => file_exists(BASE_DIR . '/active/api'),
        'js_modules_exists' => file_exists(BASE_DIR . '/js/modules'),
        'logs_dir_exists' => file_exists(LOGS_DIR),
        // Richer diagnostics for each sample path
        'sample_details' => []
    ];
    
    // Check for some sample files
    $sampleFiles = [
        BASE_DIR . '/active/api/advisory_writer.php',
        BASE_DIR . '/active/api/text_products_cache.php',
        BASE_DIR . '/counties/beaufort/api/cache_current.php',
        BASE_DIR . '/js/modules/logs',
    ];
    
    foreach ($sampleFiles as $file) {
        // Add richer diagnostics for each path
        $debug['sample_details'][$file] = diagnosePath($file);
    }

    // Include additional diagnostics for LOGS_DIR itself
    if (file_exists(LOGS_DIR)) {
        $debug['logs_dir_info'] = diagnosePath(LOGS_DIR);
    }
    
    echo json_encode($debug);
}

function handleGetScripts() {
    try {
        $scripts = getScripts();
        echo json_encode($scripts);
    } catch (Exception $e) {
        echo json_encode(['error' => 'Failed to get scripts: ' . $e->getMessage()]);
    }
}

?>