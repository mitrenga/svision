/**/

/*/

/**/
// begin code

export class AbstractAudioHandler {
  
  constructor(app) {
    this.app = app;
    this.id = 'AbstractAudioHandler';
    this.ctx = null;
    this.channel = false;
  } // constructor

  open(channel) {
    this.channel = channel;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  } // open

  close() {
    this.ctx.close();
    this.ctx = null;
  } // close

  stop() {
  } // stop

  pause() {
  } // pause

  play(sound, parameter) {
  } // play

} // class AbstractAudioHandler

export default AbstractAudioHandler;
