/**/

/*/

/**/
// begin code

class AudioProcessor extends AudioWorkletProcessor {

  constructor(...args) {
    super(...args);
    this.audioData = false;
    this.readPtr = 0;
    this.repeat = false;
    this.paused = false;
    this.port.onmessage = (e) => {
      switch (e.data['id']) {
        case 'play':
          this.audioData = e.data['audioData'];
          this.readPtr = 0;
          this.repeat = false;
          if ('repeat' in e.data['options']) {
            this.repeat = e.data['options']['repeat'];
          }
          break;
        case 'pause':
          this.paused = true;
          break;
        case 'continue':
          this.paused = false;
          break;
        }
    };
  } // constructor

  process (inputs, outputs, options) {
    if ((!this.paused) && (this.audioData != false)) {
      const output = outputs[0];
      output.forEach((channel) => {
        for (var x = 0; x < channel.length; x++) {
          channel[x] = this.audioData[this.readPtr];
          this.readPtr++;
          if (this.readPtr > this.audioData.length && this.repeat) {
            this.readPtr = 0;
          }
        }
      });
    }
    return true;
  } // process

} // AudioProcessor

registerProcessor('AudioProcessor', AudioProcessor);
