<?php

class AbstractPage {

  var $data = [];

  public function createPage() {
  } // createPage

  public function showPage() {
    foreach ($this->data as $line) {
      echo $line."\n";
    }
  } // showPage

  protected function readVersion() {
    $source = file_get_contents('app/version.js');
    if (preg_match("/Version\s*=\s*'([^']+)'/", $source, $m)) {
      return $m[1];
    }
    return 'unknown';
  } // readVersion

  protected function srcVersion() {
    $version = $this->readVersion();
    return !empty($GLOBALS['devMode']) ? md5(time()) : $version;
  } // srcVersion

} // AbstractPage
