/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

export class AudioOscillatorHandler extends AbstractAudioHandler {
  
  constructor(app) {
    super(app);
    this.id = 'AudioOscillatorHandler';
    this.gainNode = null;
    this.oscillator = null;
  } // constructor

  openChannel(channel, options) {
    super.openChannel(channel, options);
    this.busy = false;
  } // openChannel

  playSound(audioData, options) {
    if (this.gainNode) {
      this.oscillator.stop();
      this.oscillator.disconnect(this.gainNode);
      this.gainNode.disconnect(this.ctx.destination);
      this.oscillator = null;
      this.gainNode = null;
    } else {
      this.gainNode = this.ctx.createGain();
      this.oscillator = this.ctx.createOscillator();
      this.oscillator.frequency.value = 400; // 40..6000
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this.oscillator.start();
    }
  } // playSound

} // AudioOscillatorHandler

export default AudioOscillatorHandler;
