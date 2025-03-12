<?php

require_once 'abstractPage.php';

class AppPage extends AbstractPage {

  public function init($webURL, $wsURL) {
    parent::init($webURL, $wsURL);
  } // init

  
  public function createPage() {
    $srcVersion = md5(time());

    $this->data[] = '<!DOCTYPE html>';
    $this->data[] = '<html lang="cs">';
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
    $this->data[] = '    <link rel="manifest" href="'.$this->webURL.'manifest.webmanifest">';
    $this->data[] = '    <meta http-equiv="X-UA-Compatible" content="IE=Edge; IE=11;" />';
    $this->data[] = '    <link rel="stylesheet" type="text/css" href="app/svision/css/main.css?ver='.$srcVersion.'">';
    $this->data[] = '  </head>';
    $this->data[] = '  <body id="bodyApp">';
    $this->data[] = '    <script>var wsURL = "'.$this->wsURL.'";</script>';
    $this->data[] = '    <script>var srcVersion = "'.$srcVersion.'";</script>';
    
    if ($_COOKIE['libImportMethod'] == 'await-import') {
      $this->data[] = '    <script type="module" src="app/main.js?ver='.$srcVersion.'"></script>';
    }

    if ($_COOKIE['libImportMethod'] == 'import-from') {
      $this->makeJSFiles4ImportFrom('app', 'js', '/');
      $this->makeJSFiles4ImportFrom('app', 'js', '/svision/js/');
      $this->makeJSFiles4ImportFrom('app', 'js', '/svision/js/platform/html/');
      $this->makeJSFiles4ImportFrom('app', 'js', '/svision/js/platform/canvas2D/');
      $this->makeJSFiles4ImportFrom('app', 'js', '/svision/js/platform/canvas2D/zxSpectrum/');
      $this->makeJSFiles4ImportFrom('app', 'js', '/svision/js/platform/webGL/');

      $this->data[] = '    <script type="module" src="js/main.js?ver='.$srcVersion.'"></script>';
    }
    
    $this->data[] = '  </body>';
    $this->data[] = '</html>';
  } // createPage

  function makeJSFiles4ImportFrom($source, $target, $subdir) {
    $oldmask = umask(0);
    if (is_dir($source.$subdir)) {
      if ($dh = opendir($source.$subdir)) {
        while (($file = readdir($dh)) !== false) {
          if (filetype($source.$subdir.$file) == 'file' && substr($file, -3) == '.js') {
            $data = file_get_contents($source.$subdir.$file, true);
            $data2 = "/*/\n".substr($data, strpos($data, "\n")+1);
            if (!is_dir(substr($target.$subdir, 0, -1))) {
              mkdir(substr($target.$subdir, 0, -1), 0777, true);
            }
            if (is_file($target.$subdir.$file)) {
              if (filemtime($target.$subdir.$file) < filemtime($source.$subdir.$file)) {
                unlink($target.$subdir.$file);
                file_put_contents($target.$subdir.$file, $data2);
              }
            } else {
              file_put_contents($target.$subdir.$file, $data2);
            }
          }
        }
      closedir($dh);
      }
    }
    umask($oldmask);
  } // makeJSFiles4ImportFrom

} // AppPage
