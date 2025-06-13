/**/

/*/

/**/
// begin code

class AudioScriptProcessorWorker {

  constructor (sampleRate) {
    this.sampleRate = sampleRate;
    this.buffer = new Float32Array(Math.ceil(sampleRate/100));
    this.availableBuffer = 0;

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
  } // constructor

  process() {
    if (this.availableBuffer > Math.ceil(this.buffer.length)) {
      var writePtr = 0;
      while (writePtr < this.buffer.length) {
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
                postMessage(this.events[this.readPtr]);
              }
            }
          }
        }
        if (writePtr+this.oneReadPulse <= this.buffer.length) {
          this.buffer.fill(this.outputVolume[this.outputBit], writePtr, writePtr+this.oneReadPulse);
          writePtr += this.oneReadPulse;
          this.oneReadPulse = 0;
          this.readPtr++;
          this.outputBit = 1-this.outputBit;
        } else {
          this.buffer.fill(this.outputVolume[this.outputBit], writePtr);
          this.oneReadPulse = this.oneReadPulse-(this.buffer.length-writePtr);
          writePtr = this.buffer.length;
        }
        if (this.readPtr >= this.pulses.length && this.oneReadPulse == 0) {
          if (this.events != false) {
            if (this.readPtr in this.events) {
              postMessage(this.events[this.readPtr]);
            }
          }
          if (this.repeat) {
            this.readPtr = 0;
          } else if (this.infinityRndPulses === false) {
            this.buffer.fill(0, writePtr);
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
      postMessage({'id': 'audioData', 'buffer': this.buffer});
      this.availableBuffer = this.availableBuffer-this.buffer.length;
    }
  } // process

  stopChannel() {
    this.fragments = false;
    this.pulses = false;
    this.infinityRndPulses = false;
    this.infinityQuantity = 0;
    this.infinityFragment = 0;
    this.repeat = false;
  } // stopChannel

  playSound(audioData, options) {
    this.fragments = audioData.fragments;
    this.pulses = audioData.pulses;
    this.events = false;
    if ('events' in audioData) {
      this.events = audioData.events;
    }
    this.outputVolume = [0.0, audioData.volume];
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

} // AudioScriptProcessorWorker

var audioScriptProcessorWorker = null;
var loop = null;

function onLoop() {
  audioScriptProcessorWorker.process();
} // onLoop

onmessage = (event) => {
  switch (event.data.id) {
    case 'initProcessor':
      audioScriptProcessorWorker = new AudioScriptProcessorWorker(event.data.sampleRate);
      loop = setInterval(onLoop, 5);
      break;
    case 'availableBuffer':
      audioScriptProcessorWorker.availableBuffer = event.data.value;
      break;
    case 'stopChannel':
      audioScriptProcessorWorker.stopChannel();
      break;
    case 'play':
      audioScriptProcessorWorker.playSound(event.data.audioData, event.data.options);
      break;
    case 'pause':
      audioScriptProcessorWorker.paused = true;
      break;
    case 'continue':
      audioScriptProcessorWorker.paused = false;
      break;
  }
} // onmessage
