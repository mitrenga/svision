<?php

/**
 * Front controller. Resolves request protocol/host into the web and websocket
 * URLs exposed to the client, then dispatches the request to the matching
 * AbstractPage subclass based on the query string, HTTP method and cookies.
 * The chosen page builds its output and writes it to the client.
 */

  $webProtocol = 'http';
  $wsProtocol = 'ws';
  $wsPort = 8888;
  $wsPage = 'wss-rg';

  if ((isset($_SERVER['HTTPS'])) && ($_SERVER['HTTPS'] == 'on')) {
    $webProtocol = 'https';
    $wsProtocol = 'wss';
  }
  $clientIP = $_SERVER['REMOTE_ADDR'];
  if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $clientIP = $_SERVER['HTTP_X_FORWARDED_FOR'];
  }
  $srvName = $_SERVER['SERVER_NAME'];
  if (strlen($srvName) == 0) {
    $srvName = $_SERVER['SERVER_ADDR'];
  }
  $tmpURL = $webProtocol.'://'.$srvName.$_SERVER['PHP_SELF'];
  if ($tmpURL[strlen ($tmpURL)-1] == '/')
    $tmpURL = substr($tmpURL, 0, -1);
  $webURL = substr($tmpURL, 0, -strlen('index.php'));
  $wsURL = $wsProtocol.'://'.$srvName.':'.$wsPort.'/'.$wsPage;
  $query = $_SERVER['QUERY_STRING'];

  // Routing: pick the page that handles this request. Order matters — the more
  // specific endpoint suffixes are matched before the generic fallbacks.
  if (substr($query, -5) === '.data' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    // "<name>.data" POST -> serve a JSON file from data/.
    require_once 'dataPage.php';
    $page = new DataPage();
  }
  elseif (substr($query, -3) === '.db' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    // "<name>.db" POST -> run the matching db/ command and return its result.
    require_once 'dbPage.php';
    $page = new DbPage();
  }
  elseif (substr($query, -5) === '.post' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    // "<name>.post" POST -> custom POST handler (provided by the application).
    require_once 'postPage.php';
    $page = new PostPage();
  }
  elseif ($query === 'manifest.webmanifest') {
    // PWA manifest request.
    require_once 'manifestPage.php';
    $page = new ManifestPage();
  }
  elseif (file_exists('./app/svision/php/'.$query.'Page.php')) {
    // A built-in svision page named "<query>Page.php" (e.g. config, serviceWorker).
    require_once $query.'Page.php';
    $className = ucfirst($query).'Page';
    $page = new $className();
  }
  elseif (file_exists('./'.$query.'Page.php')) {
    // An application-provided page named "<query>Page.php" in the project root.
    require_once './'.$query.'Page.php';
    $className = ucfirst($query).'Page';
    $page = new $className();
  }
  elseif (!isset ($_COOKIE['libImportMethod']) || substr($_COOKIE['libImportMethod'], 0, 5) === 'false') {
    // Import method not yet decided (no cookie, or still auto-detecting) ->
    // run the automatic capability probe.
    require_once 'autoConfigPage.php';
    $page = new autoConfigPage();
  }
  elseif ($_COOKIE['libImportMethod'] !== 'await-import' && $_COOKIE['libImportMethod'] !== 'import-from') {
    // Cookie holds an unusable value -> send the user to the config page.
    require_once 'forwardToConfigPage.php';
    $page = new ForwardToConfigPage();
  } else {
    // A valid import method is set -> serve the actual application shell.
    require_once 'appPage.php';
    $page = new AppPage();
  }
  $page->createPage();
  $page->showPage();
