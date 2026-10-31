const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
// begin code

/**
 * A clickable button entity built on top of TextEntity. It renders a text label
 * and fires a configured event when activated by a hot key, a mouse click, or a
 * touch within its bounds.
 *
 * `options.cornerMask` rounds the corners of the background: the top left
 * corner as rows of `#` (painted) and `-` (left out), like
 * `['---#', '-###', '-###', '####']`; the other three corners are its mirror
 * images. The hover and click colours are rounded the same way.
 */
export class ButtonEntity extends TextEntity {

  /**
   * Creates a button entity.
   * @param {AbstractEntity} parentEntity - The parent entity this button is attached to.
   * @param {Object} fonts - The font set used to render the button label.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Button width.
   * @param {number} height - Button height.
   * @param {string} text - The label text shown on the button.
   * @param {Object} event - The event object sent when the button is activated.
   * @param {Array} hotKeys - Keys that trigger the button when pressed.
   * @param {string|false} penColor - Foreground (text) color.
   * @param {string|false} bkColor - Background color.
   * @param {Object} options - Additional text/rendering options passed to TextEntity, and `cornerMask` (see the class comment).
   */
  constructor(parentEntity, fonts, x, y, width, height, text, event, hotKeys, penColor, bkColor, options) {
    super(parentEntity, fonts, x, y, width, height, text, penColor, bkColor, options);
    this.id = 'ButtonEntity';

    this.event = event;
    this.hotKeys = hotKeys;
    this.cornerMask = (options && options.cornerMask) || false;
  } // constructor

  /**
   * The background with the corners of `cornerMask` left out, then the
   * children; without a mask (or on a button too small for it) the whole
   * rectangle, as every entity has it.
   */
  paintBackground() {
    var mask = this.cornerMask;
    var size = mask ? mask.length : 0;
    if (!mask || this.hide || this.width < 2*size || this.height < 2*size) {
      super.paintBackground();
      return;
    }

    var color = this.bkColor;
    if (this.hoverColor !== false && this.hoverState) {
      color = this.hoverColor;
    }
    if (this.clickState) {
      if (this.clickColor !== false) {
        color = this.clickColor;
      } else if (this.hoverColor !== false) {
        color = this.hoverColor;
      }
    }
    if (color != false) {
      // the part of the parent's visible area this button lies in, in its own coordinates
      var left = Math.max(0, this.parentCoverX-this.x), top = Math.max(0, this.parentCoverY-this.y);
      var right = Math.min(this.width, this.parentWidth-this.x), bottom = Math.min(this.height, this.parentHeight-this.y);
      var paint = (x, y, width, height) => {
        var x1 = Math.max(x, left), y1 = Math.max(y, top);
        var x2 = Math.min(x+width, right), y2 = Math.min(y+height, bottom);
        if (x2 > x1 && y2 > y1) {
          this.app.layout.paint(this, x1, y1, x2-x1, y2-y1, color);
        }
      };
      var w = this.width, h = this.height;
      paint(0, size, w, h-2*size);
      paint(size, 0, w-2*size, size);
      paint(size, h-size, w-2*size, size);
      for (var row = 0; row < size; row++) {
        for (var col = 0; col < size; col++) {
          if (mask[row][col] == '#') {
            paint(col, row, 1, 1);
            paint(w-1-col, row, 1, 1);
            paint(col, h-1-row, 1, 1);
            paint(w-1-col, h-1-row, 1, 1);
          }
        }
      }
    }
    this.drawSubEntities();
  } // paintBackground

  /**
   * Handles input events for the button: pressing a configured hot key fires the
   * event, while mouse/touch presses arm the button and matching releases over the
   * button fire the event.
   * @param {Object} event - The input event to process.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'keyPress':
        if (!this.hide) {
          if (this.hotKeys.indexOf(event.key) >= 0) {
            this.sendEvent(0, 0, this.event);
            return true;
          }
          if ((event.key == 'Mouse1' && this.pointOnEntity(event))) {
            this.app.inputEventsManager.keysMap.Mouse1 = this;
            this.clickState = true;
            return true;
          }
          if ((event.key == 'Touch' && this.pointOnEntity(event))) {
            this.app.inputEventsManager.touchesMap[event.identifier] = this;
            this.clickState = true;
            return true;
          }
        }
        break;
      case 'keyRelease':
        if (!this.hide) {
          if ((event.key == 'Mouse1' && this.app.inputEventsManager.keysMap.Mouse1 === this && this.pointOnEntity(event))) {
            this.sendEvent(0, 0, this.event);
            return true;
          }
          if ((event.key == 'Touch' && this.app.inputEventsManager.touchesMap[event.identifier] === this && this.pointOnEntity(event))) {
            this.sendEvent(0, 0, this.event);
            return true;
          }
        }
        break;
    }
    
    return false;
  } // handleEvent

} // ButtonEntity
