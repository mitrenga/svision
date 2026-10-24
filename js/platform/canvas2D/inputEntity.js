const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
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
   * @param {Object} options - Additional text/rendering options passed to TextEntity; `cursorChar` is the cursor's glyph ('‗'), `overwrite` the C64 editor's way (false: inserting, the ZX Spectrum's).
   */
  constructor(parentEntity, fonts, x, y, width, height, inputId, value, penColor, bkColor, maxLength, options) {
    super(parentEntity, fonts, x, y, width, height, '', penColor, bkColor, options);
    this.id = 'InputEntity';

    /** the cursor's glyph: the underline, or the block of the options' `cursorChar` (a C64 cursor); it blinks with the stack's flash state */
    this.cursorChar = (options && options.cursorChar) ? options.cursorChar : '‗';
    /**
     * ★ How the machine edits: false inserts before the cursor, which stands
     * between the characters (the ZX Spectrum's editor); true overwrites the
     * character the cursor stands on and appends at the end (the C64's screen
     * editor), the cursor showing that character in reverse while it blinks
     * and the block past the end of the text.
     */
    this.overwrite = !!(options && options.overwrite);
    this.inputId = inputId;
    this.value = value;
    this.cursor = value.length;
    this.maxLength = maxLength;
    this.text = this.composeText();
  } // constructor

  /**
   * The text as drawn: the value with the cursor in it — inserted as a
   * character of its own, or, when overwriting, in place of the character
   * under it while the flash is on (and appended at the end).
   * @returns {string}
   */
  composeText() {
    if (!this.overwrite) {
      return this.value.substring(0, this.cursor)+this.cursorChar+this.value.substring(this.cursor);
    }
    // overwriting: the block only past the end; on a character the cursor is the character in reverse (setInputLineColors)
    var on = this.app && this.app.stack && this.app.stack.flashState;
    if (this.cursor >= this.value.length) {
      return this.value+(on ? this.cursorChar : '');
    }
    return this.value;
  } // composeText

  /**
   * The cursor moved or the value changed: the drawn text and its colours anew.
   */
  refresh() {
    this.text = this.composeText();
    this.setInputLineColors();
    this.cleanCache();
  } // refresh
  
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
    var bkColorsMap = {};
    var on = this.app.stack.flashState;
    for (var ch = 0; ch < this.text.length; ch++) {
      penColorsMap[ch] = this.penColor;
      if (on && ch == this.cursor) {
        if (!this.overwrite) {
          // inserting: the cursor's own character goes invisible while the flash is on
          penColorsMap[ch] = this.bkColor;
        } else if (ch < this.value.length) {
          // overwriting: the character under the cursor in reverse, as the C64's cursor shows it
          penColorsMap[ch] = this.bkColor;
          bkColorsMap[ch] = this.penColor;
        }
      }
    }
    this.options.penColorsMap = penColorsMap;
    this.options.bkColorsMap = bkColorsMap;
    this.cleanCache();
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
            this.refresh();
            return true;
          case 'ArrowRight':
            this.cursor = Math.min(this.cursor+1, this.value.length);
            this.refresh();
            return true;
          case 'Backspace':
            if (this.cursor > 0) {
              this.value = this.value.substring(0, this.cursor-1)+this.value.substring(this.cursor);
              this.cursor--;
              this.refresh();
              this.sendEvent(0, 0, {id: 'changeInputValue', inputId: this.inputId});
            }
            return true;
          case 'Delete':
            if (this.cursor < this.value.length) {
              this.value = this.value.substring(0, this.cursor)+this.value.substring(this.cursor+1);
              this.refresh();
              this.sendEvent(0, 0, {id: 'changeInputValue', inputId: this.inputId});
            }
            return true;
          case 'Insert':
            // the C64's SHIFT + INST/DEL: a space pushed in at the cursor, the rest of the line moved right
            if (this.overwrite && this.cursor < this.value.length && this.value.length < this.maxLength) {
              this.value = this.value.substring(0, this.cursor)+' '+this.value.substring(this.cursor);
              this.refresh();
              this.sendEvent(0, 0, {id: 'changeInputValue', inputId: this.inputId});
            }
            return true;
          case 'Home':
            this.cursor = 0;
            this.refresh();
            return true;
          case 'Clear':
            // the C64's SHIFT + CLR/HOME: the whole line gone
            if (this.value.length > 0) {
              this.value = '';
              this.cursor = 0;
              this.refresh();
              this.sendEvent(0, 0, {id: 'changeInputValue', inputId: this.inputId});
            }
            return true;
          case 'End':
            this.cursor = this.value.length;
            this.refresh();
            return true;
          default:
            if (event.key.length == 1 && this.fonts.validChar(event.key)) {
              if (this.overwrite && this.cursor < this.value.length) {
                // the C64's editor: the character under the cursor is replaced
                this.value = this.value.substring(0, this.cursor)+event.key+this.value.substring(this.cursor+1);
              } else if (this.value.length < this.maxLength) {
                this.value = this.value.substring(0, this.cursor)+event.key+this.value.substring(this.cursor);
              } else {
                break;
              }
              this.cursor++;
              this.refresh();
              this.sendEvent(0, 0, {id: 'changeInputValue', inputId: this.inputId});
              return true;
            }
          }
        break;

      case 'changeFlashState':
        this.refresh();
        break;
    }

    return false;
  } // handleEvent

} // InputEntity
