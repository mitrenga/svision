<?php

require_once 'abstractPage.php';

/**
 * Generates the service worker script. It takes the serviceWorker.js template
 * and substitutes the runtime placeholders: the list of assets to pre-cache
 * (collected from the project) and the application version used as the cache
 * name.
 */
class ServiceWorkerPage extends AbstractPage {

  /**
   * Builds the service worker source by injecting the collected asset list and
   * the version into the serviceWorker.js template.
   */
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

  /**
   * Sends the generated service worker as a non-cached JavaScript response.
   */
  public function showPage() {
    header('Content-Type: application/javascript');
    header('Cache-Control: no-cache');
    foreach ($this->data as $line) {
      echo $line;
    }
  } // showPage

  /**
   * Collects the list of asset URLs the service worker should pre-cache: the
   * app root, manifest and favicon, plus every js/, css/ and image file found
   * by scanning the relevant directories.
   *
   * @return array The list of asset paths (relative, prefixed with './').
   */
  private function collectAssets() {
    $assets = [
      './',
      './manifest.webmanifest',
      './favicon.ico',
    ];
    $this->scanDir('js', $assets, ['js']);
    $this->scanDir('app/svision/css', $assets, ['css']);
    $this->scanDir('images', $assets, ['png', 'svg', 'jpg', 'gif', 'ico']);
    return $assets;
  } // collectAssets

  /**
   * Recursively scans a directory and appends every file with a matching
   * extension to the asset list, skipping dot files/dirs and the service
   * worker script itself.
   *
   * @param string $dir The directory to scan.
   * @param array $assets Asset list to append to (passed by reference).
   * @param array $extensions Lower-case file extensions to include.
   */
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
