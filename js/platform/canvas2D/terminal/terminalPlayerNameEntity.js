const { TerminalDialogProperties } = await import('./terminalDialogProperties.js?ver='+window.srcVersion);
const { PlayerNameEntity } = await import('../dialogs/playerNameEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The text terminal look of PlayerNameEntity: the properties are completed
 * from TerminalDialogProperties, so the prompt, the input and the keys are in
 * the terminal's own font (`app.fonts.terminal`), and the keyboard types
 * capitals without SHIFT and small letters with it — a terminal of the era
 * wrote mostly in capitals. Every key is twice as wide as the plain layout
 * has it: a terminal's dot is usually taller than wide (`pixelAspect`), so
 * the square keys of the layout would stand as narrow upright bars. The
 * labels of the keys and of the buttons (CANCEL, OK) are a dot lower than
 * the plain layout centres them: the dialog centres the font's line, the
 * cell of 11 rows, and the glyph takes its top 8. A thin wrapper (R-056),
 * the constructor is PlayerNameEntity's.
 */
export class TerminalPlayerNameEntity extends PlayerNameEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {boolean} autoStartGame - Whether confirming the name should start the game immediately.
   * @param {Object} [properties] - The dialog properties, see TerminalDialogProperties.
   */
  constructor(parentEntity, x, y, width, height, autoStartGame, properties = {}) {
    super(parentEntity, x, y, width, height, autoStartGame, TerminalDialogProperties.merge(properties));
    this.id = 'TerminalPlayerNameEntity';
  } // constructor

  /** The dialog, then its buttons' labels a dot lower (see the class). */
  init() {
    super.init();
    this.entities.forEach((entity) => {
      if (entity.id == 'ButtonEntity') {
        entity.options.topMargin += 1;
      }
    });
  } // init

  /**
   * The plain layout with the letters' rows of the two layers swapped: the
   * capitals plain, the small letters with SHIFT; the digits and the
   * cursor keys stay where they are. Every key and the rows' shifts twice
   * as wide (see the class), and every label a dot lower: the glyph takes
   * the top 8 rows of its 11, so the label sits in the middle of its key.
   * @param {Object} fonts - See PlayerNameEntity#fonts.
   * @returns {Object} The layout for KeyboardEntity.
   */
  keyboardLayoutDefaults(fonts) {
    var layout = super.keyboardLayoutDefaults(fonts);
    var plain = layout.keymap[' '];
    var shifted = layout.keymap['⇧'];
    layout.keymap[' '] = [plain[0]].concat(shifted.slice(1));
    layout.keymap['⇧'] = [shifted[0]].concat(plain.slice(1));
    var buttons = layout.options.buttons;
    // the four arrows share one object of options: each object once
    var done = new Set();
    Object.keys(buttons).forEach((key) => {
      var button = buttons[key];
      if (done.has(button)) {
        return;
      }
      done.add(button);
      if (typeof button.width == 'number') {
        button.width *= 2;
      }
      button.topMargin = (button.topMargin || 0)+1;
    });
    layout.options.rows.forEach((row) => {
      row.shiftX *= 2;
    });
    return layout;
  } // keyboardLayoutDefaults

} // TerminalPlayerNameEntity
