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
  } // constructor

} // class AudioOscillatorHandler

export default AudioOscillatorHandler;
