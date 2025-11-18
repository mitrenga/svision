/**/

/*/

/**/
// begin code

export class InputEventsManager {

  constructor(app) {
    this.app = app;

    this.keysMap = {};
    this.touchesMap = {};
    this.gamepadsMap = {};
    this.gamepads = {};
    this.blurWindow = false;
  } // constructor
  
  eventKeyDown(event) {
    if (this.app.model.autorepeatKeys || !(event.key in this.keysMap)) {
      this.keysMap[event.key] = true;
      if (this.app.model) {
        if (!this.blurWindow) {
          this.app.model.sendEvent(0, {id: 'keyPress', key: event.key});
        }
      }
    }
  } // eventKeyDown

  eventKeyUp(event) {
    if (event.key in this.keysMap) {
      delete this.keysMap[event.key];
    }
    if (this.app.model) {
      this.app.model.sendEvent(0, {id: 'keyRelease', key: event.key});
    }
  } // eventKeyUp

  eventClick(event) {
    event.preventDefault();
    if (this.app.model) {
      this.app.model.sendEvent(0, {id: 'mouseClick', key: 'left', x: this.app.layout.convertClientCoordinateX(event.clientX), y: this.app.layout.convertClientCoordinateY(event.clientY)});
    }
  } // eventClick

  eventContextMenu(event) {
    event.preventDefault();
    if (this.app.model) {
      this.app.model.sendEvent(0, {id: 'mouseClick', key: 'right', x: this.app.layout.convertClientCoordinateX(event.clientX), y: this.app.layout.convertClientCoordinateY(event.clientY)});
    }
  } // eventContextMenu

  eventMouseDown(event) {
    var buttons = event.buttons;
    for (var b = 0; b < 8; b++) {
      if (buttons%2 == 1) {
        if (!('Mouse'+(1<<b) in this.keysMap)) {
          this.keysMap['Mouse'+(1<<b)] = true;
          if (this.app.model) {
            if (!this.blurWindow) {
              this.app.model.sendEvent(0, {id: 'keyPress', key: 'Mouse'+(1<<b)});
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
        if ('Mouse'+(1<<b) in this.keysMap) {
          delete this.keysMap['Mouse'+(1<<b)];
          if (this.app.model) {
            this.app.model.sendEvent(0, {id: 'keyRelease', key: 'Mouse'+(1<<b)});
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
      for (var t = 0; t < event.touches.length; t++) {
        if (!(event.touches[t].identifier in this.touchesMap)) {
          var touchX = this.app.layout.convertClientCoordinateX(event.touches[t].clientX);          
          var touchY = this.app.layout.convertClientCoordinateY(event.touches[t].clientY);
          var key = false;
          if (touchX < this.app.model.borderEntity.width/2) {
            key = 'Touch4';
          }
          if (touchX > this.app.model.borderEntity.width/2 && touchX < this.app.model.borderEntity.width/4*3) {
            key = 'Touch1';
          }
          if (touchX > this.app.model.borderEntity.width/4*3) {
            key = 'Touch2';
          }
          if (key !== false) {
            this.app.model.sendEvent(0, {id: 'keyPress', key: key});
            this.touchesMap[event.touches[t].identifier] = key;
          }
          this.app.model.sendEvent(0, {id: 'mouseClick', key: 'left', x: touchX, y: touchY});
        }
      }
    }
  } // eventTouchStart

  eventTouchEnd(event) {
    if (this.app.model) {
      Object.keys(this.touchesMap).forEach((identifier) => {
        var validTouch = false;
        for (var t = 0; t < event.touches.length; t++) {
          if (identifier == event.touches[t].identifier) {
            validTouch = true;
            break;
          }
        }
        if (!validTouch) {
          this.app.model.sendEvent(0, {id: 'keyRelease', key: this.touchesMap[identifier]});
          delete this.touchesMap[identifier];
        }
      });
    }
    event.preventDefault();
  } // eventTouchEnd

  eventTouchMove(event) {
    event.preventDefault();
  } // eventTouchMove

  eventGamepadConnected(event) {
    this.gamepads[event.gamepad.id] = event.gamepad;
    if (this.app.model) {
      this.app.model.sendEvent(0, {id: 'gamepadConnected'});
    }
  } // eventGamepadConnected

  eventGamepadDisconnected(event) {
    delete this.gamepads[event.gamepad.id];
    if (this.app.model) {
      this.app.model.sendEvent(0, {id: 'gamepadDisconnected'});
    }
  } // eventGamepadDisconnected

  updateGamepadsStates() {
    Object.keys(this.app.controls.gamepads).forEach((id) => {
      if (id in this.app.inputEventsManager.gamepads) {
        for (var b = 0; b < this.app.controls.gamepads[id].buttons.length; b++) {
          var buttonId = id+b.toString().padStart(2, '0');
          if (this.app.inputEventsManager.gamepads[id].buttons[this.app.controls.gamepads[id].buttons[b].id].pressed) {
            if (!(buttonId in this.gamepadsMap)) {
              this.gamepadsMap[buttonId] = this.app.controls.gamepads[id].buttons[b].event;
              this.app.model.sendEvent(0, {id: 'keyPress', key: this.app.controls.gamepads[id].buttons[b].event});
            }
          } else {
            if ((buttonId in this.gamepadsMap)) {
              delete this.gamepadsMap[buttonId];
              this.app.model.sendEvent(0, {id: 'keyRelease', key: this.app.controls.gamepads[id].buttons[b].event});
            }
          }
        }
      }
    });
  } // updateGamepadsStates

  eventBlurWindow(event) {
    this.blurWindow = true;
    this.sendEventsActiveKeys('Release');
    this.app.model.sendEvent(0, {id: 'blurWindow'});
  } // eventOnBlurWindow

  eventFocusWindow(event) {
    this.blurWindow = false;
  } // eventOnFocusWindow

  sendEventsActiveKeys(type) {
    Object.keys(this.keysMap).forEach((key) => {
      this.app.model.sendEvent(0, {id: 'key'+type, key: key});
    });
    Object.keys(this.touchesMap).forEach((identification) => {
      this.app.model.sendEvent(0, {id: 'key'+type, key: this.touchesMap[identification]});
    });
    Object.keys(this.gamepadsMap).forEach((buttonId) => {
      this.app.model.sendEvent(0, {id: 'key'+type, key: this.gamepadsMap[buttonId]});
    });
    if (type == 'Release') {
      this.keysMap = {};
      this.touchesMap = {};
      this.gamepadsMap = {};
    }
  } // sendEventsActiveKeys

} // InputEventsManager

export default InputEventsManager;
