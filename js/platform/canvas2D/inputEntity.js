/**/
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
/*/
import TextEntity from './textEntity.js';
/**/
// begin code

export class InputEntity extends TextEntity {

  constructor(parentEntity, fonts, x, y, width, height, value, penColor, bkColor, maxLength, options) {
    super(parentEntity, fonts, x, y, width, height, '', penColor, bkColor, options);
    this.id = 'InputEntity';

    this.cursorChar = '‗';
    this.text = value+this.cursorChar;
    this.value = value;
    this.cursor = value.length;
    this.maxLength = maxLength;
  } // constructor
  
  init() {
    super.init();
    this.setInputLineColors();
  } // init

  setInputLineColors() {
    var colorsMap = {};
    for (var ch = 0; ch < this.text.length; ch++) {
      if (this.app.stack.flashState && ch == this.cursor) {
        colorsMap[ch] = this.bkColor;
      } else {
        colorsMap[ch] = this.penColor;
      }
    }
    this.options.penColorsMap = colorsMap;
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
            if (this.value.length < this.maxLength && event.key.length == 1 && this.fonts.validChar(event.key)) {
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

} // class InputEntity

export default InputEntity;
