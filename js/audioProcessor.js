/**/

/*/

/**/
// begin code

class AudioProcessor extends AudioWorkletProcessor {

  constructor(...args) {
    super(...args);
    this.fragments = false;
    this.pulses = false;
    this.outputVolume = [0.0, 0.0];
    this.outputBit = 1;
    this.readPtr = 0;
    this.oneReadPulse = 0;
    this.repeat = false;
    this.paused = false;

    this.port.onmessage = (e) => {
      switch (e.data['id']) {
        case 'play':
          this.fragments = e.data['audioData']['fragments'];
          this.pulses = e.data['audioData']['pulses'];
          this.outputVolume = [0.0, e.data['audioData']['volume']];
          this.outputBit = 1;
          this.readPtr = 0;
          this.oneReadPulse = 0;
          this.repeat = false;
          if (e.data['options'] !== false) {
            if ('repeat' in e.data['options']) {
              this.repeat = e.data['options']['repeat'];
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
    }
  } // constructor

  process (inputs, outputs, options) {
    if ((!this.paused) && (this.pulses !== false)) {
      var output = outputs[0];
      output.forEach((channel) => {
        var writePtr = 0;
        while (writePtr < channel.length) {
          if (this.oneReadPulse == 0) {
            this.oneReadPulse = this.fragments[this.pulses[this.readPtr]];
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
          if (this.readPtr >= this.pulses.length) {
            if (this.repeat) {
              this.readPtr = 0;
            } else {
              channel.fill(0, writePtr);
              this.fragments = false;
              this.pulses = false;
              this.outputVolume = [0.0, 0.0];
              this.outputBit = 0;
              this.readPtr = 0;
              this.oneReadPulse = 0;
            }
          }
        }
      });
    }
    return true;
  } // process

} // AudioProcessor

registerProcessor('AudioProcessor', AudioProcessor);
