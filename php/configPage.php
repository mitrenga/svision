<?php

require_once 'abstractPage.php';

class ConfigPage extends AbstractPage {

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
    $this->data[] = '    <script>var srcVersion = "'.$scriptsVersion.'";</script>';

    $this->data[] = '    <h1>Configuration</h1>';
    $this->data[] = '    <h2>Browser</h2>';
    $this->data[] = '    <ul>';
    $this->data[] = '      <li>';
    $this->data[] = '      '.print_r($_SERVER['HTTP_USER_AGENT'], true);
    $this->data[] = '      </li>';
    $this->data[] = '    </ul>';

    $this->data[] = '';

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
    $this->data[] = '            if (Array.prototype.map) {';
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
    $this->data[] = '            }}}}}}}}}}}';
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
    $this->data[] = '            elClassSyntax.className = "error";';
    $this->data[] = '          }';
    $this->data[] = '        }';
    $this->data[] = '        setTimeout(checkClassSyntax, 250);';
    $this->data[] = '      </script>';
    $this->data[] = '      <script src="app/rg-lib/js/config/checkClassSyntax.js?ver='.$scriptsVersion.'"></script>';
    $this->data[] = '';
    $this->data[] = '      <script>';
    $this->data[] = '        document.write("<li><span class=\"item-label\">await import support:</span>")';
    $this->data[] = '        document.write("<span id=\"await-import\">...</span>")';
    if ($_COOKIE['libImportMethod'] == 'await-import') {
      $this->data[] = '          document.write("&nbsp;&nbsp;&nbsp;<span class=\"enable\">enable</span>")';
    } else {
      $this->data[] = '          document.write("&nbsp;&nbsp;&nbsp;<span class=\"disable\">disable</span>")';
    }
    $this->data[] = '        document.write("</li>");';
    $this->data[] = '        function checkAwaitImport() {';
    $this->data[] = '          var elAwaitImport = document.getElementById("await-import");';
    $this->data[] = '          if (elAwaitImport.innerText != "OK") {';
    $this->data[] = '            elAwaitImport.innerText = "FALSE";';
    $this->data[] = '            elAwaitImport.className = "error";';
    $this->data[] = '          }';
    $this->data[] = '        }';
    $this->data[] = '        setTimeout(checkAwaitImport, 250);';
    $this->data[] = '      </script>';
    $this->data[] = '      <script type="module" src="app/rg-lib/js/config/checkAwaitImport.js?ver='.$scriptsVersion.'"></script>';
    $this->data[] = '';
    $this->data[] = '      <script>';
    $this->data[] = '        document.write("<li><span class=\"item-label\">import from support:</span>")';
    $this->data[] = '        document.write("<span id=\"import-from\">...</span>")';
    if ($_COOKIE['libImportMethod'] == 'import-from') {
      $this->data[] = '          document.write("&nbsp;&nbsp;&nbsp;<span class=\"enable\">enable</span>")';
    } else {
      $this->data[] = '          document.write("&nbsp;&nbsp;&nbsp;<span class=\"disable\">disable</span>")';
    }
    $this->data[] = '        document.write("</li>");';
    $this->data[] = '        function checkImportFrom() {';
    $this->data[] = '          var elImportFrom = document.getElementById("import-from");';
    $this->data[] = '          if (elImportFrom.innerText != "OK") {';
    $this->data[] = '            elImportFrom.innerText = "FALSE";';
    $this->data[] = '            elImportFrom.className = "error";';
    $this->data[] = '          }';
    $this->data[] = '        }';
    $this->data[] = '        setTimeout(checkImportFrom, 250);';
    $this->data[] = '      </script>';
    $this->data[] = '      <script type="module" src="app/rg-lib/js/config/checkImportFrom.js?ver='.$scriptsVersion.'"></script>';
    $this->data[] = '    </ul>';
  	$this->data[] = '';
    if ($_COOKIE['libImportMethod'] != 'await-import') {
      $this->data[] = '    <script>document.write("<button onclick=\"document.cookie=\'libImportMethod=await-import;max-age=31536000;path=/\';location.reload();\">Enable \'await import\'</button>");</script>';
    }
    if ($_COOKIE['libImportMethod'] != 'import-from') {
      $this->data[] = '    <script>document.write("<button onclick=\"document.cookie=\'libImportMethod=import-from;max-age=31536000;path=/\';location.reload();\">Enable \'import from\'</button>");</script>';
    }
  	$this->data[] = '';
    $this->data[] = '    <h2>Platform: <span id="platform"></span></h2>';
    $this->data[] = '    <canvas class="canvas" id="canvas"></canvas>';
    $this->data[] = '    <script> var canvasRunning = false; </script>';
    if ($_COOKIE['libImportMethod'] == 'await-import') {
      $this->data[] = '    <script type="module" src="app/rg-lib/js/config/checkCanvas-ai.js?ver='.$scriptVersion.'"></script>';
    }
    if ($_COOKIE['libImportMethod'] == 'import-from') {
      $this->data[] = '    <script type="module" src="app/rg-lib/js/config/checkCanvas-if.js?ver='.$scriptVersion.'"></script>';
    }
    $this->data[] = '    <script>';
    $this->data[] = '      function checkCanvas() {';
    $this->data[] = '        if (window.canvasRunning == false) {';
    $this->data[] = '          var elementObj = document.getElementById("canvas");';
    $this->data[] = '          var ctx = elementObj.getContext("2d");';
    $this->data[] = '          elementObj.width = 300;';
    $this->data[] = '          elementObj.height = 200;';
    $this->data[] = '          ctx.fillStyle = "#f80b0b";';
    $this->data[] = '          ctx.fillRect(0, elementObj.height-43, elementObj.width, 43);';
    $this->data[] = '          ctx.font = "16px Helvetica";';
    $this->data[] = '          ctx.fillStyle = "#ffffff";';
    $this->data[] = '          ctx.fillText("ERROR: platform not running", 5, elementObj.height-15);';
    $this->data[] = '        }';
    $this->data[] = '      }';
    $this->data[] = '      setTimeout(checkCanvas, 250);';
    $this->data[] = '    </script>';
    $this->data[] = '';
    $this->data[] = '    <h2>Current time</h2>';
    $this->data[] = '    <span class="time-info">';
    $this->data[] = '    <ul>';
    $this->data[] = '      <li><b>server</b></li>';
    $this->data[] = '        <ul id="server-time">';
    $this->data[] = '          <li>date: '.date("l, M d, Y").'</li>';
    $this->data[] = '          <li>time: '.date("H:i:s").'</li>';
    $this->data[] = '          <li>time zone: '.date_default_timezone_get().'</li>';
    $this->data[] = '        </ul>';
    $this->data[] = '    </ul>';
    $this->data[] = '    </span>';
    $this->data[] = '';
    $this->data[] = '    <script>';
    $this->data[] = '      document.write("<span class=\"time-info\">");';
    $this->data[] = '        document.write("<ul>");';
    $this->data[] = '          document.write("<li><b>device</b></li>");';
    $this->data[] = '            document.write("<ul id=\"device-time\">");';
    $this->data[] = '            document.write("</ul>");';
    $this->data[] = '          document.write("</li>");';
    $this->data[] = '        document.write("</ul>");';
    $this->data[] = '      document.write("</span>");';
    $this->data[] = '';
    $this->data[] = '      function refreshTime() {';
    $this->data[] = '        var xhttp = new XMLHttpRequest();';
    $this->data[] = '        xhttp.onreadystatechange = function() {';
    $this->data[] = '          if (this.readyState == 4 && this.status == 200) {';
    $this->data[] = '            document.getElementById("server-time").innerHTML = xhttp.responseText;';
    $this->data[] = '          }';
    $this->data[] = '          if (this.readyState == 4 && this.status == 0) {';
    $this->data[] = '            document.getElementById("server-time").innerHTML = "<li><b><span class=\"error\">ERROR: server down</span></b></li>";';
    $this->data[] = '          }';
    $this->data[] = '          if (this.readyState == 4 && this.status != 0 && this.status != 200) {';
    $this->data[] = '            document.getElementById("server-time").innerHTML = "<li><b><span class=\"error\">ERROR: "+this.status+"</span></b></li>";';
    $this->data[] = '          }';
    $this->data[] = '        };';
    $this->data[] = '        xhttp.open("GET", "app/rg-lib/php/serverTime.php", true);';
    $this->data[] = '        xhttp.send();';
    $this->data[] = '        var newTimeStr = "<li>date: "+new Date().toLocaleDateString("en-US", {weekday: "long", month: "short", day: "numeric", year: "numeric"})+"</li>";';
    $this->data[] = '        newTimeStr += "<li>time: "+new Date().toLocaleTimeString("en-US", {hour12: false, hour: "numeric", minute: "numeric", second: "numeric"})+"</li>";';
    $this->data[] = '        newTimeStr += "<li>time zone: "+Intl.DateTimeFormat().resolvedOptions().timeZone+"</li>";';
    $this->data[] = '        var elementDeviceTime = document.getElementById("device-time");';
    $this->data[] = '        elementDeviceTime.innerHTML = newTimeStr';
    $this->data[] = '        setTimeout(refreshTime, 250);';
    $this->data[] = '      } // refreshTime';
    $this->data[] = '';
    $this->data[] = '      refreshTime();';
    $this->data[] = '    </script>';

    $this->data[] = '    <div class="clear"></div>';

    $this->data[] = '    <h2>Cookies</h2>';
    $this->data[] = '    <span class="cookies">';
    $this->data[] = '    <script>';
    $this->data[] = '      var allCookies = [];';
    $this->data[] = '      var cookies = document.cookie;';
    $this->data[] = '      if (cookies.length > 0) {';
    $this->data[] = '        var arrayCookies = cookies.split(";");';
    $this->data[] = '        arrayCookies.map(function(originalValue) {';
    $this->data[] = '          var key = originalValue.split("=")[0];';
    $this->data[] = '          while (key.length > 0 && key[0] == " ") key = key.substring(1, key.length);';
    $this->data[] = '          var value = originalValue.split("=")[1];';
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
