@echo off
:: weather_cache_scheduler.bat - A batch file to schedule and run cache scripts
:: Place this in the same directory as your PHP cache scripts

echo Weather Cache Scheduler Started
echo Current time: %TIME%
echo Current date: %DATE%
echo ========================================

:: Set the path to PHP executable (adjust if your XAMPP installation is different)
set PHP_EXE=F:\xampp\php\php.exe

:: Set the path to the scripts directory (adjust as needed)
set SCRIPTS_DIR=%~dp0

:: Set the path to the logs directory
set LOGS_DIR=%SCRIPTS_DIR%logs
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"

:: Check if PHP executable exists
if not exist "%PHP_EXE%" (
    echo ERROR: PHP executable not found at %PHP_EXE%
    echo Please adjust the PHP_EXE path in this batch file.
    pause
    exit /b 1
)

echo PHP executable: %PHP_EXE%
echo Scripts directory: %SCRIPTS_DIR%
echo Logs directory: %LOGS_DIR%
echo.

:loop
    :: Get current time
    for /f "tokens=1-3 delims=:." %%a in ("%TIME%") do (
        set HOUR=%%a
        set MINUTE=%%b
    )
    
    :: Remove leading space from hour if present
    set HOUR=%HOUR: =%
    
    :: Display current hour and minute
    echo Current time: %HOUR%:%MINUTE%
    
    :: Every 15 minutes run weather cache
    if %MINUTE% EQU 00 (
        echo Running weather cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_weather.php" > "%LOGS_DIR%\weather_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 15 (
        echo Running weather cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_weather.php" > "%LOGS_DIR%\weather_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 30 (
        echo Running weather cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_weather.php" > "%LOGS_DIR%\weather_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 45 (
        echo Running weather cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_weather.php" > "%LOGS_DIR%\weather_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    )
    
    :: Every 5 minutes run alerts cache
    if %MINUTE% EQU 00 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 05 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 10 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 15 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 20 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 25 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 30 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 35 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 40 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 45 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 50 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %MINUTE% EQU 55 (
        echo Running alerts cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_alerts.php" > "%LOGS_DIR%\alerts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    )
    
    :: Every hour run forecast cache
    if %MINUTE% EQU 05 (
        echo Running forecast cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_forecasts.php" > "%LOGS_DIR%\forecasts_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    )
    
    :: Every 6 hours run AFD cache
    if %HOUR% EQU 0 if %MINUTE% EQU 00 (
        echo Running AFD cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_afd.php" > "%LOGS_DIR%\afd_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %HOUR% EQU 6 if %MINUTE% EQU 00 (
        echo Running AFD cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_afd.php" > "%LOGS_DIR%\afd_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %HOUR% EQU 12 if %MINUTE% EQU 00 (
        echo Running AFD cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_afd.php" > "%LOGS_DIR%\afd_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    ) else if %HOUR% EQU 18 if %MINUTE% EQU 00 (
        echo Running AFD cache...
        %PHP_EXE% "%SCRIPTS_DIR%cache_afd.php" > "%LOGS_DIR%\afd_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    )
    
    :: Once per day (at 3:30 AM) run full refresh and backup
    if %HOUR% EQU 3 if %MINUTE% EQU 30 (
        echo Running full refresh...
        %PHP_EXE% "%SCRIPTS_DIR%refresh_all.php" > "%LOGS_DIR%\full_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
        
        echo Running backup...
        %PHP_EXE% "%SCRIPTS_DIR%backup_cache.php" > "%LOGS_DIR%\backup_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
        
        echo Running maintenance...
        %PHP_EXE% "%SCRIPTS_DIR%maintain_cache.php" > "%LOGS_DIR%\maintain_%DATE:~-4,4%%DATE:~-10,2%%DATE:~-7,2%_%HOUR%%MINUTE%.log" 2>&1
    )
    
    echo Sleeping for 1 minute...
    timeout /t 60 /nobreak > nul
    echo.
goto loop