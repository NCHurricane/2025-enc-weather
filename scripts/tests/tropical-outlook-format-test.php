<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/active/api/tropical_map_lib.php';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This test is CLI-only.\n");
    exit(2);
}

$cases = [
    'atl' => ['source' => 'atl', 'header' => 'ZCZC MIATWOAT ALL', 'wmo' => 'TTAA00 KNHC DDHHMM', 'break' => '<br>'],
    'epac' => ['source' => 'pac', 'header' => 'ZCZC MIATWOEP ALL', 'wmo' => 'TTAA00 KNHC DDHHMM', 'break' => '<br/>'],
    'cpac' => ['source' => 'cpac', 'header' => 'ZCZC HFOTWOCP ALL', 'wmo' => 'TTAA00 PHFO DDHHMM', 'break' => '<br />'],
];
$failures = [];
$checks = 0;

foreach ($cases as $basin => $case) {
    $break = $case['break'];
    $payload = [
        'metadata' => [
            'basin' => $case['source'],
            'two_issue_date_time_str' => '202608180000',
        ],
        'disturbances' => ['2d' => [], '7d' => []],
        'storms' => [],
        'two' => [
            'html_en' => $case['header'] . $break
                . $case['wmo'] . $break . $break
                . '<strong>Tropical Weather Outlook</strong>' . $break
                . 'Final &amp; safe',
            'html_es' => '',
        ],
    ];
    $outlook = TropicalMapLib::parseOutlookPayload($payload, $basin);
    $expected = $case['header'] . '<br>'
        . $case['wmo'] . '<br><br>'
        . 'Tropical Weather Outlook<br>'
        . 'Final &amp; safe';

    $checks++;
    if ($outlook['outlookEnglishHtml'] !== $expected) {
        $failures[] = "{$basin} Outlook line structure was not preserved";
    }
    $checks++;
    if (str_contains($outlook['outlookEnglishHtml'], "\n")) {
        $failures[] = "{$basin} Outlook duplicated HTML and raw line breaks";
    }
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL {$failure}\n");
    }
    fwrite(STDERR, sprintf("FAILED %d of %d checks\n", count($failures), $checks));
    exit(1);
}

echo "PASS Tropical Outlook formatting ({$checks} checks)\n";
