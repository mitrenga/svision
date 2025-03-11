<?php

require_once 'abstractPage.php';

class DataPage extends AbstractPage {

  public function init($webURL, $wsURL) {
    parent::init($webURL, $wsURL);
  } // init


  public function createPage() {
    if(file_exists('data/'.substr($_SERVER['QUERY_STRING'], 0, -5).'.json')) {
	    $filename = 'data/'.substr($_SERVER['QUERY_STRING'], 0, -5).'.json';
	    $data = file_get_contents($filename);
    	$this->data = json_decode($data);
  } else {
    $this->data = [];
  }
  } // createPage

  
  public function showPage() {
		header ("Content-type: application/json");
		header ('X-SendFile: '.substr($_SERVER['QUERY_STRING'], 0, -6).'.json');
    echo json_encode($this->data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  } // showPage

} // DataPage
