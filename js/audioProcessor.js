/**/

/*/

/**/
// begin code

class AudioProcessor extends AudioWorkletProcessor {

  constructor(...args) {
    super(...args);
    this.fragments = false;
    this.pulses = false;
    this.events = false;
    this.outputVolume = [0.0, 0.0];
    this.infinityRndPulses = false;
    this.infinityQuantity = 0;
    this.infinityFragment = 0;
    this.outputBit = 1;
    this.readPtr = 0;
    this.oneReadPulse = 0;
    this.repeat = false;
    this.paused = false;

    this.port.onmessage = (event) => {
      switch (event.data.id) {
        case 'play':
          this.fragments = event.data.audioData.fragments;
          this.pulses = event.data.audioData.pulses;
          this.events = false;
          if ('events' in event.data.audioData) {
            this.events = event.data.audioData.events;
          }
          this.outputVolume = [0.0, event.data.audioData.volume];
          this.infinityRndPulses = false;
          this.infinityQuantity = 0;
          this.infinityFragment = 0;
          if ('infinityRndPulses' in event.data.audioData) {
            this.infinityRndPulses = event.data.audioData.infinityRndPulses;
          }
          this.outputBit = 1;
          this.readPtr = 0;
          this.oneReadPulse = 0;
          this.repeat = false;
          if (event.data.options !== false) {
            if ('repeat' in event.data.options) {
              this.repeat = event.data.options.repeat;
            }
          }
          break;
        case 'pause':
          this.paused = true;
          break;
        case 'continue':
          this.paused = false;
          break;
      }
    } // onmessage
    
  } // constructor

  process (inputs, outputs, options) {
    if ((!this.paused) && (this.pulses !== false)) {
      outputs.forEach((output) => {
        output.forEach((channel) => {
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
                    this.port.postMessage(this.events[this.readPtr]);
                  }
                }
              }
            }
            if (writePtr+this.oneReadPulse <= channel.length) {
              channel.fill(this.outputVolume[this.outputBit], writePtr, writePtr+this.oneReadPulse);
              writePtr += this.oneReadPulse;
              this.oneReadPulse = 0;
              this.readPtr++;
              this.outputBit = 1-this.outputBit;
            } else {
              channel.fill(this.outputVolume[this.outputBit], writePtr);
              this.oneReadPulse = this.oneReadPulse-(channel.length-writePtr);
              writePtr = channel.length;
            }
            if (this.readPtr >= this.pulses.length && this.oneReadPulse == 0) {
              if (this.events != false) {
                if (this.readPtr in this.events) {
                  this.port.postMessage(this.events[this.readPtr]);
                }
              }
              if (this.repeat) {
                this.readPtr = 0;
              } else if (this.infinityRndPulses === false) {
                channel.fill(0, writePtr);
                this.fragments = false;
                this.pulses = false;
                this.events = false;
                this.outputVolume = [0.0, 0.0];
                this.outputBit = 0;
                this.readPtr = 0;
                this.oneReadPulse = 0;
              }
            }
          }
        });
      });
    }
    return true;
  } // process

} // AudioProcessor

registerProcessor('AudioProcessor', AudioProcessor);
