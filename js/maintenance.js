// Standalone service / maintenance screen.
// Rendered by AppPage when no production bundle is available (see php/appPage.php).
// Shared across all projects: served via the app/svision symlink as
// app/svision/js/maintenance.js, so each project keeps a single source here.
// Deliberately self-contained — no imports — so it works even when nothing else
// is built and on browsers without dynamic import() (e.g. older smart TVs).

(function () {
  var appName = window.appName || document.title || 'Application';

  var style = document.createElement('style');
  style.textContent =
    '#maintenance{position:fixed;top:0;left:0;width:100%;height:100%;' +
    'background:#000;color:#b8b8b8;font-family:"Courier New",monospace;' +
    'overflow:hidden;-webkit-user-select:none;user-select:none;}' +
    '#maintenance .box{position:absolute;top:50%;left:50%;width:90%;text-align:center;' +
    '-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);}' +
    '#maintenance img{width:128px;height:128px;' +
    'image-rendering:pixelated;image-rendering:crisp-edges;}' +
    '#maintenance h1{margin:24px 0 12px;font-size:2.4em;letter-spacing:.15em;color:#ffe15a;}' +
    '#maintenance p{margin:0;font-size:1.2em;line-height:1.6;' +
    '-webkit-animation:maintenance-fade 2s ease-in-out infinite;' +
    'animation:maintenance-fade 2s ease-in-out infinite;}' +
    '@-webkit-keyframes maintenance-fade{0%,100%{opacity:.55}50%{opacity:1}}' +
    '@keyframes maintenance-fade{0%,100%{opacity:.55}50%{opacity:1}}';
  document.head.appendChild(style);

  var icon = document.createElement('img');
  icon.src = 'images/app-icon-256x256.png';
  icon.alt = '';
  // Drop the icon if the project has no app icon, so only the text shows.
  icon.onerror = function () {
    if (icon.parentNode) {
      icon.parentNode.removeChild(icon);
    }
  };

  var title = document.createElement('h1');
  title.textContent = appName;

  var message = document.createElement('p');
  message.textContent = "Under maintenance — we'll be back shortly.";

  var box = document.createElement('div');
  box.className = 'box';
  box.appendChild(icon);
  box.appendChild(title);
  box.appendChild(message);

  var root = document.createElement('div');
  root.id = 'maintenance';
  root.appendChild(box);
  document.body.appendChild(root);

  // Retry every 15 s: once the bundle is built, the reloaded page serves it.
  setTimeout(function () {
    window.location.reload();
  }, 15000);
})();
