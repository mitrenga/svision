<?php

require_once 'abstractPage.php';

/**
 * Serves the application shell: the HTML document that loads the app's CSS and
 * bootstraps the JavaScript entry point. It picks the script to load based on
 * what is available — a built production bundle, the dev entry point for the
 * active import method, or a maintenance page as the fallback.
 */
class AppPage extends AbstractPage {

  /**
   * Builds the application shell HTML, injecting runtime globals (app name,
   * client IP, websocket URL, version, dev flags) and the appropriate module
   * script tag.
   */
  public function createPage() {
    $srcVersion = $this->srcVersion();

    $this->data[] = '<!-- free source code on https://github.com/mitrenga -->';
    $this->data[] = '<!DOCTYPE html>';
    $this->data[] = '<html lang="en">';
    $this->data[] = '  <head>';
    $this->data[] = '    <title>'.$GLOBALS['appName'].'</title>';
    $this->data[] = '    <meta name="description" lang="cs" content="'.$GLOBALS['appName'].'">';
    $this->data[] = '    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover">';
    $this->data[] = '    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
    $this->data[] = '    <meta name="robots" content="noindex, nofollow">';
    $this->data[] = '    <meta name="mobile-web-app-capable" content="yes">';
    $this->data[] = '    <link rel="shortcut icon" sizes="256x256" href="images/app-icon-256x256.png" id="app-icon">';
    $this->data[] = '    <link rel="apple-touch-icon" sizes="192x192" href="images/app-icon-192x192.png">';
    $this->data[] = '    <meta name="theme-color" content="#000000">';
    $this->data[] = '    <link rel="manifest" href="'.$GLOBALS['webURL'].'manifest.webmanifest">';
    $this->data[] = '    <meta http-equiv="X-UA-Compatible" content="IE=Edge; IE=11;" />';
    $this->data[] = '    <link rel="stylesheet" type="text/css" href="app/svision/css/main.css?ver='.$srcVersion.'">';
    $this->data[] = '  </head>';
    $this->data[] = '  <body id="bodyApp">';
    $this->data[] = '    <script>window.appName = "'.$GLOBALS['appName'].'";</script>';
    $this->data[] = '    <script>window.clientIP = "'.$GLOBALS['clientIP'].'";</script>';
    $this->data[] = '    <script>window.appPrefix = "'.$GLOBALS['appPrefix'].'";</script>';
    $this->data[] = '    <script>window.wsURL = "'.$GLOBALS['wsURL'].'";</script>';     
    $this->data[] = '    <script>window.srcVersion = "'.$srcVersion.'";</script>';
    $this->data[] = '    <script>window.devMode = '.(empty($GLOBALS['devMode']) ? 'false' : 'true').';</script>';
    $this->data[] = '    <script>window.devModeName = '.((empty($GLOBALS['devModeName'])) ? 'false' : '"'.$GLOBALS['devModeName'].'"').';</script>';
    $this->data[] = '    <script>window.appIconSprite = false;</script>';

    $bundle = 'js/bundle.'.$this->readVersion().'.min.js';

    if (file_exists($bundle)) {
      $this->data[] = '    <script>window.importPath = "js";</script>';
      $this->data[] = '    <script type="module" src="'.$bundle.'?ver='.$srcVersion.'"></script>';
    } elseif (!empty($GLOBALS['devMode'])) {
      if ($_COOKIE['libImportMethod'] == 'await-import') {
        $this->data[] = '    <script>window.importPath = "app";</script>';
        $this->data[] = '    <script type="module" src="app/main.js?ver='.$srcVersion.'"></script>';
      }
      if ($_COOKIE['libImportMethod'] == 'import-from') {
        $this->data[] = '    <script>window.importPath = "js";</script>';
        $this->data[] = '    <script type="module" src="js/main.js?ver='.$srcVersion.'"></script>';
      }
    } else {
      $this->data[] = '    <script>window.importPath = "app";</script>';
      $this->data[] = '    <script type="module" src="app/maintenance.js?ver='.$srcVersion.'"></script>';
    }
    $this->data[] = '  </body>';
    $this->data[] = '</html>';
  } // createPage

} // AppPage
