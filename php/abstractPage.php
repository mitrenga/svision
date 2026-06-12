<?php

/**
 * Base class for every server-rendered page. A page builds its output into the
 * $data buffer in createPage() and then writes it to the client in showPage().
 * Subclasses represent the different responses the front controller can serve
 * (the app shell, the manifest, the service worker, data/db endpoints, etc.).
 */
class AbstractPage {

  /** @var array Output buffer; each entry is one line (or chunk) of the response. */
  var $data = [];

  /**
   * Builds the page output into $data. Empty by default; subclasses override it.
   */
  public function createPage() {
  } // createPage

  /**
   * Writes the buffered output to the client, one entry per line.
   */
  public function showPage() {
    foreach ($this->data as $line) {
      echo $line."\n";
    }
  } // showPage

  /**
   * Reads the application version from app/version.js.
   *
   * @return string The version string, or 'unknown' if it cannot be parsed.
   */
  protected function readVersion() {
    $source = file_get_contents('app/version.js');
    if (preg_match("/Version\s*=\s*'([^']+)'/", $source, $m)) {
      return $m[1];
    }
    return 'unknown';
  } // readVersion

  /**
   * Returns the version used for cache-busting asset URLs. In development mode
   * it returns a fresh hash on every request (always bust the cache); otherwise
   * it returns the stable application version.
   *
   * @return string The cache-busting version token.
   */
  protected function srcVersion() {
    $version = $this->readVersion();
    return !empty($GLOBALS['devMode']) ? md5(time()) : $version;
  } // srcVersion

} // AbstractPage
