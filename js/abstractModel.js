/**/
const { DesktopEntity } = await import('./desktopEntity.js?ver='+window.srcVersion);
const { BorderEntity } = await import('./borderEntity.js?ver='+window.srcVersion);
/*/
import DesktopEntity from './desktopEntity.js';
import BorderEntity from './borderEntity.js';
/**/
// begin code

export class AbstractModel {

  constructor(app) {
    this.app = app;
    this.id = 'AbstractModel';

    this.flashState = 0;
    this.now = Date.now();

    this.borderEntity = null;
    this.borderWidth = 0;
    this.borderHeight = 0;
    this.minimalBorder = 0;
    this.optimalBorder = 0;
    if (this.app.platform.border(this.app) !== false) {
      this.minimalBorder = this.app.platform.border(this.app)['minimal'];
      this.optimalBorder = this.app.platform.border(this.app)['optimal'];
    }

    this.desktopEntity = null;
    this.desktopWidth = this.app.platform.desktop(this.app)['width'];
    this.desktopHeight = this.app.platform.desktop(this.app)['height'];

    this.events = [];
  } // constructor

  init() {
    if (this.app.platform.border(this.app) !== false) {
      this.borderEntity = new BorderEntity(null, 0, 0, 0, 0);
      this.borderEntity.app = this.app;
      this.borderEntity.model = this;
      this.borderEntity.bkColor = this.app.platform.border(this.app)['defaultColor'];
      var entityObjects = this.app.platform.initEntity(this.borderEntity);
      if (entityObjects !== false) {
        this.borderEntity.stack = {...this.borderEntity.stack, ...entityObjects};
      }
    }
    this.desktopEntity = new DesktopEntity(null, 0, 0, 0, 0);
    this.desktopEntity.app = this.app;
    this.desktopEntity.model = this;
    this.desktopEntity.bkColor = this.app.platform.desktop(this.app)['defaultColor'];
    var entityObjects = this.app.platform.initEntity(this.desktopEntity);
    if (entityObjects !== false) {
      this.desktopEntity.stack = {...this.desktopEntity.stack, ...entityObjects};
    }
  } // init

  sendEvent(timing, event) {
    if (timing == 0) {
      this.handleEvent(event);
    } else {
      this.events.push({'id': event['id'], 'timing': this.now+timing, 'event': event});
    }
  } // sendEvent

  cancelEvent(id) {
    for (var m = 0; m < this.events.length; m++) {
      if (id == this.events[m]['id']) {
        this.events.splice(m, 1);
      }
    }
  } // cancelEvent

  handleEvent(event) {
    var result = false;
    if (this.borderEntity != null) {
      result = this.borderEntity.handleEvent(event);
    }
    if (result == false) {
      this.desktopEntity.handleEvent(event);
    }
  } // handleEvent

  setData(data) {
    if (this.borderEntity != null) {
      this.borderEntity.setData(data);
    }
    this.desktopEntity.setData(data);
    this.drawModel();
  } // setData

  loopModel() {
    this.now = Date.now();
    for (var m = 0; m < this.events.length; m++) {
      if (this.events[m]['timing'] <= this.now) {
        this.sendEvent(0, this.events[m]['event']);
        this.events.splice(m, 1);
      }
    }
  } // loopModel

  resizeModel() {
    this.desktopWidth = this.app.platform.desktop(this.app)['width'];
    this.desktopHeight = this.app.platform.desktop(this.app)['height'];
    this.app.layout.resizeModel(this);
    this.drawModel();
  } // resizeModel

  drawModel() {
    if (this.borderEntity != null) {
      this.borderEntity.drawEntity();
    }
    this.desktopEntity.drawEntity();
  } // drawModel

} // class AbstractModel

export default AbstractModel;
