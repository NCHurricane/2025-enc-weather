[CmdletBinding()]
param(
    [ValidatePattern('^(AL|EP|CP)\d{6}$')]
    [string]$StormId = 'CP022026',

    [string]$ExpectedName = 'Moke',

    [string]$PhpPath = 'C:\php\php.exe',

    [string]$CaBundlePath = 'C:\Program Files\Git\mingw64\etc\ssl\certs\ca-bundle.crt',

    [switch]$SkipMtcswa,

    [switch]$WarmHazardTiles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$StormId = $StormId.ToUpperInvariant()
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

if (-not (Test-Path -LiteralPath $PhpPath -PathType Leaf)) {
    throw "PHP executable not found: $PhpPath"
}
if (-not (Test-Path -LiteralPath $CaBundlePath -PathType Leaf)) {
    throw "CA bundle not found: $CaBundlePath"
}

$phpOptions = @(
    '-d', "curl.cainfo=$CaBundlePath",
    '-d', "openssl.cafile=$CaBundlePath"
)

function Invoke-TropicalPhp {
    param(
        [Parameter(Mandatory)]
        [string]$Label,

        [Parameter(Mandatory)]
        [string]$RelativeScript,

        [string[]]$ScriptArguments = @(),

        [int[]]$AllowedExitCodes = @(0)
    )

    $scriptPath = Join-Path $repositoryRoot $RelativeScript
    if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
        throw "Tropical updater not found: $scriptPath"
    }

    $argumentText = if ($ScriptArguments.Count -gt 0) {
        ' ' + ($ScriptArguments -join ' ')
    } else {
        ''
    }
    Write-Host "`n[$Label] $RelativeScript$argumentText" -ForegroundColor Cyan

    & $PhpPath @phpOptions $scriptPath @ScriptArguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -notin $AllowedExitCodes) {
        throw "$Label failed with exit code $exitCode"
    }
    if ($exitCode -ne 0) {
        Write-Warning "$Label completed with allowed exit code $exitCode; retained-package validation will run next."
    }
}

function Read-RequiredJson {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Expected JSON output was not published: $Path"
    }
    try {
        return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    } catch {
        throw "Invalid JSON output at ${Path}: $($_.Exception.Message)"
    }
}

$basinScripts = @{
    AL = @{
        Advisory = 'active/api/advisory_writer.php'
        Tcv = 'active/api/tcv_writer.php'
        Cxml = 'active/api/cxml_writer.php'
        Graphics = 'active/api/nhc_graphics_cache.php'
    }
    EP = @{
        Advisory = 'active/api/advisory_writer_ep.php'
        Tcv = 'active/api/tcv_writer_ep.php'
        Cxml = 'active/api/cxml_writer_ep.php'
        Graphics = 'active/api/nhc_graphics_cache_ep.php'
    }
    CP = @{
        Advisory = 'active/api/advisory_writer_cp.php'
        Tcv = 'active/api/tcv_writer_cp.php'
        Cxml = 'active/api/cxml_writer_cp.php'
        Graphics = 'active/api/nhc_graphics_cache_cp.php'
    }
}

Push-Location $repositoryRoot
try {
    Invoke-TropicalPhp `
        -Label 'Current storms' `
        -RelativeScript 'active/api/tropical_data.php' `
        -ScriptArguments @('--cron')

    $currentStormsPath = Join-Path $repositoryRoot 'active/cache/nhc_current_storms.json'
    $currentPayload = Read-RequiredJson -Path $currentStormsPath
    $storm = @($currentPayload.data.activeStorms) |
        Where-Object { ([string]$_.id).ToUpperInvariant() -eq $StormId } |
        Select-Object -First 1

    if ($null -eq $storm) {
        throw "$StormId is not present in the refreshed NHC CurrentStorms payload. No storm-specific publisher was run."
    }
    if ($ExpectedName -and -not ([string]$storm.name).Equals($ExpectedName, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Identity mismatch: $StormId is named '$($storm.name)', not '$ExpectedName'."
    }

    $activeStormIds = @(
        foreach ($activeStorm in @($currentPayload.data.activeStorms)) {
            $activeStormId = ([string]$activeStorm.id).ToUpperInvariant()
            if ($activeStormId -notmatch '^(AL|EP|CP)\d{6}$') {
                throw "Unsupported active storm identity in the refreshed NHC payload: '$activeStormId'"
            }
            $activeStormId
        }
    )
    if ($activeStormIds.Count -eq 0) {
        throw 'The refreshed NHC CurrentStorms payload did not contain any supported active storms.'
    }

    Write-Host (
        "Verified {0} {1}, advisory {2}, issued {3}." -f
        $StormId,
        $storm.name,
        $storm.publicAdvisory.advNum,
        $storm.publicAdvisory.issuance
    ) -ForegroundColor Green
    Write-Host "Active storm package set: $($activeStormIds -join ', ')" -ForegroundColor Green

    Write-Host 'Note: text_products_cache.php refreshes every active storm in the current-storm cache.' -ForegroundColor DarkYellow
    Invoke-TropicalPhp `
        -Label 'Text products' `
        -RelativeScript 'active/api/text_products_cache.php' `
        -ScriptArguments @("--storm=$StormId")

    foreach ($activeStormId in $activeStormIds) {
        $activeBasin = $activeStormId.Substring(0, 2)
        $activeScripts = $basinScripts[$activeBasin]

        Invoke-TropicalPhp `
            -Label "Advisory summary for $activeStormId" `
            -RelativeScript $activeScripts.Advisory `
            -ScriptArguments @("--storm=$activeStormId")

        Invoke-TropicalPhp `
            -Label "Watch and warning zones for $activeStormId" `
            -RelativeScript $activeScripts.Tcv `
            -ScriptArguments @("--storm=$activeStormId", '--force', '--log')

        Invoke-TropicalPhp `
            -Label "Compact storm record for $activeStormId" `
            -RelativeScript $activeScripts.Cxml `
            -ScriptArguments @("--storm=$activeStormId")
    }

    $activeBasins = @(
        $activeStormIds |
            ForEach-Object { $_.Substring(0, 2) } |
            Sort-Object -Unique
    )
    foreach ($activeBasin in $activeBasins) {
        $graphicsScript = $basinScripts[$activeBasin].Graphics
        Write-Host "Note: $graphicsScript refreshes every active $activeBasin storm." -ForegroundColor DarkYellow
        Invoke-TropicalPhp `
            -Label "NHC graphics for $activeBasin" `
            -RelativeScript $graphicsScript
    }

    if (-not $SkipMtcswa) {
        Write-Host 'Note: mtcswa_fetcher.php refreshes supplemental imagery for every supported active storm.' -ForegroundColor DarkYellow
        Invoke-TropicalPhp `
            -Label 'MTCSWA supplemental imagery' `
            -RelativeScript 'active/api/mtcswa_fetcher.php'
    }

    $currentStormsOption = "--current-storms-file=$currentStormsPath"
    foreach ($activeStormId in $activeStormIds) {
        Invoke-TropicalPhp `
            -Label "Detailed storm map package for $activeStormId" `
            -RelativeScript 'active/api/tropical_map_builder.php' `
            -ScriptArguments @('storm', "--storm=$activeStormId", $currentStormsOption)
    }

    $jsonOutputs = @(
        'advisory.json',
        'storm.json',
        'text-products-manifest.json',
        'graphics-manifest.json',
        'tcv.json',
        'map/manifest.json'
    )
    $allParsedOutputs = @{}
    foreach ($activeStormId in $activeStormIds) {
        $stormRoot = Join-Path $repositoryRoot "active/storms/$activeStormId"
        $stormOutputs = @{}
        foreach ($relativeOutput in $jsonOutputs) {
            $outputPath = Join-Path $stormRoot $relativeOutput
            $stormOutputs[$relativeOutput] = Read-RequiredJson -Path $outputPath
            $identity = $stormOutputs[$relativeOutput].PSObject.Properties['stormId']
            if ($null -ne $identity -and ([string]$identity.Value).ToUpperInvariant() -ne $activeStormId) {
                throw "Identity mismatch in ${outputPath}: $($identity.Value)"
            }
        }
        $tcvOutput = $stormOutputs['tcv.json']
        if ([string]$tcvOutput.state -eq 'available') {
            $tcvEvents = @($tcvOutput.events)
            if ($tcvEvents.Count -eq 0) {
                throw "Available TCV package for $activeStormId contains no frontend alert events."
            }
            $invalidEvent = $tcvEvents | Where-Object {
                [string]$_.zoneId -notmatch '^[A-Z]{3}\d{3}$' -or
                [string]$_.phen -notin @('HU', 'TR', 'SS') -or
                [string]$_.sig -notin @('A', 'W') -or
                [string]$_.hazard -notin @('wind', 'surge')
            } | Select-Object -First 1
            if ($null -ne $invalidEvent) {
                throw "Available TCV package for $activeStormId contains an invalid frontend alert event."
            }
            $eventZones = @($tcvEvents | ForEach-Object { ([string]$_.zoneId).ToUpperInvariant() } | Sort-Object -Unique)
            $publishedZones = @($tcvOutput.zones | ForEach-Object { ([string]$_).ToUpperInvariant() } | Sort-Object -Unique)
            if (($eventZones -join ',') -ne ($publishedZones -join ',')) {
                throw "TCV zone/event mismatch for ${activeStormId}: zones=$($publishedZones -join ',') events=$($eventZones -join ',')"
            }
            $displayCount = @($tcvOutput.display.wind).Count + @($tcvOutput.display.surge).Count
            if ($displayCount -eq 0) {
                throw "Available TCV package for $activeStormId contains no frontend alert display groups."
            }
        }
        $allParsedOutputs[$activeStormId] = $stormOutputs
    }

    Invoke-TropicalPhp `
        -Label 'Tropical overview packages' `
        -RelativeScript 'active/api/tropical_map_builder.php' `
        -ScriptArguments @('overview', '--basin=all', $currentStormsOption) `
        -AllowedExitCodes @(0, 1)

    $overviewStates = @{}
    foreach ($overviewBasin in @('atl', 'epac', 'cpac')) {
        $overviewPath = Join-Path $repositoryRoot "active/cache/tropical-map/overview-$overviewBasin.json"
        $overview = Read-RequiredJson -Path $overviewPath
        if ([string]$overview.basin -ne $overviewBasin) {
            throw "Overview identity mismatch in ${overviewPath}: $($overview.basin)"
        }
        if ([string]$overview.state -notin @('fresh', 'stale')) {
            throw "Overview $overviewBasin has unusable state '$($overview.state)'"
        }
        $overviewStates[$overviewBasin] = [string]$overview.state
    }

    Invoke-TropicalPhp `
        -Label 'Tropical cache consistency guard' `
        -RelativeScript 'active/api/cache_tropical.php'

    if ($WarmHazardTiles) {
        Invoke-TropicalPhp `
            -Label 'Hazard basemap tile warmup' `
            -RelativeScript 'active/api/warm_tiles.php'
    }

    $parsedOutputs = $allParsedOutputs[$StormId]
    $tcv = $parsedOutputs['tcv.json']
    $mapManifest = $parsedOutputs['map/manifest.json']
    $summary = [pscustomobject]@{
        Storm = "$StormId $($storm.name)"
        Classification = $storm.classification
        IntensityKt = $storm.intensity
        Position = "$($storm.latitude), $($storm.longitude)"
        Advisory = $storm.publicAdvisory.advNum
        IssuedUtc = $storm.publicAdvisory.issuance
        CurrentStormsWatchWarningProduct = if ($null -eq $storm.windWatchesWarnings) { 'not issued' } else { 'advertised' }
        MapWatchWarningState = $mapManifest.products.watchesWarnings.state
        MapSurgeWarningState = $mapManifest.products.surgeWarnings.state
        TcvState = $tcv.state
        TcvZoneCount = @($tcv.zones).Count
        MapGeneratedAt = $mapManifest.generatedAt
        OverviewStates = "atl=$($overviewStates.atl), epac=$($overviewStates.epac), cpac=$($overviewStates.cpac)"
        ActiveStormPackages = $activeStormIds -join ', '
    }

    Write-Host "`nTropical refresh completed:" -ForegroundColor Green
    $summary | Format-List
    Write-Warning 'This refresh intentionally rewrote active/cache/nhc_current_storms.json and generated runtime files. Review git status and do not commit runtime artifacts unless that is separately intended.'
} finally {
    Pop-Location
}
