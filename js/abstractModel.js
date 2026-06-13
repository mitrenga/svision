/**/
const { AbstractEntity } = await import('./abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from './abstractEntity.js';
/**/
// begin code

/**
 * Base class for an application model. Manages the border and desktop root
 * entities, the timed event queue, audio events and data fetching, and
 * coordinates the per-frame update, resize and draw of the entity tree.
 */
export class AbstractModel {

  /**
   * Creates the model, reading border and desktop dimensions/colors from the
   * platform and initializing the event queue and timing state.
   * @param {AbstractApp} app - The owning application.
   */
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

    this.fetchDataId = '';
  } // constructor

  /**
   * Creates the root desktop entity.
   * @returns {AbstractEntity} A new empty entity used as the desktop root.
   */
  newDesktopEntity() {
    return new AbstractEntity(null, 0, 0, 0, 0, false, false);
  } // desktopEntity

  /**
   * Creates the root border entity.
   * @returns {AbstractEntity} A new empty entity used as the border root.
   */
  newBorderEntity() {
    return new AbstractEntity(null, 0, 0, 0, 0, false, false);
  } // newBorderEntity

  /**
   * Initializes the model by creating, configuring and initializing the
   * border entity (when the platform defines a border) and the desktop
   * entity, wiring their app/model/colors/stack and platform-provided objects.
   */
  init() {
    if (this.app.platform.border(this.app) !== false) {
      this.borderEntity = this.newBorderEntity();
      this.borderEntity.app = this.app;
      this.borderEntity.model = this;
      this.borderEntity.bkColor = this.app.platform.border(this.app).defaultColor;
      this.borderEntity.stack = this.app.stack;
      var entityObjects = this.app.platform.initEntity(this.borderEntity);
      if (entityObjects !== false) {
        Object.keys(entityObjects).forEach((key) => {
          this.borderEntity.stack[key] = entityObjects[key];
        });
      }
      this.borderEntity.init();
    }
    this.desktopEntity = this.newDesktopEntity();
    this.desktopEntity.app = this.app;
    this.desktopEntity.model = this;
    this.desktopEntity.bkColor = this.app.platform.desktop(this.app).defaultColor;
    this.desktopEntity.stack = this.app.stack;
    var entityObjects = this.app.platform.initEntity(this.desktopEntity);
    if (entityObjects !== false) {
      Object.keys(entityObjects).forEach((key) => {
        this.desktopEntity.stack[key] = entityObjects[key];
      });
    }
    this.desktopEntity.init();
  } // init

  /**
   * Tears down the model. The base implementation does nothing.
   */
  shutdown() {
  } // shutdown

  /**
   * Dispatches an event immediately or schedules it for later delivery.
   * @param {number} timing - Delay in milliseconds; 0 handles the event now, otherwise it is queued relative to app.now.
   * @param {Object} event - The event object (must carry an `id`).
   */
  sendEvent(timing, event) {
    if (timing == 0) {
      this.handleEvent(event);
    } else {
      this.events.push({id: event.id, timing: this.app.now+timing, event: event});
    }
  } // sendEvent

  /**
   * Removes all queued events matching the given id.
   * @param {string} id - The event id to cancel.
   */
  cancelEvent(id) {
    for (var e = 0; e < this.events.length; e++) {
      if (id == this.events[e].id) {
        this.events.splice(e, 1);
      }
    }
  } // cancelEvent

  /**
   * Handles an event. Audio-related events are processed directly via the
   * audio manager; otherwise the event is forwarded to the border entity and
   * then the desktop entity until one handles it.
   * @param {Object} event - The event object, identified by its `id`.
   * @returns {boolean} True if the event was handled, false otherwise.
   */
  handleEvent(event) {
    switch (event.id) {
      case 'openAudioChannel':
        this.app.audioManager.openChannel(event.channel, event.options);
        return true;
      case 'closeAudioChannel':
        this.app.audioManager.closeChannel(event.channel);
        return true;
      case 'closeAllAudioChannels':
        this.app.audioManager.closeAllChannels();
        return true;
      case 'stopAudioChannel':
        this.app.audioManager.stopChannel(event.channel);
        return true;
      case 'stopAllAudioChannels':
        this.app.audioManager.stopAllChannels();
        return true;
      case 'pauseAllAudioChannels':
        this.app.audioManager.pauseAllChannels();
        return true;
      case 'continueAllAudioChannels':
        this.app.audioManager.continueAllChannels();
        return true;
      case 'muteAudioChannel':
        this.app.audioManager.muteChannel(event.channel, event.muted);
        return true;
      case 'unsupportedAudioChannel':
        this.app.audioManager.unsupportedAudioChannel = this.app.audioManager.channels[event.channel].id;
        this.sendEvent(50, {id: 'closeAudioChannel', channel: event.channel});
        this.sendEvent(100, {id: 'openAudioChannel', channel: event.channel, options: {}});
        return true;
      case 'playSound':
        if (event.options !== false) {
          if ('next' in event.options) {
            event.options.nextSound = this.app.audioManager.audioData(event.channel, event.options.next, event.options);
          }
        }
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

  /**
   * Sends a message to a web worker. The base implementation does nothing.
   * @param {Object} event - The message/event to send to the worker.
   */
  sendWorkerMessage(event) {
  } // sendWorkerMessage

  /**
   * Handles a message received from a web worker. The base implementation does nothing.
   * @param {Object} event - The message/event received from the worker.
   */
  handleWorkerMessage(event) {
  } // handleWorkerMessage

  /**
   * Requests data from a URL via the application, recording the fetch id so
   * results can be matched back to this model.
   * @param {string} url - The endpoint to fetch data from.
   * @param {Object|false} storage - Storage policy passed through to the app, or false.
   * @param {*} data - The payload to send.
   */
  fetchData(url, storage, data) {
    this.fetchDataId = this.app.fetchData(url, storage, data, this);
  } // fetchData

  /**
   * Distributes fetched data to the border and desktop entities and redraws
   * the model.
   * @param {Object} data - The received data payload.
   */
  setData(data) {
    if (this.borderEntity != null) {
      this.borderEntity.setData(data);
    }
    this.desktopEntity.setData(data);
    this.drawModel();
  } // setData

  /**
   * Handles a data-fetch error by showing an error message via the app.
   * @param {Error} error - The error that occurred during fetching.
   */
  errorData(error) {
    this.app.showErrorMessage(error.message, 'restart');
  } // errorData

  /**
   * Per-frame model loop. Updates gamepad states, dispatches any queued
   * events whose timing has elapsed and refreshes audio channels.
   * @param {number} timestamp - The current frame timestamp.
   */
  loopModel(timestamp) {
    this.app.inputEventsManager.updateGamepadsStates();
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

  /**
   * Recomputes desktop dimensions from the platform, lets the layout resize
   * the model, emits a 'resizeModel' event and redraws.
   */
  resizeModel() {
    this.desktopWidth = this.app.platform.desktop(this.app).width;
    this.desktopHeight = this.app.platform.desktop(this.app).height;
    this.app.layout.resizeModel(this);
    this.sendEvent(0, {id: 'resizeModel'});
    this.drawModel();
  } // resizeModel

  /**
   * Clears the canvas and draws the border entity (when present) and the
   * desktop entity.
   */
  drawModel() {
    this.app.layout.clearCanvas();
    if (this.borderEntity != null) {
      this.borderEntity.drawEntity();
    }
    this.desktopEntity.drawEntity();
  } // drawModel

} // AbstractModel

export default AbstractModel;
