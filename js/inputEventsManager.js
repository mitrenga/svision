/**/

/*/

/**/
// begin code

export class InputEventsManager {

  constructor(app) {
    this.app = app;

    this.keysPressMap = { key: {} };
    this.blurWindow = false;
  } // constructor

  eventKeyDown(event) {
    if (this.app.model.autorepeatKeys || !(event.key in this.keysPressMap.key)) {
      this.keysPressMap.key[event.key] = { press: 'Press', release: 'Release' };
      if (this.app.model) {
        if (!this.blurWindow) {
          this.app.model.sendEvent(0, { 'id': 'keyPress', 'key': event.key });
        }
      }
    }
  } // eventKeyDown

  eventKeyUp(event) {
    if (event.key in this.keysPressMap.key) {
      delete this.keysPressMap.key[event.key];
    }
    if (this.app.model) {
      this.app.model.sendEvent(0, { 'id': 'keyRelease', 'key': event.key });
    }
  } // eventKeyUp

  eventClick(event) {
    event.preventDefault();
    if (this.app.model) {
      this.app.model.sendEvent(0, { 'id': 'mouseClick', 'key': 'left', 'x': this.app.layout.convertClientCoordinateX(event.clientX), 'y': this.app.layout.convertClientCoordinateY(event.clientY) });
    }
  } // eventClick

  eventContextMenu(event) {
    event.preventDefault();
    if (this.app.model) {
      this.app.model.sendEvent(0, { 'id': 'mouseClick', 'key': 'right', 'x': this.app.layout.convertClientCoordinateX(event.clientX), 'y': this.app.layout.convertClientCoordinateY(event.clientY) });
    }
  } // eventContextMenu

  eventMouseDown(event) {
    var buttons = event.buttons;
    for (var b = 0; b < 8; b++) {
      if (buttons%2 == 1) {
        if (!('MouseButton'+(1<<b) in this.keysPressMap.key)) {
          this.keysPressMap.key['MouseButton'+(1<<b)] = { press: 'Press', release: 'Release' };
          if (this.app.model) {
            if (!this.blurWindow) {
              this.app.model.sendEvent(0, { 'id': 'keyPress', 'key': 'MouseButton'+(1<<b) });
            }
          }
        }
      }
      buttons >>= 1;
    }
  } // eventMouseDown

  eventMouseUp(event) {
    var buttons = event.buttons;
    for (var b = 0; b < 8; b++) {
      if (buttons%2 == 0) {
        if ('MouseButton'+(1<<b) in this.keysPressMap.key) {
          delete this.keysPressMap.key['MouseButton'+(1<<b)];
          if (this.app.model) {
            this.app.model.sendEvent(0, { 'id': 'keyRelease', 'key': 'MouseButton'+(1<<b) });
          }
        }
      }
      buttons >>= 1;
    }
  } // eventMouseUp

  eventMouseMove(event) {
  } // eventMouseMove

  eventTouchStart(event) {
    event.preventDefault();
    if (this.app.model) {
      this.app.model.sendEvent(0, { 'id': 'mouseClick', 'key': 'left', 'x': this.app.layout.convertClientCoordinateX(event.touches[0].clientX), 'y': this.app.layout.convertClientCoordinateY(event.touches[0].clientY) });
    }
  } // eventTouchStart

  eventTouchEnd(event) {
    event.preventDefault();
  } // eventTouchEnd

  eventTouchCancel(event) {
    event.preventDefault();
  } // eventTouchCancel

  eventTouchMove(event) {
    event.preventDefault();
  } // eventTouchMove

  eventGamePadConnected(event) {
  } // eventGamePadConnected

  eventGamePadDisconnected(event) {
  } // eventGamePadDisconnected

  eventBlurWindow(event) {
    this.blurWindow = true;
    this.sendEventsActiveKeys('release');
    this.app.model.sendEvent(0, { id: 'blurWindow' });
  } // eventOnBlurWindow

  eventFocusWindow(event) {
    this.blurWindow = false;
  } // eventOnFocusWindow

  sendEventsActiveKeys(type) {
    Object.keys(this.keysPressMap).forEach((eventType) => {
      Object.keys(this.keysPressMap[eventType]).forEach((key) => {
        this.app.model.sendEvent(0, { 'id': eventType + this.keysPressMap[eventType][key][type], 'key': key });
      });
    });
  } // sendEventsActiveKeys

} // class InputEventsManager

export default InputEventsManager;
