const { VectorEntity } = await import('./vectorEntity.js?ver='+window.srcVersion);
const { VectorTextEntity } = await import('./vectorTextEntity.js?ver='+window.srcVersion);
const { VectorFont } = await import('./vectorFont.js?ver='+window.srcVersion);
// begin code

/**
 * A modal notice on the vector screen: a framed box with a title, a few
 * lines of text and "PRESS ENTER" — the stand-in for the dialogs of the
 * canvas 2D platform (ZXErrorEntity, the settings windows), which have no
 * vector counterpart yet (R-031 point 5). It closes on Enter, Escape, OK,
 * a click or a tap and sends `continueEvent` to the model, when there is one
 * (`reloadApp` reloads the page instead).
 *
 * The box is opaque: `bkColor` (black unless told otherwise) is painted as
 * the entity's background under the frame, the same `bkColor` contract as the
 * canvas 2D entities, so the notice hides what it covers. `false` leaves the
 * lines underneath showing through. Filled areas are for the menu screens
 * only (menu, settings, about …) — an XY monitor has none, so nothing in the
 * game itself uses this.
 *
 * Written for Battlezone (BZ-M2), shared by Asteroids; the real dialogs of the menu (player name, hall of fame,
 * volume) are in svision too; settings and about are still to come (BZ-M8, AS-M8).
 */
export class VectorNoticeEntity extends VectorEntity {

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {string} title
   * @param {string[]} lines - The lines of the text.
   * @param {Object|false} continueEvent - Sent to the model when the notice closes, or false.
   * @param {string} [color] - Stroke colour of the frame and the text.
   * @param {string|false} [bkColor] - Background under the box; black when omitted, false for none.
   * @param {Object} [options] - `escapeCancels`: Escape (Exit) closes without the continue event — the
   *   notice asking for the browser's gesture for audio, where Escape means "not now"; `hint`: the
   *   bottom line (PRESS ENTER); `font`: the {@link VectorFont} of the texts, else the application's
   *   `fonts.vector` (BattleZoneFont, AsteroidsFont), else the built-in one.
   */
  constructor(parentEntity, x, y, width, height, title, lines, continueEvent, color, bkColor, options) {
    super(parentEntity, x, y, width, height, color || '#ffffff', bkColor === undefined ? '#000000' : bkColor);
    this.id = 'VectorNoticeEntity';
    this.title = title;
    this.lines = lines;
    this.continueEvent = continueEvent;
    this.options = Object.assign({escapeCancels: false, hint: 'PRESS ENTER', font: false}, options || {});
    this.clipsList = false;
  } // constructor

  /**
   * The font of the texts: the option, else the application's vector font,
   * else the built-in one — the same rule as VectorVolumeEntity.
   * @returns {VectorFont}
   */
  font() {
    if (this.options.font) {
      return this.options.font;
    }
    if (this.app.fonts && this.app.fonts.vector) {
      return this.app.fonts.vector;
    }
    return VectorFont.simple();
  } // font

  /**
   * Builds the frame, the title, the lines of the message and the hint.
   */
  init() {
    super.init();
    var w = this.width, h = this.height, font = this.font();
    // the frame, the box drawn twice like the boxes of a vector menu
    this.list.rect(0, 0, w, h, {strokeWidth: 3});
    this.list.rect(6, 6, w-12, h-12, {strokeWidth: 1.5, intensity: 8});
    this.list.line(6, 56, w-6, 56, {strokeWidth: 1.5, intensity: 8});

    this.addEntity(new VectorTextEntity(this, 0, 14, w, 30, this.penColor, false, this.title, {font: font, size: 30, align: 'center'}));
    for (var i = 0; i < this.lines.length; i++) {
      this.addEntity(new VectorTextEntity(this, 0, 76+i*34, w, 22, this.penColor, false, this.lines[i], {font: font, size: 22, align: 'center', intensity: 12}));
    }
    this.addEntity(new VectorTextEntity(this, 0, h-44, w, 18, this.penColor, false, this.options.hint, {font: font, size: 18, align: 'center', intensity: 9}));
  } // init

  /**
   * Closes the notice.
   * @param {boolean} [cancelled] - Closed by Escape with `escapeCancels`: no continue event.
   */
  close(cancelled) {
    if (this.continueEvent && !cancelled) {
      if (this.continueEvent.id == 'reloadApp') {
        // an error the application cannot recover from: start over
        window.location.reload();
        return;
      }
      this.sendEvent(0, 0, this.continueEvent);
    }
    this.destroy();
  } // close

  /**
   * Handles keys, gamepad, mouse and touch; the notice is modal, so
   * any other key is swallowed.
   * @param {Object} event
   * @returns {boolean} True when the event was consumed.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }
    switch (event.id) {
      case 'keyPress':
        switch (event.key) {
          case 'Escape':
          case 'GamepadExit':
            this.close(this.options.escapeCancels);
            return true;
          case 'Enter':
          case ' ':
          case 'GamepadOK':
          case 'Mouse1':
          case 'Touch':
            this.close(false);
            return true;
        }
        // any other key is swallowed: the notice is modal
        return true;
      case 'keyRelease':
      case 'mouseHover':
        return true;
    }
    return false;
  } // handleEvent

} // VectorNoticeEntity
