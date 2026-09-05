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
   * Returns the built bundle this request should serve, or false when none is
   * available and the application has to run from its sources. The debug bundle
   * (the same concatenation left unminified, built with `svtool build
   * debug-bundle`) wins when present: it is only ever built deliberately, so a
   * stale minified bundle must not silently take its place.
   *
   * This is the single place that decides bundle versus sources; the app shell,
   * the import path and the config page all ask it rather than working it out
   * for themselves. Nothing else may reconstruct the bundle path by hand.
   *
   * @return string|false Path to the bundle to load, or false for source mode.
   */
  protected function bundleFile() {
    $version = $this->readVersion();
    foreach (['js/bundle.'.$version.'.js', 'js/bundle.'.$version.'.min.js'] as $bundle) {
      if (file_exists($bundle)) {
        return $bundle;
      }
    }
    return false;
  } // bundleFile

  /**
   * Returns the base directory the application loads its JavaScript modules from
   * for this request: 'js' when a built bundle is served, otherwise 'app' (the
   * source mode or the maintenance fallback). Both the app shell and the service
   * worker rely on this so the pre-cached assets always match what the app
   * actually loads.
   *
   * @return string Either 'js' or 'app'.
   */
  protected function importPath() {
    return ($this->bundleFile() === false) ? 'app' : 'js';
  } // importPath

  /**
   * Decides whether the service worker should be active for this request. It is
   * enabled in production (devMode empty) and, for development, only when the
   * devMode flag is an array carrying a truthy 'serviceWorker' entry (e.g.
   * $devMode = ['serviceWorker' => true]). Plain dev mode ($devMode = true)
   * keeps the service worker disabled.
   *
   * @return bool True when the service worker should be registered/cached.
   */
  protected function isServiceWorkerEnabled() {
    $devMode = $GLOBALS['devMode'] ?? false;
    return empty($devMode) || (is_array($devMode) && !empty($devMode['serviceWorker']));
  } // isServiceWorkerEnabled

  /**
   * Returns the version used for cache-busting asset URLs. In plain development
   * mode it returns a fresh hash on every request (always bust the cache);
   * otherwise (production, or dev mode with the service worker enabled) it
   * returns the stable application version so the service worker cache holds
   * until the next version change.
   *
   * @return string The cache-busting version token.
   */
  protected function srcVersion() {
    $version = $this->readVersion();
    return $this->isServiceWorkerEnabled() ? $version : md5(time());
  } // srcVersion

} // AbstractPage
