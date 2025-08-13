<?php
// counties/bertie/api/cache_afd.php
declare(strict_types=1);

// Spec: fetch latest AFD for the forecast office (county-wide), store plain text.

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$config = json_decode(file_get_contents($dataDir . '/config.json'), true);
$office = $config['forecastOffice']['id'] ?? 'MHX';

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

$url = "https://api.weather.gov/products/types/AFD/locations/{$office}";
$list = http_get_json($url);
$text = '';

if ($list && isset($list['@graph'][0]['id'])) {
  $latestUrl = $list['@graph'][0]['id'];
  $prd = http_get_json($latestUrl);
  // Some AFD product payloads embed text in 'productText'
  $text = $prd['productText'] ?? '';
}

$out = [
  'generated' => gmdate('c'),
  'office' => $office,
  'text' => $text
];

atomic_write_json($dataDir . '/discussion.json', $out);
echo "OK\n";
