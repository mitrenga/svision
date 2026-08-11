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
    this.repeatTimer = false;
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
   * Closes the bus, cancelling a pending repeat pass and clearing the busy flag.
   * @returns {boolean} Always true.
   */
  closeBus() {
    this.cancelRepeat();
    this.busy = false;
    return true;
  } // closeBus

  /**
   * Stops playback by cancelling a pending repeat pass. Events of the current
   * pass are already dispatched and cannot be recalled.
   * @returns {void}
   */
  stopBus() {
    this.cancelRepeat();
  } // stopBus

  /**
   * Cancels the timer that would schedule the next repeat pass, when set.
   * @returns {void}
   */
  cancelRepeat() {
    if (this.repeatTimer !== false) {
      clearTimeout(this.repeatTimer);
      this.repeatTimer = false;
    }
  } // cancelRepeat

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
   * Repeat matches the audible handlers: true loops forever, a number plays
   * that many times through, `nextSound` replaces the sound after the first
   * pass. Each pass is scheduled by a timer when the previous one ends, so a
   * loop can be stopped via stopBus/closeBus or a new playSound.
   * @param {Object} audioData - Sound data containing fragments, pulses, and optional events.
   * @param {Object|boolean} options - Playback options; may include `repeat` (true = loop forever, number = total play count) and `nextSound`.
   * @returns {void}
   */
  playSound(audioData, options) {
    this.cancelRepeat();
    if (!audioData || !audioData.pulses) {
      return;
    }
    var playsLeft = 1;
    var nextSound = false;
    if (options !== false) {
      if ('repeat' in options) {
        playsLeft = (typeof options.repeat === 'number') ? options.repeat : (options.repeat ? Infinity : 1);
      }
      if ('nextSound' in options) {
        nextSound = options.nextSound;
      }
    }
    this.schedulePass(audioData, playsLeft, nextSound);
  } // playSound

  /**
   * Dispatches one pass of the sound's timed events and, while plays remain,
   * arms a timer for the pass end that walks the next pass (switching to
   * `nextSound` from the second pass on, like the audible handlers). A sound
   * without events (and no evented next sound) schedules nothing - there is
   * no output to pace, so looping it would only spin timers.
   * @param {Object} audioData - Sound data for this pass.
   * @param {number} playsLeft - Plays remaining including this one (may be Infinity).
   * @param {Object|boolean} nextSound - Replacement sound for the following passes, or false.
   * @returns {void}
   */
  schedulePass(audioData, playsLeft, nextSound) {
    var events = ('events' in audioData) ? audioData.events : false;
    if (events === false && (nextSound === false || !('events' in nextSound))) {
      return;
    }
    var timer = 0;
    for (var p = 0; p < audioData.pulses.length; p++) {
      if (events !== false && p in events) {
        this.app.model.sendEvent(Math.round(timer/44.1), {id: events[p].id, data: events[p]});
      }
      timer += audioData.fragments[audioData.pulses[p]];
    }
    if (events !== false && audioData.pulses.length in events) {
      this.app.model.sendEvent(Math.round(timer/44.1), {id: events[audioData.pulses.length].id, data: events[audioData.pulses.length]});
    }
    playsLeft--;
    if (playsLeft > 0) {
      var next = (nextSound !== false) ? nextSound : audioData;
      this.repeatTimer = setTimeout(() => {
        this.repeatTimer = false;
        this.schedulePass(next, playsLeft, false);
      }, Math.round(timer/44.1));
    }
  } // schedulePass

} // AudioSilentHandler

export default AudioSilentHandler;
