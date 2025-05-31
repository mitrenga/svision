/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

export class AudioWorkletHandler extends AbstractAudioHandler {
  
  constructor(app) {
    super(app);
    this.id = 'AudioWorkletHandler';
    this.node = null;
  } // constructor

  open(channel) {
    super.open(channel);
    this.openProcessor();
  } // open

  async openProcessor() {
    try {
      await this.ctx.audioWorklet.addModule(this.app.importPath+'/'+this.channel+'Processor.js').catch(error => {console.log ('ERROR: loading worklet module!');});
      this.node = new AudioWorkletNode(this.ctx, this.channel+'Processor');
      this.node.connect(this.ctx.destination);
    } catch(error) {
      console.log (error);
    } finally {
      this.busy = false;
    }
  } // openProcessor

} // class AudioWorkletHandler

export default AudioWorkletHandler;
