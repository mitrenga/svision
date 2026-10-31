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
      if (substr($_SERVER['QUERY_STRING'], 0, -5) === 'dataFiles') {
        $this->createFiles();
        return;
      }
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
   * "dataFiles.data": a group of data files in one response. The POST body is
   * {"keys": ["world", "memory", ...]}; each key comes back as the decoded
   * data/<key>.json, or null when there is no such file (like appData). Keys
   * are limited to letters, digits, '_' and '-', so nothing outside data/ can
   * be read.
   */
  private function createFiles() {
    $request = json_decode(file_get_contents('php://input'), true);
    if (!is_array($request) || !isset($request['keys']) || !is_array($request['keys'])) {
      $this->data = ['error' => ['message' => 'no keys']];
      return;
    }
    $files = [];
    foreach ($request['keys'] as $key) {
      if (!is_string($key) || !preg_match('/^[A-Za-z0-9_-]+$/', $key)) {
        $this->data = ['error' => ['message' => 'invalid key']];
        return;
      }
      $filename = 'data/'.$key.'.json';
      if (!is_file($filename)) {
        $files[$key] = null;
        continue;
      }
      try {
        $files[$key] = json_decode(file_get_contents($filename), false, 512, JSON_THROW_ON_ERROR);
      }
      catch (\JsonException $exception) {
        $this->data = ['error' => ['message' => $key.': '.$exception->getMessage()]];
        return;
      }
    }
    $this->data['data'] = $files;
  } // createFiles
  
  /**
   * Sends $data as a JSON response with the appropriate content type.
   */
  public function showPage() {
		header ("Content-type: application/json");
		if (substr($_SERVER['QUERY_STRING'], 0, -5) !== 'dataFiles') {
		  header ('X-SendFile: '.substr($_SERVER['QUERY_STRING'], 0, -5).'.json');
		}
    echo json_encode($this->data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  } // showPage

} // DataPage
