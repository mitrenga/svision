const { DialogProperties } = await import('../dialogs/dialogProperties.js?ver='+window.srcVersion);
// begin code

/**
 * The dialog properties of a text terminal: DialogProperties with the
 * terminal's own font everywhere — labels, buttons, the volume steps, the
 * name input, its counter and keyboard — under the name `terminal` in
 * `app.fonts` (a {@link TerminalFont}), the block '█' as the input cursor and
 * the nested dialogs over the whole of the contents that open them, as the
 * C64 wrapper has them. A thin wrapper (R-056); the colours stay neutral,
 * they are the game's — a terminal has one foreground and one background.
 *
 * A terminal has no fixed size (R-061), so the windows are not given here in
 * pixels: {@link TerminalDialogProperties.cells} turns a rectangle of cells
 * into one, so that a window, a menu or a heading stands on the grid the
 * terminal draws its characters in. {@link TerminalDialogProperties.menuOptions}
 * gives a MenuEntity the same grid: a row a cell high, the label a cell in,
 * the selection as reverse video.
 *
 * ```js
 * var font = app.fonts.terminal;
 * app.dialogProperties = TerminalDialogProperties.merge(Object.assign(
 *   TerminalDialogProperties.cells(font, 10, 4, 60, 16),
 *   {bkColor: '#000000', theme: {penColor: '#00c000'}}));
 * ```
 */
const TERMINAL_DIALOG_PROPERTIES_DEFAULTS = DialogProperties.platformDefaults({
  titleHeight: 11,
  fonts: 'terminal',
  theme: {labelFont: 'terminal', buttonFont: 'terminal', stepFont: 'terminal', counterFont: 'terminal',
    inputFont: 'terminal', keyboardFont: 'terminal', keyboardLabelFont: 'terminal', inputPrompt: false,
    inputCursor: '█', inputOverwrite: false, buttonsBottomMargin: 0},
  // the nested dialogs over the whole of the contents that open them (false, see DialogProperties)
  remapKeys: {x: false, y: false, width: false, height: false, titleHeight: 11, fonts: 'terminal'},
  selectingGamepad: {x: false, y: false, width: false, height: false, titleHeight: 11, fonts: 'terminal'},
  waitForAudioEvent: {titleHeight: 11, fonts: 'terminal'}
});

/**
 * The dialog properties of a terminal game; see DialogProperties for the keys
 * and the nested dialogs.
 */
export class TerminalDialogProperties extends DialogProperties {

  /**
   * Fills the properties in with the terminal defaults, key by key and in depth.
   * @param {Object} [properties] - The game's properties, any of the keys.
   * @param {string|false} [dialog] - A nested dialog whose defaults apply; false for the dialogs a game opens.
   * @returns {Object} A complete properties object, the caller's to alter.
   */
  static merge(properties, dialog = false) {
    return DialogProperties.merge(properties, dialog, TERMINAL_DIALOG_PROPERTIES_DEFAULTS);
  } // merge

  /**
   * The terminal defaults, a copy for the caller to alter.
   * @param {string|false} [dialog] - A nested dialog, see merge.
   * @returns {Object} The defaults.
   */
  static defaults(dialog = false) {
    return TerminalDialogProperties.merge({}, dialog);
  } // defaults

  /**
   * A rectangle of cells in pixels of the desktop.
   * @param {TerminalFont} font - The terminal's font; its cell is the unit.
   * @param {number} col - The first column.
   * @param {number} row - The first row (the desktop's: a status line on top is row 0).
   * @param {number} cols - How many columns.
   * @param {number} rows - How many rows.
   * @returns {Object} `{x, y, width, height}`.
   */
  static cells(font, col, row, cols, rows) {
    return {x: col*font.cellWidth, y: row*font.cellHeight, width: cols*font.cellWidth, height: rows*font.cellHeight};
  } // cells

  /**
   * The options of a MenuEntity on the terminal's grid: a row a cell high
   * (`pitch` rows apart), the label a cell in from the bar's edge, the value
   * column `valueCols` wide and a cell in from the other edge, and the
   * selection in reverse video — the background's colour on a bar of the
   * foreground's, as a terminal without attributes would show it.
   * @param {TerminalFont} font - The terminal's font.
   * @param {string} foreground - The terminal's foreground '#rrggbb'.
   * @param {string} background - Its background.
   * @param {Object} [changes] - Any MenuEntity option over these (`pitch`, `valueCols` included).
   * @returns {Object} The options.
   */
  static menuOptions(font, foreground, background, changes = {}) {
    var pitch = changes.pitch || 1;
    var valueCols = ('valueCols' in changes) ? changes.valueCols : 8;
    var options = {
      fonts: font,
      itemHeight: font.cellHeight,
      itemPitch: pitch*font.cellHeight,
      t1LeftMargin: font.cellWidth,
      t1TopMargin: 0,
      t2Width: (valueCols+1)*font.cellWidth,
      t2RightMargin: font.cellWidth,
      t2TopMargin: 0,
      textColor: foreground,
      selectionTextColor: background,
      selectionBarColor: foreground,
      hoverColor: foreground+'30',
      selectionHoverColor: foreground+'d0',
      clickColor: foreground+'50',
      selectionClickColor: foreground+'a0'
    };
    Object.keys(changes).forEach((key) => {
      if (key != 'pitch' && key != 'valueCols') {
        options[key] = changes[key];
      }
    });
    return options;
  } // menuOptions

} // TerminalDialogProperties
