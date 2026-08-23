<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/active/api/tropical_map_lib.php';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This test is CLI-only.\n");
    exit(2);
}

$checks = 0;
$failures = [];

function checkSame(mixed $expected, mixed $actual, string $message): void
{
    global $checks, $failures;
    $checks++;
    if ($expected !== $actual) {
        $failures[] = $message . ' (expected ' . json_encode($expected) . ', found ' . json_encode($actual) . ')';
    }
}

$payload = [
    'metadata' => [
        'basin' => 'atl',
        'two_issue_date_time_str' => '202608231800',
    ],
    'disturbances' => [
        '2d' => [[
            'id' => '1',
            'forecast' => '2d',
            'probability' => 0,
            'risk_level' => 'nearZero',
            'details_en' => [
                'issuance_time' => '2:00 PM EDT Sun Aug 23 2026',
                'location' => 'Northeastern Atlantic',
                'summary' => 'Development is no longer anticipated.',
                'formation_chance_2d' => 'low...near 0 percent.',
                'formation_chance_7d' => 'low...near 0 percent.',
            ],
        ]],
        '7d' => [],
    ],
    'storms' => [],
    'two' => [
        'html_en' => '',
        'html_es' => '',
    ],
];

$outlook = TropicalMapLib::parseOutlookPayload($payload, 'atl');
checkSame(0, $outlook['disturbances']['1']['twoDayProbability'], 'NHC near-zero probability is retained');
checkSame('Low', $outlook['disturbances']['1']['twoDayCategory'], 'NHC nearZero risk normalizes to Low');

$invalidPayload = $payload;
$invalidPayload['disturbances']['2d'][0]['probability'] = 10;
try {
    TropicalMapLib::parseOutlookPayload($invalidPayload, 'atl');
    $failures[] = 'NHC nearZero risk must fail closed when probability is not zero';
} catch (TropicalMapException) {
    $checks++;
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "PASS NHC nearZero risk normalization ({$checks} checks)\n";
