/**/

/*/

/**/
// begin code

export class AbstractFonts {

  constructor(app) {
    this.id = 'AbstractFonts';

    this.app = app;
    this.charsSpacing = 0;
    this.lineSpacing = 0;
  } // constructor

  getCharData(char, bitMask, scale) {
    return {width: 0};
  } // getCharData

  validChar(char) {
    return false;
  } // validChar

} // class AbstractFonts

export default AbstractFonts;
