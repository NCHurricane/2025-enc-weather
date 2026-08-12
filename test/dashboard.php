<?php
/**
 * Weather System Health Dashboard - Clean Version (No Batch Operations)
 * Monitors PHP scripts, logs, and system health for the 2025 weather project
 * 
 * Features:
 * - Script monitoring and manual execution
 * - Log file management and viewing
 * - Generated imagery tile cache inspection and purge
 * - Health checks and file age monitoring
 * - Rate limiting and audit logging
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

// Load environment configuration
loadEnvironmentConfig();

// This maintenance surface is intentionally unavailable unless production
// configuration explicitly enables it.
header('X-Robots-Tag: noindex, nofollow, noarchive', true);
header('Cache-Control: no-store, max-age=0', true);
header('Pragma: no-cache', true);
header('X-Content-Type-Options: nosniff', true);
header('X-Frame-Options: DENY', true);
header('Referrer-Policy: no-referrer', true);
header("Permissions-Policy: camera=(), microphone=(), geolocation=()", true);
header("Content-Security-Policy: default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'", true);

if (strtolower((string) getConfig('DASHBOARD_ENABLED', 'false')) !== 'true') {
    http_response_code(404);
    exit('Not found');
}

session_name('nch_dashboard');
$dashboardRemoteAddress = $_SERVER['REMOTE_ADDR'] ?? '';
$dashboardIsLoopback = in_array($dashboardRemoteAddress, ['127.0.0.1', '::1'], true);
$dashboardIsHttps = isset($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/test/',
    // Permit local HTTP development; non-loopback dashboard sessions remain HTTPS-only.
    'secure' => $dashboardIsHttps || !$dashboardIsLoopback,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

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
define('IMAGERY_TILES_DIR', BASE_DIR . '/js/data/tiles/imagery');

// Ensure logs directory exists
if (!file_exists(LOGS_DIR)) {
    mkdir(LOGS_DIR, 0755, true);
}

// Check IP restrictions if configured
checkIPRestriction();

$configuredPassword = (string) getConfig('DASHBOARD_PASSWORD', '');
if ($configuredPassword === '' || !password_get_info($configuredPassword)['algo']) {
    http_response_code(503);
    exit('Dashboard configuration unavailable');
}

// Authentication check
if (!isset($_SESSION['dashboard_authenticated']) || $_SESSION['dashboard_authenticated'] !== true) {
    if (isset($_POST['password'])) {
        verifyCsrfToken();
        enforceRateLimit('login', (int) getConfig('MAX_LOGIN_ATTEMPTS_PER_HOUR', 5), false);
        if (verifyPassword((string) $_POST['password'])) {
            session_regenerate_id(true);
            $_SESSION['dashboard_authenticated'] = true;
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            auditLog("Login successful from " . getRemoteIP());
            header('Location: ' . $_SERVER['PHP_SELF']);
            exit;
        } else {
            enforceRateLimit('login', (int) getConfig('MAX_LOGIN_ATTEMPTS_PER_HOUR', 5), true);
            $loginError = 'Invalid password. Please try again.';
            auditLog("Login failed from " . getRemoteIP());
        }
    }
    showLoginForm($loginError ?? null);
    exit;
}

// Handle logout
if (isset($_POST['logout'])) {
    verifyCsrfToken();
    auditLog("Logout from " . getRemoteIP());
    $_SESSION = [];
    session_destroy();
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// AJAX handlers
if (isset($_POST['action'])) {
    verifyCsrfToken();
    checkRateLimit();
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
        case 'get_imagery_cache_stats':
            handleGetImageryCacheStats();
            break;
        case 'purge_imagery_cache':
            handlePurgeImageryCache();
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

        .btn:disabled {
            cursor: not-allowed;
            opacity: 0.55;
        }

        .cache-summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 15px;
        }

        .cache-stat {
            padding: 14px;
            border-radius: 8px;
            background: #f8f9fa;
            border: 1px solid #e1e8ed;
            text-align: center;
        }

        .cache-stat strong,
        .cache-stat span {
            display: block;
        }

        .cache-stat strong {
            margin-bottom: 4px;
            color: #2c3e50;
            font-size: 20px;
        }

        .cache-stat span,
        .cache-note,
        .cache-action-status {
            color: #6c757d;
            font-size: 13px;
        }

        .cache-note {
            margin-bottom: 15px;
            line-height: 1.5;
        }

        .cache-action-status {
            min-height: 20px;
            margin-top: 12px;
            font-weight: 600;
        }

        .cache-action-status.success {
            color: #155724;
        }

        .cache-action-status.error {
            color: #721c24;
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

            .cache-summary {
                grid-template-columns: 1fr;
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
                <form method="post" class="logout-form">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES) ?>">
                    <button class="btn btn-danger" type="submit" name="logout" value="1">Logout</button>
                </form>
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

            <!-- Temporary San Diego Weather -->
            <div class="card">
                <h2>🌴 Temporary San Diego Weather</h2>
                <div id="temp-san-diego-scripts" class="loading">
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

            <!-- Generated Imagery Tile Cache -->
            <div class="card">
                <h2>🧹 Imagery Tile Cache</h2>
                <p class="cache-note">Review and purge generated imagery basemap tiles. This action does not affect topographic tiles, source data, or application code.</p>
                <div class="cache-summary" aria-live="polite">
                    <div class="cache-stat">
                        <strong id="imagery-cache-files">—</strong>
                        <span>Generated files</span>
                    </div>
                    <div class="cache-stat">
                        <strong id="imagery-cache-size">—</strong>
                        <span>Disk usage</span>
                    </div>
                </div>
                <div class="script-actions">
                    <button class="btn btn-primary" type="button" onclick="loadImageryCacheStats()">Refresh</button>
                    <button id="purge-imagery-cache" class="btn btn-danger" type="button" onclick="purgeImageryCache()" disabled>Purge Imagery Tiles</button>
                </div>
                <div id="imagery-cache-status" class="cache-action-status" role="status"></div>
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
        const CSRF_TOKEN = <?= json_encode($_SESSION['csrf_token']) ?>;
        const dashboardBody = (params) => `${params}&csrf_token=${encodeURIComponent(CSRF_TOKEN)}`;
        let currentScript = null;
        let executionQueue = [];
        let isExecuting = false;
        let allCountyScripts = []; // Store all county scripts for filtering
        let imageryCacheStats = null;

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadScripts();
            loadHealthInfo();
            loadImageryCacheStats();
            
            // Setup modal handlers
            setupModals();
            
            // Auto-refresh every 5 minutes
            setInterval(() => {
                loadScripts();
                loadHealthInfo();
                loadImageryCacheStats();
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
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: dashboardBody('action=get_scripts')
            })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || `Request failed with status ${response.status}`);
                }
                return data;
            })
            .then(data => {
                renderScripts('tropical-scripts', data.tropical || []);
                allCountyScripts = data.county || [];
                filterCountyScripts();
                renderScripts('temp-san-diego-scripts', data.temp_san_diego || []);
                renderScripts('cache-scripts', data.cache || []);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                // Show error message in UI
                document.getElementById('tropical-scripts').innerHTML = '<div style="color: red;">Error loading scripts: ' + error.message + '</div>';
                document.getElementById('county-scripts').innerHTML = '<div style="color: red;">Error loading scripts: ' + error.message + '</div>';
                document.getElementById('temp-san-diego-scripts').innerHTML = '<div style="color: red;">Error loading scripts: ' + error.message + '</div>';
                document.getElementById('cache-scripts').innerHTML = '<div style="color: red;">Error loading scripts: ' + error.message + '</div>';
            });
        }

        function loadHealthInfo() {
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: dashboardBody('action=check_health')
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('health-info').innerHTML = renderHealthInfo(data);
                updateSystemStatus(data.overall_status);
            })
            .catch(error => console.error('Error:', error));
        }

        function requestDashboardAction(action) {
            return fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: dashboardBody(`action=${encodeURIComponent(action)}`)
            }).then(async response => {
                const data = await response.json();
                if (!response.ok || data.error) {
                    throw new Error(data.error || `Request failed with status ${response.status}`);
                }
                return data;
            });
        }

        function setImageryCacheStatus(message, type = '') {
            const status = document.getElementById('imagery-cache-status');
            status.textContent = message;
            status.className = `cache-action-status${type ? ` ${type}` : ''}`;
        }

        function renderImageryCacheStats(stats) {
            imageryCacheStats = stats;
            const fileCount = Number(stats.file_count) || 0;
            const lowerBoundSuffix = stats.scan_complete === false ? '+' : '';
            document.getElementById('imagery-cache-files').textContent = `${fileCount.toLocaleString()}${lowerBoundSuffix}`;
            document.getElementById('imagery-cache-size').textContent = `${stats.size_formatted || '0 B'}${lowerBoundSuffix}`;

            const purgeButton = document.getElementById('purge-imagery-cache');
            purgeButton.disabled = !stats.exists || !stats.writable || !stats.has_files;

            if (!stats.exists) {
                setImageryCacheStatus('The imagery tile cache directory does not exist.', 'error');
            } else if (!stats.writable) {
                setImageryCacheStatus('The imagery tile cache is not writable by the dashboard process.', 'error');
            }
        }

        function loadImageryCacheStats() {
            setImageryCacheStatus('Loading imagery tile cache statistics...');
            return requestDashboardAction('get_imagery_cache_stats')
                .then(data => {
                    renderImageryCacheStats(data);
                    if (data.exists && data.writable) {
                        setImageryCacheStatus(
                            data.scan_complete === false
                                ? 'Showing a quick lower-bound estimate; the full cache is checked only during purge.'
                                : 'Imagery tile cache statistics are current.'
                        );
                    }
                })
                .catch(error => {
                    imageryCacheStats = null;
                    document.getElementById('purge-imagery-cache').disabled = true;
                    setImageryCacheStatus(`Unable to load cache statistics: ${error.message}`, 'error');
                });
        }

        function purgeImageryCache() {
            if (!imageryCacheStats || !imageryCacheStats.has_files) {
                setImageryCacheStatus('There are no imagery tiles to purge.');
                return;
            }

            const fileCount = Number(imageryCacheStats.file_count).toLocaleString();
            const cacheSize = imageryCacheStats.size_formatted || 'unknown size';
            const estimatePrefix = imageryCacheStats.scan_complete === false ? 'at least ' : '';
            const confirmed = confirm(
                `Permanently delete ${estimatePrefix}${fileCount} generated imagery tile files (${estimatePrefix}${cacheSize})?\n\n` +
                'The imagery cache directory will remain in place, and tiles may be generated again as they are requested. Topographic tiles are not affected.'
            );
            if (!confirmed) return;

            const purgeButton = document.getElementById('purge-imagery-cache');
            purgeButton.disabled = true;
            setImageryCacheStatus('Purging generated imagery tiles...');

            requestDashboardAction('purge_imagery_cache')
                .then(data => {
                    renderImageryCacheStats(data.stats);
                    const deletedFiles = Number(data.deleted_files || 0).toLocaleString();
                    setImageryCacheStatus(
                        `Purge complete: ${deletedFiles} files (${data.deleted_size_formatted || '0 B'}) removed.`,
                        'success'
                    );
                })
                .catch(error => {
                    const message = `Purge failed: ${error.message}`;
                    loadImageryCacheStats().then(() => setImageryCacheStatus(message, 'error'));
                });
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
                        <button class="btn btn-primary" onclick="executeScript('${script.id}', '${script.name}')">Execute</button>
                        <button class="btn btn-warning" onclick="viewLog('${script.id}', '${script.name}')">View Log</button>
                        <button class="btn btn-danger" onclick="deleteLog('${script.id}', '${script.name}')">Delete Log</button>
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

        function executeScript(scriptId, scriptName) {
            currentScript = {id: scriptId, name: scriptName};
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
                body: dashboardBody(`action=execute_script&script_id=${encodeURIComponent(currentScript.id)}&params=${encodeURIComponent(params)}`)
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

        function viewLog(scriptId, scriptName) {
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: dashboardBody(`action=get_log&script_id=${encodeURIComponent(scriptId)}`)
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('log-title').textContent = `Log: ${scriptName}`;
                document.getElementById('log-content').textContent = data.content || 'No log content available.';
                document.getElementById('logModal').style.display = 'block';
            })
            .catch(error => console.error('Error:', error));
        }

        function deleteLog(scriptId, scriptName) {
            if (!confirm(`Are you sure you want to delete the LOG FILE for ${scriptName}?\n\nThis will only delete the log file, not the script itself.`)) {
                return;
            }
            
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: dashboardBody(`action=delete_log&script_id=${encodeURIComponent(scriptId)}`)
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
                body: dashboardBody('action=debug_paths')
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('log-title').textContent = 'Dashboard path diagnostics';
                document.getElementById('log-content').textContent = JSON.stringify(data, null, 2);
                document.getElementById('logModal').style.display = 'block';
            })
            .catch(error => console.error('Error:', error));
        }

        function testScripts() {
            fetch('dashboard.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: dashboardBody('action=get_scripts')
            })
            .then(async response => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || `Request failed with status ${response.status}`);
                }
                return data;
            })
            .then(data => {
                alert(
                    'Script inventory loaded successfully.\n\n' +
                    `Tropical: ${(data.tropical || []).length}\n` +
                    `County: ${(data.county || []).length}\n` +
                    `San Diego: ${(data.temp_san_diego || []).length}\n` +
                    `Cache: ${(data.cache || []).length}`
                );
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
    $storedPassword = (string) getConfig('DASHBOARD_PASSWORD', '');
    return $storedPassword !== ''
        && (bool) password_get_info($storedPassword)['algo']
        && password_verify($inputPassword, $storedPassword);
}

function checkIPRestriction() {
    if (isCLI()) {
        return;
    }

    $allowedIPs = trim((string) getConfig('ALLOWED_IPS', ''));
    $clientIP = getRemoteIP();
    $allowedIPList = array_values(array_filter(array_map('trim', explode(',', $allowedIPs))));

    if ($allowedIPs === '' || !in_array($clientIP, $allowedIPList, true)) {
        auditLog("Access denied for IP: $clientIP");
        http_response_code(403);
        exit('Access denied');
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
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES) ?>">
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

function verifyCsrfToken() {
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    $submittedToken = $_POST['csrf_token'] ?? '';
    if (!is_string($sessionToken) || !is_string($submittedToken) || !hash_equals($sessionToken, $submittedToken)) {
        http_response_code(403);
        exit('Invalid request');
    }
}

function enforceRateLimit($scope, $limit, $increment) {
    $limit = max(1, (int) $limit);
    $bucket = gmdate('YmdH');
    $rateLimitFile = __DIR__ . '/rate_limit_' . preg_replace('/[^a-z0-9_-]/i', '', $scope) . "_$bucket.json";
    $data = file_exists($rateLimitFile) ? json_decode((string) file_get_contents($rateLimitFile), true) : [];
    $data = is_array($data) ? $data : [];
    $key = hash('sha256', getRemoteIP());
    $attempts = (int) ($data[$key] ?? 0);

    if ($attempts >= $limit) {
        http_response_code(429);
        exit('Rate limit exceeded');
    }

    if ($increment) {
        $data[$key] = $attempts + 1;
        file_put_contents($rateLimitFile, json_encode($data), LOCK_EX);
    }
}

function checkRateLimit() {
    if (isset($_POST['action']) && $_POST['action'] === 'execute_script') {
        enforceRateLimit('execution', (int) getConfig('MAX_EXECUTIONS_PER_HOUR', 10), true);
    } elseif (isset($_POST['action']) && $_POST['action'] === 'purge_imagery_cache') {
        enforceRateLimit('imagery_purge', (int) getConfig('MAX_CACHE_PURGES_PER_HOUR', 4), true);
    }
}

function getDashboardScriptId($group, $path) {
    $normalizedPath = str_replace('\\', '/', (string) $path);
    return substr(hash('sha256', (string) $group . "\0" . $normalizedPath), 0, 24);
}

function getScripts() {
    $scripts = [
        'tropical' => [],
        'county' => [],
        'temp_san_diego' => [],
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
                'id' => getDashboardScriptId('tropical', $path),
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
            'id' => getDashboardScriptId('tropical', $warmTilesPath),
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
                'id' => getDashboardScriptId('cache', $path),
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
                    'id' => getDashboardScriptId('county', $path),
                    'name' => ucfirst($county) . ' ' . ucfirst(str_replace(['cache_', '.php'], ['', ''], $script)),
                    'path' => $path,
                    'log_path' => $logPath,
                    'last_run' => file_exists($logPath) ? date('M j, H:i', filemtime($logPath)) : null,
                    'log_size' => file_exists($logPath) ? formatBytes(filesize($logPath)) : null
                ];
            }
        }
    }

    // Temporary San Diego county scripts
    $tempSanDiegoCounty = 'san-diego';
    $tempSanDiegoScripts = ['cache_current.php', 'cache_forecast.php', 'cache_alerts.php', 'cache_afd.php'];

    foreach ($tempSanDiegoScripts as $script) {
        $path = BASE_DIR . "/counties/$tempSanDiegoCounty/api/$script";
        if (file_exists($path)) {
            $logPath = BASE_DIR . "/counties/$tempSanDiegoCounty/logs/cron_" . str_replace('cache_', '', str_replace('.php', '.log', $script));
            $scripts['temp_san_diego'][] = [
                'id' => getDashboardScriptId('temp_san_diego', $path),
                'name' => 'San Diego ' . ucfirst(str_replace(['cache_', '.php'], ['', ''], $script)),
                'path' => $path,
                'log_path' => $logPath,
                'last_run' => file_exists($logPath) ? date('M j, H:i', filemtime($logPath)) : null,
                'log_size' => file_exists($logPath) ? formatBytes(filesize($logPath)) : null
            ];
        }
    }
    
    return $scripts;
}

function getPublicDashboardScripts($scripts) {
    $publicScripts = [];
    foreach ($scripts as $groupName => $group) {
        $publicScripts[$groupName] = array_map(function ($entry) {
            unset($entry['path'], $entry['log_path']);
            return $entry;
        }, $group);
    }
    return $publicScripts;
}

function rotateDashboardLogs($scripts) {
    $maxBytes = max(1048576, (int) getConfig('MAX_DASHBOARD_LOG_BYTES', 5242880));
    $retainBytes = max(524288, (int) getConfig('DASHBOARD_LOG_RETAIN_BYTES', 2097152));
    $retainBytes = min($retainBytes, $maxBytes);
    $seen = [];

    foreach ($scripts as $group) {
        foreach ($group as $entry) {
            $logPath = $entry['log_path'] ?? null;
            if (!is_string($logPath) || isset($seen[$logPath]) || !is_file($logPath)) {
                continue;
            }
            $seen[$logPath] = true;
            clearstatcache(true, $logPath);
            if ((int) @filesize($logPath) <= $maxBytes) {
                continue;
            }

            $handle = @fopen($logPath, 'c+');
            if ($handle === false || !@flock($handle, LOCK_EX | LOCK_NB)) {
                if (is_resource($handle)) {
                    fclose($handle);
                }
                continue;
            }

            try {
                $stat = fstat($handle);
                $fileSize = (int) ($stat['size'] ?? 0);
                if ($fileSize <= $maxBytes) {
                    continue;
                }

                fseek($handle, -min($retainBytes, $fileSize), SEEK_END);
                $tail = stream_get_contents($handle);
                if ($tail === false) {
                    continue;
                }
                if ($fileSize > $retainBytes) {
                    $firstNewline = strpos($tail, "\n");
                    if ($firstNewline !== false) {
                        $tail = substr($tail, $firstNewline + 1);
                    }
                }

                rewind($handle);
                if (ftruncate($handle, 0)) {
                    fwrite($handle, $tail);
                    fflush($handle);
                    auditLog('Rotated oversized dashboard log: ' . basename($logPath));
                }
            } finally {
                flock($handle, LOCK_UN);
                fclose($handle);
            }
        }
    }
}

function requireAllowedDashboardPath($scriptId, $field) {
    if (!is_string($scriptId) || !preg_match('/^[a-f0-9]{24}$/', $scriptId)) {
        return null;
    }

    foreach (getScripts() as $group) {
        foreach ($group as $entry) {
            $entryId = $entry['id'] ?? '';
            $path = $entry[$field] ?? null;
            if (!is_string($entryId) || !hash_equals($entryId, $scriptId) || !is_string($path) || !file_exists($path)) {
                continue;
            }
            $resolved = realpath($path);
            return $resolved === false ? null : $resolved;
        }
    }

    auditLog("Rejected dashboard identifier from " . getRemoteIP());
    return null;
}

function handleScriptExecution() {
    $scriptId = $_POST['script_id'] ?? '';
    $params = $_POST['params'] ?? '';

    $scriptPath = requireAllowedDashboardPath($scriptId, 'path');
    if ($scriptPath === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Script not allowed']);
        return;
    }
    if (!is_string($params) || strlen($params) > 160 || !preg_match('/^[A-Za-z0-9_.:=\- ]*$/', $params)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid parameters']);
        return;
    }
    
    auditLog("Script execution: " . basename($scriptPath) . " with params: $params from " . getRemoteIP());
    
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
    $scriptId = $_POST['script_id'] ?? '';

    $logPath = requireAllowedDashboardPath($scriptId, 'log_path');
    if ($logPath === null) {
        http_response_code(400);
        echo json_encode(['content' => 'Log file not found']);
        return;
    }

    $lines = file($logPath, FILE_IGNORE_NEW_LINES);
    $content = $lines === false ? '' : implode("\n", array_slice($lines, -1000));
    echo json_encode(['content' => $content]);
}

function handleDeleteLog() {
    $scriptId = $_POST['script_id'] ?? '';

    $logPath = requireAllowedDashboardPath($scriptId, 'log_path');
    if ($logPath === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Log file not found']);
        return;
    }
    
    auditLog("Log deletion: " . basename($logPath) . " from " . getRemoteIP());
    
    if (unlink($logPath)) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Failed to delete log file']);
    }
}

function getImageryTilesDirectory() {
    $tilesRoot = realpath(BASE_DIR . '/js/data/tiles');
    if ($tilesRoot === false || !is_dir($tilesRoot)) {
        return null;
    }

    $candidate = $tilesRoot . DIRECTORY_SEPARATOR . 'imagery';
    if (!is_dir($candidate) || is_link($candidate)) {
        return null;
    }

    $resolved = realpath($candidate);
    if ($resolved === false || dirname($resolved) !== $tilesRoot || basename($resolved) !== 'imagery') {
        return null;
    }

    return $resolved;
}

function getImageryCacheStats() {
    if (!file_exists(IMAGERY_TILES_DIR)) {
        return [
            'exists' => false,
            'writable' => false,
            'has_files' => false,
            'scan_complete' => true,
            'file_count' => 0,
            'size_bytes' => 0,
            'size_formatted' => '0 B'
        ];
    }

    $directory = getImageryTilesDirectory();
    if ($directory === null) {
        throw new RuntimeException('Imagery tile cache path failed the dashboard safety check.');
    }

    $fileCount = 0;
    $sizeBytes = 0;
    $scanComplete = true;
    $scanDeadline = microtime(true) + 1.0;
    $maxScannedFiles = 5000;
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($iterator as $item) {
        if ($item->isLink() || !$item->isFile()) {
            continue;
        }
        $fileCount++;
        $sizeBytes += $item->getSize();
        if ($fileCount >= $maxScannedFiles || microtime(true) >= $scanDeadline) {
            $scanComplete = false;
            break;
        }
    }

    return [
        'exists' => true,
        'writable' => is_writable($directory),
        'has_files' => $fileCount > 0,
        'scan_complete' => $scanComplete,
        'file_count' => $fileCount,
        'size_bytes' => $sizeBytes,
        'size_formatted' => formatBytes($sizeBytes)
    ];
}

function purgeImageryTileContents($directory) {
    $authorizedDirectory = getImageryTilesDirectory();
    $resolvedDirectory = realpath($directory);
    if ($authorizedDirectory === null || $resolvedDirectory === false || $resolvedDirectory !== $authorizedDirectory) {
        throw new RuntimeException('Imagery tile cache path failed the purge safety check.');
    }

    $lockPath = dirname($directory) . DIRECTORY_SEPARATOR . '.imagery-purge.lock';
    $lockHandle = fopen($lockPath, 'c');
    if ($lockHandle === false || !flock($lockHandle, LOCK_EX)) {
        if (is_resource($lockHandle)) {
            fclose($lockHandle);
        }
        throw new RuntimeException('Unable to acquire the imagery cache purge lock.');
    }

    $deletedFiles = 0;
    $deletedBytes = 0;
    $failedItems = 0;

    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $item) {
            $path = $item->getPathname();
            if ($item->isLink()) {
                if (!unlink($path)) {
                    $failedItems++;
                }
            } elseif ($item->isFile()) {
                $fileSize = $item->getSize();
                if (unlink($path)) {
                    $deletedFiles++;
                    $deletedBytes += $fileSize;
                } else {
                    $failedItems++;
                }
            } elseif ($item->isDir() && !rmdir($path)) {
                $failedItems++;
            }
        }
    } finally {
        flock($lockHandle, LOCK_UN);
        fclose($lockHandle);
    }

    clearstatcache(true, $directory);
    return [
        'deleted_files' => $deletedFiles,
        'deleted_bytes' => $deletedBytes,
        'failed_items' => $failedItems
    ];
}

function handleGetImageryCacheStats() {
    try {
        echo json_encode(getImageryCacheStats());
    } catch (Throwable $error) {
        http_response_code(500);
        auditLog('Imagery cache stats failed from ' . getRemoteIP() . ': ' . $error->getMessage());
        echo json_encode(['error' => 'Unable to inspect the imagery tile cache.']);
    }
}

function handlePurgeImageryCache() {
    if (!file_exists(IMAGERY_TILES_DIR)) {
        echo json_encode([
            'success' => true,
            'deleted_files' => 0,
            'deleted_bytes' => 0,
            'deleted_size_formatted' => '0 B',
            'stats' => getImageryCacheStats()
        ]);
        return;
    }

    $directory = getImageryTilesDirectory();
    if ($directory === null || !is_writable($directory)) {
        http_response_code(500);
        auditLog('Rejected imagery cache purge from ' . getRemoteIP());
        echo json_encode(['error' => 'Imagery tile cache is unavailable or not writable.']);
        return;
    }

    try {
        $result = purgeImageryTileContents($directory);
        $stats = getImageryCacheStats();
        auditLog(
            'Imagery cache purge from ' . getRemoteIP() . ': deleted ' .
            $result['deleted_files'] . ' files (' . $result['deleted_bytes'] .
            ' bytes), failures ' . $result['failed_items']
        );

        if ($result['failed_items'] > 0) {
            http_response_code(500);
            echo json_encode([
                'error' => 'The purge was only partially completed. Review file permissions and try again.',
                'deleted_files' => $result['deleted_files'],
                'deleted_bytes' => $result['deleted_bytes'],
                'failed_items' => $result['failed_items'],
                'stats' => $stats
            ]);
            return;
        }

        echo json_encode([
            'success' => true,
            'deleted_files' => $result['deleted_files'],
            'deleted_bytes' => $result['deleted_bytes'],
            'deleted_size_formatted' => formatBytes($result['deleted_bytes']),
            'stats' => $stats
        ]);
    } catch (Throwable $error) {
        http_response_code(500);
        auditLog('Imagery cache purge failed from ' . getRemoteIP() . ': ' . $error->getMessage());
        echo json_encode(['error' => 'Unable to purge the imagery tile cache.']);
    }
}

function handleHealthCheck() {
    rotateDashboardLogs(getScripts());
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
                    'last_error_time' => $lastErrorTime
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
                            'last_error_time' => $lastErrorTime
                        ];
                    }
                }
            }
        }
    }

    // Check temporary San Diego logs
    $tempSanDiegoLogDir = BASE_DIR . '/counties/san-diego/logs';
    if (is_dir($tempSanDiegoLogDir)) {
        $tempSanDiegoFiles = glob($tempSanDiegoLogDir . '/cron_*.log');
        foreach ($tempSanDiegoFiles as $file) {
            if (filemtime($file) > $since24h) {
                $content = file_get_contents($file);
                $errorCount = substr_count(strtolower($content), 'error') + substr_count(strtolower($content), 'failed');

                if ($errorCount > 0) {
                    $scriptName = basename($file, '.log');
                    $scriptName = str_replace('cron_', '', $scriptName);

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
                        'script' => 'San Diego ' . ucwords(str_replace('_', ' ', $scriptName)),
                        'error_count' => $errorCount,
                        'last_error_time' => $lastErrorTime
                    ];
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
        rotateDashboardLogs($scripts);
        echo json_encode(getPublicDashboardScripts(getScripts()));
    } catch (Throwable $error) {
        http_response_code(500);
        auditLog('Script inventory failed from ' . getRemoteIP() . ': ' . $error->getMessage());
        echo json_encode(['error' => 'Failed to load the script inventory.']);
    }
}

?>
