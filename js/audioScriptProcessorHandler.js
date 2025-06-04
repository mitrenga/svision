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
    this.node = null;
    this.paused = false;
    this.audioData = false;
    this.readPtr = 0;
    this.repeat = false;
  } // constructor

  openChannel(channel) {
    super.openChannel(channel);
    this.openProcessor();
  } // openChannel

  openProcessor() {
    this.node = this.ctx.createScriptProcessor(0, 0, 1);

    this.node.onaudioprocess = (audioProcessingEvent) => {
      if ((!this.paused) && (this.audioData != false)) {
        var outputBuffer = audioProcessingEvent.outputBuffer;
        var channelDataLength = outputBuffer.getChannelData(0).length;
        for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          var channelData = outputBuffer.getChannelData(channel);
          for (var x = 0; x < channelDataLength; x++) {
            channelData[x] = this.audioData[this.readPtr];
            this.readPtr++;
            if (this.readPtr > this.audioData.length && this.repeat) {
              this.readPtr = 0;
            }
          }
        }
      }
    }
    this.node.connect(this.ctx.destination);
    this.busy = false;
  } // openProcessor

  closeChannel() {
    if (this.waitForBusy('closeAudioChannel')) {
      return false;
    }
    this.node.disconnect();
    return super.closeChannel();
  } // closeChannel

  playSound(audioData, options) {
    this.audioData = audioData;
    this.readPtr = 0;
    this.repeat = false;
    if ('repeat' in options) {
      this.repeat = options['repeat'];
    }
  } // playSound

} // class AudioScriptProcessorHandler

export default AudioScriptProcessorHandler;
