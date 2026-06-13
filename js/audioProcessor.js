/**/

/*/

/**/
// begin code

/**
 * AudioWorklet processor that synthesizes a square-wave audio stream from a
 * pulse/fragment description. It receives play/pause/continue/mute commands
 * over its message port, generates output by alternating an output bit
 * between volume levels for each pulse length, supports looping with an
 * optional follow-up sound and an infinite randomized-pulse mode, and posts
 * timing-synchronized events back to the main thread. Output channels can be
 * scaled independently via the play command's channelVolumes, enabling stereo
 * positioning when the node is opened with more than one channel.
 */
class AudioProcessor extends AudioWorkletProcessor {

  /**
   * Initializes playback state and installs the message-port handler that
   * processes 'play', 'pause', 'continue', 'mute', and 'unmute' commands.
   * @param {...*} args - Arguments forwarded to the AudioWorkletProcessor base constructor.
   */
  constructor(...args) {
    super(...args);
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
    this.nextSound = false;
    this.paused = false;
    this.muted = false;
    this.channelVolumes = false;

    this.port.onmessage = (event) => {
      switch (event.data.id) {
        case 'play':
          this.fragments = event.data.audioData.fragments;
          this.pulses = event.data.audioData.pulses;
          this.events = false;
          if ('events' in event.data.audioData) {
            this.events = event.data.audioData.events;
          }
          this.outputVolume = {false: [0.0, event.data.audioData.volume], true: [0.0, 0.0]};
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
          this.nextSound = false;
          this.channelVolumes = false;
          if (event.data.options !== false) {
            if ('repeat' in event.data.options) {
              this.repeat = event.data.options.repeat;
            }
            if ('nextSound' in event.data.options) {
              this.nextSound = event.data.options.nextSound;
            }
            if ('channelVolumes' in event.data.options) {
              this.channelVolumes = event.data.options.channelVolumes;
            }
          }
          break;
        case 'pause':
          this.paused = true;
          break;
        case 'continue':
          this.paused = false;
          break;
        case 'mute':
          this.muted = true;
          break;
        case 'unmute':
          this.muted = false;
          break;
      }
    } // onmessage
    
  } // constructor

  /**
   * Returns the volume multiplier for an output channel: the value from the
   * current sound's channelVolumes array, or 1 when none is given.
   * @param {number} idChannel - Index of the output channel.
   * @returns {number} The per-channel volume multiplier (default 1).
   */
  channelVolume(idChannel) {
    if (this.channelVolumes !== false && this.channelVolumes[idChannel] != null) {
      return this.channelVolumes[idChannel];
    }
    return 1;
  } // channelVolume

  /**
   * Renders one audio quantum. While not paused and a pulse sequence is
   * loaded, it fills the output channels by toggling the output bit per pulse,
   * handles infinite randomized pulses, posts events at pulse boundaries, and
   * either restarts (optionally switching to the next sound) on repeat or
   * silences and clears state when the sequence ends.
   * @param {Array<Array<Float32Array>>} inputs - Input audio buffers (unused).
   * @param {Array<Array<Float32Array>>} outputs - Output audio buffers to fill.
   * @param {Object} options - Processor parameter values (unused).
   * @returns {boolean} Always true to keep the processor alive.
   */
  process (inputs, outputs, options) {
    if ((!this.paused) && (this.pulses !== false)) {
      var writePtr = 0;
      var channelLength = outputs[0][0].length;
      while (writePtr < channelLength) {
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
        if (writePtr+this.oneReadPulse <= channelLength) {
          outputs.forEach((output) => {
            output.forEach((channel, idChannel) => {
              channel.fill(this.outputVolume[this.muted][this.outputBit] * this.channelVolume(idChannel), writePtr, writePtr+this.oneReadPulse);
            });
          });
          writePtr += this.oneReadPulse;
          this.oneReadPulse = 0;
          this.readPtr++;
          this.outputBit = 1-this.outputBit;
        } else {
          outputs.forEach((output) => {
            output.forEach((channel, idChannel) => {
              channel.fill(this.outputVolume[this.muted][this.outputBit] * this.channelVolume(idChannel), writePtr);
            });
          });
          this.oneReadPulse = this.oneReadPulse-(channelLength-writePtr);
          writePtr = channelLength;
        }
        if (this.readPtr >= this.pulses.length && this.oneReadPulse == 0) {
          if (this.events != false) {
            if (this.readPtr in this.events) {
              this.port.postMessage(this.events[this.readPtr]);
            }
          }
          if (this.repeat) {
            if (this.nextSound !== false) {
              this.fragments = this.nextSound.fragments;
              this.pulses = this.nextSound.pulses;
              this.events = false;
              if ('events' in this.nextSound) {
                this.events = this.nextSound.events;
              }
              this.nextSound = false;
            }
            this.readPtr = 0;
          } else if (this.infinityRndPulses === false) {
            outputs.forEach((output) => {
              output.forEach((channel) => {
                channel.fill(0, writePtr);
              });
            });
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
    return true;
  } // process

} // AudioProcessor

registerProcessor('AudioProcessor', AudioProcessor);
