#requires -Version 5.1
<#
.SYNOPSIS
Refresh the local website's weather caches once, using its existing PHP jobs.
.DESCRIPTION
Includes all nine counties (alerts/HWO, observations, forecast/hourly, AFD),
NC/FL/CA statewide conditions, and Atlantic/Eastern/Central Pacific products.
Uses existing station catalogs; radar/satellite browser feeds remain on demand.
Runs sequentially, logs output, and continues independent jobs after failures.
Exit 1 means a job failed, reported an error, or was skipped after a dependency
failure. Exit 0 means the commands completed; inspect publisher logs for partial
provider failures, missing products, and observation freshness.

Running this intentionally replaces local weather data, including tracked Bertie
examples and active/cache/nhc_current_storms.json. It does not install a schedule.
.EXAMPLE
.\scripts\update-local-data.ps1 -Preview
.EXAMPLE
.\scripts\update-local-data.ps1
.EXAMPLE
.\scripts\update-local-data.ps1 -Scope Counties
.EXAMPLE
.\scripts\update-local-data.ps1 -Scope Tropical -WarmHazardTiles
#>
[CmdletBinding()]
param(
    [string]$PhpPath = 'C:\php\php.exe',
    [string]$CaBundlePath = 'C:\Program Files\Git\mingw64\etc\ssl\certs\ca-bundle.crt',
    [ValidateSet('All', 'Counties', 'Statewide', 'Tropical')]
    [string]$Scope = 'All',
    [ValidateRange(0, 60)]
    [int]$JobDelaySeconds = 1,
    [switch]$WarmHazardTiles,
    [switch]$Preview
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# Handle native exit codes ourselves, including when the caller enables this.
$PSNativeCommandUseErrorActionPreference = $false
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$jobs = [System.Collections.Generic.List[object]]::new()

function Add-RefreshJob {
    param([string]$Group, [string]$Path, [string[]]$Arguments = @())
    $jobs.Add([pscustomobject]@{ Group = $Group; Path = $Path; Arguments = $Arguments })
}

if ($Scope -in @('All', 'Counties')) {
    # Explicit V1 county list; do not discover ignored prototypes or V2 jobs.
    $counties = @('bertie', 'pitt', 'beaufort', 'martin', 'dare', 'hyde', 'washington', 'tyrrell', 'san-diego')
    foreach ($product in @('alerts', 'current', 'forecast', 'afd')) {
        foreach ($county in $counties) {
            Add-RefreshJob 'Counties' "counties/$county/api/cache_$product.php"
        }
    }
}

if ($Scope -in @('All', 'Tropical')) {
    Add-RefreshJob 'Tropical' 'active/api/tropical_data.php' @('--cron')
    Add-RefreshJob 'Tropical' 'active/api/text_products_cache.php'
    foreach ($writer in @('advisory_writer', 'tcv_writer', 'cxml_writer')) {
        foreach ($suffix in @('', '_ep', '_cp')) {
            $arguments = @('--storm=ALL')
            if ($writer -eq 'tcv_writer') { $arguments += @('--force', '--log') }
            Add-RefreshJob 'Tropical' "active/api/$writer$suffix.php" $arguments
        }
    }
    foreach ($suffix in @('', '_ep', '_cp')) {
        Add-RefreshJob 'Tropical' "active/api/nhc_graphics_cache$suffix.php"
    }
    $currentStormsPath = Join-Path $repositoryRoot 'active/cache/nhc_current_storms.json'
    # The builder validates Active packages before publishing basin overviews.
    Add-RefreshJob 'Tropical' 'active/api/tropical_map_builder.php' @(
        'all', '--basin=all', "--current-storms-file=$currentStormsPath"
    )
    Add-RefreshJob 'Tropical' 'active/api/mtcswa_fetcher.php'
    if ($WarmHazardTiles) { Add-RefreshJob 'Tropical' 'active/api/warm_tiles.php' }
    # No cache_tropical.php: --cron above already forces and verifies both caches.
    # Its subprocess could otherwise refresh the storm list mid-run.
}

if ($Scope -in @('All', 'Statewide')) {
    # These can take several minutes; each publisher bounds its NWS concurrency.
    foreach ($state in @('nc', 'fl', 'ca')) {
        Add-RefreshJob 'Statewide' "counties/api/cache_${state}_conditions.php"
    }
}

foreach ($job in $jobs) {
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot $job.Path) -PathType Leaf)) {
        throw "Refresh script not found: $($job.Path)"
    }
}
if ($Preview) {
    Write-Host "Preview: $($jobs.Count) jobs in $repositoryRoot. No PHP jobs, downloads, or writes."
    $jobs | Select-Object Group, Path, @{Name = 'Arguments'; Expression = { $_.Arguments -join ' ' }}
    return
}

$phpCommand = Get-Command $PhpPath -CommandType Application -ErrorAction Stop
$phpExecutable = $phpCommand.Source
if (-not (Test-Path -LiteralPath $CaBundlePath -PathType Leaf)) {
    throw "Trusted CA bundle not found: $CaBundlePath. Supply -CaBundlePath with your local PEM/CRT bundle."
}
$CaBundlePath = (Resolve-Path -LiteralPath $CaBundlePath).Path
$phpOptions = @('-d', "curl.cainfo=$CaBundlePath", '-d', "openssl.cafile=$CaBundlePath", '-d', 'memory_limit=512M')
$versionText = (& $phpExecutable -v | Out-String)
if ($LASTEXITCODE -ne 0 -or $versionText -notmatch 'PHP (\d+\.\d+\.\d+)' -or [version]$Matches[1] -lt [version]'8.4.0') {
    throw "PHP 8.4 or newer is required. Found: $versionText"
}
$extensions = @(& $phpExecutable -m)
if ($LASTEXITCODE -ne 0) { throw 'Unable to list PHP extensions.' }
$missing = @('curl', 'json', 'SimpleXML', 'dom', 'libxml', 'Phar', 'zlib') | Where-Object { $_ -notin $extensions }
if ($missing) { throw "Enable required PHP extensions: $($missing -join ', ')" }

function Assert-RefreshedStormList {
    param([datetime]$StartedUtc)
    # tropical_data.php may return zero after falling back to old data.
    foreach ($name in @('nhc_current_storms.json', 'tropical_summary_at.json')) {
        $path = Join-Path $repositoryRoot "active/cache/$name"
        $file = Get-Item -LiteralPath $path
        $payload = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
        $minimumTime = [DateTimeOffset]::new($StartedUtc).ToUnixTimeSeconds()
        if ($file.LastWriteTimeUtc -lt $StartedUtc -or [long]$payload.metadata.cached_at -lt $minimumTime) {
            throw "$name was not refreshed; refusing to process an older storm list."
        }
        if ($payload.data.activeStorms -isnot [array]) {
            throw "$name has no valid activeStorms array."
        }
        foreach ($storm in $payload.data.activeStorms) {
            if ([string]$storm.id -notmatch '^(AL|EP|CP)\d{6}$') {
                throw "Unsupported storm identity in ${name}: $($storm.id)"
            }
        }
    }
}

function Invoke-RefreshPhp {
    param($Job)
    # Windows PowerShell 5.1 wraps native stderr as ErrorRecord objects. PHP
    # publishers also use stderr for normal progress, so do not terminate on it.
    $ErrorActionPreference = 'Continue'
    $scriptPath = Join-Path $repositoryRoot $Job.Path
    $scriptArguments = $Job.Arguments
    $reportedError = $false
    & $phpExecutable @phpOptions $scriptPath @scriptArguments 2>&1 | ForEach-Object {
        $line = $_.ToString()
        Write-Host $line
        Add-Content -LiteralPath $runLog -Value $line -Encoding UTF8 -ErrorAction Stop
        if ($line -match '(?i)(\[ERROR\]|^\s*(ERROR[: ]|FATAL[: ]|PHP Fatal error)|"ok"\s*:\s*false)') {
            $reportedError = $true
        }
    }
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "PHP exited with code $code." }
    if ($reportedError) { throw 'Publisher reported an error despite exit code zero; see the run log.' }
}

# Prevent two copies of this updater from writing the same checkout concurrently.
$hasher = [System.Security.Cryptography.SHA256]::Create()
try {
    $rootHash = [BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($repositoryRoot.ToLowerInvariant()))).Replace('-', '')
} finally { $hasher.Dispose() }
$lockPath = Join-Path ([IO.Path]::GetTempPath()) "nchurricane-local-refresh-$rootHash.tmp"
try {
    $runLock = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
} catch { throw "Cannot acquire updater lock; another refresh may be running. $($_.Exception.Message)" }

$results = [System.Collections.Generic.List[object]]::new()
$stormListReady = $false
$tropicalProductsReady = $true
$runTimer = [Diagnostics.Stopwatch]::StartNew()
Push-Location $repositoryRoot
try {
    $logDirectory = Join-Path $repositoryRoot 'active/logs'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $runLog = Join-Path $logDirectory ("local-data-refresh-{0}-{1}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'), $PID)
    $intro = "Refreshing $($jobs.Count) local jobs. Log: $runLog"
    Write-Host $intro -ForegroundColor Cyan
    Add-Content -LiteralPath $runLog -Value $intro -Encoding UTF8
    Write-Host 'This updates local weather caches, including tracked weather examples. Statewide jobs can take several minutes.'
    $index = 0
    foreach ($job in $jobs) {
        $index++
        $label = "[$index/$($jobs.Count)] $($job.Path) $($job.Arguments -join ' ')"
        Write-Host "`n$label" -ForegroundColor Cyan
        Add-Content -LiteralPath $runLog -Value $label -Encoding UTF8
        $isStormList = $job.Path -eq 'active/api/tropical_data.php'
        $isMapBuilder = $job.Path -eq 'active/api/tropical_map_builder.php'
        $reason = ''
        if ($job.Group -eq 'Tropical' -and -not $isStormList -and -not $stormListReady) {
            $reason = 'Current storm list did not refresh.'
        } elseif ($isMapBuilder -and -not $tropicalProductsReady) {
            $reason = 'A required Tropical product job failed; keeping existing map packages.'
        }
        if ($reason) {
            Write-Warning "Skipped: $reason"
            Add-Content -LiteralPath $runLog -Value "SKIPPED: $reason" -Encoding UTF8
            $results.Add([pscustomobject]@{ Job = $job.Path; Status = 'Skipped'; Seconds = 0 })
            continue
        }
        $startedUtc = [datetime]::UtcNow
        $timer = [Diagnostics.Stopwatch]::StartNew()
        $status = 'Completed'
        try {
            Invoke-RefreshPhp $job
            if ($isStormList) {
                Assert-RefreshedStormList $startedUtc
                $stormListReady = $true
            }
        } catch {
            $status = 'Failed'
            if ($job.Group -eq 'Tropical') { $tropicalProductsReady = $false }
            $message = "FAILED $($job.Path): $($_.Exception.Message)"
            Write-Warning $message
            Add-Content -LiteralPath $runLog -Value $message -Encoding UTF8
        }
        $results.Add([pscustomobject]@{ Job = $job.Path; Status = $status; Seconds = [math]::Round($timer.Elapsed.TotalSeconds, 1) })
        if ($JobDelaySeconds -gt 0 -and $index -lt $jobs.Count) { Start-Sleep -Seconds $JobDelaySeconds }
    }
    $summary = $results | Format-Table -AutoSize | Out-String -Width 160
    Write-Host $summary
    Add-Content -LiteralPath $runLog -Value $summary -Encoding UTF8
    Write-Host ("Finished in {0:N1} minutes. Log: {1}" -f $runTimer.Elapsed.TotalMinutes, $runLog)
    Write-Host 'Completed means the command finished. Check publisher logs and page timestamps for partial failures or stale observations.'
} finally {
    Pop-Location
    $runLock.Dispose()
}

if (@($results | Where-Object Status -ne 'Completed').Count -gt 0) { exit 1 }
exit 0
