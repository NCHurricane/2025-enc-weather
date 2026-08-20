<?php
declare(strict_types=1);

require_once __DIR__ . '/tropical_map_lib.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

const TROPICAL_MAP_CURRENT_STORMS_URL = 'https://www.nhc.noaa.gov/CurrentStorms.json';
const TROPICAL_MAP_OUTLOOK_URLS = [
    'atl' => [
        'json' => 'https://www.nhc.noaa.gov/xgtwo/xgtwo_atl.json',
        'kmz' => 'https://www.nhc.noaa.gov/xgtwo/gtwo_atl.kmz',
    ],
    'epac' => [
        'json' => 'https://www.nhc.noaa.gov/xgtwo/xgtwo_pac.json',
        'kmz' => 'https://www.nhc.noaa.gov/xgtwo/gtwo_pac.kmz',
    ],
    'cpac' => [
        'json' => 'https://www.nhc.noaa.gov/xgtwo/xgtwo_cpac.json',
        'kmz' => 'https://www.nhc.noaa.gov/xgtwo/gtwo_cpac.kmz',
    ],
];

function tropicalMapUsage(): void
{
    $script = basename(__FILE__);
    echo <<<TEXT
Usage:
  php {$script} overview [--basin=atl|epac|cpac|all] [--fixtures]
  php {$script} storm --storm=ATCF_ID [--fixtures]
  php {$script} all [--basin=atl|epac|cpac|all] [--fixtures]

Options:
  --fixtures                 Use immutable test fixtures; never access the network.
  --fixture-root=PATH        Override test/fixtures/tropical-map/official.
  --overview-output=PATH     Override active/cache/tropical-map.
  --storm-root=PATH          Override active/storms.
  --generated-at=ISO         Deterministic package time for tests.

The command is CLI-only. It publishes validated JSON atomically and preserves
the last-known-good overview package as stale when a live refresh fails.
TEXT;
}

/** @return array{mode:string,options:array<string,string|bool>} */
function tropicalMapParseArguments(array $arguments): array
{
    array_shift($arguments);
    $mode = 'overview';
    $options = [];
    if ($arguments !== [] && !str_starts_with($arguments[0], '--')) {
        $mode = strtolower((string) array_shift($arguments));
    }
    if (!in_array($mode, ['overview', 'storm', 'all', 'help'], true)) {
        throw new TropicalMapException("Unknown builder mode: {$mode}");
    }
    foreach ($arguments as $argument) {
        if ($argument === '--fixtures') {
            $options['fixtures'] = true;
            continue;
        }
        if (!str_starts_with($argument, '--') || !str_contains($argument, '=')) {
            throw new TropicalMapException("Invalid option: {$argument}");
        }
        [$key, $value] = explode('=', substr($argument, 2), 2);
        if (!in_array($key, [
            'basin',
            'storm',
            'fixture-root',
            'overview-output',
            'storm-root',
            'generated-at',
        ], true)) {
            throw new TropicalMapException("Unknown option: --{$key}");
        }
        if ($value === '') {
            throw new TropicalMapException("Option --{$key} cannot be empty");
        }
        $options[$key] = $value;
    }
    return ['mode' => $mode, 'options' => $options];
}

function tropicalMapAbsoluteOrRepositoryPath(string $path): string
{
    if (preg_match('~^[A-Za-z]:[\\\\/]~', $path) || str_starts_with($path, '/')) {
        return rtrim($path, '/\\');
    }
    return rtrim(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . $path, '/\\');
}

/** @return array<string,string> */
function tropicalMapFixtureProductMap(string $fixtureRoot): array
{
    return [
        'CP012026:forecastTrack' => $fixtureRoot . '/CP012026_023adv_TRACK.kmz',
        'CP012026:trackCone' => $fixtureRoot . '/CP012026_023adv_CONE.kmz',
        'CP012026:initialWindExtent' => $fixtureRoot . '/CP012026_2026081803_initialradii.kmz',
        'CP012026:forecastWindRadiiGIS' => $fixtureRoot . '/CP012026_2026081803_forecastradii.kmz',
    ];
}

/**
 * @return array{
 *   currentStorms:array,
 *   outlooks:array<string,array{payload:array,kmzPath:string}>,
 *   sourceErrors:array<string,Throwable>,
 *   provider:callable,
 *   cleanup:callable
 * }
 */
function tropicalMapCreateSources(bool $fixtures, string $fixtureRoot, array $requestedBasins): array
{
    if ($fixtures) {
        $currentStorms = TropicalMapLib::readJsonFile($fixtureRoot . '/CurrentStorms.json');
        $outlooks = [];
        $files = ['atl' => 'atl', 'epac' => 'pac', 'cpac' => 'cpac'];
        foreach ($requestedBasins as $basin) {
            $suffix = $files[$basin];
            $outlooks[$basin] = [
                'payload' => TropicalMapLib::readJsonFile($fixtureRoot . "/xgtwo_{$suffix}.json"),
                'kmzPath' => $fixtureRoot . "/gtwo_{$suffix}.kmz",
            ];
        }
        $productMap = tropicalMapFixtureProductMap($fixtureRoot);
        $provider = static function (array $storm, string $productKey) use ($productMap): ?string {
            $stormId = TropicalMapLib::validateStormId((string) ($storm['id'] ?? ''));
            $path = $productMap["{$stormId}:{$productKey}"] ?? null;
            if ($path !== null && !is_file($path)) {
                throw new TropicalMapException("Fixture product is missing: {$path}");
            }
            return $path;
        };
        return [
            'currentStorms' => $currentStorms,
            'outlooks' => $outlooks,
            'sourceErrors' => [],
            'provider' => $provider,
            'cleanup' => static function (): void {},
        ];
    }

    $temporaryFiles = [];
    $kmzCache = [];
    $sourceErrors = [];
    try {
        $currentResponse = TropicalMapLib::fetchJson(TROPICAL_MAP_CURRENT_STORMS_URL);
        $currentStorms = $currentResponse['json'];
    } catch (Throwable $error) {
        $currentStorms = [];
        $sourceErrors['currentStorms'] = $error;
    }
    $outlooks = [];
    foreach ($requestedBasins as $basin) {
        $urls = TROPICAL_MAP_OUTLOOK_URLS[$basin];
        try {
            $jsonResponse = TropicalMapLib::fetchJson($urls['json']);
            $kmzResponse = TropicalMapLib::fetchKmzToTemp($urls['kmz']);
            $temporaryFiles[] = $kmzResponse['path'];
            $outlooks[$basin] = [
                'payload' => $jsonResponse['json'],
                'kmzPath' => $kmzResponse['path'],
            ];
        } catch (Throwable $error) {
            $sourceErrors["outlook:{$basin}"] = $error;
        }
    }
    $provider = static function (array $storm, string $productKey) use (&$kmzCache, &$temporaryFiles): ?string {
        $product = $storm[$productKey] ?? null;
        $url = is_array($product) ? trim((string) ($product['kmzFile'] ?? '')) : '';
        if ($url === '') {
            return null;
        }
        if (!isset($kmzCache[$url])) {
            $response = TropicalMapLib::fetchKmzToTemp($url);
            $kmzCache[$url] = $response['path'];
            $temporaryFiles[] = $response['path'];
        }
        return $kmzCache[$url];
    };
    $cleanup = static function () use (&$temporaryFiles): void {
        foreach (array_unique($temporaryFiles) as $path) {
            if (is_string($path) && is_file($path)) {
                @unlink($path);
            }
        }
    };
    return [
        'currentStorms' => $currentStorms,
        'outlooks' => $outlooks,
        'sourceErrors' => $sourceErrors,
        'provider' => $provider,
        'cleanup' => $cleanup,
    ];
}

function tropicalMapBuildOverview(
    string $basin,
    array $sources,
    string $outputDirectory,
    ?string $generatedAt
): string {
    $basin = TropicalMapLib::validateBasin($basin);
    if (isset($sources['sourceErrors']['currentStorms'])) {
        throw new TropicalMapException(
            'CurrentStorms source is unavailable: ' . $sources['sourceErrors']['currentStorms']->getMessage()
        );
    }
    if (isset($sources['sourceErrors']["outlook:{$basin}"])) {
        throw new TropicalMapException(
            "{$basin} outlook source is unavailable: "
            . $sources['sourceErrors']["outlook:{$basin}"]->getMessage()
        );
    }
    $outlook = $sources['outlooks'][$basin] ?? null;
    if (!is_array($outlook)) {
        throw new TropicalMapException("No outlook source is configured for {$basin}");
    }
    $urls = TROPICAL_MAP_OUTLOOK_URLS[$basin];
    $package = TropicalMapLib::buildOverviewPackage(
        $basin,
        $sources['currentStorms'],
        $outlook['payload'],
        $outlook['kmzPath'],
        $sources['provider'],
        [
            'currentStorms' => TROPICAL_MAP_CURRENT_STORMS_URL,
            'outlookJson' => $urls['json'],
            'outlookKmz' => $urls['kmz'],
        ],
        $generatedAt
    );
    return TropicalMapLib::publishOverviewPackage($outputDirectory, $package);
}

function tropicalMapBuildStorm(
    string $stormId,
    array $sources,
    string $stormRoot,
    ?string $generatedAt
): string {
    if (isset($sources['sourceErrors']['currentStorms'])) {
        throw new TropicalMapException(
            'CurrentStorms source is unavailable: ' . $sources['sourceErrors']['currentStorms']->getMessage()
        );
    }
    $bundle = TropicalMapLib::buildStormPackage(
        $stormId,
        $sources['currentStorms'],
        $sources['provider'],
        $generatedAt
    );
    return TropicalMapLib::publishStormPackage($stormRoot, $bundle);
}

$exitCode = 0;
$sources = null;
try {
    $parsed = tropicalMapParseArguments($argv);
    if ($parsed['mode'] === 'help') {
        tropicalMapUsage();
        exit(0);
    }
    $options = $parsed['options'];
    $fixtures = ($options['fixtures'] ?? false) === true;
    $fixtureRoot = tropicalMapAbsoluteOrRepositoryPath(
        (string) ($options['fixture-root'] ?? 'test/fixtures/tropical-map/official')
    );
    $overviewOutput = tropicalMapAbsoluteOrRepositoryPath(
        (string) ($options['overview-output'] ?? 'active/cache/tropical-map')
    );
    $stormRoot = tropicalMapAbsoluteOrRepositoryPath(
        (string) ($options['storm-root'] ?? 'active/storms')
    );
    $generatedAt = isset($options['generated-at']) ? (string) $options['generated-at'] : null;
    if ($generatedAt !== null && strtotime($generatedAt) === false) {
        throw new TropicalMapException('The --generated-at value is not a valid timestamp');
    }
    $basins = [];
    if (in_array($parsed['mode'], ['overview', 'all'], true)) {
        $basinOption = strtolower((string) ($options['basin'] ?? 'all'));
        $basins = $basinOption === 'all'
            ? ['atl', 'epac', 'cpac']
            : [TropicalMapLib::validateBasin($basinOption)];
    }
    $sources = tropicalMapCreateSources($fixtures, $fixtureRoot, $basins);

    if (in_array($parsed['mode'], ['overview', 'all'], true)) {
        foreach ($basins as $basin) {
            try {
                $path = tropicalMapBuildOverview($basin, $sources, $overviewOutput, $generatedAt);
                echo "OK overview {$basin}: {$path}" . PHP_EOL;
            } catch (Throwable $error) {
                $retained = !$fixtures && TropicalMapLib::markOverviewStale($overviewOutput, $basin, $error);
                fwrite(STDERR, sprintf(
                    "ERROR overview %s: %s%s\n",
                    $basin,
                    $error->getMessage(),
                    $retained ? ' (last-known-good retained as stale)' : ''
                ));
                $exitCode = 1;
            }
        }
    }

    if (in_array($parsed['mode'], ['storm', 'all'], true)) {
        $stormIds = [];
        if ($parsed['mode'] === 'storm') {
            if (!isset($options['storm'])) {
                throw new TropicalMapException('Storm mode requires --storm=ATCF_ID');
            }
            $stormIds[] = TropicalMapLib::validateStormId((string) $options['storm']);
        } else {
            foreach ($sources['currentStorms']['activeStorms'] ?? [] as $storm) {
                if (is_array($storm)) {
                    $stormIds[] = TropicalMapLib::validateStormId((string) ($storm['id'] ?? ''));
                }
            }
        }
        foreach (array_unique($stormIds) as $stormId) {
            try {
                $path = tropicalMapBuildStorm($stormId, $sources, $stormRoot, $generatedAt);
                echo "OK storm {$stormId}: {$path}" . PHP_EOL;
            } catch (Throwable $error) {
                fwrite(STDERR, "ERROR storm {$stormId}: {$error->getMessage()}\n");
                $exitCode = 1;
            }
        }
    }
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR tropical-map builder: ' . $error->getMessage() . PHP_EOL);
    tropicalMapUsage();
    $exitCode = 2;
} finally {
    if (is_array($sources) && is_callable($sources['cleanup'] ?? null)) {
        $sources['cleanup']();
    }
}

exit($exitCode);
