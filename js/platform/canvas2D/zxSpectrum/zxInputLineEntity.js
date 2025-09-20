/**/
const { ZXTextEntity } = await import('./zxTextEntity.js?ver='+window.srcVersion);
/*/
import ZXTextEntity from './zxTextEntity.js';
/**/
// begin code

export class ZXInputLineEntity extends ZXTextEntity {

  constructor(app, parentEntity, x, y, width, height, value, penColor, bkColor, fontType, proportional, maxLength) {
    super(parentEntity, x, y, width, height, '', penColor, bkColor, fontType, proportional);
    this.id = 'ZXInputLineEntity';

    this.app = app;
    this.cursorChar = '¨';
    this.text = value+this.cursorChar;
    this.value = value;
    this.cursor = value.length;
    this.textColor = penColor;
    this.inputColor = bkColor;
    this.maxLength = maxLength;
  } // constructor
  
  init() {
    super.init();
    this.setInputLineColors();
  } // init

  setInputLineColors() {
    this.penColorsMap = {};
    for (var ch = 0; ch < this.getTextLength(); ch++) {
      if (this.app.stack.flashState && ch == this.cursor) {
        this.penColorsMap[ch] = this.inputColor;
      } else {
        this.penColorsMap[ch] = this.textColor;
      }
    }
    this.drawingCache[0].cleanCache();
  } // setInputLineColors

  handleEvent(event) {
    switch (event.id) { 
      case 'keyPress':
        switch (event.key) {
          case 'ArrowLeft':
            this.cursor = Math.max(this.cursor-1, 0);
            this.text = this.value.substring(0, this.cursor)+this.cursorChar+this.value.substring(this.cursor);
            this.setInputLineColors();
            this.drawingCache[0].cleanCache();
            return true;
          case 'ArrowRight':
            this.cursor = Math.min(this.cursor+1, this.value.length);
            this.text = this.value.substring(0, this.cursor)+this.cursorChar+this.value.substring(this.cursor);
            this.setInputLineColors();
            this.drawingCache[0].cleanCache();
            return true;
          case 'Backspace':
            if (this.cursor > 0) {
              this.text = this.value.substring(0, this.cursor-1)+this.cursorChar+this.value.substring(this.cursor);
              this.value = this.value.substring(0, this.cursor-1)+this.value.substring(this.cursor);
              this.cursor--;
              this.setInputLineColors();
              this.drawingCache[0].cleanCache();
            }
            return true;
          case 'Delete':
            if (this.cursor < this.value.length) {
              this.text = this.value.substring(0, this.cursor)+this.cursorChar+this.value.substring(this.cursor+1);
              this.value = this.value.substring(0, this.cursor)+this.value.substring(this.cursor+1);
              this.setInputLineColors();
              this.drawingCache[0].cleanCache();
            }
            return true;
          case 'Home':
            this.cursor = 0;
            this.text = this.cursorChar+this.value;
            this.setInputLineColors();
            this.drawingCache[0].cleanCache();
            return true;
          case 'End':
            this.cursor = this.value.length;
            this.text = this.value+this.cursorChar;
            this.setInputLineColors();
            this.drawingCache[0].cleanCache();
            return true;
          default:
            if (this.value.length < this.maxLength && event.key.length == 1 && this.zxFonts.chars.indexOf(event.key) >= 0) {
              this.text = this.value.substring(0, this.cursor)+event.key+this.cursorChar+this.value.substring(this.cursor);
              this.value = this.value.substring(0, this.cursor)+event.key+this.value.substring(this.cursor);
              this.cursor++;
              this.setInputLineColors();
              this.drawingCache[0].cleanCache();
              return true;
            }
          }
        break;

      case 'changeFlashState':
        this.setInputLineColors();
        break;
    }

    return super.handleEvent(event);
  } // handleEvent

} // class ZXInputLineEntity

export default ZXInputLineEntity;
