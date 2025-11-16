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
              } catch (error) {
                receiver.errorData(error);
              } finally {
                var data = {source: 'storage', data: JSON.parse(dataJSON)};
                receiver.setData(data);
                return;
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
            receiver.setData(data);
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

  // tools

  hexToInt(hexNum) {
    return parseInt(hexNum, 16);
  } // hexToInt

  intToHex(intNum, length) {
    return intNum.toString(16).padStart(length, '0').toUpperCase();
  } // intToHex

  hexToBin(hexNum) {
    return this.hexToInt(hexNum).toString(2).padStart(hexNum.length*4, '0');
  } // hexToBin

  binToInt(binNum) {
    return parseInt(binNum, 2);
  } // hexToBin

  rotateInc(value, min, max) {
    var result = value+1;
    if (result > max) {
      result = min;
    }
    return result;
  } // rotateInc

  rotateDec(value, min, max) {
    var result = value-1;
    if (result < min) {
      result = max;
    }
    return result;
  } // rotateDec

  setCookie(name, value) {
    document.cookie = name+'='+value+';max-age=31536000;path=/';
  } // setCookie

  getCookie(name, defaultValue) {
    var regex = new RegExp('(^| )'+name+'=([^;]+)');
    var match = document.cookie.match(regex);
    if (match) {
      return match[2];
    }
    return defaultValue;
  } // getCookie

} // AbstractApp

export default AbstractApp;
