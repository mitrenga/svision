<?php

/**
 * Standalone fragment endpoint: echoes the current server date, time and time
 * zone as <li> list items. Fetched by the config page to display server time.
 */

echo '          <li>date: '.date("l, M d, Y").'</li>'."\n";
echo '          <li>time: '.date("H:i:s").'</li>'."\n";
echo '          <li>time zone: '.date_default_timezone_get().'</li>'."\n";
