const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
// begin code

/**
 * The window of the ZX Spectrum themed dialogs: a frame, a title bar and the
 * panel under it. The contents (ZXSettingsEntity, ZXVolumeEntity,
 * ZXPlayerNameEntity, and the nested ZXRemapKeysEntity,
 * ZXSelectingGamepadEntity, ZXWaitForAudioEventEntity) draw no frame of their
 * own; the opener chooses the title, the frame and the colours through a
 * dialog properties object (ZXDialogProperties) and puts the contents on the
 * panel at (innerX, innerY) with innerWidth x innerHeight.
 *
 * The window is transparent to the events its contents send up
 * (`passesEventsUp`, AbstractEntity.sendEvent): they reach the owner of the
 * window as if the contents sat there directly. The window goes with its
 * contents: when they are destroyed (their own destroy(), or the
 * 'contentClosed' they send up on closing), the window closes too. The event
 * matters when the contents close from their init() — ZXSelectingGamepadEntity
 * with no gamepad connected — before the window is in the owner's list of
 * children, where 'contentClosed' would not find it yet.
 */
export class ZXDialogEntity extends AbstractEntity {

  /**
   * @param {AbstractEntity} parentEntity - The owner the window sits on: the desktop, or the contents of another dialog.
   * @param {number} x - X position of the window.
   * @param {number} y - Y position of the window.
   * @param {number} width - Window width, the contents get the frame less on either side.
   * @param {number} height - Window height, the contents get the title bar and the frame less.
   * @param {string|false} title - The text of the title bar, false for a window without one.
   * @param {Object} properties - `frameColor`, `frameWidth` (0 for no frame), `titleHeight`, `titleColor`, `fonts` of the title and `bkColor` of the panel; see ZXDialogProperties. The other keys are the contents' business.
   * @param {Function} contentFactory - Called with the window, returns the contents entity to put on the panel.
   */
  constructor(parentEntity, x, y, width, height, title, properties, contentFactory) {
    properties = properties || {};
    super(parentEntity, x, y, width, height, false, ('frameColor' in properties) ? properties.frameColor : ZXColor.black);
    this.id = 'ZXDialogEntity';
    this.passesEventsUp = true;

    this.title = title;
    this.properties = properties;
    this.contentFactory = contentFactory;
    this.contentEntity = null;
    this.closing = false;

    var frame = ('frameWidth' in properties) ? properties.frameWidth : 1;
    this.titleHeight = (title === false) ? 0 : (('titleHeight' in properties) ? properties.titleHeight : 9);
    this.innerX = frame;
    this.innerY = (title === false) ? frame : this.titleHeight;
    this.innerWidth = width-2*frame;
    this.innerHeight = height-this.innerY-frame;
  } // constructor

  /**
   * Builds the window: the title bar (a centred TextEntity, when there is a
   * title), the panel under it in the properties' `bkColor`, and the
   * contents, made by `contentFactory(this)` and kept in `contentEntity`.
   */
  init() {
    super.init();

    if (this.title !== false) {
      this.addEntity(new TextEntity(this, this.properties.fonts || this.app.fonts.fonts5x5, 0, 0, this.width, this.titleHeight, this.title, ('titleColor' in this.properties) ? this.properties.titleColor : ZXColor.brightWhite, false, {align: 'center', topMargin: 2, member: 'titleBar'}));
    }
    this.addEntity(new AbstractEntity(this, this.innerX, this.innerY, this.innerWidth, this.innerHeight, false, ('bkColor' in this.properties) ? this.properties.bkColor : false));
    this.addEntity(this.contentEntity = this.contentFactory(this));
  } // init

  /**
   * The contents tick on their own (gamepad polling and the sliding label of
   * ZXSettingsEntity, the gamepad list of ZXSelectingGamepadEntity); the owner
   * calls the modal's loopEntity(), and the modal is this window, so it passes
   * the tick on.
   * @param {number} timestamp - The current frame timestamp.
   */
  loopEntity(timestamp) {
    if (this.contentEntity) {
      this.contentEntity.loopEntity(timestamp);
    }
  } // loopEntity

  /**
   * Closes the window, once; the contents go with it (shutdown of the children).
   */
  close() {
    if (!this.closing) {
      this.closing = true;
      this.destroy();
    }
  } // close

  /**
   * Closes the window with its contents: on the 'destroy' of the contents
   * entity (passed on to the children first), and on the 'contentClosed' the
   * contents send up when they close themselves. Everything else goes the
   * usual way through AbstractEntity.
   * @param {Object} event - The event, with an `id` and, for 'destroy', the `entity` destroyed.
   * @returns {boolean} True when the event was handled.
   */
  handleEvent(event) {
    if (event.id == 'destroy' && event.entity === this.contentEntity) {
      // the contents are destroyed: the window goes with them
      super.handleEvent(event);
      this.close();
      return true;
    }
    if (super.handleEvent(event)) {
      return true;
    }
    if (event.id == 'contentClosed') {
      this.close();
      return true;
    }
    return false;
  } // handleEvent

} // ZXDialogEntity
