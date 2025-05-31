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

  open(channel) {
    if (this.busy == true) {
      this.app.model.sendEvent(100, {'id': 'openAudioHandler', 'channel': channel});
      return;
    }
    this.busy = true;
    this.channel = channel;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  } // open

  close() {
    if (this.busy == true) {
      this.app.model.sendEvent(100, {'id': 'closeAudioHandler', 'channel': this.channel});
      return false;
    }
    this.busy = true;
    this.ctx.close();
    this.ctx = null;
    this.busy = false;
    return true;
  } // close

  stop() {
  } // stop

  pause() {
  } // pause

  play(sound, parameter) {
  } // play

} // class AbstractAudioHandler

export default AbstractAudioHandler;
