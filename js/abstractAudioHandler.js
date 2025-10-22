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

  openChannel(channel) {
    if (this.waitForBusy('openAudioChannel')) {
      return;
    }
    this.busy = true;
    this.error = false;
    this.channel = channel;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({sampleRate:44100, latencyHint: 'interactive'});
  } // openChannel

  closeChannel() {
    if (this.waitForBusy('closeAudioChannel')) {
      return false;
    }
    this.busy = true;
    this.ctx.close();
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
    return this.ctx.state;
  } // getState

  stopChannel() {
  } // stopChannel

  pauseChannel() {
  } // pauseChannel

  continueChannel() {
  } // continueChannel

  playSound(audioData, options) {
  } // playSound
  
} // AbstractAudioHandler

export default AbstractAudioHandler;
