<?php

require_once 'abstractPage.php';

/**
 * Database endpoint. In response to a "<name>.db" POST it loads the matching
 * db/<name>.php command, executes it with the raw POST body, and returns the
 * result as JSON.
 */
class DbPage extends AbstractPage {

  /**
   * Runs the requested db command against the POST body and collects its result
   * into $data, or fills $data with an error entry when the request is invalid.
   */
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

  /**
   * Sends $data as a JSON response with the appropriate content type.
   */
  public function showPage() {
		header ("Content-type: application/json");
		header ('X-SendFile: '.substr($_SERVER['QUERY_STRING'], 0, -3).'.json');
    echo json_encode($this->data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  } // showPage

} // DataPage
