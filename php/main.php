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
  // A non-default port is part of the origin: the manifest's start_url and
  // scope, the canonical and Open Graph URLs must carry it, or a browser sees
  // them as another site and refuses to install the app (e.g. a dev vhost on
  // https://host:34444/). The WebSocket URL keeps its own port ($wsPort).
  $srvHost = $srvName;
  $srvPort = (int)($_SERVER['SERVER_PORT'] ?? 0);
  if ($srvPort > 0 && $srvPort !== ($webProtocol === 'https' ? 443 : 80)) {
    $srvHost .= ':'.$srvPort;
  }
  $tmpURL = $webProtocol.'://'.$srvHost.$_SERVER['PHP_SELF'];
  if ($tmpURL[strlen ($tmpURL)-1] == '/')
    $tmpURL = substr($tmpURL, 0, -1);
  $webURL = substr($tmpURL, 0, -strlen('index.php'));
  $wsURL = $wsProtocol.'://'.$srvName.':'.$wsPort.'/'.$wsPage;
  // The route is the query string up to the first '&': the manifest's link
  // carries ?ver= for cache-busting, which nginx appends to the rewritten
  // query as "manifest.webmanifest&ver=...".
  $query = strtok($_SERVER['QUERY_STRING'], '&');
  if ($query === false) {
    $query = '';
  }

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
  elseif ($query === 'sitemap.xml') {
    // Search engine sitemap request.
    require_once 'sitemapPage.php';
    $page = new SitemapPage();
  }
  elseif ($query === 'robots.txt') {
    // Crawler rules request (also advertises the sitemap).
    require_once 'robotsPage.php';
    $page = new RobotsPage();
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
  else {
    // Anything else -> the application shell. It decides for itself whether to
    // serve the built bundle or the sources (AbstractPage::bundleFile()).
    require_once 'appPage.php';
    $page = new AppPage();
  }
  $page->createPage();
  $page->showPage();
