<?php

require_once 'abstractPage.php';

/**
 * Generates sitemap.xml for search engines. The application is a single-page
 * app, so the sitemap lists just the app's root URL, with the deploy date of
 * the current version as <lastmod>.
 */
class SitemapPage extends AbstractPage {

  /**
   * Builds the sitemap XML into $data.
   */
  public function createPage() {
    $this->data[] = '<?xml version="1.0" encoding="UTF-8"?>';
    $this->data[] = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    $this->data[] = '  <url>';
    $this->data[] = '    <loc>'.$GLOBALS['webURL'].'</loc>';
    if (file_exists('app/version.js')) {
      $this->data[] = '    <lastmod>'.date('Y-m-d', filemtime('app/version.js')).'</lastmod>';
    }
    $this->data[] = '  </url>';
    if (file_exists('./aboutPage.php')) {
      $this->data[] = '  <url>';
      $this->data[] = '    <loc>'.$GLOBALS['webURL'].'about</loc>';
      $this->data[] = '    <lastmod>'.date('Y-m-d', filemtime('./aboutPage.php')).'</lastmod>';
      $this->data[] = '  </url>';
    }
    $this->data[] = '</urlset>';
  } // createPage

  /**
   * Sends $data as an XML response.
   */
  public function showPage() {
    header('Content-type: application/xml; charset=UTF-8');
    parent::showPage();
  } // showPage

} // SitemapPage
