/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

/**
 * Audio handler that drives a simple Web Audio oscillator, toggling a single
 * continuous tone on and off on each playSound call. Mainly useful as a
 * minimal test/diagnostic tone generator.
 */
export class AudioOscillatorHandler extends AbstractAudioHandler {

  /**
   * Creates the oscillator handler with no active gain node or oscillator.
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'AudioOscillatorHandler';
    this.gainNode = null;
    this.oscillator = null;
  } // constructor

  /**
   * Opens the channel via the base handler and clears the busy flag.
   * @param {string} channel - Identifier of the channel.
   * @param {Object} options - Channel configuration options.
   * @returns {void}
   */
  openChannel(channel, options) {
    super.openChannel(channel, options);
    this.busy = false;
  } // openChannel

  /**
   * Toggles the oscillator: if a tone is currently playing it is stopped and
   * disconnected; otherwise a new gain node and 400 Hz oscillator are created,
   * connected to the destination, and started.
   * @param {Object} audioData - Sound data (unused; the tone is fixed).
   * @param {Object|boolean} options - Playback options (unused).
   * @returns {void}
   */
  playSound(audioData, options) {
    if (this.gainNode) {
      this.oscillator.stop();
      this.oscillator.disconnect(this.gainNode);
      this.gainNode.disconnect(this.ctx.destination);
      this.oscillator = null;
      this.gainNode = null;
    } else {
      this.gainNode = this.ctx.createGain();
      this.oscillator = this.ctx.createOscillator();
      this.oscillator.frequency.value = 400; // 40..6000
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this.oscillator.start();
    }
  } // playSound

} // AudioOscillatorHandler

export default AudioOscillatorHandler;
