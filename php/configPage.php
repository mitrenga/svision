<?php

require_once 'abstractPage.php';

/**
 * Diagnostics / configuration page. Renders an HTML page reporting the browser
 * environment: the user agent, the detected ECMAScript version, support for the
 * class syntax and for dynamic import, which runtime this request is served
 * with, the service worker status (with buttons to unregister it and clear its
 * cache, and to disable/enable it via the disableServiceWorker cookie) and the
 * current cookies (with clear buttons).
 */
class ConfigPage extends AbstractPage {

  /**
   * Builds the full diagnostics page.
   */
  public function createPage() {
    $srcVersion = $this->srcVersion();

    $this->data[] = '<!DOCTYPE html>';
    $this->data[] = '<html lang="cs">';
    $this->data[] = '  <head>';
    $this->data[] = '    <title>'.$GLOBALS['appName'].' — Configuration</title>';
    $this->data[] = '    <meta name="description" lang="en" content="Diagnostics and configuration page of '.$GLOBALS['appName'].': browser capabilities, import method, audio and display settings.">';
    $this->data[] = '    <meta name="robots" content="noindex">';
    $this->data[] = '    <link rel="stylesheet" type="text/css" href="app/svision/css/config.css?ver='.$srcVersion.'">';
    $this->data[] = '  </head>';

	  $this->data[] = '';

    $this->data[] = '  <body>';
    $this->data[] = '    <script>var srcVersion = "'.$srcVersion.'";</script>';

    $this->data[] = '    <h1>Configuration</h1>';

    // Section: Browser — report the raw user agent string.
    $this->data[] = '    <h2>Browser</h2>';
    $this->data[] = '    <ul>';
    $this->data[] = '      <li>';
    $this->data[] = '      '.print_r($_SERVER['HTTP_USER_AGENT'], true);
    $this->data[] = '      </li>';
    $this->data[] = '    </ul>';

    $this->data[] = '';

    // Section: JavaScript — detect the highest supported ECMAScript version by
    // feature-probing successive built-ins (the nested ifs fall through to the
    // newest feature present), then check class syntax and import-method support.
    $this->data[] = '    <h2>Javacript</h2>';
    $this->data[] = '    <ul>';
    $this->data[] = '      <li>';
    $this->data[] = '        <noscript><span class="error">ERROR: JavaScript is disable or not supported ...</span></noscript>';
    $this->data[] = '        <script>';
    $this->data[] = '          document.write("<span class=\"version-item-label\">version:</span>");';
    $this->data[] = '';
    $this->data[] = '          function getJSVersion() {';
    $this->data[] = '            var version = {id: 0, text: "unknown", class: "error"};';
    $this->data[] = '            if (String.prototype.trim) {';
    $this->data[] = '              version = {id: 5, text: "ECMAScript 2009", class: "error"};';
    $this->data[] = '            if (Array.from) {';
    $this->data[] = '              version = {id: 6, text: "ECMAScript 2015", class: "error"};';
    $this->data[] = '            if (Array.prototype.includes) {';
    $this->data[] = '              version = {id: 7, text: "ECMAScript 2016", class: "error"};';
    $this->data[] = '            if (Object.values) {';
    $this->data[] = '              version = {id: 8, text: "ECMAScript 2017", class: "error"};';
    $this->data[] = '            if (Promise.prototype.finally) {';
    $this->data[] = '              version = {id: 9, text: "ECMAScript 2018", class: "ok"};';
    $this->data[] = '            if (Array.prototype.flat) {';
    $this->data[] = '              version = {id: 10, text: "ECMAScript 2019", class: "ok"};';
    $this->data[] = '            if (String.prototype.matchAll) {';
    $this->data[] = '              version = {id: 11, text: "ECMAScript 2020", class: "ok"};';
    $this->data[] = '            if (String.prototype.replaceAll) {';
    $this->data[] = '              version = {id: 12, text: "ECMAScript 2021", class: "ok"};';
    $this->data[] = '            if (Object.hasOwn) {';
    $this->data[] = '              version = {id: 13, text: "ECMAScript 2022", class: "ok"};';
    $this->data[] = '            if (Array.prototype.toSorted) {';
    $this->data[] = '              version = {id: 14, text: "ECMAScript 2023", class: "ok"};';
    $this->data[] = '            if (Object.groupBy) {';
    $this->data[] = '              version = {id: 15, text: "ECMAScript 2024", class: "ok"};';
    $this->data[] = '            if (RegExp.escape) {';
    $this->data[] = '              version = {id: 16, text: "ECMAScript 2025", class: "ok"};';
    $this->data[] = '            if (Error.isError) {';
    $this->data[] = '              version = {id: 17, text: "ECMAScript 2026", class: "ok"};';
    $this->data[] = '            }}}}}}}}}}}}}';
    $this->data[] = '            return version;';
    $this->data[] = '          } // getJSVersion';
    $this->data[] = '';
    $this->data[] = '          var version = getJSVersion();';
    $this->data[] = '          document.write("<span class=\""+version["class"]+"\">ES"+version["id"]+" - "+version["text"]+"</span> ");';
    $this->data[] = '          document.write("[<a target=\"_\" href=\"https://en.wikipedia.org/wiki/ECMAScript_version_history\">version history</a>]<sup>⧉</sup>");';
    $this->data[] = '        </script>';
    $this->data[] = '      </li>';
    $this->data[] = '';
    $this->data[] = '      <script>';
    $this->data[] = '        document.write("<li><span class=\"item-label\">class syntax support:</span><span id=\"class-syntax\">...</span></li>");';
    $this->data[] = '        function checkClassSyntax() {';
    $this->data[] = '          var elClassSyntax = document.getElementById("class-syntax");';
    $this->data[] = '          if (elClassSyntax.innerText != "OK") {';
    $this->data[] = '            elClassSyntax.innerText = "FALSE";';
    $this->data[] = '            elClassSyntax.classList.add("error");';
    $this->data[] = '          }';
    $this->data[] = '        }';
    $this->data[] = '        setTimeout(checkClassSyntax, 250);';
    $this->data[] = '      </script>';
    $this->data[] = '      <script src="app/svision/js/config/checkClassSyntax.js?ver='.$srcVersion.'"></script>';
    $this->data[] = '';
    $this->data[] = '      <script>';
    $this->data[] = '        document.write("<li><span class=\"item-label\">await import support:</span>")';
    $this->data[] = '        document.write("<span id=\"await-import\">...</span>")';
    $this->data[] = '        document.write("</li>");';
    $this->data[] = '        function checkAwaitImport() {';
    $this->data[] = '          var elAwaitImport = document.getElementById("await-import");';
    $this->data[] = '          if (elAwaitImport.innerText != "OK") {';
    $this->data[] = '            elAwaitImport.innerText = "FALSE";';
    $this->data[] = '            elAwaitImport.classList.add("error");';
    $this->data[] = '          }';
    $this->data[] = '        }';
    $this->data[] = '        setTimeout(checkAwaitImport, 250);';
    $this->data[] = '      </script>';
    $this->data[] = '      <script type="module" src="app/svision/js/config/checkAwaitImport.js?ver='.$srcVersion.'"></script>';
    $this->data[] = '    </ul>';
  	$this->data[] = '';

    // Section: Runtime — which JavaScript this request is actually served with:
    // a built bundle out of js/, or the sources under app/ loaded one by one
    // through dynamic import. There is nothing to choose here; the app shell
    // decides it (AbstractPage::bundleFile()) and this only reports the answer.
    $bundle = $this->bundleFile();
    $this->data[] = '    <h2>Runtime</h2>';
    $this->data[] = '    <ul>';
    if ($bundle !== false) {
      $this->data[] = '      <li><span class="item-label">served from:</span> bundle <b>'.$bundle.'</b></li>';
    } else {
      $this->data[] = '      <li><span class="item-label">served from:</span> sources in <b>app/</b> (dynamic import)</li>';
    }
    $this->data[] = '    </ul>';
  	$this->data[] = '';
    // Section: Service Worker — report whether a service worker is registered and
    // whether it controls this page (diagnostics for stuck or leftover workers).
    $this->data[] = '    <h2>Service Worker</h2>';
    $this->data[] = '    <ul id="serviceWorkerInfo"><li>...</li></ul>';
    $this->data[] = '    <div id="serviceWorkerActions"></div>';
    $this->data[] = '    <script>';
    $this->data[] = '      (function() {';
    $this->data[] = '        var el = document.getElementById("serviceWorkerInfo");';
    $this->data[] = '        if (!("serviceWorker" in navigator)) {';
    $this->data[] = '          el.innerHTML = "<li><span class=\"item-label\">support:</span><span class=\"error\">not supported by this browser</span></li>";';
    $this->data[] = '          return;';
    $this->data[] = '        }';
    $this->data[] = '        navigator.serviceWorker.getRegistrations().then(function(registrations) {';
    $this->data[] = '          var html = "";';
    $this->data[] = '          if (registrations.length === 0) {';
    $this->data[] = '            html += "<li><span class=\"item-label\">registered:</span><span class=\"error\">no</span></li>";';
    $this->data[] = '          } else {';
    $this->data[] = '            html += "<li><span class=\"item-label\">registered:</span><span class=\"ok\">yes</span>" + (registrations.length > 1 ? "count: " + registrations.length : "") + "</li>";';
    $this->data[] = '            for (var i = 0; i < registrations.length; i++) {';
    $this->data[] = '              var worker = registrations[i].active || registrations[i].waiting || registrations[i].installing;';
    $this->data[] = '              var stateClass = (worker && worker.state === "activated") ? "ok" : "error";';
    $this->data[] = '              var stateText = worker ? worker.state : "unknown";';
    $this->data[] = '              html += "<li><span class=\"item-label\">scope:</span><span class=\"" + stateClass + "\">" + stateText + "</span>" + registrations[i].scope + "</li>";';
    $this->data[] = '            }';
    $this->data[] = '          }';
    $this->data[] = '          var controller = navigator.serviceWorker.controller;';
    $this->data[] = '          html += "<li><span class=\"item-label\">controlling this page:</span>" + (controller ? ("<span class=\"ok\">yes</span>" + controller.scriptURL) : "<span class=\"error\">no</span>") + "</li>";';
    $this->data[] = '          el.innerHTML = html;';
    $this->data[] = '          if (registrations.length > 0) {';
    $this->data[] = '            document.getElementById("serviceWorkerActions").innerHTML = "<button onclick=\"clearServiceWorkers()\">Unregister service workers and clear cache</button>";';
    $this->data[] = '          }';
    $this->data[] = '        }).catch(function(error) {';
    $this->data[] = '          el.innerHTML = "<li><span class=\"error\">ERROR: " + error.message + "</span></li>";';
    $this->data[] = '        });';
    $this->data[] = '      })();';
    $this->data[] = '    </script>';
    $this->data[] = '    <script>';
    $this->data[] = '      function clearServiceWorkers() {';
    $this->data[] = '        var tasks = [];';
    $this->data[] = '        if ("serviceWorker" in navigator) {';
    $this->data[] = '          tasks.push(navigator.serviceWorker.getRegistrations().then(function(registrations) {';
    $this->data[] = '            return Promise.all(registrations.map(function(registration) { return registration.unregister(); }));';
    $this->data[] = '          }));';
    $this->data[] = '        }';
    $this->data[] = '        if (window.caches && caches.keys) {';
    $this->data[] = '          tasks.push(caches.keys().then(function(keys) {';
    $this->data[] = '            return Promise.all(keys.map(function(key) { return caches.delete(key); }));';
    $this->data[] = '          }));';
    $this->data[] = '        }';
    $this->data[] = '        Promise.all(tasks).then(function() { location.reload(); }).catch(function() { location.reload(); });';
    $this->data[] = '      } // clearServiceWorkers';
    $this->data[] = '      function disableServiceWorker() {';
    $this->data[] = '        document.cookie = "disableServiceWorker=true;max-age=31536000;path=/";';
    $this->data[] = '        clearServiceWorkers();';
    $this->data[] = '      } // disableServiceWorker';
    $this->data[] = '    </script>';
    if (isset($_COOKIE['disableServiceWorker']) && $_COOKIE['disableServiceWorker'] == 'true') {
      $this->data[] = '    <script>document.write("<button onclick=\"document.cookie=\'disableServiceWorker=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/\';location.reload();\">Enable service worker</button>");</script>';
    } else {
      $this->data[] = '    <script>document.write("<button onclick=\"disableServiceWorker()\">Disable service worker</button>");</script>';
    }
    $this->data[] = '';
    // Section: Cookies — list the current cookies client-side, each with a
    // button to delete it, plus a "clear all" button.
    $this->data[] = '    <h2>Cookies</h2>';
    $this->data[] = '    <span class="cookies">';
    $this->data[] = '    <script>';
    $this->data[] = '      var allCookies = [];';
    $this->data[] = '      if (document.cookie.length > 0) {';
    $this->data[] = '        var arrayCookies = document.cookie.split(";");';
    $this->data[] = '        arrayCookies.forEach(function(cookieString) {';
    $this->data[] = '          var key = cookieString.split("=")[0];';
    $this->data[] = '          while (key.length > 0 && key[0] == " ") key = key.substring(1, key.length);';
    $this->data[] = '          var value = cookieString.split("=")[1];';
    $this->data[] = '          while (value.length > 0 && value[0] == " ") value = value.substring(1, value.length);';
    $this->data[] = '          allCookies.push({key: key, value: value});';
    $this->data[] = '        });';
    $this->data[] = '      }';


    $this->data[] = '      if (allCookies.length > 0) {';
    $this->data[] = '        document.write("<ul class=\"no-marker\">");';
    $this->data[] = '        allCookies.forEach((cookie) => {';
    $this->data[] = '          document.write("<li>")';
    $this->data[] = '          document.write("<button onclick=");';
    $this->data[] = '            document.write("\"");';
    $this->data[] = '            document.write("document.cookie=\'"+cookie[\'key\']+"=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/\';");';
    $this->data[] = '            document.write("document.cookie=\'"+cookie[\'key\']+"=;expires=Thu, 01 Jan 1970 00:00:00 UTC\';");';
    $this->data[] = '            document.write("location.reload();")';
    $this->data[] = '            document.write("\">");';
    $this->data[] = '            document.write(" X ");';
    $this->data[] = '          document.write("</button>");';
    $this->data[] = '          document.write("&nbsp;&nbsp;<b>"+cookie[\'key\']+":</b> "+cookie[\'value\'])';
    $this->data[] = '          document.write("</li>");';
    $this->data[] = '        });';
    $this->data[] = '        document.write("</ul>");';
    $this->data[] = '        document.write("<br>");';
    $this->data[] = '        document.write("<button onclick=");';
    $this->data[] = '          document.write("\"");';
    $this->data[] = '          document.write("allCookies.forEach((cookie)=>{document.cookie=cookie[\'key\']+\'=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/\';});");';
    $this->data[] = '          document.write("allCookies.forEach((cookie)=>{document.cookie=cookie[\'key\']+\'=;expires=Thu, 01 Jan 1970 00:00:00 UTC\';});");';
    $this->data[] = '          document.write("location.reload();")';
    $this->data[] = '          document.write("\">");';
    $this->data[] = '          document.write("Clear all cookies");';
    $this->data[] = '        document.write("</button>");';
    $this->data[] = '    } else {';
    $this->data[] = '      document.write("no cookies");';
    $this->data[] = '    }';
    $this->data[] = '    </script>';

    $this->data[] = '  </body>';
    $this->data[] = '</html>';
  } // createPage

} // ConfigPage
