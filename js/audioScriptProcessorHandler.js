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

    this.fragments = false;
    this.pulses = false;
    this.events = false;
    this.outputVolume = {false: [0.0, 0.0], true: [0.0, 0.0]};
    this.infinityRndPulses = false;
    this.infinityQuantity = 0;
    this.infinityFragment = 0;
    this.outputBit = 1;
    this.readPtr = 0;
    this.oneReadPulse = 0;
    this.repeat = false;
    this.paused = false;
    this.muted = false;
  } // constructor

  openChannel(channel, options) {
    super.openChannel(channel, options);
    if ('muted' in options) {
      this.muted = options.muted;
    }
    this.openProcessor();
  } // openChannel

  openProcessor() {
    this.node = this.ctx.createScriptProcessor(0, 0, 1);

    this.node.onaudioprocess = (event) => {
      if ((!this.paused) && (this.pulses !== false)) {
        for (var idChannel = 0; idChannel < event.outputBuffer.numberOfChannels; idChannel++) {
          var channel = event.outputBuffer.getChannelData(idChannel);
          var writePtr = 0;
          while (writePtr < channel.length) {
            if (this.oneReadPulse == 0) {
              if (this.readPtr >= this.pulses.length && this.infinityRndPulses !== false) {
                if (this.infinityQuantity > 0) {
                  this.infinityQuantity--;
                  this.oneReadPulse = this.fragments[this.infinityFragment];
                } else {
                  this.infinityQuantity = this.infinityRndPulses.quantity-1;
                  this.infinityFragment = this.infinityRndPulses.fragments[Math.round(Math.random()*(this.infinityRndPulses.fragments.length-1))];
                  this.oneReadPulse = this.fragments[this.infinityFragment];
                }
              } else {
                this.oneReadPulse = this.fragments[this.pulses[this.readPtr]];
                if (this.events != false) {
                  if (this.readPtr in this.events) {
                    this.app.model.sendEvent(1, {id: this.events[this.readPtr].id, data: this.events[this.readPtr]});
                  }
                }
              }
            }
            if (writePtr+this.oneReadPulse <= channel.length) {
              channel.fill(this.outputVolume[this.muted][this.outputBit], writePtr, writePtr+this.oneReadPulse);
              writePtr += this.oneReadPulse;
              this.oneReadPulse = 0;
              this.readPtr++;
              this.outputBit = 1-this.outputBit;
            } else {
              channel.fill(this.outputVolume[this.muted][this.outputBit], writePtr);
              this.oneReadPulse = this.oneReadPulse-(channel.length-writePtr);
              writePtr = channel.length;
            }
            if (this.readPtr >= this.pulses.length && this.oneReadPulse == 0) {
              if (this.events != false) {
                if (this.readPtr in this.events) {
                  this.app.model.sendEvent(1, {id: this.events[this.readPtr].id, data: this.events[this.readPtr]});
                }
              }
              if (this.repeat) {
                this.readPtr = 0;
              } else if (this.infinityRndPulses === false) {
                channel.fill(0, writePtr);
                this.fragments = false;
                this.pulses = false;
                this.events = false;
                this.outputVolume = {false: [0.0, 0.0], true: [0.0, 0.0]};
                this.outputBit = 0;
                this.readPtr = 0;
                this.oneReadPulse = 0;
              }
            }
          }
        }
      }
    } // onaudioprocess

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

  stopChannel() {
    this.fragments = false;
    this.pulses = false;
    this.options = false;
    this.events = false;
  } // stopChannel

  pauseChannel() {
    this.paused = true;
  } // pauseChannel

  continueChannel() {
    this.paused = false;
  } // continueChannel

  muteChannel(muted) {
    this.muted = muted;
  } // muteChannel

  playSound(audioData, options) {
    this.fragments = audioData.fragments;
    this.pulses = audioData.pulses;
    this.events = false;
    if ('events' in audioData) {
      this.events = audioData.events;
    }
    this.outputVolume = {false: [0.0, audioData.volume], true: [0.0, 0.0]};
    this.infinityRndPulses = false;
    this.infinityQuantity = 0;
    this.infinityFragment = 0;
    if ('infinityRndPulses' in audioData) {
      this.infinityRndPulses = audioData.infinityRndPulses;
    }
    this.outputBit = 1;
    this.readPtr = 0;
    this.oneReadPulse = 0;
    this.repeat = false;
    if (options !== false) {
      if ('repeat' in options) {
        this.repeat = options.repeat;
      }
    }
  } // playSound

} // AudioScriptProcessorHandler

export default AudioScriptProcessorHandler;
