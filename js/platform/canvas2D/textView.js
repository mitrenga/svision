/**/
const { AbstractView } = await import('../../abstractView.js?ver='+window.srcVersion);
/*/
import AbstractView from '../../abstractView.js';
/**/
// begin code

export class TextView  extends AbstractView {

  constructor(parentView, x, y, width, height) {
    super(parentView, x, y, width, height, false, false);
    this.id = 'TextView';
  
    this.margin = 0; // left + top
    this.justify = 0; // 0 - left, 1 - right, 2 - center
    this.proportional = false;
  } // constructor

  getTextChar(position) {
    return ' ';
  } // getTextChar

  getTextLength() {
    return 1;
  } // getTextLength

  getPenColorChar(position) {
    return false;
  } // getPenColorChar

  getCharData(char, proportional) {
    var charObject = {'width': 8, 'height': 8, 'data': ['00110011', '00110011', '11001100', '11001100', '00110011', '00110011', '11001100', '11001100']};
    return charObject;
  } // getCharData
  
  drawView() {
    super.drawView();

    switch (this.justify) {
      case 0: 
      case 2: 
        var cursorX = 0;
        if (this.justify == 2 && this.text.length*8 < this.width && this.proportional == false) {
          cursorX = Math.floor(this.width/2)-this.text.length*4;
        }
        for (var ch = 0; ch < this.getTextLength(); ch++) {
          var penColor = this.penColor;
          if (this.getPenColorChar(ch) !== false) {
            penColor = this.getPenColorChar(ch);
          }
          var charData = this.getCharData(this.getTextChar(ch));
          for (var x = 0; x < charData['data'].length; x++) {
            this.app.layout.paint(this, cursorX+this.margin+charData['data'][x][0], this.margin+charData['data'][x][1], charData['data'][x][2], charData['data'][x][3], penColor);
          }
          cursorX += charData['width'];
        }
        break;
      case 1: 
        var cursorX = this.width;
        for (var ch = this.getTextLength(); ch > 0 ; ch--) {
          var penColor = this.penColor;
          if (this.getPenColorChar(ch-1) !== false) {
            penColor = this.getPenColorChar(ch-1);
          }
          var charData = this.getCharData(this.getTextChar(ch-1));
          for (var x = 0; x < charData['data'].length; x++) {
            this.app.layout.paint(this, cursorX-this.margin-charData['width']+charData['data'][x][0], this.margin+charData['data'][x][1], charData['data'][x][2], charData['data'][x][3], penColor);
          }
          cursorX -= charData['width'];
        }
        break;
      case 2:
        break;
      }
  } // drawView

} // class TextView

export default TextView;
