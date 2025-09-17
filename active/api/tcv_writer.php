<?php
/**
 * NHC TCV Writer, Atlantic - tcv_writer.php
 * Outputs: active/storms/ALnnYYYY/tcv.json
 * Caches zone geometries: /js/data/zones/cache/{ZONE}.json
 *
* Query:
 *   ?storm=ALnnYYYY  or ?storm=ALL
 */

declare(strict_types=1);
error_reporting(E_ALL);

function argOrGet(string $key, ?string $default=null): ?string {
  if (PHP_SAPI==='cli') {
    foreach ($GLOBALS['argv'] as $a) if (str_starts_with($a,"--{$key}=")) return substr($a, strlen($key)+3);
  }
  return $_GET[$key] ?? $default;
}
function fail(string $m, int $code=400): void {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode(['ok'=>false,'error'=>$m], JSON_PRETTY_PRINT); exit;
}
function ok(array $d): void {
  header('Content-Type: application/json');
  echo json_encode($d, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES); exit;
}

if (PHP_SAPI === 'cli') {
    foreach ($argv as $arg) {
        if (str_starts_with($arg, '--storm=')) {
            $_GET['storm'] = substr($arg, 8);
            break;
        }
    }
    if (!isset($_GET['storm'])) {
        $_GET['storm'] = 'ALL';
    }
}

$stormId = argOrGet('storm');

if ($stormId === 'ALL') {
    processAllALStormsTCV();
    exit;
}

if (!$stormId || !preg_match('/^AL(\d{2})\d{4}$/i',$stormId,$m)) fail('Provide storm like ALnnYYYY or ALL');

try {
    processSingleStormTCV($stormId);
} catch (Exception $e) {
    fail($e->getMessage(), 500);
}

function processAllALStormsTCV(): void {
    $currentStormsPath = __DIR__ . '/../../js/modules/cache/nhc_current_storms.json';
    
    if (!file_exists($currentStormsPath)) {
        if (PHP_SAPI === 'cli') {
            fwrite(STDERR, "ERROR: Current storms cache not found at {$currentStormsPath}\n");
        } else {
            fail('Current storms cache not available');
        }
        exit(1);
    }
    
    $rawStorms = file_get_contents($currentStormsPath);
    $stormsData = json_decode($rawStorms, true);
    
    if (!$stormsData || !isset($stormsData['data']['activeStorms'])) {
        if (PHP_SAPI === 'cli') {
            fwrite(STDERR, "ERROR: Invalid storms data format\n");
        } else {
            fail('Invalid storms data');
        }
        exit(1);
    }
    
    $alStorms = [];
    foreach ($stormsData['data']['activeStorms'] as $storm) {
        $stormId = strtoupper(trim($storm['id'] ?? ''));
        if (preg_match('/^AL\d{2}\d{4}$/', $stormId)) {
            $alStorms[] = $stormId;
        }
    }
    
    if (empty($alStorms)) {
        if (PHP_SAPI === 'cli') {
            echo "INFO: No active AL storms found\n";
        } else {
            ok(['ok' => true, 'message' => 'No active AL storms', 'processed' => []]);
        }
        exit(0);
    }
    
    $results = [];
    foreach ($alStorms as $stormId) {
        if (PHP_SAPI === 'cli') {
            echo "Processing TCV for {$stormId}...\n";
        }
        
        try {
            $result = processSingleStormTCV($stormId);
            $results[] = ['storm' => $stormId, 'status' => 'success', 'result' => $result];
            
            if (PHP_SAPI === 'cli') {
                echo "  SUCCESS: {$stormId}\n";
            }
        } catch (Exception $e) {
            $results[] = ['storm' => $stormId, 'status' => 'error', 'error' => $e->getMessage()];
            
            if (PHP_SAPI === 'cli') {
                echo "  ERROR: {$stormId} - " . $e->getMessage() . "\n";
            }
        }
    }
    
    if (PHP_SAPI === 'cli') {
        $successCount = count(array_filter($results, fn($r) => $r['status'] === 'success'));
        echo "Completed: {$successCount}/" . count($results) . " storms processed successfully\n";
    } else {
        ok(['ok' => true, 'processed' => $results]);
    }
}

function processSingleStormTCV(string $stormId): array {
    if (!preg_match('/^AL(\d{2})\d{4}$/i',$stormId,$m)) {
        throw new Exception('Invalid storm format. Expected ALnnYYYY');
    }
    
    $stormNum=(int)$m[1];
    $tcvIdx=($stormNum%5===0)?5:($stormNum%5);
    $embed = (int)(argOrGet('embed','0') ?? '0') === 1;

    $activeRoot = dirname(__DIR__);
    $siteRoot   = dirname($activeRoot);
    $stormDir   = $activeRoot."/storms/{$stormId}";
    $tcvOutPath = "{$stormDir}/tcv.json";
    $zonesDir   = "{$siteRoot}/js/data/zones";
    $zonesCache = "{$zonesDir}/cache";
    $zonesCatalogPath="{$siteRoot}/js/data/nws_filtered_zones.json";

    @is_dir($stormDir) || @mkdir($stormDir,0775,true);
    @is_dir($zonesCache) || @mkdir($zonesCache,0775,true);

    if (!is_file($zonesCatalogPath)) {
        throw new Exception("Missing zones catalog: {$zonesCatalogPath}");
    }
    $zonesCatalog=json_decode((string)file_get_contents($zonesCatalogPath),true);
    if (!is_array($zonesCatalog)) {
        throw new Exception('zones catalog invalid JSON');
    }

    $zoneMetaById=[];
    foreach($zonesCatalog as $z){
      if(!isset($z['id'])) continue;
      $zoneMetaById[$z['id']] = [
        'id'=>$z['id'],
        'name'=>$z['name'] ?? ($z['properties']['name'] ?? $z['id']),
        'state'=>$z['state']?? ($z['properties']['state']?? null),
      ];
    }

    $devFile=argOrGet('file');
    if ($devFile) {
      if (!is_file($devFile)) {
          throw new Exception("Dev file not found: {$devFile}");
      }
      $tcvRaw=(string)file_get_contents($devFile); $sourceUrl=$devFile;
    } else {
      $tcvUrl="https://www.nhc.noaa.gov/ftp/pub/forecasts/public/MIATCVAT{$tcvIdx}";
      $sourceUrl=$tcvUrl;
      $ch=curl_init($tcvUrl);
      curl_setopt_array($ch,[
        CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true,
        CURLOPT_CONNECTTIMEOUT=>8, CURLOPT_TIMEOUT=>15,
        CURLOPT_USERAGENT=>"NCHurricane/TCVWriter"
      ]);
      $tcvRaw=curl_exec($ch); $http=curl_getinfo($ch,CURLINFO_RESPONSE_CODE); curl_close($ch);
      if ($tcvRaw===false || $http!==200) {
        $empty=['meta'=>[
          'stormId'=>$stormId,'advisory'=>null,'issued'=>null,
          'productId'=>null,'productCode'=>"MIATCVAT{$tcvIdx}",
          'source'=>$sourceUrl,'disclaimer'=>null
        ], 'events'=>[], 'features'=>['type'=>'FeatureCollection','features'=>[]], 'display'=>['wind'=>[],'surge'=>[]]];
        file_put_contents($tcvOutPath, json_encode($empty, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
        return ['ok'=>true,'wrote'=>$tcvOutPath,'note'=>'TCV unavailable — wrote empty'];
      }
    }

    function expandZonesFromUGC(string $ugcLine): array {
      $line=trim($ugcLine);
      $line=preg_replace('/-\d{6}-\s*$/','',$line);
      $tokens=preg_split('/-+/', $line, -1, PREG_SPLIT_NO_EMPTY);
      $zones=[]; $currentPrefix=null;
      $emit=function(string $prefix,int $a,int $b)use(&$zones){ if($a>$b)[$a,$b]=[$b,$a]; for($i=$a;$i<=$b;$i++) $zones[]=sprintf('%s%03d',$prefix,$i); };
      foreach($tokens as $tok){
        $tok=trim($tok); if($tok==='') continue;
        if (preg_match('/^\d{6}$/',$tok)) break;
        if (preg_match('/^([A-Z]{2}[CZ])(\d{3})$/',$tok,$m)){ $currentPrefix=$m[1]; $zones[]=$m[1].$m[2]; continue; }
        if (preg_match('/^([A-Z]{2}[CZ])(\d{3})>(\d{3})$/',$tok,$m)){ $currentPrefix=$m[1]; $emit($currentPrefix,(int)$m[2],(int)$m[3]); continue; }
        if (preg_match('/^(\d{3})>(\d{3})$/',$tok,$m)){ if($currentPrefix) $emit($currentPrefix,(int)$m[1],(int)$m[2]); continue; }
        if (preg_match('/^\d{3}$/',$tok)){ if($currentPrefix) $zones[]=$currentPrefix.$tok; continue; }
        if (preg_match('/^[A-Z]{2}[CZ]\d{3}$/',$tok)){ $zones[]=$tok; $currentPrefix=substr($tok,0,3); continue; }
      }
      $seen=[]; $uniq=[]; foreach($zones as $z){ if(isset($seen[$z])) continue; $seen[$z]=true; $uniq[]=$z; } return $uniq;
    }
    function parseVTEC(string $line): ?array {
      $line=trim($line);
      if (!str_starts_with($line,'/O.')) return null;
      if (!preg_match('#^/O\.([A-Z]{3})\.([A-Z]{4})\.(HU|TR|SS)\.(A|W)\.(\d{4})\.([0-9TZ:-]+)-([0-9TZ:-]+)/$#',$line,$m)) return null;
      return ['action'=>$m[1],'office'=>$m[2],'phen'=>$m[3],'sig'=>$m[4],'etn'=>$m[5],'start'=>$m[6],'end'=>$m[7]];
    }
    function hazardBucket(string $phen): string { return ($phen==='SS')?'surge':'wind'; }
    function sigMax(?string $a, ?string $b): ?string { $r=['A'=>1,'W'=>2]; $ra=$a?($r[$a]??0):0; $rb=$b?($r[$b]??0):0; return ($rb>$ra)?$b:$a; }
    function zoneTypeFromId(string $zoneId): string {
      if (preg_match('/^[A-Z]{2}Z\d{3}$/',$zoneId)) return 'forecast';
      if (preg_match('/^[A-Z]{2}C\d{3}$/',$zoneId)) return 'county';
      return 'forecast';
    }
    function ensureZoneGeometry(string $zoneId, string $zoneType, string $cacheDir): ?array {
      $cacheFile="{$cacheDir}/{$zoneId}.json";
      if (is_file($cacheFile)) { $j=json_decode((string)file_get_contents($cacheFile),true); return is_array($j)?$j:null; }
      $url="https://api.weather.gov/zones/{$zoneType}/{$zoneId}";
      $ch=curl_init($url);
      curl_setopt_array($ch,[
        CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true, CURLOPT_CONNECTTIMEOUT=>8, CURLOPT_TIMEOUT=>20,
        CURLOPT_USERAGENT=>"NCHurricane/TCVWriter (https://nchurricane.com; contact: chuck@chuckcopeland.com)",
        CURLOPT_HTTPHEADER=>['Accept: application/geo+json, application/json;q=0.9'], CURLOPT_IPRESOLVE=>CURL_IPRESOLVE_V4
      ]);
      $raw=curl_exec($ch); $http=curl_getinfo($ch,CURLINFO_RESPONSE_CODE); curl_close($ch);
      if ($raw===false || $http!==200) return null;
      $json=json_decode($raw,true); if(!is_array($json) || !isset($json['geometry'])) return null;
      $feature=['type'=>'Feature','id'=>$zoneId,'geometry'=>$json['geometry'],
        'properties'=>['zoneName'=>$json['properties']['name']??$zoneId,'state'=>$json['properties']['state']??null]];
      @file_put_contents($cacheFile,json_encode($feature,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
      return $feature;
    }

    $lines=preg_split("/\r\n|\n|\r/",$tcvRaw);
    $productId=$advisoryNum=$issuedIso=$disclaimer=null;
    foreach($lines as $ix=>$ln){
      if($productId===null && preg_match('/^[A-Z]{5}\s+KNHC\s+\d{6}$/',trim($ln))) $productId=trim($ln);
      if($advisoryNum===null && preg_match('/ADVISORY NUMBER\s+(\d+)/i',$ln,$mm)) $advisoryNum=(int)$mm[1];
      if($disclaimer===null && str_starts_with(strtoupper(trim($ln)),'CAUTION')){
        $para=[$ln]; for($j=$ix+1;$j<count($lines);$j++){ $t=rtrim($lines[$j],"\r"); if($t==='') break; $para[]=$t; }
        $disclaimer=trim(implode("\n",$para));
      }
    }

    $final=[];
    for($i=0;$i<count($lines);$i++){
      $ln=trim($lines[$i]);
      if(preg_match('/^[A-Z]{2}[CZ]\d{3}.*-\d{6}-$/',$ln)){
        $zones=expandZonesFromUGC($ln);
        $i++;
        while($i<count($lines)){
          $v=trim($lines[$i]);
          if($v==='' || $v==='$$') break;
          if($v[0] !== '/') { $i++; continue; }
          $vtec=parseVTEC($v);
          if($vtec){
            $act=$vtec['action']; $phen=$vtec['phen']; $sig=$vtec['sig'];
            foreach($zones as $z){
              if(in_array($act,['CAN','EXP'],true)){ unset($final[$z][$phen]); continue; }
              $final[$z][$phen]=sigMax($final[$z][$phen]??null,$sig);
            }
          }
          $i++;
        }
      }
    }

    $events=[]; $display=['wind'=>[],'surge'=>[]];
    $groupBy=['wind'=>['HU.W'=>[], 'HU.A'=>[], 'TR.W'=>[], 'TR.A'=>[]], 'surge'=>['SS.W'=>[], 'SS.A'=>[]]];
    $features=[];

    function labelForCode(string $code): string {
      return match($code){
        'HU.W'=>'Hurricane Warning','HU.A'=>'Hurricane Watch',
        'TR.W'=>'Tropical Storm Warning','TR.A'=>'Tropical Storm Watch',
        'SS.W'=>'Storm Surge Warning','SS.A'=>'Storm Surge Watch', default=>$code
      };
    }

    foreach($final as $zoneId=>$phenMap){
      foreach(['HU','TR','SS'] as $phen){
        if(!isset($phenMap[$phen])) continue;
        $sig=$phenMap[$phen]; $haz=($phen==='SS')?'surge':'wind'; $code="{$phen}.{$sig}";
        $type=zoneTypeFromId($zoneId);
        $feature=ensureZoneGeometry($zoneId,$type,$zonesCache);
        $fallback=$zoneMetaById[$zoneId] ?? ['name'=>$zoneId,'state'=>null];
        $zoneName=$feature['properties']['zoneName'] ?? ($fallback['name'] ?? $zoneId);
        $state   =$feature['properties']['state']    ?? ($fallback['state'] ?? null);

        $events[]=['zoneId'=>$zoneId,'zoneType'=>$type,'zoneName'=>$zoneName,'state'=>$state,'phen'=>$phen,'sig'=>$sig,'hazard'=>$haz];

        $stKey=$state ?? 'UNK';
        if(!isset($groupBy[$haz][$code][$stKey])) $groupBy[$haz][$code][$stKey]=[];
        $groupBy[$haz][$code][$stKey][]=$zoneName;

        if ($embed && $feature){
          $feature['properties']['zoneName']=$zoneName;
          $feature['properties']['state']=$state;
          $feature['properties']['phen']=$phen;
          $feature['properties']['sig']=$sig;
          $feature['properties']['hazard']=$haz;
          $features[]=$feature;
        }
        usleep(60000);
      }
    }

    foreach(['wind','surge'] as $haz){
      foreach($groupBy[$haz] as $code=>$byState){
        if(empty($byState)) continue;
        ksort($byState);
        $states=[]; foreach($byState as $st=>$names){ sort($names,SORT_NATURAL|SORT_FLAG_CASE); $states[]=['state'=>$st,'count'=>count($names),'zones'=>array_values($names)]; }
        $display[$haz][]= ['label'=>labelForCode($code),'key'=>$code,'states'=>$states];
      }
    }

    $out=[
      'meta'=>[
        'stormId'=>$stormId,'advisory'=>$advisoryNum,'issued'=>$issuedIso,
        'productId'=>$productId,'productCode'=>"MIATCVAT{$tcvIdx}",'source'=>$sourceUrl,'disclaimer'=>$disclaimer
      ],
      'events'=>$events,
      'features'=>['type'=>'FeatureCollection','features'=>$features],
      'display'=>$display
    ];

    $tmp=$tcvOutPath.'.tmp'; 
    file_put_contents($tmp, json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)); 
    rename($tmp,$tcvOutPath);
    
    return ['ok'=>true,'wrote'=>$tcvOutPath,'events'=>count($events),'features'=>count($features),'embed'=>$embed];
}
?>