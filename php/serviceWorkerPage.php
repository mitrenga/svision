<?php

require_once 'abstractPage.php';

class ServiceWorkerPage extends AbstractPage {

  public function createPage() {
    $assets = $this->collectAssets();
    sort($assets);
    $template = file_get_contents('app/svision/js/serviceWorker.js');
    $assetsJson = json_encode($assets, JSON_UNESCAPED_SLASHES);
    $assetsContent = substr($assetsJson, 1, -1);
    $version = $this->readVersion();
    $output = str_replace('/* PHP_ASSETS_PLACEHOLDER */', $assetsContent, $template);
    $output = str_replace("'PHP_VERSION_PLACEHOLDER'", "'".$version."'", $output);
    $this->data[] = $output;
  } // createPage

  public function showPage() {
    header('Content-Type: application/javascript');
    header('Cache-Control: no-cache');
    foreach ($this->data as $line) {
      echo $line;
    }
  } // showPage

  private function collectAssets() {
    $assets = [
      './',
      './manifest.webmanifest',
      './favicon.ico',
    ];
    $this->scanDir('app', $assets, ['js']);
    $this->scanDir('app/svision/css', $assets, ['css']);
    $this->scanDir('images', $assets, ['png', 'svg', 'jpg', 'gif', 'ico']);
    return $assets;
  } // collectAssets

  private function scanDir($dir, &$assets, $extensions) {
    if (!is_dir($dir)) return;
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
      if (!$file->isFile()) continue;
      $path = str_replace('\\', '/', $file->getPathname());
      if (strpos($path, '/.') !== false) continue;
      if ($path === 'app/svision/js/serviceWorker.js') continue;
      $ext = strtolower($file->getExtension());
      if (!in_array($ext, $extensions)) continue;
      $assets[] = './'.$path;
    }
  } // scanDir

} // ServiceWorkerPage
