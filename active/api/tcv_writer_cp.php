#!/usr/bin/env php
<?php
/** Central Pacific entry point for the shared Pacific TCV writer. */
define('NCH_PACIFIC_BASIN', 'CP');
define('NCH_PACIFIC_LABEL', 'Central Pacific');
define('NCH_PACIFIC_REMOTE_STORMS_FIRST', true);

require __DIR__ . '/tcv_writer_ep.php';
