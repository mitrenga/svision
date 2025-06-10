/**/
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
/*/
import TextEntity from './textEntity.js';
/**/
// begin code

export class MiniTextEntity extends TextEntity {

  constructor(parentEntity, x, y, width, height, text, penColor, bkColor, scale, margin) {
    super(parentEntity, x, y, width, height);
    this.id = 'MiniTextEntity';
    
    this.proportional = true;
    this.justify = 0;
    this.animateState = 0;
    this.text = text;
    this.scale = scale;
    this.penColor = penColor;
    this.bkColor = bkColor;
    this.margin = margin;

    this.miniFonts = {
      '`': {width: 1, data: [[]]},
      ' ': {width: 3, data: [[]]},
      '!': {width: 2, data: [[0,0,1,3], [0,4,1,1]]},
      '"': {width: 4, data: [[0,0,1,2], [2,0,1,2]]},
      '#': {width: 0, data: [[]]},
      '$': {width: 0, data: [[]]},
      '%': {width: 0, data: [[]]},
      '&': {width: 0, data: [[]]},
      '\'': {width: 2, data: [[0,0,1,2]]},
      '(': {width: 3, data: [[0,1,1,3], [1,0,1,1], [1,4,1,1]]},
      ')': {width: 3, data: [[0,0,1,1], [1,1,1,3], [0,4,1,1]]},
      '*': {width: 0, data: [[]]},
      '+': {width: 0, data: [[]]},
      ',': {width: 2, data: [[0,4,1,2]]},
      '-': {width: 4, data: [[0,2,3,1]]},
      '.': {width: 2, data: [[0,4,1,1]]},
      '/': {width: 0, data: [[]]},
      '0': {width: 5, data: [[0,1,1,3], [1,0,2,1], [3,1,1,3], [1,4,2,1]]},
      '1': {width: 4, data: [[0,1,1,1], [1,0,1,4], [0,4,3,1]]},
      '2': {width: 5, data: [[0,1,1,1], [1,0,2,1], [3,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,4,1]]},
      '3': {width: 5, data: [[0,1,1,1], [1,0,2,1], [3,1,1,1], [2,2,1,1], [3,3,1,1], [1,4,2,1], [0,3,1,1]]},
      '4': {width: 5, data: [[0,0,1,4], [1,3,3,1], [2,2,1,1], [2,4,1,1]]},
      '5': {width: 5, data: [[0,0,4,1], [0,1,1,2], [1,2,1,1], [2,2,1,1], [3,3,1,1], [0,4,3,1]]},
      '6': {width: 5, data: [[1,0,2,1], [0,1,1,3], [1,4,2,1], [3,3,1,1], [1,2,2,1]]},
      '7': {width: 5, data: [[0,0,4,1], [3,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,1,1]]},
      '8': {width: 5, data: [[1,0,2,1], [0,1,1,1], [0,3,1,1], [1,4,2,1], [3,3,1,1], [1,2,2,1], [3,1,1,1]]},
      '9': {width: 5, data: [[1,0,2,1], [0,1,1,1], [3,1,1,3], [1,2,2,1], [1,4,2,1]]},
      ':': {width: 2, data: [[0,1,1,1], [0,3,1,1]]},
      ';': {width: 0, data: [[]]},
      '<': {width: 0, data: [[]]},
      '=': {width: 0, data: [[]]},
      '>': {width: 0, data: [[]]},
      '?': {width: 0, data: [[]]},
      '@': {width: 0, data: [[]]},
      'A': {width: 6, data: [[1,0,3,1], [0,1,1,4], [1,3,3,1], [4,1,1,4]]},
      'B': {width: 6, data: [[0,0,1,5], [1,0,3,1], [4,1,1,1], [1,2,3,1], [4,3,1,1], [1,4,3,1]]},
      'C': {width: 5, data: [[0,1,1,3], [1,0,3,1], [1,4,3,1]]},
      'D': {width: 6, data: [[0,0,1,5], [1,0,3,1], [4,1,1,3], [1,4,3,1]]},
      'E': {width: 5, data: [[0,0,4,1], [0,1,1,4], [1,2,2,1], [1,4,3,1]]},
      'F': {width: 5, data: [[0,0,4,1], [0,1,1,4], [1,2,2,1]]},
      'G': {width: 6, data: [[0,1,1,3], [1,0,3,1], [1,4,3,1], [4,3,1,1], [2,2,3,1]]},
      'H': {width: 6, data: [[0,0,1,5], [1,2,3,1], [4,0,1,5]]},
      'I': {width: 2, data: [[0,0,1,5]]},
      'J': {width: 4, data: [[2,0,1,4], [0,4,2,1]]},
      'K': {width: 5, data: [[0,0,1,5], [3,0,1,1], [2,1,1,1], [1,2,1,1], [2,3,1,1], [3,4,1,1]]},
      'L': {width: 5, data: [[0,0,1,5], [1,4,3,1]]},
      'M': {width: 6, data: [[0,0,1,5], [1,1,1,1], [2,2,1,1], [3,1,1,1], [4,0,1,5]]},
      'N': {width: 6, data: [[0,0,1,5], [4,0,1,5], [1,1,1,1], [2, 2, 1, 1], [3, 3, 1, 1]]},
      'O': {width: 6, data: [[0,1,1,3], [1,0,3,1], [4,1,1,3], [1,4,3,1]]},
      'P': {width: 6, data: [[0,0,4,1], [0,1,1,4], [1,2,3,1], [4, 1, 1, 1]]},
      'Q': {width: 6, data: [[0,1,1,3], [1,0,3,1], [4,1,1,3], [1,4,4,1], [3,3,1,1]]},
      'R': {width: 6, data: [[0,0,4,1], [0,1,1,4], [1,2,3,1], [4, 1, 1, 1], [2, 3, 1, 1], [3, 4, 2, 1]]},
      'S': {width: 6, data: [[1,0,3,1], [0,1,1,1], [1,2,3,1], [4,3,1,1], [0,4,4,1]]},
      'T': {width: 6, data: [[0,0,5,1], [2,1,1,4]]},
      'U': {width: 6, data: [[0,0,1,4], [1,4,3,1], [4,0,1,4]]},
      'V': {width: 6, data: [[0,0,1,3], [1,3,1,1], [2,4,1,1], [3,3,1,1], [4,0,1,3]]},
      'W': {width: 6, data: [[0,0,1,4], [1,4,1,1], [2,3,1,1], [3,4,1,1], [4,0,1,4]]},
      'X': {width: 6, data: [[0, 0, 1, 1], [1, 1, 1, 1], [2, 2, 1, 1], [3, 3, 1, 1], [4, 4, 1, 1], [4, 0, 1, 1], [3, 1, 1, 1], [1, 3, 1, 1], [0, 4, 1, 1]]},
      'Y': {width: 6, data: [[0,0,1,2], [4,0,1,2], [1,2,3,1], [2,3,1,2]]},
      'Z': {width: 6, data: [[0,0,5,1], [1,3,1,1], [2,2,1,1], [3,1,1,1], [0,4,5,1]]},
      '[': {width: 0, data: [[]]},
      '\\': {width: 0, data: [[]]},
      ']': {width: 0, data: [[]]},
      '^': {width: 0, data: [[]]},
      '_': {width: 0, data: [[]]},
      '£': {width: 0, data: [[]]},
      '{': {width: 0, data: [[]]},
      '|': {width: 0, data: [[]]},
      '}': {width: 0, data: [[]]},
      '~': {width: 0, data: [[]]},
      '©': {width: 7, data: [[1,0,4,1], [0,1,2,3], [1,4,4,1], [4,1,2,3], [3,2,1,1]]}
    }
  } // constructor

  getTextChar(position) {
    return this.text[position];
  } // getTextChar

  getTextLength() {
    return this.text.length;
  } // getTextLength

  getPenColorChar(position) {
    return this.penColor;
  } // getPenColorChar

  getCharData(char, bitMask) {
    var charObject = {};
    charObject.width = this.miniFonts[char].width*this.scale;

    charObject.data = [];
    for (var x = 0; x < this.miniFonts[char].data.length; x++) {
      var piece = this.miniFonts[char].data[x];
      charObject.data.push([piece[0]*this.scale, piece[1]*this.scale, piece[2]*this.scale, piece[3]*this.scale]);
    }

    return charObject;
  } // getCharData

} // class MiniTextEntity

export default MiniTextEntity;
