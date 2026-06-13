/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

/**
 * Coordinates multiple named audio channels, each backed by an audio
 * handler. Owns channel creation, lifecycle (open/close/stop/pause/
 * continue/mute), an audio-data cache, and the playSound dispatch logic
 * including resume retries while a channel's context is not yet running.
 */
export class AbstractAudioManager {

  /**
   * Creates the manager with empty channel, cache, and restart-sound maps.
   * @param {Object} app - The owning application instance, providing access to the model for event dispatch.
   */
  constructor(app) {
    this.app = app;
    this.id = 'AbstractAudioManager';
    this.ctx = null;
    this.channels = {};
    this.unsupportedAudioChannel = false;
    this.audioDataCache = {};
    this.restartSounds = {};
  } // constructor

  /**
   * Lazily creates the single shared AudioContext that backs every channel.
   * No-op when a context already exists. Leaves the context null when the Web
   * Audio API is unavailable or its constructor fails (e.g. on devices with no
   * audio support); handlers then report the unsupported channel on a null
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
   * Called once no channels remain open.
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
   * Factory hook that creates the audio handler for a channel. Returns
   * false in the base class; subclasses override to supply a concrete handler.
   * @param {string} channel - Identifier of the channel.
   * @param {Object} options - Channel configuration options.
   * @returns {AbstractAudioHandler|boolean} A handler instance, or false when none can be created.
   */
  createAudioHandler(channel, options) {
    return false;
  } // createAudioHandler
  
  /**
   * Opens a channel: creates and registers the channel's handler when not
   * already present, ensures the shared AudioContext exists when that handler
   * needs one, passes the context to the handler, and resets the channel's
   * audio-data cache.
   * @param {string} channel - Identifier of the channel to open.
   * @param {Object} options - Channel configuration options.
   * @returns {void}
   */
  openChannel(channel, options) {
    if (!(channel in this.channels)) {
      var audioHandler = this.createAudioHandler(channel, options);
      if (audioHandler != false) {
        if (audioHandler.needsContext()) {
          this.openAudioContext();
        }
        audioHandler.openChannel(channel, options, this.ctx);
        this.channels[channel] = audioHandler;
      }
    }
    this.audioDataCache[channel] = {};
  } // openChannel

  /**
   * Closes a channel, removing its handler when the close succeeds, and
   * resets the channel's audio-data cache. Discards the shared AudioContext
   * once no channels remain open.
   * @param {string} channel - Identifier of the channel to close.
   * @returns {void}
   */
  closeChannel(channel) {
    if (channel in this.channels) {
      if (this.channels[channel].closeChannel() == true) {
        delete this.channels[channel];
      }
    }
    this.audioDataCache[channel] = {};
    if (Object.keys(this.channels).length == 0) {
      this.closeAudioContext();
    }
  } // closeChannel

  /**
   * Closes every currently open channel.
   * @returns {void}
   */
  closeAllChannels() {
    while (Object.keys(this.channels).length > 0) {
      this.closeChannel(Object.keys(this.channels)[0]);
    }
    this.closeCounter++;
  } // closeAllChannels
  
  /**
   * Resumes the AudioContext of any channel that is not currently running,
   * recording any resume error on the channel's handler.
   * @returns {void}
   */
  refreshAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      if (this.channels[channel].getState() != 'running') {
        if (this.channels[channel].ctx) {
          this.channels[channel].ctx.resume()
            .then(() => {
            })
            .catch(error => {
              console.error('AudioContext error: '+error.message);
              this.channels[channel].error = error.message;
            });
        }
      }
    });
  } // refreshAllChannels

  /**
   * Stops playback on a single channel.
   * @param {string} channel - Identifier of the channel to stop.
   * @returns {void}
   */
  stopChannel(channel) {
    if (channel in this.channels) {
      this.channels[channel].stopChannel();
    }
  } // stopChannel

  /**
   * Stops playback on every open channel.
   * @returns {void}
   */
  stopAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      this.stopChannel(channel);
    });
  } // stopAllChannels

  /**
   * Pauses playback on a single channel.
   * @param {string} channel - Identifier of the channel to pause.
   * @returns {void}
   */
  pauseChannel(channel) {
    if (channel in this.channels) {
      this.channels[channel].pauseChannel();
    }
  } // pauseChannel

  /**
   * Pauses playback on every open channel.
   * @returns {void}
   */
  pauseAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      this.pauseChannel(channel);
    });
  } // pauseAllChannels

  /**
   * Resumes playback on a single channel.
   * @param {string} channel - Identifier of the channel to resume.
   * @returns {void}
   */
  continueChannel(channel) {
    if (channel in this.channels) {
      this.channels[channel].continueChannel();
    }
  } // continueChannel

  /**
   * Resumes playback on every open channel.
   * @returns {void}
   */
  continueAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      this.continueChannel(channel);
    });
  } // continueAllChannels

  /**
   * Mutes or unmutes a single channel.
   * @param {string} channel - Identifier of the channel.
   * @param {boolean} muted - True to mute, false to unmute.
   * @returns {void}
   */
  muteChannel(channel, muted) {
    if (channel in this.channels) {
      this.channels[channel].muteChannel(muted);
    }
  } // continueChannel

  /**
   * Plays a sound on a channel. If the channel's context is not yet running
   * it attempts to resume and reschedules the request (up to 64 attempts);
   * once running and ready it dispatches the cached audio data to the handler.
   * @param {string} channel - Identifier of the channel.
   * @param {string} sound - Identifier of the sound to play.
   * @param {Object|boolean} options - Playback options; false is normalized to a fresh options object.
   * @returns {void}
   */
  playSound(channel, sound, options) {
    if (options === false) {
      options = {attempts: 0};
    }
    if (!('attempts' in options)) {
      options.attempts = 0;
    }

    if (channel in this.channels) {
      this.restartSounds[channel] = {sound: sound, options: options};
      if (this.channels[channel].getState() != 'running' && options.attempts < 64) {
        if (this.channels[channel].error === false) {
          this.channels[channel].ctx.resume()
            .then(() => {
              this.channels[channel].error = false;
            })
            .catch(error => {
              console.error('AudioContext error: '+error.message);
              this.channels[channel].error = error.message;
            });
          options.attempts += 1;
          this.app.model.sendEvent(1, {id: 'playSound', channel: channel, sound: sound, options: options});
        } else {
          this.app.model.sendEvent(1, {id: 'errorAudioChannel', channel: channel, sound: sound, options: options, error: this.channels[channel].error});
        }
      } else {
        if (this.channels[channel].channelIsReady()) {
          delete this.restartSounds[channel];
          this.channels[channel].playSound(this.audioData(channel, sound, options), options);
        } else if (options.attempts < 64) {
          options.attempts += 1;
          this.app.model.sendEvent(1, {id: 'playSound', channel: channel, sound: sound, options: options});
        }
      }
    }
  } // playSound

  /**
   * Looks up cached, decoded audio data for a sound on a channel.
   * @param {string} channel - Identifier of the channel.
   * @param {string} sound - Identifier of the sound.
   * @param {Object} options - Playback options (unused in the base lookup).
   * @returns {Object|boolean} The cached audio data, or false when not cached.
   */
  audioData(channel, sound, options) {
    if (channel in this.audioDataCache) {
      if (sound in this.audioDataCache[channel]) {
        return this.audioDataCache[channel][sound];
      }
    }
    return false;
  } // audioData

} // AbstractAudioManager

export default AbstractAudioManager;
