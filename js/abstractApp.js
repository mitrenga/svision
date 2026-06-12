/**/
const { InputEventsManager } = await import('./inputEventsManager.js?ver='+window.srcVersion);
/*/
import InputEventsManager from './inputEventsManager.js';
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
    this.importPath = importPath;
    this.now = 0;
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
    if (this.prevSize.width != this.element.clientWidth || this.prevSize.height != this.element.clientHeight) {
      this.resizeApp();
    }
    this.now = timestamp;
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
    this.resizeApp();
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
            if (localStorage.key(window.appPrefix+'.'+storage.key)) {
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
   * Saves data to localStorage under the application-prefixed key.
   * @param {string} key - The storage key (prefixed with the app prefix).
   * @param {*} data - The value to serialize and store.
   */
  saveDataToStorage(key, data) {
    localStorage.setItem(window.appPrefix+'.'+key, JSON.stringify(data));
  } // saveDataToStorage

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
