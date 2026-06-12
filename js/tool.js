/**/

/*/

/**/
// begin code

/**
 * Static utility class providing numeric-base conversions (hex, binary, latin
 * base-36, base-90, braille), boolean/length encodings, cyclic counters,
 * key-name prettifying, dynamic script execution, and cookie helpers used
 * throughout the svision library.
 */
export class Tool {

  /**
   * Parses a hexadecimal string into an integer.
   * @param {string} hexNum - Hexadecimal digits to parse.
   * @returns {number} The decoded integer value.
   */
  static hexToInt(hexNum) {
    return parseInt(hexNum, 16);
  } // hexToInt

  /**
   * Converts an integer to an uppercase hexadecimal string, left-padded with
   * zeros to the requested length.
   * @param {number} intNum - The integer to convert.
   * @param {number} len - Minimum number of hex digits in the result.
   * @returns {string} The zero-padded uppercase hexadecimal representation.
   */
  static intToHex(intNum, len) {
    return intNum.toString(16).padStart(len, '0').toUpperCase();
  } // intToHex

  /**
   * Converts a hexadecimal string into its binary string representation,
   * zero-padded to four bits per hex digit.
   * @param {string} hexNum - Hexadecimal digits to convert.
   * @returns {string} The binary representation as a string of 0s and 1s.
   */
  static hexToBin(hexNum) {
    return this.hexToInt(hexNum).toString(2).padStart(hexNum.length*4, '0');
  } // hexToBin

  /**
   * Parses a binary string into an integer.
   * @param {string} binNum - Binary digits to parse.
   * @returns {number} The decoded integer value.
   */
  static binToInt(binNum) {
    return parseInt(binNum, 2);
  } // hexToBin
  
  /**
   * Parses a base-36 ("latin") string into an integer.
   * @param {string} latinNum - Base-36 digits to parse.
   * @returns {number} The decoded integer value.
   */
  static latinToInt(latinNum) {
    return parseInt(latinNum, 36);
  } // latinToInt

  /**
   * Converts an integer to an uppercase base-36 ("latin") string, left-padded
   * with zeros to the requested length.
   * @param {number} intNum - The integer to convert.
   * @param {number} len - Minimum number of digits in the result.
   * @returns {string} The zero-padded uppercase base-36 representation.
   */
  static intToLatin(intNum, len) {
    return intNum.toString(36).padStart(len, '0').toUpperCase();
  } // intToLatin

  /**
   * Decodes a base-90 string (using base90Alphabet) into an integer.
   * @param {string} base90Num - The base-90 encoded string.
   * @returns {number} The decoded integer value.
   */
  static base90ToInt(base90Num) {
    var res = 0;
    for (var i = 0; i < base90Num.length; i++) {
      res = res*90+this.base90Alphabet.indexOf(base90Num[i]);
    }
    return res;
  } // base90ToInt

  /**
   * Encodes an integer as a base-90 string (using base90Alphabet) of the
   * given fixed length.
   * @param {number} intNum - The integer to encode.
   * @param {number} len - Number of base-90 characters to produce.
   * @returns {string} The base-90 encoded string.
   */
  static intToBase90(intNum, len) {
    var res = '';
    while (len > 0) {
      res = this.base90Alphabet[intNum%90]+res;
      intNum = Math.floor(intNum/90);
      len--;
    }
    return res;
  } // intToBase90

  /**
   * Decodes a string of braille code points (base 0x2801) into an integer,
   * treating each character as a base-255 digit.
   * @param {string} brailleNum - The braille-encoded string.
   * @returns {number} The decoded integer value.
   */
  static brailleToInt(brailleNum) {
    var res = 0;
    for (var i = 0; i < brailleNum.length; i++) {
      res = res*255+(brailleNum.codePointAt(i)-0x2801);
    }
    return res;
  } // brailleToInt

  /**
   * Encodes an integer as a fixed-length string of braille code points
   * (base 0x2801), treating each character as a base-255 digit.
   * @param {number} intNum - The integer to encode.
   * @param {number} len - Number of braille characters to produce.
   * @returns {string} The braille-encoded string.
   */
  static intToBraille(intNum, len) {
    var res = '';
    while (len > 0) {
      res = String.fromCodePoint(0x2801+(intNum%255))+res;
      intNum = Math.floor(intNum/255);
      len--;
    }
    return res;
  } // intToBraille

  /**
   * Decodes a braille-encoded boolean: the value 2 means true, anything else
   * means false.
   * @param {string} brailleBool - The braille-encoded boolean character.
   * @returns {boolean} The decoded boolean value.
   */
  static brailleToBool(brailleBool) {
    var num = this.brailleToInt(brailleBool);
    if (num == 2) {
      return true;
    }
    return false;
  } // brailleToBool

  /**
   * Encodes a boolean as a single braille character (true -> 2, false -> 0).
   * @param {boolean} bool - The boolean value to encode.
   * @returns {string} The single-character braille encoding.
   */
  static boolToBraille(bool) {
    return this.intToBraille({false: 0, true: 2}[bool], 1);
  } // boolToBraille

  /**
   * Reads a braille-encoded length prefix from the start of a string; the
   * sentinel value 254 indicates an absent object and yields false.
   * @param {string} brailleNum - String whose leading characters hold the length.
   * @param {number} len - Number of leading braille characters to decode.
   * @returns {number|false} The decoded length, or false for the 254 sentinel.
   */
  static brailleToObjLen(brailleNum, len) {
    var cnt = this.brailleToInt(brailleNum.substr(0, len));
    if (cnt === 254) {
      return false;
    }
    return cnt;
  } // brailleToObjLen

  /**
   * Encodes the length of an array-like object as a braille length prefix,
   * using the sentinel value 254 when the object is false (absent).
   * @param {Array|false} obj - The object whose length is encoded, or false.
   * @param {number} len - Number of braille characters to produce.
   * @returns {string} The braille-encoded length prefix.
   */
  static objLenToBraille(obj, len) {
    var cnt = 254;
    if (obj !== false) {
      cnt = obj.length;
    }
    return this.intToBraille(cnt, len);
  } // objLenToBraille

  /**
   * Encodes the code-point length of a string as a braille length prefix,
   * using the sentinel value 254 when the string is false (absent).
   * @param {string|false} str - The string whose length is encoded, or false.
   * @param {number} len - Number of braille characters to produce.
   * @returns {string} The braille-encoded length prefix.
   */
  static strLenToBraille(str, len) {
    var cnt = 254;
    if (str !== false) {
      cnt = Array.from(str).length;
    }
    return this.intToBraille(cnt, len);
  } // strLenToBraille

  /**
   * Increments a value by one, wrapping back to min once it exceeds max.
   * @param {number} value - The current value.
   * @param {number} min - The lower bound to wrap to.
   * @param {number} max - The upper bound after which wrapping occurs.
   * @returns {number} The incremented (and possibly wrapped) value.
   */
  static cycleInc(value, min, max) {
    var result = value+1;
    if (result > max) {
      result = min;
    }
    return result;
  } // cycleInc

  /**
   * Decrements a value by one, wrapping back to max once it drops below min.
   * @param {number} value - The current value.
   * @param {number} min - The lower bound below which wrapping occurs.
   * @param {number} max - The upper bound to wrap to.
   * @returns {number} The decremented (and possibly wrapped) value.
   */
  static cycleDec(value, min, max) {
    var result = value-1;
    if (result < min) {
      result = max;
    }
    return result;
  } // cycleDec

  /**
   * Converts an internal key name into a short, human-readable label
   * (e.g. mouse buttons to 'M...', arrow keys to arrow glyphs, special keys to
   * abbreviations), otherwise uppercasing the key.
   * @param {string} key - The internal key identifier.
   * @returns {string} The display-friendly key label.
   */
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
  
  /**
   * Executes a script string as a function body, bound to the given object as
   * `this` and receiving data as its single argument (named `arg1`).
   * @param {Object} obj - The object used as `this` during execution.
   * @param {string} script - The function-body source to execute.
   * @param {*} data - The value passed to the script as `arg1`.
   */
  static script(obj, script, data) {
    new Function('arg1', script).call(obj, data);
  } // script

  /**
   * Writes a cookie with a one-year max-age and a root path.
   * @param {string} name - The cookie name.
   * @param {string} value - The cookie value.
   */
  static writeCookie(name, value) {
    document.cookie = name+'='+value+';max-age=31536000;path=/';
  } // writeCookie

  /**
   * Deletes a cookie by setting an expiry date in the past, both for the root
   * path and the default path.
   * @param {string} name - The cookie name to delete.
   */
  static deleteCookie(name) {
    document.cookie = name+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    document.cookie = name+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC';
  } // deleteCookie

  /**
   * Reads the value of a cookie by name, trimming leading spaces from keys and
   * values, and returns a default when the cookie is not present.
   * @param {string} name - The cookie name to look up.
   * @param {*} defaultValue - Value returned when the cookie is not found.
   * @returns {string|*} The cookie value, or defaultValue if absent.
   */
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

Tool.base90Alphabet = '!#$%&()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~';

export default Tool;
