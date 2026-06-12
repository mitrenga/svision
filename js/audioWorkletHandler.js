/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

/**
 * Audio handler that delegates sound synthesis to an AudioWorklet running the
 * AudioProcessor. It loads the worklet module, wires an AudioWorkletNode to
 * the destination, and forwards playback commands (play, pause, continue,
 * mute) over the node's message port while relaying processor events back to
 * the application model.
 */
export class AudioWorkletHandler extends AbstractAudioHandler {

  /**
   * Creates the handler with no worklet node yet.
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'AudioWorkletHandler';
    this.node = null;
  } // constructor

  /**
   * Opens the channel via the base handler and, when the context opened
   * successfully, initializes the audio worklet processor.
   * @param {string} channel - Identifier of the channel.
   * @param {Object} options - Channel configuration options.
   * @returns {void}
   */
  openChannel(channel, options) {
    super.openChannel(channel, options);
    if (this.error === false && this.ctx != null) {
      this.openProcessor(options);
    }
  } // openChannel

  /**
   * Loads the AudioProcessor worklet module, creates the AudioWorkletNode and
   * connects it to the destination, applies the initial muted state, and
   * installs the port message handler that relays processor events to the
   * application model; reports an unsupported-channel event on failure.
   * @param {Object} options - Channel options; may include a `muted` flag.
   * @returns {Promise<void>} Resolves once the processor is set up.
   */
  async openProcessor(options) {
    try {
      await this.ctx.audioWorklet.addModule(this.app.importPath+'/svision/js/audioProcessor.js')
        .catch(error => {
          this.app.model.sendEvent(1, {id: 'unsupportedAudioChannel', channel: this.channel});
        });
      this.node = new AudioWorkletNode(this.ctx, 'AudioProcessor');
      // stereo
      //this.node = new AudioWorkletNode(this.ctx, 'AudioProcessor', {numberOfOutputs: 1, outputChannelCount: [Math.min(2, this.ctx.destination.channelCount)]});
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

  /**
   * Disconnects the worklet node (when present) and closes the channel via the
   * base handler.
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
   * Stops playback by sending the processor an empty 'play' command.
   * @returns {void}
   */
  stopChannel() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'play', audioData: {fragments: false, pulses: false}, options: false});
    }
  } // stopChannel

  /**
   * Pauses playback by sending the processor a 'pause' command.
   * @returns {void}
   */
  pauseChannel() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'pause'});
    }
  } // pauseChannel

  /**
   * Resumes playback by sending the processor a 'continue' command.
   * @returns {void}
   */
  continueChannel() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'continue'});
    }
  } // continueChannel

  /**
   * Mutes or unmutes the channel by sending the processor the corresponding command.
   * @param {boolean} muted - True to send 'mute', false to send 'unmute'.
   * @returns {void}
   */
  muteChannel(muted) {
    if (this.node != null) {
      this.node.port.postMessage({id: {false: 'unmute', true: 'mute'}[muted]});
    }
  } // muteChannel

  /**
   * Indicates whether the worklet node has been created and is ready to play sounds.
   * @returns {boolean} True when the node exists.
   */
  channelIsReady() {
    return this.node != null;
  } // channelIsReady

  /**
   * Plays a sound by sending a 'play' command with the audio data and options to the processor.
   * @param {Object} audioData - Sound data with fragments, pulses, volume, and optional events/infinityRndPulses.
   * @param {Object|boolean} options - Playback options; may include `repeat` and `nextSound`. False when none.
   * @returns {void}
   */
  playSound(audioData, options) {
    this.node.port.postMessage({id: 'play', audioData: audioData, options: options});
  } // playSound
  
} // AudioWorkletHandler

export default AudioWorkletHandler;
