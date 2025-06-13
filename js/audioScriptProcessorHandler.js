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
  
    this.bufferSize = 0;
    this.buffer = null;
    this.readPtr = 0;
    this.writePtr = 0;
  } // constructor

  openChannel(channel) {
    super.openChannel(channel);
    this.bufferSize = Math.ceil(this.ctx.sampleRate*0.2);
    this.buffer = new Float32Array(this.bufferSize);
    this.openProcessor();
  } // openChannel

  openProcessor() {
    this.worker = new Worker(this.app.importPath+'/svision/js/audioScriptProcessorWorker.js');
    this.worker.postMessage({'id': 'initProcessor', 'sampleRate': this.ctx.sampleRate});
    
    this.worker.onmessage = (event) => {
      switch (event.data.id) {
        case 'audioData':
          var available = event.data.buffer.length;
          if (this.writePtr+available <= this.bufferSize) {
            this.buffer.set(event.data.buffer, this.writePtr);
            this.writePtr = this.writePtr+available;
          } else {
            var part1 = this.bufferSize-this.writePtr;
            var part2 = available-part1;
            this.buffer.set(event.data.buffer.slice(0, part1), this.writePtr);
            this.buffer.set(event.data.buffer.slice(part1), 0);
            this.writePtr = part2;
          }
          break;
        default:
          this.app.model.sendEvent(1, {'id': event.data.id, 'data': event.data});
          break;
      }
    } // onmessage
    
    this.node = this.ctx.createScriptProcessor(0, 0, 1);

    this.node.onaudioprocess = (event) => {
      var nextReadPtr = 0;
      var lastBufferValue = 0.0;
      for (var idChannel = 0; idChannel < event.outputBuffer.numberOfChannels; idChannel++) {
        var channelData = event.outputBuffer.getChannelData(idChannel);
        var available = this.writePtr-this.readPtr;
        if (available < 0) {
          available = available+this.bufferSize;
        }
        if (available > channelData.length) {
          available = channelData.length;
        }
        if (this.readPtr+available <= this.bufferSize) {
          channelData.set(this.buffer.slice(this.readPtr, this.readPtr+available));
          nextReadPtr = this.readPtr+available;
          lastBufferValue = this.buffer[this.readPtr+available-1];
        } else {
          var part1 = this.bufferSize-this.readPtr;
          var part2 = available-part1;
          channelData.set(this.buffer.slice(this.readPtr, this.readPtr+part1));
          channelData.set(this.buffer.slice(0, part2), part1);
          nextReadPtr = part2;
          lastBufferValue = this.buffer[part2-1];
        }
        if (available < channelData.length) {
          channelData.fill(lastBufferValue, available, channelData.length);
        }
      }
      var available = this.writePtr-this.readPtr;
      if (available < 0) {
        available = available+this.bufferSize;
      }
      this.worker.postMessage({'id': 'availableBuffer', 'value': this.bufferSize-available});
      this.readPtr = nextReadPtr;
    } // onaudioprocess

    this.node.connect(this.ctx.destination);
    this.busy = false;
  } // openProcessor

  closeChannel() {
    if (this.waitForBusy('closeAudioChannel')) {
      return false;
    }
    this.node.disconnect();
    this.worker.terminate();
    return super.closeChannel();
  } // closeChannel

  stopChannel() {
    this.worker.postMessage({'id': 'stopChannel'});
  } // stopChannel

  playSound(audioData, options) {
    this.worker.postMessage({'id': 'play', 'audioData': audioData, 'options': options});
  } // playSound

} // class AudioScriptProcessorHandler

export default AudioScriptProcessorHandler;
