Post-Move Testing Checklist
Check all main site pages for 404s
Visit index.html, tropical.html, and all county pages to ensure they load without missing assets or scripts.

Test all data/API endpoints
Verify PHP API endpoints (e.g., counties/_/api/cache\__.php, active/api/\*.php) return valid JSON and update as expected.

Check JS/CSS asset loading
Open browser devtools and confirm all JS and CSS files load without 404 errors on every page.

Validate dynamic data updates
Ensure weather data, alerts, and storm graphics update correctly after the move (check timestamps and data freshness).

Review log and data file permissions
Confirm that logs/ and data/ directories are writable by PHP scripts in the new location.

Test cron job execution
After updating cron jobs, verify that scheduled scripts run and update cache/data files as expected.

Check for absolute path references
Search for any remaining absolute or hardcoded paths (e.g., /2025_weather/) in code, configs, and .htaccess.

Test multi-zone county pages
Visit Dare and Hyde county pages with all zone parameters to ensure aggregation and fallback logic works.

Validate error handling and fallback
Simulate missing or stale data to confirm the frontend gracefully degrades and shows age indicators.

Review external links and embeds
Check for any external links, bookmarks, or embeds that reference the old /2025_weather/ path and update or redirect as needed.
