// begin code

/**
 * Colours, the 8x8 font and the sprites of the dialog contents
 * (VolumeEntity, SettingsEntity, PlayerNameEntity; the nested
 * RemapKeysEntity, SelectingGamepadEntity, WaitForAudioEventEntity).
 * The contents draw no frame and no title of their own: they sit in a window
 * (DialogEntity) or straight on a screen. The theme is the `theme` part of the
 * dialog properties (DialogProperties); every key is optional.
 *
 * The defaults are neutral — black, white and greys in hex — because canvas 2D
 * has no colours of a machine (R-056). A platform wrapper (ZXDialogTheme,
 * C64DialogProperties, Atari8DialogProperties) puts its font over them; the
 * colours are the game's, no two games are expected to share them.
 *
 * Keys:
 * - `bkColor` — background of the contents, false for transparent
 * - `penColor` — labels and prompts
 * - `valueColor` — values and hints (the key bound to an action, a note)
 * - `buttonPenColor` — text of every button
 * - `buttonColor`, `buttonHoverColor`, `buttonClickColor` — the main action of a panel (CHANGE, PLAY SAMPLE, CONFIGURE) and the gamepad selector
 * - `closeButtonColor` — CLOSE
 * - `okButtonColor`, `okButtonPenColor` — OK and the volume presets (OFF, 50%, MAX); the pen false is `buttonPenColor`
 * - `stepButtonColor`, `stepButtonPenColor` — the volume steps (-, +); false is `closeButtonColor` / `buttonPenColor`
 * - `dangerButtonColor` — CANCEL, DISABLE, IGNORE
 * - `selectionColor`, `selectionPenColor` — the bar behind the selected item and its text
 * - `selectionHoverColor`, `selectionClickColor` — the selected row of a list under the mouse (the gamepad list)
 * - `hoverColor`, `clickColor` — the rows of a list under the mouse
 * - `separatorColor` — the line between the list and the options
 * - `iconColor` — the device pictograms
 * - `touchIconColor`, `touchIconBkColor` — the stick and button pictograms on the touchscreen's picture (false: `iconColor` / transparent)
 * - `iconScaleX`, `iconScaleY` — how many pixels wide and tall one pixel of every pictogram is (1); for a screen whose pixel is not square, see SpriteEntity#setScale
 * - `dropdownArrowColor` — the arrow at the right of the selected gamepad's name, the one that opens the list (false: `penColor`)
 * - `sliderColor`, `cursorColor` — the volume slider and its cursor
 * - `warningColor` — the audio driver note in the volume panel
 * - `inputPenColor`, `inputBkColor` — the player name input and its counter
 * - `keyboardButtonsPenColor`, `keyboardButtonsBkColor`, `keyboardButtonsHoverColor`,
 *   `keyboardButtonsClickColor`, `keyboardButtonsShiftColor` — the on-screen keyboard
 * - `labelFont`, `buttonFont`, `stepFont` — the fonts of the contents: the
 *   title, labels and notes; the buttons; the step buttons (-, +) of the
 *   volume panel. Each the name of a font in `app.fonts` or a font instance,
 *   false the app's `fonts5x5`. The ZX wrapper keeps 5x5 for labels and
 *   buttons and the Spectrum's 8x8 for the steps; the C64 and Atari wrappers
 *   put their 8x8 everywhere, with a bigger window (R-056). The layout is
 *   computed from the fonts and the entity's size, nothing scales but the
 *   pictograms (`iconScaleX`, `iconScaleY`).
 * - `buttonsBottomMargin` — pixels between CANCEL / OK of the name dialog and
 *   the bottom edge (2; the C64's dialog 0, on the edge)
 * - `inputBlockShift` — pixels the centred block of prompt, input and keyboard
 *   of the name dialog is moved by, up when negative (0; the C64's dialog 1)
 * - `keyboardShift` — pixels the keyboard alone is moved by within that block
 *   (0; the C64's dialog -1)
 * - `inputPrompt` — the line over the name input ('Enter your player name:');
 *   false for none (the C64's dialog, the screen's heading says it)
 * - `counterFont` — the character counter of the name input (`5/15`): false
 *   is the library's 5x5 (the ZX dialog's), C64 and Atari the machine's 8x8
 * - `inputCursor` — the glyph of the input's blinking cursor: the underline
 *   '‗' (false, the ZX dialog's) or the block '█' (the C64's and Atari's)
 * - `inputOverwrite` — the input edits as the C64's screen editor, the cursor
 *   on a character and typing replacing it (true); false inserts before the
 *   cursor as the ZX Spectrum's editor
 * - `inputFont`, `keyboardFont`, `keyboardLabelFont` — the player name
 *   dialog: the prompt and the input (false: `labelFont`), the caps of the
 *   on-screen keyboard (false: the input's font), the small labels of its
 *   wide keys — DELETE, ENTER, SHIFT (false: `labelFont`). The ZX wrapper
 *   has the Spectrum's 8x8 for the input and the keys, C64 and Atari the
 *   machine's 8x8; the labels are 3x3 on all of them (`fonts5x5` when the
 *   app has no 3x3).
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
const DIALOG_THEME_DEFAULTS = {
  bkColor: false,
  penColor: '#000000ff',
  valueColor: '#404040ff',
  buttonPenColor: '#ffffffff',
  buttonColor: '#808080ff',
  buttonHoverColor: '#a0a0a0ff',
  buttonClickColor: '#606060ff',
  closeButtonColor: '#404040ff',
  okButtonColor: '#606060ff',
  okButtonPenColor: false,
  stepButtonColor: false,
  stepButtonPenColor: false,
  dangerButtonColor: '#202020ff',
  selectionColor: '#000000ff',
  selectionPenColor: '#ffffffff',
  selectionHoverColor: '#404040ff',
  selectionClickColor: '#606060ff',
  hoverColor: '#d0d0d0ff',
  clickColor: '#a0a0a0ff',
  separatorColor: '#000000ff',
  iconColor: '#404040ff',
  touchIconColor: false,
  touchIconBkColor: false,
  iconScaleX: 1,
  iconScaleY: 1,
  dropdownArrowColor: false,
  sliderColor: '#000000ff',
  cursorColor: '#404040ff',
  warningColor: '#000000ff',
  inputPenColor: '#ffffffff',
  inputBkColor: '#404040ff',
  keyboardButtonsPenColor: '#000000ff',
  keyboardButtonsBkColor: '#ffffffff',
  keyboardButtonsHoverColor: false,
  keyboardButtonsClickColor: false,
  keyboardButtonsShiftColor: '#c0c0c0ff',
  labelFont: false,
  buttonFont: false,
  stepFont: false,
  buttonsBottomMargin: 2,
  inputBlockShift: 0,
  keyboardShift: 0,
  inputPrompt: 'Enter your player name:',
  counterFont: false,
  inputCursor: false,
  inputOverwrite: false,
  inputFont: false,
  keyboardFont: false,
  keyboardLabelFont: false,
  keyboardLayout: {action: 'update'}
};

/**
 * The theme of the dialog contents, completed with the defaults. The keys are
 * catalogued in the comment above the defaults; a game calls
 * `DialogTheme.merge({...})` (usually through DialogProperties.merge) and the
 * contents read their colours from the result. A platform wrapper passes its
 * own defaults as the base.
 */
export class DialogTheme {

  /**
   * Fills a theme in with the defaults, key by key and in depth
   * (`keyboardLayout` is an object too): what the theme sets wins, the rest
   * comes from the base. The base is copied, the result is the caller's to
   * alter.
   * @param {Object} [theme] - The game's theme, any of the keys.
   * @param {Object} [base] - The defaults to complete from; the neutral ones unless a platform gives its own.
   * @returns {Object} A complete theme object.
   */
  static merge(theme, base = DIALOG_THEME_DEFAULTS) {
    return DialogTheme.mergeDeep(base, theme || {});
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
    var clone = (v) => isPlain(v) ? DialogTheme.mergeDeep(v, {}) : v;
    var result = {};
    Object.keys(base).forEach((key) => {
      result[key] = clone(base[key]);
    });
    Object.keys(over).forEach((key) => {
      result[key] = (isPlain(over[key]) && isPlain(base[key])) ? DialogTheme.mergeDeep(base[key], over[key]) : clone(over[key]);
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
    return DialogTheme.mergeDeep(defaults, patch);
  } // keyboardLayout

  /**
   * A font named in a theme or in the dialog properties: a font instance as
   * it is, the name of one in `app.fonts`, false (or a name the app lacks)
   * the app's `fonts5x5`.
   * @param {Object} app - The application with its `fonts`.
   * @param {string|Object|false} font - The theme's value.
   * @returns {Object} The font.
   */
  static font(app, font) {
    if (typeof font == 'string') {
      return app.fonts[font] || app.fonts.fonts5x5;
    }
    return font || app.fonts.fonts5x5;
  } // font

  /**
   * The width of a text in a font, the way TextEntity lays it out: the
   * glyphs and the font's spacing between them.
   * @param {Object} fonts - The font.
   * @param {string} text - One line.
   * @returns {number} Pixels.
   */
  static textWidth(fonts, text) {
    var width = 0;
    for (var i = 0; i < text.length; i++) {
      if (i > 0) {
        width += fonts.charsSpacing;
      }
      width += fonts.getCharData(text[i], '1', 1).width;
    }
    return width;
  } // textWidth

  /**
   * The default theme, a copy for the caller to alter.
   * @returns {Object} The defaults.
   */
  static defaults() {
    return DialogTheme.mergeDeep(DIALOG_THEME_DEFAULTS, {});
  } // defaults

} // DialogTheme
