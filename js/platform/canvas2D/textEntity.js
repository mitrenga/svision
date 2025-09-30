/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
/**/
// begin code

export class TextEntity  extends AbstractEntity {

  constructor(parentEntity, fonts, x, y, width, height, text, penColor, bkColor, options) {
    super(parentEntity, x, y, width, height, penColor, bkColor);
    this.id = 'TextEntity';

    this.fonts = fonts;
    this.text = text;

    this.options = {
      justify: 'left',        // left, right, center
      margin: 0,              // left + top
      scale: 1,               // 1, 2, 3 ...
      animationMode: false,   // flashReverseColors, flashPenColor
      flashColor: false,      // for flashPenColor
      flashMask: false,       // like '   ##   '
      penColorsMap: false     // like {0: color, 1: color, ...}
    };
    Object.keys(options).forEach(key => {
      if (key in this.options) {
        this.options[key] = options[key];
      } else {
        console.error('Invalid option -> '+key+':'+options[key]);
        console.trace();
      }
    });

    this.app.layout.newDrawingCache(this, 0);
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
        if (this.options.animationMode !== false) {
          this.drawingCache[0].cleanCache();
        }
        break;
    }
    return super.handleEvent(event);
  } // handleEvent
  
  drawEntity() {
    if (this.drawingCache[0].needToRefresh(this, this.width, this.height)) {
      if (this.bkColor != false) {
        this.app.layout.paintRect(this.drawingCache[0].ctx, 0, 0, this.width, this.height, this.bkColor);
      }
      switch (this.options.justify) {
        case 'left': 
        case 'center': 
          this.cursorX = 0;
          var textLength = 0;
          if (this.options.justify == 'center') {
            for (var ch = 0; ch < this.text.length; ch++) {
              textLength += this.fonts.getCharData(this.text[ch], '1', this.options.justify, this.options.scale).width;
            }
            if (textLength < this.width) {
              this.cursorX = Math.floor(this.width/2-textLength/2-this.options.margin/4*3);
            }
          }
          for (var ch = 0; ch < this.text.length; ch++) {
            var penColor = this.penColor;
            switch (this.options.animationMode) {
              case 'flashPenColor':
                if (this.app.stack.flashState) {
                  penColor = this.options.flashColor;
                }
                break;
            }
            if ((this.options.penColorsMap !== false) && (ch in this.options.penColorsMap)) {
              penColor = this.options.penColorsMap[ch];
            }
            var bitMask = '1';
            if (this.options.animationMode == 'flashReverseColors') {
              if ((this.options.flashMask === false || this.options.flashMask[ch] == '#') && this.app.stack.flashState == true) {
                bitMask = '0';
              }
            }
            var charData = this.fonts.getCharData(this.text[ch], bitMask, this.options.justify, this.options.scale);
            for (var x = 0; x < charData.data.length; x++) {
              this.app.layout.paintRect(this.drawingCache[0].ctx, this.cursorX+this.options.margin+charData.data[x][0], this.options.margin+charData.data[x][1], charData.data[x][2], charData.data[x][3], penColor);
            }
            this.cursorX += charData.width;
          }
          break;
        case 'right': 
          this.cursorX = this.width;
          for (var ch = this.text.length; ch > 0 ; ch--) {
            var penColor = this.penColor;
            switch (this.options.animationMode) {
              case 'flashPenColor':
                if (this.app.stack.flashState) {
                  penColor = this.options.flashColor;
                }
                break;
            }
            if ((this.options.penColorsMap !== false) && ((ch-1) in this.options.penColorsMap)) {
              penColor = this.options.penColorsMap[ch-1];
            }
            var bitMask = '1';
            if (this.options.animationMode == 'flashReverseColors') {
              if ((this.options.flashMask === false || this.options.flashMask[ch] == '#') && this.app.stack.flashState == true) {
                bitMask = '0';
              }
            }
            var charData = this.fonts.getCharData(this.text[ch-1], bitMask, this.options.justify, this.options.scale);
            this.cursorX -= charData.width;
            for (var x = 0; x < charData.data.length; x++) {
              this.app.layout.paintRect(this.drawingCache[0].ctx, this.cursorX-this.options.margin+charData.data[x][0], this.options.margin+charData.data[x][1], charData.data[x][2], charData.data[x][3], penColor);
            }
          }
          break;
      }
    }

    this.app.layout.paintCache(this, 0);
  } // drawEntity

} // class TextEntity

export default TextEntity;
