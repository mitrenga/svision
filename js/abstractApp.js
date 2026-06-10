/**/
const { InputEventsManager } = await import('./inputEventsManager.js?ver='+window.srcVersion);
/*/
import InputEventsManager from './inputEventsManager.js';
/**/
// begin code

export class AbstractApp {
  
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

  loopApp(timestamp) {
    if (this.prevSize.width != this.element.clientWidth || this.prevSize.height != this.element.clientHeight) {
      this.resizeApp();
    }
    this.now = timestamp;
    if (this.model) {
      this.model.loopModel(timestamp);
    }
  } // loopApp
  
  resizeApp() {
    if (window.innerHeight != this.element.height) {
      document.documentElement.style.setProperty('--app-height', window.innerHeight+'px');
    }
    if (this.model) {
      this.model.resizeModel();
    }
    this.prevSize = {width: this.element.clientWidth, height: this.element.clientHeight};
  } // resizeApp
  
  eventResizeWindow(event) {
    this.resizeApp();
  } // eventResizeWindow

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

  saveDataToStorage(key, data) {
    localStorage.setItem(window.appPrefix+'.'+key, JSON.stringify(data));
  } // saveDataToStorage

  showErrorMessage(message, action) {
    console.error('ERROR: '+message);
  } // showErrorMessage

} // AbstractApp

export default AbstractApp;
