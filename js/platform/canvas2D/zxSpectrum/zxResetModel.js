/**/
const { AbstractModel } = await import('../../../abstractModel.js?ver='+window.srcVersion);
const { ZXResetEntity } = await import('./zxResetEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
/*/
import AbstractModel from '../../../abstractModel.js';
import ZXResetEntity from './zxResetEntity.js';
import TextEntity from '../textEntity.js';
import ZXColor from './zxColor.js';
/**/
// begin code

/**
 * Boot model that orchestrates the ZX Spectrum reset sequence: it plays the
 * reset animation, then shows the copyright line, loads application data and
 * finally hands over to the menu model.
 */
export class ZXResetModel extends AbstractModel {

  /**
   * Creates the reset model and stores the copyright text to be displayed.
   * @param {Object} app - The application instance.
   * @param {string} copyright - The copyright text shown after the reset animation.
   */
  constructor(app, copyright) {
    super(app);   
    this.id = 'ZXResetModel'
    
    this.copyright = copyright;
    this.resetEntity = null;
    this.inputLineEntity = null;
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
    this.inputLineEntity = new TextEntity(this.desktopEntity, this.app.fonts.zxFonts8x8, 0, 23*8, 32*8, 8, this.copyright, ZXColor.black, false, {align: 'center'});
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
        this.app.setModel('MenuModel');
        return true;
    }

    return false;
  } // handleEvent

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

export default ZXResetModel;
