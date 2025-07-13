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
  } // constructor

  createAudioHandler(channel) {
    return false;
  } // createAudioHandler
  
  openChannel(channel) {
    if (!(channel in this.channels)) {
      var audioHandler = this.createAudioHandler(channel);
      if (audioHandler != false) {
        audioHandler.openChannel(channel);
        this.channels[channel] = audioHandler;
      }
    }
  } // openChannel

  closeChannel(channel) {
    if (channel in this.channels) {
      if (this.channels[channel].closeChannel() == true) {
        delete this.channels[channel];
      }
    }
  } // closeChannel

  closeAllChannels() {
    while (Object.keys(this.channels).length > 0) {
      this.closeChannel(Object.keys(this.channels)[0]);
    }
  } // closeAllChannels
  
  refreshAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      if (this.channels[channel].getState() == 'suspended') {
        this.channels[channel].ctx.resume();
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
    if (channel in this.channels) {
      this.channels[channel].playSound(this.audioData(channel, sound, options), options);
    }
  } // playSound

  audioData(channel, sound, options) {
    return false;
  } // audioData

} // class AbstractAudioManager

export default AbstractAudioManager;
