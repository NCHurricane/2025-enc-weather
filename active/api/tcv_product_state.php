<?php
declare(strict_types=1);

function nch_parse_tcv_text(string $text): array
{
    $lines = preg_split('/\r?\n/', $text) ?: [];
    $advisory = null;
    $issued = null;
    $zones = [];
    foreach ($lines as $line) {
        if ($advisory === null && preg_match('/Advisory\s+(?:Number\s+)?(\d+[A-Z]?)/i', $line, $match)) {
            $advisory = strtoupper($match[1]);
        }
        if ($issued === null && preg_match(
            '/\b((?:\d{1,2}:\d{2}|\d{3,4})\s*[AP]M\s*(?:HST|HDT|PDT|PST|MDT|MST|CDT|CST|EDT|EST|UTC))\b/i',
            $line,
            $match
        )) {
            $issued = trim($match[1]);
        }
        if (preg_match_all('/\b([A-Z]{3}\d{3})\b/', $line, $matches)) {
            foreach ($matches[1] as $zone) {
                $zones[] = strtoupper($zone);
            }
        }
    }

    return [
        'advisory' => $advisory,
        'issued' => $issued,
        'zones' => array_values(array_unique($zones)),
        'hasActiveVtec' => preg_match('/\/O\.(?:NEW|CON|EXT|EXA|EXB)\./i', $text) === 1,
        'hasCancellationVtec' => preg_match('/\/O\.(?:CAN|EXP)\./i', $text) === 1,
        'raw' => $text,
    ];
}

function nch_classify_tcv(array $parsed, string $currentAdvisory): array
{
    $sourceAdvisory = strtoupper(trim((string) ($parsed['advisory'] ?? '')));
    $currentAdvisory = strtoupper(ltrim(trim($currentAdvisory), '0'));
    $sourceBase = preg_replace('/[^0-9].*$/', '', ltrim($sourceAdvisory, '0'));
    $currentBase = preg_replace('/[^0-9].*$/', '', $currentAdvisory);
    $hasActiveVtec = !empty($parsed['hasActiveVtec']);
    $hasCancellationVtec = !empty($parsed['hasCancellationVtec']);

    if ($hasCancellationVtec && !$hasActiveVtec) {
        return [
            'state' => 'cancelled',
            'reason' => 'all-local-watches-warnings-ended',
            'sourceAdvisory' => $sourceAdvisory !== '' ? $sourceAdvisory : null,
        ];
    }
    if ($currentBase !== '' && $sourceBase !== '' && $sourceBase !== $currentBase) {
        return [
            'state' => 'stale',
            'reason' => 'source-advisory-does-not-match-current-storm',
            'sourceAdvisory' => $sourceAdvisory,
        ];
    }
    if (!$hasActiveVtec) {
        return [
            'state' => 'not-issued',
            'reason' => 'no-active-watch-warning-events',
            'sourceAdvisory' => $sourceAdvisory !== '' ? $sourceAdvisory : null,
        ];
    }
    return [
        'state' => 'available',
        'reason' => null,
        'sourceAdvisory' => $sourceAdvisory !== '' ? $sourceAdvisory : null,
    ];
}
