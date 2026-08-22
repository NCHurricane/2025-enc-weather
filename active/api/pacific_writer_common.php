<?php
declare(strict_types=1);

/**
 * Fetch a small official text/JSON/XML product for the Pacific data writers.
 * cURL is preferred because some hosts reject or fail PHP's HTTPS stream
 * transport; the stream fallback preserves compatibility with lean installs.
 */
function pacific_writer_fetch_response(string $url, array $headers = [], int $timeout = 12): array
{
    if (function_exists('curl_init')) {
        $responseHeaders = [];
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => min(10, $timeout),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_HEADERFUNCTION => static function ($curl, string $header) use (&$responseHeaders): int {
                $length = strlen($header);
                $parts = explode(':', $header, 2);
                if (count($parts) === 2) {
                    $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                }
                return $length;
            },
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($status !== 0) {
            return [
                'status' => $status,
                'body' => is_string($body) ? $body : null,
                'headers' => $responseHeaders,
                'error' => $error !== '' ? $error : null,
            ];
        }
    }

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => $timeout,
            'header' => implode("\r\n", $headers) . "\r\n",
            'ignore_errors' => true,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    $status = 0;
    $responseHeaders = [];
    foreach (($http_response_header ?? []) as $header) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#i', $header, $match)) {
            $status = (int) $match[1];
            continue;
        }
        $parts = explode(':', $header, 2);
        if (count($parts) === 2) {
            $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
        }
    }
    return [
        'status' => $status !== 0 ? $status : (is_string($body) && $body !== '' ? 200 : 0),
        'body' => is_string($body) ? $body : null,
        'headers' => $responseHeaders,
        'error' => is_string($body) ? null : 'request failed',
    ];
}

function pacific_writer_fetch_url(string $url, array $headers = [], int $timeout = 12): ?string
{
    $response = pacific_writer_fetch_response($url, $headers, $timeout);
    $body = $response['body'] ?? null;
    $status = (int) ($response['status'] ?? 0);
    return $status >= 200 && $status < 300 && is_string($body) && $body !== ''
        ? $body
        : null;
}

function nch_writer_publish_json(string $path, array $payload): void
{
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        throw new RuntimeException("Failed to encode JSON for {$path}");
    }
    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false || !rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException("Failed to publish {$path}");
    }
}

function nch_writer_download_image(
    string $url,
    string $destination,
    array $headers,
    int $timeout = 30,
    ?int $maximumAgeSeconds = null,
    ?int $now = null
): array {
    $response = pacific_writer_fetch_response($url, $headers, $timeout);
    $status = (int) ($response['status'] ?? 0);
    $body = $response['body'] ?? null;
    $lastModified = $response['headers']['last-modified'] ?? null;
    $base = [
        'sourceUrl' => $url,
        'httpStatus' => $status !== 0 ? $status : null,
        'lastModified' => is_string($lastModified) && $lastModified !== '' ? $lastModified : null,
    ];

    if (in_array($status, [404, 410], true)) {
        return $base + ['state' => 'not-issued', 'file' => null];
    }
    if ($status < 200 || $status >= 300 || !is_string($body) || $body === '') {
        return $base + [
            'state' => is_file($destination) ? 'stale' : 'unavailable',
            'file' => is_file($destination) ? basename($destination) : null,
            'error' => (string) ($response['error'] ?? "HTTP {$status}"),
        ];
    }

    if ($maximumAgeSeconds !== null && is_string($lastModified)) {
        $modifiedAt = strtotime($lastModified);
        if ($modifiedAt !== false && (($now ?? time()) - $modifiedAt) > $maximumAgeSeconds) {
            return $base + [
                'state' => 'stale',
                'file' => is_file($destination) ? basename($destination) : null,
                'reason' => 'source-older-than-limit',
            ];
        }
    }

    if (function_exists('getimagesizefromstring') && getimagesizefromstring($body) === false) {
        return $base + [
            'state' => is_file($destination) ? 'stale' : 'unavailable',
            'file' => is_file($destination) ? basename($destination) : null,
            'error' => 'response is not a valid image',
        ];
    }

    $tmp = $destination . '.tmp';
    if (file_put_contents($tmp, $body, LOCK_EX) === false || !rename($tmp, $destination)) {
        @unlink($tmp);
        return $base + [
            'state' => is_file($destination) ? 'stale' : 'unavailable',
            'file' => is_file($destination) ? basename($destination) : null,
            'error' => 'failed to publish image',
        ];
    }
    return $base + [
        'state' => 'available',
        'file' => basename($destination),
        'bytes' => strlen($body),
        'sha256' => hash('sha256', $body),
    ];
}

/** Normalize the official flat feed and the site's wrapped retained fixture. */
function pacific_writer_normalize_storms(array $payload): ?array
{
    if (isset($payload['data']['activeStorms']) && is_array($payload['data']['activeStorms'])) {
        return $payload;
    }
    if (isset($payload['activeStorms']) && is_array($payload['activeStorms'])) {
        return ['data' => ['activeStorms' => $payload['activeStorms']]];
    }
    return null;
}
