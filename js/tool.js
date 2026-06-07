/**/

/*/

/**/
// begin code

export class Tool {

  static hexToInt(hexNum) {
    return parseInt(hexNum, 16);
  } // hexToInt

  static intToHex(intNum, len) {
    return intNum.toString(16).padStart(len, '0').toUpperCase();
  } // intToHex

  static hexToBin(hexNum) {
    return this.hexToInt(hexNum).toString(2).padStart(hexNum.length*4, '0');
  } // hexToBin

  static binToInt(binNum) {
    return parseInt(binNum, 2);
  } // hexToBin
  
  static latinToInt(latinNum) {
    return parseInt(latinNum, 36);
  } // latinToInt

  static intToLatin(intNum, len) {
    return intNum.toString(36).padStart(len, '0').toUpperCase();
  } // intToLatin

  static brailleToInt(brailleNum) {
    var res = 0;
    for (var i = 0; i < brailleNum.length; i++) {
      res = res*255+(brailleNum.codePointAt(i)-0x2801);
    }
    return res;
  } // brailleToInt

  static intToBraille(intNum, len) {
    var res = '';
    while (len > 0) {
      res = String.fromCodePoint(0x2801+(intNum%255))+res;
      intNum = Math.floor(intNum/255);
      len--;
    }
    return res;
  } // intToBraille

  static brailleToBool(brailleBool) {
    var num = this.brailleToInt(brailleBool);
    if (num == 2) {
      return true;
    }
    return false;
  } // brailleToBool

  static boolToBraille(bool) {
    return this.intToBraille({false: 0, true: 2}[bool], 1);
  } // boolToBraille

  static brailleToObjLen(brailleNum, len) {
    var cnt = this.brailleToInt(brailleNum.substr(0, len));
    if (cnt === 254) {
      return false;
    }
    return cnt;
  } // brailleToObjLen

  static objLenToBraille(obj, len) {
    var cnt = 254;
    if (obj !== false) {
      cnt = obj.length;
    }
    return this.intToBraille(cnt, len);
  } // objLenToBraille

  static strLenToBraille(str, len) {
    var cnt = 254;
    if (str !== false) {
      cnt = Array.from(str).length;
    }
    return this.intToBraille(cnt, len);
  } // strLenToBraille

  static cycleInc(value, min, max) {
    var result = value+1;
    if (result > max) {
      result = min;
    }
    return result;
  } // cycleInc

  static cycleDec(value, min, max) {
    var result = value-1;
    if (result < min) {
      result = max;
    }
    return result;
  } // cycleDec

  static prettyKey(key) {
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
  
  static script(obj, script, data) {
    new Function('arg1', script).call(obj, data);
  } // script

  static writeCookie(name, value) {
    document.cookie = name+'='+value+';max-age=31536000;path=/';
  } // writeCookie

  static deleteCookie(name) {
    document.cookie = name+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    document.cookie = name+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC';
  } // deleteCookie

  static readCookie(name, defaultValue) {
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

} // Tool

export default Tool;
