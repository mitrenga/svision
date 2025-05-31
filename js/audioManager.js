/**/

/*/

/**/
// begin code

export class AudioManager {
  
  constructor(app) {
    this.app = app;
    this.channels = {};
  } // constructor

  openChannel(channel, audioHandler) {
    if (!(channel in this.channels)) {
      this.channels[channel] = audioHandler;
      this.channels[channel].openChannel(channel);
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
      if (this.channels[channel].ctx.state == 'suspended') {
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

  playSound(channel, sound, parameter) {
    if (channel in this.channels) {
      this.channels[channel].playSound(sound, parameter);
    }
  } // playSound

} // class AudioManager

export default AudioManager;
