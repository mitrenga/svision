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
      align: 'left',          // left, right, center
      margin: 0,              // global margins -> sets leftMargin, rightMargin, topMargin, bottomMargin
      leftMargin: 0,          // left margin
      rightMargin: 0,         // right margin
      topMargin: 0,           // vertical margin
      bottomMargin: 0,        // bottom margin
      scale: 1,               // 1, 2, 3 ...
      animationMode: false,   // flashReverseColors, flashPenColor
      flashColor: false,      // for flashPenColor
      flashMask: false,       // like '   ##   '
      penColorsMap: false     // like {0: color, 1: color, ...}
    };
    Object.keys(options).forEach(key => {
      if (key in this.options) {
        this.options[key] = options[key];
      }
    });
    if (this.options.margin != 0) {
      this.options.leftMargin = this.options.margin;
      this.options.rightMargin = this.options.margin;
      this.options.topMargin = this.options.margin;
      this.options.bottomMargin = this.options.margin;
    }

    this.app.layout.newDrawingCache(this, 0);
    this.cursorX = 0;
    this.cursorY = 0;
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
      this.cursorY = this.options.topMargin;
      var partText = this.text;
      var nlPos = this.text.indexOf('\n');
      if (nlPos >= 0) {
        partText = this.text.substr(0, nlPos); 
      }
      var textPos = partText.length+1;

      switch (this.options.align) {
        case 'left': 
        case 'center':
          while (partText.length > 0) {
            this.cursorX = 0;
            if (this.options.align == 'center') {
              var textWidth = 0;
              for (var ch = 0; ch < partText.length; ch++) {
                if (ch > 0) {
                  textWidth += this.fonts.charsSpacing;
                }
                textWidth += this.fonts.getCharData(partText[ch], '1', this.options.scale).width;
              }
              if (textWidth < this.width) {
                this.cursorX = Math.floor(this.width/2)-Math.floor(textWidth/2)-this.options.leftMargin;
              }
            }
            for (var ch = 0; ch < partText.length; ch++) {
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
              var charData = this.fonts.getCharData(partText[ch], bitMask, this.options.scale);
              for (var x = 0; x < charData.data.length; x++) {
                this.app.layout.paintRect(this.drawingCache[0].ctx, this.cursorX+this.options.leftMargin+charData.data[x][0], this.cursorY+charData.data[x][1], charData.data[x][2], charData.data[x][3], penColor);
              }
              this.cursorX += charData.width+this.fonts.charsSpacing;
            }
            partText = '';
            if (textPos < this.text.length) {
              this.cursorY += (this.fonts.charsHeight+this.fonts.lineSpacing)*this.options.scale;
              console.log(textPos);
              partText = this.text.substr(textPos);
              nlPos = partText.indexOf('\n');
              if (nlPos >= 0) {
                partText = this.text.substr(textPos, nlPos); 
              }
              textPos += partText.length+1;
            }
          }
          break;
        case 'right': 
          while (partText.length > 0) {
            this.cursorX = this.width;
            for (var ch = partText.length; ch > 0 ; ch--) {
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
              var charData = this.fonts.getCharData(partText[ch-1], bitMask, this.options.scale);
              this.cursorX -= charData.width;
              if (ch < partText.length) {
                this.cursorX -= this.fonts.charsSpacing;
              }
              for (var x = 0; x < charData.data.length; x++) {
                this.app.layout.paintRect(this.drawingCache[0].ctx, this.cursorX-this.options.rightMargin+charData.data[x][0], this.cursorY+charData.data[x][1], charData.data[x][2], charData.data[x][3], penColor);
              }
            }
            partText = '';
            if (textPos < this.text.length) {
              this.cursorY += (this.fonts.charsHeight+this.fonts.lineSpacing)*this.options.scale;
              console.log(textPos);
              partText = this.text.substr(textPos);
              nlPos = partText.indexOf('\n');
              if (nlPos >= 0) {
                partText = this.text.substr(textPos, nlPos); 
              }
              textPos += partText.length+1;
            }
          }
          break;
      }
    }

    this.app.layout.paintCache(this, 0);
  } // drawEntity

} // class TextEntity

export default TextEntity;
