<?php
// counties/bertie/api/cache_alerts.php
declare(strict_types=1);

// Spec: fetch alerts for the county's forecast zone, filter active only,
// sort by severity then issuance time, and never return null list.

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$config = json_decode(file_get_contents($dataDir . '/config.json'), true);
$zone = $config['zones']['forecast'] ?? null;
if (!$zone) { http_response_code(500); exit("Missing forecast zone\n"); }

function http_get_json($url, $timeout=10, $retries=2) {
  $attempt=0; $delay=250000;
  while (true) {
    $ch=curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>$timeout, CURLOPT_TIMEOUT=>$timeout,
      CURLOPT_USERAGENT=>'NCHurricaneCache/1.0'
    ]);
    $body=curl_exec($ch); $err=curl_errno($ch); $code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    if(!$err&&$code>=200&&$code<300&&$body){ $j=json_decode($body,true); if(json_last_error()===JSON_ERROR_NONE) return $j; }
    if($attempt>=2) return null; usleep($delay); $delay*=2; $attempt++;
  }
}
function atomic_write_json($p,$a){$t=$p.'.tmp';$j=json_encode($a,JSON_UNESCAPED_SLASHES);if($j===false)return false;if(file_put_contents($t,$j)===false)return false;return rename($t,$p);}

$url = "https://api.weather.gov/alerts/active/zone/{$zone}";
$json = http_get_json($url);
$alerts = [];

if ($json && isset($json['features'])) {
  foreach ($json['features'] as $f) {
    $p = $f['properties'] ?? [];
    // Only active statuses should be present here, but keep a guard:
    if (($p['status'] ?? '') !== 'Actual') continue;

    $alerts[] = [
      'id' => $p['id'] ?? null,
      'type' => $p['event'] ?? null,
      'severity' => $p['severity'] ?? null,
      'urgency' => $p['urgency'] ?? null,
      'status' => $p['status'] ?? null,
      'headline' => $p['headline'] ?? null,
      'description' => $p['description'] ?? null,
      'onset' => $p['onset'] ?? null,
      'expires' => $p['expires'] ?? null,
      'areaDesc' => $p['areaDesc'] ?? null
    ];
  }

  // Sort by severity then issuance (onset). Define a simple severity rank:
  $rank = ['Extreme'=>1,'Severe'=>2,'Moderate'=>3,'Minor'=>4,'Unknown'=>5,null=>6];
  usort($alerts, function($a,$b) use($rank){
    $ra = $rank[$a['severity'] ?? null] ?? 6;
    $rb = $rank[$b['severity'] ?? null] ?? 6;
    if ($ra !== $rb) return $ra <=> $rb;
    return strtotime($b['onset'] ?? '1970-01-01') <=> strtotime($a['onset'] ?? '1970-01-01');
  });
}

$out = [
  'generated' => gmdate('c'),
  'zone' => $zone,
  'alerts' => $alerts // empty array if none
];

atomic_write_json($dataDir . '/alerts.json', $out);
echo "OK\n";
