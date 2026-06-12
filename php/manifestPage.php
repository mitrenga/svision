<?php

require_once 'abstractPage.php';

/**
 * Generates the PWA web app manifest (manifest.webmanifest) describing the app
 * name, display mode, theme colours and icon set.
 */
class ManifestPage extends AbstractPage {

  /**
   * Builds the manifest structure into $data, including the icon entries for all
   * supported dimensions plus the scalable SVG icon.
   */
  public function createPage() {
    $this->data['name'] = $GLOBALS['appName'];
    $this->data['short_name'] = $GLOBALS['appName'];
    $this->data['start_url'] = $GLOBALS['webURL'];
    $this->data['display'] = 'standalone';
    $this->data['background_color'] = '#000000';
    $this->data['theme_color'] = '#000000';
    $this->data['scope'] = '/';
    $this->data['icons'] = [];
    foreach (['192', '512', '1024', '1980'] as $dimension) {
      $icon = [];
      $icon['src'] = $GLOBALS['webURL'].'images/app-icon-'.$dimension.'x'.$dimension.'.png';
      $icon['sizes'] = $dimension.'x'.$dimension;
      $icon['type'] = 'image/png';
      $icon['purpose'] = 'any maskable';
      $this->data['icons'][] = $icon;
    }
    $icon = [];
    $icon['src'] = $GLOBALS['webURL'].'images/app-icon.svg';
    $icon['type'] = 'image/svg+xml';
    $icon['purpose'] = 'any maskable';
    $this->data['icons'][] = $icon;
  } // createPage
  
  /**
   * Sends $data as a manifest JSON response with the manifest content type.
   */
  public function showPage() {
		header ("Content-type: application/manifest+json");
		header ('X-SendFile: manifest.webmanifest');
    echo json_encode($this->data, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
  } // showPage

} // ManifestPage
