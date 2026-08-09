<?php

require_once 'abstractPage.php';

/**
 * Base class for the optional /about page — a static, crawlable HTML page
 * describing the game, with images and external links (Wikipedia, archives...).
 *
 * svision itself does not serve any about page by default. An application
 * opts in by creating aboutPage.php in its project root:
 *
 *   require_once 'app/svision/php/abstractAboutPage.php';
 *   class AboutPage extends AbstractAboutPage {
 *     protected function aboutData() { return [...]; }
 *   }
 *
 * The front controller then routes /about to it automatically, and
 * SitemapPage includes the /about URL in sitemap.xml.
 */
class AbstractAboutPage extends AbstractPage {

  /**
   * Returns the page content; subclasses override it. Supported keys:
   * 'description' — meta description (defaults to $appDescription/$appName),
   * 'image'       — hero image path relative to the web root,
   * 'sections'    — list of ['heading' => ..., 'html' => ..., 'image' => ...],
   * 'links'       — list of ['label' => ..., 'url' => ...] external links,
   * 'footer'      — extra HTML at the bottom (license note, credits...).
   */
  protected function aboutData() {
    return [];
  } // aboutData

  /**
   * Builds the about page HTML into $data: head with SEO metadata, a header
   * with the app name and a play button, the hero image, content sections,
   * the link list and the footer.
   */
  public function createPage() {
    $about = $this->aboutData();
    $appName = $GLOBALS['appName'];
    $description = empty($about['description'])
      ? (empty($GLOBALS['appDescription']) ? $appName : $GLOBALS['appDescription'])
      : $about['description'];

    $this->data[] = '<!DOCTYPE html>';
    $this->data[] = '<html lang="en">';
    $this->data[] = '  <head>';
    $this->data[] = '    <title>About '.$appName.'</title>';
    $this->data[] = '    <meta name="description" lang="en" content="'.$description.'">';
    $this->data[] = '    <meta charset="UTF-8">';
    $this->data[] = '    <meta name="viewport" content="width=device-width, initial-scale=1.0">';
    $this->data[] = '    <link rel="canonical" href="'.$GLOBALS['webURL'].'about">';
    $this->data[] = '    <link rel="shortcut icon" sizes="256x256" href="images/app-icon-256x256.png">';
    $this->data[] = '    <style>';
    $this->data[] = $this->pageStyle();
    $this->data[] = '    </style>';
    $this->data[] = '  </head>';
    $this->data[] = '  <body>';
    $this->data[] = '    <div class="stripe"></div>';
    $this->data[] = '    <main>';
    $this->data[] = '      <header>';
    $this->data[] = '        <h1>'.$appName.'</h1>';
    $this->data[] = '        <a class="play" href="'.$GLOBALS['webURL'].'">&#9654; PLAY NOW</a>';
    $this->data[] = '      </header>';
    if (!empty($about['image'])) {
      $this->data[] = '      <img class="hero" src="'.$about['image'].'" alt="'.$appName.'">';
    }
    foreach ($about['sections'] ?? [] as $section) {
      if (!empty($section['heading'])) {
        $this->data[] = '      <h2>'.$section['heading'].'</h2>';
      }
      if (!empty($section['image'])) {
        $this->data[] = '      <img src="'.$section['image'].'" alt="'.($section['heading'] ?? $appName).'">';
      }
      if (!empty($section['html'])) {
        $this->data[] = '      '.$section['html'];
      }
    }
    if (!empty($about['links'])) {
      $this->data[] = '      <h2>Links</h2>';
      $this->data[] = '      <ul class="links">';
      foreach ($about['links'] as $link) {
        $this->data[] = '        <li><a href="'.$link['url'].'" target="_blank" rel="noopener">'.$link['label'].'</a></li>';
      }
      $this->data[] = '      </ul>';
    }
    $this->data[] = '      <footer>';
    if (!empty($about['footer'])) {
      $this->data[] = '        '.$about['footer'];
    }
    $this->data[] = '        <p><a href="'.$GLOBALS['webURL'].'">&#9654; Back to the game</a></p>';
    $this->data[] = '      </footer>';
    $this->data[] = '    </main>';
    $this->data[] = '    <div class="stripe"></div>';
    $this->data[] = '  </body>';
    $this->data[] = '</html>';
  } // createPage

  /**
   * Returns the shared retro-styled CSS: dark background, ZX Spectrum accent
   * colours, a Sinclair-style rainbow stripe and pixelated image rendering.
   */
  protected function pageStyle() {
    return <<<CSS
      * { box-sizing: border-box; }
      body {
        margin: 0; background: #000; color: #ccc;
        font-family: 'Courier New', Courier, monospace;
        font-size: 17px; line-height: 1.6;
      }
      .stripe {
        height: 8px;
        background: linear-gradient(110deg,
          #fe0000 0 25%, #fefe00 25% 50%, #00fe00 50% 75%, #00fefe 75%);
      }
      main { max-width: 720px; margin: 0 auto; padding: 24px 20px 40px; }
      header { display: flex; flex-wrap: wrap; align-items: center;
        justify-content: space-between; gap: 16px; margin-bottom: 8px; }
      h1 { color: #fefe00; font-size: 34px; letter-spacing: 3px; margin: 0; }
      h2 { color: #00fefe; letter-spacing: 2px; margin: 36px 0 8px; }
      a { color: #fefe00; }
      a:hover { color: #fff; }
      .play {
        display: inline-block; background: #fefe00; color: #000;
        font-weight: bold; text-decoration: none; letter-spacing: 2px;
        padding: 10px 22px; border: 2px solid #fefe00;
      }
      .play:hover { background: #000; color: #fefe00; }
      img { max-width: 100%; height: auto; display: block;
        margin: 20px 0; border: 2px solid #aaa; image-rendering: pixelated; }
      ul.links { padding-left: 24px; }
      ul.links li { margin: 6px 0; }
      footer { margin-top: 48px; border-top: 1px solid #333;
        padding-top: 16px; font-size: 14px; color: #888; }
CSS;
  } // pageStyle

} // AbstractAboutPage
