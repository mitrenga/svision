const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
const { ZXDialogTheme } = await import('./zxDialogTheme.js?ver='+window.srcVersion);
// begin code

/**
 * Everything a game says about its ZX Spectrum themed dialogs, in one object:
 * the window (ZXDialogEntity) — where it sits and how it is framed — the
 * colours of the contents (`theme`, see ZXDialogTheme), and the same for each
 * dialog the contents open on top of themselves. A game sets the keys it wants
 * to differ and gets the rest from the defaults, which are the look of Manic
 * Miner: `ZXDialogProperties.merge({...})`.
 *
 * Keys of a dialog (the top level and each nested one):
 * - `x`, `y`, `width`, `height` — the window in its parent: the menu's
 *   dialogs on the desktop, the nested ones inside the contents that open them
 *   (the contents are laid out for 200 x 124 px). The opener may place the
 *   window elsewhere; these are where it usually goes.
 * - `frameColor`, `frameWidth` — the frame (0 for none)
 * - `titleHeight`, `titleColor`, `fonts` — the title bar (`fonts` false is the
 *   5x5 font of the app); a dialog opened without a title has no bar
 * - `bkColor` — the panel under the title, the background of the contents
 * - `theme` — the colours of the contents, ZXDialogTheme
 * - `clipsChildren` — whether the contents clip the nested dialogs they open to
 *   their own rectangle (AbstractEntity.clipsChildren, the default); false
 *   lets a nested dialog reach over the window, its title bar included
 *   (`y: -9` starts on the title bar of a window with the default title
 *   height). Meaningful at the top level only — the nested dialogs open nothing.
 *
 * Nested dialogs:
 * - `remapKeys` — ZXRemapKeysEntity, opened by ZXSettingsEntity (CHANGE, CONFIGURE)
 * - `selectingGamepad` — ZXSelectingGamepadEntity, opened by ZXSettingsEntity
 *   under the label of the selected gamepad (no `x`, `y`, `width`: computed)
 * - `waitForAudioEvent` — ZXWaitForAudioEventEntity, opened by ZXVolumeEntity
 *   (PLAY SAMPLE) inside its contents; a menu opens the same one on its desktop
 *   with a place of its own
 */
const ZX_DIALOG_PROPERTIES_DEFAULTS = {
  x: 27,
  y: 24,
  width: 202,
  height: 134,
  frameColor: ZXColor.black,
  frameWidth: 1,
  titleHeight: 9,
  titleColor: ZXColor.brightWhite,
  fonts: false,
  bkColor: ZXColor.yellow,
  theme: ZXDialogTheme.defaults(),
  clipsChildren: true,

  remapKeys: {
    x: 6,
    y: 7,
    width: 187,
    height: 115,
    frameColor: ZXColor.black,
    frameWidth: 1,
    titleHeight: 9,
    titleColor: ZXColor.brightWhite,
    fonts: false,
    bkColor: ZXColor.white,
    theme: ZXDialogTheme.defaults()
  },

  // the list drops down from the label of the selected gamepad and is
  // centred in the settings panel, so ZXSettingsEntity computes `x`, `y` and
  // `width` itself (2 px of the label stay visible above and at the right);
  // only the height and the colours come from here. Bright white on magenta in a
  // bright white frame, the selected gamepad black on bright white
  selectingGamepad: {
    height: 83,       // 1 px frame + eight rows of 10 px + 1 px frame
    frameColor: ZXColor.brightWhite,
    frameWidth: 1,
    titleHeight: 9,
    titleColor: ZXColor.brightWhite,
    fonts: false,
    bkColor: ZXColor.magenta,
    theme: ZXDialogTheme.merge({
      penColor: ZXColor.brightWhite,
      selectionColor: ZXColor.brightWhite,
      selectionPenColor: ZXColor.black,
      hoverColor: ZXColor.brightMagenta,
      selectionHoverColor: ZXColor.white
    })
  },

  waitForAudioEvent: {
    x: 37,
    y: 61,
    width: 123,
    height: 41,
    frameColor: ZXColor.brightWhite,
    frameWidth: 1,
    titleHeight: 9,
    titleColor: ZXColor.brightWhite,
    fonts: false,
    bkColor: ZXColor.magenta,
    theme: ZXDialogTheme.merge({penColor: ZXColor.brightWhite})
  }
};

/**
 * The dialog properties of a game, completed with the defaults. The keys and
 * the nested dialogs are catalogued in the comment above the defaults; a game
 * calls `ZXDialogProperties.merge({...})` and hands the result to its dialogs.
 */
export class ZXDialogProperties {

  /**
   * Fills the properties in with the defaults, key by key and in depth
   * (ZXDialogTheme.mergeDeep): what the game sets wins, the rest is Manic
   * Miner. Merging a complete object again changes nothing, so the contents
   * may call it on what the game already merged.
   * @param {Object} [properties] - The game's properties, any of the keys.
   * @param {string} [dialog] - A nested dialog ('remapKeys', 'selectingGamepad', 'waitForAudioEvent') whose defaults apply; none for the dialogs a game opens.
   * @returns {Object} A complete properties object, the caller's to alter.
   */
  static merge(properties, dialog = false) {
    var defaults = (dialog === false) ? ZX_DIALOG_PROPERTIES_DEFAULTS : ZX_DIALOG_PROPERTIES_DEFAULTS[dialog];
    return ZXDialogTheme.mergeDeep(defaults, properties || {});
  } // merge

  /**
   * The defaults, a copy for the caller to alter.
   * @param {string} [dialog] - A nested dialog, see merge.
   * @returns {Object} The defaults.
   */
  static defaults(dialog = false) {
    return ZXDialogProperties.merge({}, dialog);
  } // defaults

} // ZXDialogProperties
