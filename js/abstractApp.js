/**/
const { InputEventsManager } = await import('./inputEventsManager.js?ver='+window.srcVersion);
const { RichString } = await import('./richString.js?ver='+window.srcVersion);
/*/
import InputEventsManager from './inputEventsManager.js';
import RichString from './richString.js';
/**/
// begin code

/**
 * Base class for an application. Owns the platform, layout, input handling,
 * the active model and the data/storage plumbing, and drives the per-frame
 * loop and resize lifecycle.
 */
export class AbstractApp {

  /**
   * Creates the application, wiring up the platform, canvas element, layout
   * and input manager, and initializing the control/state defaults.
   * @param {AbstractPlatform} platform - The platform implementation used to create the canvas, layout and entities.
   * @param {HTMLElement|string} parentElement - The parent element (or its id) that hosts the canvas.
   * @param {string} importPath - Base path used when dynamically importing application modules.
   * @param {string} wsURL - WebSocket URL associated with the application.
   */
  constructor(platform, parentElement, importPath, wsURL) {
    this.parentElement = false;
    this.element = false;
    this.prevSize = {width: 0, height: 0};
    this.resizeRequested = false;   // set by the window resize event; consumed once per frame in loopApp
    this.importPath = importPath;
    this.now = 0;
    this.language = false;          // selected language (ISO 639-1); false => not chosen yet
    this.fallbackLanguage = 'en';   // used when a string is missing in `language`
    this.texts = {};                // full dictionary {lang: {...}}, set by the subclass via setTexts()
    this.inputEventsManager = new InputEventsManager(this);
    this.audioManager = false;
    this.model = false;
    this.stack = {};
    this.platform = platform;
    this.platform.initCanvasElement(this, parentElement);

    this.layout = platform.newLayout(this);
    this.wsURL = wsURL;
    this.webSocket = false;

    this.controls = {
      keyboard: {
      },
      mouse: {
        enable: false
      },
      gamepad: {
        supported: false
      },
      touchscreen: {
        supported: false
      }
    }
  } // constructor

  /**
   * Per-frame application loop. Triggers a resize when the element size has
   * changed, stores the current timestamp and advances the active model.
   * @param {number} timestamp - The current frame timestamp.
   */
  loopApp(timestamp) {
    this.now = timestamp;
    // Coalesce resizing to at most one resizeApp() per frame: a burst of window
    // 'resize' events (or a size change) collapses into a single resize here, and
    // the frame after the burst ends runs the final one. This avoids piling up
    // heavy resizeModel() calls that would keep the app busy after a drag-resize.
    if (this.resizeRequested || this.prevSize.width != this.element.clientWidth || this.prevSize.height != this.element.clientHeight) {
      this.resizeRequested = false;
      this.resizeApp();
    }
    if (this.model) {
      this.model.loopModel(timestamp);
    }
  } // loopApp
  
  /**
   * Handles a change in the application/viewport size by updating the
   * --app-height CSS variable, resizing the model and caching the new size.
   */
  resizeApp() {
    if (window.innerHeight != this.element.height) {
      document.documentElement.style.setProperty('--app-height', window.innerHeight+'px');
    }
    if (this.model) {
      this.model.resizeModel();
    }
    this.prevSize = {width: this.element.clientWidth, height: this.element.clientHeight};
  } // resizeApp
  
  /**
   * Window resize event handler that delegates to resizeApp.
   * @param {Event} event - The window resize event.
   */
  eventResizeWindow(event) {
    // Only request a resize; loopApp performs it (at most once per frame). Doing
    // resizeApp() directly here fires many times per frame during a drag and piles
    // up heavy resizeModel() calls that keep the app busy after the drag ends.
    this.resizeRequested = true;
  } // eventResizeWindow

  /**
   * Fetches data from a URL, optionally serving it from localStorage first
   * depending on the storage policy and the current online/offline status,
   * otherwise POSTing and resolving the result back to the receiver.
   * @param {string} url - The endpoint to fetch data from.
   * @param {Object|false} storage - Storage policy with `key` and `when` properties, or false to skip storage.
   * @param {*} data - The payload to send in the request body.
   * @param {Object} receiver - Object that receives results via setData/errorData and carries an id/fetchDataId.
   * @returns {string|undefined} The generated fetchDataId, or undefined when served from storage or skipped while offline.
   */
  fetchData(url, storage, data, receiver) {
    var connectionStatus = 'offline';
    if (navigator.onLine) {
      connectionStatus = 'online';
    }

    if (storage !== false) {
      if ('key' in storage) {
        if ('when' in storage) {
          if (storage.when == 'required' || storage.when == connectionStatus) {
            if (localStorage.getItem(window.appPrefix+'.'+storage.key) !== null) {
              try {
                var dataJSON = localStorage.getItem(window.appPrefix+'.'+storage.key);
                var data = {url: url, source: 'storage', data: JSON.parse(dataJSON)};
                receiver.setData(data);
                return;
              } catch (error) {
                receiver.errorData(error);
              }
            }
          }
        } else {
          console.error('the storage object for key:\''+storage.key+'\' does not have a parameter \'when\'');
        }
      } else {
        console.error('the storage object for url:\''+url+'\' does not have a parameter \'key\'');
      }
    } else {
      if (connectionStatus == 'offline') {
        return;
      }
    }

    var fetchDataId = receiver.id+Date.now().toString();
    var options = {
      method: 'POST',
      url: url,
      body: JSON.stringify(data),
      dataType: 'json',
      headers: {fetchDataId: fetchDataId},
      // today's default, but spelled out for pre-2018 engines (TVs): the old
      // fetch spec defaulted to 'omit', which silently drops the session
      // cookie from both the request and the response
      credentials: 'same-origin',
    }
    fetch(url, options)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error (response.status);
      })
      .then((data) => {
        if ('error' in data) {
          receiver.errorData(data.error);
        } else {
          if (receiver.fetchDataId == data.fetchDataId) {
            receiver.setData({...{url: url}, ...data});
          }
        }
      })
      .catch((error) => receiver.errorData(error));
      
    return fetchDataId;
  } // fetchData

  /**
   * Forces an application upgrade: unregisters every service worker and deletes
   * all caches, then reloads the page so every asset is fetched fresh as the
   * new version.
   */
  upgradeApp() {
    var cleanups = [];
    if ('serviceWorker' in navigator) {
      cleanups.push(navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((reg) => reg.unregister()))));
    }
    if ('caches' in window) {
      cleanups.push(caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))));
    }
    // reload on both outcomes, so a failed cleanup never leaves the app stuck
    Promise.all(cleanups).then(() => window.location.reload(), () => window.location.reload());
  } // upgradeApp

  /**
   * Saves data to localStorage under the application-prefixed key.
   * @param {string} key - The storage key (prefixed with the app prefix).
   * @param {*} data - The value to serialize and store.
   */
  saveDataToStorage(key, data) {
    localStorage.setItem(window.appPrefix+'.'+key, JSON.stringify(data));
  } // saveDataToStorage

  /**
   * Installs the localization dictionary used by text().
   * @param {Object} texts - Dictionary keyed by language code, each holding the
   *   (optionally nested) strings for that language, e.g. {en: {...}, cs: {...}}.
   */
  setTexts(texts) {
    this.texts = texts;
  } // setTexts

  /**
   * Resolves a localized string for the current language. The key is a dotted
   * path into the dictionary ('mainMenu.startGame'); missing strings fall back
   * to `fallbackLanguage`, then to a visible '⟨key⟩' marker so gaps are obvious.
   * Optional {placeholder} tokens are substituted from `params`.
   * @param {string} key - Dotted path into the language dictionary.
   * @param {Object} [params] - Values substituted into {name} placeholders.
   * @returns {RichString} The localized string (chainable, e.g. .wrap()).
   */
  text(key, params) {
    var str = this._resolveText(this.texts[this.language], key);
    if (str === undefined && this.language !== this.fallbackLanguage) {
      str = this._resolveText(this.texts[this.fallbackLanguage], key);
    }
    if (str === undefined) {
      return new RichString('⟨'+key+'⟩');
    }
    if (params) {
      // function replacer so a '$' in the substituted value is not treated as a
      // special replacement pattern ($&, $1, ...).
      str = str.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match));
    }
    return new RichString(str);
  } // text

  /**
   * Walks a dotted-path key into a dictionary, returning undefined if any
   * segment is missing.
   * @param {Object|undefined} dict - The language dictionary to walk.
   * @param {string} key - Dotted path, e.g. 'mainMenu.startGame'.
   * @returns {string|undefined} The found string, or undefined.
   */
  _resolveText(dict, key) {
    if (!dict) {
      return undefined;
    }
    return key.split('.').reduce((node, segment) => (node == null ? undefined : node[segment]), dict);
  } // _resolveText

  /**
   * Reports an error message to the user. The base implementation logs it to
   * the console.
   * @param {string} message - The error message to display.
   * @param {string} action - The suggested follow-up action (e.g. 'restart').
   */
  showErrorMessage(message, action) {
    console.error('ERROR: '+message);
  } // showErrorMessage

} // AbstractApp

export default AbstractApp;
