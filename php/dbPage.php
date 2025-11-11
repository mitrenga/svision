<?php

require_once 'abstractPage.php';

class DbPage extends AbstractPage {

  public function createPage() {    
    $this->data['source'] = 'server';
    $this->data['data'] = [];
    if (isset ($_SERVER['HTTP_FETCHDATAID'])) {
      $this->data['fetchDataId'] = $_SERVER['HTTP_FETCHDATAID'];      
      if(file_exists('db/'.substr($_SERVER['QUERY_STRING'], 0, -3).'.php')) {
        require_once('db/'.substr($_SERVER['QUERY_STRING'], 0, -3).'.php');
        $sql = new DataCommand();
        $postData = '';
        $handle = fopen('php://input', 'r');
        do {
          $buffer = fgets($handle, 4096);
          $postData .= $buffer;
        } while (strlen($buffer) > 0);
        fclose ($handle);
        $dbData = $sql->execute($postData);
        foreach($dbData as $key => $value) {
          $this->data['data'][$key] = $value;
        }
      }
    } else {
      $this->data = ['error' => ['message' => 'unknown fetchDataId']];
    }
  } // createPage

  public function showPage() {
		header ("Content-type: application/json");
		header ('X-SendFile: '.substr($_SERVER['QUERY_STRING'], 0, -3).'.json');
    echo json_encode($this->data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  } // showPage

} // DataPage
