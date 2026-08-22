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

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL {$failure}\n");
    }
    exit(1);
}

echo "PASS TCV product states ({$checks} checks)\n";
