<?php
declare(strict_types=1);

const NCH_HWO_CACHE_TTL_SECONDS = 300;

function nch_hwo_unavailable(string $office, string $message): array
{
    return [
        'status' => 'unavailable',
        'freshness' => 'unavailable',
        'office' => $office,
        'checkedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'message' => $message,
    ];
}

function nch_hwo_read_json(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        return null;
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

function nch_hwo_atomic_write_json(string $path, array $data): bool
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }

    $tempPath = $path . '.' . getmypid() . '.tmp';
    if (file_put_contents($tempPath, $json, LOCK_EX) === false) {
        return false;
    }

    if (@rename($tempPath, $path)) {
        return true;
    }

    @unlink($tempPath);
    return false;
}

function nch_hwo_http_get_json(string $url, string $userAgent): array
{
    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Unable to initialize the HWO request');
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'User-Agent: ' . $userAgent,
            'Accept: application/ld+json',
        ],
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
    ]);

    $body = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        throw new RuntimeException('HWO request failed: ' . $curlError);
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException("HWO request returned HTTP {$httpCode}");
    }

    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('HWO response was not valid JSON');
    }

    return $decoded;
}

function nch_hwo_office_matches(string $issuingOffice, string $office): bool
{
    $normalizedIssuingOffice = strtoupper(trim($issuingOffice));
    $normalizedOffice = strtoupper(trim($office));
    return $normalizedIssuingOffice === $normalizedOffice
        || $normalizedIssuingOffice === 'K' . $normalizedOffice;
}

function nch_hwo_fetch_latest_product(
    string $office,
    string $userAgent,
    ?string $cacheDir = null,
    int $ttlSeconds = NCH_HWO_CACHE_TTL_SECONDS
): array {
    $office = strtoupper(trim($office));
    if (!preg_match('/^[A-Z]{3}$/', $office)) {
        return nch_hwo_unavailable($office, 'Invalid forecast office identifier');
    }

    $cacheDir = $cacheDir ?? (__DIR__ . '/data/hwo');
    if (!is_dir($cacheDir) && !@mkdir($cacheDir, 0755, true) && !is_dir($cacheDir)) {
        error_log("Unable to create shared HWO cache directory: {$cacheDir}");
    }

    $cachePath = $cacheDir . '/' . $office . '.json';
    $lockPath = $cacheDir . '/' . $office . '.lock';
    $cached = nch_hwo_read_json($cachePath);
    $cacheMtime = is_file($cachePath) ? filemtime($cachePath) : false;
    if ($cached !== null && $cacheMtime !== false && $cacheMtime >= time() - max(0, $ttlSeconds)) {
        $cached['freshness'] = 'fresh';
        return $cached;
    }

    $lock = is_dir($cacheDir) ? @fopen($lockPath, 'c') : false;
    if ($lock !== false) {
        flock($lock, LOCK_EX);
        clearstatcache(true, $cachePath);
        $cached = nch_hwo_read_json($cachePath);
        $cacheMtime = is_file($cachePath) ? filemtime($cachePath) : false;
        if ($cached !== null && $cacheMtime !== false && $cacheMtime >= time() - max(0, $ttlSeconds)) {
            $cached['freshness'] = 'fresh';
            flock($lock, LOCK_UN);
            fclose($lock);
            return $cached;
        }
    }

    try {
        $indexUrl = 'https://api.weather.gov/products/types/HWO/locations/' . rawurlencode($office);
        $index = nch_hwo_http_get_json($indexUrl, $userAgent);
        $products = $index['@graph'] ?? [];
        if (!is_array($products)) {
            throw new RuntimeException('HWO product index did not contain a product list');
        }

        $products = array_values(array_filter($products, static function ($product) use ($office): bool {
            return is_array($product)
                && strtoupper((string) ($product['productCode'] ?? '')) === 'HWO'
                && nch_hwo_office_matches((string) ($product['issuingOffice'] ?? ''), $office)
                && !empty($product['issuanceTime']);
        }));

        usort($products, static function (array $first, array $second): int {
            return strcmp((string) $second['issuanceTime'], (string) $first['issuanceTime']);
        });

        if ($products === []) {
            $payload = [
                'status' => 'empty',
                'office' => $office,
                'checkedAt' => gmdate('Y-m-d\TH:i:s\Z'),
            ];
        } else {
            $id = (string) ($products[0]['id'] ?? '');
            if (!preg_match('/^[a-f0-9-]{36}$/i', $id)) {
                throw new RuntimeException('Latest HWO product had an invalid identifier');
            }

            $sourceUrl = 'https://api.weather.gov/products/' . rawurlencode($id);
            $detail = nch_hwo_http_get_json($sourceUrl, $userAgent);
            $productText = (string) ($detail['productText'] ?? '');
            $issuanceTime = (string) ($detail['issuanceTime'] ?? $products[0]['issuanceTime'] ?? '');
            if (
                strtoupper((string) ($detail['productCode'] ?? '')) !== 'HWO'
                || !nch_hwo_office_matches((string) ($detail['issuingOffice'] ?? ''), $office)
                || trim($productText) === ''
            ) {
                throw new RuntimeException('Latest HWO product failed identity validation');
            }
            try {
                new DateTimeImmutable($issuanceTime);
            } catch (Exception $error) {
                throw new RuntimeException('Latest HWO product had an invalid issuance time', 0, $error);
            }

            $payload = [
                'status' => 'ok',
                'office' => $office,
                'checkedAt' => gmdate('Y-m-d\TH:i:s\Z'),
                'id' => $id,
                'issuanceTime' => $issuanceTime,
                'productText' => $productText,
                'sourceUrl' => $sourceUrl,
            ];
        }

        if (is_dir($cacheDir) && !nch_hwo_atomic_write_json($cachePath, $payload)) {
            error_log("Unable to publish shared HWO cache: {$cachePath}");
        }
        $payload['freshness'] = 'fresh';
        return $payload;
    } catch (Throwable $error) {
        error_log("HWO refresh failed for {$office}: " . $error->getMessage());
        $cached = nch_hwo_read_json($cachePath);
        if ($cached !== null && ($cached['status'] ?? null) === 'ok') {
            $cached['freshness'] = 'stale';
            return $cached;
        }
        return nch_hwo_unavailable($office, 'The latest outlook could not be retrieved');
    } finally {
        if ($lock !== false) {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}

function nch_hwo_expand_ugc(string $header): array
{
    $header = strtoupper((string) preg_replace('/\s+/', '', $header));
    $header = (string) preg_replace('/-\d{6}-?$/', '', $header);
    $zones = [];
    $prefix = null;

    foreach (explode('-', $header) as $token) {
        if ($token === '') {
            continue;
        }

        if (preg_match('/^([A-Z]{3})(\d{3})(?:>(?:[A-Z]{3})?(\d{3}))?$/', $token, $matches)) {
            $prefix = $matches[1];
            $start = (int) $matches[2];
            $end = isset($matches[3]) && $matches[3] !== '' ? (int) $matches[3] : $start;
        } elseif ($prefix !== null && preg_match('/^(\d{3})(?:>(\d{3}))?$/', $token, $matches)) {
            $start = (int) $matches[1];
            $end = isset($matches[2]) && $matches[2] !== '' ? (int) $matches[2] : $start;
        } else {
            continue;
        }

        if ($end < $start || $end - $start > 999) {
            continue;
        }
        for ($number = $start; $number <= $end; $number += 1) {
            $zones[] = $prefix . str_pad((string) $number, 3, '0', STR_PAD_LEFT);
        }
    }

    return array_values(array_unique($zones));
}

function nch_hwo_expiration_iso(string $purgeTime, string $issuanceTime): ?string
{
    if (!preg_match('/^(\d{2})(\d{2})(\d{2})$/', $purgeTime, $matches)) {
        return null;
    }

    try {
        $issued = (new DateTimeImmutable($issuanceTime))->setTimezone(new DateTimeZone('UTC'));
    } catch (Exception $error) {
        return null;
    }

    $day = (int) $matches[1];
    $hour = (int) $matches[2];
    $minute = (int) $matches[3];
    if ($day < 1 || $day > 31 || $hour > 23 || $minute > 59) {
        return null;
    }

    $candidate = DateTimeImmutable::createFromFormat(
        '!Y-n-j G:i',
        $issued->format('Y-n-') . $day . sprintf(' %02d:%02d', $hour, $minute),
        new DateTimeZone('UTC')
    );
    if ($candidate === false) {
        return null;
    }

    if ($candidate < $issued->modify('-1 hour')) {
        $candidate = $candidate->modify('+1 month');
    } elseif ($candidate > $issued->modify('+20 days')) {
        $candidate = $candidate->modify('-1 month');
    }

    return $candidate->format(DateTimeInterface::ATOM);
}

function nch_hwo_outlook_for_zone(array $product, string $zone, string $officeName = ''): array
{
    $zone = strtoupper(trim($zone));
    $office = (string) ($product['office'] ?? '');
    if (!preg_match('/^[A-Z]{3}\d{3}$/', $zone)) {
        return nch_hwo_unavailable($office, 'Invalid forecast zone identifier');
    }

    $productStatus = (string) ($product['status'] ?? 'unavailable');
    if ($productStatus !== 'ok') {
        return [
            'status' => $productStatus,
            'office' => $office,
            'officeName' => $officeName,
            'zone' => $zone,
            'checkedAt' => $product['checkedAt'] ?? null,
        ];
    }

    $productText = str_replace(["\r\n", "\r"], "\n", (string) ($product['productText'] ?? ''));
    $sections = preg_split('/^\s*\$\$\s*$/m', $productText) ?: [];

    foreach ($sections as $section) {
        $lines = explode("\n", $section);
        $headerStart = null;
        $headerEnd = null;
        $header = '';
        $purgeTime = null;

        foreach ($lines as $index => $line) {
            $trimmed = trim($line);
            if ($headerStart === null) {
                if (!preg_match('/^[A-Z]{3}\d{3}/', $trimmed)) {
                    continue;
                }
                $headerStart = $index;
            }

            $header .= $trimmed;
            if (preg_match('/-(\d{6})-\s*$/', $header, $matches)) {
                $headerEnd = $index;
                $purgeTime = $matches[1];
                break;
            }
        }

        $sectionZones = nch_hwo_expand_ugc($header);
        if ($headerStart === null || $headerEnd === null || !in_array($zone, $sectionZones, true)) {
            continue;
        }

        $issuanceLine = null;
        for ($index = $headerEnd + 1, $count = count($lines); $index < $count; $index += 1) {
            if (preg_match('/^\d{1,4}\s+(?:AM|PM)\s+\S+/i', trim($lines[$index]))) {
                $issuanceLine = $index;
                break;
            }
        }

        $areaLines = $issuanceLine === null
            ? []
            : array_slice($lines, $headerEnd + 1, $issuanceLine - $headerEnd - 1);
        $areaDesc = trim((string) preg_replace('/\s+/', ' ', implode(' ', $areaLines)), " \t\n\r\0\x0B-");
        $areaNames = array_values(array_filter(array_map('trim', explode('-', $areaDesc))));
        $zoneIndex = array_search($zone, $sectionZones, true);
        if ($zoneIndex !== false && count($areaNames) === count($sectionZones)) {
            $areaDesc = $areaNames[$zoneIndex];
        } elseif (count($sectionZones) > 1) {
            $areaDesc = '';
        }
        $bodyStart = $issuanceLine === null ? $headerEnd + 1 : $issuanceLine + 1;
        $body = trim(implode("\n", array_slice($lines, $bodyStart)));

        $validUntil = nch_hwo_expiration_iso((string) $purgeTime, (string) ($product['issuanceTime'] ?? ''));
        $status = ($product['freshness'] ?? 'fresh') === 'stale' ? 'stale' : 'ok';
        if ($validUntil !== null && strtotime($validUntil) <= time()) {
            $status = 'expired';
        }

        return [
            'status' => $status,
            'type' => 'Hazardous Weather Outlook',
            'id' => $product['id'] ?? null,
            'office' => $office,
            'officeName' => $officeName,
            'zone' => $zone,
            'issued' => $product['issuanceTime'] ?? null,
            'validUntil' => $validUntil,
            'areaDesc' => $areaDesc !== '' ? $areaDesc : null,
            'text' => $body,
            'sourceUrl' => $product['sourceUrl'] ?? null,
        ];
    }

    return [
        'status' => 'not-applicable',
        'office' => $office,
        'officeName' => $officeName,
        'zone' => $zone,
        'issued' => $product['issuanceTime'] ?? null,
    ];
}
