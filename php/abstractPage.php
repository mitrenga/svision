<?php

class AbstractPage {

  var $webURL;
  var $wsURL;
  var $data = [];

  public function init($webURL, $wsURL) {
    $this->webURL = $webURL;
    $this->wsURL = $wsURL;
  } // init

  public function createPage() {
  } // createPage

  public function showPage() {
    foreach ($this->data as $line) {
      echo $line."\n";
    }
  } // showPage

} // AbstractPage
