const { AbstractModel } = await import('../../../abstractModel.js?ver='+window.srcVersion);
const { ZXResetEntity } = await import('./zxResetEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
// begin code

/**
 * Boot model that orchestrates the ZX Spectrum reset sequence: it plays the
 * reset animation, then shows the original ROM copyright line, loads
 * application data and finally hands over to the menu model. Any of the
 * {@link ZXResetModel.SKIP_KEYS} cuts it short and hands over at once, the
 * way the C64 and Atari boot models do (`C64BootModel.skipKeys`).
 */
export class ZXResetModel extends AbstractModel {

  /** the keys that skip the reset: as the sibling platforms' boot models */
  static get SKIP_KEYS() { return ['Escape', 'Enter', ' ', 'GamepadOK', 'Mouse1', 'Mouse2', 'Touch']; }

  /**
   * Creates the reset model.
   * @param {Object} app - The application instance.
   */
  constructor(app) {
    super(app);   
    this.id = 'ZXResetModel'
    
    this.resetEntity = null;
    this.inputLineEntity = null;
    /** the hand-over has happened (by the sequence or by a skip) */
    this.finished = false;
  } // constructor

  /**
   * Builds the reset and copyright entities and schedules the reset animation
   * event. Application data is loaded by the app, not by this display model.
   */
  init() {
    super.init();

    this.resetEntity = new ZXResetEntity(this.desktopEntity, 0, 0, 32*8, 24*8);
    this.resetEntity.hide = true;
    this.desktopEntity.addEntity(this.resetEntity);
    this.inputLineEntity = new TextEntity(this.desktopEntity, this.app.fonts.zxFonts8x8Mono, 0, 23*8, 32*8, 8, '© 1982 Sinclair Research Ltd', ZXColor.black, false, {align: 'left'});
    this.inputLineEntity.hide = true;
    this.desktopEntity.addEntity(this.inputLineEntity);
    this.sendEvent(500, {id: 'showReset'});
  } // init

  /**
   * Handles the reset sequence events that advance through the reset animation,
   * the copyright display and the transition to the menu model.
   * @param {Object} event - The event object, identified by its id property.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'showReset':
        this.timer = this.app.now;
        this.resetEntity.hide = false;
        this.sendEvent(this.resetEntity.resetTime+1000, {id: 'showCopyright'});
        return true;
      case 'showCopyright':
        this.timer = false;
        this.resetEntity.hide = true;
        this.inputLineEntity.hide = false;
        this.drawModel();
        this.sendEvent(1200, {id: 'setMenuModel'});
        return true;
      case 'setMenuModel':
        this.handOver();
        return true;
      case 'keyPress':
        if (ZXResetModel.SKIP_KEYS.indexOf(event.key) >= 0) {
          this.handOver();
          return true;
        }
        break;
      case 'retryLoadAppData':
        // sent by the error panel's RETRY button: reload the application data
        // and retry the menu handover after the fetch timeout has passed, so
        // the request has either delivered data or fallen back to storage
        this.app.loadAppData();
        this.sendEvent(2500, {id: 'setMenuModel'});
        return true;
    }

    return false;
  } // handleEvent

  /**
   * Hands over to the menu, once: the sequence's end and a skip key both come
   * here, and the queued events of this model go with it (a model's queue is
   * its own).
   */
  handOver() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.app.setModel('MenuModel');
  } // handOver

  /**
   * Per-frame update that advances the reset entity animation and redraws the model.
   * @param {number} timestamp - The current frame timestamp in milliseconds.
   */
  loopModel(timestamp) {
    super.loopModel(timestamp);

    this.resetEntity.loopEntity(timestamp);
    this.drawModel();
  } // loopModel

} // ZXResetModel
