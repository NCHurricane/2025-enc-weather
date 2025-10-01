<?php
declare(strict_types=1);
error_reporting(E_ALL);

/**
 * cache_tropical.php
 *
 * Lightweight guard that ensures the tropical cache is present/fresh enough.
 * If stale/missing, it invokes tropical_data.php with --cron (best effort).
 * Returns a tiny JSON status if called via browser.
 *
 * TTL: 30 minutes (1800s)
 */


$BASE_DIR     = __DIR__;
$ROOT_DIR     = dirname(__DIR__, 2);
$CACHE_FILE   = $ROOT_DIR . '/active/cache/nhc_current_storms.json';
$SUMMARY_FILE = $ROOT_DIR . '/active/cache/tropical_summary_at.json';
$WRITER       = $BASE_DIR . '/tropical_data.php';
$PHP_BIN      = PHP_BINARY ?: '/usr/bin/php8.4';
$TTL_SECONDS  = 1800;

function logMsg(string $m, string $lvl='INFO'): void {
    error_log("[cache_tropical][{$lvl}] " . $m);
}

function fresh(string $file, int $ttl): bool {
    return is_file($file) && (time() - filemtime($file) <= $ttl);
}

try {
    $needsRefresh = !(fresh($CACHE_FILE, $TTL_SECONDS) && fresh($SUMMARY_FILE, $TTL_SECONDS));
    if ($needsRefresh) {
        logMsg('Cache stale/missing; invoking writer');
        if (is_file($WRITER)) {
            $cmd = escapeshellcmd($PHP_BIN) . ' -f ' . escapeshellarg($WRITER) . ' -- --cron';
            exec($cmd, $out, $code);
            if ($code !== 0) {
                logMsg("Writer returned code {$code}", 'ERROR');
            } else {
                logMsg('Writer invoked successfully');
            }
        } else {
            logMsg('Writer not found: ' . $WRITER, 'ERROR');
        }
    } else {
        logMsg('Cache fresh; no action needed');
    }

    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'cache_exists'   => is_file($CACHE_FILE),
            'summary_exists' => is_file($SUMMARY_FILE),
            'cache_mtime'    => is_file($CACHE_FILE)   ? date('c', filemtime($CACHE_FILE))   : null,
            'summary_mtime'  => is_file($SUMMARY_FILE) ? date('c', filemtime($SUMMARY_FILE)) : null,
            'fresh'          => fresh($CACHE_FILE, $TTL_SECONDS) && fresh($SUMMARY_FILE, $TTL_SECONDS),
            'now'            => date('c'),
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

} catch (Throwable $e) {
    logMsg('Unhandled: ' . $e->getMessage(), 'ERROR');
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json; charset=utf-8', true, 500);
        echo json_encode(['error' => 'cache_tropical failure', 'detail' => $e->getMessage()]);
    }
}
