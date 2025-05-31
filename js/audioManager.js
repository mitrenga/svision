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
      this.channels[channel].open(channel);
    }
  } // openChannel

  closeChannel(channel) {
    if (channel in this.channels) {
      if (this.channels[channel].close() == true) {
        delete this.channels[channel];
      }
    }
  } // closeChannel

  closeAllChannels() {
    while (Object.keys(this.channels).length > 0) {
      this.closeChannel(Object.keys(this.channels)[0]);
    }
  } // closeAllChannels
  
  stopChannel(channel) {
    if (channel in this.channels) {
      this.channels[channel].stop();
    }
  } // stopChannel

  stopAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      this.stopChannel(channel);
    });
  } // stopAllChannels

  pauseChannel(channel) {
    if (channel in this.channels) {
      this.channels[channel].pause();
    }
  } // pauseChannel

  pauseAllChannels() {
    Object.keys(this.channels).forEach(channel => {
      this.stopChannel(channel);
    });
  } // pauseAllChannels

  playSound(channel, sound, parameter) {
    if (channel in this.channels) {
      this.channels[channel].play(sound, parameter);
    }
  } // playSound

} // class AudioManager

export default AudioManager;
