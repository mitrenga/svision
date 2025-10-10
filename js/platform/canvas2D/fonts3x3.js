/**/
const { AbstractFonts } = await import('../../abstractFonts.js?ver='+window.srcVersion);
/*/
import AbstractFonts from '../../abstractFonts.js';
/**/
// begin code

export class Fonts3x3 extends AbstractFonts {

  constructor(app) {
    super(app);
    this.id = 'Fonts3x3';
    
    this.charsSpacing = 1;
    this.lineSpacing = 2;
    this.charsHeight = 3; 

    this.fontsData = {
      '`': {width: 0, data: []},
      ' ': {width: 1, data: []},
      '\'': {width: 1, data: [0,0,1,2]},
      '+': {width: 3, data: [[1,0,1,1], [0,1,3,1], [1,2,1,1]]},
      ',': {width: 1, data: [[1,1,1,2]]},
      '-': {width: 2, data: [[0,1,2,1]]},
      '.': {width: 1, data: [[0,2,1,1]]},
      '/': {width: 3, data: [[2,0,1,1], [1,1,1,1], [0,2,1,1]]},
      '0': {width: 3, data: [[0,0,3,1], [0,1,1,1], [2,1,1,1], [0,2,3,1]]},
      '1': {width: 3, data: [[0,0,2,1], [1,1,1,1], [0,2,3,1]]},
      '2': {width: 3, data: [[0,0,2,1], [1,1,1,1], [1,2,2,1]]},
      '3': {width: 3, data: [[0,0,3,1], [1,1,2,1], [0,2,3,1]]},
      '4': {width: 3, data: [[0,0,1,2], [1,1,1,1], [2,0,1,3]]},
      '5': {width: 3, data: [[1,0,2,1], [1,1,1,1], [0,2,2,1]]},
      '6': {width: 3, data: [[0,0,1,3], [1,1,2,2]]},
      '7': {width: 3, data: [[0,0,2,1], [2,0,1,3]]},
      '8': {width: 3, data: [[1,0,2,1], [0,1,3,2]]},
      '9': {width: 3, data: [[0,0,3,2], [2,2,1,1]]},
      ':': {width: 1, data: [[0,0,1,1], [0,2,1,1]]},
      '<': {width: 2, data: [[0,1,1,1], [1,0,1,1], [1,2,1,1]]},
      '=': {width: 3, data: [[0,0,3,1], [0,2,3,1]]},
      '>': {width: 2, data: [[0,0,1,1], [0,2,1,1], [1,1,1,1]]},
      '?': {width: 2, data: [[0,0,2,1], [1,2,1,1]]},
      'A': {width: 3, data: [[0,1,1,2], [1,0,1,2], [2,1,1,2]]},
      'B': {width: 3, data: [[0,0,2,1], [0,1,3,2]]},
      'C': {width: 3, data: [[0,0,3,1], [0,1,1,1], [0,2,3,1]]},
      'D': {width: 3, data: [[0,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,2,1]]},
      'E': {width: 3, data: [[0,0,2,3], [2,0,1,1], [2,2,1,1]]},
      'F': {width: 3, data: [[0,0,1,3], [1,0,1,2], [2,0,1,1]]},
      'G': {width: 3, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1], [2,1,1,2]]},
      'H': {width: 3, data: [[0,0,1,3], [1,1,1,1], [2,0,1,3]]},
      'I': {width: 1, data: [[0,0,1,3]]},
      'J': {width: 3, data: [[0,1,1,2], [1,2,1,1], [2,0,1,3]]},
      'K': {width: 3, data: [[0,0,1,3], [1,1,1,1], [2,0,1,1], [2,2,1,1]]},
      'L': {width: 3, data: [[0,0,1,3], [1,2,2,1]]},
      'M': {width: 3, data: [[0,0,1,3], [1,0,1,2], [2,0,1,3]]},
      'N': {width: 3, data: [[0,0,1,3], [1,0,1,1], [2,0,1,3]]},
      'O': {width: 3, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1], [2,0,1,3]]},
      'P': {width: 3, data: [[0,0,3,2], [0,2,1,1]]},
      'Q': {width: 3, data: [[0,0,3,2], [2,2,1,1]]},
      'R': {width: 3, data: [[0,0,1,3], [1,0,2,1]]},
      'S': {width: 3, data: [[1,0,2,1], [1,1,1,1], [0,2,2,1]]},
      'T': {width: 3, data: [[0,0,3,1], [1,1,1,2]]},
      'U': {width: 3, data: [[0,0,1,3], [1,2,1,1], [2,0,1,3]]},
      'V': {width: 3, data: [[0,0,1,2], [1,2,1,1], [2,0,1,2]]},
      'W': {width: 3, data: [[0,0,1,3], [1,1,1,2], [2,0,1,3]]},
      'X': {width: 3, data: [[0,0,1,1], [0,2,1,1], [1,1,1,1], [2,0,1,1], [2,2,1,1]]},
      'Y': {width: 3, data: [[0,0,1,1], [1,1,1,2], [2,0,1,1]]},
      'Z': {width: 3, data: [[0,0,2,1], [1,1,1,1], [1,2,2,1]]},
      '[': {width: 2, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1]]},
      '\\': {width: 3, data: [[[0,0,1,1], [1,1,1,1], [2,2,1,1]]]},
      ']': {width: 2, data: [[0,0,1,1], [0,2,1,1], [1,0,1,3]]},
      '^': {width: 3, data: [[0,1,1,1], [1,0,1,1], [2,1,1,1]]},
      '_': {width: 3, data: [[0,2,3,1]]},
      '‗': {width: 2, data: [[0,2,2,1]]}
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

} // class Fonts3x3

export default Fonts3x3;
