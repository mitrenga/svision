<?php

require_once 'abstractPage.php';

/**
 * Data endpoint. Serves a JSON file from the data/ directory in response to a
 * "<name>.data" POST, echoing back the fetchDataId so the client can match the
 * response to its request.
 */
class DataPage extends AbstractPage {

  /**
   * Loads and decodes the requested data/<name>.json file into $data, or fills
   * $data with an error entry if the request is invalid or the file is missing.
   */
  public function createPage() {
    $this->data['source'] = 'server';
    if (isset ($_SERVER['HTTP_FETCHDATAID'])) {
      $this->data['fetchDataId'] = $_SERVER['HTTP_FETCHDATAID'];
      if(file_exists('data/'.substr($_SERVER['QUERY_STRING'], 0, -5).'.json')) {
	      $filename = 'data/'.substr($_SERVER['QUERY_STRING'], 0, -5).'.json';
	      $dataJSON = file_get_contents($filename);
        try {
          $this->data['data'] = json_decode($dataJSON);
        }
        catch (\JsonException $exception) {
          $this->data = ['error' => ['message' => $exception->getMessage()]];
        } 
      } else {
        $this->data = ['error' => ['message' => 'file not exist']];
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
		header ('X-SendFile: '.substr($_SERVER['QUERY_STRING'], 0, -5).'.json');
    echo json_encode($this->data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  } // showPage

} // DataPage
