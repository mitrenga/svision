/**/

/*/

/**/
// begin code

export class InputEventsManager {

  constructor(app) {
    this.app = app;

    this.keysMap = {};
    this.mouseHover = false;
    this.touchesMap = {};
    this.touchesControls = {};
    this.gamepadsMap = {};
    this.gamepadsConfig = false;
    this.blurWindow = false;
    this.lastEventForAudio = false;
  } // constructor
  
  needEventForAudio() {
    if (this.lastEventForAudio === false) {
      return true;
    }
    if (this.app.now-this.lastEventForAudio > 5000) {
      return true;
    }
    return false;
  } // needEventForAudio

  eventKeyDown(event) {
    if (this.app.model.autorepeatKeys || !(event.key in this.keysMap)) {
      this.keysMap[event.key] = true;
      if (this.app.model) {
        if (event.key == 'Enter') {
          this.lastEventForAudio = this.app.now;
        }
        this.app.model.sendEvent(0, {id: 'keyPress', key: event.key});
      }
    }
  } // eventKeyDown

  eventKeyUp(event) {
    if (event.key in this.keysMap) {
      delete this.keysMap[event.key];
    }
    if (this.app.model) {
      if (event.key == 'Enter') {
        this.lastEventForAudio = this.app.now;
      }
      this.app.model.sendEvent(0, {id: 'keyRelease', key: event.key});
    }
  } // eventKeyUp

  eventClick(event) {
    event.preventDefault();
  } // eventClick

  eventContextMenu(event) {
    event.preventDefault();
  } // eventContextMenu

  eventMouseDown(event) {
    var buttons = event.buttons;
    if (buttons == 0) {
      buttons = 1;
    }
    for (var b = 0; b < 8; b++) {
      if (buttons%2 == 1) {
        if (!('Mouse'+(1<<b) in this.keysMap)) {
          if (b == 0) {
            this.lastEventForAudio = this.app.now;
          }
          this.keysMap['Mouse'+(1<<b)] = false;
          if (this.app.model) {
            var clientX = this.app.layout.convertClientCoordinateX(event.clientX);          
            var clientY = this.app.layout.convertClientCoordinateY(event.clientY);
            this.app.model.sendEvent(0, {id: 'keyPress', key: 'Mouse'+(1<<b), x: clientX, y: clientY});
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
          if (b == 0) {
            this.lastEventForAudio = this.app.now;
          }
          if (this.app.model) {
            var clientX = this.app.layout.convertClientCoordinateX(event.clientX);          
            var clientY = this.app.layout.convertClientCoordinateY(event.clientY);
            this.app.model.sendEvent(0, {id: 'keyRelease', key: 'Mouse'+(1<<b), x: clientX, y: clientY});
          }
          if (this.keysMap['Mouse'+(1<<b)] !== false && this.keysMap['Mouse'+(1<<b)] !== true) {
            this.keysMap['Mouse'+(1<<b)].clickState = false;
          }
          delete this.keysMap['Mouse'+(1<<b)];
        }
      }
      buttons >>= 1;
    }
  } // eventMouseUp

  eventMouseMove(event) {
    if (this.mouseHover !== false) {
      this.mouseHover.hoverState = false;
    }
    var clientX = this.app.layout.convertClientCoordinateX(event.clientX);          
    var clientY = this.app.layout.convertClientCoordinateY(event.clientY);

    if (!('Mouse1' in this.keysMap)) {
      this.app.model.sendEvent(0, {id: 'mouseHover', x: clientX, y: clientY});
    }

    if ('Mouse1' in this.keysMap && this.keysMap.Mouse1 !== false && this.keysMap.Mouse1 !== true) {
      if (this.keysMap.Mouse1.pointOnEntity({x: clientX, y: clientY})) {
        this.keysMap.Mouse1.clickState = true;
      } else {
        this.keysMap.Mouse1.clickState = false;
      }
    }
  } // eventMouseMove

  eventTouchStart(event) {
    event.preventDefault();
    this.lastEventForAudio = this.app.now;
    this.app.controls.touchscreen.supported = true;
    for (var t = 0; t < event.changedTouches.length; t++) {
      var changedTouch = event.changedTouches[t];
      if (!(changedTouch.identifier in this.touchesMap)) {
        this.touchesMap[changedTouch.identifier] = false;
        if (this.app.model) {
          var touchX = this.app.layout.convertClientCoordinateX(changedTouch.clientX);          
          var touchY = this.app.layout.convertClientCoordinateY(changedTouch.clientY);
          this.app.model.sendEvent(0, {id: 'keyPress', key: 'Touch', identifier: changedTouch.identifier, x: touchX, y: touchY});
        }
      }
    }
  } // eventTouchStart

  eventTouchEnd(event) {
    event.preventDefault();
    this.lastEventForAudio = this.app.now;
    for (var t = 0; t < event.changedTouches.length; t++) {
      var changedTouch = event.changedTouches[t];
      if (changedTouch.identifier in this.touchesMap) {
        if (this.app.model) {
          var touchX = this.app.layout.convertClientCoordinateX(changedTouch.clientX);          
          var touchY = this.app.layout.convertClientCoordinateY(changedTouch.clientY);
          this.app.model.sendEvent(0, {id: 'keyRelease', key: 'Touch', identifier: changedTouch.identifier, x: touchX, y: touchY});
        }        
        if (this.touchesMap[changedTouch.identifier] !== undefined && this.touchesMap[changedTouch.identifier] !== false && this.touchesMap[changedTouch.identifier] !== true) {
          this.touchesMap[changedTouch.identifier].clickState = false;
        }
        delete this.touchesMap[changedTouch.identifier];
        Object.keys(this.touchesControls).forEach((control) => {
          if (changedTouch.identifier in this.touchesControls[control]) {
            delete this.touchesControls[control][changedTouch.identifier];
          }
        });
      }
    }
  } // eventTouchEnd

  eventTouchMove(event) {
    event.preventDefault();
    for (var t = 0; t < event.changedTouches.length; t++) {
      var changedTouch = event.changedTouches[t];
      if (changedTouch.identifier in this.touchesMap) {
        if (this.app.model) {
          if (this.touchesMap[changedTouch.identifier] !== false && this.touchesMap[changedTouch.identifier] !== true) {
            var touchX = this.app.layout.convertClientCoordinateX(changedTouch.clientX);          
            var touchY = this.app.layout.convertClientCoordinateY(changedTouch.clientY);
            if (this.touchesMap[changedTouch.identifier].pointOnEntity({x: touchX, y: touchY})) {
              this.touchesMap[changedTouch.identifier].clickState = true;
            } else {
              this.touchesMap[changedTouch.identifier].clickState = false;
            }
          }        
        }
      }
    }
  } // eventTouchMove

  updateGamepadsStates() {
    if (!this.app.controls.gamepads.supported) {
      return;
    }

    var connectedDevices = navigator.getGamepads();
    if (this.gamepadsConfig !== false) {
      var connectedDevice = false;
      for (var d = 0; d < connectedDevices.length && connectedDevice === false; d++) {
        if (connectedDevices[d] != null && connectedDevices[d].id == this.gamepadsConfig) {
          connectedDevice = connectedDevices[d];
          break;
        }
      }
      if (connectedDevice !== false) {
        // buttons
        if ('buttons' in connectedDevice) {
          for (var b = 0; b < connectedDevice.buttons.length; b++) {
            var buttonId = 'B'+this.gamepadsConfig+b;
            var key = 'B'+b;
            if (connectedDevice.buttons[b].pressed) {
              if (!(buttonId in this.gamepadsMap)) {
                this.gamepadsMap[buttonId] = true;
                this.app.model.sendEvent(0, {id: 'keyPress', key: key});
              }
            } else {
              if ((buttonId in this.gamepadsMap)) {
                delete this.gamepadsMap[buttonId];
                this.app.model.sendEvent(0, {id: 'keyRelease', key: key});
              }
            }
          }
        }
        // axes
        if ('axes' in connectedDevice) {
          for (var a = 0; a < connectedDevice.axes.length; a++) {
            var axis = connectedDevice.axes[a];
            ['<', '>'].forEach((direction) => {
              var pressed = false;
              switch (direction) {
                case '<':
                  if (axis < -0.9) {
                    pressed = true;
                  }
                  break;
                case '>':
                  if (axis > 0.9) {
                    pressed = true;
                  }
                  break;
              }
              var axisId = 'A'+this.gamepadsConfig+a+direction;
              var key = 'A'+a+direction;
              if (pressed) {
                if (!(axisId in this.gamepadsMap)) {
                  this.gamepadsMap[axisId] = true;
                  this.app.model.sendEvent(0, {id: 'keyPress', key: key});
                }
              } else {
                if ((axisId in this.gamepadsMap)) {
                  delete this.gamepadsMap[axisId];
                  this.app.model.sendEvent(0, {id: 'keyRelease', key: key});
                }
              }
            });
          }
        }
      }
    } else {
      for (var d = 0; d < connectedDevices.length; d++) {
        var connectedDevice = connectedDevices[d];
        if (connectedDevice != null) {
          var id = connectedDevice.id;
          if (id in this.app.controls.gamepads.devices) {
            var controlsDevice = this.app.controls.gamepads.devices[id];
            // buttons
            if ('buttons' in controlsDevice) {
              Object.keys(controlsDevice.buttons).forEach((b) => {
                var buttonId = 'B'+id+b;
                var key = controlsDevice.buttons[b].event;
                if (connectedDevice.buttons[b].pressed) {
                  if (!(buttonId in this.gamepadsMap)) {
                    this.gamepadsMap[buttonId] = key;
                    this.app.model.sendEvent(0, {id: 'keyPress', key: key});
                  }
                } else {
                  if ((buttonId in this.gamepadsMap)) {
                    delete this.gamepadsMap[buttonId];
                    this.app.model.sendEvent(0, {id: 'keyRelease', key: key});
                  }
                }
              });
            }
            // axes
            if ('axes' in controlsDevice) {
              Object.keys(controlsDevice.axes).forEach((a) => {
                var axis = controlsDevice.axes[a];
                Object.keys(axis).forEach((direction) => {
                  var axisId = 'A'+id+a+direction;
                  var key = axis[direction].event;
                  var pressed = false;
                  switch (direction) {
                    case '<':
                      if (connectedDevice.axes[a] < -0.2) {
                        pressed = true;
                      }
                      break;
                    case '>':
                      if (connectedDevice.axes[a] > 0.2) {
                        pressed = true;
                      }
                      break;
                  }
                  if (pressed) {
                    if (!(axisId in this.gamepadsMap)) {
                      this.gamepadsMap[axisId] = key;
                      this.app.model.sendEvent(0, {id: 'keyPress', key: key});
                    }
                  } else {
                    if ((axisId in this.gamepadsMap)) {
                      delete this.gamepadsMap[axisId];
                      this.app.model.sendEvent(0, {id: 'keyRelease', key: key});
                    }
                  }
                });
              });
            }
          }
        }
      }
    }
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
    Object.keys(this.touchesControls).forEach((control) => {
      Object.keys(this.touchesControls[control]).forEach((identifier) => {
        this.app.model.sendEvent(0, {id: 'key'+type, key: 'Touch.'+control, identifier: identifier});
      });
    });
    Object.keys(this.gamepadsMap).forEach((buttonId) => {
      this.app.model.sendEvent(0, {id: 'key'+type, key: this.gamepadsMap[buttonId]});
    });
    if (type == 'Release') {
      this.keysMap = {};
      this.touchesMap = {};
      Object.keys(this.touchesControls).forEach((control) => {
        this.touchesControls[control] = {};
      });
      this.gamepadsMap = {};
    }
  } // sendEventsActiveKeys

} // InputEventsManager

export default InputEventsManager;
