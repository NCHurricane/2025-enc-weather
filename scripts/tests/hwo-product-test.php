<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/counties/api/hwo_products.php';

$assertions = 0;

function hwo_assert(bool $condition, string $message): void
{
    global $assertions;
    $assertions += 1;
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$expanded = nch_hwo_expand_ugc(
    'MDZ021>025-NCZ013>017-030>032-102-VAZ064-075>078-230830-'
);
hwo_assert(in_array('MDZ021', $expanded, true), 'Expected first prefixed zone');
hwo_assert(in_array('MDZ025', $expanded, true), 'Expected prefixed range expansion');
hwo_assert(in_array('NCZ030', $expanded, true), 'Expected inherited NC zone prefix');
hwo_assert(in_array('NCZ032', $expanded, true), 'Expected inherited NC range expansion');
hwo_assert(in_array('NCZ102', $expanded, true), 'Expected inherited NC single zone');
hwo_assert(in_array('VAZ078', $expanded, true), 'Expected inherited VA range expansion');
hwo_assert(!in_array('NCZ029', $expanded, true), 'Unexpected zone included in UGC expansion');

$issued = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$purge = $issued->modify('+8 hours');
$purgeToken = $purge->format('dHi');
$product = [
    'status' => 'ok',
    'freshness' => 'fresh',
    'office' => 'MHX',
    'id' => '11111111-2222-4333-8444-555555555555',
    'issuanceTime' => $issued->format(DateTimeInterface::ATOM),
    'sourceUrl' => 'https://api.weather.gov/products/11111111-2222-4333-8444-555555555555',
    'productText' => "\n000\nFLUS42 KMHX 221448\nHWOMHX\n\nHazardous Weather Outlook\nNational Weather Service Newport/Morehead City NC\n\nNCZ029-044>046-{$purgeToken}-\nMartin-Pitt-Washington-Tyrrell-\n1048 AM EDT Sat Aug 22 2026\n\nThis Hazardous Weather Outlook is for eastern North Carolina.\n\n.DAY ONE...Today and tonight.\n\nNo hazardous weather is expected at this time.\n\n$$\n\nNCZ203-{$purgeToken}-\nNorthern Outer Banks-\n1048 AM EDT Sat Aug 22 2026\n\n...MODERATE RIP CURRENT RISK IN EFFECT...\n\nThis Hazardous Weather Outlook is for eastern North Carolina.\n\n.DAY ONE...Today and tonight.\n\nScattered thunderstorms are possible.\n\n$$\n",
];

$pitt = nch_hwo_outlook_for_zone($product, 'NCZ044', 'Newport/Morehead City');
hwo_assert($pitt['status'] === 'ok', 'Expected a current Pitt outlook');
hwo_assert($pitt['zone'] === 'NCZ044', 'Expected Pitt forecast-zone identity');
hwo_assert($pitt['office'] === 'MHX', 'Expected forecast-office identity');
hwo_assert($pitt['officeName'] === 'Newport/Morehead City', 'Expected configured office name');
hwo_assert($pitt['areaDesc'] === 'Pitt', 'Expected the matched zone area name');
hwo_assert(str_contains((string) $pitt['text'], 'No hazardous weather'), 'Expected matched section body');
hwo_assert(!str_contains((string) $pitt['text'], 'MODERATE RIP CURRENT'), 'Mixed text from a different zone section');
hwo_assert(str_starts_with((string) $pitt['validUntil'], $purge->format('Y-m-d')), 'Expected UGC purge date');

$outerBanks = nch_hwo_outlook_for_zone($product, 'NCZ203', 'Newport/Morehead City');
hwo_assert(str_contains((string) $outerBanks['text'], 'MODERATE RIP CURRENT'), 'Expected zone-specific headline');
hwo_assert(str_contains((string) $outerBanks['text'], 'Scattered thunderstorms'), 'Expected zone-specific body');

$bertie = nch_hwo_outlook_for_zone($product, 'NCZ030', 'Wakefield');
hwo_assert($bertie['status'] === 'not-applicable', 'Unexpected outlook section for an absent zone');

$staleProduct = $product;
$staleProduct['freshness'] = 'stale';
$stale = nch_hwo_outlook_for_zone($staleProduct, 'NCZ044', 'Newport/Morehead City');
hwo_assert($stale['status'] === 'stale', 'Expected last-known-good freshness to be retained');

$rollover = nch_hwo_expiration_iso('010600', '2026-08-31T23:30:00Z');
hwo_assert($rollover === '2026-09-01T06:00:00+00:00', 'Expected month rollover for UGC purge time');

fwrite(STDOUT, "HWO product tests passed ({$assertions} assertions).\n");
