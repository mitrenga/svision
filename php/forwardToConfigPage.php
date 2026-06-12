<?php

require_once 'abstractPage.php';

/**
 * Redirect page shown when the import method cookie holds an unusable value.
 * It immediately forwards the browser to the config page (via a meta refresh),
 * with a plain link as a fallback.
 */
class ForwardToConfigPage extends AbstractPage {

  /**
   * Builds the minimal HTML page that redirects to the config page.
   */
  public function createPage() {
    $scriptsVersion = md5(time());

    $this->data[] = '<!DOCTYPE html>';
    $this->data[] = '<html lang="cs">';
    $this->data[] = '  <head>';
    $this->data[] = '    <title>'.$GLOBALS['appName'].'</title>';
    $this->data[] = '    <meta http-equiv="refresh" content="0; url=config">';
    $this->data[] = '  </head>';

	  $this->data[] = '';

    $this->data[] = '  <body>';
    $this->data[] = '  <a href="config">Please visit config page</a>';
    $this->data[] = '  </body>';
    $this->data[] = '</html>';
  } // createPage

} // ForwardToConfigPage
