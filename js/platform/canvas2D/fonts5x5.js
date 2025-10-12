/**/
const { AbstractFonts } = await import('../../abstractFonts.js?ver='+window.srcVersion);
/*/
import AbstractFonts from '../../abstractFonts.js';
/**/
// begin code

export class Fonts5x5 extends AbstractFonts {

  constructor(app) {
    super(app);
    this.id = 'Fonts5x5';

    this.charsHeight = 5; 
    this.charsSpacing = 1;
    this.lineSpacing = 2;
    this.paragraphSpacing = 7;
    
    this.fontsData = {
      ' ': {width: 2, data: []},
      '!': {width: 1, data: [[0,0,1,3], [0,4,1,1]]},
      '"': {width: 3, data: [[0,0,1,2], [2,0,1,2]]},
      '#': {width: 0, data: [[]]},
      '$': {width: 0, data: [[]]},
      '%': {width: 0, data: [[]]},
      '&': {width: 0, data: [[]]},
      '\'': {width: 1, data: [[0,0,1,2]]},
      '(': {width: 2, data: [[0,1,1,3], [1,0,1,1], [1,4,1,1]]},
      ')': {width: 2, data: [[0,0,1,1], [1,1,1,3], [0,4,1,1]]},
      '*': {width: 0, data: [[]]},
      '+': {width: 0, data: [[]]},
      ',': {width: 1, data: [[0,4,1,2]]},
      '-': {width: 3, data: [[0,2,3,1]]},
      '.': {width: 1, data: [[0,4,1,1]]},
      '/': {width: 5, data: [[0,4,1,1], [1,3,1,1], [2,2,1,1], [3,1,1,1], [4,0,1,1]]},
      '0': {width: 4, data: [[0,1,1,3], [1,0,2,1], [3,1,1,3], [1,4,2,1]]},
      '1': {width: 3, data: [[0,1,1,1], [1,0,1,4], [0,4,3,1]]},
      '2': {width: 4, data: [[0,1,1,1], [1,0,2,1], [3,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,4,1]]},
      '3': {width: 4, data: [[0,1,1,1], [1,0,2,1], [3,1,1,1], [2,2,1,1], [3,3,1,1], [1,4,2,1], [0,3,1,1]]},
      '4': {width: 4, data: [[0,0,1,4], [1,3,3,1], [2,2,1,1], [2,4,1,1]]},
      '5': {width: 4, data: [[0,0,4,1], [0,1,1,2], [1,2,1,1], [2,2,1,1], [3,3,1,1], [0,4,3,1]]},
      '6': {width: 4, data: [[1,0,2,1], [0,1,1,3], [1,4,2,1], [3,3,1,1], [1,2,2,1]]},
      '7': {width: 4, data: [[0,0,4,1], [3,1,1,1], [2,2,1,1], [1,3,1,1], [0,4,1,1]]},
      '8': {width: 4, data: [[1,0,2,1], [0,1,1,1], [0,3,1,1], [1,4,2,1], [3,3,1,1], [1,2,2,1], [3,1,1,1]]},
      '9': {width: 4, data: [[1,0,2,1], [0,1,1,1], [3,1,1,3], [1,2,2,1], [1,4,2,1]]},
      ':': {width: 1, data: [[0,1,1,1], [0,3,1,1]]},
      ';': {width: 0, data: [[]]},
      '<': {width: 0, data: [[]]},
      '=': {width: 0, data: [[]]},
      '>': {width: 0, data: [[]]},
      '?': {width: 3, data: [[0,0,2,1], [2,1,1,1], [1,2,1,1], [1,4,1,1]]},
      '@': {width: 0, data: [[]]},
      'A': {width: 5, data: [[1,0,3,1], [0,1,1,4], [1,3,3,1], [4,1,1,4]]},
      'B': {width: 5, data: [[0,0,1,5], [1,0,3,1], [4,1,1,1], [1,2,3,1], [4,3,1,1], [1,4,3,1]]},
      'C': {width: 4, data: [[0,1,1,3], [1,0,3,1], [1,4,3,1]]},
      'D': {width: 5, data: [[0,0,1,5], [1,0,3,1], [4,1,1,3], [1,4,3,1]]},
      'E': {width: 4, data: [[0,0,4,1], [0,1,1,4], [1,2,2,1], [1,4,3,1]]},
      'F': {width: 4, data: [[0,0,4,1], [0,1,1,4], [1,2,2,1]]},
      'G': {width: 5, data: [[0,1,1,3], [1,0,3,1], [1,4,3,1], [4,3,1,1], [2,2,3,1]]},
      'H': {width: 5, data: [[0,0,1,5], [1,2,3,1], [4,0,1,5]]},
      'I': {width: 1, data: [[0,0,1,5]]},
      'J': {width: 3, data: [[2,0,1,4], [0,4,2,1]]},
      'K': {width: 4, data: [[0,0,1,5], [3,0,1,1], [2,1,1,1], [1,2,1,1], [2,3,1,1], [3,4,1,1]]},
      'L': {width: 4, data: [[0,0,1,5], [1,4,3,1]]},
      'M': {width: 5, data: [[0,0,1,5], [1,1,1,1], [2,2,1,1], [3,1,1,1], [4,0,1,5]]},
      'N': {width: 5, data: [[0,0,1,5], [4,0,1,5], [1,1,1,1], [2, 2, 1, 1], [3, 3, 1, 1]]},
      'O': {width: 5, data: [[0,1,1,3], [1,0,3,1], [4,1,1,3], [1,4,3,1]]},
      'P': {width: 5, data: [[0,0,4,1], [0,1,1,4], [1,2,3,1], [4, 1, 1, 1]]},
      'Q': {width: 5, data: [[0,1,1,3], [1,0,3,1], [4,1,1,3], [1,4,4,1], [3,3,1,1]]},
      'R': {width: 5, data: [[0,0,4,1], [0,1,1,4], [1,2,3,1], [4, 1, 1, 1], [2, 3, 1, 1], [3, 4, 2, 1]]},
      'S': {width: 5, data: [[1,0,3,1], [0,1,1,1], [1,2,3,1], [4,3,1,1], [0,4,4,1]]},
      'T': {width: 5, data: [[0,0,5,1], [2,1,1,4]]},
      'U': {width: 5, data: [[0,0,1,4], [1,4,3,1], [4,0,1,4]]},
      'V': {width: 5, data: [[0,0,1,3], [1,3,1,1], [2,4,1,1], [3,3,1,1], [4,0,1,3]]},
      'W': {width: 5, data: [[0,0,1,4], [1,4,1,1], [2,3,1,1], [3,4,1,1], [4,0,1,4]]},
      'X': {width: 5, data: [[0, 0, 1, 1], [1, 1, 1, 1], [2, 2, 1, 1], [3, 3, 1, 1], [4, 4, 1, 1], [4, 0, 1, 1], [3, 1, 1, 1], [1, 3, 1, 1], [0, 4, 1, 1]]},
      'Y': {width: 5, data: [[0,0,1,2], [4,0,1,2], [1,2,3,1], [2,3,1,2]]},
      'Z': {width: 5, data: [[0,0,5,1], [1,3,1,1], [2,2,1,1], [3,1,1,1], [0,4,5,1]]},
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
      '©': {width: 6, data: [[1,0,4,1], [0,1,2,3], [1,4,4,1], [4,1,2,3], [3,2,1,1]]},
      ' ': {width: 2, data: []},
      '‗': {width: 3, data: [[0,4,3,1]]},
      '←': {width: 6, data: [[0,2,6,1], [1,1,1,3], [2,0,1,5]]},
      '↓': {width: 5, data: [[2,0,1,5], [1,3,3,1], [0,2,5,1]]},
      '↑': {width: 5, data: [[2,0,1,5], [1,1,3,1], [0,2,5,1]]},
      '➔': {width: 6, data: [[0,2,6,1], [4,1,1,3], [3,0,1,5]]}
    }
  } // constructor

  getCharData(char, bitMask, scale) {
    var validChar = char;
    if (!(char in this.fontsData)) {
      validChar = '?';
    }
    var charObject = {};
    charObject.width = this.fontsData[validChar].width*scale;

    charObject.data = [];
    for (var x = 0; x < this.fontsData[validChar].data.length; x++) {
      var piece = this.fontsData[validChar].data[x];
      charObject.data.push([piece[0]*scale, piece[1]*scale, piece[2]*scale, piece[3]*scale]);
    }

    return charObject;
  } // getCharData

  validChar(char) {
    if (char in this.fontsData) {
      return true;
    }
    return false;
  } // validChar

} // class Fonts5x5

export default Fonts5x5;
