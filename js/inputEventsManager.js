/**/

/*/

/**/
// begin code

export class InputEventsManager {
  
  constructor(app) {
    this.app = app;
    this.firstUserGestureEvent = true;
  } // constructor

  initAfterUserGesture() {
    if (this.firstUserGestureEvent == true) {
      this.app.initAfterUserGesture();
      this.firstUserGestureEvent = false;
    }
  } // initAfterUserGesture

  eventKeyDown(event) {
    if (this.app.model) {
      if (event.key == 'Enter') {
        this.initAfterUserGesture();
      }
      this.app.model.sendEvent(0, {'id': 'keyPress', 'key': event.key});
    }
  } // eventKeyDown

  eventKeyUp(event) {
    if (this.app.model) {
      this.app.model.sendEvent(0, {'id': 'keyRelease', 'key': event.key});
    }
  } // eventKeyUp

  eventClick(event) {
    event.preventDefault();
    if (this.app.model) {
      this.initAfterUserGesture();
      this.app.model.sendEvent(0, {'id': 'mouseClick', 'key': 'left', 'x': this.app.layout.convertClientCoordinateX(event.clientX), 'y': this.app.layout.convertClientCoordinateY(event.clientY)});
    }
  } // eventClick

  eventContextMenu(event) {
    event.preventDefault();
    if (this.app.model) {
      this.initAfterUserGesture();
      this.app.model.sendEvent(0, {'id': 'mouseClick', 'key': 'right', 'x': this.app.layout.convertClientCoordinateX(event.clientX), 'y': this.app.layout.convertClientCoordinateY(event.clientY)});
    }
  } // eventContextMenu
  
  eventMouseDown(event) {
  } // eventMouseDown
  
  eventMouseUp(event) {
  } // eventMouseUp
  
  eventMouseMove(event) {
  } // eventMouseMove
  
  eventTouchStart(event) {
    event.preventDefault();
    if (this.app.model) {
      this.initAfterUserGesture();
      this.app.model.sendEvent(0, {'id': 'mouseClick', 'key': 'left', 'x': this.app.layout.convertClientCoordinateX(event.touches[0].clientX), 'y': this.app.layout.convertClientCoordinateY(event.touches[0].clientY)});
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

} // class InputEventsManager

export default InputEventsManager;
