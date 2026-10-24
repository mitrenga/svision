const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
const { DialogTheme } = await import('../dialogs/dialogTheme.js?ver='+window.srcVersion);
// begin code

/**
 * The ZX Spectrum look of the dialog contents: DialogTheme completed with
 * the colours of Manic Miner (black labels, the panel of the window is
 * yellow), the 5x5 font for the labels and the buttons and the 8x8 font of
 * the Spectrum for the volume steps. A thin wrapper (R-056): the keys
 * are DialogTheme's, `ZXDialogTheme.merge({...})` fills a game's theme in
 * from these defaults instead of the neutral ones.
 */
const ZX_DIALOG_THEME_DEFAULTS = DialogTheme.merge({
  bkColor: false,
  penColor: ZXColor.black,
  valueColor: ZXColor.brightBlue,
  buttonPenColor: ZXColor.brightWhite,
  buttonColor: ZXColor.magenta,
  buttonHoverColor: ZXColor.brightMagenta,
  buttonClickColor: '#7a7a7aff',
  closeButtonColor: ZXColor.blue,
  okButtonColor: ZXColor.green,
  dangerButtonColor: ZXColor.red,
  selectionColor: ZXColor.brightBlue,
  selectionPenColor: ZXColor.brightWhite,
  selectionHoverColor: ZXColor.brightMagenta,
  selectionClickColor: '#7a7a7aff',
  hoverColor: '#b1ab79ff',
  clickColor: '#939393ff',
  separatorColor: ZXColor.brightWhite,
  iconColor: ZXColor.cyan,
  touchIconColor: ZXColor.brightBlue,
  touchIconBkColor: ZXColor.brightYellow,
  sliderColor: ZXColor.black,
  cursorColor: ZXColor.brightRed,
  warningColor: ZXColor.brightRed,
  inputPenColor: ZXColor.brightWhite,
  inputBkColor: ZXColor.brightBlue,
  keyboardButtonsPenColor: ZXColor.brightBlack,
  keyboardButtonsBkColor: ZXColor.brightWhite,
  keyboardButtonsHoverColor: false,
  keyboardButtonsClickColor: false,
  keyboardButtonsShiftColor: ZXColor.white,
  labelFont: 'fonts5x5',
  buttonFont: 'fonts5x5',
  stepFont: 'zxFonts8x8',
  inputFont: 'zxFonts8x8',
  keyboardFont: 'zxFonts8x8Keys',
  keyboardLabelFont: 'fonts3x3'
});

/**
 * The theme of the ZX Spectrum dialog contents; see DialogTheme for the keys.
 */
export class ZXDialogTheme extends DialogTheme {

  /**
   * Fills a theme in with the ZX Spectrum defaults, key by key and in depth.
   * @param {Object} [theme] - The game's theme, any of the keys.
   * @returns {Object} A complete theme object, the caller's to alter.
   */
  static merge(theme) {
    return DialogTheme.merge(theme, ZX_DIALOG_THEME_DEFAULTS);
  } // merge

  /**
   * The ZX Spectrum defaults, a copy for the caller to alter.
   * @returns {Object} The defaults.
   */
  static defaults() {
    return DialogTheme.mergeDeep(ZX_DIALOG_THEME_DEFAULTS, {});
  } // defaults

} // ZXDialogTheme
