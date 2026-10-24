const { DialogProperties } = await import('../dialogs/dialogProperties.js?ver='+window.srcVersion);
// begin code

/**
 * The dialog properties of an Atari 8-bit game: DialogProperties with the
 * 8x8 font of the machine (`app.fonts.atari8Fonts8x8`) everywhere and a window of
 * 288 x 176 (36 x 22 cells) centred on the 320 x 192 picture — the contents
 * lay themselves out in it (VolumeEntity). A thin wrapper (R-056); the
 * colours stay neutral, they are the game's — no two games share them.
 */
const ATARI8_DIALOG_PROPERTIES_DEFAULTS = DialogProperties.platformDefaults({
  x: 16,
  y: 8,
  width: 288,
  height: 176,
  titleHeight: 10,
  fonts: 'atari8Fonts8x8',
  theme: {labelFont: 'atari8Fonts8x8', buttonFont: 'atari8Fonts8x8', stepFont: 'atari8Fonts8x8', counterFont: 'atari8Fonts8x8', inputCursor: '█', inputFont: 'atari8Fonts8x8', keyboardFont: 'atari8Fonts8x8', keyboardLabelFont: 'fonts3x3'},
  // the nested dialogs inside 286 x 165 of contents: the remap tall enough for nine actions in the 8x8 font,
  // the gamepad list eight rows of 13 px in a 1 px frame inside the window's own frame
  remapKeys: {x: 3, y: 2, width: 280, height: 160, titleHeight: 10, fonts: 'atari8Fonts8x8'},
  selectingGamepad: {height: 108, titleHeight: 10, fonts: 'atari8Fonts8x8'},
  waitForAudioEvent: {x: 53, y: 50, width: 180, height: 66}
});

/**
 * The dialog properties of an Atari 8-bit game; see DialogProperties for the
 * keys and the nested dialogs.
 */
export class Atari8DialogProperties extends DialogProperties {

  /**
   * Fills the properties in with the Atari 8-bit defaults, key by key and in depth.
   * @param {Object} [properties] - The game's properties, any of the keys.
   * @param {string|false} [dialog] - A nested dialog whose defaults apply; false for the dialogs a game opens.
   * @returns {Object} A complete properties object, the caller's to alter.
   */
  static merge(properties, dialog = false) {
    return DialogProperties.merge(properties, dialog, ATARI8_DIALOG_PROPERTIES_DEFAULTS);
  } // merge

  /**
   * The Atari 8-bit defaults, a copy for the caller to alter.
   * @param {string|false} [dialog] - A nested dialog, see merge.
   * @returns {Object} The defaults.
   */
  static defaults(dialog = false) {
    return Atari8DialogProperties.merge({}, dialog);
  } // defaults

} // Atari8DialogProperties
