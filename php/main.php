<?php

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

  if (substr($query, -5) === '.data' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    require_once 'dataPage.php';
    $page = new DataPage();
  }
  elseif (substr($query, -3) === '.db' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    require_once 'dbPage.php';
    $page = new DbPage();
  }
  elseif (substr($query, -5) === '.post' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    require_once 'postPage.php';
    $page = new PostPage();
  }
  elseif ($query === 'manifest.webmanifest') {
    require_once 'manifestPage.php';
    $page = new ManifestPage();
  }
  elseif (file_exists('./app/svision/php/'.$query.'Page.php')) {
    require_once $query.'Page.php';
    $className = ucfirst($query).'Page';
    $page = new $className();
  }
  elseif (file_exists('./'.$query.'Page.php')) {
    require_once './'.$query.'Page.php';
    $className = ucfirst($query).'Page';
    $page = new $className();
  }
  elseif (!isset ($_COOKIE['libImportMethod']) || substr($_COOKIE['libImportMethod'], 0, 5) === 'false') {
    require_once 'autoConfigPage.php';
    $page = new autoConfigPage();
  }
  elseif ($_COOKIE['libImportMethod'] !== 'await-import' && $_COOKIE['libImportMethod'] !== 'import-from') {
    require_once 'forwardToConfigPage.php';
    $page = new ForwardToConfigPage();
  } else {
    require_once 'appPage.php';
    $page = new AppPage();
  }
  $page->createPage();
  $page->showPage();
