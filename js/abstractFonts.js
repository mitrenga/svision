/**/

/*/

/**/
// begin code

export class AbstractFonts {

  constructor(app) {
    this.id = 'AbstractFonts';

    this.app = app;
  } // constructor

  getCharData(char, bitMask, align, scale) {
    return {width: 0};
  } // getCharData

  validChar(char) {
    return false;
  } // validChar

} // class AbstractFonts

export default AbstractFonts;
