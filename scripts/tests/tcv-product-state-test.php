<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/active/api/tcv_product_state.php';

$checks = 0;
$failures = [];
$check = static function (bool $condition, string $message) use (&$checks, &$failures): void {
    $checks++;
    if (!$condition) {
        $failures[] = $message;
    }
};

$active = nch_parse_tcv_text(<<<'TCV'
Lala Local Watch/Warning Statement/Intermediate Advisory Number 19A
801 PM HST Sun Aug 16 2026
HIZ001-170715-
/O.CON.PHFO.TR.W.3001.000000T0000Z-000000T0000Z/
TCV);
$check($active['advisory'] === '19A', 'Intermediate advisory suffix is preserved');
$check($active['zones'] === ['HIZ001'], 'Forecast zones are parsed once');
$check(nch_classify_tcv($active, '019')['state'] === 'available', 'Matching active VTEC is available');

$cancelled = nch_parse_tcv_text(<<<'TCV'
Lala Local Watch/Warning Statement/Intermediate Advisory Number 19A
801 PM HST Sun Aug 16 2026
HIZ001-170715-
/O.CAN.PHFO.TR.W.3001.000000T0000Z-000000T0000Z/
TCV);
$check(nch_classify_tcv($cancelled, '038')['state'] === 'cancelled', 'Cancellation outranks an old advisory number');

$missing = nch_parse_tcv_text("Moke Local Statement Advisory Number 6\n");
$check(nch_classify_tcv($missing, '006')['state'] === 'not-issued', 'No active VTEC is not issued');
$check(nch_classify_tcv($active, '038')['state'] === 'stale', 'Mismatched active VTEC is stale');

$compressed = nch_parse_tcv_text(<<<'TCV'
000
WTNT85 KNHC 311752
TCVAT5

FIVE WATCH/WARNING INTERMEDIATE ADVISORY NUMBER 1A
NWS NATIONAL HURRICANE CENTER MIAMI FL     AL052026
152 PM EDT MON AUG 31 2026

CAUTION...THIS IS A TEST PRODUCT EXCERPT.

LAZ073-074-
TXZ214-439-615-010200-
/O.CON.KNHC.TR.W.1005.000000T0000Z-000000T0000Z/
TCV);
$expectedZones = ['LAZ073', 'LAZ074', 'TXZ214', 'TXZ439', 'TXZ615'];
$check($compressed['productId'] === 'WTNT85 KNHC 311752', 'TCV product identity is parsed');
$check($compressed['zones'] === $expectedZones, 'Compressed and wrapped UGC zones are expanded');
$check(count($compressed['events']) === 5, 'Each active compressed UGC zone becomes an event');
$check(
    array_reduce(
        $compressed['events'],
        static fn(bool $valid, array $event): bool => $valid
            && $event['phen'] === 'TR'
            && $event['sig'] === 'W'
            && $event['hazard'] === 'wind',
        true
    ),
    'VTEC warning semantics are retained for every event'
);
$check(nch_classify_tcv($compressed, '001')['state'] === 'available', 'Intermediate advisory matches its base advisory');

$payload = nch_compose_tcv_payload(
    'AL052026',
    'available',
    null,
    'https://www.nhc.noaa.gov/ftp/pub/forecasts/public/MIATCVAT5',
    $compressed,
    static fn(string $zoneId, string $zoneType): array => [
        'type' => 'Feature',
        'id' => $zoneId,
        'geometry' => ['type' => 'Polygon', 'coordinates' => []],
        'properties' => ['zoneName' => "{$zoneId} test zone", 'state' => substr($zoneId, 0, 2)],
    ]
);
$check($payload['stormId'] === 'AL052026' && $payload['meta']['stormId'] === 'AL052026', 'Payload identity is published at both contracts');
$check($payload['zones'] === $expectedZones, 'Payload retains every expanded active zone');
$check(count($payload['events']) === 5, 'Payload exposes frontend-consumable events');
$check($payload['features'] === ['type' => 'FeatureCollection', 'features' => []], 'Payload delegates geometry to the bounded zone cache');
$check(
    ($payload['display']['wind'][0]['key'] ?? null) === 'TR.W'
        && ($payload['display']['wind'][0]['label'] ?? null) === 'Tropical Storm Warning'
        && array_sum(array_column($payload['display']['wind'][0]['states'] ?? [], 'count')) === 5,
    'Payload exposes the grouped wind-warning zone list'
);
$check(($payload['meta']['productCode'] ?? null) === 'MIATCVAT5', 'Payload retains the official product code');

$unparseable = nch_parse_tcv_text(<<<'TCV'
FIVE WATCH/WARNING ADVISORY NUMBER 1
/O.NEW.KNHC.TR.W.1005.000000T0000Z-000000T0000Z/
TCV);
$check(
    nch_classify_tcv($unparseable, '001')['state'] === 'unavailable',
    'Active VTEC without a parseable UGC block fails unavailable instead of empty'
);

$temporaryCache = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'nch-tcv-' . bin2hex(random_bytes(6));
if (!mkdir($temporaryCache, 0700, true) && !is_dir($temporaryCache)) {
    $failures[] = 'Unable to create the disposable TCV cache test directory';
} else {
    try {
        $cachedFeature = nch_cache_tcv_zone_feature(
            'LAZ073',
            $temporaryCache,
            static fn(string $url): string => json_encode([
                'type' => 'Feature',
                'geometry' => ['type' => 'Polygon', 'coordinates' => []],
                'properties' => ['name' => 'West Cameron', 'state' => 'LA'],
            ], JSON_THROW_ON_ERROR)
        );
        $publishedCache = json_decode(
            (string) file_get_contents($temporaryCache . DIRECTORY_SEPARATOR . 'LAZ073.json'),
            true
        );
        $check(
            ($cachedFeature['properties']['zoneName'] ?? null) === 'West Cameron'
                && ($publishedCache['type'] ?? null) === 'Feature',
            'Zone cache publishes a frontend-ready GeoJSON feature atomically'
        );

        nch_atomic_write_json(
            $temporaryCache . DIRECTORY_SEPARATOR . 'TXZ214.json',
            ['type' => 'Polygon', 'coordinates' => []]
        );
        $legacyFeature = nch_cache_tcv_zone_feature(
            'TXZ214',
            $temporaryCache,
            static function (string $url): string {
                throw new RuntimeException('simulated metadata outage');
            }
        );
        $check(
            ($legacyFeature['type'] ?? null) === 'Feature'
                && ($legacyFeature['geometry']['type'] ?? null) === 'Polygon'
                && ($legacyFeature['properties']['state'] ?? null) === 'TX',
            'Legacy geometry-only zone caches remain usable during metadata failure'
        );
    } finally {
        foreach (glob($temporaryCache . DIRECTORY_SEPARATOR . '*.json') ?: [] as $temporaryFile) {
            unlink($temporaryFile);
        }
        rmdir($temporaryCache);
    }
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL {$failure}\n");
    }
    exit(1);
}

echo "PASS TCV product states ({$checks} checks)\n";
