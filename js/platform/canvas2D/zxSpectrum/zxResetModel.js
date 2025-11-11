/**/
const { AbstractModel } = await import('../../../abstractModel.js?ver='+window.srcVersion);
const { ZXResetEntity } = await import('./zxResetEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
/*/
import AbstractModel from '../../../abstractModel.js';
import ZXResetEntity from './zxResetEntity.js';
import TextEntity from '../textEntity.js';
/**/
// begin code

export class ZXResetModel extends AbstractModel {
  
  constructor(app) {
    super(app);   
    this.id = 'ZXResetModel';
    this.resetEntity = null;
    this.inputLineEntity = null;
  } // constructor

  init() {
    super.init();

    this.resetEntity = new ZXResetEntity(this.desktopEntity, 0, 0, 32*8, 24*8);
    this.resetEntity.hide = true;
    this.desktopEntity.addEntity(this.resetEntity);
    this.inputLineEntity = new TextEntity(this.desktopEntity, this.app.fonts.zxFonts8x8, 0, 23*8, 32*8, 8, '© 2025 GNU General Public Licence', this.app.platform.colorByName('black'), false, {align: 'center'});
    this.inputLineEntity.hide = true;
    this.desktopEntity.addEntity(this.inputLineEntity);
    this.sendEvent(500, {id: 'showReset'});

    this.fetchData('appData.db', false, {});
  } // init

  setData(data) {
    this.app.setGlobalData(data);
  } // setData

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

  loopModel(timestamp) {
    super.loopModel(timestamp);

    this.resetEntity.loopEntity(timestamp);
    this.drawModel();
  } // loopModel

} // ZXResetModel

export default ZXResetModel;
