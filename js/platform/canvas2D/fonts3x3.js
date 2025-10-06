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
    
    this.fontsData = {
      '`': {width: 1, data: []},
      ' ': {width: 2, data: []},
      '\'': {width: 2, data: [0,0,1,2]},
      '+': {width: 4, data: [[1,0,1,1], [0,1,3,1], [1,2,1,1]]},
      ',': {width: 2, data: [[1,1,1,2]]},
      '-': {width: 3, data: [[0,1,2,1]]},
      '.': {width: 2, data: [[0,2,1,1]]},
      '/': {width: 4, data: [[2,0,1,1], [1,1,1,1], [0,2,1,1]]},
      '0': {width: 4, data: [[0,0,3,1], [0,1,1,1], [2,1,1,1], [0,2,3,1]]},
      '1': {width: 4, data: [[0,0,2,1], [1,1,1,1], [0,2,3,1]]},
      '2': {width: 4, data: [[0,0,2,1], [1,1,1,1], [1,2,2,1]]},
      '3': {width: 4, data: [[0,0,3,1], [1,1,2,1], [0,2,3,1]]},
      '4': {width: 4, data: [[0,0,1,2], [1,1,1,1], [2,0,1,3]]},
      '5': {width: 4, data: [[1,0,2,1], [1,1,1,1], [0,2,2,1]]},
      '6': {width: 4, data: [[0,0,1,3], [1,1,2,2]]},
      '7': {width: 4, data: [[0,0,2,1], [2,0,1,3]]},
      '8': {width: 4, data: [[1,0,2,1], [0,1,3,2]]},
      '9': {width: 4, data: [[0,0,3,2], [2,2,1,1]]},
      ':': {width: 2, data: [[0,0,1,1], [0,2,1,1]]},
      '<': {width: 3, data: [[0,1,1,1], [1,0,1,1], [1,2,1,1]]},
      '=': {width: 4, data: [[0,0,3,1], [0,2,3,1]]},
      '>': {width: 3, data: [[0,0,1,1], [0,2,1,1], [1,1,1,1]]},
      '?': {width: 3, data: [[0,0,2,1], [1,2,1,1]]},
      'A': {width: 4, data: [[0,1,1,2], [1,0,1,2], [2,1,1,2]]},
      'B': {width: 4, data: [[0,0,2,1], [0,1,3,2]]},
      'C': {width: 4, data: [[0,0,3,1], [0,1,1,1], [0,2,3,1]]},
      'D': {width: 4, data: [[0,0,2,1], [0,1,1,1], [2,1,1,1], [0,2,2,1]]},
      'E': {width: 4, data: [[0,0,2,3], [2,0,1,1], [2,2,1,1]]},
      'F': {width: 4, data: [[0,0,1,3], [1,0,1,2], [2,0,1,1]]},
      'G': {width: 4, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1], [2,1,1,2]]},
      'H': {width: 4, data: [[0,0,1,3], [1,1,1,1], [2,0,1,3]]},
      'I': {width: 2, data: [[0,0,1,3]]},
      'J': {width: 4, data: [[0,1,1,2], [1,2,1,1], [2,0,1,3]]},
      'K': {width: 4, data: [[0,0,1,3], [1,1,1,1], [2,0,1,1], [2,2,1,1]]},
      'L': {width: 4, data: [[0,0,1,3], [1,2,2,1]]},
      'M': {width: 4, data: [[0,0,1,3], [1,0,1,2], [2,0,1,3]]},
      'N': {width: 4, data: [[0,0,1,3], [1,0,1,1], [2,0,1,3]]},
      'O': {width: 4, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1], [2,0,1,3]]},
      'P': {width: 4, data: [[0,0,3,2], [0,2,1,1]]},
      'Q': {width: 4, data: [[0,0,3,2], [2,2,1,1]]},
      'R': {width: 4, data: [[0,0,1,3], [1,0,2,1]]},
      'S': {width: 4, data: [[1,0,2,1], [1,1,1,1], [0,2,2,1]]},
      'T': {width: 4, data: [[0,0,3,1], [1,1,1,2]]},
      'U': {width: 4, data: [[0,0,1,3], [1,2,1,1], [2,0,1,3]]},
      'V': {width: 4, data: [[0,0,1,2], [1,2,1,1], [2,0,1,2]]},
      'W': {width: 4, data: [[0,0,1,3], [1,1,1,2], [2,0,1,3]]},
      'X': {width: 4, data: [[0,0,1,1], [0,2,1,1], [1,1,1,1], [2,0,1,1], [2,2,1,1]]},
      'Y': {width: 4, data: [[0,0,1,1], [1,1,1,2], [2,0,1,1]]},
      'Z': {width: 4, data: [[0,0,2,1], [1,1,1,1], [1,2,2,1]]},
      '[': {width: 3, data: [[0,0,1,3], [1,0,1,1], [1,2,1,1]]},
      '\\': {width: 4, data: [[[0,0,1,1], [1,1,1,1], [2,2,1,1]]]},
      ']': {width: 3, data: [[0,0,1,1], [0,2,1,1], [1,0,1,3]]},
      '^': {width: 4, data: [[0,1,1,1], [1,0,1,1], [2,1,1,1]]},
      '_': {width: 4, data: [[0,2,3,1]]},
      '‗': {width: 3, data: [[0,2,2,1]]}
    }
  } // constructor

  getCharData(char, bitMask, align, scale) {
    var validChar = char;
    if (!(char in this.fontsData)) {
      validChar = '?';
    }
    var charObject = {};
    charObject.width = this.fontsData[validChar].width*scale;

    charObject.data = [];
    for (var x = 0; x < this.fontsData[validChar].data.length; x++) {
      var piece = this.fontsData[validChar].data[x];
      if (align == 'left') {
          charObject.data.push([(piece[0]+1)*scale, piece[1]*scale, piece[2]*scale, piece[3]*scale]);
      } else {
          charObject.data.push([piece[0]*scale, piece[1]*scale, piece[2]*scale, piece[3]*scale]);
      }
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
