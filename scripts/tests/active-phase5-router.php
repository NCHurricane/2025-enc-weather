<?php
declare(strict_types=1);

const ACTIVE_PHASE5_SCENARIOS = [
    'issued',
    'partial',
    'not-issued',
    'advisory-mismatch',
    'map-mismatch',
];

const ACTIVE_PHASE5_STORMS = [
    'AL052025',
    'EP152025',
    'CP012026',
];

function activePhase5Scenario(string $path): string
{
    $requested = isset($_GET['fixture']) ? (string) $_GET['fixture'] : '';
    if ($requested !== '') {
        if (!in_array($requested, ACTIVE_PHASE5_SCENARIOS, true)) {
            http_response_code(400);
            header('Content-Type: text/plain; charset=utf-8');
            echo "Unknown Active Phase 5 fixture scenario.\n";
            exit;
        }
        setcookie('nch_active_phase5_fixture', $requested, [
            'expires' => 0,
            'path' => '/',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        return $requested;
    }

    $cookie = (string) ($_COOKIE['nch_active_phase5_fixture'] ?? '');
    if (in_array($cookie, ACTIVE_PHASE5_SCENARIOS, true)) {
        return $cookie;
    }

    if ($path === '/active/' || $path === '/active/index.html') {
        $stormId = strtoupper((string) ($_GET['storm'] ?? ''));
        return match ($stormId) {
            'EP152025' => 'partial',
            'CP012026' => 'not-issued',
            default => 'issued',
        };
    }

    return 'issued';
}

function activePhase5SendFile(string $file, string $scenario): never
{
    if (!is_file($file)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Fixture file not found.\n";
        exit;
    }

    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $contentType = match ($extension) {
        'html' => 'text/html; charset=utf-8',
        'geojson' => 'application/geo+json; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        default => 'application/octet-stream',
    };

    header("Content-Type: {$contentType}");
    header('Cache-Control: no-store');
    header("X-NCH-Active-Phase5-Fixture: {$scenario}");
    readfile($file);
    exit;
}

$requestUri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
$path = parse_url($requestUri, PHP_URL_PATH);
$path = is_string($path) ? $path : '/';
$scenario = activePhase5Scenario($path);
$repositoryRoot = dirname(__DIR__, 2);
$fixtureRoot = __DIR__ . '/fixtures/active-phase5';

if ($path === '/active/' || $path === '/active/index.html') {
    activePhase5SendFile($repositoryRoot . '/active/index.html', $scenario);
}

if ($path === '/active/cache/nhc_current_storms.json') {
    activePhase5SendFile($fixtureRoot . '/active-storms.json', $scenario);
}

if (preg_match('#^/active/storms/((?:AL|EP|CP)\d{6})/(.+)$#', $path, $matches) === 1) {
    $stormId = $matches[1];
    $relative = $matches[2];
    if (!in_array($stormId, ACTIVE_PHASE5_STORMS, true)) {
        http_response_code(404);
        exit;
    }

    $allowedRootFiles = [
        'advisory.json',
        'storm.json',
        'tcv.json',
        'graphics-manifest.json',
        'text-products-manifest.json',
    ];
    $allowedMapFiles = [
        'manifest.json',
        'current-position.geojson',
        'forecast-track.geojson',
        'cone.geojson',
        'watches-warnings.geojson',
        'best-track.geojson',
        'surge-warnings.geojson',
        'wind-radii.geojson',
    ];
    $isAllowed = in_array($relative, $allowedRootFiles, true)
        || preg_match('/^(?:TCP|TCM|TCD|PWS|TCU)(?:AT|EP|CP)[1-5]\.json$/', $relative) === 1
        || (str_starts_with($relative, 'map/')
            && in_array(substr($relative, 4), $allowedMapFiles, true));
    if (!$isAllowed) {
        http_response_code(404);
        exit;
    }

    $fixtureStormId = $stormId;
    if ($scenario === 'advisory-mismatch' && $stormId === 'AL052025' && $relative === 'advisory.json') {
        $fixtureStormId = 'EP152025';
    }
    if ($scenario === 'map-mismatch' && $stormId === 'AL052025' && $relative === 'map/manifest.json') {
        $fixtureStormId = 'EP152025';
    }

    $target = $fixtureRoot . '/storms/' . $fixtureStormId . '/' . $relative;
    activePhase5SendFile($target, $scenario);
}

return false;
