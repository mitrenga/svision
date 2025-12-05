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
                var data = {source: 'storage', data: JSON.parse(dataJSON)};
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

  prettyKey(key) {
    if (key.substring(0, 5) == 'Mouse') {
      return 'M'+key.substring(5);
    }

    switch (key) {
      case ' ':
        return 'SPACE';
      case 'ArrowLeft':
        return '←';
      case 'ArrowRight':
        return '➔';
      case 'ArrowUp':
        return '↑';
      case 'ArrowDown':
        return '↓';
      case 'Backspace':
        return 'BACK';
      case 'Delete':
        return 'DEL';
      case 'Clear':
        return 'CLR';
      case 'Control':
        return 'CTRL';
      case 'NoKey':
        return 'OFF';
    }
    return key.toUpperCase();
  } // prettyKey

  writeCookie(name, value) {
    document.cookie = name+'='+value+';max-age=31536000;path=/';
  } // writeCookie

  deleteCookie(name) {
    document.cookie = name+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    document.cookie = name+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC';
  } // deleteCookie

  readCookie(name, defaultValue) {
    var allCookies = {};
    if (document.cookie.length > 0) {
      var arrayCookies = document.cookie.split(";");
      arrayCookies.forEach((cookieString) => {
        var key = cookieString.split("=")[0];
        while (key.length > 0 && key[0] == " ") {
          key = key.substring(1, key.length);
        }
        var value = cookieString.split("=")[1];
        while (value.length > 0 && value[0] == " ") {
          value = value.substring(1, value.length);
        }
        allCookies[key] = value;
      });
    }
    if (name in allCookies) {
      return allCookies[name];
    }
    return defaultValue;
  } // readCookie

} // AbstractApp

export default AbstractApp;
