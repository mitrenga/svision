<?php

require_once 'abstractPage.php';

/**
 * Serves the application shell: the HTML document that loads the app's CSS and
 * bootstraps the JavaScript entry point. It picks the script to load based on
 * what is available — a built production bundle, the dev entry point for the
 * active import method, or a maintenance page as the fallback.
 */
class AppPage extends AbstractPage {

  /**
   * Builds the application shell HTML, injecting runtime globals (app name,
   * client IP, websocket URL, version, dev flags) and the appropriate module
   * script tag.
   */
  public function createPage() {
    $srcVersion = $this->srcVersion();

    $this->data[] = '<!-- free source code on https://github.com/mitrenga -->';
    $this->data[] = '<!DOCTYPE html>';
    $this->data[] = '<html lang="en">';
    $this->data[] = '  <head>';
    $appDescription = empty($GLOBALS['appDescription']) ? $GLOBALS['appName'] : $GLOBALS['appDescription'];

    $this->data[] = '    <title>'.$GLOBALS['appName'].'</title>';
    $this->data[] = '    <meta name="description" lang="en" content="'.$appDescription.'">';
    $this->addOpenGraphTags($appDescription);
    $this->data[] = '    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover">';
    $this->data[] = '    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
    $this->data[] = '    <meta name="mobile-web-app-capable" content="yes">';
    $this->data[] = '    <link rel="shortcut icon" sizes="256x256" href="images/app-icon-256x256.png" id="app-icon">';
    $this->data[] = '    <link rel="apple-touch-icon" sizes="192x192" href="images/app-icon-192x192.png">';
    $this->data[] = '    <meta name="theme-color" content="#000000">';
    $this->data[] = '    <link rel="manifest" href="'.$GLOBALS['webURL'].'manifest.webmanifest">';
    $this->data[] = '    <meta http-equiv="X-UA-Compatible" content="IE=Edge; IE=11;" />';
    $this->data[] = '    <link rel="stylesheet" type="text/css" href="app/svision/css/main.css?ver='.$srcVersion.'">';
    $this->addJsonLd($appDescription);
    $this->data[] = '  </head>';
    $this->data[] = '  <body id="bodyApp">';
    $this->addNoscript();
    $this->data[] = '    <script>window.appName = "'.$GLOBALS['appName'].'";</script>';
    $this->data[] = '    <script>window.clientIP = "'.$GLOBALS['clientIP'].'";</script>';
    $this->data[] = '    <script>window.appPrefix = "'.$GLOBALS['appPrefix'].'";</script>';
    $this->data[] = '    <script>window.wsURL = "'.$GLOBALS['wsURL'].'";</script>';     
    $this->data[] = '    <script>window.srcVersion = "'.$srcVersion.'";</script>';
    $this->data[] = '    <script>window.devMode = '.json_encode($GLOBALS['devMode'] ?? false).';</script>';
    $this->data[] = '    <script>window.devModeName = '.((empty($GLOBALS['devModeName'])) ? 'false' : '"'.$GLOBALS['devModeName'].'"').';</script>';
    $this->data[] = '    <script>window.appIconSprite = false;</script>';

    $this->data[] = '    <script>window.importPath = "'.$this->importPath().'";</script>';

    $bundle = 'js/bundle.'.$this->readVersion().'.min.js';
    if (file_exists($bundle)) {
      $this->data[] = '    <script type="module" src="'.$bundle.'?ver='.$srcVersion.'"></script>';
    } elseif (!empty($GLOBALS['devMode'])) {
      if ($_COOKIE['libImportMethod'] == 'await-import') {
        $this->data[] = '    <script type="module" src="app/main.js?ver='.$srcVersion.'"></script>';
      }
      if ($_COOKIE['libImportMethod'] == 'import-from') {
        $this->data[] = '    <script type="module" src="js/main.js?ver='.$srcVersion.'"></script>';
      }
    } else {
      $this->data[] = '    <script type="module" src="app/svision/js/maintenance.js?ver='.$srcVersion.'"></script>';
    }
    $this->data[] = '  </body>';
    $this->data[] = '</html>';
  } // createPage

  /**
   * Emits Open Graph (and Twitter card) meta tags. Generated only when the
   * application defines $appOpenGraph — an array of optional overrides:
   * 'title', 'description' and 'image' (path relative to the web root).
   * Everything else falls back to $appName, the page description and webURL.
   */
  private function addOpenGraphTags($appDescription) {
    if (empty($GLOBALS['appOpenGraph'])) {
      return;
    }
    $og = $GLOBALS['appOpenGraph'];
    $title = empty($og['title']) ? $GLOBALS['appName'] : $og['title'];
    $description = empty($og['description']) ? $appDescription : $og['description'];
    $image = $GLOBALS['webURL'].(empty($og['image']) ? 'images/app-icon-512x512.png' : $og['image']);

    $this->data[] = '    <meta property="og:type" content="website">';
    $this->data[] = '    <meta property="og:site_name" content="'.$GLOBALS['appName'].'">';
    $this->data[] = '    <meta property="og:title" content="'.$title.'">';
    $this->data[] = '    <meta property="og:description" content="'.$description.'">';
    $this->data[] = '    <meta property="og:url" content="'.$GLOBALS['webURL'].'">';
    $this->data[] = '    <meta property="og:image" content="'.$image.'">';
    $this->data[] = '    <meta name="twitter:card" content="summary_large_image">';
    $this->data[] = '    <meta name="twitter:title" content="'.$title.'">';
    $this->data[] = '    <meta name="twitter:description" content="'.$description.'">';
    $this->data[] = '    <meta name="twitter:image" content="'.$image.'">';
  } // addOpenGraphTags

  /**
   * Emits schema.org VideoGame structured data as a JSON-LD script tag.
   * Generated only when the application defines $appJsonLd — an array of
   * schema.org properties merged over the defaults below, so an application
   * can extend or override any of them (e.g. 'genre', 'isBasedOn', 'author').
   */
  private function addJsonLd($appDescription) {
    if (empty($GLOBALS['appJsonLd'])) {
      return;
    }
    $jsonLd = array_merge([
      '@context' => 'https://schema.org',
      '@type' => 'VideoGame',
      'name' => $GLOBALS['appName'],
      'description' => $appDescription,
      'url' => $GLOBALS['webURL'],
      'image' => $GLOBALS['webURL'].'images/app-icon-512x512.png',
      'gamePlatform' => 'Web browser',
      'operatingSystem' => 'Any',
      'applicationCategory' => 'Game',
      'playMode' => 'SinglePlayer',
      'inLanguage' => 'en',
      'isAccessibleForFree' => true,
      'offers' => [
        '@type' => 'Offer',
        'price' => '0',
        'priceCurrency' => 'USD',
        'availability' => 'https://schema.org/InStock',
      ],
    ], $GLOBALS['appJsonLd']);
    $this->data[] = '    <script type="application/ld+json">'
      .json_encode($jsonLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
      .'</script>';
  } // addJsonLd

  /**
   * Emits a <noscript> block right after <body>. Generated only when the
   * application defines $appNoscript (an HTML fragment). Visitors without
   * JavaScript see it instead of a blank page, and it gives search engine
   * crawlers textual content on an otherwise canvas-only page.
   */
  private function addNoscript() {
    if (empty($GLOBALS['appNoscript'])) {
      return;
    }
    $this->data[] = '    <noscript>';
    $this->data[] = '      '.$GLOBALS['appNoscript'];
    $this->data[] = '    </noscript>';
  } // addNoscript

} // AppPage
