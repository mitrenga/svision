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
      textWrap: false,        // true, false
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

    if ('member' in options) {
      this.member = options.member;
    }
    if ('group' in options) {
      this.group = options.group;
    }
    if ('hide' in options) {
      this.hide = options.hide;
    }
    if ('hoverColor' in options) {
      this.hoverColor = options.hoverColor;
    }
    if ('clickColor' in options) {
      this.clickColor = options.clickColor;
    }

    this.app.layout.newDrawingCache(this, 0);
    this.cursorX = 0;
    this.cursorY = 0;
  } // constructor

  init() {
    super.init();

    if (this.hoverColor === false) {
      if (this.id in this.stack) {
        if ('hoverColor' in this.stack[this.id]) {
          if (this.bkColor in this.stack[this.id].hoverColor) {
            this.hoverColor = this.stack[this.id].hoverColor[this.bkColor];
          }
        }
      }
    }

    if (this.clickColor === false) {
      if (this.id in this.stack) {
        if ('clickColor' in this.stack[this.id]) {
          if (this.bkColor in this.stack[this.id].clickColor) {
            this.clickColor = this.stack[this.id].clickColor[this.bkColor];
          }
        }
      }
    }
  } // init

  enablePaintWithVisibility() {
    this.app.layout.newDrawingCropCache(this);
  } // enablePaintWithVisibility

  disablePaintWithVisibility() {
    this.drawingCropCache = null;
  } // disablePaintWithVisibility

  cleanCache() {
    this.drawingCache[0].cleanCache();
  } // cleanCache
  
  wrapLine(text) {
    var wrappedText = '';
    var pos = 0;
    while (pos < text.length) {
      var lineWidth = 0;
      var lastSpacePos = -1;
      var lastPos = pos;
      while (pos < text.length) {
        if (text[pos] == ' ') {
          lastSpacePos = pos;
        }
        var charData = this.fonts.getCharData(text[pos], '1', this.options.scale);
        if (lineWidth+charData.width > this.width-this.options.leftMargin-this.options.rightMargin) {
          break;
        }
        lineWidth += charData.width+this.fonts.charsSpacing;
        pos++;
      }
      if (pos < text.length && lastSpacePos >= 0) {
        wrappedText += text.substr(lastPos, lastSpacePos-lastPos)+'\n';
        pos = lastSpacePos+1;
      }
      else {
        wrappedText += text.substr(lastPos, pos-lastPos)+'\n';
      }
    }
    return wrappedText;
  } // wrapLine
  
  drawEntity() {
    super.drawEntity();

    if (this.drawingCache[0].needToRefresh(this, this.width, this.height)) {
      this.cursorY = this.options.topMargin;

      var formattedText = this.text;
      if (this.options.textWrap == true) {
        formattedText = '';
        var prevPos = -1;
        var nlPos = this.text.indexOf('\n');
        while (nlPos >= 0) {
          formattedText += this.wrapLine(this.text.substr(prevPos+1, nlPos-prevPos))+'\n';
          prevPos = nlPos;
          nlPos = this.text.indexOf('\n', prevPos+1);
        }
        if (prevPos < this.text.length) {
          formattedText += this.wrapLine(this.text.substr(prevPos+1));
        }
      }

      var partText = formattedText;
      var nlPos = formattedText.indexOf('\n');
      if (nlPos >= 0) {
        partText = formattedText.substr(0, nlPos); 
      }
      var textPos = partText.length+1;

      switch (this.options.align) {
        case 'left': 
        case 'center':
        case 'justify':
          while (partText.length > 0) {
            this.cursorX = 0;

            var textWidth = 0;
            if (this.options.align == 'center' || this.options.align == 'justify') {
              for (var ch = 0; ch < partText.length; ch++) {
                if (ch > 0) {
                  textWidth += this.fonts.charsSpacing;
                }
                textWidth += this.fonts.getCharData(partText[ch], '1', this.options.scale).width;
              }
              if (this.options.align == 'center' && textWidth < this.width) {
                this.cursorX = Math.floor(this.width/2)-Math.floor(textWidth/2)-this.options.leftMargin;
              }
            }

            var filling = 0;
            var spaces = 0;
            if (this.options.align == 'justify') {
              if (formattedText.length > textPos && formattedText[textPos] != '\n') {
                filling = this.width-this.options.leftMargin-this.options.rightMargin-textWidth;
                spaces = partText.split(' ').length+partText.split(' ').length-2;
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

              if (filling > 0 && (partText[ch] == ' ' || partText[ch] == ' ')) {
                var useFilling = Math.round(filling/spaces);
                this.cursorX += useFilling;
                filling -= useFilling;
                spaces--;
              }
            }

            var moveY = (this.fonts.charsHeight+this.fonts.lineSpacing)*this.options.scale;
            if (this.options.textWrap && partText == ' ') {
              moveY = (this.fonts.paragraphSpacing-this.fonts.lineSpacing)*this.options.scale;
            }

            partText = '';
            if (textPos <  formattedText.length) {
              this.cursorY += moveY;
              partText = formattedText.substr(textPos);
              nlPos = partText.indexOf('\n');
              if (nlPos >= 0) {
                partText = formattedText.substr(textPos, nlPos);
                if (partText == '') {
                  partText = ' ';
                }
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

            var moveY = (this.fonts.charsHeight+this.fonts.lineSpacing)*this.options.scale;
            if (this.options.textWrap && partText == ' ') {
              moveY = (this.fonts.paragraphSpacing-this.fonts.lineSpacing)*this.options.scale;
            }

            partText = '';
            if (textPos <  formattedText.length) {
              this.cursorY += moveY;
              partText = formattedText.substr(textPos);
              nlPos = partText.indexOf('\n');
              if (nlPos >= 0) {
                partText = formattedText.substr(textPos, nlPos);
                if (partText == '') {
                  partText = ' ';
                }
              }
              textPos += partText.length+1;
            }
          }
          break;
      }
    }

    if (this.drawingCropCache == null) {
      this.app.layout.paintCache(this, 0);
    } else {
      if ((this.x-this.parentCoverX >= 0) && (this.y-this.parentCoverY >= 0) && (this.x+this.width-1 <= this.parentWidth) && (this.y+this.height-1 <= this.parentHeight)) {
        this.app.layout.paintCache(this, 0);
      } else {
        var cropX = 0;
        if (this.x-this.parentCoverX < 0) {
          cropX = this.x-this.parentCoverX;
        }
        if (this.x+this.width > this.parentWidth) {
          cropX = this.x+this.width-this.parentWidth;
        }
        var cropY = 0;
        if (this.y-this.parentCoverY < 0) {
          cropY = this.y-this.parentCoverY;
        }
        if (this.y+this.height > this.parentHeight) {
          cropY = this.y+this.height-this.parentHeight;
        }
        this.app.layout.paintCropCache(this, 0, -cropX, -cropY, -cropX, -cropY);
      }
    }
  } // drawEntity

  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'changeFlashState':
        if (this.options.animationMode !== false) {
          this.cleanCache();
        }
        break;
      case 'mouseHover':
        if (!this.hide && this.hoverColor !== false) {
          if (this.pointOnEntity(event)) {
            this.app.inputEventsManager.mouseHover = this;
            this.hoverState = true;
            return true;
          }
        }
        break;
    }
    return false;
  } // handleEvent

} // TextEntity

export default TextEntity;
