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

  openChannel(channel) {
    super.openChannel(channel);
    this.openProcessor();
  } // openChannel

  async openProcessor() {
    try {
      await this.ctx.audioWorklet.addModule(this.app.importPath+'/'+this.channel+'Processor.js').catch(error => {error.log ('ERROR: loading worklet module!');});
      this.node = new AudioWorkletNode(this.ctx, this.channel+'Processor');
      this.node.connect(this.ctx.destination);
    } catch(error) {
      error.log (error);
    } finally {
      this.busy = false;
    }
  } // openProcessor

} // class AudioWorkletHandler

export default AudioWorkletHandler;
