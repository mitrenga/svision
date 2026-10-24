const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
const { ZXDialogTheme } = await import('./zxDialogTheme.js?ver='+window.srcVersion);
const { DialogProperties } = await import('../dialogs/dialogProperties.js?ver='+window.srcVersion);
// begin code

/**
 * The dialog properties with the ZX Spectrum look: DialogProperties
 * completed with the window of Manic Miner (black frame, white title,
 * yellow panel) and the ZX colours of the contents (ZXDialogTheme) at every
 * level, the nested dialogs included. A thin wrapper (R-056): the keys are
 * DialogProperties', `ZXDialogProperties.merge({...})` fills a game's
 * properties in from these defaults instead of the neutral ones.
 */
const ZX_DIALOG_PROPERTIES_DEFAULTS = DialogProperties.platformDefaults({
  frameColor: ZXColor.black,
  titleColor: ZXColor.brightWhite,
  bkColor: ZXColor.yellow,
  theme: ZXDialogTheme.defaults(),

  remapKeys: {
    frameColor: ZXColor.black,
    titleColor: ZXColor.brightWhite,
    bkColor: ZXColor.white
  },

  // bright white on magenta in a bright white frame, the selected gamepad
  // black on bright white
  selectingGamepad: {
    frameColor: ZXColor.brightWhite,
    titleColor: ZXColor.brightWhite,
    bkColor: ZXColor.magenta,
    theme: {
      penColor: ZXColor.brightWhite,
      selectionColor: ZXColor.brightWhite,
      selectionPenColor: ZXColor.black,
      hoverColor: ZXColor.brightMagenta,
      selectionHoverColor: ZXColor.white
    }
  },

  waitForAudioEvent: {
    frameColor: ZXColor.brightWhite,
    titleColor: ZXColor.brightWhite,
    bkColor: ZXColor.magenta,
    theme: {penColor: ZXColor.brightWhite}
  }
});

/**
 * The dialog properties of a ZX Spectrum game; see DialogProperties for the
 * keys and the nested dialogs.
 */
export class ZXDialogProperties extends DialogProperties {

  /**
   * Fills the properties in with the ZX Spectrum defaults, key by key and in
   * depth. Merging a complete object again changes nothing.
   * @param {Object} [properties] - The game's properties, any of the keys.
   * @param {string|false} [dialog] - A nested dialog ('remapKeys', 'selectingGamepad', 'waitForAudioEvent') whose defaults apply; false for the dialogs a game opens.
   * @returns {Object} A complete properties object, the caller's to alter.
   */
  static merge(properties, dialog = false) {
    return DialogProperties.merge(properties, dialog, ZX_DIALOG_PROPERTIES_DEFAULTS);
  } // merge

  /**
   * The ZX Spectrum defaults, a copy for the caller to alter.
   * @param {string|false} [dialog] - A nested dialog, see merge.
   * @returns {Object} The defaults.
   */
  static defaults(dialog = false) {
    return ZXDialogProperties.merge({}, dialog);
  } // defaults

} // ZXDialogProperties
