/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

/**
 * Audio handler that synthesizes a square-wave stream using the legacy
 * ScriptProcessorNode (a main-thread fallback for the AudioWorklet
 * implementation). It generates output by alternating an output bit between
 * volume levels for each pulse length, supports looping with an optional
 * follow-up sound and an infinite randomized-pulse mode, and dispatches
 * timing-synchronized events through the application model.
 */
export class AudioScriptProcessorHandler extends AbstractAudioHandler {

  /**
   * Creates the handler and initializes its node reference and full playback state.
   * @param {Object} app - The owning application instance.
   */
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
    this.nextSound = false;
    this.paused = false;
    this.muted = false;
  } // constructor

  /**
   * Opens the channel via the base handler, applies the initial muted state,
   * and creates the script processor when the context opened successfully.
   * @param {string} channel - Identifier of the channel.
   * @param {Object} options - Channel options; may include a `muted` flag.
   * @returns {void}
   */
  openChannel(channel, options) {
    super.openChannel(channel, options);
    if ('muted' in options) {
      this.muted = options.muted;
    }
    if (this.error === false && this.ctx != null) {
      this.openProcessor();
    }
  } // openChannel

  /**
   * Creates the ScriptProcessorNode and installs its onaudioprocess callback,
   * which fills the output buffer from the pulse sequence (handling infinite
   * randomized pulses, repeat/next-sound, and end-of-sound silencing) and
   * dispatches events at pulse boundaries; connects the node to the destination.
   * @returns {void}
   */
  openProcessor() {
    this.node = this.ctx.createScriptProcessor(0, 0, 1);
    //stereo
    //this.node = this.ctx.createScriptProcessor(0, 0, Math.min(2, this.ctx.destination.channelCount));

    this.node.onaudioprocess = (event) => {
      var channelLength = event.outputBuffer.getChannelData(0).length;
      if ((!this.paused) && (this.pulses !== false)) {
        var writePtr = 0;
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
                  this.app.model.sendEvent(1, {id: this.events[this.readPtr].id, data: this.events[this.readPtr]});
                }
              }
            }
          }
          if (writePtr+this.oneReadPulse <= channelLength) {
            for (var idChannel = 0; idChannel < event.outputBuffer.numberOfChannels; idChannel++) {
              var channel = event.outputBuffer.getChannelData(idChannel);
              channel.fill(this.outputVolume[this.muted][this.outputBit], writePtr, writePtr+this.oneReadPulse);
            }
            writePtr += this.oneReadPulse;
            this.oneReadPulse = 0;
            this.readPtr++;
            this.outputBit = 1-this.outputBit;
          } else {
            for (var idChannel = 0; idChannel < event.outputBuffer.numberOfChannels; idChannel++) {
              var channel = event.outputBuffer.getChannelData(idChannel);
              channel.fill(this.outputVolume[this.muted][this.outputBit], writePtr);
            }
            this.oneReadPulse = this.oneReadPulse-(channelLength-writePtr);
            writePtr = channelLength;
          }
          if (this.readPtr >= this.pulses.length && this.oneReadPulse == 0) {
            if (this.events != false) {
              if (this.readPtr in this.events) {
                this.app.model.sendEvent(1, {id: this.events[this.readPtr].id, data: this.events[this.readPtr]});
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
              for (var idChannel = 0; idChannel < event.outputBuffer.numberOfChannels; idChannel++) {
                var channel = event.outputBuffer.getChannelData(idChannel);
                channel.fill(0, writePtr);
              }
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
      } else {
        for (var idChannel = 0; idChannel < event.outputBuffer.numberOfChannels; idChannel++) {
          var channel = event.outputBuffer.getChannelData(idChannel);
          channel.fill(0.0, 0, channelLength);
        }
      }
    } // onaudioprocess

    this.node.connect(this.ctx.destination);
    this.busy = false;
  } // openProcessor

  /**
   * Disconnects the processor node (when present) and closes the channel via
   * the base handler.
   * @returns {boolean} True when the channel was closed, false if the handler was busy.
   */
  closeChannel() {
    if (this.waitForBusy('closeAudioChannel')) {
      return false;
    }
    if (this.node) {
      this.node.disconnect();
    }
    return super.closeChannel();
  } // closeChannel

  /**
   * Stops playback by clearing the current sound's fragments, pulses, options, and events.
   * @returns {void}
   */
  stopChannel() {
    this.fragments = false;
    this.pulses = false;
    this.options = false;
    this.events = false;
  } // stopChannel

  /**
   * Pauses playback by setting the paused flag.
   * @returns {void}
   */
  pauseChannel() {
    this.paused = true;
  } // pauseChannel

  /**
   * Resumes playback by clearing the paused flag.
   * @returns {void}
   */
  continueChannel() {
    this.paused = false;
  } // continueChannel

  /**
   * Mutes or unmutes the channel by setting the muted flag.
   * @param {boolean} muted - True to mute, false to unmute.
   * @returns {void}
   */
  muteChannel(muted) {
    this.muted = muted;
  } // muteChannel

  /**
   * Loads a sound for playback, resetting all read pointers and state and
   * applying optional repeat and next-sound settings; rendering then proceeds
   * in the onaudioprocess callback.
   * @param {Object} audioData - Sound data with fragments, pulses, volume, and optional events/infinityRndPulses.
   * @param {Object|boolean} options - Playback options; may include `repeat` and `nextSound`. False when none.
   * @returns {void}
   */
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
    this.nextSound = false;
    if (options !== false) {
      if ('repeat' in options) {
        this.repeat = options.repeat;
      }
      if ('nextSound' in options) {
        this.nextSound = options.nextSound;
      }
    }
  } // playSound

} // AudioScriptProcessorHandler

export default AudioScriptProcessorHandler;
