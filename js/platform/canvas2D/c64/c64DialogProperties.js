const { DialogProperties } = await import('../dialogs/dialogProperties.js?ver='+window.srcVersion);
// begin code

/**
 * The dialog properties of a Commodore 64 game: DialogProperties with the
 * 8x8 font of the machine (`app.fonts.c64Fonts8x8`; the ROM's second set
 * `c64Fonts8x8Lower` for the name input and its keyboard, lower case
 * included) everywhere and a window of
 * 288 x 176 (36 x 22 cells) centred on the 320 x 200 picture — the contents
 * lay themselves out in it (VolumeEntity). A thin wrapper (R-056); the
 * colours stay neutral, they are the game's — no two games share them.
 */
const C64_DIALOG_PROPERTIES_DEFAULTS = DialogProperties.platformDefaults({
  x: 16,
  y: 12,
  width: 288,
  height: 176,
  titleHeight: 10,
  fonts: 'c64Fonts8x8',
  theme: {labelFont: 'c64Fonts8x8', buttonFont: 'c64Fonts8x8', stepFont: 'c64Fonts8x8', buttonsBottomMargin: 0, inputBlockShift: 3, keyboardShift: -1, inputPrompt: false, counterFont: 'c64Fonts8x8', inputCursor: '█', inputOverwrite: true, inputFont: 'c64Fonts8x8Lower', keyboardFont: 'c64Fonts8x8Lower', keyboardLabelFont: 'fonts3x3'},
  // the nested dialogs inside 286 x 165 of contents: the remap over the whole of the settings contents (false, see
  // DialogProperties; nine actions fit in the 8x8 font),
  // the gamepad list over the whole of them too (false), as many rows of 13 px as fit
  remapKeys: {x: false, y: false, width: false, height: false, titleHeight: 10, fonts: 'c64Fonts8x8'},
  selectingGamepad: {x: false, y: false, width: false, height: false, titleHeight: 10, fonts: 'c64Fonts8x8'},
  waitForAudioEvent: {x: 53, y: 50, width: 180, height: 66}
});

/**
 * The dialog properties of a Commodore 64 game; see DialogProperties for the
 * keys and the nested dialogs.
 */
export class C64DialogProperties extends DialogProperties {

  /**
   * Fills the properties in with the C64 defaults, key by key and in depth.
   * @param {Object} [properties] - The game's properties, any of the keys.
   * @param {string|false} [dialog] - A nested dialog whose defaults apply; false for the dialogs a game opens.
   * @returns {Object} A complete properties object, the caller's to alter.
   */
  static merge(properties, dialog = false) {
    return DialogProperties.merge(properties, dialog, C64_DIALOG_PROPERTIES_DEFAULTS);
  } // merge

  /**
   * The C64 defaults, a copy for the caller to alter.
   * @param {string|false} [dialog] - A nested dialog, see merge.
   * @returns {Object} The defaults.
   */
  static defaults(dialog = false) {
    return C64DialogProperties.merge({}, dialog);
  } // defaults

} // C64DialogProperties
