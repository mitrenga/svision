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

} // AbstractPage
