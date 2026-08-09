<?php

require_once 'abstractPage.php';

/**
 * Generates robots.txt: allows all crawlers and points them to sitemap.xml,
 * so search engines discover the sitemap without manual submission.
 */
class RobotsPage extends AbstractPage {

  /**
   * Builds the robots.txt content into $data.
   */
  public function createPage() {
    $this->data[] = 'User-agent: *';
    $this->data[] = 'Disallow:';
    $this->data[] = '';
    $this->data[] = 'Sitemap: '.$GLOBALS['webURL'].'sitemap.xml';
  } // createPage

  /**
   * Sends $data as a plain text response.
   */
  public function showPage() {
    header('Content-type: text/plain; charset=UTF-8');
    parent::showPage();
  } // showPage

} // RobotsPage
