/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
/**/
// begin code

export class TextEntity  extends AbstractEntity {

  constructor(parentEntity, x, y, width, height) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'TextEntity';

    this.app.layout.newDrawingCache(this, 0);

    this.margin = 0; // left + top
    this.justify = 0; // 0 - left, 1 - right, 2 - center
    this.proportional = false;
    this.penColorsMap = false;
    this.flashMask = false;
    this.cursorX = 0;
  } // constructor

  setText(text) {
    if (this.text != text) {
      this.text = text;
      this.drawingCache[0].cleanCache();
    }
  } // setText

  setPenColor(color) {
    this.penColor = color;
    this.drawingCache[0].cleanCache();
  } // setPenColor

  setBkColor(color) {
    this.bkColor = color;
    this.drawingCache[0].cleanCache();
  } // setBkColor

  handleEvent(event) {
    switch (event.id) {
      case 'changeFlashState':
        if (this.flashMask) {
          this.drawingCache[0].cleanCache();
        }
        break;
    }
    return super.handleEvent(event);
  } // handleEvent

  getTextChar(position) {
    return ' ';
  } // getTextChar

  getTextLength() {
    return 1;
  } // getTextLength

  getPenColorChar(position) {
    return false;
  } // getPenColorChar

  getCharData(char, bitMask) {
    var charObject = {'width': 8, 'height': 8, 'data': ['00110011', '00110011', '11001100', '11001100', '00110011', '00110011', '11001100', '11001100']};
    return charObject;
  } // getCharData
  
  drawEntity() {
    if (this.drawingCache[0].needToRefresh(this, this.width, this.height)) {
      if (this.bkColor != false) {
        this.app.layout.paintRect(this.drawingCache[0].ctx, 0, 0, this.width, this.height, this.bkColor);
      }
      switch (this.justify) {
        case 0: 
        case 2: 
          this.cursorX = 0;
          if (this.proportional == true) {
            this.cursorX++;
          }
          var textLength = 0;
          if (this.justify == 2) {
            for (var ch = 0; ch < this.text.length; ch++) {
              textLength += this.getCharData(this.getTextChar(ch), '1').width;
            }
            if (textLength < this.width) {
              this.cursorX = Math.floor(this.width/2-textLength/2-this.margin/4*3);
            }
          }
          for (var ch = 0; ch < this.getTextLength(); ch++) {
            if ((this.penColorsMap !== false) && (ch in this.penColorsMap)) {
              this.penColor = this.penColorsMap[ch];
            }
            var penColor = this.penColor;
            if (this.getPenColorChar(ch) !== false) {
              penColor = this.getPenColorChar(ch);
            }
            var bitMask = '1';
            if (this.flashMask !== false) {
              if ((this.flashMask[ch] == '#') && (this.app.stack.flashState == true)) {
                bitMask = '0';
              }
            }
            var charData = this.getCharData(this.getTextChar(ch), bitMask);
            for (var x = 0; x < charData.data.length; x++) {
              this.app.layout.paintRect(this.drawingCache[0].ctx, this.cursorX+this.margin+charData.data[x][0], this.margin+charData.data[x][1], charData.data[x][2], charData.data[x][3], penColor);
            }
            this.cursorX += charData.width;
          }
          break;
        case 1: 
          this.cursorX = this.width;
          if (this.proportional == true) {
            this.cursorX++;
          }
          for (var ch = this.getTextLength(); ch > 0 ; ch--) {
            if ((this.penColorsMap !== false) && ((ch-1) in this.penColorsMap)) {
              this.penColor = this.penColorsMap[ch-1];
            }
            var penColor = this.penColor;
            if (this.getPenColorChar(ch-1) !== false) {
              penColor = this.getPenColorChar(ch-1);
            }
            var bitMask = '1';
            if (this.flashMask !== false) {
              if ((this.flashMask[ch] == '#') && (this.app.stack.flashState == true)) {
                bitMask = '0';
              }
            }
            var charData = this.getCharData(this.getTextChar(ch-1), bitMask);
            this.cursorX -= charData.width;
            for (var x = 0; x < charData.data.length; x++) {
              this.app.layout.paintRect(this.drawingCache[0].ctx, this.cursorX-this.margin+charData.data[x][0], this.margin+charData.data[x][1], charData.data[x][2], charData.data[x][3], penColor);
            }
          }
          break;
      }
    }
    this.app.layout.paintCache(this, 0);
  } // drawEntity

} // class TextEntity

export default TextEntity;
