<?php

require_once 'abstractPage.php';

class AutoConfigPage extends AbstractPage {
  
  public function createPage() {
    $srcVersion = md5(time());

    $this->data[] = '<!DOCTYPE html>';
    $this->data[] = '<html lang="cs">';
    $this->data[] = '  <head>';
    $this->data[] = '    <title>'.$GLOBALS['appName'].'</title>';
    $this->data[] = '    <link rel="stylesheet" type="text/css" href="app/svision/css/config.css?ver='.$srcVersion.'">';
    $this->data[] = '  </head>';

	  $this->data[] = '';

    $this->data[] = '  <body>';
    $this->data[] = '    <script>var srcVersion = "'.$srcVersion.'"</script>';
    if (isset($_COOKIE['libImportMethod']) && $_COOKIE['libImportMethod'] == 'false-await-import') {
      $this->data[] = '    <script type="module" src="app/svision/js/config/autoCfgImportFrom.js?ver='.$srcVersion.'"></script>';
      $this->data[] = '';
      $this->data[] = '    <script>';
      $this->data[] = '      function checkImportFrom() {';
      $this->data[] = '        document.cookie="libImportMethod=there-is-no-way;max-age=31536000;path=/";';
      $this->data[] = '        location.reload();';
      $this->data[] = '      }';
      $this->data[] = '      setTimeout(checkImportFrom, 250);';
      $this->data[] = '    </script>';
    } else {
      $this->data[] = '    <script type="module" src="app/svision/js/config/autoCfgAwaitImport.js?ver='.$srcVersion.'"></script>';
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
