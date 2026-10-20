<?php

require_once 'abstractAboutPage.php';

/**
 * The /pwa page every application serves: what a Progressive Web App is, why
 * it is worth installing the game as one — above all on a phone or a tablet —
 * and how it is installed on Android, iPhone and iPad, Windows, macOS, Linux
 * and ChromeOS, and how it is removed again. The about pages link to it from
 * their install note (AbstractAboutPage::installNote()).
 *
 * The page is a built-in: the front controller routes /pwa here for every
 * project (main.php, "<query>Page.php" under app/svision/php/), so the text is
 * written once. It takes the look of the about page, with the application's
 * name, icon and PLAY NOW button, and offers an INSTALL button where the
 * browser lets a page ask (the `beforeinstallprompt` event — Chrome, Edge,
 * Samsung Internet; Safari and Firefox show their own way instead).
 */
class PwaPage extends AbstractAboutPage {

  /**
   * The name the project's own about page uses (R-Type's says R·TYPE), else
   * the configuration's.
   *
   * @return string
   */
  public function appName() {
    if (file_exists('./aboutPage.php')) {
      require_once './aboutPage.php';
      if (class_exists('AboutPage')) {
        return (new AboutPage())->appName();
      }
    }
    return parent::appName();
  } // appName

  protected function pageTitle() {
    return 'Install '.$this->appName().' as an app';
  } // pageTitle

  protected function pagePath() {
    return 'pwa';
  } // pagePath

  protected function aboutData() {
    $name = $this->appName();
    return [
      'description' =>
        $name.' is a Progressive Web App: install it from your browser and play it from its own icon, '.
        'full screen and offline. What a PWA is, why install it, and how to do it on Android, iPhone, iPad, '.
        'Windows, macOS, Linux and ChromeOS.',
      'sections' => [
        [
          'heading' => 'What is a PWA?',
          'html' =>
            '<p>A Progressive Web App is an ordinary web page that a browser can turn into an application: '.
            'you install it once, and from then on it has its own icon among your apps, opens in its own '.
            'window without the address bar and the browser buttons, and keeps working when you are '.
            'offline, because the browser stores a copy of it on your device.</p>'.
            '<p>There is no app store and nothing to pay. The game you install is exactly the one you play '.
            'in the browser — same address, same version, same saved scores — only wrapped as an app. It '.
            'updates itself the next time you open it with a connection, and it is removed like any other '.
            'app.</p>',
        ],
        [
          'heading' => 'Why install '.$name.'?',
          'html' =>
            '<ul>'.
            '<li><b>Full screen.</b> No address bar, no tabs, no toolbar: the whole screen is the game. On '.
            'a phone or a tablet that is the difference between a cramped view and the real thing — '.
            'which is why installing is the recommended way to play on them.</li>'.
            '<li><b>Touch controls that stay put.</b> In a browser tab a swipe can scroll the page, pull it '.
            'down to refresh or bring the browser bars back; in the installed app the page does not move.</li>'.
            '<li><b>Its own icon.</b> The game starts from your home screen or desktop like any other app, '.
            'in a second, without typing an address.</li>'.
            '<li><b>Offline.</b> Once installed it runs without a connection — on a train, on a plane, in a '.
            'cellar.</li>'.
            '<li><b>Nothing extra.</b> It takes a few megabytes, asks for no permissions and brings no '.
            'notifications. Uninstalling it leaves nothing behind.</li>'.
            '</ul>'.
            '<p id="installHere" hidden>Your browser can install it right now:</p>'.
            '<p id="installButton" hidden><a class="play" href="#" id="installLink">&#11015; INSTALL '.$name.'</a></p>'.
            '<p id="installed" hidden>'.$name.' is already installed and you are playing it as an app.</p>',
        ],
        [
          'heading' => 'How to install it',
          'html' =>
            '<p>Open <a href="'.$GLOBALS['webURL'].'">the game</a> in your browser first; the install option '.
            'is always in the browser, next to the page.</p>'.
            '<h3>Android phone or tablet</h3>'.
            '<p><b>Chrome, Edge, Samsung Internet, Brave, Opera:</b> tap the menu (&#8942; or &#8801;) and '.
            'choose <i>Install app</i> or <i>Add to Home screen</i>. Some browsers also show an '.
            '<i>Install</i> banner or a small install icon in the address bar — tapping it does the same. '.
            'Confirm, and the icon appears on your home screen.</p>'.
            '<p><b>Firefox:</b> tap the menu (&#8942;), then <i>Install</i> (older versions: '.
            '<i>Add to Home screen</i>).</p>'.
            '<h3>iPhone and iPad</h3>'.
            '<p><b>Safari:</b> tap the <i>Share</i> button (the square with an arrow, at the bottom of the '.
            'screen on an iPhone and at the top on an iPad), scroll the list and choose <i>Add to Home '.
            'Screen</i>, then <i>Add</i>. From iOS 16.4 the same works in Chrome, Edge and Firefox through '.
            'their share menu as well. There is no install banner on iOS — the Share button is the way.</p>'.
            '<h3>Windows, macOS, Linux and ChromeOS</h3>'.
            '<p><b>Chrome, Edge, Brave, Opera:</b> look for the install icon at the right end of the address '.
            'bar (a monitor with an arrow, or a plus in a circle) and click it, or open the menu (&#8942;) '.
            'and choose <i>Install '.$name.'&hellip;</i> (Edge: <i>Apps &rarr; Install this site as an '.
            'app</i>). The game opens in its own window and gets an entry in the Start menu, the Dock or the '.
            'application launcher.</p>'.
            '<p><b>Safari on macOS</b> (Sonoma and later): <i>File &rarr; Add to Dock</i>.</p>'.
            '<p><b>Firefox on a desktop</b> cannot install web apps; play in the tab, or use one of the '.
            'browsers above for the installed version.</p>'.
            '<h3>Removing it</h3>'.
            '<p>Like any app: hold the icon and choose <i>Uninstall</i> or <i>Remove</i> on a phone or a '.
            'tablet; on a computer open the installed app, click its menu (&#8942;) and choose <i>Uninstall</i>, '.
            'or remove it from the apps list of the system. Your scores stay in the browser.</p>',
        ],
      ],
      'links' => [
        ['label' => 'Progressive web apps on MDN (Mozilla)', 'url' => 'https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps'],
        ['label' => 'Installing a web app — MDN guide', 'url' => 'https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing'],
        ['label' => 'Install a PWA in Chrome — Google help', 'url' => 'https://support.google.com/chrome/answer/9658361'],
      ],
      'footer' =>
        '<p>'.$name.' is served with a web app manifest and a service worker, which is what lets a browser '.
        'install it and run it offline.</p>'.
        $this->installScript(),
    ];
  } // aboutData

  /**
   * The INSTALL button: shown only when the browser fires `beforeinstallprompt`
   * (it never does when the app is already installed, or in Safari and Firefox);
   * the standalone display mode shows the "already installed" note instead.
   *
   * @return string A <script> element.
   */
  protected function installScript() {
    return <<<HTML
<script>
  (function () {
    var prompt = null;
    var here = document.getElementById('installHere'), button = document.getElementById('installButton'),
        link = document.getElementById('installLink'), installed = document.getElementById('installed');
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) {
      installed.hidden = false;
      return;
    }
    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      prompt = event;
      here.hidden = false;
      button.hidden = false;
    });
    link.addEventListener('click', function (event) {
      event.preventDefault();
      if (!prompt) { return; }
      prompt.prompt();
      prompt.userChoice.then(function () { prompt = null; here.hidden = true; button.hidden = true; });
    });
    window.addEventListener('appinstalled', function () { here.hidden = true; button.hidden = true; installed.hidden = false; });
  })();
</script>
HTML;
  } // installScript

} // PwaPage
