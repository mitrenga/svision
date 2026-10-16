const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
// begin code

/**
 * Colours of the ZX Spectrum themed dialog contents (ZXSettingsEntity,
 * ZXVolumeEntity, ZXPlayerNameEntity, and the nested ZXRemapKeysEntity,
 * ZXSelectingGamepadEntity, ZXWaitForAudioEventEntity). The contents draw no
 * frame and no title of their own: they sit in a window (ZXDialogEntity) or
 * straight on a screen. The theme is the `theme` part of the dialog
 * properties (ZXDialogProperties); every key is optional, the defaults are
 * the look of Manic Miner (black labels, the panel of the window is yellow).
 *
 * Keys:
 * - `bkColor` — background of the contents, false for transparent
 * - `penColor` — labels and prompts
 * - `valueColor` — values and hints (the key bound to an action, a note)
 * - `buttonPenColor` — text of every button
 * - `buttonColor`, `buttonHoverColor`, `buttonClickColor` — the main action of a panel (CHANGE, PLAY SAMPLE, CONFIGURE) and the gamepad selector
 * - `closeButtonColor` — CLOSE and the volume step buttons
 * - `okButtonColor` — OK and the volume presets
 * - `dangerButtonColor` — CANCEL, DISABLE, IGNORE
 * - `selectionColor`, `selectionPenColor` — the bar behind the selected item and its text
 * - `selectionHoverColor`, `selectionClickColor` — the selected row of a list under the mouse (the gamepad list)
 * - `hoverColor`, `clickColor` — the rows of a list under the mouse
 * - `separatorColor` — the line between the list and the options
 * - `iconColor` — the device pictograms
 * - `sliderColor`, `cursorColor` — the volume slider and its cursor
 * - `warningColor` — the audio driver note in the volume panel
 * - `inputPenColor`, `inputBkColor` — the player name input and its counter
 * - `keyboardButtonsPenColor`, `keyboardButtonsBkColor`, `keyboardButtonsHoverColor`,
 *   `keyboardButtonsClickColor`, `keyboardButtonsShiftColor` — the on-screen keyboard
 * - `keyboardLayout` — changes to the keyboard layout of the player name dialog,
 *   in the shape of the layout itself (`options.buttons`, `options.rows`,
 *   `keymap` …) plus the key `action`:
 *   `'update'` (the default) merges the object into the default layout — objects
 *   key by key, so `{options: {buttons: {default: {width: 15}}}}` narrows the
 *   keys and leaves everything else; arrays (`rows`, a `keymap` layer) are
 *   replaced whole, half a row from each side would be no layout.
 *   `'replace'` throws the default away and the object is the whole layout.
 *   `{}` or a missing key keeps the default. The colours `keyboardButtons*`
 *   go into the default first, so the layout may still override them.
 */
const ZX_DIALOG_THEME_DEFAULTS = {
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
  keyboardLayout: {action: 'update'}
};

/**
 * The theme of the dialog contents, completed with the defaults. The keys are
 * catalogued in the comment above the defaults; a game calls
 * `ZXDialogTheme.merge({...})` (usually through ZXDialogProperties.merge)
 * and the contents read their colours from the result.
 */
export class ZXDialogTheme {

  /**
   * Fills a theme in with the defaults, key by key and in depth
   * (`keyboardLayout` is an object too): what the theme sets wins, the rest
   * comes from the defaults. The defaults are copied, the result is the
   * caller's to alter.
   * @param {Object} [theme] - The game's theme, any of the keys.
   * @returns {Object} A complete theme object.
   */
  static merge(theme) {
    return ZXDialogTheme.mergeDeep(ZX_DIALOG_THEME_DEFAULTS, theme || {});
  } // merge

  /**
   * Merges `over` into a copy of `base`: plain objects key by key and in
   * depth, everything else (scalars, arrays, instances of a class such as a
   * font with its link back to the app) replaced whole — half a row from each
   * side would be no layout. Plain objects of `base` that `over` does not touch
   * are copied too, so the result shares nothing with the defaults.
   * @param {Object} base - The defaults.
   * @param {Object} over - The changes.
   * @returns {Object} A new object; neither argument is altered.
   */
  static mergeDeep(base, over) {
    var isPlain = (v) => v !== null && typeof v == 'object' && Object.getPrototypeOf(v) === Object.prototype;
    var clone = (v) => isPlain(v) ? ZXDialogTheme.mergeDeep(v, {}) : v;
    var result = {};
    Object.keys(base).forEach((key) => {
      result[key] = clone(base[key]);
    });
    Object.keys(over).forEach((key) => {
      result[key] = (isPlain(over[key]) && isPlain(base[key])) ? ZXDialogTheme.mergeDeep(base[key], over[key]) : clone(over[key]);
    });
    return result;
  } // mergeDeep

  /**
   * Applies the theme's `keyboardLayout` to a default layout: `action`
   * 'replace' returns the change alone, 'update' (the default) merges it in —
   * objects key by key, arrays and scalars replaced whole.
   * @param {Object} defaults - The dialog's default keyboard layout.
   * @param {Object} [change] - The theme's `keyboardLayout`.
   * @returns {Object} The layout to build the keyboard from; the defaults are not altered.
   */
  static keyboardLayout(defaults, change) {
    change = change || {};
    var action = change.action || 'update';
    var patch = Object.assign({}, change);
    delete patch.action;
    if (action == 'replace') {
      return patch;
    }
    return ZXDialogTheme.mergeDeep(defaults, patch);
  } // keyboardLayout

  /**
   * The default theme, a copy for the caller to alter.
   * @returns {Object} The defaults.
   */
  static defaults() {
    return ZXDialogTheme.mergeDeep(ZX_DIALOG_THEME_DEFAULTS, {});
  } // defaults

} // ZXDialogTheme
