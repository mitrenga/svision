/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
/**/
// begin code

/**
 * ZX Spectrum themed modal entity shown when audio playback requires a user
 * gesture. It prompts the user to press Enter, click or touch, then emits a
 * configured continuation event so audio can start.
 */
export class ZXWaitForAudioEventEntity extends AbstractEntity {

  /**
   * Creates the wait-for-audio-event prompt entity.
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} penColor - The foreground (text and frame) colour.
   * @param {string} bkColor - The background colour.
   * @param {string} continueEvent - The id of the event emitted once a user gesture is received.
   */
  constructor(parentEntity, x, y, width, height, penColor, bkColor, continueEvent) {
    super(parentEntity, x, y, width, height, penColor, bkColor);
    this.id = 'ZXWaitForAudioEventEntity';    

    this.continueEvent = continueEvent;
  } // constructor

  /**
   * Builds the framed prompt box with the explanatory message and schedules an
   * automatic close after a timeout.
   */
  init() {
    super.init();
    this.addEntity(new AbstractEntity(this, 2, 2, this.width-4, this.height-4, false, this.penColor));
    this.addEntity(new AbstractEntity(this, 3, 3, this.width-6, this.height-6, false, this.bkColor));
    var message = 'WE APOLOGIZE, BUT TO START THE AUDIO, YOU MUST PRESS THE ENTER KEY, CLICK THE MOUSE OR TOUCH THE TOUCHSCREEN. \u00A0';
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 1, 1, this.width-2, this.height-2, message, this.penColor, false, {align: 'justify', textWrap: true, margin: 5}));
    this.sendEvent(0, 5000, {id: 'closePressAnyKey'});
  } // init

  /**
   * Handles key, mouse and touch events, emitting the configured continuation
   * event on a confirming gesture and closing the prompt on timeout.
   * @param {Object} event - The event object, identified by its id property.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'keyPress':
        switch (event.key) {
          case 'Enter':
            this.sendEvent(0, 0, {id: this.continueEvent});
            return true;
          case 'Mouse1':
            this.app.inputEventsManager.keysMap[event.key] = this;
            return true;
          case 'Touch':
            this.app.inputEventsManager.touchesMap[event.identifier] = this;
            return true;
        }
        break;

      case 'keyRelease':
        switch (event.key) {
          case 'Mouse1':
            if (this.app.inputEventsManager.keysMap[event.key] === this) {
              this.sendEvent(0, 0, {id: this.continueEvent});
              return true;
            }
            return true;
          case 'Touch':
            if (this.app.inputEventsManager.touchesMap[event.identifier] === this) {
              this.sendEvent(0, 0, {id: this.continueEvent});
              return true;
            }
            return true;
        }
        break;

      case 'closePressAnyKey':
        this.destroy();
        return true;
    }
    return false;
  } // handleEvent

} // ZXWaitForAudioEventEntity

export default ZXWaitForAudioEventEntity;
