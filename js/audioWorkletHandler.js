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

  openChannel(channel, options) {
    super.openChannel(channel, options);
    this.openProcessor(options);
  } // openChannel

  async openProcessor(options) {
    try {
      await this.ctx.audioWorklet.addModule(this.app.importPath+'/svision/js/audioProcessor.js')
        .catch(error => {
          this.app.model.sendEvent(1, {id: 'unsupportedAudioChannel', channel: this.channel});
        });
      this.node = new AudioWorkletNode(this.ctx, 'AudioProcessor');
      this.node.connect(this.ctx.destination);
    } catch(error) {
      this.app.model.sendEvent(1, {id: 'unsupportedAudioChannel', channel: this.channel});
      this.busy = false;
    } finally {
      this.busy = false;
      if ('muted' in options && options.muted) {
        this.node.port.postMessage({id: 'mute'});
      }

      this.node.port.onmessage = (event) => {
        this.app.model.sendEvent(1, {id: event.data.id, data: event.data});
      } // onmessage
    }
  } // openProcessor

  closeChannel() {
    if (this.waitForBusy('closeAudioChannel')) {
      return false;
    }
    if (this.node != null) {
      this.node.disconnect();
    }
    return super.closeChannel();
  } // closeChannel

  stopChannel() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'play', audioData: {fragments: false, pulses: false}, options: false});
    }
  } // stopChannel

  pauseChannel() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'pause'});
    }
  } // pauseChannel

  continueChannel() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'continue'});
    }
  } // continueChannel

  muteChannel(muted) {
    if (this.node != null) {
      this.node.port.postMessage({id: {false: 'unmute', true: 'mute'}[muted]});
    }
  } // muteChannel

  channelIsReady() {
    return this.node != null;
  } // channelIsReady

  playSound(audioData, options) {
    this.node.port.postMessage({id: 'play', audioData: audioData, options: options});
  } // playSound
  
} // AudioWorkletHandler

export default AudioWorkletHandler;
