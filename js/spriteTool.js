/**/
const { Tool } = await import('./tool.js?ver='+window.srcVersion);
const { RichString } = await import('./richString.js?ver='+window.srcVersion);
/*/
import Tool from './tool.js';
import RichString from './richString.js';
/**/
// begin code

export class SpriteTool {
  // for monochrome sprites "---####-"
  // hR2 - hex repetition 00..FF
  // lP1 - latin pulses 0..9A..Z
  // lT2 - latin trim 00..99AA..ZZ

  // for colored sprites
  // braille - repeated characters expressed as Braille characters — max repetitions calculated dynamically based on the number of colors

  static encode(spriteData, method) {
    switch (method) {
      case 'hR2': 
        return this.encode_hR2(spriteData);
      case 'lP1':
        return this.encode_lP1(spriteData);
      case 'lT2':
        return this.encode_lT2(spriteData);
      case 'braille':
        return this.encode_Braille(spriteData);
      default:
        return 'ENCODE ERROR: unknown compression method: '+method;
    }
  } // encode

  static decode(data) {
    var method = data.substring(0, 3);
    switch (method) {
      case 'hR2': 
        return this.decode_hR2(data);
      case 'lP1':
        return this.decode_lP1(data);
      case 'lT2':
        return this.decode_lT2(data);
      case '⣿⣿⣿':
        return this.decode_Braille(data);
      default:
        return 'DECODE ERROR: unknown compression method: '+method;
    }
  } // decode

  static encode_hR2(spriteData) {
    var result = 'hR2'+Tool.intToHex(spriteData.width, 4)+Tool.intToHex(spriteData.height, 4);
    var counter = 0;
    var spriteChar = '-';
    for (var y = 0; y < spriteData.height; y++) {
      for (var x = 0; x < spriteData.width; x++) {
        if (spriteData.sprite[0][y][x] != spriteChar) {
          while (counter > 255) {
            result += 'FF00';
            counter -= 255;
          }
          result += Tool.intToHex(counter, 2);
          counter = 1;
          spriteChar = spriteData.sprite[0][y][x];
        } else {
          counter++;
        }
      }
    }
    while (counter > 255) {
      result += 'FF00';
      counter -= 255;
    }
    result += Tool.intToHex(counter, 2);
    return new RichString(result);
  } // encode_hR2

  static decode_hR2(data) {
    var result = {
      width: Tool.hexToInt(data.substring(3, 7)),
      height: Tool.hexToInt(data.substring(7, 11)),
      frames: 1,
      directions: 1,
      sprite: [[]]
    };

    var pointer = 11;
    var maskValue = 0;
    var mask = {0: '-', 1: '#'};
    var counter = Tool.hexToInt(data.substring(pointer, pointer+2));
    pointer += 2;
    var h = 0;
    while (h < result.height) {
      result.sprite[0][h] = '';
      var w = 0;
      while (w < result.width) {
        if (counter) {
          result.sprite[0][h] += mask[maskValue];
          counter--;
          w++;
        }
        while (counter == 0) {
          if (pointer < data.length) {
            counter = Tool.hexToInt(data.substring(pointer, pointer+2));
            maskValue = 1-maskValue;
            pointer += 2;
          } else {
            counter = 1;
          }
        }
      }
      h++;
    }
    return result;
  } // decode_hR2

  static encode_lP1(spriteData) {
    var result = 'lP1'+Tool.intToLatin(spriteData.width, 3)+Tool.intToLatin(spriteData.height, 3);
    var pulses = [];
    var index = {};
    var counter = 0;

    // first phase - create pulses table with index
    var spriteChar = '-';
    for (var y = 0; y < spriteData.height; y++) {
      for (var x = 0; x < spriteData.width; x++) {
        if (spriteData.sprite[0][y][x] != spriteChar) {
          if (!(counter in index)) {
            if (counter > 1296) {
              return new RichString('COMPRESS ERROR: to long pulse! (pulse: '+counter+', max: 1296)');
            }
            pulses.push(counter);
            index[counter] = pulses.length-1;
          }
          counter = 1;
          spriteChar = spriteData.sprite[0][y][x];
        } else {
          counter++;
        }
      }
    }
    if (!(counter in index)) {
      if (counter > 1296) {
        return new RichString('COMPRESS ERROR: to long pulse! (pulse: '+counter+', max: 1296)');
      }
      pulses.push(counter);
      index[counter] = pulses.length-1;
    }
    if (pulses.length > 36) {
      return new RichString('COMPRESS ERROR: to much pulses! (pulses: '+pulses.length+', max: 36)');
    }

    // second phase - output pulses table
    result += Tool.intToLatin(pulses.length, 2);
    pulses.forEach((pulse) => {
      result += Tool.intToLatin(pulse, 2);
    });

    // third phase - output compressed data
    spriteChar = '-';
    counter = 0;
    for (var y = 0; y < spriteData.height; y++) {
      for (var x = 0; x < spriteData.width; x++) {
        if (spriteData.sprite[0][y][x] != spriteChar) {
          result += Tool.intToLatin(index[counter], 1);
          counter = 1;
          spriteChar = spriteData.sprite[0][y][x];
        } else {
          counter++;
        }
      }
    }
    result += Tool.intToLatin(index[counter], 1);
    return new RichString(result);
  } // encode_lP1

  static decode_lP1(data) {
    var result = {
      width: Tool.latinToInt(data.substring(3, 6)),
      height: Tool.latinToInt(data.substring(6, 9)),
      frames: 1,
      directions: 1,
      sprite: [[]]
    };

    var pulses = [];
    var pulsesCount = Tool.latinToInt(data.substring(9, 11));
    var pointer = 11;

    for (var p = 0; p < pulsesCount; p++) {
      var pulse = Tool.latinToInt(data.substring(11+p*2, 11+p*2+2));
      pulses.push(pulse);
      pointer += 2;
    }
    var maskValue = 0;
    var mask = {0: '-', 1: '#'};
    var counter = pulses[Tool.latinToInt(data.substring(pointer, pointer+1))];
    pointer++;
    var h = 0;
    while (h < result.height) {
      result.sprite[0][h] = '';
      var w = 0;
      while (w < result.width) {
        if (counter > 0) {
          result.sprite[0][h] += mask[maskValue];
          counter--;
          w++;
        }
        if (counter == 0) {
          if (pointer < data.length) {
            counter = pulses[Tool.latinToInt(data.substring(pointer, pointer+1))];
            maskValue = 1-maskValue;
            pointer++;
          } else {
            counter = 1;
          }
        }
      }
      h++;
    }
    return result;
  } // decode_lP1

  static encode_lT2(spriteData) {
    var result = 'lT2';
    // find firstRow and lastRow
    var firstRow = -1, lastRow = -1;
    for (var y = 0; y < spriteData.height; y++) {
      if (spriteData.sprite[0][y].indexOf('#') !== -1) {
        if (firstRow === -1) firstRow = y;
        lastRow = y;
      }
    }
    if (firstRow === -1) {
      return new RichString('COMPRESS ERROR: sprite is empty!');
    }
    result += Tool.intToLatin(spriteData.width,  3);
    result += Tool.intToLatin(spriteData.height, 3);
    result += Tool.intToLatin(firstRow, 3);
    // lastRow is not stored — decoder stops when data ends
    var prevEncoded = null;
    for (var y = firstRow; y <= lastRow; y++) {
      var rowData = spriteData.sprite[0][y];
      // Find firstX
      var firstX = rowData.indexOf('#');
      if (firstX === -1) {
        // Empty row
        result += '-';
        prevEncoded = null;
        continue;
      }
      var lastX = rowData.lastIndexOf('#');
      // RLE of trimmed row segment — always starts with '#'
      // x2 is not stored — implied by sum of RLE values
      var trimmed = rowData.substring(firstX, lastX + 1);
      var rleVals = [];
      var counter = 0;
      var spriteChar = '#';
      for (var x = 0; x < trimmed.length; x++) {
        if (trimmed[x] !== spriteChar) {
          rleVals.push(counter);
          counter = 1;
          spriteChar = trimmed[x];
        } else {
          counter++;
        }
      }
      rleVals.push(counter);
      var encoded = Tool.intToLatin(firstX, 2)+Tool.intToLatin(rleVals.length, 2);
      for (var i = 0; i < rleVals.length; i++) {
        encoded += Tool.intToLatin(rleVals[i], 2);
      }
      if (encoded === prevEncoded) {
        result += 'S';
      } else {
        result += encoded;
        prevEncoded = encoded;
      }
    }
    return new RichString(result);
  } // encode_lT2

  static decode_lT2(data) {
    var result = {
      width: Tool.latinToInt(data.substring(3, 6)),
      height: Tool.latinToInt(data.substring(6, 9)),
      frames: 1,
      directions: 1,
      sprite: [[]]
    };

    var firstRow = Tool.latinToInt(data.substring(9, 12));
    var pointer  = 12;

    // Initialize all rows as empty
    for (var y = 0; y < result.height; y++) {
      result.sprite[0][y] = '-'.repeat(result.width);
    }
    var prevX1 = 0, prevRle = [];
    var row = firstRow;
    while (pointer < data.length) {
      var ch = data[pointer];
      if (ch === '-') {
        // Empty row — stays as '-'.repeat(width)
        pointer++;
        prevRle = []; // reset — 'S' cannot follow an empty row
        row++;
        continue;
      }
      var x1, rle;
      if (ch === 'S') {
        // Same row as previous
        x1  = prevX1;
        rle = prevRle;
        pointer++;
      } else {
        x1 = Tool.latinToInt(data.substring(pointer, pointer + 2)); pointer += 2;
        var rleCount = Tool.latinToInt(data.substring(pointer, pointer + 2)); pointer += 2;
        rle = [];
        for (var i = 0; i < rleCount; i++) {
          rle.push(Tool.latinToInt(data.substring(pointer, pointer + 2)));
          pointer += 2;
        }
        prevX1 = x1; prevRle = rle;
      }      
      // Build row string — RLE always starts with '#'
      var rowStr = '-'.repeat(x1);
      var draw = true;
      for (var i = 0; i < rle.length; i++) {
        rowStr += (draw ? '#' : '-').repeat(rle[i]);
        draw = !draw;
      }
      rowStr += '-'.repeat(result.width - rowStr.length);
      result.sprite[0][row] = rowStr;
      row++;
    }
    return result;
  } // decode_lT2

  static scriptedSprite(obj, data) {
    if (data !== false) {
      var sprite = this.decode(data);
      Tool.script(obj, sprite.sprite[0].grid.join(''), sprite);
    }
  } // scriptedSprite

  static encodeBraillePalette(palette) {
    var result = '';
    for (var ch in palette) {
      result += Tool.intToBraille(ch.codePointAt(0), 1);
      result += Tool.strLenToBraille(palette[ch], 1);
      if (palette[ch] !== false) {
        var chars = Array.from(palette[ch]);
        for (var j = 0; j < chars.length; j++) {
          result += Tool.intToBraille(chars[j].codePointAt(0), 1);
        }
      }
    }
    return result;
  } // encodeBraillePalette

  static findBrailleTransparent(palette) {
    if (palette === false) return null;
    for (var ch in palette) {
      if (palette[ch] === false) return ch;
    }
    return null;
  } // findBrailleTransparent

  static encodeBrailleGridBlock(grid, palette, width, height, posLen, cellBytes) {
    var codeChars = Object.keys(palette);
    var codeIndex = {};
    for (var i = 0; i < codeChars.length; i++) codeIndex[codeChars[i]] = i;
    var numCodes = codeChars.length;
    // 1-byte cell: floor(255/numCodes), 2-byte cell: floor(65025/numCodes)
    var maxReps = Math.floor(Math.pow(255, cellBytes) / numCodes);
    var transparent = this.findBrailleTransparent(palette);

    var startY = -1, endY = -1;
    for (var y = 0; y < height; y++) {
      var row = grid[y] || '';
      for (var x = 0; x < row.length; x++) {
        if (row[x] !== transparent) {
          if (startY === -1) startY = y;
          endY = y;
          break;
        }
      }
    }

    if (startY === -1) {
      return Tool.intToBraille(height, posLen)+Tool.intToBraille(height, posLen);
    }

    var result = Tool.intToBraille(startY, posLen)+Tool.intToBraille(endY, posLen);

    for (var y = startY; y <= endY; y++) {
      var row = grid[y] || '';
      var firstX = -1, lastX = -1;
      for (var x = 0; x < row.length; x++) {
        if (row[x] !== transparent) {
          if (firstX === -1) firstX = x;
          lastX = x;
        }
      }
      if (firstX === -1) {
        result += Tool.intToBraille(width, posLen);
        continue;
      }
      result += Tool.intToBraille(firstX, posLen);
      result += Tool.intToBraille(lastX, posLen);

      var x = firstX;
      while (x <= lastX) {
        var ch = row[x];
        var runEnd = x+1;
        while (runEnd <= lastX && row[runEnd] === ch) runEnd++;
        var runLen = runEnd-x;
        var colorIdx = codeIndex[ch] !== undefined ? codeIndex[ch] : 0;
        while (runLen > 0) {
          var part = Math.min(runLen, maxReps);
          result += Tool.intToBraille((part-1)*numCodes+colorIdx, cellBytes);
          runLen -= part;
        }
        x = runEnd;
      }
    }
    return result;
  } // encodeBrailleGridBlock

  static encode_Braille(spriteData) {
    var width = spriteData.width;
    var height = spriteData.height;
    var frames = spriteData.frames;
    var directions = spriteData.directions;
    var sharedPalette = spriteData.colors;
    // Position byte width is derived from the dimensions (positions store a
    // sentinel equal to width/height, and one braille char holds 0..254).
    var posLen = (width > 254 || height > 254) ? 2 : 1;

    // Build the body (palette section + grid blocks) for a given grid-cell
    // byte width. Only the run cells depend on cellBytes; positions use posLen.
    var buildBody = (cellBytes) => {
      var body = Tool.intToBraille(sharedPalette === false ? 254 : Object.keys(sharedPalette).length, 1);
      if (sharedPalette !== false) {
        body += this.encodeBraillePalette(sharedPalette);
      }
      for (var d = 0; d < directions; d++) {
        for (var f = 0; f < frames; f++) {
          var entry = spriteData.sprite[f+d*frames];
          var palette = sharedPalette !== false ? sharedPalette : entry.colors;
          if (sharedPalette === false) {
            body += Tool.intToBraille(Object.keys(palette).length, 1);
            body += this.encodeBraillePalette(palette);
          }
          body += this.encodeBrailleGridBlock(entry.grid, palette, width, height, posLen, cellBytes);
        }
      }
      return body;
    };

    // Variant A: encode the grid both ways, keep the shorter. Tie -> 1-byte.
    var body1 = buildBody(1);
    var body2 = buildBody(2);
    var useDouble = body2.length < body1.length;
    var body = useDouble ? body2 : body1;

    var result = '';
    result += Tool.intToBraille(0xFE, 1);
    result += Tool.intToBraille(0xFE, 1);
    result += Tool.intToBraille(0xFE, 1);
    result += Tool.intToBraille(1, 1);
    result += Tool.intToBraille(useDouble ? 2 : 0, 1);
    result += Tool.intToBraille(width, 2);
    result += Tool.intToBraille(height, 2);
    result += Tool.intToBraille(frames, 1);
    result += Tool.intToBraille(directions, 1);
    result += body;

    return new RichString(result);
  } // encode_Braille

  static decode_Braille(data) {
    var pos = 3;
    function read(len) {
      var s = data.substring(pos, pos+len);
      pos += len;
      return s;
    }
    function readPalette(numCodes) {
      var palette = {};
      var codeChars = [];
      for (var i = 0; i < numCodes; i++) {
        var ch = String.fromCodePoint(Tool.brailleToInt(read(1)));
        var strLen = Tool.brailleToObjLen(read(1), 1);
        if (strLen === false) {
          palette[ch] = false;
        } else {
          var color = '';
          for (var k = 0; k < strLen; k++) {
            color += String.fromCodePoint(Tool.brailleToInt(read(1)));
          }
          palette[ch] = color;
        }
        codeChars.push(ch);
      }
      return {palette: palette, codeChars: codeChars};
    }

    var version = Tool.brailleToInt(read(1));
    var gridDoubleByte = Tool.brailleToBool(read(1));
    var width = Tool.brailleToInt(read(2));
    var height = Tool.brailleToInt(read(2));
    var frames = Tool.brailleToInt(read(1));
    var directions = Tool.brailleToInt(read(1));
    // Position byte width derived from dimensions; the flag controls grid cells.
    var posLen = (width > 254 || height > 254) ? 2 : 1;
    var cellBytes = gridDoubleByte ? 2 : 1;
    var topNumCodes = Tool.brailleToObjLen(read(1), 1);

    var sharedPalette = false;
    var sharedCodeChars = null;
    if (topNumCodes !== false) {
      var pal = readPalette(topNumCodes);
      sharedPalette = pal.palette;
      sharedCodeChars = pal.codeChars;
    }

    var result = {
      width: width,
      height: height,
      frames: frames,
      directions: directions,
      colors: sharedPalette,
      sprite: []
    };

    for (var d = 0; d < directions; d++) {
      for (var f = 0; f < frames; f++) {
        var palette, codeChars;
        if (sharedPalette !== false) {
          palette = sharedPalette;
          codeChars = sharedCodeChars;
        } else {
          var frameNumCodes = Tool.brailleToInt(read(1));
          var pal2 = readPalette(frameNumCodes);
          palette = pal2.palette;
          codeChars = pal2.codeChars;
        }
        var numCodes = codeChars.length;
        var transparent = SpriteTool.findBrailleTransparent(palette);
        var fillChar = transparent !== null ? transparent : codeChars[0];
        var emptyRow = fillChar.repeat(width);

        var grid = new Array(height);
        for (var y = 0; y < height; y++) grid[y] = emptyRow;

        var startY = Tool.brailleToInt(read(posLen));
        var endY = Tool.brailleToInt(read(posLen));

        if (startY < height) {
          for (var y = startY; y <= endY; y++) {
            var startX = Tool.brailleToInt(read(posLen));
            if (startX === width) continue;
            var endX = Tool.brailleToInt(read(posLen));
            var rowChars = new Array(width);
            for (var j = 0; j < width; j++) rowChars[j] = fillChar;
            var x = startX;
            while (x <= endX) {
              var v = Tool.brailleToInt(read(cellBytes));
              var color = v % numCodes;
              var length = Math.floor(v/numCodes)+1;
              var ch = codeChars[color];
              for (var j = 0; j < length; j++) {
                rowChars[x+j] = ch;
              }
              x += length;
            }
            grid[y] = rowChars.join('');
          }
        }

        var entry = {grid: grid};
        if (sharedPalette === false) {
          entry.colors = palette;
        }
        result.sprite.push(entry);
      }
    }
    return result;
  } // decode_Braille

  static decodeHexStr(str) {
    var sprite = [];
    for (var x = 0; x < 8; x++) {
      sprite.push(Tool.hexToBin(str.substring(x*2, x*2+2)));
    }
    return {penChar: '1', sprite: sprite};
  } // decodeHexStr

  // returns a copy of the grid with one row circularly shifted by `shift` (positive = content moves right, wraps around the row width)
  static rotateRow(grid, rowIndex, shift) {
    var result = grid.slice();
    var row = result[rowIndex];
    var w = row.length;
    if (w > 0) {
      var s = ((shift % w) + w) % w;
      result[rowIndex] = row.slice(w - s) + row.slice(0, w - s);
    }
    return result;
  } // rotateRow

  // returns a new w×h grid with the source shifted by (dx, dy); cells outside the source become ' ' (off)
  static shiftCrop(grid, dx, dy, w, h) {
    var result = [];
    for (var y = 0; y < h; y++) {
      var srcY = y - dy;
      var line = '';
      for (var x = 0; x < w; x++) {
        var srcX = x - dx;
        var ch = ' ';
        if (srcY >= 0 && srcY < grid.length && srcX >= 0 && srcX < grid[srcY].length) {
          ch = grid[srcY][srcX];
        }
        line += ch;
      }
      result.push(line);
    }
    return result;
  } // shiftCrop

} // SpriteTool

export default SpriteTool;
