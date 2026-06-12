/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
/**/
// begin code

/**
 * A multi-line text rendering entity. It lays out and draws bitmap-font text with
 * support for alignment (left/right/center/justify), word wrapping, per-glyph colors,
 * flashing animation, caching, and optional crop-to-parent clipping.
 */
export class TextEntity  extends AbstractEntity {

  /**
   * Creates a text entity.
   * @param {AbstractEntity} parentEntity - The parent entity this text is attached to.
   * @param {Object} fonts - The font set used to render the text.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Entity width.
   * @param {number} height - Entity height.
   * @param {string} text - The text to render.
   * @param {string|false} penColor - Foreground (text) color.
   * @param {string|false} bkColor - Background color.
   * @param {Object} options - Alignment, wrapping, margin, scale, and animation options.
   */
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

  /**
   * Initializes the entity and resolves default hover and click colors from the
   * stack configuration when they were not explicitly provided.
   */
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

  /**
   * Enables crop-to-parent rendering by creating a crop drawing cache.
   */
  enablePaintWithVisibility() {
    this.app.layout.newDrawingCropCache(this);
  } // enablePaintWithVisibility

  /**
   * Disables crop-to-parent rendering by discarding the crop drawing cache.
   */
  disablePaintWithVisibility() {
    this.drawingCropCache = null;
  } // disablePaintWithVisibility

  /**
   * Marks the text drawing cache as dirty so it is re-rendered on the next draw.
   */
  cleanCache() {
    this.drawingCache[0].cleanCache();
  } // cleanCache

  /**
   * Returns the rendered width of a single character at the current scale.
   * @param {string} char - The character to measure.
   * @returns {number} The character width in pixels.
   */
  charWidth(char) {
    return this.fonts.getCharData(char, '1', this.options.scale).width;
  } // charWidth

  /**
   * Computes the rendered width of a line of text including inter-character spacing.
   * @param {string} text - The line of text to measure.
   * @returns {number} The line width in pixels.
   */
  lineWidth(text) {
    var width = 0;
    for (var i = 0; i < text.length; i++) {
      if (i > 0) {
        width += this.fonts.charsSpacing;
      }
      width += this.charWidth(text[i]);
    }
    return width;
  } // lineWidth

  /**
   * Word-wraps a single line of text to the entity's available width, inserting
   * newlines and breaking at spaces where possible.
   * @param {string} text - The text to wrap.
   * @returns {string} The wrapped text with embedded newline characters.
   */
  wrapLine(text) {
    var wrappedText = '';
    var pos = 0;
    while (pos < text.length) {
      var lineW = 0;
      var lastSpacePos = -1;
      var lastPos = pos;
      while (pos < text.length) {
        if (text[pos] == ' ') {
          lastSpacePos = pos;
        }
        var w = this.charWidth(text[pos]);
        if (lineW+w > this.width-this.options.leftMargin-this.options.rightMargin) {
          break;
        }
        lineW += w+this.fonts.charsSpacing;
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
  
  /**
   * Determines the pen color for the glyph at the given index, applying flash-color
   * animation and any per-character color overrides.
   * @param {number} i - The character index within the text.
   * @returns {string|false} The color to use for the glyph.
   */
  glyphColor(i) {
    var penColor = this.penColor;
    if (this.options.animationMode == 'flashPenColor' && this.app.stack.flashState) {
      penColor = this.options.flashColor;
    }
    if (this.options.penColorsMap !== false && (i in this.options.penColorsMap)) {
      penColor = this.options.penColorsMap[i];
    }
    return penColor;
  } // glyphColor

  /**
   * Returns the font mask variant for the glyph at the given index, selecting the
   * reverse mask while a flash-reverse-colors animation is active.
   * @param {number} i - The character index within the text.
   * @returns {string} The mask key ('0' for reversed, '1' for normal).
   */
  glyphMask(i) {
    if (this.options.animationMode == 'flashReverseColors' && this.app.stack.flashState == true
        && (this.options.flashMask === false || this.options.flashMask[i] == '#')) {
      return '0';
    }
    return '1';
  } // glyphMask

  /**
   * Paints a single glyph's pixel rectangles into the drawing cache at the given base
   * X position and current cursor Y.
   * @param {Object} charData - The glyph data containing its pixel rectangle list.
   * @param {number} baseX - The X position at which to draw the glyph.
   * @param {string} penColor - The color to paint the glyph with.
   */
  paintGlyph(charData, baseX, penColor) {
    for (var x = 0; x < charData.data.length; x++) {
      this.app.layout.paintRect(this.drawingCache[0].ctx, baseX+charData.data[x][0], this.cursorY+charData.data[x][1], charData.data[x][2], charData.data[x][3], penColor);
    }
  } // paintGlyph

  /**
   * Advances the cursor to the next line and extracts the text of that line from the
   * formatted text, applying paragraph spacing after a wrapped space break.
   * @param {string} formattedText - The full, already-formatted text.
   * @param {number} textPos - The current parse position within the formatted text.
   * @param {string} partText - The text of the line just rendered.
   * @returns {Object} An object {text, pos} with the next line's text and updated position.
   */
  nextLine(formattedText, textPos, partText) {
    var moveY = (this.fonts.charsHeight+this.fonts.lineSpacing)*this.options.scale;
    if (this.options.textWrap && partText == ' ') {
      moveY = (this.fonts.paragraphSpacing-this.fonts.lineSpacing)*this.options.scale;
    }
    var text = '';
    if (textPos < formattedText.length) {
      this.cursorY += moveY;
      text = formattedText.substr(textPos);
      var nlPos = text.indexOf('\n');
      if (nlPos >= 0) {
        text = formattedText.substr(textPos, nlPos);
        if (text == '') {
          text = ' ';
        }
      }
      textPos += text.length+1;
    }
    return {text: text, pos: textPos};
  } // nextLine

  /**
   * Lays out and renders the text into the cache when needed (applying wrapping and
   * the configured alignment) and draws the cached image to the main canvas, cropping
   * to the parent bounds when crop rendering is enabled.
   */
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
      var lineOffset = 0;   // absolute char index of the current line's start within formattedText

      switch (this.options.align) {
        case 'left': 
        case 'center':
        case 'justify':
          while (partText.length > 0) {
            this.cursorX = 0;

            var textWidth = 0;
            if (this.options.align == 'center' || this.options.align == 'justify') {
              textWidth = this.lineWidth(partText);
              if (this.options.align == 'center' && textWidth < this.width) {
                this.cursorX = Math.floor(this.width/2)-Math.floor(textWidth/2)-this.options.leftMargin;
              }
            }

            var filling = 0;
            var spaces = 0;
            if (this.options.align == 'justify') {
              if (formattedText.length > textPos && formattedText[textPos] != '\n') {
                filling = this.width-this.options.leftMargin-this.options.rightMargin-textWidth;
                spaces = partText.split(' ').length+partText.split('\u00A0').length-2;
              }
            }

            for (var ch = 0; ch < partText.length; ch++) {
              var charData = this.fonts.getCharData(partText[ch], this.glyphMask(lineOffset+ch), this.options.scale);
              this.paintGlyph(charData, this.cursorX+this.options.leftMargin, this.glyphColor(lineOffset+ch));
              this.cursorX += charData.width+this.fonts.charsSpacing;

              if (filling > 0 && (partText[ch] == ' ' || partText[ch] == '\u00A0')) {
                var useFilling = Math.round(filling/spaces);
                this.cursorX += useFilling;
                filling -= useFilling;
                spaces--;
              }
            }

            lineOffset += partText.length+1;
            var ln = this.nextLine(formattedText, textPos, partText);
            partText = ln.text;
            textPos = ln.pos;
          }
          break;

        case 'right': 
          while (partText.length > 0) {
            this.cursorX = this.width;
            for (var ch = partText.length-1; ch >= 0; ch--) {
              var charData = this.fonts.getCharData(partText[ch], this.glyphMask(lineOffset+ch), this.options.scale);
              this.cursorX -= charData.width;
              if (ch < partText.length-1) {
                this.cursorX -= this.fonts.charsSpacing;
              }
              this.paintGlyph(charData, this.cursorX-this.options.rightMargin, this.glyphColor(lineOffset+ch));
            }

            lineOffset += partText.length+1;
            var ln = this.nextLine(formattedText, textPos, partText);
            partText = ln.text;
            textPos = ln.pos;
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

  /**
   * Handles events affecting the text: re-renders on flash-state changes when an
   * animation mode is active, and marks the entity hovered on mouseHover within bounds.
   * @param {Object} event - The input event to process.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
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
