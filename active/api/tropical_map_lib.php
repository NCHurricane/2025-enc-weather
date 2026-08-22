<?php
declare(strict_types=1);

/**
 * Shared Phase 1 tropical-map parsing and normalized-package helpers.
 *
 * This file has no web entry point. The CLI coordinator in
 * tropical_map_builder.php owns live fetches and publication.
 */

final class TropicalMapException extends RuntimeException
{
}

final class TropicalMapLib
{
    public const SCHEMA_VERSION = '1.0.0';
    public const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;
    public const MAX_ARCHIVE_ENTRIES = 64;
    public const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
    public const MAX_UNCOMPRESSED_BYTES = 16 * 1024 * 1024;
    public const MAX_COORDINATES = 100000;
    public const MAX_FEATURES = 2000;

    private const ALLOWED_HOSTS = [
        'www.nhc.noaa.gov',
    ];

    private const GEOMETRY_NAMES = [
        'Point',
        'LineString',
        'Polygon',
        'MultiGeometry',
    ];

    private function __construct()
    {
    }

    public static function utcNow(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }

    public static function validateBasin(string $basin): string
    {
        $basin = strtolower(trim($basin));
        if (!in_array($basin, ['atl', 'epac', 'cpac'], true)) {
            throw new TropicalMapException("Unsupported basin: {$basin}");
        }
        return $basin;
    }

    public static function validateStormId(string $stormId): string
    {
        $stormId = strtoupper(trim($stormId));
        if (!preg_match('/^(AL|EP|CP)\d{6}$/', $stormId)) {
            throw new TropicalMapException("Invalid ATCF storm ID: {$stormId}");
        }
        return $stormId;
    }

    public static function readJsonFile(string $path): array
    {
        if (!is_file($path)) {
            throw new TropicalMapException("JSON file does not exist: {$path}");
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            throw new TropicalMapException("JSON file is unreadable: {$path}");
        }
        return self::decodeJson($raw, basename($path));
    }

    public static function decodeJson(string $raw, string $label = 'JSON payload'): array
    {
        try {
            $decoded = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            throw new TropicalMapException("{$label} is invalid: {$error->getMessage()}", 0, $error);
        }
        if (!is_array($decoded)) {
            throw new TropicalMapException("{$label} root must be an object");
        }
        return $decoded;
    }

    /**
     * Bounded HTTPS fetch. Redirects are rejected so the allowlisted host cannot
     * silently change beneath the request.
     *
     * @return array{body:string,url:string,contentType:string,lastModified:?string,etag:?string,fetchedAt:string}
     */
    public static function fetch(string $url, array $acceptedContentTypes): array
    {
        self::assertAllowedUrl($url);
        if (!extension_loaded('curl')) {
            throw new TropicalMapException('The curl extension is required');
        }

        $lastError = 'unknown fetch failure';
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $body = '';
            $headers = [];
            $tooLarge = false;
            $ch = curl_init($url);
            if ($ch === false) {
                throw new TropicalMapException("Unable to initialize cURL for {$url}");
            }

            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_CONNECTTIMEOUT => 8,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_USERAGENT => 'NCHurricane.com Tropical Map Builder/1.0',
                CURLOPT_HTTPHEADER => ['Accept: ' . implode(', ', $acceptedContentTypes)],
                CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$headers): int {
                    $length = strlen($line);
                    $parts = explode(':', $line, 2);
                    if (count($parts) === 2) {
                        $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
                    }
                    return $length;
                },
                CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$body, &$tooLarge): int {
                    if (strlen($body) + strlen($chunk) > self::MAX_DOWNLOAD_BYTES) {
                        $tooLarge = true;
                        return 0;
                    }
                    $body .= $chunk;
                    return strlen($chunk);
                },
            ]);

            $ok = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $contentType = strtolower(trim((string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE)));
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($tooLarge) {
                throw new TropicalMapException("Source exceeds the 5 MiB bound: {$url}");
            }
            if ($ok === false || $status < 200 || $status >= 300) {
                $lastError = "HTTP {$status}" . ($curlError !== '' ? ": {$curlError}" : '');
                continue;
            }
            if ($body === '') {
                $lastError = 'empty response body';
                continue;
            }
            if (!self::contentTypeAllowed($contentType, $acceptedContentTypes)) {
                throw new TropicalMapException("Unexpected content type {$contentType} from {$url}");
            }

            return [
                'body' => $body,
                'url' => $url,
                'contentType' => $contentType,
                'lastModified' => $headers['last-modified'] ?? null,
                'etag' => $headers['etag'] ?? null,
                'fetchedAt' => self::utcNow(),
            ];
        }

        throw new TropicalMapException("Fetch failed for {$url}: {$lastError}");
    }

    public static function fetchJson(string $url): array
    {
        $response = self::fetch($url, ['application/json', 'text/json', 'text/plain']);
        $response['json'] = self::decodeJson($response['body'], $url);
        unset($response['body']);
        return $response;
    }

    public static function fetchKmzToTemp(string $url): array
    {
        $response = self::fetch($url, [
            'application/vnd.google-earth.kmz',
            'application/zip',
            'application/octet-stream',
        ]);
        $path = tempnam(sys_get_temp_dir(), 'nch-tropical-');
        if ($path === false) {
            throw new TropicalMapException('Unable to create a KMZ temporary file');
        }
        $kmzPath = $path . '.kmz';
        if (!rename($path, $kmzPath)) {
            @unlink($path);
            throw new TropicalMapException('Unable to prepare a KMZ temporary path');
        }
        if (file_put_contents($kmzPath, $response['body'], LOCK_EX) === false) {
            @unlink($kmzPath);
            throw new TropicalMapException('Unable to write the KMZ temporary file');
        }
        unset($response['body']);
        $response['path'] = $kmzPath;
        return $response;
    }

    public static function fetchKmlToTemp(string $url): array
    {
        $response = self::fetch($url, [
            'application/vnd.google-earth.kml+xml',
            'application/xml',
            'text/xml',
            'text/plain',
            'application/octet-stream',
        ]);
        $path = tempnam(sys_get_temp_dir(), 'nch-tropical-');
        if ($path === false) {
            throw new TropicalMapException('Unable to create a KML temporary file');
        }
        $kmlPath = $path . '.kml';
        if (!rename($path, $kmlPath)) {
            @unlink($path);
            throw new TropicalMapException('Unable to prepare a KML temporary path');
        }
        if (file_put_contents($kmlPath, $response['body'], LOCK_EX) === false) {
            @unlink($kmlPath);
            throw new TropicalMapException('Unable to write the KML temporary file');
        }
        unset($response['body']);
        $response['path'] = $kmlPath;
        return $response;
    }

    public static function extractKmlFromKmz(string $path): string
    {
        if (!class_exists(PharData::class)) {
            throw new TropicalMapException('PharData is required to read KMZ archives');
        }
        if (!is_file($path)) {
            throw new TropicalMapException("KMZ file does not exist: {$path}");
        }
        $compressedBytes = filesize($path);
        if (!is_int($compressedBytes) || $compressedBytes < 1 || $compressedBytes > self::MAX_DOWNLOAD_BYTES) {
            throw new TropicalMapException("KMZ compressed size is outside the bound: {$path}");
        }

        $entryCount = 0;
        $totalBytes = 0;
        $kmlEntries = [];
        try {
            $archive = new PharData($path);
            foreach (new RecursiveIteratorIterator($archive) as $entryPath => $entry) {
                $entryCount++;
                if ($entryCount > self::MAX_ARCHIVE_ENTRIES) {
                    throw new TropicalMapException('KMZ contains too many entries');
                }
                if ($entry->isLink()) {
                    throw new TropicalMapException('KMZ symlink entries are not allowed');
                }
                $entryBytes = $entry->getSize();
                if ($entryBytes < 0 || $entryBytes > self::MAX_ENTRY_BYTES) {
                    throw new TropicalMapException('KMZ entry exceeds the per-entry size bound');
                }
                $totalBytes += $entryBytes;
                if ($totalBytes > self::MAX_UNCOMPRESSED_BYTES) {
                    throw new TropicalMapException('KMZ exceeds the total uncompressed size bound');
                }

                $normalized = str_replace('\\', '/', (string) $entryPath);
                if (
                    str_contains($normalized, '/../')
                    || str_starts_with($normalized, '/')
                    || preg_match('/(^|\/)\.\.($|\/)/', $normalized)
                ) {
                    throw new TropicalMapException('KMZ contains an unsafe entry path');
                }
                $extension = strtolower(pathinfo($entry->getFilename(), PATHINFO_EXTENSION));
                if (in_array($extension, ['zip', 'kmz', 'phar', 'tar', 'gz', 'bz2'], true)) {
                    throw new TropicalMapException('Nested archives are not allowed in KMZ input');
                }
                if ($extension === 'kml') {
                    $kmlEntries[] = $entry;
                }
            }
        } catch (TropicalMapException $error) {
            throw $error;
        } catch (Throwable $error) {
            throw new TropicalMapException("Unable to read KMZ {$path}: {$error->getMessage()}", 0, $error);
        }

        if (count($kmlEntries) !== 1) {
            throw new TropicalMapException('KMZ must contain exactly one KML document');
        }
        $xml = file_get_contents($kmlEntries[0]->getPathName());
        if ($xml === false || $xml === '') {
            throw new TropicalMapException('KML document is empty or unreadable');
        }
        return $xml;
    }

    /** @return array<int,array{type:string,geometry:array,properties:array}> */
    public static function parseKmzFeatures(string $path): array
    {
        return self::parseKmlFeatures(self::extractKmlFromKmz($path));
    }

    /** @return array<int,array{type:string,geometry:array,properties:array}> */
    public static function parseProductFeatures(string $path): array
    {
        if (strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'kml') {
            if (!is_file($path)) {
                throw new TropicalMapException("KML file does not exist: {$path}");
            }
            $bytes = filesize($path);
            if (!is_int($bytes) || $bytes < 1 || $bytes > self::MAX_ENTRY_BYTES) {
                throw new TropicalMapException("KML size is outside the bound: {$path}");
            }
            $xml = file_get_contents($path);
            if ($xml === false || $xml === '') {
                throw new TropicalMapException("KML file is empty or unreadable: {$path}");
            }
            return self::parseKmlFeatures($xml);
        }
        return self::parseKmzFeatures($path);
    }

    /** @return array<int,array{type:string,geometry:array,properties:array}> */
    public static function parseKmlFeatures(string $xml): array
    {
        if (stripos($xml, '<!DOCTYPE') !== false) {
            throw new TropicalMapException('KML document types are not allowed');
        }

        $document = new DOMDocument();
        $prior = libxml_use_internal_errors(true);
        $loaded = $document->loadXML($xml, LIBXML_NONET | LIBXML_NOBLANKS | LIBXML_COMPACT);
        $errors = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($prior);
        if (!$loaded) {
            $message = $errors !== [] ? trim($errors[0]->message) : 'unknown XML error';
            throw new TropicalMapException("KML is not well formed: {$message}");
        }

        $xpath = new DOMXPath($document);
        $placemarks = $xpath->query('//*[local-name()="Placemark"]');
        if ($placemarks->length > self::MAX_FEATURES) {
            throw new TropicalMapException('KML exceeds the feature-count bound');
        }

        $features = [];
        foreach ($placemarks as $placemark) {
            if (!$placemark instanceof DOMElement) {
                continue;
            }
            $geometryNodes = $xpath->query(
                './*[local-name()="Point" or local-name()="LineString" or local-name()="Polygon" or local-name()="MultiGeometry"]',
                $placemark
            );
            $geometries = [];
            foreach ($geometryNodes as $geometryNode) {
                if ($geometryNode instanceof DOMElement) {
                    $geometries[] = self::parseKmlGeometry($geometryNode, $xpath);
                }
            }
            if ($geometries === []) {
                continue;
            }

            $geometry = self::normalizeGeometry(self::combineGeometries($geometries));
            if (self::countGeometryCoordinates($geometry) > self::MAX_COORDINATES) {
                throw new TropicalMapException('KML geometry exceeds the coordinate-count bound');
            }

            $properties = [
                'name' => self::firstNodeText($xpath, './*[local-name()="name"]', $placemark),
                'description' => self::firstNodeText($xpath, './*[local-name()="description"]', $placemark),
                'styleUrl' => self::firstNodeText($xpath, './*[local-name()="styleUrl"]', $placemark),
                'extendedData' => [],
            ];
            foreach ($xpath->query('.//*[local-name()="Data"]', $placemark) as $dataNode) {
                if (!$dataNode instanceof DOMElement) {
                    continue;
                }
                $key = trim($dataNode->getAttribute('name'));
                if ($key === '') {
                    continue;
                }
                $properties['extendedData'][$key] = self::firstNodeText(
                    $xpath,
                    './*[local-name()="value"]',
                    $dataNode
                );
            }
            foreach ($xpath->query('.//*[local-name()="SimpleData"]', $placemark) as $dataNode) {
                if ($dataNode instanceof DOMElement && trim($dataNode->getAttribute('name')) !== '') {
                    $properties['extendedData'][trim($dataNode->getAttribute('name'))] = trim($dataNode->textContent);
                }
            }

            $features[] = [
                'type' => 'Feature',
                'geometry' => $geometry,
                'properties' => $properties,
            ];
        }
        return $features;
    }

    public static function parseOutlookPayload(array $payload, string $basin): array
    {
        $basin = self::validateBasin($basin);
        $sourceBasin = strtolower((string) ($payload['metadata']['basin'] ?? ''));
        $expectedSource = $basin === 'epac' ? 'pac' : $basin;
        if ($sourceBasin !== $expectedSource) {
            throw new TropicalMapException("Outlook basin mismatch: expected {$expectedSource}, found {$sourceBasin}");
        }
        foreach (['2d', '7d'] as $window) {
            if (!is_array($payload['disturbances'][$window] ?? null)) {
                throw new TropicalMapException("Outlook disturbances.{$window} must be an array");
            }
        }
        if (!is_array($payload['storms'] ?? null)) {
            throw new TropicalMapException('Outlook storms must be an array');
        }

        $issueTime = self::parseOutlookIssueTime($payload['metadata'] ?? []);
        $disturbances = [];
        foreach (['2d' => 'twoDay', '7d' => 'sevenDay'] as $window => $key) {
            foreach ($payload['disturbances'][$window] as $disturbance) {
                if (!is_array($disturbance)) {
                    throw new TropicalMapException("Outlook {$window} disturbance must be an object");
                }
                $id = trim((string) ($disturbance['id'] ?? ''));
                if ($id === '' || !preg_match('/^[A-Za-z0-9_-]{1,32}$/', $id)) {
                    throw new TropicalMapException("Invalid outlook disturbance ID: {$id}");
                }
                $probability = $disturbance['probability'] ?? null;
                if (!is_numeric($probability) || (int) $probability < 0 || (int) $probability > 100) {
                    throw new TropicalMapException("Invalid probability for disturbance {$id}");
                }
                $category = ucfirst(strtolower(trim((string) ($disturbance['risk_level'] ?? ''))));
                if (!in_array($category, ['Low', 'Medium', 'High'], true)) {
                    throw new TropicalMapException("Invalid risk category for disturbance {$id}");
                }
                $disturbances[$id] ??= [
                    'disturbanceId' => $id,
                    'twoDayProbability' => null,
                    'twoDayCategory' => null,
                    'sevenDayProbability' => null,
                    'sevenDayCategory' => null,
                    'discussionHtml' => '',
                ];
                $disturbances[$id][$key . 'Probability'] = (int) $probability;
                $disturbances[$id][$key . 'Category'] = $category;
                $details = self::outlookDetailsText($disturbance['details_en'] ?? '');
                if ($details !== '') {
                    $disturbances[$id]['discussionHtml'] = self::sanitizeOfficialHtml($details);
                }
            }
        }

        return [
            'basin' => $basin,
            'sourceBasin' => $sourceBasin,
            'sourceIssueTime' => $issueTime,
            'disturbances' => $disturbances,
            'outlookEnglishHtml' => self::sanitizeOfficialHtml((string) ($payload['two']['html_en'] ?? '')),
            'outlookSpanishHtml' => self::sanitizeOfficialHtml((string) ($payload['two']['html_es'] ?? '')),
        ];
    }

    /**
     * @return array{areas:array,points:array}
     */
    public static function parseOutlookKmz(string $path, array $outlook, string $sourceUrl): array
    {
        $areas = [];
        $points = [];
        foreach (self::parseKmzFeatures($path) as $feature) {
            $extended = $feature['properties']['extendedData'] ?? [];
            $id = trim((string) ($extended['Disturbance'] ?? ''));
            if ($id === '' || !isset($outlook['disturbances'][$id])) {
                continue;
            }
            if (!in_array($feature['geometry']['type'], ['Polygon', 'MultiPolygon'], true)) {
                continue;
            }

            $properties = $outlook['disturbances'][$id] + [
                'sourceIssueTime' => $outlook['sourceIssueTime'],
                'sourceUrl' => $sourceUrl,
            ];
            $areas[] = [
                'type' => 'Feature',
                'geometry' => $feature['geometry'],
                'properties' => $properties,
            ];
            $points[] = [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => self::geometryCenter($feature['geometry']),
                ],
                'properties' => $properties + ['positionDerivedFrom' => 'outlook-polygon-center'],
            ];
        }

        return [
            'areas' => self::featureCollection($areas),
            'points' => self::featureCollection($points),
        ];
    }

    public static function selectCurrentStorms(array $payload, string $basin): array
    {
        $basin = self::validateBasin($basin);
        if (!is_array($payload['activeStorms'] ?? null)) {
            throw new TropicalMapException('CurrentStorms.json activeStorms must be an array');
        }
        $prefix = ['atl' => 'AL', 'epac' => 'EP', 'cpac' => 'CP'][$basin];
        $selected = [];
        foreach ($payload['activeStorms'] as $storm) {
            if (!is_array($storm)) {
                continue;
            }
            $stormId = self::validateStormId((string) ($storm['id'] ?? ''));
            if (str_starts_with($stormId, $prefix)) {
                $storm['id'] = $stormId;
                $selected[] = $storm;
            }
        }
        return $selected;
    }

    public static function findCurrentStorm(array $payload, string $stormId): array
    {
        $stormId = self::validateStormId($stormId);
        if (!is_array($payload['activeStorms'] ?? null)) {
            throw new TropicalMapException('CurrentStorms.json activeStorms must be an array');
        }
        foreach ($payload['activeStorms'] as $storm) {
            if (is_array($storm) && strtoupper((string) ($storm['id'] ?? '')) === $stormId) {
                $storm['id'] = $stormId;
                return $storm;
            }
        }
        throw new TropicalMapException("Storm {$stormId} is not present in CurrentStorms.json");
    }

    public static function stormPositionFeature(array $storm): array
    {
        $stormId = self::validateStormId((string) ($storm['id'] ?? ''));
        $latitude = $storm['latitudeNumeric'] ?? null;
        $longitude = $storm['longitudeNumeric'] ?? null;
        if (!is_numeric($latitude) || !is_numeric($longitude)) {
            throw new TropicalMapException("Storm {$stormId} has no numeric position");
        }
        $latitude = (float) $latitude;
        $longitude = self::normalizeLongitude((float) $longitude);
        if ($latitude < -90 || $latitude > 90) {
            throw new TropicalMapException("Storm {$stormId} latitude is out of range");
        }

        return [
            'type' => 'Feature',
            'geometry' => ['type' => 'Point', 'coordinates' => [$longitude, $latitude]],
            'properties' => [
                'product' => 'current-position',
                'stormId' => $stormId,
                'name' => trim((string) ($storm['name'] ?? '')),
                'classification' => trim((string) ($storm['classification'] ?? '')),
                'intensityKnots' => is_numeric($storm['intensity'] ?? null) ? (int) $storm['intensity'] : null,
                'pressureMillibars' => is_numeric($storm['pressure'] ?? null) ? (int) $storm['pressure'] : null,
                'movementDirectionDegrees' => is_numeric($storm['movementDir'] ?? null) ? (int) $storm['movementDir'] : null,
                'movementSpeedMph' => is_numeric($storm['movementSpeed'] ?? null) ? (int) $storm['movementSpeed'] : null,
                'advisoryNumber' => self::stormAdvisory($storm),
                'sourceIssueTime' => self::stormIssueTime($storm),
                'detailUrl' => 'active/?storm=' . rawurlencode($stormId),
            ],
        ];
    }

    public static function parseTrackProduct(
        string $path,
        string $stormId,
        string $advisory,
        string $sourceIssueTime,
        string $sourceUrl
    ): array {
        $stormId = self::validateStormId($stormId);
        $features = self::parseKmzFeatures($path);
        self::assertProductIdentity($features, $stormId, $advisory);

        $lines = [];
        $points = [];
        foreach ($features as $feature) {
            $type = $feature['geometry']['type'];
            if (in_array($type, ['LineString', 'MultiLineString'], true)) {
                $lines[] = [
                    'type' => 'Feature',
                    'geometry' => $feature['geometry'],
                    'properties' => [
                        'product' => 'forecast-track',
                        'stormId' => $stormId,
                        'advisoryNumber' => $advisory,
                        'sourceIssueTime' => $sourceIssueTime,
                        'sourceUrl' => $sourceUrl,
                    ],
                ];
                continue;
            }
            if ($type !== 'Point') {
                continue;
            }
            $description = self::descriptionText((string) ($feature['properties']['description'] ?? ''));
            $forecastHour = null;
            if (preg_match('/\b(\d{1,3})\s*hr\s+Forecast\b/i', $description, $match)) {
                $forecastHour = (int) $match[1];
            } elseif (stripos($description, 'Advisory Information') !== false) {
                $forecastHour = 0;
            }
            if ($forecastHour === null) {
                throw new TropicalMapException("Track point for {$stormId} has no source-derived forecast hour");
            }
            $intensity = null;
            if (preg_match('/Maximum Wind:\s*(\d+)\s*knots/i', $description, $match)) {
                $intensity = (int) $match[1];
            }
            $points[] = [
                'type' => 'Feature',
                'geometry' => $feature['geometry'],
                'properties' => [
                    'product' => 'forecast-point',
                    'stormId' => $stormId,
                    'advisoryNumber' => $advisory,
                    'forecastHour' => $forecastHour,
                    'validTime' => self::addHours($sourceIssueTime, $forecastHour),
                    'intensityKnots' => $intensity,
                    'sourceIssueTime' => $sourceIssueTime,
                    'sourceUrl' => $sourceUrl,
                ],
            ];
        }
        usort($points, static fn (array $a, array $b): int =>
            $a['properties']['forecastHour'] <=> $b['properties']['forecastHour']
        );
        if ($lines === [] || $points === []) {
            throw new TropicalMapException("Track product for {$stormId} is missing line or point geometry");
        }

        return [
            'lines' => self::featureCollection($lines),
            'points' => self::featureCollection($points),
            'all' => self::featureCollection(array_merge($lines, $points)),
        ];
    }

    public static function parseConeProduct(
        string $path,
        string $stormId,
        string $advisory,
        string $sourceIssueTime,
        string $sourceUrl
    ): array {
        $stormId = self::validateStormId($stormId);
        $features = self::parseKmzFeatures($path);
        self::assertProductIdentity($features, $stormId, $advisory);
        $cones = [];
        foreach ($features as $feature) {
            if (!in_array($feature['geometry']['type'], ['Polygon', 'MultiPolygon'], true)) {
                continue;
            }
            $cones[] = [
                'type' => 'Feature',
                'geometry' => $feature['geometry'],
                'properties' => [
                    'product' => 'cone',
                    'stormId' => $stormId,
                    'advisoryNumber' => $advisory,
                    'sourceIssueTime' => $sourceIssueTime,
                    'sourceUrl' => $sourceUrl,
                ],
            ];
        }
        if ($cones === []) {
            throw new TropicalMapException("Cone product for {$stormId} contains no polygon geometry");
        }
        return self::featureCollection($cones);
    }

    public static function parseWarningsProduct(
        string $path,
        string $stormId,
        string $advisory,
        string $sourceIssueTime,
        string $sourceUrl
    ): array {
        $stormId = self::validateStormId($stormId);
        $features = self::parseKmzFeatures($path);
        self::assertProductIdentity($features, $stormId, $advisory);
        $warnings = [];
        foreach ($features as $feature) {
            if (!in_array($feature['geometry']['type'], ['LineString', 'MultiLineString'], true)) {
                continue;
            }
            $warnings[] = [
                'type' => 'Feature',
                'geometry' => $feature['geometry'],
                'properties' => [
                    'product' => 'watches-warnings',
                    'stormId' => $stormId,
                    'advisoryNumber' => $advisory,
                    'warningType' => trim((string) ($feature['properties']['name'] ?? '')),
                    'sourceIssueTime' => $sourceIssueTime,
                    'sourceUrl' => $sourceUrl,
                ],
            ];
        }
        if ($warnings === []) {
            throw new TropicalMapException("Warnings product for {$stormId} contains no line geometry");
        }
        return self::featureCollection($warnings);
    }

    public static function parseBestTrackProduct(
        string $path,
        string $stormId,
        string $sourceIssueTime,
        string $sourceUrl
    ): array {
        $stormId = self::validateStormId($stormId);
        $features = self::parseProductFeatures($path);
        self::assertProductIdentity($features, $stormId, null);
        $history = [];
        foreach ($features as $feature) {
            $geometryType = $feature['geometry']['type'];
            if (!in_array($geometryType, ['Point', 'MultiPoint', 'LineString', 'MultiLineString'], true)) {
                continue;
            }
            $history[] = [
                'type' => 'Feature',
                'geometry' => $feature['geometry'],
                'properties' => [
                    'product' => $geometryType === 'Point' || $geometryType === 'MultiPoint'
                        ? 'past-position'
                        : 'best-track',
                    'stormId' => $stormId,
                    'label' => trim((string) ($feature['properties']['name'] ?? '')),
                    'description' => self::descriptionText((string) ($feature['properties']['description'] ?? '')),
                    'sourceIssueTime' => $sourceIssueTime,
                    'sourceUrl' => $sourceUrl,
                ],
            ];
        }
        if ($history === []) {
            throw new TropicalMapException("Best-track product for {$stormId} contains no point or line geometry");
        }
        return self::featureCollection($history);
    }

    public static function parseSurgeWarningsProduct(
        string $path,
        string $stormId,
        string $advisory,
        string $sourceIssueTime,
        string $sourceUrl
    ): array {
        $stormId = self::validateStormId($stormId);
        self::assertSurgeProductUrl($sourceUrl, $stormId, $advisory);
        $features = self::parseProductFeatures($path);
        $warnings = [];
        foreach ($features as $feature) {
            if (!in_array($feature['geometry']['type'], ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'], true)) {
                continue;
            }
            $warnings[] = [
                'type' => 'Feature',
                'geometry' => $feature['geometry'],
                'properties' => [
                    'product' => 'surge-warning',
                    'stormId' => $stormId,
                    'advisoryNumber' => $advisory,
                    'warningType' => trim((string) ($feature['properties']['name'] ?? '')),
                    'description' => self::descriptionText((string) ($feature['properties']['description'] ?? '')),
                    'sourceIssueTime' => $sourceIssueTime,
                    'sourceUrl' => $sourceUrl,
                ],
            ];
        }
        if ($warnings === []) {
            throw new TropicalMapException("Storm-surge warning product for {$stormId} contains no line or polygon geometry");
        }
        return self::featureCollection($warnings);
    }

    public static function parseWindRadiiProducts(
        ?string $initialPath,
        ?string $forecastPath,
        array $forecastPoints,
        string $stormId,
        string $advisory,
        string $sourceIssueTime,
        array $sourceUrls
    ): array {
        $stormId = self::validateStormId($stormId);
        $pointFeatures = $forecastPoints['features'] ?? [];
        if ($pointFeatures === []) {
            throw new TropicalMapException('Forecast points are required to correlate wind radii');
        }
        $output = [];
        if ($initialPath !== null) {
            foreach (self::parseKmzFeatures($initialPath) as $feature) {
                if (!in_array($feature['geometry']['type'], ['Polygon', 'MultiPolygon'], true)) {
                    continue;
                }
                $threshold = self::windThreshold($feature['properties']['name'] ?? null);
                $output[] = self::radiiFeature(
                    $feature['geometry'],
                    $stormId,
                    $advisory,
                    $threshold,
                    0,
                    $sourceIssueTime,
                    (string) ($sourceUrls['initial'] ?? '')
                );
            }
        }

        if ($forecastPath !== null) {
            $groups = [];
            $group = -1;
            foreach (self::parseKmzFeatures($forecastPath) as $feature) {
                if (!in_array($feature['geometry']['type'], ['Polygon', 'MultiPolygon'], true)) {
                    continue;
                }
                $threshold = self::windThreshold($feature['properties']['name'] ?? null);
                if ($threshold === 34) {
                    $group++;
                    $groups[$group] = [];
                }
                if ($group < 0) {
                    throw new TropicalMapException('Forecast radii must begin with a 34-knot polygon');
                }
                $groups[$group][] = ['geometry' => $feature['geometry'], 'threshold' => $threshold];
            }
            $groupCount = count($groups);
            $pointCount = count($pointFeatures);
            if ($groupCount === 0 || $groupCount > $pointCount) {
                throw new TropicalMapException(sprintf(
                    'Forecast-radii group count (%d) does not match forecast-point count (%d)',
                    $groupCount,
                    $pointCount
                ));
            }
            if ($groupCount < $pointCount) {
                foreach (array_slice($pointFeatures, $groupCount) as $pointFeature) {
                    $intensity = $pointFeature['properties']['intensityKnots'] ?? null;
                    if (!is_int($intensity) || $intensity >= 34) {
                        throw new TropicalMapException(sprintf(
                            'Forecast-radii group count (%d) does not match forecast-point count (%d)',
                            $groupCount,
                            $pointCount
                        ));
                    }
                }
            }
            foreach ($groups as $index => $features) {
                // The explicit initial-radii product owns forecast hour zero when available.
                if ($index === 0 && $initialPath !== null) {
                    continue;
                }
                $hour = $pointFeatures[$index]['properties']['forecastHour'] ?? null;
                if (!is_int($hour)) {
                    throw new TropicalMapException('Forecast point is missing an integer forecast hour');
                }
                foreach ($features as $feature) {
                    $output[] = self::radiiFeature(
                        $feature['geometry'],
                        $stormId,
                        $advisory,
                        $feature['threshold'],
                        $hour,
                        $sourceIssueTime,
                        (string) ($sourceUrls['forecast'] ?? '')
                    );
                }
            }
        }
        if ($output === []) {
            throw new TropicalMapException("Wind-radii products for {$stormId} contain no polygons");
        }
        return self::featureCollection($output);
    }

    /**
     * @param callable(array,string):?string $productProvider
     */
    public static function buildOverviewPackage(
        string $basin,
        array $currentStorms,
        array $outlookPayload,
        string $outlookKmzPath,
        callable $productProvider,
        array $sourceUrls,
        ?string $generatedAt = null
    ): array {
        $basin = self::validateBasin($basin);
        $generatedAt ??= self::utcNow();
        $outlook = self::parseOutlookPayload($outlookPayload, $basin);
        $outlookLayers = self::parseOutlookKmz(
            $outlookKmzPath,
            $outlook,
            (string) ($sourceUrls['outlookKmz'] ?? '')
        );

        $positions = [];
        $tracks = [];
        $cones = [];
        $errors = [];
        $stormSources = [];
        foreach (self::selectCurrentStorms($currentStorms, $basin) as $storm) {
            $positions[] = self::stormPositionFeature($storm);
            $stormId = $storm['id'];
            $advisory = self::stormAdvisory($storm);
            $issueTime = self::stormIssueTime($storm);

            foreach (['forecastTrack', 'trackCone'] as $productKey) {
                $product = $storm[$productKey] ?? null;
                $url = is_array($product) ? (string) ($product['kmzFile'] ?? '') : '';
                if ($url === '') {
                    continue;
                }
                try {
                    $path = $productProvider($storm, $productKey);
                    if ($path === null) {
                        throw new TropicalMapException('provider returned no local product path');
                    }
                    if ($productKey === 'forecastTrack') {
                        $parsed = self::parseTrackProduct($path, $stormId, $advisory, $issueTime, $url);
                        array_push($tracks, ...$parsed['lines']['features']);
                    } else {
                        $parsed = self::parseConeProduct($path, $stormId, $advisory, $issueTime, $url);
                        array_push($cones, ...$parsed['features']);
                    }
                    $stormSources[] = self::sourceRecord($productKey, $url, $issueTime, $generatedAt, 'fresh');
                } catch (Throwable $error) {
                    $errors[] = [
                        'code' => 'storm-product-unavailable',
                        'product' => $productKey,
                        'stormId' => $stormId,
                        'message' => $error->getMessage(),
                    ];
                    $stormSources[] = self::sourceRecord($productKey, $url, $issueTime, $generatedAt, 'unavailable');
                }
            }
        }

        $layers = [
            'outlookAreas' => $outlookLayers['areas'],
            'outlookPoints' => $outlookLayers['points'],
            'stormPositions' => self::featureCollection($positions),
            'forecastTracks' => self::featureCollection($tracks),
            'cones' => self::featureCollection($cones),
        ];
        $counts = [
            'outlookAreas' => count($layers['outlookAreas']['features']),
            'outlookPoints' => count($layers['outlookPoints']['features']),
            'activeStorms' => count($positions),
            'forecastTracks' => count($tracks),
            'cones' => count($cones),
        ];
        $featureCount = array_sum($counts);
        $state = $errors !== [] ? 'partial' : ($featureCount === 0 ? 'empty' : 'fresh');

        return [
            'schemaVersion' => self::SCHEMA_VERSION,
            'kind' => 'tropical-overview',
            'basin' => $basin,
            'generatedAt' => $generatedAt,
            'state' => $state,
            'stale' => false,
            'sourceIssueTime' => $outlook['sourceIssueTime'],
            'sources' => array_merge([
                self::sourceRecord(
                    'current-storms',
                    (string) ($sourceUrls['currentStorms'] ?? ''),
                    self::latestStormIssueTime($positions),
                    $generatedAt,
                    'fresh'
                ),
                self::sourceRecord(
                    'outlook-json',
                    (string) ($sourceUrls['outlookJson'] ?? ''),
                    $outlook['sourceIssueTime'],
                    $generatedAt,
                    'fresh'
                ),
                self::sourceRecord(
                    'outlook-kmz',
                    (string) ($sourceUrls['outlookKmz'] ?? ''),
                    $outlook['sourceIssueTime'],
                    $generatedAt,
                    'fresh'
                ),
            ], $stormSources),
            'counts' => $counts,
            'layers' => $layers,
            'text' => [
                'outlookEnglishHtml' => $outlook['outlookEnglishHtml'],
                'outlookSpanishHtml' => $outlook['outlookSpanishHtml'],
            ],
            'errors' => $errors,
        ];
    }

    /**
     * @param callable(array,string):?string $productProvider
     * @return array{manifest:array,files:array<string,array>}
     */
    public static function buildStormPackage(
        string $stormId,
        array $currentStorms,
        callable $productProvider,
        ?string $generatedAt = null
    ): array {
        $storm = self::findCurrentStorm($currentStorms, $stormId);
        $stormId = $storm['id'];
        $generatedAt ??= self::utcNow();
        $advisory = self::stormAdvisory($storm);
        $issueTime = self::stormIssueTime($storm);
        $files = [
            'current-position.geojson' => self::featureCollection([self::stormPositionFeature($storm)]),
        ];
        $products = [
            'currentPosition' => ['state' => 'fresh', 'file' => 'current-position.geojson'],
        ];
        $sources = [];
        $errors = [];
        $track = null;

        $simpleProducts = [
            'forecastTrack' => ['file' => 'forecast-track.geojson', 'manifestKey' => 'forecastTrack'],
            'trackCone' => ['file' => 'cone.geojson', 'manifestKey' => 'cone'],
            'windWatchesWarnings' => ['file' => 'watches-warnings.geojson', 'manifestKey' => 'watchesWarnings'],
            'bestTrackGIS' => ['file' => 'best-track.geojson', 'manifestKey' => 'bestTrack'],
            'stormSurgeWatchWarningGIS' => ['file' => 'surge-warnings.geojson', 'manifestKey' => 'surgeWarnings'],
        ];
        foreach ($simpleProducts as $sourceKey => $definition) {
            $source = $storm[$sourceKey] ?? null;
            $url = self::productUrl($source);
            if ($url === '') {
                $products[$definition['manifestKey']] = ['state' => 'not-issued', 'file' => null];
                continue;
            }
            try {
                $path = $productProvider($storm, $sourceKey);
                if ($path === null) {
                    throw new TropicalMapException('provider returned no local product path');
                }
                $productAdvisory = self::productAdvisory($source, $advisory);
                $productIssueTime = self::productIssueTime($source, $issueTime);
                if ($sourceKey === 'forecastTrack') {
                    $track = self::parseTrackProduct($path, $stormId, $productAdvisory, $productIssueTime, $url);
                    $files[$definition['file']] = $track['all'];
                } elseif ($sourceKey === 'trackCone') {
                    $files[$definition['file']] = self::parseConeProduct(
                        $path,
                        $stormId,
                        $productAdvisory,
                        $productIssueTime,
                        $url
                    );
                } elseif ($sourceKey === 'windWatchesWarnings') {
                    $files[$definition['file']] = self::parseWarningsProduct(
                        $path,
                        $stormId,
                        $productAdvisory,
                        $productIssueTime,
                        $url
                    );
                } elseif ($sourceKey === 'bestTrackGIS') {
                    $files[$definition['file']] = self::parseBestTrackProduct(
                        $path,
                        $stormId,
                        $productIssueTime,
                        $url
                    );
                } else {
                    $files[$definition['file']] = self::parseSurgeWarningsProduct(
                        $path,
                        $stormId,
                        $productAdvisory,
                        $productIssueTime,
                        $url
                    );
                }
                $products[$definition['manifestKey']] = ['state' => 'fresh', 'file' => $definition['file']];
                $sources[] = self::sourceRecord($sourceKey, $url, $productIssueTime, $generatedAt, 'fresh');
            } catch (Throwable $error) {
                $products[$definition['manifestKey']] = ['state' => 'unavailable', 'file' => null];
                $errors[] = [
                    'code' => 'storm-product-unavailable',
                    'product' => $sourceKey,
                    'stormId' => $stormId,
                    'message' => $error->getMessage(),
                ];
                $sources[] = self::sourceRecord($sourceKey, $url, $issueTime, $generatedAt, 'unavailable');
            }
        }

        $initial = $storm['initialWindExtent'] ?? null;
        $forecast = $storm['forecastWindRadiiGIS'] ?? null;
        $initialUrl = self::productUrl($initial);
        $forecastUrl = self::productUrl($forecast);
        if ($initialUrl === '' && $forecastUrl === '') {
            $products['windRadii'] = ['state' => 'not-issued', 'file' => null];
        } elseif ($track === null) {
            $products['windRadii'] = ['state' => 'unavailable', 'file' => null];
            $errors[] = [
                'code' => 'wind-radii-track-required',
                'product' => 'windRadii',
                'stormId' => $stormId,
                'message' => 'Forecast track points are unavailable for radii correlation',
            ];
        } else {
            try {
                $initialPath = $initialUrl !== '' ? $productProvider($storm, 'initialWindExtent') : null;
                $forecastPath = $forecastUrl !== '' ? $productProvider($storm, 'forecastWindRadiiGIS') : null;
                $radiiSource = is_array($forecast) ? $forecast : (is_array($initial) ? $initial : []);
                $radiiAdvisory = self::productAdvisory($radiiSource, $advisory);
                $radiiIssueTime = self::productIssueTime($radiiSource, $issueTime);
                $files['wind-radii.geojson'] = self::parseWindRadiiProducts(
                    $initialPath,
                    $forecastPath,
                    $track['points'],
                    $stormId,
                    $radiiAdvisory,
                    $radiiIssueTime,
                    ['initial' => $initialUrl, 'forecast' => $forecastUrl]
                );
                $products['windRadii'] = ['state' => 'fresh', 'file' => 'wind-radii.geojson'];
                foreach (['initialWindExtent' => $initialUrl, 'forecastWindRadiiGIS' => $forecastUrl] as $key => $url) {
                    if ($url !== '') {
                        $source = $storm[$key] ?? [];
                        $sources[] = self::sourceRecord(
                            $key,
                            $url,
                            self::productIssueTime(is_array($source) ? $source : [], $radiiIssueTime),
                            $generatedAt,
                            'fresh'
                        );
                    }
                }
            } catch (Throwable $error) {
                $products['windRadii'] = ['state' => 'unavailable', 'file' => null];
                $errors[] = [
                    'code' => 'storm-product-unavailable',
                    'product' => 'windRadii',
                    'stormId' => $stormId,
                    'message' => $error->getMessage(),
                ];
            }
        }

        foreach ($products as $productKey => $definition) {
            $file = $definition['file'] ?? null;
            if (is_string($file) && isset($files[$file])) {
                $products[$productKey]['sha256'] = hash('sha256', self::encodeJson($files[$file]));
            }
        }

        $manifest = [
            'schemaVersion' => self::SCHEMA_VERSION,
            'kind' => 'tropical-storm-map',
            'stormId' => $stormId,
            'stormState' => 'live',
            'advisoryNumber' => $advisory,
            'sourceIssueTime' => $issueTime,
            'generatedAt' => $generatedAt,
            'state' => $errors === [] ? 'fresh' : 'partial',
            'products' => $products,
            'sources' => $sources,
            'errors' => $errors,
        ];

        return ['manifest' => $manifest, 'files' => $files];
    }

    public static function publishOverviewPackage(string $directory, array $package): string
    {
        $basin = self::validateBasin((string) ($package['basin'] ?? ''));
        if (($package['kind'] ?? null) !== 'tropical-overview') {
            throw new TropicalMapException('Refusing to publish a non-overview package');
        }
        $path = rtrim($directory, '/\\') . DIRECTORY_SEPARATOR . "overview-{$basin}.json";
        if (is_file($path)) {
            $existing = self::readJsonFile($path);
            $oldTime = strtotime((string) ($existing['sourceIssueTime'] ?? ''));
            $newTime = strtotime((string) ($package['sourceIssueTime'] ?? ''));
            if ($oldTime !== false && $newTime !== false && $newTime < $oldTime) {
                throw new TropicalMapException("Refusing source-time regression for {$basin}");
            }
        }
        self::writeJsonAtomic($path, $package);
        return $path;
    }

    public static function markOverviewStale(string $directory, string $basin, Throwable $error): bool
    {
        $basin = self::validateBasin($basin);
        $path = rtrim($directory, '/\\') . DIRECTORY_SEPARATOR . "overview-{$basin}.json";
        if (!is_file($path)) {
            return false;
        }
        $package = self::readJsonFile($path);
        $package['state'] = 'stale';
        $package['stale'] = true;
        $package['lastRefreshFailureAt'] = self::utcNow();
        $package['errors'][] = [
            'code' => 'refresh-failed',
            'message' => $error->getMessage(),
        ];
        self::writeJsonAtomic($path, $package);
        return true;
    }

    public static function publishStormPackage(string $stormRoot, array $bundle): string
    {
        $manifest = $bundle['manifest'] ?? null;
        $files = $bundle['files'] ?? null;
        if (!is_array($manifest) || !is_array($files)) {
            throw new TropicalMapException('Invalid storm package bundle');
        }
        $stormId = self::validateStormId((string) ($manifest['stormId'] ?? ''));
        $directory = rtrim($stormRoot, '/\\') . DIRECTORY_SEPARATOR . $stormId . DIRECTORY_SEPARATOR . 'map';
        foreach ($files as $file => $payload) {
            if (!preg_match('/^[a-z0-9-]+\.geojson$/', (string) $file) || !is_array($payload)) {
                throw new TropicalMapException("Unsafe storm package filename: {$file}");
            }
            self::writeJsonAtomic($directory . DIRECTORY_SEPARATOR . $file, $payload);
        }
        // Publish the manifest last; consumers should treat it as the package commit point.
        self::writeJsonAtomic($directory . DIRECTORY_SEPARATOR . 'manifest.json', $manifest);
        return $directory;
    }

    public static function writeJsonAtomic(string $path, array $payload): void
    {
        $directory = dirname($path);
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw new TropicalMapException("Unable to create directory: {$directory}");
        }
        $json = self::encodeJson($payload) . PHP_EOL;
        $temporary = $path . '.tmp-' . bin2hex(random_bytes(6));
        $handle = fopen($temporary, 'xb');
        if ($handle === false) {
            throw new TropicalMapException("Unable to create temporary file: {$temporary}");
        }
        try {
            if (!flock($handle, LOCK_EX)) {
                throw new TropicalMapException("Unable to lock temporary file: {$temporary}");
            }
            $written = fwrite($handle, $json);
            if ($written === false || $written !== strlen($json)) {
                throw new TropicalMapException("Unable to write complete temporary file: {$temporary}");
            }
            fflush($handle);
        } catch (Throwable $error) {
            fclose($handle);
            @unlink($temporary);
            throw $error;
        }
        fclose($handle);
        if (!rename($temporary, $path)) {
            @unlink($temporary);
            throw new TropicalMapException("Atomic rename failed: {$path}");
        }
    }

    public static function featureCollection(array $features): array
    {
        if (count($features) > self::MAX_FEATURES) {
            throw new TropicalMapException('FeatureCollection exceeds the feature-count bound');
        }
        return ['type' => 'FeatureCollection', 'features' => array_values($features)];
    }

    public static function normalizeGeometry(array $geometry): array
    {
        $type = $geometry['type'] ?? null;
        if ($type === 'Point') {
            return ['type' => 'Point', 'coordinates' => self::normalizeCoordinate($geometry['coordinates'])];
        }
        if ($type === 'MultiPoint') {
            return [
                'type' => 'MultiPoint',
                'coordinates' => array_map([self::class, 'normalizeCoordinate'], $geometry['coordinates']),
            ];
        }
        if ($type === 'LineString') {
            $segments = self::splitLineAtDateline($geometry['coordinates']);
            return count($segments) === 1
                ? ['type' => 'LineString', 'coordinates' => $segments[0]]
                : ['type' => 'MultiLineString', 'coordinates' => $segments];
        }
        if ($type === 'MultiLineString') {
            $segments = [];
            foreach ($geometry['coordinates'] as $line) {
                array_push($segments, ...self::splitLineAtDateline($line));
            }
            return ['type' => 'MultiLineString', 'coordinates' => $segments];
        }
        if ($type === 'Polygon') {
            $polygons = self::splitPolygonAtDateline($geometry['coordinates']);
            return count($polygons) === 1
                ? ['type' => 'Polygon', 'coordinates' => $polygons[0]]
                : ['type' => 'MultiPolygon', 'coordinates' => $polygons];
        }
        if ($type === 'MultiPolygon') {
            $polygons = [];
            foreach ($geometry['coordinates'] as $polygon) {
                array_push($polygons, ...self::splitPolygonAtDateline($polygon));
            }
            return ['type' => 'MultiPolygon', 'coordinates' => $polygons];
        }
        if ($type === 'GeometryCollection') {
            return [
                'type' => 'GeometryCollection',
                'geometries' => array_map([self::class, 'normalizeGeometry'], $geometry['geometries']),
            ];
        }
        throw new TropicalMapException('Unsupported geometry type: ' . (string) $type);
    }

    private static function assertAllowedUrl(string $url): void
    {
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        if ($scheme !== 'https' || !in_array($host, self::ALLOWED_HOSTS, true)) {
            throw new TropicalMapException("Source URL is not allowlisted: {$url}");
        }
        if (isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) {
            throw new TropicalMapException("Source URL contains forbidden authority fields: {$url}");
        }
    }

    private static function contentTypeAllowed(string $actual, array $accepted): bool
    {
        $actual = strtolower(trim(explode(';', $actual, 2)[0]));
        foreach ($accepted as $allowed) {
            if ($actual === strtolower($allowed)) {
                return true;
            }
        }
        return false;
    }

    private static function encodeJson(array $payload): string
    {
        try {
            return json_encode(
                $payload,
                JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
            );
        } catch (JsonException $error) {
            throw new TropicalMapException('JSON serialization failed: ' . $error->getMessage(), 0, $error);
        }
    }

    private static function parseKmlGeometry(DOMElement $node, DOMXPath $xpath): array
    {
        $name = $node->localName;
        if ($name === 'Point') {
            $coordinates = self::parseCoordinateText(
                self::firstNodeText($xpath, './*[local-name()="coordinates"]', $node)
            );
            if (count($coordinates) !== 1) {
                throw new TropicalMapException('KML Point must contain exactly one coordinate');
            }
            return ['type' => 'Point', 'coordinates' => $coordinates[0]];
        }
        if ($name === 'LineString') {
            $coordinates = self::parseCoordinateText(
                self::firstNodeText($xpath, './*[local-name()="coordinates"]', $node)
            );
            if (count($coordinates) < 2) {
                throw new TropicalMapException('KML LineString must contain at least two coordinates');
            }
            return ['type' => 'LineString', 'coordinates' => $coordinates];
        }
        if ($name === 'Polygon') {
            $outerNode = $xpath->query(
                './*[local-name()="outerBoundaryIs"]//*[local-name()="LinearRing"]/*[local-name()="coordinates"]',
                $node
            )->item(0);
            if (!$outerNode instanceof DOMNode) {
                throw new TropicalMapException('KML Polygon is missing an outer ring');
            }
            $rings = [self::closeRing(self::parseCoordinateText(trim($outerNode->textContent)))];
            foreach ($xpath->query(
                './*[local-name()="innerBoundaryIs"]//*[local-name()="LinearRing"]/*[local-name()="coordinates"]',
                $node
            ) as $innerNode) {
                $rings[] = self::closeRing(self::parseCoordinateText(trim($innerNode->textContent)));
            }
            return ['type' => 'Polygon', 'coordinates' => $rings];
        }
        if ($name === 'MultiGeometry') {
            $geometries = [];
            foreach ($node->childNodes as $child) {
                if ($child instanceof DOMElement && in_array($child->localName, self::GEOMETRY_NAMES, true)) {
                    $geometries[] = self::parseKmlGeometry($child, $xpath);
                }
            }
            if ($geometries === []) {
                throw new TropicalMapException('KML MultiGeometry is empty');
            }
            return self::combineGeometries($geometries);
        }
        throw new TropicalMapException("Unsupported KML geometry: {$name}");
    }

    private static function parseCoordinateText(string $text): array
    {
        $text = trim($text);
        if ($text === '') {
            return [];
        }
        $coordinates = [];
        foreach (preg_split('/\s+/', $text) ?: [] as $tuple) {
            $parts = explode(',', trim($tuple));
            if (count($parts) < 2 || !is_numeric($parts[0]) || !is_numeric($parts[1])) {
                throw new TropicalMapException("Invalid KML coordinate tuple: {$tuple}");
            }
            $longitude = (float) $parts[0];
            $latitude = (float) $parts[1];
            if (!is_finite($longitude) || !is_finite($latitude) || $latitude < -90 || $latitude > 90) {
                throw new TropicalMapException("Out-of-range KML coordinate: {$tuple}");
            }
            $coordinates[] = [$longitude, $latitude];
            if (count($coordinates) > self::MAX_COORDINATES) {
                throw new TropicalMapException('Coordinate sequence exceeds the bound');
            }
        }
        return $coordinates;
    }

    private static function combineGeometries(array $geometries): array
    {
        if (count($geometries) === 1) {
            return $geometries[0];
        }
        $types = array_unique(array_column($geometries, 'type'));
        if (count($types) === 1) {
            $type = $types[0];
            if ($type === 'Point') {
                return ['type' => 'MultiPoint', 'coordinates' => array_column($geometries, 'coordinates')];
            }
            if ($type === 'LineString') {
                return ['type' => 'MultiLineString', 'coordinates' => array_column($geometries, 'coordinates')];
            }
            if ($type === 'Polygon') {
                return ['type' => 'MultiPolygon', 'coordinates' => array_column($geometries, 'coordinates')];
            }
        }
        return ['type' => 'GeometryCollection', 'geometries' => $geometries];
    }

    private static function firstNodeText(DOMXPath $xpath, string $query, DOMNode $context): string
    {
        $node = $xpath->query($query, $context)->item(0);
        return $node instanceof DOMNode ? trim($node->textContent) : '';
    }

    private static function sanitizeOfficialHtml(string $html): string
    {
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/[\t ]+/', ' ', $text) ?? $text;
        $text = preg_replace('/\R{3,}/', "\n\n", $text) ?? $text;
        return nl2br(htmlspecialchars(trim($text), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), false);
    }

    private static function outlookDetailsText(mixed $details): string
    {
        if (is_string($details)) {
            return $details;
        }
        if (!is_array($details)) {
            return '';
        }
        $parts = [];
        foreach (['issuance_time', 'location', 'summary', 'formation_chance_2d', 'formation_chance_7d'] as $key) {
            $value = trim((string) ($details[$key] ?? ''));
            if ($value !== '') {
                $parts[] = $value;
            }
        }
        return implode("\n", $parts);
    }

    private static function parseOutlookIssueTime(array $metadata): string
    {
        $raw = trim((string) ($metadata['two_issue_date_time_str'] ?? ''));
        if (!preg_match('/^\d{12}$/', $raw)) {
            throw new TropicalMapException('Outlook issue timestamp must be YYYYMMDDHHMM');
        }
        $date = DateTimeImmutable::createFromFormat('!YmdHi', $raw, new DateTimeZone('UTC'));
        $errors = DateTimeImmutable::getLastErrors();
        if ($date === false || (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
            throw new TropicalMapException("Invalid outlook issue timestamp: {$raw}");
        }
        $epoch = $metadata['epoch'] ?? null;
        if (is_numeric($epoch) && abs((int) $epoch - $date->getTimestamp()) > 12 * 3600) {
            throw new TropicalMapException('Outlook epoch and issue timestamp differ by more than 12 hours');
        }
        return $date->format('Y-m-d\TH:i:s\Z');
    }

    private static function stormAdvisory(array $storm): string
    {
        $advisory = trim((string) ($storm['publicAdvisory']['advNum'] ?? ''));
        if ($advisory === '' || !preg_match('/^\d{1,4}[A-Za-z]?$/', $advisory)) {
            throw new TropicalMapException('Storm has no valid advisory number');
        }
        return $advisory;
    }

    private static function stormIssueTime(array $storm): string
    {
        $raw = trim((string) ($storm['lastUpdate'] ?? ''));
        if ($raw === '') {
            throw new TropicalMapException('Storm has no lastUpdate timestamp');
        }
        try {
            $date = new DateTimeImmutable($raw, new DateTimeZone('UTC'));
        } catch (Throwable $error) {
            throw new TropicalMapException("Invalid storm lastUpdate timestamp: {$raw}", 0, $error);
        }
        return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    }

    private static function productUrl(mixed $product): string
    {
        if (!is_array($product)) {
            return '';
        }
        foreach (['kmzFile', 'kmlFile'] as $key) {
            $url = trim((string) ($product[$key] ?? ''));
            if ($url !== '') {
                return $url;
            }
        }
        return '';
    }

    private static function productAdvisory(mixed $product, string $fallback): string
    {
        $advisory = is_array($product) ? trim((string) ($product['advNum'] ?? '')) : '';
        if ($advisory === '') {
            return $fallback;
        }
        if (!preg_match('/^\d{1,4}[A-Za-z]?$/', $advisory)) {
            throw new TropicalMapException("Invalid product advisory number: {$advisory}");
        }
        return $advisory;
    }

    private static function productIssueTime(mixed $product, string $fallback): string
    {
        $raw = is_array($product) ? trim((string) ($product['issuance'] ?? '')) : '';
        if ($raw === '') {
            return $fallback;
        }
        try {
            $date = new DateTimeImmutable($raw, new DateTimeZone('UTC'));
        } catch (Throwable $error) {
            throw new TropicalMapException("Invalid product issuance timestamp: {$raw}", 0, $error);
        }
        return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    }

    private static function assertSurgeProductUrl(string $sourceUrl, string $stormId, string $advisory): void
    {
        $path = parse_url($sourceUrl, PHP_URL_PATH);
        $file = is_string($path) ? rawurldecode(basename($path)) : '';
        if (!preg_match('/^((?:AL|EP|CP)\d{6})_WatchWarningSS_(\d{1,4}[A-Za-z]?)adv\.kml$/i', $file, $match)) {
            throw new TropicalMapException("Storm-surge product URL does not carry verifiable identity for {$stormId}");
        }
        if (strtoupper($match[1]) !== $stormId) {
            throw new TropicalMapException("Storm identity mismatch in storm-surge product URL for {$stormId}");
        }
        if (self::normalizeAdvisory($match[2]) !== self::normalizeAdvisory($advisory)) {
            throw new TropicalMapException("Advisory mismatch in storm-surge product URL for {$stormId}");
        }
    }

    private static function assertProductIdentity(array $features, string $stormId, ?string $advisory): void
    {
        $foundStormIdentity = false;
        $foundAdvisoryIdentity = false;
        foreach ($features as $feature) {
            $extended = [];
            foreach (($feature['properties']['extendedData'] ?? []) as $key => $value) {
                $extended[strtolower((string) $key)] = trim((string) $value);
            }
            if (($extended['atcfid'] ?? '') !== '') {
                $foundStormIdentity = true;
                if (strtoupper($extended['atcfid']) !== $stormId) {
                    throw new TropicalMapException("Storm identity mismatch in product for {$stormId}");
                }
            }
            if (($extended['advisorynum'] ?? '') !== '') {
                $foundAdvisoryIdentity = true;
                if ($advisory !== null && self::normalizeAdvisory($extended['advisorynum']) !== self::normalizeAdvisory($advisory)) {
                    throw new TropicalMapException("Advisory identity mismatch in product for {$stormId}");
                }
            }
            $description = self::descriptionText((string) ($feature['properties']['description'] ?? ''));
            if (preg_match('/\b((?:AL|EP|CP)\d{6})\b/i', $description, $match)) {
                $foundStormIdentity = true;
                if (strtoupper($match[1]) !== $stormId) {
                    throw new TropicalMapException("Storm identity mismatch in product description for {$stormId}");
                }
            }
            if (preg_match('/Advisory\s*#\s*(\d{1,4}[A-Za-z]?)/i', $description, $match)) {
                $foundAdvisoryIdentity = true;
                if ($advisory !== null && self::normalizeAdvisory($match[1]) !== self::normalizeAdvisory($advisory)) {
                    throw new TropicalMapException("Advisory mismatch in product description for {$stormId}");
                }
            }
        }
        if (!$foundStormIdentity) {
            throw new TropicalMapException("Product does not carry verifiable storm identity for {$stormId}");
        }
        if ($advisory !== null && !$foundAdvisoryIdentity) {
            throw new TropicalMapException("Product does not carry verifiable advisory identity for {$stormId}");
        }
    }

    private static function normalizeAdvisory(string $advisory): string
    {
        $advisory = strtoupper(trim($advisory));
        if (!preg_match('/^(\d+)([A-Z]?)$/', $advisory, $match)) {
            return $advisory;
        }
        return (string) ((int) $match[1]) . $match[2];
    }

    private static function descriptionText(string $description): string
    {
        $text = html_entity_decode(strip_tags($description), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace('/\s+/', ' ', $text) ?? $text);
    }

    private static function addHours(string $isoTime, int $hours): string
    {
        $date = new DateTimeImmutable($isoTime, new DateTimeZone('UTC'));
        return $date->modify("+{$hours} hours")->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    }

    private static function windThreshold(mixed $value): int
    {
        $threshold = is_numeric($value) ? (int) $value : 0;
        if (!in_array($threshold, [34, 50, 64], true)) {
            throw new TropicalMapException('Wind-radii polygon must be named 34, 50, or 64');
        }
        return $threshold;
    }

    private static function radiiFeature(
        array $geometry,
        string $stormId,
        string $advisory,
        int $threshold,
        int $forecastHour,
        string $sourceIssueTime,
        string $sourceUrl
    ): array {
        return [
            'type' => 'Feature',
            'geometry' => $geometry,
            'properties' => [
                'product' => 'wind-radii',
                'stormId' => $stormId,
                'advisoryNumber' => $advisory,
                'windThresholdKnots' => $threshold,
                'forecastHour' => $forecastHour,
                'validTime' => self::addHours($sourceIssueTime, $forecastHour),
                'sourceIssueTime' => $sourceIssueTime,
                'sourceUrl' => $sourceUrl,
            ],
        ];
    }

    private static function sourceRecord(
        string $product,
        string $url,
        ?string $sourceIssueTime,
        string $fetchedAt,
        string $state
    ): array {
        return [
            'product' => $product,
            'url' => $url,
            'httpLastModified' => null,
            'sourceIssueTime' => $sourceIssueTime,
            'fetchedAt' => $fetchedAt,
            'state' => $state,
        ];
    }

    private static function latestStormIssueTime(array $positions): ?string
    {
        $times = [];
        foreach ($positions as $feature) {
            $time = $feature['properties']['sourceIssueTime'] ?? null;
            if (is_string($time) && strtotime($time) !== false) {
                $times[] = $time;
            }
        }
        if ($times === []) {
            return null;
        }
        usort($times, static fn (string $a, string $b): int => strtotime($b) <=> strtotime($a));
        return $times[0];
    }

    private static function normalizeLongitude(float $longitude): float
    {
        $normalized = fmod($longitude + 180.0, 360.0);
        if ($normalized < 0) {
            $normalized += 360.0;
        }
        $normalized -= 180.0;
        return abs($normalized) < 1e-12 ? 0.0 : $normalized;
    }

    private static function normalizeCoordinate(array $coordinate): array
    {
        if (count($coordinate) < 2 || !is_numeric($coordinate[0]) || !is_numeric($coordinate[1])) {
            throw new TropicalMapException('Invalid coordinate');
        }
        $latitude = (float) $coordinate[1];
        if (!is_finite($latitude) || $latitude < -90 || $latitude > 90) {
            throw new TropicalMapException('Latitude is out of range');
        }
        return [self::normalizeLongitude((float) $coordinate[0]), $latitude];
    }

    private static function splitLineAtDateline(array $coordinates): array
    {
        if (count($coordinates) < 2) {
            throw new TropicalMapException('LineString requires at least two coordinates');
        }
        $first = self::normalizeCoordinate($coordinates[0]);
        $segments = [[$first]];
        $segmentIndex = 0;
        $previous = $first;
        for ($index = 1, $count = count($coordinates); $index < $count; $index++) {
            $current = self::normalizeCoordinate($coordinates[$index]);
            $delta = $current[0] - $previous[0];
            if (abs($delta) <= 180.0) {
                $segments[$segmentIndex][] = $current;
                $previous = $current;
                continue;
            }

            $adjustedLongitude = $current[0] + ($delta > 180.0 ? -360.0 : 360.0);
            $boundary = $adjustedLongitude > $previous[0] ? 180.0 : -180.0;
            $ratio = ($boundary - $previous[0]) / ($adjustedLongitude - $previous[0]);
            $latitude = $previous[1] + ($current[1] - $previous[1]) * $ratio;
            $segments[$segmentIndex][] = [$boundary, $latitude];
            $counterpart = $boundary === 180.0 ? -180.0 : 180.0;
            $segments[] = [[$counterpart, $latitude], $current];
            $segmentIndex++;
            $previous = $current;
        }
        return array_values(array_filter($segments, static fn (array $segment): bool => count($segment) >= 2));
    }

    private static function splitPolygonAtDateline(array $rings): array
    {
        if ($rings === []) {
            throw new TropicalMapException('Polygon has no rings');
        }
        $outer = self::unwrapRing(self::closeRing($rings[0]));
        $outerCenter = self::ringLongitudeCenter($outer);
        $holes = [];
        foreach (array_slice($rings, 1) as $ring) {
            $unwrapped = self::unwrapRing(self::closeRing($ring));
            $shift = round(($outerCenter - self::ringLongitudeCenter($unwrapped)) / 360.0) * 360.0;
            $holes[] = array_map(
                static fn (array $point): array => [$point[0] + $shift, $point[1]],
                $unwrapped
            );
        }
        $longitudes = array_column($outer, 0);
        $minimum = min($longitudes);
        $maximum = max($longitudes);
        $firstCell = (int) floor(($minimum + 180.0) / 360.0);
        $lastCell = (int) floor(($maximum + 180.0 - 1e-12) / 360.0);
        $polygons = [];
        for ($cell = $firstCell; $cell <= $lastCell; $cell++) {
            $left = -180.0 + 360.0 * $cell;
            $right = 180.0 + 360.0 * $cell;
            $clippedOuter = self::clipRingToLongitudeWindow($outer, $left, $right);
            if ($clippedOuter === []) {
                continue;
            }
            $polygon = [self::shiftRingToCanonical($clippedOuter, $cell)];
            foreach ($holes as $hole) {
                $clippedHole = self::clipRingToLongitudeWindow($hole, $left, $right);
                if ($clippedHole !== []) {
                    $polygon[] = self::shiftRingToCanonical($clippedHole, $cell);
                }
            }
            $polygons[] = $polygon;
        }
        if ($polygons === []) {
            throw new TropicalMapException('Polygon clipping produced no valid geometry');
        }
        return $polygons;
    }

    private static function closeRing(array $ring): array
    {
        if (count($ring) < 3) {
            throw new TropicalMapException('Polygon ring requires at least three coordinates');
        }
        $first = $ring[0];
        $last = $ring[count($ring) - 1];
        if ((float) $first[0] !== (float) $last[0] || (float) $first[1] !== (float) $last[1]) {
            $ring[] = $first;
        }
        if (count($ring) < 4) {
            throw new TropicalMapException('Closed polygon ring requires four coordinates');
        }
        return $ring;
    }

    private static function unwrapRing(array $ring): array
    {
        $output = [self::normalizeCoordinate($ring[0])];
        for ($index = 1, $count = count($ring); $index < $count; $index++) {
            $point = self::normalizeCoordinate($ring[$index]);
            $previous = $output[$index - 1][0];
            while ($point[0] - $previous > 180.0) {
                $point[0] -= 360.0;
            }
            while ($point[0] - $previous < -180.0) {
                $point[0] += 360.0;
            }
            $output[] = $point;
        }
        return $output;
    }

    private static function ringLongitudeCenter(array $ring): float
    {
        return array_sum(array_column($ring, 0)) / count($ring);
    }

    private static function clipRingToLongitudeWindow(array $ring, float $left, float $right): array
    {
        $points = $ring;
        if (count($points) > 1 && $points[0] === $points[count($points) - 1]) {
            array_pop($points);
        }
        $points = self::clipPolygonBoundary($points, $left, true);
        $points = self::clipPolygonBoundary($points, $right, false);
        if (count($points) < 3) {
            return [];
        }
        $clean = [];
        foreach ($points as $point) {
            if ($clean === [] || !self::pointsEqual($clean[count($clean) - 1], $point)) {
                $clean[] = $point;
            }
        }
        if (count($clean) < 3) {
            return [];
        }
        $clean[] = $clean[0];
        return $clean;
    }

    private static function clipPolygonBoundary(array $points, float $boundary, bool $keepGreater): array
    {
        if ($points === []) {
            return [];
        }
        $output = [];
        $previous = $points[count($points) - 1];
        $previousInside = $keepGreater ? $previous[0] >= $boundary : $previous[0] <= $boundary;
        foreach ($points as $current) {
            $currentInside = $keepGreater ? $current[0] >= $boundary : $current[0] <= $boundary;
            if ($currentInside !== $previousInside) {
                $denominator = $current[0] - $previous[0];
                if (abs($denominator) > 1e-12) {
                    $ratio = ($boundary - $previous[0]) / $denominator;
                    $output[] = [
                        $boundary,
                        $previous[1] + ($current[1] - $previous[1]) * $ratio,
                    ];
                }
            }
            if ($currentInside) {
                $output[] = $current;
            }
            $previous = $current;
            $previousInside = $currentInside;
        }
        return $output;
    }

    private static function shiftRingToCanonical(array $ring, int $cell): array
    {
        $shift = 360.0 * $cell;
        return array_map(static function (array $point) use ($shift): array {
            $longitude = $point[0] - $shift;
            if ($longitude < -180.0) {
                $longitude = -180.0;
            } elseif ($longitude > 180.0) {
                $longitude = 180.0;
            }
            return [$longitude, $point[1]];
        }, $ring);
    }

    private static function pointsEqual(array $a, array $b): bool
    {
        return abs($a[0] - $b[0]) < 1e-10 && abs($a[1] - $b[1]) < 1e-10;
    }

    private static function geometryCenter(array $geometry): array
    {
        $coordinates = [];
        self::collectCoordinates($geometry, $coordinates);
        if ($coordinates === []) {
            throw new TropicalMapException('Cannot calculate a center for empty geometry');
        }
        $sin = 0.0;
        $cos = 0.0;
        $latitude = 0.0;
        foreach ($coordinates as $coordinate) {
            $radians = deg2rad($coordinate[0]);
            $sin += sin($radians);
            $cos += cos($radians);
            $latitude += $coordinate[1];
        }
        $longitude = rad2deg(atan2($sin / count($coordinates), $cos / count($coordinates)));
        return [self::normalizeLongitude($longitude), $latitude / count($coordinates)];
    }

    private static function collectCoordinates(array $geometry, array &$output): void
    {
        $type = $geometry['type'] ?? '';
        if ($type === 'Point') {
            $output[] = $geometry['coordinates'];
            return;
        }
        if ($type === 'GeometryCollection') {
            foreach ($geometry['geometries'] as $child) {
                self::collectCoordinates($child, $output);
            }
            return;
        }
        self::collectCoordinateArray($geometry['coordinates'] ?? [], $output);
    }

    private static function collectCoordinateArray(array $value, array &$output): void
    {
        if (isset($value[0], $value[1]) && is_numeric($value[0]) && is_numeric($value[1])) {
            $output[] = [(float) $value[0], (float) $value[1]];
            return;
        }
        foreach ($value as $child) {
            if (is_array($child)) {
                self::collectCoordinateArray($child, $output);
            }
        }
    }

    private static function countGeometryCoordinates(array $geometry): int
    {
        $coordinates = [];
        self::collectCoordinates($geometry, $coordinates);
        return count($coordinates);
    }
}
