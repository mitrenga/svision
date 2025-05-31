/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

export class AudioScriptProcessorHandler extends AbstractAudioHandler {
  
  constructor(app) {
    super(app);
    this.id = 'AudioScriptProcessorHandler';
  } // constructor

} // class AudioScriptProcessorHandler

export default AudioScriptProcessorHandler;
