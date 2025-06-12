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
      for (var x = 0; x < this.buffer.length; x++) {
        this.buffer[x] = Math.round(Math.random());
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
    case 'stopChannel':
      audioScriptProcessorWorker.stopChannel();
      break;
    case 'availableBuffer':
      audioScriptProcessorWorker.availableBuffer = event.data.value;
      break;
  }
} // onmessage
