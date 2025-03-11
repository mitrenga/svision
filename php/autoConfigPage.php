<?php

require_once 'abstractPage.php';

class AutoConfigPage extends AbstractPage {

  public function init($webURL, $wsURL) {
    parent::init($webURL, $wsURL);
  } // init
  
  public function createPage() {
    $scriptsVersion = md5(time());

    $this->data[] = '<!DOCTYPE html>';
    $this->data[] = '<html lang="cs">';
    $this->data[] = '  <head>';
    $this->data[] = '    <title>Configuration</title>';
    $this->data[] = '    <link rel="stylesheet" type="text/css" href="app/rg-lib/css/config.css?ver='.$scriptsVersion.'">';
    $this->data[] = '  </head>';

	  $this->data[] = '';

    $this->data[] = '  <body>';
    $this->data[] = '    <script>var srcVersion = "'.$scriptsVersion.'"</script>';
    if ($_COOKIE['libImportMethod'] === 'false-await-import') {
      $this->data[] = '    <script type="module" src="app/rg-lib/js/config/autoCfgImportFrom.js?ver='.$scriptsVersion.'"></script>';
      $this->data[] = '';
      $this->data[] = '    <script>';
      $this->data[] = '      function checkImportFrom() {';
      $this->data[] = '        document.cookie="libImportMethod=there-is-no-way;max-age=31536000;path=/";';
      $this->data[] = '        location.reload();';
      $this->data[] = '      }';
      $this->data[] = '      setTimeout(checkImportFrom, 250);';
      $this->data[] = '    </script>';
    } else {
      $this->data[] = '    <script type="module" src="app/rg-lib/js/config/autoCfgAwaitImport.js?ver='.$scriptsVersion.'"></script>';
      $this->data[] = '';
      $this->data[] = '    <script>';
      $this->data[] = '      function checkAwaitImport() {';
      $this->data[] = '        document.cookie="libImportMethod=false-await-import;max-age=31536000;path=/";';
      $this->data[] = '        location.reload();';
      $this->data[] = '      }';
      $this->data[] = '      setTimeout(checkAwaitImport, 250);';
      $this->data[] = '    </script>';
    }
    $this->data[] = '  </body>';
    $this->data[] = '</html>';
  } // createPage

} // AutoConfigPage
