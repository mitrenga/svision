/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

export class AbstractAudioManager {
  
  constructor(app) {
    this.app = app;
    this.id = 'AbstractAudioManager';
    this.channels = {};
    this.unsupportedAudioChannel = false;
    this.audioDataCache = {};
  } // constructor

  createAudioHandler(channel, options) {
    return false;
  } // createAudioHandler
  
  openChannel(channel, options) {
    if (!(channel in this.channels)) {
      var audioHandler = this.createAudioHandler(channel, options);
      if (audioHandler != false) {
        audioHandler.openChannel(channel);
        this.channels[channel] = audioHandler;
      }
    }
    this.audioDataCache[channel] = {};
  } // openChannel

  closeChannel(channel) {
    if (channel in this.channels) {
      if (this.channels[channel].closeChannel() == true) {
        delete this.channels[channel];
      }
    }
    this.audioDataCache[channel] = {};
  } // closeChannel

  closeAllChannels() {
    while (Object.keys(this.channels).length > 0) {
      this.closeChannel(Object.keys(this.channels)[0]);
    }
    this.closeCounter++;
  } // closeAllChannels
  
  refreshAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      if (this.channels[channel].getState() != 'running') {
        this.channels[channel].ctx.resume()
          .then(() => {
          })
          .catch(error => {
            console.error('AudioContext error: '+error.message);
            this.channels[channel].error = error.message;
          });
      }
    });
  } // refreshAllChannels

  stopChannel(channel) {
    if (channel in this.channels) {
      this.channels[channel].stopChannel();
    }
  } // stopChannel

  stopAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      this.stopChannel(channel);
    });
  } // stopAllChannels

  pauseChannel(channel) {
    if (channel in this.channels) {
      this.channels[channel].pauseChannel();
    }
  } // pauseChannel

  pauseAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      this.pauseChannel(channel);
    });
  } // pauseAllChannels

  continueChannel(channel) {
    if (channel in this.channels) {
      this.channels[channel].continueChannel();
    }
  } // continueChannel

  continueAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      this.continueChannel(channel);
    });
  } // continueAllChannels

  playSound(channel, sound, options) {
    if (options === false) {
      options = {attempts: 0};
    }
    if (!('attempts' in options)) {
      options.attempts = 0;
    }

    if (channel in this.channels) {
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
          this.channels[channel].playSound(this.audioData(channel, sound, options), options);
        } else if (options.attempts < 64) {
          options.attempts += 1;
          this.app.model.sendEvent(1, {id: 'playSound', channel: channel, sound: sound, options: options});
        }
      }
    }
  } // playSound

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
