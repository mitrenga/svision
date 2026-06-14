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
   * Opens the bus via the base handler and, when the context opened
   * successfully, initializes the audio worklet processor.
   * @param {string} bus - Identifier of the bus.
   * @param {Object} options - Bus configuration options.
   * @param {AudioContext} ctx - The shared AudioContext to use.
   * @returns {void}
   */
  openBus(bus, options, ctx) {
    super.openBus(bus, options, ctx);
    if (this.error === false && this.ctx != null) {
      this.openProcessor(options);
    }
  } // openBus

  /**
   * Ensures the AudioProcessor worklet module is registered on the shared
   * context, exactly once per context. The module is loaded via fetch() and
   * registered from a blob URL so the service worker can serve it from cache
   * offline (addModule() requests bypass the service worker on some browsers).
   * The registration promise is cached on the context so several buses sharing
   * it do not register the processor twice, which would throw "a class with the
   * same name is already registered"; on failure the cached promise is cleared
   * so a later bus can retry.
   * @returns {Promise<void>} Resolves once the processor class is registered.
   */
  loadProcessorModule() {
    if (!this.ctx.audioProcessorModule) {
      this.ctx.audioProcessorModule = (async () => {
        const url = this.app.importPath+'/svision/js/audioProcessor.js';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('audioProcessor '+response.status);
        }
        const blobURL = URL.createObjectURL(await response.blob());
        try {
          await this.ctx.audioWorklet.addModule(blobURL);
        } finally {
          URL.revokeObjectURL(blobURL);
        }
      })().catch((error) => {
        this.ctx.audioProcessorModule = null;
        throw error;
      });
    }
    return this.ctx.audioProcessorModule;
  } // loadProcessorModule

  /**
   * Registers the worklet module (once per context), creates the
   * AudioWorkletNode and connects it to the destination, applies the initial
   * muted state, and installs the port message handler that relays processor
   * events to the application model; on any failure it reports a single
   * unsupported-bus event so the manager can fall back to another handler.
   * @param {Object} options - Bus options; may include `muted` and `channelCount` (1 = mono, 2 = stereo).
   * @returns {Promise<void>} Resolves once the processor is set up.
   */
  async openProcessor(options) {
    try {
      await this.loadProcessorModule();
      this.node = new AudioWorkletNode(this.ctx, 'AudioProcessor', {numberOfOutputs: 1, outputChannelCount: [Math.min(this.channelCount, this.ctx.destination.maxChannelCount)]});
      this.node.connect(this.ctx.destination);
      if ('muted' in options && options.muted) {
        this.node.port.postMessage({id: 'mute'});
      }
      this.node.port.onmessage = (event) => {
        this.app.model.sendEvent(1, {id: event.data.id, data: event.data});
      } // onmessage
    } catch(error) {
      this.app.model.sendEvent(1, {id: 'unsupportedAudioBus', bus: this.bus});
    } finally {
      this.busy = false;
    }
  } // openProcessor

  /**
   * Disconnects the worklet node (when present) and closes the bus via the
   * base handler.
   * @returns {boolean} True when the bus was closed, false if the handler was busy.
   */
  closeBus() {
    if (this.waitForBusy('closeAudioBus')) {
      return false;
    }
    if (this.node) {
      this.node.disconnect();
    }
    return super.closeBus();
  } // closeBus

  /**
   * Stops playback by sending the processor an empty 'play' command.
   * @returns {void}
   */
  stopBus() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'play', audioData: {fragments: false, pulses: false}, options: false});
    }
  } // stopBus

  /**
   * Pauses playback by sending the processor a 'pause' command.
   * @returns {void}
   */
  pauseBus() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'pause'});
    }
  } // pauseBus

  /**
   * Resumes playback by sending the processor a 'continue' command.
   * @returns {void}
   */
  continueBus() {
    if (this.node != null) {
      this.node.port.postMessage({id: 'continue'});
    }
  } // continueBus

  /**
   * Mutes or unmutes the bus by sending the processor the corresponding command.
   * @param {boolean} muted - True to send 'mute', false to send 'unmute'.
   * @returns {void}
   */
  muteBus(muted) {
    if (this.node != null) {
      this.node.port.postMessage({id: {false: 'unmute', true: 'mute'}[muted]});
    }
  } // muteBus

  /**
   * Indicates whether the worklet node has been created and is ready to play sounds.
   * @returns {boolean} True when the node exists.
   */
  busIsReady() {
    return this.node != null;
  } // busIsReady

  /**
   * Plays a sound by sending a 'play' command with the audio data and options to the processor.
   * @param {Object} audioData - Sound data with fragments, pulses, volume, and optional events/infinityRndPulses.
   * @param {Object|boolean} options - Playback options; may include `repeat`, `nextSound`, and `channelVolumes` (per-channel volume multipliers, e.g. [1, 0] for left-only). False when none.
   * @returns {void}
   */
  playSound(audioData, options) {
    this.node.port.postMessage({id: 'play', audioData: audioData, options: options});
  } // playSound
  
} // AudioWorkletHandler

export default AudioWorkletHandler;
