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
      return false;
    }
    this.busy = true;
    this.error = false;
    this.channel = channel;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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
      this.app.model.sendEvent(100, {'id': operation, 'channel': this.channel});
      return true;
    }
    return false;
  } // waitForBusy

  stopChannel() {
  } // stopChannel

  pauseChannel() {
  } // pauseChannel

  continueChannel() {
  } // continueChannel

  playSound(sound, options) {
  } // playSound
  
} // class AbstractAudioHandler

export default AbstractAudioHandler;
