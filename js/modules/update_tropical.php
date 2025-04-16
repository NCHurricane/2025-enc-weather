<?php
// update_tropical.php - Script to execute tropical data caching via cron job

// Set execution time limit to 5 minutes
set_time_limit(300);

// Change to the directory of this script
chdir(dirname(__FILE__));

// Execute the cache script
require_once('cache_tropical.php');

// Log completion
writeLog("Tropical data update completed via cron job", 'info');
