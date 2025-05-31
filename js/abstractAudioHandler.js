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
  } // constructor

  openChannel(channel) {
    if (this.busy == true) {
      this.app.model.sendEvent(100, {'id': 'openAudioChannel', 'channel': channel});
      return;
    }
    this.busy = true;
    this.channel = channel;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
   } // openChannel

  closeChannel() {
    if (this.busy == true) {
      this.app.model.sendEvent(100, {'id': 'closeAudioChannel', 'channel': this.channel});
      return false;
    }
    this.busy = true;
    this.ctx.close();
    this.ctx = null;
    this.busy = false;
    return true;
  } // closeChannel

  stopChannel() {
  } // stopChannel

  pauseChannel() {
  } // pauseChannel

  continueChannel() {
  } // continueChannel

  playSound(sound, parameter) {
  } // playSound

} // class AbstractAudioHandler

export default AbstractAudioHandler;
