<?php

  $webProtocol = 'http';
  $wsProtocol = 'ws';
  $wsPort = 8888;
  $wsPage = 'wss-rg';

  if ((isset($_SERVER['HTTPS'])) && ($_SERVER['HTTPS'] == 'on')) {
    $webProtocol = 'https';
    $wsProtocol = 'wss';
  }
  $serverIP = $_SERVER['SERVER_ADDR'];
  $clientIP = $_SERVER['REMOTE_ADDR'];
  $srvName = $_SERVER['SERVER_NAME'];
  if (strlen($srvName) == 0) {
    $srvName = $serverIP;
  }
  $tmpURL = $webProtocol.'://'.$srvName.$_SERVER['PHP_SELF'];
  if ($tmpURL[strlen ($tmpURL)-1] == '/')
    $tmpURL = substr($tmpURL, 0, -1);
  $webURL = substr($tmpURL, 0, -strlen('index.php'));
  $wsURL = $wsProtocol.'://'.$srvName.':'.$wsPort.'/'.$wsPage;

  if (substr($_SERVER['QUERY_STRING'], -5) === '.data' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    require_once 'dataPage.php';
    $page = new DataPage();
  }
  elseif (substr($_SERVER['QUERY_STRING'], -3) === '.db' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    require_once 'dbPage.php';
    $page = new DbPage();
  }
  elseif (substr($_SERVER['QUERY_STRING'], -5) === '.post' && $_SERVER['REQUEST_METHOD'] == 'POST') {
    require_once 'postPage.php';
    $page = new PostPage();
  }
  elseif ($_SERVER['QUERY_STRING'] === 'config') {
    require_once 'configPage.php';
    $page = new ConfigPage();
  }
  elseif ($_SERVER['QUERY_STRING'] === 'manifest.webmanifest') {
    require_once 'manifestPage.php';
    $page = new ManifestPage();
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
