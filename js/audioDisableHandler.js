/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

/**
 * Audio handler used when sound output is disabled. It produces no audible
 * output but still drives the timing-based event stream of a sound so that
 * sound-synchronized game events keep firing.
 */
export class AudioDisableHandler extends AbstractAudioHandler {

  /**
   * Creates the disabled handler.
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'AudioDisableHandler';
  } // constructor

  /**
   * Opens the channel without using an AudioContext, simply clearing the busy
   * flag. The shared context is ignored since this handler produces no output.
   * @param {string} channel - Identifier of the channel.
   * @param {Object} options - Channel configuration options.
   * @param {AudioContext} ctx - The shared AudioContext (unused).
   * @returns {void}
   */
  openChannel(channel, options, ctx) {
    this.busy = false;
  } // openChannel

  /**
   * Closes the channel, clearing the busy flag.
   * @returns {boolean} Always true.
   */
  closeChannel() {
    this.busy = false;
    return true;
  } // closeChannel

  /**
   * Indicates that this handler needs no AudioContext, since it produces no
   * audio output and only walks sound data to fire timed events.
   * @returns {boolean} Always false.
   */
  needsContext() {
    return false;
  } // needsContext

  /**
   * Returns the channel state, always reported as running so playback proceeds.
   * @returns {string} The string 'running'.
   */
  getState() {
    return 'running';
  } // getState

  /**
   * Produces no sound but walks the sound's pulse fragments to compute event
   * timings and dispatches each associated event (converting samples to
   * milliseconds at 44.1 kHz), including a final event after the last pulse.
   * @param {Object} audioData - Sound data containing fragments, pulses, and optional events.
   * @param {Object|boolean} options - Playback options (unused here).
   * @returns {void}
   */
  playSound(audioData, options) {
    if ('events' in audioData) {
      var timer = 0;
      for (var p = 0; p < audioData.pulses.length; p++) {
        if (p in audioData.events) {
          this.app.model.sendEvent(Math.round(timer/44.1), {id: audioData.events[p].id, data: audioData.events[p]});
        }
        timer += audioData.fragments[audioData.pulses[p]];
      }
      if (audioData.pulses.length in audioData.events) {
        this.app.model.sendEvent(Math.round(timer/44.1), {id: audioData.events[audioData.pulses.length].id, data: audioData.events[audioData.pulses.length]});
      }
    }
  } // playSound

} // AudioDiableHandler

export default AudioDisableHandler;
