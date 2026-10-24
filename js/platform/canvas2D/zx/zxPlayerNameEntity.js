const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
const { ZXDialogProperties } = await import('./zxDialogProperties.js?ver='+window.srcVersion);
const { PlayerNameEntity } = await import('../dialogs/playerNameEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The ZX Spectrum look of PlayerNameEntity: the properties are completed from
 * ZXDialogProperties (Manic Miner's colours, the Spectrum's 8x8 for the
 * input and the keys, 3x3 for the key labels) and the keyboard is the
 * Spectrum's — 16 px keys, CAPS SHIFT and SYMBOL SHIFT (bright red) with the
 * widths of the original dialog, the arrows of the 5x5 font on the number
 * row of the shift layer. A thin wrapper (R-056): the game's
 * `theme.keyboardLayout` still alters it (Sabre Wulf narrows the keys).
 */
export class ZXPlayerNameEntity extends PlayerNameEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {boolean} autoStartGame - Whether confirming the name should start the game immediately.
   * @param {Object} [properties] - The dialog properties, see ZXDialogProperties.
   */
  constructor(parentEntity, x, y, width, height, autoStartGame, properties = {}) {
    super(parentEntity, x, y, width, height, autoStartGame, ZXDialogProperties.merge(properties));
    this.id = 'ZXPlayerNameEntity';
  } // constructor

  /**
   * The Spectrum's keyboard as the dialog had it: the plain layout's rows and
   * layers with the machine's shift keys over them.
   * @param {Object} fonts - See PlayerNameEntity#fonts.
   * @returns {Object} The layout for KeyboardEntity.
   */
  keyboardLayoutDefaults(fonts) {
    var layout = super.keyboardLayoutDefaults(fonts);
    var arrow = {fonts: this.app.fonts.fonts5x5, topMargin: 6};
    Object.assign(layout.options.buttons, {
      default: Object.assign(layout.options.buttons.default, {width: 16, height: 16, topMargin: 4}),
      '←': arrow, '↓': arrow, '↑': arrow, '→': arrow,
      '⌫': {label: 'DELETE', width: 25, fonts: fonts.keyLabels, topMargin: 7},
      '⏎': {label: 'ENTER', width: 23, fonts: fonts.keyLabels, topMargin: 7},
      '⇧': {label: 'CAPS\nSHIFT', width: 23, fonts: fonts.keyLabels},
      '⌥': {label: 'SYMBOL\nSHIFT', width: 25, penColor: ZXColor.brightRed, fonts: fonts.keyLabels},
      ' ': {label: 'SPACE', width: 25, fonts: fonts.keyLabels, topMargin: 7}
    });
    layout.options.rows = [{shiftX: 0}, {shiftX: 9}, {shiftX: 18}, {shiftX: 0}];
    return layout;
  } // keyboardLayoutDefaults

} // ZXPlayerNameEntity
