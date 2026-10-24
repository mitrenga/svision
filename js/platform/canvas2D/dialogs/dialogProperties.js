const { DialogTheme } = await import('./dialogTheme.js?ver='+window.srcVersion);
// begin code

/**
 * Everything a game says about its dialogs, in one object: the window
 * (DialogEntity) — where it sits and how it is framed — the colours of the
 * contents (`theme`, see DialogTheme), and the same for each dialog the
 * contents open on top of themselves. A game sets the keys it wants to differ
 * and gets the rest from the defaults: `DialogProperties.merge({...})`. The
 * defaults are neutral (black, white, greys; R-056); a platform wrapper
 * (ZXDialogProperties, C64DialogProperties, Atari8DialogProperties) completes
 * from its own.
 *
 * Keys of a dialog (the top level and each nested one):
 * - `x`, `y`, `width`, `height` — the window in its parent, in pixels of the
 *   layout: the menu's dialogs on the desktop, the nested ones inside the
 *   contents that open them. The contents lay themselves out in any size
 *   from their fonts (DialogTheme) — the defaults are the ZX Spectrum's
 *   202 x 134 window with 200 x 124 of contents, the C64 and Atari wrappers
 *   give a bigger one. The opener may place the window elsewhere; these are
 *   where it usually goes. In `remapKeys` any of the four may be false:
 *   the window then covers the settings contents that open it, whatever
 *   their size (the C64 wrapper's default); a game gives numbers to place
 *   it differently (over the title bar of its own window, with
 *   `clipsChildren` false).
 * - `frameColor`, `frameWidth` — the frame (0 for none)
 * - `titleHeight`, `titleColor`, `fonts` — the title bar (`fonts` is a font
 *   instance or its name in `app.fonts`, false the 5x5 font of the app); a
 *   dialog opened without a title has no bar
 * - `bkColor` — the panel under the title, the background of the contents
 * - `theme` — the colours of the contents, DialogTheme
 * - `clipsChildren` — whether the contents clip the nested dialogs they open to
 *   their own rectangle (AbstractEntity.clipsChildren, the default); false
 *   lets a nested dialog reach over the window, its title bar included
 *   (`y: -9` starts on the title bar of a window with the default title
 *   height). Meaningful at the top level only — the nested dialogs open nothing.
 *
 * Nested dialogs:
 * - `remapKeys` — RemapKeysEntity, opened by SettingsEntity (CHANGE, CONFIGURE)
 * - `selectingGamepad` — SelectingGamepadEntity, opened by SettingsEntity
 *   under the label of the selected gamepad (no `x`, `y`, `width`: computed
 *   as a drop-down list; `false` in any of the four, the height included,
 *   covers the settings contents instead, as `remapKeys` does — the C64
 *   wrapper's default)
 * - `waitForAudioEvent` — WaitForAudioEventEntity, opened by VolumeEntity
 *   (PLAY SAMPLE) inside its contents; a menu opens the same one on its desktop
 *   with a place of its own
 */
const DIALOG_PROPERTIES_DEFAULTS = {
  x: 27,
  y: 24,
  width: 202,
  height: 134,
  frameColor: '#000000ff',
  frameWidth: 1,
  titleHeight: 9,
  titleColor: '#ffffffff',
  fonts: false,
  bkColor: '#c0c0c0ff',
  theme: DialogTheme.defaults(),
  clipsChildren: true,

  remapKeys: {
    x: 6,
    y: 7,
    width: 187,
    height: 115,
    frameColor: '#000000ff',
    frameWidth: 1,
    titleHeight: 9,
    titleColor: '#ffffffff',
    fonts: false,
    bkColor: '#ffffffff',
    theme: DialogTheme.defaults()
  },

  // the list drops down from the label of the selected gamepad and is
  // centred in the settings panel, so the settings contents compute `x`, `y`
  // and `width` themselves (2 px of the label stay visible above and at the
  // right); only the height and the colours come from here
  selectingGamepad: {
    height: 83,       // 1 px frame + eight rows of 10 px + 1 px frame
    frameColor: '#ffffffff',
    frameWidth: 1,
    titleHeight: 9,
    titleColor: '#ffffffff',
    fonts: false,
    bkColor: '#404040ff',
    theme: DialogTheme.merge({
      penColor: '#ffffffff',
      selectionColor: '#ffffffff',
      selectionPenColor: '#000000ff',
      hoverColor: '#606060ff',
      selectionHoverColor: '#c0c0c0ff'
    })
  },

  waitForAudioEvent: {
    x: 37,
    y: 61,
    width: 123,
    height: 41,
    frameColor: '#ffffffff',
    frameWidth: 1,
    titleHeight: 9,
    titleColor: '#ffffffff',
    fonts: false,
    bkColor: '#404040ff',
    theme: DialogTheme.merge({penColor: '#ffffffff'})
  }
};

/**
 * The dialog properties of a game, completed with the defaults. The keys and
 * the nested dialogs are catalogued in the comment above the defaults; a game
 * calls `DialogProperties.merge({...})` (or the platform's wrapper) and hands
 * the result to its dialogs.
 */
export class DialogProperties {

  /**
   * Fills the properties in with the defaults, key by key and in depth
   * (DialogTheme.mergeDeep): what the game sets wins, the rest is the base.
   * Merging a complete object again changes nothing, so the contents may call
   * it on what the game already merged.
   * @param {Object} [properties] - The game's properties, any of the keys.
   * @param {string|false} [dialog] - A nested dialog ('remapKeys', 'selectingGamepad', 'waitForAudioEvent') whose defaults apply; false for the dialogs a game opens.
   * @param {Object} [base] - The complete defaults to merge over; the neutral ones unless a platform gives its own.
   * @returns {Object} A complete properties object, the caller's to alter.
   */
  static merge(properties, dialog = false, base = DIALOG_PROPERTIES_DEFAULTS) {
    var defaults = (dialog === false) ? base : base[dialog];
    return DialogTheme.mergeDeep(defaults, properties || {});
  } // merge

  /**
   * The defaults, a copy for the caller to alter.
   * @param {string|false} [dialog] - A nested dialog, see merge.
   * @returns {Object} The defaults.
   */
  static defaults(dialog = false) {
    return DialogProperties.merge({}, dialog);
  } // defaults

  /**
   * A platform's complete defaults: the neutral ones with the platform's
   * changes merged in at every level, for the platform wrapper to pass as
   * `base`. The top-level `theme` changes apply to the nested dialogs too,
   * before their own.
   * @param {Object} changes - The platform's changes in the shape of the properties.
   * @returns {Object} A complete defaults object.
   */
  static platformDefaults(changes) {
    var shared = changes.theme ? {theme: changes.theme} : {};
    var base = DialogTheme.mergeDeep(DIALOG_PROPERTIES_DEFAULTS, {
      remapKeys: shared, selectingGamepad: shared, waitForAudioEvent: shared
    });
    return DialogTheme.mergeDeep(base, changes);
  } // platformDefaults

} // DialogProperties
