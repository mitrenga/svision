/**/
const { AbstractEntity } = await import('./abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from './abstractEntity.js';
/**/
// begin code

export class AbstractModel {

  constructor(app) {
    this.app = app;
    this.id = 'AbstractModel';

    this.prevTimestamp = 0;

    this.borderEntity = null;
    this.borderWidth = 0;
    this.borderHeight = 0;
    this.minimalBorder = 0;
    if (this.app.platform.border(this.app) !== false) {
      this.minimalBorder = this.app.platform.border(this.app).minimal;
    }

    this.desktopEntity = null;
    this.desktopWidth = this.app.platform.desktop(this.app).width;
    this.desktopHeight = this.app.platform.desktop(this.app).height;

    this.events = [];
    this.autorepeatKeys = true;
    this.timer = false;
  } // constructor

  newDesktopEntity() {
    return new AbstractEntity(null, 0, 0, 0, 0, false, false);
  } // desktopEntity

  newBorderEntity() {
    return new AbstractEntity(null, 0, 0, 0, 0, false, false);
  } // newBorderEntity

  init() {
    if (this.app.platform.border(this.app) !== false) {
      this.borderEntity = this.newBorderEntity();
      this.borderEntity.app = this.app;
      this.borderEntity.model = this;
      this.borderEntity.bkColor = this.app.platform.border(this.app).defaultColor;
      var entityObjects = this.app.platform.initEntity(this.borderEntity);
      if (entityObjects !== false) {
        this.borderEntity.stack = {...this.borderEntity.stack, ...entityObjects};
      }
    }
    this.desktopEntity = this.newDesktopEntity();
    this.desktopEntity.app = this.app;
    this.desktopEntity.model = this;
    this.desktopEntity.bkColor = this.app.platform.desktop(this.app).defaultColor;
    var entityObjects = this.app.platform.initEntity(this.desktopEntity);
    if (entityObjects !== false) {
      this.desktopEntity.stack = {...this.desktopEntity.stack, ...entityObjects};
    }
  } // init

  shutdown() {
    this.app.audioManager.closeAllChannels();
  } // shutdown

  sendEvent(timing, event) {
    if (timing == 0) {
      this.handleEvent(event);
    } else {
      this.events.push({id: event.id, timing: this.app.now+timing, event: event});
    }
  } // sendEvent

  cancelEvent(id) {
    for (var m = 0; m < this.events.length; m++) {
      if (id == this.events[m].id) {
        this.events.splice(m, 1);
      }
    }
  } // cancelEvent

  handleEvent(event) {
    switch (event.id) {
      case 'openAudioChannel':
        this.app.audioManager.openChannel(event.channel);
        return true;
      case 'closeAudioChannel':
        this.app.audioManager.closeChannel(event.channel);
        return true;
      case 'stopAudioChannel':
        this.app.audioManager.stopChannel(event.channel);
        return true;
      case 'stopAllAudioChannels':
        this.app.audioManager.stopAllChannels();
        return true;
      case 'unsupportedAudioChannel':
        this.app.audioManager.unsupportedAudioChannel = this.app.audioManager.channels[event.channel].id;
        this.sendEvent(50, {id: 'closeAudioChannel', channel: event.channel});
        this.sendEvent(100, {id: 'openAudioChannel', channel: event.channel});
        return true;
      case 'playSound':
        this.app.audioManager.playSound(event.channel, event.sound, event.options);
        return true;
    }

    var result = false;
    if (this.borderEntity != null) {
      result = this.borderEntity.handleEvent(event);
    }
    if (result == false) {
      result = this.desktopEntity.handleEvent(event);
    }
    return result;
  } // handleEvent

  setData(data) {
    if (this.borderEntity != null) {
      this.borderEntity.setData(data);
    }
    this.desktopEntity.setData(data);
    this.drawModel();
  } // setData

  loopModel(timestamp) {
    for (var m = 0; m < this.events.length; m++) {
      if (this.events[m].timing <= timestamp) {
        this.sendEvent(0, this.events[m].event);
        this.events.splice(m, 1);
      }
    }
    if (this.app.audioManager != false) {
      this.app.audioManager.refreshAllChannels();
    }
  } // loopModel

  resizeModel() {
    this.desktopWidth = this.app.platform.desktop(this.app).width;
    this.desktopHeight = this.app.platform.desktop(this.app).height;
    this.app.layout.resizeModel(this);
    this.drawModel();
  } // resizeModel

  drawModel() {
    this.app.layout.clearCanvas();
    if (this.borderEntity != null) {
      this.borderEntity.drawEntity();
    }
    this.desktopEntity.drawEntity();
  } // drawModel

} // AbstractModel

export default AbstractModel;
