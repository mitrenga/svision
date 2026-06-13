/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
/**/
// begin code

/**
 * Audio handler used when there is no audible output (sound turned off or the
 * device has no audio support). It produces no sound but still drives the
 * timing-based event stream of a sound so that sound-synchronized game events
 * keep firing.
 */
export class AudioSilentHandler extends AbstractAudioHandler {

  /**
   * Creates the silent handler.
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'AudioSilentHandler';
  } // constructor

  /**
   * Opens the bus without using an AudioContext, simply clearing the busy
   * flag. The shared context is ignored since this handler produces no output.
   * @param {string} bus - Identifier of the bus.
   * @param {Object} options - Bus configuration options.
   * @param {AudioContext} ctx - The shared AudioContext (unused).
   * @returns {void}
   */
  openBus(bus, options, ctx) {
    this.busy = false;
  } // openBus

  /**
   * Closes the bus, clearing the busy flag.
   * @returns {boolean} Always true.
   */
  closeBus() {
    this.busy = false;
    return true;
  } // closeBus

  /**
   * Indicates that this handler needs no AudioContext, since it produces no
   * audio output and only walks sound data to fire timed events.
   * @returns {boolean} Always false.
   */
  needsContext() {
    return false;
  } // needsContext

  /**
   * Returns the bus state, always reported as running so playback proceeds.
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

} // AudioSilentHandler

export default AudioSilentHandler;
