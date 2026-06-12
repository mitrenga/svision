/**/
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
/*/
import TextEntity from './textEntity.js';
/**/
// begin code

/**
 * A clickable button entity built on top of TextEntity. It renders a text label
 * and fires a configured event when activated by a hot key, a mouse click, or a
 * touch within its bounds.
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
   * @param {Object} options - Additional text/rendering options passed to TextEntity.
   */
  constructor(parentEntity, fonts, x, y, width, height, text, event, hotKeys, penColor, bkColor, options) {
    super(parentEntity, fonts, x, y, width, height, text, penColor, bkColor, options);
    this.id = 'ButtonEntity';

    this.event = event;
    this.hotKeys = hotKeys;
  } // constructor

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

export default ButtonEntity;
