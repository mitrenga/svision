/**/

/*/

/**/
// begin code

class AudioProcessor extends AudioWorkletProcessor {

  constructor(...args) {
    super(...args);
    this.buffer = false;
    this.paused = false;
    this.port.onmessage = (e) => {
      switch (e.data['id']) {
        case 'play':
          this.buffer = e.data['soundData'];
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

  process (inputs, outputs, parameters) {
    if ((!this.paused) && (this.buffer != false)) {
      const output = outputs[0];
      output.forEach((channel) => {
        for (var x = 0; x < channel.length && x < this.buffer.length; x++) {
          channel[x] = this.buffer[x];
        }
      });
    }
    return true;
  } // process

} // AudioProcessor

registerProcessor('AudioProcessor', AudioProcessor);
