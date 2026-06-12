/**/
const { Tool } = await import('./tool.js?ver='+window.srcVersion);
const { RichString } = await import('./richString.js?ver='+window.srcVersion);
/*/
import Tool from './tool.js';
import RichString from './richString.js';
/**/
// begin code

/**
 * Static collection of sprite encoding/decoding and geometry utilities.
 *
 * It implements several compression formats, each identified by a leading
 * method marker:
 *  - Monochrome sprites ("---####-" style):
 *      hR2 - hex repetition, run lengths 00..FF
 *      lP1 - latin pulses, 0..9A..Z
 *      lT2 - latin trim, 00..99AA..ZZ
 *  - Colored sprites (the maximum run length is derived dynamically from the
 *    number of palette colors):
 *      b90     - runs expressed as base90 characters (printable ASCII, no escaping needed)
 *      braille - runs expressed as Braille characters
 *
 * Beyond (de)compression it also handles palette serialization, grid
 * transformations (row rotation, shift/crop), and computation of per-frame
 * "blank margins" used for pixel-perfect collision detection.
 */
export class SpriteTool {

  /**
   * Encodes sprite data using the named compression method, dispatching to the
   * matching encoder.
   * @param {Object} spriteData - The sprite data to encode.
   * @param {string} method - The compression method ('hR2', 'lP1', 'lT2',
   *   'b90', or 'braille').
   * @returns {RichString|string} The encoded sprite string, or an error message
   *   for an unknown method.
   */
  static encode(spriteData, method) {
    switch (method) {
      case 'hR2': 
        return this.encode_hR2(spriteData);
      case 'lP1':
        return this.encode_lP1(spriteData);
      case 'lT2':
        return this.encode_lT2(spriteData);
      case 'b90':
        return this.encode_b90(spriteData);
      case 'braille':
        return this.encode_Braille(spriteData);
      default:
        return 'ENCODE ERROR: unknown compression method: '+method;
    }
  } // encode

  /**
   * Decodes an encoded sprite string by reading its leading method marker and
   * dispatching to the matching decoder.
   * @param {string} data - The encoded sprite string.
   * @returns {Object|string} The decoded sprite data object, or an error
   *   message for an unknown method.
   */
  static decode(data) {
    var method = data.substring(0, 3);
    switch (method) {
      case 'hR2': 
        return this.decode_hR2(data);
      case 'lP1':
        return this.decode_lP1(data);
      case 'lT2':
        return this.decode_lT2(data);
      case 'b90':
        return this.decode_b90(data);
      case '⣿⣿⣿':
        return this.decode_Braille(data);
      default:
        return 'DECODE ERROR: unknown compression method: '+method;
    }
  } // decode

  /**
   * Encodes a monochrome sprite using the hR2 format: a header with hex
   * width/height followed by a run-length stream of 2-hex-digit counts
   * alternating between blank and solid pixels.
   * @param {Object} spriteData - Sprite data with width, height, and sprite
   *   row arrays.
   * @returns {RichString} The hR2-encoded sprite string.
   */
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

  /**
   * Decodes an hR2-format monochrome sprite string back into a sprite data
   * object whose rows use '-' for blank and '#' for solid pixels.
   * @param {string} data - The hR2-encoded sprite string.
   * @returns {Object} The decoded sprite data (width, height, frames,
   *   directions, sprite).
   */
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

  /**
   * Encodes a monochrome sprite using the lP1 format: a base-36 header, a
   * deduplicated table of distinct run lengths ("pulses"), and a stream of
   * single-character indices into that table. Returns an error string if a
   * pulse exceeds 1296 or there are more than 36 distinct pulses.
   * @param {Object} spriteData - Sprite data with width, height, and sprite
   *   row arrays.
   * @returns {RichString} The lP1-encoded sprite string, or an error message.
   */
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

  /**
   * Decodes an lP1-format monochrome sprite string by reading the pulse table
   * and expanding the index stream into '-'/'#' rows.
   * @param {string} data - The lP1-encoded sprite string.
   * @returns {Object} The decoded sprite data (width, height, frames,
   *   directions, sprite).
   */
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

  /**
   * Encodes a monochrome sprite using the lT2 format: stores only the rows
   * between the first and last non-empty row, each trimmed to its solid span
   * and run-length encoded, with empty rows marked '-' and rows identical to
   * the previous one marked 'S'. Returns an error string for an empty sprite.
   * @param {Object} spriteData - Sprite data with width, height, and sprite
   *   row arrays.
   * @returns {RichString} The lT2-encoded sprite string, or an error message.
   */
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

  /**
   * Decodes an lT2-format monochrome sprite string, reconstructing each row
   * from its starting x, run-length values, '-' empty markers, and 'S'
   * same-as-previous markers, padding to full width.
   * @param {string} data - The lT2-encoded sprite string.
   * @returns {Object} The decoded sprite data (width, height, frames,
   *   directions, sprite).
   */
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

  /**
   * Serializes a color palette into base-90 form: for each code character its
   * code point, the color string length (or sentinel 89 for a false/absent
   * color), and the code points of the color string characters.
   * @param {Object} palette - Map of single-character codes to color strings
   *   (or false for transparent).
   * @returns {string} The base-90 encoded palette section.
   */
  static encodeB90Palette(palette) {
    var result = '';
    for (var ch in palette) {
      result += Tool.intToBase90(ch.codePointAt(0), 2);
      result += Tool.intToBase90(palette[ch] === false ? 89 : Array.from(palette[ch]).length, 1);
      if (palette[ch] !== false) {
        var chars = Array.from(palette[ch]);
        for (var j = 0; j < chars.length; j++) {
          result += Tool.intToBase90(chars[j].codePointAt(0), 2);
        }
      }
    }
    return result;
  } // encodeB90Palette

  /**
   * Encodes a single colored grid into a base-90 block: the bounding rows
   * (startY/endY), and for each row its solid span plus run-length cells where
   * each cell packs a repetition count and a palette color index. Transparent
   * pixels (the palette's false-color code) are skipped via the bounds.
   * @param {Array<string>} grid - Array of row strings for the frame.
   * @param {Object} palette - Map of code characters to colors.
   * @param {number} width - Grid width in pixels.
   * @param {number} height - Grid height in pixels.
   * @param {number} posLen - Number of base-90 chars used per position value.
   * @param {number} cellBytes - Number of base-90 chars used per run cell.
   * @returns {string} The base-90 encoded grid block.
   */
  static encodeB90GridBlock(grid, palette, width, height, posLen, cellBytes) {
    var codeChars = Object.keys(palette);
    var codeIndex = {};
    for (var i = 0; i < codeChars.length; i++) codeIndex[codeChars[i]] = i;
    var numCodes = codeChars.length;
    // 2-char cell: floor(8100/numCodes)
    var maxReps = Math.floor(Math.pow(90, cellBytes) / numCodes);
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
      return Tool.intToBase90(height, posLen)+Tool.intToBase90(height, posLen);
    }
    var result = Tool.intToBase90(startY, posLen)+Tool.intToBase90(endY, posLen);
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
        result += Tool.intToBase90(width, posLen);
        continue;
      }
      result += Tool.intToBase90(firstX, posLen);
      result += Tool.intToBase90(lastX, posLen);
      var x = firstX;
      while (x <= lastX) {
        var ch = row[x];
        var runEnd = x+1;
        while (runEnd <= lastX && row[runEnd] === ch) runEnd++;
        var runLen = runEnd-x;
        var colorIdx = codeIndex[ch] !== undefined ? codeIndex[ch] : 0;
        while (runLen > 0) {
          var part = Math.min(runLen, maxReps);
          result += Tool.intToBase90((part-1)*numCodes+colorIdx, cellBytes);
          runLen -= part;
        }
        x = runEnd;
      }
    }
    return result;
  } // encodeB90GridBlock

  /**
   * Encodes a colored sprite (with frames and directions) using the b90
   * format. It serializes either a shared palette or per-frame palettes plus
   * each frame's grid block, trying both 1-byte and 2-byte run cells and
   * keeping the shorter result, then prepends a header with version, cell-byte
   * flag, dimensions, frames, and directions.
   * @param {Object} spriteData - Sprite data with width, height, frames,
   *   directions, colors (shared palette or false), and per-frame sprite
   *   entries.
   * @returns {RichString} The b90-encoded sprite string.
   */
  static encode_b90(spriteData) {
    var width = spriteData.width;
    var height = spriteData.height;
    var frames = spriteData.frames;
    var directions = spriteData.directions;
    var sharedPalette = spriteData.colors;
    // Position byte width is derived from the dimensions (positions store a sentinel
    // equal to width/height, and one base90 char holds 0..89).
    var posLen = (width > 89 || height > 89) ? 2 : 1;

    // Build the body (palette section + grid blocks) for a given grid-cell
    // byte width. Only the run cells depend on cellBytes; positions use posLen.
    var buildBody = (cellBytes) => {
      var body = Tool.intToBase90(sharedPalette === false ? 89 : Object.keys(sharedPalette).length, 1);
      if (sharedPalette !== false) {
        body += this.encodeB90Palette(sharedPalette);
      }
      for (var d = 0; d < directions; d++) {
        for (var f = 0; f < frames; f++) {
          var entry = spriteData.sprite[f+d*frames];
          var palette = sharedPalette !== false ? sharedPalette : entry.colors;
          if (sharedPalette === false) {
            body += Tool.intToBase90(Object.keys(palette).length, 1);
            body += this.encodeB90Palette(palette);
          }
          body += this.encodeB90GridBlock(entry.grid, palette, width, height, posLen, cellBytes);
        }
      }
      return body;
    };

    // Variant A: encode the grid both ways, keep the shorter. Tie -> 1-byte.
    var body1 = buildBody(1);
    var body2 = buildBody(2);
    var useDouble = body2.length < body1.length;
    var body = useDouble ? body2 : body1;

    var result = 'b90';
    result += Tool.intToBase90(1, 1);
    result += Tool.intToBase90(useDouble ? 2 : 0, 1);
    result += Tool.intToBase90(width, 2);
    result += Tool.intToBase90(height, 2);
    result += Tool.intToBase90(frames, 1);
    result += Tool.intToBase90(directions, 1);
    result += body;

    return new RichString(result);
  } // encode_b90

  /**
   * Decodes a b90-format colored sprite string into a sprite data object,
   * reading the header, the shared or per-frame palettes, and each frame's
   * run-length-encoded grid block, filling transparent cells with the palette's
   * transparent code (or the first code when none is transparent).
   * @param {string} data - The b90-encoded sprite string.
   * @returns {Object} The decoded sprite data (width, height, frames,
   *   directions, colors, sprite).
   */
  static decode_b90(data) {
    var pos = 3;
    /**
     * Reads the next `len` characters from the data stream and advances the
     * shared read pointer.
     * @param {number} len - Number of characters to read.
     * @returns {string} The read substring.
     */
    function read(len) {
      var s = data.substring(pos, pos+len);
      pos += len;
      return s;
    }
    /**
     * Reads a base-90 palette of numCodes entries from the data stream.
     * @param {number} numCodes - Number of palette entries to read.
     * @returns {Object} An object with the palette map and an ordered
     *   codeChars array.
     */
    function readPalette(numCodes) {
      var palette = {};
      var codeChars = [];
      for (var i = 0; i < numCodes; i++) {
        var ch = String.fromCodePoint(Tool.base90ToInt(read(2)));
        var strLen = Tool.base90ToInt(read(1));
        if (strLen === 89) {
          palette[ch] = false;
        } else {
          var color = '';
          for (var k = 0; k < strLen; k++) {
            color += String.fromCodePoint(Tool.base90ToInt(read(2)));
          }
          palette[ch] = color;
        }
        codeChars.push(ch);
      }
      return {palette: palette, codeChars: codeChars};
    }
    var version = Tool.base90ToInt(read(1));
    var gridDoubleByte = Tool.base90ToInt(read(1)) === 2;
    var width = Tool.base90ToInt(read(2));
    var height = Tool.base90ToInt(read(2));
    var frames = Tool.base90ToInt(read(1));
    var directions = Tool.base90ToInt(read(1));
    // Position byte width derived from dimensions; the flag controls grid cells.
    var posLen = (width > 89 || height > 89) ? 2 : 1;
    var cellBytes = gridDoubleByte ? 2 : 1;
    var topRaw = Tool.base90ToInt(read(1));
    var topNumCodes = (topRaw === 89) ? false : topRaw;
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
          var frameNumCodes = Tool.base90ToInt(read(1));
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
        var startY = Tool.base90ToInt(read(posLen));
        var endY = Tool.base90ToInt(read(posLen));
        if (startY < height) {
          for (var y = startY; y <= endY; y++) {
            var startX = Tool.base90ToInt(read(posLen));
            if (startX === width) continue;
            var endX = Tool.base90ToInt(read(posLen));
            var rowChars = new Array(width);
            for (var j = 0; j < width; j++) rowChars[j] = fillChar;
            var x = startX;
            while (x <= endX) {
              var v = Tool.base90ToInt(read(cellBytes));
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
  } // decode_b90

  /**
   * Serializes a color palette into braille form: for each code character its
   * code point, the color string length (or the false/absent sentinel), and
   * the code points of the color string characters.
   * @param {Object} palette - Map of single-character codes to color strings
   *   (or false for transparent).
   * @returns {string} The braille-encoded palette section.
   */
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

  /**
   * Finds the palette code character whose color is false (transparent).
   * @param {Object|false} palette - The palette map, or false if absent.
   * @returns {string|null} The transparent code character, or null if none.
   */
  static findBrailleTransparent(palette) {
    if (palette === false) return null;
    for (var ch in palette) {
      if (palette[ch] === false) return ch;
    }
    return null;
  } // findBrailleTransparent

  /**
   * Encodes a single colored grid into a braille block: the bounding rows
   * (startY/endY), and for each row its solid span plus run-length cells where
   * each cell packs a repetition count and a palette color index. Transparent
   * pixels are skipped via the bounds.
   * @param {Array<string>} grid - Array of row strings for the frame.
   * @param {Object} palette - Map of code characters to colors.
   * @param {number} width - Grid width in pixels.
   * @param {number} height - Grid height in pixels.
   * @param {number} posLen - Number of braille chars used per position value.
   * @param {number} cellBytes - Number of braille chars used per run cell.
   * @returns {string} The braille-encoded grid block.
   */
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

  /**
   * Encodes a colored sprite using the braille format. It serializes either a
   * shared palette or per-frame palettes plus each frame's grid block, trying
   * both 1-byte and 2-byte run cells and keeping the shorter result, then
   * prepends a braille header (three 0xFE marker chars, version, cell-byte
   * flag, dimensions, frames, and directions).
   * @param {Object} spriteData - Sprite data with width, height, frames,
   *   directions, colors (shared palette or false), and per-frame sprite
   *   entries.
   * @returns {RichString} The braille-encoded sprite string.
   */
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

  /**
   * Decodes a braille-format colored sprite string into a sprite data object,
   * reading the header, the shared or per-frame palettes, and each frame's
   * run-length-encoded grid block, filling transparent cells with the palette's
   * transparent code (or the first code when none is transparent).
   * @param {string} data - The braille-encoded sprite string.
   * @returns {Object} The decoded sprite data (width, height, frames,
   *   directions, colors, sprite).
   */
  static decode_Braille(data) {
    var pos = 3;
    /**
     * Reads the next `len` characters from the data stream and advances the
     * shared read pointer.
     * @param {number} len - Number of characters to read.
     * @returns {string} The read substring.
     */
    function read(len) {
      var s = data.substring(pos, pos+len);
      pos += len;
      return s;
    }
    /**
     * Reads a braille palette of numCodes entries from the data stream.
     * @param {number} numCodes - Number of palette entries to read.
     * @returns {Object} An object with the palette map and an ordered
     *   codeChars array.
     */
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

  /**
   * Decodes sprite data and runs its joined grid as a script (via Tool.script)
   * bound to the given object, passing the decoded sprite as the argument.
   * @param {Object} obj - The object bound as `this` during script execution.
   * @param {string|false} data - The encoded sprite string, or false to skip.
   */
  static scriptedSprite(obj, data) {
    if (data !== false) {
      var sprite = this.decode(data);
      Tool.script(obj, sprite.sprite[0].grid.join(''), sprite);
    }
  } // scriptedSprite

  /**
   * Decodes a 16-hex-digit string into an 8-row monochrome sprite, expanding
   * each pair of hex digits into an 8-bit binary row.
   * @param {string} str - A 16-character hexadecimal string (8 bytes).
   * @returns {Object} An object with penChar '1' and an 8-element sprite array
   *   of binary row strings.
   */
  static decodeHexStr(str) {
    var sprite = [];
    for (var x = 0; x < 8; x++) {
      sprite.push(Tool.hexToBin(str.substring(x*2, x*2+2)));
    }
    return {penChar: '1', sprite: sprite};
  } // decodeHexStr

  /**
   * Returns a copy of the grid with one row circularly shifted.
   * @param {Array<string>} grid - The grid as an array of row strings.
   * @param {number} rowIndex - Index of the row to rotate.
   * @param {number} shift - Shift amount; positive moves content right and
   *   wraps around the row width.
   * @returns {Array<string>} A new grid array with the row rotated.
   */
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
  
  /**
   * Returns a new w×h grid with the source content shifted by (dx, dy); cells
   * that fall outside the source become ' ' (off).
   * @param {Array<string>} grid - The source grid as an array of row strings.
   * @param {number} dx - Horizontal shift in pixels.
   * @param {number} dy - Vertical shift in pixels.
   * @param {number} w - Width of the resulting grid.
   * @param {number} h - Height of the resulting grid.
   * @returns {Array<string>} The shifted and cropped grid.
   */
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

  /**
   * Computes the per-row and per-column blank margins of a single frame: for
   * each row, the number of empty pixels before the first solid pixel and after
   * the last, counted from the left and right edges; for each column, the same
   * counted from the top and bottom edges. This compactly describes the empty
   * border around the sprite shape while treating interior holes as solid. A
   * fully empty row/column gets a margin equal to the full perpendicular extent
   * (width/height), so the solidity test reports "no solid pixel" for it without
   * a special case.
   *
   * Solidity test for a local pixel (x, y):
   *   left[y] <= x < width - right[y]   AND   top[x] <= y < height - bottom[x]
   *
   * @param {Array<string>} grid - The frame grid as an array of row strings.
   * @param {number} width - Frame width in pixels.
   * @param {number} height - Frame height in pixels.
   * @param {Function} isSolid - Predicate (ch) => boolean telling whether a
   *   grid character is a solid (non-transparent) pixel.
   * @returns {Object} An object with left, right, top, and bottom margin arrays.
   */
  static buildFrameBlankMargins(grid, width, height, isSolid) {
    var left = new Array(height);
    var right = new Array(height);
    for (var y = 0; y < height; y++) {
      var row = grid[y] || '';
      var first = -1, last = -1;
      for (var x = 0; x < width; x++) {
        if (isSolid(row[x])) {
          if (first === -1) first = x;
          last = x;
        }
      }
      if (first === -1) {
        left[y] = width;
        right[y] = width;
      } else {
        left[y] = first;
        right[y] = width-1-last;
      }
    }
    var top = new Array(width);
    var bottom = new Array(width);
    for (var x = 0; x < width; x++) {
      var first = -1, last = -1;
      for (var y = 0; y < height; y++) {
        var row = grid[y] || '';
        if (isSolid(row[x])) {
          if (first === -1) first = y;
          last = y;
        }
      }
      if (first === -1) {
        top[x] = height;
        bottom[x] = height;
      } else {
        top[x] = first;
        bottom[x] = height-1-last;
      }
    }
    return {left: left, right: right, top: top, bottom: bottom};
  } // buildFrameBlankMargins

  /**
   * Builds blank margins for every frame of a sprite. Accepts decode()-shaped
   * data where each frame is either an array of mono row strings or a
   * {grid, colors?} colored entry; the solid-pixel rule matches
   * SpriteEntity.buildFrameData() (mono: ch === penChar, colored: ch present in
   * the palette with a non-false color). Each frame is measured against its own
   * grid dimensions rather than data.width/height.
   * @param {Object} data - Sprite data with a sprite array and optional penChar
   *   and colors (shared palette).
   * @returns {Array<Object>} An array of {left, right, top, bottom} margin
   *   objects indexed by f = frame + d*frames.
   */
  static buildBlankMargins(data) {
    var penChar = ('penChar' in data) ? data.penChar : '#';
    var sharedPalette = ('colors' in data) ? data.colors : false;
    var margins = [];
    for (var s = 0; s < data.sprite.length; s++) {
      var frame = data.sprite[s];
      var grid = (frame && frame.grid) ? frame.grid : frame;
      var palette = (frame && frame.colors) ? frame.colors : sharedPalette;
      var height = grid.length;
      var width = 0;
      for (var r = 0; r < grid.length; r++) {
        if (grid[r].length > width) width = grid[r].length;
      }
      var isSolid = (palette === false)
        ? (ch) => ch === penChar
        : (ch) => (ch in palette) && palette[ch] !== false;
      margins[s] = this.buildFrameBlankMargins(grid, width, height, isSolid);
    }
    return margins;
  } // buildBlankMargins

} // SpriteTool

export default SpriteTool;
