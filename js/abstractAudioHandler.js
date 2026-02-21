/**/

/*/

/**/
// begin code

export class AbstractAudioHandler {
  
  constructor(app) {
    this.app = app;
    this.id = 'AbstractAudioHandler';
    this.busy = false;
    this.ctx = null;
    this.channel = false;
    this.error = false;
  } // constructor

  openChannel(channel, options) {
    var classAudioCtx = (window.AudioContext || window.webkitAudioContext);
    if (classAudioCtx == null) {
      this.error = 'AudioContext not started';
      this.app.model.sendEvent(1, {id: 'unsupportedAudioChannel', channel: channel});
      return;
    }
    if (this.waitForBusy('openAudioChannel')) {
      return;
    }
    this.busy = true;
    this.error = false;
    this.channel = channel;
    this.ctx = new (classAudioCtx)({sampleRate:44100, latencyHint: 'interactive'});
  } // openChannel

  closeChannel() {
    if (this.waitForBusy('closeAudioChannel')) {
      return false;
    }
    this.busy = true;
    if (this.ctx != null) {
      this.ctx.close();
    }
    this.ctx = null;
    this.busy = false;
    return true;
  } // closeChannel

  waitForBusy(operation) {
    if (this.busy == true) {
      this.app.model.sendEvent(100, {id: operation, channel: this.channel});
      return true;
    }
    return false;
  } // waitForBusy

  getSampleRate() {
    return this.ctx.sampleRate;
  } // getSampleRate

  getState() {
    if (this.ctx == null) {
      return 'closed';
    }
    return this.ctx.state;
  } // getState

  stopChannel() {
  } // stopChannel

  pauseChannel() {
  } // pauseChannel

  continueChannel() {
  } // continueChannel

  muteChannel(muted) {
  } // muteChannel

  channelIsReady() {
    return true;
  } // channelIsReady

  playSound(audioData, options) {
  } // playSound
  
} // AbstractAudioHandler

export default AbstractAudioHandler;
