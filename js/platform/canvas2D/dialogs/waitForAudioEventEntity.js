const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { DialogProperties } = await import('./dialogProperties.js?ver='+window.srcVersion);
const { DialogTheme } = await import('./dialogTheme.js?ver='+window.srcVersion);
// begin code

/**
 * Modal entity shown when audio playback requires a user gesture. It prompts
 * the user to press Enter, click or touch, then emits a configured
 * continuation event so audio can start.
 *
 * Contents only, no frame: the opener (VolumeEntity before PLAY SAMPLE, a
 * menu before the game starts) puts it in a window (DialogEntity, without a
 * title) with the `waitForAudioEvent` part of the dialog properties, whose
 * `theme.penColor` is the colour of the message, `theme.labelFont` its
 * font. The message fills the contents with a margin of 3 px (122 x 39 in
 * the 5x5 font). It closes itself after
 * five seconds, or when the opener sends 'closePressAnyKey' down; closing
 * sends 'contentClosed' to the parent so the window can close with it.
 */
export class WaitForAudioEventEntity extends AbstractEntity {

  /**
   * Creates the wait-for-audio-event prompt entity.
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} continueEvent - The id of the event emitted once a user gesture is received.
   * @param {Object} [properties] - The `waitForAudioEvent` dialog properties, see DialogProperties; the contents use its `theme`.
   */
  constructor(parentEntity, x, y, width, height, continueEvent, properties = {}) {
    properties = DialogProperties.merge(properties, 'waitForAudioEvent');
    super(parentEntity, x, y, width, height, properties.theme.penColor, properties.theme.bkColor);
    this.id = 'WaitForAudioEventEntity';

    this.properties = properties;
    this.theme = properties.theme;
    this.continueEvent = continueEvent;
  } // constructor

  /**
   * Builds the prompt with the explanatory message and schedules an
   * automatic close after a timeout.
   */
  init() {
    super.init();
    var message = 'WE APOLOGIZE, BUT TO START THE AUDIO, YOU MUST PRESS THE ENTER KEY, CLICK THE MOUSE OR TOUCH THE TOUCHSCREEN. ␣';
    this.addEntity(new TextEntity(this, DialogTheme.font(this.app, this.theme.labelFont), 0, 0, this.width, this.height, message, this.theme.penColor, false, {align: 'justify', textWrap: true, margin: 3}));
    this.sendEvent(0, 5000, {id: 'closePressAnyKey'});
  } // init

  /**
   * Closes the prompt: the contents go, and the parent is told so a window
   * can go with them.
   */
  close() {
    this.destroy();
    this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
  } // close

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
        this.close();
        return true;
    }
    return false;
  } // handleEvent

} // WaitForAudioEventEntity
