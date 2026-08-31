<?php
declare(strict_types=1);

function nch_tcv_zone_type(string $zoneId): string
{
    return preg_match('/^[A-Z]{2}C\d{3}$/', $zoneId) === 1 ? 'county' : 'forecast';
}

function nch_tcv_hazard(string $phenomenon): ?string
{
    return match ($phenomenon) {
        'HU', 'TR' => 'wind',
        'SS' => 'surge',
        default => null,
    };
}

function nch_tcv_label(string $code): string
{
    return match ($code) {
        'HU.W' => 'Hurricane Warning',
        'HU.A' => 'Hurricane Watch',
        'TR.W' => 'Tropical Storm Warning',
        'TR.A' => 'Tropical Storm Watch',
        'SS.W' => 'Storm Surge Warning',
        'SS.A' => 'Storm Surge Watch',
        default => $code,
    };
}

function nch_expand_tcv_ugc(string $ugc): array
{
    $ugc = strtoupper(preg_replace('/\s+/', '', trim($ugc)) ?? '');
    $ugc = preg_replace('/-\d{6}-?$/', '', $ugc) ?? $ugc;
    $tokens = preg_split('/-+/', $ugc, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $zones = [];
    $prefix = null;

    $emitRange = static function (string $rangePrefix, int $start, int $end) use (&$zones): void {
        if ($start > $end) {
            [$start, $end] = [$end, $start];
        }
        for ($number = $start; $number <= $end; $number++) {
            $zones[] = sprintf('%s%03d', $rangePrefix, $number);
        }
    };

    foreach ($tokens as $token) {
        if (preg_match('/^([A-Z]{2}[CZ])(\d{3})>(\d{3})$/', $token, $match)) {
            $prefix = $match[1];
            $emitRange($prefix, (int) $match[2], (int) $match[3]);
            continue;
        }
        if (preg_match('/^([A-Z]{2}[CZ])(\d{3})$/', $token, $match)) {
            $prefix = $match[1];
            $zones[] = $prefix . $match[2];
            continue;
        }
        if ($prefix !== null && preg_match('/^(\d{3})>(\d{3})$/', $token, $match)) {
            $emitRange($prefix, (int) $match[1], (int) $match[2]);
            continue;
        }
        if ($prefix !== null && preg_match('/^\d{3}$/', $token)) {
            $zones[] = $prefix . $token;
        }
    }

    return array_values(array_unique($zones));
}

function nch_parse_tcv_vtec(string $line): ?array
{
    $line = strtoupper(trim($line));
    if (preg_match(
        '#^/O\.([A-Z]{3})\.([A-Z]{4})\.(HU|TR|SS)\.(A|W)\.(\d{4})\.([0-9TZ:-]+)-([0-9TZ:-]+)/$#',
        $line,
        $match
    ) !== 1) {
        return null;
    }

    return [
        'action' => $match[1],
        'office' => $match[2],
        'phen' => $match[3],
        'sig' => $match[4],
        'etn' => $match[5],
        'start' => $match[6],
        'end' => $match[7],
    ];
}

function nch_tcv_stronger_significance(?string $current, string $candidate): string
{
    $rank = ['A' => 1, 'W' => 2];
    return ($rank[$candidate] ?? 0) > ($rank[$current] ?? 0) ? $candidate : ($current ?? $candidate);
}

function nch_parse_tcv_text(string $text): array
{
    $lines = preg_split('/\r\n|\n|\r/', $text) ?: [];
    $advisory = null;
    $issued = null;
    $productId = null;
    $disclaimer = null;

    foreach ($lines as $index => $line) {
        $trimmed = trim($line);
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
        if ($productId === null && preg_match('/^[A-Z0-9]{6}\s+[A-Z]{4}\s+\d{6}$/', $trimmed)) {
            $productId = $trimmed;
        }
        if ($disclaimer === null && str_starts_with(strtoupper($trimmed), 'CAUTION')) {
            $paragraph = [$trimmed];
            for ($cursor = $index + 1; $cursor < count($lines); $cursor++) {
                $next = rtrim($lines[$cursor]);
                if (trim($next) === '') {
                    break;
                }
                $paragraph[] = $next;
            }
            $disclaimer = trim(implode("\n", $paragraph));
        }
    }

    $final = [];
    $lineCount = count($lines);
    for ($index = 0; $index < $lineCount; $index++) {
        $line = strtoupper(trim($lines[$index]));
        if (preg_match('/^[A-Z]{2}[CZ]\d{3}(?:-|$)/', $line) !== 1) {
            continue;
        }

        $ugc = $line;
        $ugcEnd = $index;
        while (preg_match('/-\d{6}-$/', $ugc) !== 1 && $ugcEnd + 1 < $lineCount && $ugcEnd - $index < 12) {
            $next = strtoupper(trim($lines[$ugcEnd + 1]));
            if ($next === '' || str_starts_with($next, '/')) {
                break;
            }
            $ugc .= $next;
            $ugcEnd++;
        }
        if (preg_match('/-\d{6}-$/', $ugc) !== 1) {
            continue;
        }

        $zones = nch_expand_tcv_ugc($ugc);
        $cursor = $ugcEnd + 1;
        for (; $cursor < $lineCount; $cursor++) {
            $candidate = strtoupper(trim($lines[$cursor]));
            if ($candidate === '' || $candidate === '$$') {
                break;
            }
            if (preg_match('/^[A-Z]{2}[CZ]\d{3}(?:-|$)/', $candidate) === 1) {
                break;
            }
            $vtec = nch_parse_tcv_vtec($candidate);
            if ($vtec === null) {
                continue;
            }
            foreach ($zones as $zoneId) {
                if (in_array($vtec['action'], ['CAN', 'EXP'], true)) {
                    unset($final[$zoneId][$vtec['phen']]);
                    if (($final[$zoneId] ?? []) === []) {
                        unset($final[$zoneId]);
                    }
                    continue;
                }
                if (!in_array($vtec['action'], ['NEW', 'CON', 'EXT', 'EXA', 'EXB'], true)) {
                    continue;
                }
                $current = $final[$zoneId][$vtec['phen']] ?? null;
                $final[$zoneId][$vtec['phen']] = nch_tcv_stronger_significance($current, $vtec['sig']);
            }
        }
        $index = max($index, $cursor - 1);
    }

    $events = [];
    foreach ($final as $zoneId => $phenomena) {
        foreach (['HU', 'TR', 'SS'] as $phenomenon) {
            if (!isset($phenomena[$phenomenon])) {
                continue;
            }
            $hazard = nch_tcv_hazard($phenomenon);
            if ($hazard === null) {
                continue;
            }
            $events[] = [
                'zoneId' => $zoneId,
                'zoneType' => nch_tcv_zone_type($zoneId),
                'phen' => $phenomenon,
                'sig' => $phenomena[$phenomenon],
                'hazard' => $hazard,
            ];
        }
    }

    return [
        'advisory' => $advisory,
        'issued' => $issued,
        'productId' => $productId,
        'disclaimer' => $disclaimer,
        'zones' => array_values(array_unique(array_column($events, 'zoneId'))),
        'events' => $events,
        'hasActiveVtec' => $events !== [],
        'hasActiveVtecRaw' => preg_match('/\/O\.(?:NEW|CON|EXT|EXA|EXB)\./i', $text) === 1,
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
    $hasActiveVtecRaw = !empty($parsed['hasActiveVtecRaw']);
    $hasCancellationVtec = !empty($parsed['hasCancellationVtec']);

    if (!$hasActiveVtec && $hasCancellationVtec) {
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
    if (!$hasActiveVtec && $hasActiveVtecRaw) {
        return [
            'state' => 'unavailable',
            'reason' => 'active-vtec-could-not-be-parsed',
            'sourceAdvisory' => $sourceAdvisory !== '' ? $sourceAdvisory : null,
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

function nch_tcv_product_code(?string $source): ?string
{
    if ($source !== null && preg_match('/\b(MIATCV(?:AT|EP)\d|TCVHFO)\b/i', $source, $match)) {
        return strtoupper($match[1]);
    }
    return null;
}

function nch_compose_tcv_payload(
    string $stormId,
    string $state,
    ?string $reason,
    ?string $source = null,
    ?array $parsed = null,
    ?callable $zoneResolver = null,
    array $extra = []
): array {
    $events = [];
    $display = ['wind' => [], 'surge' => []];
    $zones = [];

    if ($state === 'available' && $parsed !== null) {
        $groups = [
            'wind' => ['HU.W' => [], 'HU.A' => [], 'TR.W' => [], 'TR.A' => []],
            'surge' => ['SS.W' => [], 'SS.A' => []],
        ];
        foreach (($parsed['events'] ?? []) as $event) {
            $zoneId = strtoupper((string) ($event['zoneId'] ?? ''));
            if (preg_match('/^[A-Z]{3}\d{3}$/', $zoneId) !== 1) {
                continue;
            }
            $feature = null;
            if ($zoneResolver !== null) {
                try {
                    $resolved = $zoneResolver($zoneId, (string) ($event['zoneType'] ?? nch_tcv_zone_type($zoneId)));
                    if (is_array($resolved)) {
                        $feature = $resolved;
                    }
                } catch (Throwable) {
                    $feature = null;
                }
            }
            $properties = is_array($feature['properties'] ?? null) ? $feature['properties'] : [];
            $zoneName = trim((string) ($properties['zoneName'] ?? $properties['name'] ?? $zoneId));
            $zoneState = strtoupper(trim((string) ($properties['state'] ?? substr($zoneId, 0, 2))));
            $enriched = $event;
            $enriched['zoneId'] = $zoneId;
            $enriched['zoneType'] = (string) ($event['zoneType'] ?? nch_tcv_zone_type($zoneId));
            $enriched['zoneName'] = $zoneName !== '' ? $zoneName : $zoneId;
            $enriched['state'] = $zoneState !== '' ? $zoneState : null;
            $events[] = $enriched;
            $zones[] = $zoneId;

            $hazard = (string) ($enriched['hazard'] ?? '');
            $code = (string) ($enriched['phen'] ?? '') . '.' . (string) ($enriched['sig'] ?? '');
            $stateKey = $enriched['state'] ?? 'UNK';
            if (isset($groups[$hazard][$code])) {
                $groups[$hazard][$code][$stateKey][] = $enriched['zoneName'];
            }
        }

        foreach (['wind', 'surge'] as $hazard) {
            foreach ($groups[$hazard] as $code => $byState) {
                if ($byState === []) {
                    continue;
                }
                ksort($byState);
                $states = [];
                foreach ($byState as $zoneState => $names) {
                    $names = array_values(array_unique($names));
                    sort($names, SORT_NATURAL | SORT_FLAG_CASE);
                    $states[] = ['state' => $zoneState, 'count' => count($names), 'zones' => $names];
                }
                $display[$hazard][] = ['label' => nch_tcv_label($code), 'key' => $code, 'states' => $states];
            }
        }
    }

    $meta = [
        'stormId' => $stormId,
        'advisory' => $parsed['advisory'] ?? null,
        'issued' => $parsed['issued'] ?? null,
        'productId' => $parsed['productId'] ?? null,
        'productCode' => nch_tcv_product_code($source),
        'source' => $source,
        'disclaimer' => $parsed['disclaimer'] ?? null,
    ];
    $zones = array_values(array_unique($zones));
    $payload = [
        'stormId' => $stormId,
        'state' => $state,
        'reason' => $reason,
        'source' => $source,
        'tcv' => $state === 'available' ? [
            'advisory' => $parsed['advisory'] ?? null,
            'issued' => $parsed['issued'] ?? null,
            'zones' => $zones,
        ] : null,
        'zones' => $zones,
        'meta' => $meta,
        'events' => $events,
        'features' => ['type' => 'FeatureCollection', 'features' => []],
        'display' => $display,
    ];

    return array_merge($payload, $extra);
}

function nch_atomic_write_json(string $path, array $payload): void
{
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
    $temporary = $path . '.tmp.' . getmypid() . '.' . bin2hex(random_bytes(4));
    if (file_put_contents($temporary, $json, LOCK_EX) === false) {
        throw new RuntimeException("Unable to write temporary JSON file: {$temporary}");
    }
    if (!rename($temporary, $path)) {
        @unlink($temporary);
        throw new RuntimeException("Unable to publish JSON file: {$path}");
    }
}

function nch_cache_tcv_zone_feature(string $zoneId, string $cacheDir, callable $fetcher): ?array
{
    $zoneId = strtoupper(trim($zoneId));
    if (preg_match('/^[A-Z]{3}\d{3}$/', $zoneId) !== 1) {
        return null;
    }
    $cachePath = rtrim($cacheDir, '/\\') . DIRECTORY_SEPARATOR . $zoneId . '.json';
    $cachedGeometry = null;
    if (is_file($cachePath)) {
        $cached = json_decode((string) file_get_contents($cachePath), true);
        if (is_array($cached) && ($cached['type'] ?? null) === 'Feature' && is_array($cached['geometry'] ?? null)) {
            return $cached;
        }
        if (is_array($cached) && isset($cached['type']) && (isset($cached['coordinates']) || isset($cached['geometries']))) {
            $cachedGeometry = $cached;
        }
    }

    try {
        $raw = $fetcher('https://api.weather.gov/zones/' . nch_tcv_zone_type($zoneId) . '/' . $zoneId);
        $decoded = json_decode((string) $raw, true);
        if (is_array($decoded) && is_array($decoded['geometry'] ?? null)) {
            $feature = [
                'type' => 'Feature',
                'id' => $zoneId,
                'geometry' => $decoded['geometry'],
                'properties' => [
                    'zoneName' => $decoded['properties']['name'] ?? $zoneId,
                    'state' => $decoded['properties']['state'] ?? substr($zoneId, 0, 2),
                ],
            ];
            nch_atomic_write_json($cachePath, $feature);
            return $feature;
        }
    } catch (Throwable) {
        // Preserve and use a legacy geometry-only cache if the metadata refresh fails.
    }

    if ($cachedGeometry !== null) {
        return [
            'type' => 'Feature',
            'id' => $zoneId,
            'geometry' => $cachedGeometry,
            'properties' => ['zoneName' => $zoneId, 'state' => substr($zoneId, 0, 2)],
        ];
    }
    return null;
}
