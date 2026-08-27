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
define('IMAGERY_TILES_DIR', BASE_DIR . '/js/data/tiles/esri-imagery');

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

        /* 2026 authenticated operations console */
        :root {
            color-scheme: dark;
            --page: #07111f;
            --page-soft: #0b192b;
            --panel: rgba(13, 29, 48, 0.94);
            --panel-raised: #10243a;
            --panel-soft: #132a43;
            --line: rgba(148, 174, 204, 0.18);
            --line-strong: rgba(148, 174, 204, 0.3);
            --text: #f3f7fb;
            --muted: #9eb0c4;
            --blue: #43a7ff;
            --blue-strong: #168ce8;
            --green: #5fd6a0;
            --amber: #f6c968;
            --red: #ff7d82;
            --shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
        }

        body {
            position: relative;
            padding: 28px;
            color: var(--text);
            background:
                radial-gradient(circle at 12% 0%, rgba(21, 122, 203, 0.22), transparent 32rem),
                radial-gradient(circle at 88% 6%, rgba(32, 166, 145, 0.13), transparent 28rem),
                linear-gradient(160deg, var(--page) 0%, #081522 48%, #06101c 100%);
        }

        body::before {
            position: fixed;
            inset: 0;
            z-index: -1;
            content: '';
            opacity: 0.28;
            background-image: linear-gradient(rgba(255, 255, 255, 0.022) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.022) 1px, transparent 1px);
            background-size: 32px 32px;
            pointer-events: none;
        }

        .dashboard-container {
            max-width: 1540px;
        }

        .header {
            gap: 28px;
            padding: 24px 26px;
            margin-bottom: 16px;
            color: var(--text);
            background: linear-gradient(135deg, rgba(17, 42, 68, 0.98), rgba(9, 25, 43, 0.98));
            border: 1px solid var(--line-strong);
            border-radius: 18px;
            box-shadow: var(--shadow);
            backdrop-filter: blur(18px);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 16px;
            min-width: 0;
        }

        .brand-mark {
            display: grid;
            flex: 0 0 52px;
            width: 52px;
            height: 52px;
            place-items: center;
            color: #06111d;
            background: linear-gradient(145deg, #6fc3ff, #53ddb4);
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(64, 173, 237, 0.24);
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.04em;
        }

        .eyebrow,
        .section-kicker {
            margin: 0 0 5px;
            color: #74c6ff;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
        }

        .header h1 {
            margin: 0;
            color: var(--text);
            font-size: clamp(22px, 3vw, 32px);
            line-height: 1.1;
            letter-spacing: -0.035em;
        }

        .header-subtitle {
            margin: 6px 0 0;
            color: var(--muted);
            font-size: 13px;
        }

        .header-controls {
            justify-content: flex-end;
            flex-wrap: wrap;
        }

        .status-indicator {
            min-height: 38px;
            padding: 8px 13px;
            color: var(--text);
            background: rgba(95, 214, 160, 0.1);
            border: 1px solid rgba(95, 214, 160, 0.35);
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
        }

        .status-indicator::before {
            width: 8px;
            height: 8px;
            content: '';
            background: currentColor;
            border-radius: 50%;
            box-shadow: 0 0 0 5px rgba(95, 214, 160, 0.09);
        }

        .status-indicator.status-healthy { color: var(--green); background: rgba(95, 214, 160, 0.1); }
        .status-indicator.status-warning { color: var(--amber); background: rgba(246, 201, 104, 0.1); border-color: rgba(246, 201, 104, 0.35); }
        .status-indicator.status-error { color: var(--red); background: rgba(255, 125, 130, 0.1); border-color: rgba(255, 125, 130, 0.35); }

        .overview-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 16px;
        }

        .overview-stat {
            min-height: 104px;
            padding: 18px 20px;
            background: rgba(12, 29, 48, 0.88);
            border: 1px solid var(--line);
            border-radius: 15px;
            box-shadow: 0 12px 34px rgba(0, 0, 0, 0.16);
        }

        .overview-label,
        .overview-note {
            display: block;
            color: var(--muted);
            font-size: 12px;
        }

        .overview-value {
            display: block;
            margin: 7px 0 5px;
            color: var(--text);
            font-size: 25px;
            font-weight: 850;
            line-height: 1;
            letter-spacing: -0.04em;
        }

        .overview-value.healthy { color: var(--green); }
        .overview-value.attention { color: var(--amber); }

        .dashboard-grid {
            grid-template-columns: repeat(12, minmax(0, 1fr));
            gap: 16px;
        }

        .card {
            grid-column: span 6;
            min-width: 0;
            padding: 22px;
            color: var(--text);
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 17px;
            box-shadow: 0 15px 44px rgba(0, 0, 0, 0.18);
            backdrop-filter: blur(15px);
        }

        .card.card-wide { grid-column: 1 / -1; }

        .card-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 17px;
        }

        details.card > summary.card-heading {
            margin-bottom: 0;
            cursor: pointer;
            list-style: none;
            user-select: none;
        }

        details.card > summary.card-heading::-webkit-details-marker {
            display: none;
        }

        details.card > summary.card-heading > div {
            margin-right: auto;
        }

        details.card > summary.card-heading::after {
            flex: 0 0 auto;
            width: 9px;
            height: 9px;
            margin: 4px 3px 0 0;
            content: '';
            border-right: 2px solid #9ed4fb;
            border-bottom: 2px solid #9ed4fb;
            transform: rotate(45deg);
            transition: transform 0.18s ease, margin-top 0.18s ease;
        }

        details.card:not([open]) > summary.card-heading::after {
            margin-top: 7px;
            transform: rotate(-45deg);
        }

        details.card[open] > summary.card-heading {
            margin-bottom: 17px;
        }

        details.card > summary.card-heading:focus-visible {
            outline: 2px solid var(--blue);
            outline-offset: 6px;
            border-radius: 8px;
        }

        .card h2,
        .modal-content h2 {
            margin: 0;
            color: var(--text);
            font-size: 18px;
            letter-spacing: -0.02em;
        }

        .section-count {
            min-width: 32px;
            padding: 5px 9px;
            color: #9ed4fb;
            background: rgba(67, 167, 255, 0.1);
            border: 1px solid rgba(67, 167, 255, 0.2);
            border-radius: 999px;
            text-align: center;
            font-size: 12px;
            font-weight: 800;
        }

        .county-filter {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            padding: 11px 13px;
            margin-bottom: 14px;
            background: rgba(255, 255, 255, 0.025);
            border-color: var(--line);
            border-radius: 10px;
        }

        .county-filter label { color: var(--muted); }

        .county-filter select,
        #script-params {
            color: var(--text);
            background: #0b1b2d;
            border: 1px solid var(--line-strong);
            border-radius: 8px;
        }

        .county-filter select:focus,
        #script-params:focus {
            border-color: var(--blue);
            box-shadow: 0 0 0 3px rgba(67, 167, 255, 0.12);
        }

        .script-list {
            display: grid;
            gap: 10px;
        }

        .script-list--two {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .script-item {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 14px;
            padding: 14px;
            margin: 0;
            background: rgba(255, 255, 255, 0.025);
            border: 1px solid var(--line);
            border-left: 3px solid var(--green);
            border-radius: 11px;
        }

        .script-item.is-stale { border-left-color: var(--amber); }
        .script-item.is-never { border-left-color: var(--muted); }
        .script-info { min-width: 0; margin: 0; }

        .script-title-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 5px;
        }

        .script-name {
            min-width: 0;
            margin: 0;
            overflow: hidden;
            color: var(--text);
            font-size: 14px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .freshness-pill {
            flex: 0 0 auto;
            padding: 3px 7px;
            color: var(--green);
            background: rgba(95, 214, 160, 0.09);
            border-radius: 999px;
            font-size: 9px;
            font-weight: 850;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .freshness-pill.stale { color: var(--amber); background: rgba(246, 201, 104, 0.09); }
        .freshness-pill.never { color: var(--muted); background: rgba(158, 176, 196, 0.09); }

        .script-description {
            margin-bottom: 7px;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.35;
        }

        .script-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 6px 12px;
            color: #8398ae;
            font-size: 11px;
        }

        .script-meta span { display: inline-flex; align-items: center; gap: 5px; }

        .script-actions {
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 6px;
        }

        .btn {
            min-height: 34px;
            padding: 7px 11px;
            color: var(--text);
            background: rgba(255, 255, 255, 0.055);
            border: 1px solid var(--line-strong);
            border-radius: 8px;
            font-size: 11px;
            font-weight: 750;
            transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }

        .btn:hover { transform: translateY(-1px); border-color: rgba(148, 174, 204, 0.5); }
        .btn-primary { color: #06111d; background: var(--blue); border-color: var(--blue); }
        .btn-primary:hover { background: #71bcf8; }
        .btn-success { color: #07150f; background: var(--green); border-color: var(--green); }
        .btn-success:hover { background: #83e3ba; }
        .btn-warning { color: var(--text); background: rgba(246, 201, 104, 0.1); border-color: rgba(246, 201, 104, 0.35); }
        .btn-warning:hover { background: rgba(246, 201, 104, 0.17); }
        .btn-danger { color: #ffb0b3; background: rgba(255, 125, 130, 0.09); border-color: rgba(255, 125, 130, 0.3); }
        .btn-danger:hover { color: #ffe3e4; background: rgba(255, 125, 130, 0.16); }
        .btn:disabled { transform: none; }

        .cache-stat {
            background: rgba(255, 255, 255, 0.025);
            border-color: var(--line);
            border-radius: 11px;
        }

        .cache-stat strong { color: var(--text); }
        .cache-stat span,
        .cache-note,
        .cache-action-status { color: var(--muted); }
        .cache-action-status.success { color: var(--green); }
        .cache-action-status.error { color: var(--red); }

        .health-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }

        .health-stat {
            padding: 13px;
            background: rgba(255, 255, 255, 0.025);
            border: 1px solid var(--line);
            border-radius: 10px;
        }

        .health-stat span { display: block; margin-bottom: 5px; color: var(--muted); font-size: 11px; }
        .health-stat strong { font-size: 15px; }
        .health-good { color: var(--green); }
        .health-warn { color: var(--amber); }
        .health-error { color: var(--red); }
        .failure-details { margin-top: 12px; color: var(--muted); font-size: 12px; }
        .failure-details summary { cursor: pointer; color: var(--amber); font-weight: 750; }
        .failure-details ul { margin: 10px 0 0; padding-left: 20px; }

        .modal {
            padding: 24px;
            background: rgba(2, 8, 15, 0.78);
            backdrop-filter: blur(10px);
        }

        .modal-content {
            position: relative;
            margin: 4vh auto;
            padding: 24px;
            color: var(--text);
            background: #0d2035;
            border: 1px solid var(--line-strong);
            border-radius: 15px;
            box-shadow: var(--shadow);
        }

        .close {
            position: absolute;
            top: 14px;
            right: 14px;
            float: none;
            width: 36px;
            height: 36px;
            padding: 0;
            color: var(--muted);
            background: transparent;
            border: 1px solid var(--line);
            border-radius: 8px;
            font-size: 22px;
            line-height: 1;
        }

        .close:hover { color: var(--text); background: rgba(255, 255, 255, 0.05); }
        .log-viewer,
        .execution-output { margin-top: 18px; background: #050c14; border: 1px solid var(--line); border-radius: 10px; }
        #execute-form { display: flex; align-items: flex-end; gap: 9px; margin-top: 18px; }
        #execute-form label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
        #script-params { flex: 1; min-width: 0; padding: 9px 11px; }

        .loading,
        .empty-state {
            color: var(--muted);
            text-align: center;
        }

        .empty-state { padding: 24px; border: 1px dashed var(--line); border-radius: 10px; }
        .empty-state.error { color: var(--red); }
        .spinner { border-color: rgba(255, 255, 255, 0.1); border-top-color: var(--blue); }

        @media (max-width: 1100px) {
            .script-list--two { grid-template-columns: 1fr; }
        }

        @media (max-width: 860px) {
            body { padding: 16px; }
            .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .card { grid-column: 1 / -1; }
            .header { align-items: flex-start; }
            .header-controls { justify-content: flex-start; }
        }

        @media (max-width: 600px) {
            body { padding: 10px; }
            .header { padding: 18px; }
            .brand-mark { flex-basis: 44px; width: 44px; height: 44px; border-radius: 12px; }
            .overview-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
            .overview-stat { min-height: 92px; padding: 15px; }
            .overview-value { font-size: 21px; }
            .card { padding: 17px; }
            .script-item { grid-template-columns: 1fr; }
            .script-actions { justify-content: flex-start; }
            .county-filter { align-items: stretch; flex-direction: column; }
            .county-filter select { width: 100%; }
            .modal { padding: 10px; }
            .modal-content { width: 100%; padding: 20px; }
            #execute-form { align-items: stretch; flex-direction: column; }
            #execute-form .btn,
            #script-params { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <header class="header">
            <div class="brand">
                <div class="brand-mark" aria-hidden="true">WX</div>
                <div>
                    <p class="eyebrow">NCHurricane operations</p>
                    <h1>Weather System Dashboard</h1>
                    <p class="header-subtitle">Cache health, automation cadence, and controlled maintenance</p>
                </div>
            </div>
            <div class="header-controls">
                <div id="system-status" class="status-indicator status-healthy">System healthy</div>
                <button class="btn btn-warning" type="button" onclick="debugPaths()">Path diagnostics</button>
                <button class="btn btn-success" type="button" onclick="testScripts()">Verify inventory</button>
                <form method="post" class="logout-form">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES) ?>">
                    <button class="btn btn-danger" type="submit" name="logout" value="1">Logout</button>
                </form>
            </div>
        </header>

        <section class="overview-grid" aria-label="Automation overview">
            <article class="overview-stat">
                <span class="overview-label">Automation inventory</span>
                <strong id="automation-count" class="overview-value">—</strong>
                <span class="overview-note">Scheduled PHP jobs</span>
            </article>
            <article class="overview-stat">
                <span class="overview-label">On schedule</span>
                <strong id="automation-healthy" class="overview-value healthy">—</strong>
                <span class="overview-note">Within freshness window</span>
            </article>
            <article class="overview-stat">
                <span class="overview-label">Needs review</span>
                <strong id="automation-attention" class="overview-value attention">—</strong>
                <span class="overview-note">Stale or missing run evidence</span>
            </article>
            <article class="overview-stat">
                <span class="overview-label">Last dashboard refresh</span>
                <strong id="last-refresh" class="overview-value">—</strong>
                <span class="overview-note">Automatic refresh every 5 minutes</span>
            </article>
        </section>

        <div class="dashboard-grid">
            <!-- Tropical Systems -->
            <details class="card card-wide" data-section-id="tropical" open>
                <summary class="card-heading">
                    <div>
                        <p class="section-kicker">Storm pipeline</p>
                        <h2>Tropical Systems</h2>
                    </div>
                    <span id="tropical-count" class="section-count">—</span>
                </summary>
                <div id="tropical-scripts" class="loading script-list">
                    <div class="spinner"></div>
                    <p>Loading scripts...</p>
                </div>
            </details>

            <!-- County Weather -->
            <details class="card card-wide" data-section-id="north-carolina" open>
                <summary class="card-heading">
                    <div>
                        <p class="section-kicker">North Carolina</p>
                        <h2>County Weather</h2>
                    </div>
                    <span id="county-count" class="section-count">—</span>
                </summary>
                <div class="county-filter">
                    <label for="county-select">Filter automation inventory</label>
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
                <div id="county-scripts" class="loading script-list script-list--two">
                    <div class="spinner"></div>
                    <p>Loading scripts...</p>
                </div>
            </details>

            <!-- San Diego Weather -->
            <details class="card" data-section-id="san-diego" open>
                <summary class="card-heading">
                    <div>
                        <p class="section-kicker">California</p>
                        <h2>San Diego County</h2>
                    </div>
                    <span id="san-diego-count" class="section-count">—</span>
                </summary>
                <div id="temp-san-diego-scripts" class="loading script-list">
                    <div class="spinner"></div>
                    <p>Loading scripts...</p>
                </div>
            </details>

            <!-- Cache Management -->
            <details class="card" data-section-id="cache-management" open>
                <summary class="card-heading">
                    <div>
                        <p class="section-kicker">Shared data</p>
                        <h2>Cache Management</h2>
                    </div>
                    <span id="cache-count" class="section-count">—</span>
                </summary>
                <div id="cache-scripts" class="loading script-list">
                    <div class="spinner"></div>
                    <p>Loading scripts...</p>
                </div>
            </details>

            <!-- Generated Imagery Tile Cache -->
            <details class="card" data-section-id="imagery-cache" open>
                <summary class="card-heading">
                    <div>
                        <p class="section-kicker">Storage</p>
                        <h2>Imagery Tile Cache</h2>
                    </div>
                </summary>
                <p class="cache-note">Review and purge generated Esri imagery basemap tiles. This action does not affect other basemap tiles, source data, or application code.</p>
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
            </details>

            <!-- System Health -->
            <details class="card" data-section-id="system-health" open>
                <summary class="card-heading">
                    <div>
                        <p class="section-kicker">Runtime</p>
                        <h2>System Health</h2>
                    </div>
                </summary>
                <div id="health-info" class="loading">
                    <div class="spinner"></div>
                    <p>Loading health info...</p>
                </div>
            </details>
        </div>
    </div>

    <!-- Modals -->
    <div id="logModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="log-title">
        <div class="modal-content">
            <button class="close" type="button" aria-label="Close log viewer">&times;</button>
            <h2 id="log-title">Log Viewer</h2>
            <div id="log-content" class="log-viewer"></div>
        </div>
    </div>

    <div id="executeModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="execute-title">
        <div class="modal-content">
            <button class="close" type="button" aria-label="Close script runner">&times;</button>
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
            setupScriptActions();
            
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
                updateAutomationSummary(data);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                showLoadError('tropical-scripts', error.message);
                showLoadError('county-scripts', error.message);
                showLoadError('temp-san-diego-scripts', error.message);
                showLoadError('cache-scripts', error.message);
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

        function setupScriptActions() {
            document.addEventListener('click', event => {
                const button = event.target.closest('[data-script-action]');
                if (!button || button.disabled) return;

                const scriptId = button.dataset.scriptId || '';
                const scriptName = button.dataset.scriptName || '';
                const action = button.dataset.scriptAction;

                if (action === 'execute') executeScript(scriptId, scriptName);
                if (action === 'log') viewLog(scriptId, scriptName);
                if (action === 'delete-log') deleteLog(scriptId, scriptName);
            });
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function showLoadError(containerId, message) {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            const error = document.createElement('div');
            error.className = 'empty-state error';
            error.textContent = `Unable to load: ${message}`;
            container.appendChild(error);
        }

        function updateAutomationSummary(data) {
            const groups = ['tropical', 'county', 'temp_san_diego', 'cache'];
            const scripts = groups.flatMap(group => data[group] || []);
            const healthy = scripts.filter(script => script.freshness === 'healthy').length;

            document.getElementById('automation-count').textContent = scripts.length.toLocaleString();
            document.getElementById('automation-healthy').textContent = healthy.toLocaleString();
            document.getElementById('automation-attention').textContent = (scripts.length - healthy).toLocaleString();
            document.getElementById('last-refresh').textContent = new Intl.DateTimeFormat([], {
                hour: 'numeric',
                minute: '2-digit'
            }).format(new Date());

            document.getElementById('tropical-count').textContent = (data.tropical || []).length;
            document.getElementById('san-diego-count').textContent = (data.temp_san_diego || []).length;
            document.getElementById('cache-count').textContent = (data.cache || []).length;
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
                `Permanently delete ${estimatePrefix}${fileCount} generated Esri imagery tile files (${estimatePrefix}${cacheSize})?\n\n` +
                'The imagery cache directory will remain in place, and tiles may be generated again as they are requested. Other basemap tiles are not affected.'
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
                container.innerHTML = '<div class="empty-state">No scripts found</div>';
                return;
            }

            const freshnessLabels = {
                healthy: 'On schedule',
                stale: 'Stale',
                never: 'No run data'
            };

            container.innerHTML = scripts.map(script => `
                <article class="script-item is-${escapeHtml(script.freshness || 'never')}">
                    <div class="script-info">
                        <div class="script-title-row">
                            <div class="script-name" title="${escapeHtml(script.name)}">${escapeHtml(script.name)}</div>
                            <span class="freshness-pill ${escapeHtml(script.freshness || 'never')}">${escapeHtml(freshnessLabels[script.freshness] || 'Unknown')}</span>
                        </div>
                        <div class="script-description">${escapeHtml(script.description || '')}</div>
                        <div class="script-meta">
                            <span>Schedule: ${escapeHtml(script.schedule || 'Manual')}</span>
                            <span>Last: ${escapeHtml(script.last_run || 'No run evidence')}</span>
                            <span>Log: ${escapeHtml(script.log_size || 'None')}</span>
                        </div>
                    </div>
                    <div class="script-actions">
                        <button class="btn btn-primary" type="button" data-script-action="execute" data-script-id="${escapeHtml(script.id)}" data-script-name="${escapeHtml(script.name)}">Run</button>
                        <button class="btn btn-warning" type="button" data-script-action="log" data-script-id="${escapeHtml(script.id)}" data-script-name="${escapeHtml(script.name)}" ${script.has_log ? '' : 'disabled'}>Log</button>
                        <button class="btn btn-danger" type="button" data-script-action="delete-log" data-script-id="${escapeHtml(script.id)}" data-script-name="${escapeHtml(script.name)}" ${script.has_log ? '' : 'disabled'}>Clear</button>
                    </div>
                </article>
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
            document.getElementById('county-count').textContent = selectedCounty
                ? `${filteredScripts.length}/${allCountyScripts.length}`
                : allCountyScripts.length;
        }

        function renderHealthInfo(health) {
            let failedScriptsHtml = '';
            if (health.failed_script_details && health.failed_script_details.length > 0) {
                failedScriptsHtml = `
                    <details class="failure-details">
                        <summary>Failed Scripts Details (${health.failed_script_details.length})</summary>
                        <ul>
                            ${health.failed_script_details.map(script => 
                                `<li><strong>${escapeHtml(script.script)}</strong>: ${Number(script.error_count) || 0} errors, last: ${escapeHtml(script.last_error_time)}</li>`
                            ).join('')}
                        </ul>
                    </details>
                `;
            }
            
            return `
                <div class="health-grid">
                    <div class="health-stat">
                        <span>NHC endpoint</span>
                        <strong class="${health.nhc_status === 'healthy' ? 'health-good' : 'health-error'}">${escapeHtml(health.nhc_status.toUpperCase())}</strong>
                    </div>
                    <div class="health-stat">
                        <span>Logs older than 7 days</span>
                        <strong class="${health.old_logs > 10 ? 'health-warn' : 'health-good'}">${Number(health.old_logs) || 0}</strong>
                    </div>
                    <div class="health-stat">
                        <span>Scripts with errors · 24h</span>
                        <strong class="${health.failed_scripts > 5 ? 'health-error' : health.failed_scripts > 0 ? 'health-warn' : 'health-good'}">${Number(health.failed_scripts) || 0}</strong>
                    </div>
                    <div class="health-stat">
                        <span>Overall state</span>
                        <strong class="${health.overall_status === 'healthy' ? 'health-good' : health.overall_status === 'warning' ? 'health-warn' : 'health-error'}">${escapeHtml(health.overall_status.toUpperCase())}</strong>
                    </div>
                </div>
                ${failedScriptsHtml}
            `;
        }

        function updateSystemStatus(status) {
            const statusEl = document.getElementById('system-status');
            statusEl.className = `status-indicator status-${status}`;
            
            const statusText = {
                'healthy': 'System healthy',
                'warning': 'System warning',
                'error': 'System error'
            };

            statusEl.textContent = statusText[status] || 'System status unavailable';
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
            } else if (scriptName === 'Tropical Map Builder') {
                defaultParams = 'all';
                placeholder = 'all or overview';
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
                } else if (currentScript.name === 'Tropical Map Builder') {
                    params = 'all';
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

function buildDashboardScriptEntry($group, $name, $path, $logPath, $schedule, $description, $staleAfterSeconds, $statusPath = null, $extraParams = null) {
    $statusPath = $statusPath ?: $logPath;
    $lastRunTimestamp = is_file($statusPath) ? (int) filemtime($statusPath) : null;
    $ageSeconds = $lastRunTimestamp === null ? null : max(0, time() - $lastRunTimestamp);
    $freshness = $lastRunTimestamp === null
        ? 'never'
        : ($ageSeconds > $staleAfterSeconds ? 'stale' : 'healthy');

    $entry = [
        'id' => getDashboardScriptId($group, $path),
        'name' => $name,
        'path' => $path,
        'log_path' => $logPath,
        'schedule' => $schedule,
        'description' => $description,
        'freshness' => $freshness,
        'last_run' => $lastRunTimestamp === null ? null : date('M j, H:i', $lastRunTimestamp),
        'last_run_epoch' => $lastRunTimestamp,
        'age_seconds' => $ageSeconds,
        'log_size' => is_file($logPath) ? formatBytes(filesize($logPath)) : null,
        'has_log' => is_file($logPath),
    ];

    if ($extraParams !== null) {
        $entry['extra_params'] = $extraParams;
    }

    return $entry;
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
        'advisory_writer.php' => ['Advisory Writer (Atlantic)', 'Hourly · :05 +20s', 'Atlantic advisory XML', 5400, 'cron_advisory_atl.log'],
        'advisory_writer_ep.php' => ['Advisory Writer (Eastern Pacific)', 'Hourly · :05 +25s', 'Eastern Pacific advisory XML', 5400, 'cron_advisory_ep.log'],
        'advisory_writer_cp.php' => ['Advisory Writer (Central Pacific)', 'Hourly · :05 +30s', 'Central Pacific advisory XML', 5400, 'cron_advisory_cp.log'],
        'tcv_writer.php' => ['TCV Writer (Atlantic)', 'Hourly · :05 +35s', 'Atlantic watch and warning zones', 5400, 'cron_tcv_atl.log'],
        'tcv_writer_ep.php' => ['TCV Writer (Eastern Pacific)', 'Hourly · :05 +40s', 'Eastern Pacific watch and warning zones', 5400, 'cron_tcv_ep.log'],
        'tcv_writer_cp.php' => ['TCV Writer (Central Pacific)', 'Hourly · :05 +45s', 'Central Pacific watch and warning zones', 5400, 'cron_tcv_cp.log'],
        'cxml_writer.php' => ['CXML Writer (Atlantic)', 'Hourly · :05 +50s', 'Atlantic compact storm data', 5400, 'cron_cxml_atl.log'],
        'cxml_writer_ep.php' => ['CXML Writer (Eastern Pacific)', 'Hourly · :05 +55s', 'Eastern Pacific compact storm data', 5400, 'cron_cxml_ep.log'],
        'cxml_writer_cp.php' => ['CXML Writer (Central Pacific)', 'Hourly · :06', 'Central Pacific compact storm data', 5400, 'cron_cxml_cp.log'],
        'mtcswa_fetcher.php' => ['MTCSWA Fetcher (All Basins)', 'Every 3 hours · :40', 'Satellite-derived surface wind analysis', 14400, 'cron_mtcswa.log'],
        'nhc_graphics_cache.php' => ['NHC Graphics Cache (Atlantic)', 'Hourly · :07', 'Atlantic NHC graphics', 5400, 'cron_graphics_atl.log'],
        'nhc_graphics_cache_ep.php' => ['NHC Graphics Cache (Eastern Pacific)', 'Hourly · :07 +20s', 'Eastern Pacific NHC graphics', 5400, 'cron_graphics_ep.log'],
        'nhc_graphics_cache_cp.php' => ['NHC Graphics Cache (Central Pacific)', 'Hourly · :07 +40s', 'Central Pacific NHC graphics', 5400, 'cron_graphics_cp.log'],
    ];

    foreach ($tropicalScripts as $file => $metadata) {
        $path = BASE_DIR . "/active/api/$file";
        if (file_exists($path)) {
            $logPath = LOGS_DIR . '/' . $metadata[4];
            $scripts['tropical'][] = buildDashboardScriptEntry(
                'tropical',
                $metadata[0],
                $path,
                $logPath,
                $metadata[1],
                $metadata[2],
                $metadata[3]
            );
        }
    }

    // Add warm_tiles.php as a special tropical script
    $warmTilesPath = BASE_DIR . '/active/api/warm_tiles.php';
    if (file_exists($warmTilesPath)) {
        $logPath = LOGS_DIR . '/cron_warm_tiles.log';
        $scripts['tropical'][] = buildDashboardScriptEntry(
            'tropical',
            'Tile Warmer (All Styles)',
            $warmTilesPath,
            $logPath,
            'Hourly · :10',
            'Preloads tropical watch and warning basemap tiles',
            5400,
            null,
            '--purge=1 (optional, to force overwrite)'
        );
    }
    
    // Cache scripts
    $cacheScripts = [
        'text_products_cache.php' => ['Text Products Cache', 'Hourly · :05 +10s', 'NHC advisories and discussions', 5400, 'cron_text_products.log'],
        'tropical_data.php' => ['Tropical Data Cache', 'Hourly · :05 +5s', 'Current NHC storm inventory', 5400, 'cron_tropical_data.log'],
        'cache_tropical.php' => ['Tropical Coordination Guard', 'Hourly · :08', 'Verifies the tropical cache is fresh', 5400, 'cron_cache_tropical.log'],
        'tropical_map_builder.php' => ['Tropical Map Builder', 'Hourly · :09', 'Publishes current-storm packages and basin overviews', 5400, 'cron_tropical_map_builder.log'],
    ];

    foreach ($cacheScripts as $file => $metadata) {
        $path = BASE_DIR . "/active/api/$file";
        if (file_exists($path)) {
            $logPath = LOGS_DIR . '/' . $metadata[4];
            $statusPath = $file === 'cache_tropical.php'
                ? BASE_DIR . '/active/cache/nhc_current_storms.json'
                : $logPath;
            $scripts['cache'][] = buildDashboardScriptEntry(
                'cache',
                $metadata[0],
                $path,
                $logPath,
                $metadata[1],
                $metadata[2],
                $metadata[3],
                $statusPath
            );
        }
    }

    $sharedConditionsScripts = [
        'cache_nc_conditions.php' => ['Shared NC Conditions Map', 'counties/bertie/logs/cron_nc_conditions.log', 'Every 30 minutes · :05/:35', 'North Carolina surface observations used by the homepage and county maps'],
        'cache_ca_conditions.php' => ['Shared California Conditions Map', 'counties/san-diego/logs/cron_ca_conditions.log', 'Every 30 minutes · :15/:45', 'California surface observations used by the San Diego county map'],
    ];

    foreach ($sharedConditionsScripts as $file => $metadata) {
        $path = BASE_DIR . "/counties/api/$file";
        if (file_exists($path)) {
            $scripts['cache'][] = buildDashboardScriptEntry(
                'cache',
                $metadata[0],
                $path,
                BASE_DIR . '/' . $metadata[1],
                $metadata[2],
                $metadata[3],
                3000
            );
        }
    }
    
    // County scripts
    $counties = ['bertie', 'pitt', 'beaufort', 'martin', 'dare', 'hyde', 'washington', 'tyrrell'];
    $countyScripts = [
        'cache_current.php' => ['Current Summary + Map Fallback', 'Hourly', 'Feeds the county summary and backs up statewide observations', 5400],
        'cache_forecast.php' => ['Forecast', 'Every 2 hours', 'NWS zone forecast cache', 10800],
        'cache_alerts.php' => ['Alerts', 'Every minute', 'Active NWS alerts', 300],
        'cache_afd.php' => ['Forecast Discussion', 'Hourly', 'NWS area forecast discussion', 7200],
    ];
    $countySchedule = [
        'bertie' => ['cache_current.php' => ':23', 'cache_forecast.php' => ':15', 'cache_alerts.php' => '+0s', 'cache_afd.php' => ':00'],
        'pitt' => ['cache_current.php' => ':24', 'cache_forecast.php' => ':16', 'cache_alerts.php' => '+7s', 'cache_afd.php' => ':01'],
        'beaufort' => ['cache_current.php' => ':25', 'cache_forecast.php' => ':17', 'cache_alerts.php' => '+14s', 'cache_afd.php' => ':02'],
        'martin' => ['cache_current.php' => ':26', 'cache_forecast.php' => ':18', 'cache_alerts.php' => '+21s', 'cache_afd.php' => ':03'],
        'dare' => ['cache_current.php' => ':27', 'cache_forecast.php' => ':19', 'cache_alerts.php' => '+28s', 'cache_afd.php' => ':04'],
        'hyde' => ['cache_current.php' => ':28', 'cache_forecast.php' => ':20', 'cache_alerts.php' => '+35s', 'cache_afd.php' => ':11'],
        'washington' => ['cache_current.php' => ':29', 'cache_forecast.php' => ':21', 'cache_alerts.php' => '+42s', 'cache_afd.php' => ':12'],
        'tyrrell' => ['cache_current.php' => ':30', 'cache_forecast.php' => ':22', 'cache_alerts.php' => '+49s', 'cache_afd.php' => ':13'],
    ];
    
    foreach ($counties as $county) {
        foreach ($countyScripts as $script => $metadata) {
            $path = BASE_DIR . "/counties/$county/api/$script";
            if (file_exists($path)) {
                $logPath = BASE_DIR . "/counties/$county/logs/cron_" . str_replace('cache_', '', str_replace('.php', '.log', $script));
                $scripts['county'][] = buildDashboardScriptEntry(
                    'county',
                    ucfirst($county) . ' · ' . $metadata[0],
                    $path,
                    $logPath,
                    $metadata[1] . ' · ' . $countySchedule[$county][$script],
                    $metadata[2],
                    $metadata[3]
                );
            }
        }
    }

    // Temporary San Diego county scripts
    $tempSanDiegoCounty = 'san-diego';
    $tempSanDiegoScripts = [
        'cache_current.php' => ['Current Summary + Map Fallback', 'Hourly · :54', 'Feeds the county summary and backs up statewide observations', 5400],
        'cache_forecast.php' => ['Forecast', 'Every 2 hours · :31', 'NWS zone forecast cache', 10800],
        'cache_alerts.php' => ['Alerts', 'Every minute · +56s', 'Active NWS alerts', 300],
        'cache_afd.php' => ['Forecast Discussion', 'Hourly · :14', 'NWS area forecast discussion', 7200],
    ];

    foreach ($tempSanDiegoScripts as $script => $metadata) {
        $path = BASE_DIR . "/counties/$tempSanDiegoCounty/api/$script";
        if (file_exists($path)) {
            $logPath = BASE_DIR . "/counties/$tempSanDiegoCounty/logs/cron_" . str_replace('cache_', '', str_replace('.php', '.log', $script));
            $scripts['temp_san_diego'][] = buildDashboardScriptEntry(
                'temp_san_diego',
                'San Diego · ' . $metadata[0],
                $path,
                $logPath,
                $metadata[1],
                $metadata[2],
                $metadata[3]
            );
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
