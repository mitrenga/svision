const { Tool } = await import('./tool.js?ver='+window.srcVersion);
// begin code

/**
 * Starts an application in the browser (R-002): hooks every window event up
 * to the app's InputEventsManager, runs the requestAnimationFrame loop,
 * detects gamepads and touchscreens, blocks the Safari gesture events, guards
 * against accidental back navigation and registers the service worker. Every
 * project's main.js is reduced to constructing its app and calling this.
 *
 * @param {AbstractApp} app - The constructed application.
 * @param {Object} [options]
 * @param {Object<string, function(Event)>} [options.listeners] - Replacements
 *   for the default window listeners, keyed by event type ('keydown',
 *   'mousemove', 'contextmenu', ...). A game that needs preventDefault() on its
 *   own keys or pointer-lock mouse movement supplies its own handler here and
 *   calls the InputEventsManager itself.
 * @param {string|function(): string} [options.leaveConfirm] - The question
 *   asked before leaving the page by the back action; a function is resolved
 *   at the time of asking (localized apps load their texts later).
 */
export function bootstrapApp(app, options = {}) {
  const custom = options.listeners || {};
  const manager = app.inputEventsManager;
  const defaults = {
    keydown: (event) => manager.eventKeyDown(event),
    keyup: (event) => manager.eventKeyUp(event),
    click: (event) => manager.eventClick(event),
    contextmenu: (event) => manager.eventContextMenu(event),
    mousedown: (event) => manager.eventMouseDown(event),
    mouseup: (event) => manager.eventMouseUp(event),
    mousemove: (event) => manager.eventMouseMove(event),
    wheel: (event) => manager.eventWheel(event),
    touchstart: (event) => manager.eventTouchStart(event),
    touchend: (event) => manager.eventTouchEnd(event),
    touchcancel: (event) => manager.eventTouchEnd(event),
    touchmove: (event) => manager.eventTouchMove(event),
    blur: (event) => manager.eventBlurWindow(event),
    focus: (event) => manager.eventFocusWindow(event),
    resize: (event) => app.eventResizeWindow(event),
  };
  // touch listeners must be non-passive: Chrome and Safari treat touchstart/touchmove
  // listeners on window as passive by default, which silently disables the
  // preventDefault() in InputEventsManager and lets the browser run its own
  // gestures (edge swipe back, pull-to-refresh, pinch zoom) on top of the game
  const nonPassive = {passive: false};
  for (const type in defaults) {
    const handler = custom[type] || defaults[type];
    window.addEventListener(type, handler, type.startsWith('touch') ? nonPassive : undefined);
  }

  if (navigator.getGamepads) {
    app.controls.gamepads.supported = true;
  }
  if (window.matchMedia('(pointer: coarse)').matches) {
    app.controls.touchscreen.supported = true;
  }

  // disable gesture on Safari mobile
  document.addEventListener('gesturestart', (event) => event.preventDefault());
  document.addEventListener('gestureend', (event) => event.preventDefault());
  document.addEventListener('gesturechange', (event) => event.preventDefault());

  installBackGuard(app, options.leaveConfirm);

  // animation loop
  const loopApp = (timestamp) => {
    app.loopApp(timestamp);
    requestAnimationFrame(loopApp);
  };
  app.eventResizeWindow(null);
  requestAnimationFrame(loopApp);

  registerServiceWorker();
} // bootstrapApp

/**
 * Prevents accidental back navigation (mouse back button, touchpad swipe,
 * Backspace, the system back gesture): a sentinel history entry swallows the
 * back action; leaving is confirmed by a dialog. The sentinel is pushed on the
 * first user interaction, not at load: Firefox and Chrome skip history entries
 * created without user activation (back-trapping protection), so a sentinel
 * pushed at load would be bypassed by the back button. The current model gets
 * the back action first as a 'browserBack' event (in-app back navigation,
 * e.g. a menu BACK button); only an unhandled back asks about leaving.
 * @param {AbstractApp} app
 * @param {string|function(): string} [leaveConfirm]
 */
function installBackGuard(app, leaveConfirm) {
  const question = () => {
    if (typeof leaveConfirm === 'function') {
      return leaveConfirm();
    }
    return leaveConfirm || 'Do you really want to leave the game?';
  };
  const pushSentinel = () => history.pushState({backGuard: 'sentinel'}, '', location.href);
  history.replaceState({backGuard: 'base'}, '', location.href);
  const armBackGuard = () => {
    if (!history.state || history.state.backGuard !== 'sentinel') {
      pushSentinel();
    }
  };
  window.addEventListener('pointerdown', armBackGuard);
  window.addEventListener('keydown', armBackGuard);
  window.addEventListener('touchstart', armBackGuard);
  let leavingApp = false;
  // restored from bfcache (browser forward back into the game): module state survived,
  // so reset the leave flag; the next interaction re-arms the sentinel via armBackGuard
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      leavingApp = false;
    }
  });
  window.addEventListener('popstate', (event) => {
    if (leavingApp) {
      history.back(); // keep walking back until we leave the document
      return;
    }
    if (event.state && event.state.backGuard === 'sentinel') {
      return; // initial popstate fired by some engines on page load
    }
    if (app.model && app.model.handleEvent({id: 'browserBack'}) === true) {
      pushSentinel();
      return;
    }
    if (window.confirm(question())) {
      leavingApp = true;
      history.back();
    } else {
      pushSentinel();
    }
  });
} // installBackGuard

/**
 * Registers the service worker when enabled: in production (devMode === false)
 * or in dev mode carrying the serviceWorker flag (devMode = {serviceWorker:
 * true}); plain dev mode (devMode === true) and the disableServiceWorker cookie
 * (toggled from the /config page) unregister and bypass the SW.
 * Intentionally no auto-reload on controllerchange: on flaky old engines it
 * re-fires on every load, which caused an infinite reload loop. The updated SW
 * installs in the background and waits; the new version takes effect via the
 * in-app upgrade (menu UPGRADE button) or on the next launch after all tabs are
 * closed.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  const dm = window.devMode;
  const swDisabled = Tool.readCookie('disableServiceWorker', false) === 'true';
  const swEnabled = !swDisabled && (!dm || (typeof dm === 'object' && dm.serviceWorker));
  if (swEnabled) {
    navigator.serviceWorker.register('serviceWorker', {type: 'module'}).catch((error) => console.error('service worker registration failed:', error));
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
  }
} // registerServiceWorker

export default bootstrapApp;
