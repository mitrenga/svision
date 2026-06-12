/**/

/*/

/**/
// begin code

/**
 * Centralizes browser input handling for the application. It listens to
 * keyboard, mouse, wheel, touch, gamepad, and window focus/blur events,
 * tracks the set of currently active keys/touches/buttons, translates client
 * coordinates into the application's layout space, and forwards normalized
 * key/move/hover events to the application model.
 */
export class InputEventsManager {

  /**
   * Initializes the manager with empty input-state maps and a reference to the
   * owning application.
   * @param {Object} app - The owning application instance (provides model,
   *   layout, controls, and timing).
   */
  constructor(app) {
    this.app = app;

    this.keysMap = {};
    this.mouseHover = false;
    this.touchesMap = {};
    this.touchesGameControls = {};
    this.gamepadsMap = {};
    this.gamepadsConfig = false;
    this.blurWindow = false;
    this.lastEventForAudio = false;
  } // constructor
  
  /**
   * Determines whether a fresh user gesture is needed to (re)enable audio,
   * which is true when no qualifying event has been seen yet or the last one
   * is older than five seconds.
   * @returns {boolean} True if a new user event is required for audio.
   */
  needEventForAudio() {
    if (this.lastEventForAudio === false) {
      return true;
    }
    if (this.app.now-this.lastEventForAudio > 5000) {
      return true;
    }
    return false;
  } // needEventForAudio

  /**
   * Handles a keydown event: records the key as active (respecting the model's
   * autorepeat setting), updates the audio gesture timestamp for Enter, and
   * sends a 'keyPress' event to the model.
   * @param {KeyboardEvent} event - The native keydown event.
   */
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

  /**
   * Handles a keyup event: removes the key from the active set, updates the
   * audio gesture timestamp for Enter, and sends a 'keyRelease' event to the
   * model.
   * @param {KeyboardEvent} event - The native keyup event.
   */
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

  /**
   * Suppresses the browser's default click behavior.
   * @param {MouseEvent} event - The native click event.
   */
  eventClick(event) {
    event.preventDefault();
  } // eventClick

  /**
   * Suppresses the browser's default context menu.
   * @param {MouseEvent} event - The native contextmenu event.
   */
  eventContextMenu(event) {
    event.preventDefault();
  } // eventContextMenu

  /**
   * Handles a mousedown event: for each newly pressed mouse button, records it
   * as active, updates the audio gesture timestamp for the primary button, and
   * sends a 'keyPress' event with layout-converted coordinates to the model.
   * @param {MouseEvent} event - The native mousedown event.
   */
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

  /**
   * Handles a mouseup event: for each released mouse button, sends a
   * 'keyRelease' event with layout-converted coordinates, clears any tracked
   * entity click state, updates the audio gesture timestamp for the primary
   * button, and removes the button from the active set.
   * @param {MouseEvent} event - The native mouseup event.
   */
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

  /**
   * Handles a mousemove event: clears any stale hover state, converts the
   * coordinates to layout space, and sends either a 'mouseHover' event or, when
   * the primary button is held, a 'keyMove' event, updating the dragged
   * entity's click state based on whether the pointer is over it.
   * @param {MouseEvent} event - The native mousemove event.
   */
  eventMouseMove(event) {
    if (this.mouseHover !== false) {
      this.mouseHover.hoverState = false;
    }
    var clientX = this.app.layout.convertClientCoordinateX(event.clientX);          
    var clientY = this.app.layout.convertClientCoordinateY(event.clientY);

    if (this.app.model) {
      if (!('Mouse1' in this.keysMap)) {
        this.app.model.sendEvent(0, {id: 'mouseHover', x: clientX, y: clientY});
      } else {
        this.app.model.sendEvent(0, {id: 'keyMove', key: 'Mouse1', x: clientX, y: clientY});
      }
    }

    if ('Mouse1' in this.keysMap && this.keysMap.Mouse1 !== false && this.keysMap.Mouse1 !== true) {
      if (this.keysMap.Mouse1.pointOnEntity({x: clientX, y: clientY})) {
        this.keysMap.Mouse1.clickState = true;
      } else {
        this.keysMap.Mouse1.clickState = false;
      }
    }
  } // eventMouseMove

  /**
   * Handles a wheel event by sending a 'mouseWheel' event with the scroll
   * deltas and layout-converted coordinates to the model.
   * @param {WheelEvent} event - The native wheel event.
   */
  eventWheel(event) {
    var deltaX = event.deltaX;
    var deltaY = event.deltaY;
    if (this.app.model) {
      var clientX = this.app.layout.convertClientCoordinateX(event.clientX);          
      var clientY = this.app.layout.convertClientCoordinateY(event.clientY);
      this.app.model.sendEvent(0, {id: 'mouseWheel', deltaX: deltaX, deltaY: deltaY, x: clientX, y: clientY});
    }
  } // eventWheel

  /**
   * Handles a touchstart event: prevents the default, marks touchscreen
   * support and the audio gesture timestamp, and for each new touch records it
   * and sends a 'keyPress' 'Touch' event with layout-converted coordinates.
   * @param {TouchEvent} event - The native touchstart event.
   */
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

  /**
   * Handles a touchend event: prevents the default, updates the audio gesture
   * timestamp, and for each ended touch sends a 'keyRelease' 'Touch' event,
   * clears any tracked entity click state, and removes the touch from the
   * active set.
   * @param {TouchEvent} event - The native touchend event.
   */
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
      }
    }
  } // eventTouchEnd

  /**
   * Handles a touchmove event: prevents the default and, for each moved touch
   * that is bound to an entity, sends a 'keyMove' 'Touch' event with
   * layout-converted coordinates and updates the entity's click state based on
   * whether the touch point is over it.
   * @param {TouchEvent} event - The native touchmove event.
   */
  eventTouchMove(event) {
    event.preventDefault();
    for (var t = 0; t < event.changedTouches.length; t++) {
      var changedTouch = event.changedTouches[t];
      if (changedTouch.identifier in this.touchesMap) {
        if (this.app.model) {
          if (typeof (this.touchesMap[changedTouch.identifier]) != "boolean") {
            var touchX = this.app.layout.convertClientCoordinateX(changedTouch.clientX);          
            var touchY = this.app.layout.convertClientCoordinateY(changedTouch.clientY);
            this.app.model.sendEvent(0, {id: 'keyMove', key: 'Touch', identifier: changedTouch.identifier, x: touchX, y: touchY});
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

  /**
   * Polls connected gamepads and emits 'keyPress'/'keyRelease' events for
   * button and axis state transitions. When a gamepad is being configured
   * (gamepadsConfig set) it reports raw button/axis identifiers; otherwise it
   * maps physical buttons/axes to the configured event names defined in
   * app.controls.gamepads.devices.
   */
  updateGamepadsStates() {
    if (!('gamepads' in this.app.controls)) {
      return;
    }
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

  /**
   * Handles loss of window focus: marks the blur state, releases all active
   * keys, notifies the model with a 'blurWindow' event, and clears any hover
   * state.
   * @param {FocusEvent} event - The native blur event.
   */
  eventBlurWindow(event) {
    this.blurWindow = true;
    this.sendEventsActiveKeys('Release');
    this.app.model.sendEvent(0, {id: 'blurWindow'});
    if (this.mouseHover !== false) {
      this.mouseHover.hoverState = false;
    }
  } // eventOnBlurWindow

  /**
   * Handles regaining window focus by clearing the blur state.
   * @param {FocusEvent} event - The native focus event.
   */
  eventFocusWindow(event) {
    this.blurWindow = false;
  } // eventOnFocusWindow

  /**
   * Sends a 'key<type>' event to the model for every currently active key,
   * touch game control, and gamepad mapping; when type is 'Release' it also
   * resets all active-input maps to empty.
   * @param {string} type - Event suffix, e.g. 'Press' or 'Release'.
   */
  sendEventsActiveKeys(type) {
    Object.keys(this.keysMap).forEach((key) => {
      this.app.model.sendEvent(0, {id: 'key'+type, key: key});
    });
    Object.keys(this.touchesGameControls).forEach((identifier) => {
      var touch = this.touchesGameControls[identifier];
      this.app.model.sendEvent(0, {id: 'key'+type, key: 'RetryTouch', action: touch.action});
    });
    Object.keys(this.gamepadsMap).forEach((buttonId) => {
      this.app.model.sendEvent(0, {id: 'key'+type, key: this.gamepadsMap[buttonId]});
    });
    if (type == 'Release') {
      this.keysMap = {};
      this.touchesMap = {};
      this.touchesGameControls = {};
      this.gamepadsMap = {};
    }
  } // sendEventsActiveKeys

} // InputEventsManager

export default InputEventsManager;
