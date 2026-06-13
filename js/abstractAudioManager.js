/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

/**
 * Coordinates multiple named audio buses, each backed by an audio
 * handler. Owns bus creation, lifecycle (open/close/stop/pause/
 * continue/mute), an audio-data cache, and the playSound dispatch logic
 * including resume retries while a bus's context is not yet running.
 */
export class AbstractAudioManager {

  /**
   * Creates the manager with empty bus, cache, and restart-sound maps.
   * @param {Object} app - The owning application instance, providing access to the model for event dispatch.
   */
  constructor(app) {
    this.app = app;
    this.id = 'AbstractAudioManager';
    this.ctx = null;
    this.buses = {};
    this.unsupportedAudioBus = false;
    this.audioDataCache = {};
    this.restartSounds = {};
  } // constructor

  /**
   * Lazily creates the single shared AudioContext that backs every bus.
   * No-op when a context already exists. Leaves the context null when the Web
   * Audio API is unavailable or its constructor fails (e.g. on devices with no
   * audio support); handlers then report the unsupported bus on a null
   * context and the manager falls back to the silent handler.
   * @returns {void}
   */
  openAudioContext() {
    if (this.ctx == null) {
      var classAudioCtx = (window.AudioContext || window.webkitAudioContext);
      if (classAudioCtx != null) {
        try {
          this.ctx = new (classAudioCtx)({sampleRate: 44100, latencyHint: 'interactive'});
        } catch(error) {
          this.ctx = null;
        }
      }
    }
  } // openAudioContext

  /**
   * Closes and discards the shared AudioContext, releasing the audio hardware.
   * Called once no buses remain open.
   * @returns {void}
   */
  closeAudioContext() {
    if (this.ctx != null) {
      this.ctx.close();
      this.ctx = null;
    }
  } // closeAudioContext

  /**
   * Returns the sample rate of the shared AudioContext, falling back to the
   * fixed 44100 Hz used for event timing when no context exists (e.g. while
   * audio is disabled).
   * @returns {number} The sample rate in Hz.
   */
  getSampleRate() {
    if (this.ctx == null) {
      return 44100;
    }
    return this.ctx.sampleRate;
  } // getSampleRate

  /**
   * Factory hook that creates the audio handler for a bus. Returns
   * false in the base class; subclasses override to supply a concrete handler.
   * @param {string} bus - Identifier of the bus.
   * @param {Object} options - Bus configuration options.
   * @returns {AbstractAudioHandler|boolean} A handler instance, or false when none can be created.
   */
  createAudioHandler(bus, options) {
    return false;
  } // createAudioHandler
  
  /**
   * Opens a bus: creates and registers the bus's handler when not
   * already present, ensures the shared AudioContext exists when that handler
   * needs one, passes the context to the handler, and resets the bus's
   * audio-data cache.
   * @param {string} bus - Identifier of the bus to open.
   * @param {Object} options - Bus configuration options.
   * @returns {void}
   */
  openBus(bus, options) {
    if (!(bus in this.buses)) {
      var audioHandler = this.createAudioHandler(bus, options);
      if (audioHandler != false) {
        if (audioHandler.needsContext()) {
          this.openAudioContext();
        }
        audioHandler.openBus(bus, options, this.ctx);
        this.buses[bus] = audioHandler;
      }
    }
    this.audioDataCache[bus] = {};
  } // openBus

  /**
   * Closes a bus, removing its handler when the close succeeds, and
   * resets the bus's audio-data cache. Discards the shared AudioContext
   * once no buses remain open.
   * @param {string} bus - Identifier of the bus to close.
   * @returns {void}
   */
  closeBus(bus) {
    if (bus in this.buses) {
      if (this.buses[bus].closeBus() == true) {
        delete this.buses[bus];
      }
    }
    this.audioDataCache[bus] = {};
    if (Object.keys(this.buses).length == 0) {
      this.closeAudioContext();
    }
  } // closeBus

  /**
   * Closes every currently open bus.
   * @returns {void}
   */
  closeAllBuses() {
    while (Object.keys(this.buses).length > 0) {
      this.closeBus(Object.keys(this.buses)[0]);
    }
    this.closeCounter++;
  } // closeAllBuses
  
  /**
   * Resumes the AudioContext of any bus that is not currently running,
   * recording any resume error on the bus's handler.
   * @returns {void}
   */
  refreshAllBuses() {
    Object.keys(this.buses).forEach(bus => {
      if (this.buses[bus].getState() != 'running') {
        if (this.buses[bus].ctx) {
          this.buses[bus].ctx.resume()
            .then(() => {
            })
            .catch(error => {
              console.error('AudioContext error: '+error.message);
              this.buses[bus].error = error.message;
            });
        }
      }
    });
  } // refreshAllBuses

  /**
   * Stops playback on a single bus.
   * @param {string} bus - Identifier of the bus to stop.
   * @returns {void}
   */
  stopBus(bus) {
    if (bus in this.buses) {
      this.buses[bus].stopBus();
    }
  } // stopBus

  /**
   * Stops playback on every open bus.
   * @returns {void}
   */
  stopAllBuses() {
    Object.keys(this.buses).forEach(bus => {
      this.stopBus(bus);
    });
  } // stopAllBuses

  /**
   * Pauses playback on a single bus.
   * @param {string} bus - Identifier of the bus to pause.
   * @returns {void}
   */
  pauseBus(bus) {
    if (bus in this.buses) {
      this.buses[bus].pauseBus();
    }
  } // pauseBus

  /**
   * Pauses playback on every open bus.
   * @returns {void}
   */
  pauseAllBuses() {
    Object.keys(this.buses).forEach(bus => {
      this.pauseBus(bus);
    });
  } // pauseAllBuses

  /**
   * Resumes playback on a single bus.
   * @param {string} bus - Identifier of the bus to resume.
   * @returns {void}
   */
  continueBus(bus) {
    if (bus in this.buses) {
      this.buses[bus].continueBus();
    }
  } // continueBus

  /**
   * Resumes playback on every open bus.
   * @returns {void}
   */
  continueAllBuses() {
    Object.keys(this.buses).forEach(bus => {
      this.continueBus(bus);
    });
  } // continueAllBuses

  /**
   * Mutes or unmutes a single bus.
   * @param {string} bus - Identifier of the bus.
   * @param {boolean} muted - True to mute, false to unmute.
   * @returns {void}
   */
  muteBus(bus, muted) {
    if (bus in this.buses) {
      this.buses[bus].muteBus(muted);
    }
  } // continueBus

  /**
   * Plays a sound on a bus. If the bus's context is not yet running
   * it attempts to resume and reschedules the request (up to 64 attempts);
   * once running and ready it dispatches the cached audio data to the handler.
   * @param {string} bus - Identifier of the bus.
   * @param {string} sound - Identifier of the sound to play.
   * @param {Object|boolean} options - Playback options; false is normalized to a fresh options object.
   * @returns {void}
   */
  playSound(bus, sound, options) {
    if (options === false) {
      options = {attempts: 0};
    }
    if (!('attempts' in options)) {
      options.attempts = 0;
    }

    if (bus in this.buses) {
      this.restartSounds[bus] = {sound: sound, options: options};
      if (this.buses[bus].getState() != 'running' && options.attempts < 64) {
        if (this.buses[bus].error === false) {
          this.buses[bus].ctx.resume()
            .then(() => {
              this.buses[bus].error = false;
            })
            .catch(error => {
              console.error('AudioContext error: '+error.message);
              this.buses[bus].error = error.message;
            });
          options.attempts += 1;
          this.app.model.sendEvent(1, {id: 'playSound', bus: bus, sound: sound, options: options});
        } else {
          this.app.model.sendEvent(1, {id: 'errorAudioBus', bus: bus, sound: sound, options: options, error: this.buses[bus].error});
        }
      } else {
        if (this.buses[bus].busIsReady()) {
          delete this.restartSounds[bus];
          this.buses[bus].playSound(this.audioData(bus, sound, options), options);
        } else if (options.attempts < 64) {
          options.attempts += 1;
          this.app.model.sendEvent(1, {id: 'playSound', bus: bus, sound: sound, options: options});
        }
      }
    }
  } // playSound

  /**
   * Looks up cached, decoded audio data for a sound on a bus.
   * @param {string} bus - Identifier of the bus.
   * @param {string} sound - Identifier of the sound.
   * @param {Object} options - Playback options (unused in the base lookup).
   * @returns {Object|boolean} The cached audio data, or false when not cached.
   */
  audioData(bus, sound, options) {
    if (bus in this.audioDataCache) {
      if (sound in this.audioDataCache[bus]) {
        return this.audioDataCache[bus][sound];
      }
    }
    return false;
  } // audioData

} // AbstractAudioManager

export default AbstractAudioManager;
