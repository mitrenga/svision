/**/
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
/*/
import TextEntity from './textEntity.js';
/**/
// begin code

/**
 * An editable single-line text input entity built on TextEntity. It maintains an
 * editable value and a cursor, renders a flashing cursor character, and emits
 * change events as the value is edited via the keyboard.
 */
export class InputEntity extends TextEntity {

  /**
   * Creates a text input entity.
   * @param {AbstractEntity} parentEntity - The parent entity this input is attached to.
   * @param {Object} fonts - The font set used to render the input text.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Input width.
   * @param {number} height - Input height.
   * @param {string} inputId - Identifier used in emitted change events.
   * @param {string} value - The initial input value.
   * @param {string|false} penColor - Foreground (text) color.
   * @param {string|false} bkColor - Background color.
   * @param {number} maxLength - Maximum number of characters allowed.
   * @param {Object} options - Additional text/rendering options passed to TextEntity.
   */
  constructor(parentEntity, fonts, x, y, width, height, inputId, value, penColor, bkColor, maxLength, options) {
    super(parentEntity, fonts, x, y, width, height, '', penColor, bkColor, options);
    this.id = 'InputEntity';

    this.cursorChar = '‗';
    this.text = value+this.cursorChar;
    this.inputId = inputId;
    this.value = value;
    this.cursor = value.length;
    this.maxLength = maxLength;
  } // constructor
  
  /**
   * Initializes the entity and applies the per-character pen colors for the input line.
   */
  init() {
    super.init();
    this.setInputLineColors();
  } // init

  /**
   * Builds the per-character pen color map, inverting the cursor character's color
   * while the flash state is active, and marks the draw cache dirty.
   */
  setInputLineColors() {
    var penColorsMap = {};
    for (var ch = 0; ch < this.text.length; ch++) {
      if (this.app.stack.flashState && ch == this.cursor) {
        penColorsMap[ch] = this.bkColor;
      } else {
        penColorsMap[ch] = this.penColor;
      }
    }
    this.options.penColorsMap = penColorsMap;
    this.drawingCache[0].cleanCache();
  } // setInputLineColors

  /**
   * Handles editing key events (arrows, Backspace, Delete, Home, End, and printable
   * characters) to move the cursor and modify the value, and refreshes colors on
   * flash-state changes. Emits a changeInputValue event when the value changes.
   * @param {Object} event - The input event to process.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

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
              this.sendEvent(0, 0, {id: 'changeInputValue', inputId: this.inputId});
            }
            return true;
          case 'Delete':
            if (this.cursor < this.value.length) {
              this.text = this.value.substring(0, this.cursor)+this.cursorChar+this.value.substring(this.cursor+1);
              this.value = this.value.substring(0, this.cursor)+this.value.substring(this.cursor+1);
              this.setInputLineColors();
              this.drawingCache[0].cleanCache();
              this.sendEvent(0, 0, {id: 'changeInputValue', inputId: this.inputId});
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
              this.sendEvent(0, 0, {id: 'changeInputValue', inputId: this.inputId});
              return true;
            }
          }
        break;

      case 'changeFlashState':
        this.setInputLineColors();
        break;
    }

    return false;
  } // handleEvent

} // InputEntity

export default InputEntity;
