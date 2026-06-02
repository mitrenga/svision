/**/
const { Tool } = await import('./tool.js?ver='+window.srcVersion);
const { RichString } = await import('./richString.js?ver='+window.srcVersion);
/*/
import Tool from './Tool.js';
import RichString from './richString.js';
/**/
// begin code

export class SpriteTool {
  // for monochrome sprites "---####-"
  // hR2 - hex repetition 00..FF
  // lP1 - latin pulses 0..9A..Z
  // lT2 - latin trim 00..99AA..ZZ

  static encode(spriteData, method) {
    switch (method) {
      case 'hR2': 
        return this.encode_hR2(spriteData);
      case 'lP1':
        return this.encode_lP1(spriteData);
      case 'lT2':
        return this.encode_lT2(spriteData);
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

} // SpriteTool

export default SpriteTool;
