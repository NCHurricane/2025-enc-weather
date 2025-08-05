<?php

/**
 * DEBUG VERSION - Tropical Storm Data Test
 * Save this as debug_tropical.php in your web root directory
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>\n";
echo "<html><head><title>Tropical Debug</title></head><body>\n";
echo "<h2>Tropical Data Debug Test</h2>\n";
echo "<pre>\n";

echo "Debug started at: " . date('Y-m-d H:i:s') . "\n";
echo "Server document root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Current script path: " . __FILE__ . "\n";
echo "Script directory: " . __DIR__ . "\n\n";

// Test file and directory paths
echo "=== FILE SYSTEM TEST ===\n";
$possible_paths = [
    __DIR__ . '/js/modules/tropical_data.php',
    __DIR__ . '/js/modules/cache/nhc_current_storms.json',
    __DIR__ . '/js/modules/cache/',
    __DIR__ . '/js/modules/logs/',
];

foreach ($possible_paths as $path) {
    if (is_file($path)) {
        echo "FILE EXISTS: $path (" . filesize($path) . " bytes)\n";
    } elseif (is_dir($path)) {
        echo "DIRECTORY EXISTS: $path\n";
        // List contents
        $files = scandir($path);
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..') {
                echo "  - $file\n";
            }
        }
    } else {
        echo "NOT FOUND: $path\n";
    }
}
echo "\n";

$nhc_url = 'https://www.nhc.noaa.gov/CurrentStorms.json';
$cache_file = __DIR__ . '/js/modules/cache/nhc_current_storms.json';
$user_agent = 'NCHurricane.com Weather App/1.0 (Debug Test)';

echo "Testing NHC API fetch...\n";
echo "URL: $nhc_url\n";
echo "Cache file: $cache_file\n";
echo "User Agent: $user_agent\n\n";
echo "=== TEST 1: Basic URL accessibility ===\n";
$headers = @get_headers($nhc_url);
if ($headers) {
    echo "Headers received:\n";
    foreach ($headers as $header) {
        echo "  $header\n";
    }
} else {
    echo "ERROR: Cannot get headers from NHC URL\n";
}
echo "\n";

// Test 2: file_get_contents method
echo "=== TEST 2: file_get_contents method ===\n";
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => [
            'User-Agent: ' . $user_agent,
            'Accept: application/json'
        ],
        'timeout' => 30
    ]
]);

$data = @file_get_contents($nhc_url, false, $context);
if ($data === false) {
    echo "ERROR: file_get_contents failed\n";
    $error = error_get_last();
    if ($error) {
        echo "Error details: " . $error['message'] . "\n";
    }
} else {
    echo "SUCCESS: Retrieved " . strlen($data) . " bytes\n";

    // Parse and display storm data
    $json = json_decode($data, true);
    if ($json && isset($json['activeStorms'])) {
        echo "Active storms found: " . count($json['activeStorms']) . "\n";
        foreach ($json['activeStorms'] as $storm) {
            $name = $storm['name'] ?? 'Unknown';
            $bin = $storm['binNumber'] ?? 'Unknown';
            $classification = $storm['classification'] ?? 'Unknown';
            echo "  - $name ($bin) - $classification\n";
        }

        // Check specifically for Dexter
        $dexter = array_filter($json['activeStorms'], function ($storm) {
            return isset($storm['name']) && strtolower($storm['name']) === 'dexter';
        });

        if (!empty($dexter)) {
            echo "\nDEXTER FOUND!\n";
            echo "Dexter data: " . json_encode(array_values($dexter)[0], JSON_PRETTY_PRINT) . "\n";
        } else {
            echo "\nDEXTER NOT FOUND in current data\n";
        }
    } else {
        echo "ERROR: No activeStorms data in response\n";
        echo "Raw response (first 500 chars): " . substr($data, 0, 500) . "\n";
    }
}
echo "\n";

// Test 3: cURL method
echo "=== TEST 3: cURL method ===\n";
if (function_exists('curl_init')) {
    $ch = curl_init($nhc_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'User-Agent: ' . $user_agent,
            'Accept: application/json'
        ],
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2
    ]);

    $curl_data = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    echo "HTTP Code: $http_code\n";
    if ($curl_error) {
        echo "cURL Error: $curl_error\n";
    }

    if ($curl_data !== false && $http_code === 200) {
        echo "SUCCESS: cURL retrieved " . strlen($curl_data) . " bytes\n";

        // Compare with file_get_contents result
        if ($data !== false && $curl_data === $data) {
            echo "Data matches file_get_contents result\n";
        } else {
            echo "Data differs from file_get_contents result\n";
        }
    } else {
        echo "ERROR: cURL failed\n";
    }
} else {
    echo "cURL not available\n";
}
echo "\n";

// Test 4: Cache file status
echo "=== TEST 4: Cache file status ===\n";
if (file_exists($cache_file)) {
    $cache_age = time() - filemtime($cache_file);
    $cache_size = filesize($cache_file);
    echo "Cache file exists\n";
    echo "Age: $cache_age seconds (" . round($cache_age / 60, 1) . " minutes)\n";
    echo "Size: $cache_size bytes\n";

    $cache_content = file_get_contents($cache_file);
    $cache_json = json_decode($cache_content, true);

    if ($cache_json) {
        // Handle both direct format and metadata format
        $storms_data = $cache_json;
        if (isset($cache_json['data'])) {
            $storms_data = $cache_json['data'];
        }

        if (isset($storms_data['activeStorms'])) {
            echo "Cached storms: " . count($storms_data['activeStorms']) . "\n";
            foreach ($storms_data['activeStorms'] as $storm) {
                $name = $storm['name'] ?? 'Unknown';
                $bin = $storm['binNumber'] ?? 'Unknown';
                echo "  - $name ($bin)\n";
            }
        } else {
            echo "No activeStorms in cache\n";
            echo "Cache structure: " . json_encode(array_keys($storms_data), JSON_PRETTY_PRINT) . "\n";
        }
    } else {
        echo "ERROR: Invalid JSON in cache file\n";
        echo "First 200 chars: " . substr($cache_content, 0, 200) . "\n";
    }
} else {
    echo "Cache file does not exist\n";
    echo "Cache directory: " . dirname($cache_file) . "\n";
    echo "Cache dir exists: " . (is_dir(dirname($cache_file)) ? 'YES' : 'NO') . "\n";
    echo "Cache dir writable: " . (is_writable(dirname($cache_file)) ? 'YES' : 'NO') . "\n";
}
echo "\n";

// Test 5: Write a fresh cache file if we got good data
if ($data !== false && json_decode($data, true)) {
    echo "=== TEST 5: Writing fresh cache ===\n";

    // Ensure cache directory exists
    $cache_dir = dirname($cache_file);
    if (!is_dir($cache_dir)) {
        mkdir($cache_dir, 0777, true);
        echo "Created cache directory\n";
    }

    // Write cache with metadata format (matching your tropical_data.php)
    $cache_data = [
        'metadata' => [
            'cached_at' => time(),
            'cached_at_formatted' => date('Y-m-d H:i:s'),
            'source' => $nhc_url,
            'ttl' => 1800
        ],
        'data' => json_decode($data, true)
    ];

    $result = file_put_contents($cache_file, json_encode($cache_data, JSON_PRETTY_PRINT));
    if ($result !== false) {
        echo "SUCCESS: Written $result bytes to cache\n";
        echo "Cache file updated: " . date('Y-m-d H:i:s', filemtime($cache_file)) . "\n";
    } else {
        echo "ERROR: Failed to write cache file\n";
    }
}

echo "</pre>\n";

// JavaScript test section
echo "<h3>JavaScript Path Test</h3>\n";
echo "<div id='js-results'></div>\n";
echo "<script>\n";
echo "const results = document.getElementById('js-results');\n";
echo "results.innerHTML = '<p>Testing JavaScript paths...</p>';\n";

echo "// Test the corrected paths\n";
echo "const tests = [\n";
echo "  { name: 'Cache File', url: './js/modules/cache/nhc_current_storms.json' },\n";
echo "  { name: 'PHP API', url: './js/modules/tropical_data.php' },\n";
echo "  { name: 'Alternative Cache', url: 'js/modules/cache/nhc_current_storms.json' },\n";
echo "  { name: 'Alternative PHP', url: 'js/modules/tropical_data.php' }\n";
echo "];\n";

echo "async function runTests() {\n";
echo "  for (const test of tests) {\n";
echo "    try {\n";
echo "      const response = await fetch(test.url);\n";
echo "      const status = response.ok ? 'SUCCESS' : 'HTTP ' + response.status;\n";
echo "      results.innerHTML += '<p>' + test.name + ': ' + status + ' (' + test.url + ')</p>';\n";
echo "      \n";
echo "      if (response.ok && test.url.includes('tropical_data.php')) {\n";
echo "        const data = await response.json();\n";
echo "        results.innerHTML += '<p>Data structure: ' + JSON.stringify(Object.keys(data)) + '</p>';\n";
echo "        if (data.activeStorms) {\n";
echo "          results.innerHTML += '<p>Active storms: ' + data.activeStorms.length + '</p>';\n";
echo "        }\n";
echo "      }\n";
echo "    } catch (error) {\n";
echo "      results.innerHTML += '<p>' + test.name + ': ERROR - ' + error.message + '</p>';\n";
echo "    }\n";
echo "  }\n";
echo "}\n";

echo "runTests();\n";
echo "</script>\n";

echo "</body></html>\n";
