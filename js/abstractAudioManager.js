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
    this.channels = {};
    this.unsupportedAudioChannel = false;
    this.audioDataCache = {};
    this.restartSounds = {};
  } // constructor

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
   * Opens a channel, creating and registering its handler when not already
   * present, and resets the channel's audio-data cache.
   * @param {string} channel - Identifier of the channel to open.
   * @param {Object} options - Channel configuration options.
   * @returns {void}
   */
  openChannel(channel, options) {
    if (!(channel in this.channels)) {
      var audioHandler = this.createAudioHandler(channel, options);
      if (audioHandler != false) {
        audioHandler.openChannel(channel, options);
        this.channels[channel] = audioHandler;
      }
    }
    this.audioDataCache[channel] = {};
  } // openChannel

  /**
   * Closes a channel, removing its handler when the close succeeds, and
   * resets the channel's audio-data cache.
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
