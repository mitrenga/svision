const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
// begin code

/**
 * Audio handler for digitised sound — a bus that plays {@link PCMSample}s the
 * way a Sound Blaster played them: one sample at a time out of a DAC, at the
 * sample's own rate.
 *
 * The other handlers of the library synthesise: the pulse handlers a 1-bit
 * beeper, the oscillator handler a score, the game-specific worklets a sound
 * chip. The DOS games of the VGA era carry recorded sounds, so this handler
 * takes samples. Each `PCMSample` becomes an `AudioBuffer` once (kept on the
 * sample under the context it was made for) and every play is an
 * `AudioBufferSourceNode` through the bus gain — the browser resamples from
 * the sample's rate to the context's, so an 11025 Hz recording needs no
 * conversion. A sample the browser decoded from a file
 * (`PCMSample.fromAudioBuffer`, a music track) brings its own buffer,
 * stereo or not, and plays as it is.
 *
 * ## The bus and its options
 *
 * `openBus(bus, {muted, channelCount})` as everywhere. `playSound(sample,
 * options)` with:
 *
 * - `repeat`: true to loop until stopped, or a number of passes
 * - `nextSound`: a sample to play when this one ends (the manager resolves
 *   `options.next` into it)
 * - `volume`: a factor over the sample's own `volume` (1 by default)
 * - `rate`: playback rate, 1 by default — the games sped samples up and down
 *   by changing the DAC rate, and this is that
 * - `overlap`: true to let the previous sound of the bus finish instead of
 *   cutting it; by default a bus plays one sound at a time, as a DAC did
 *
 * Events on the sample — `sample.events = [{at: seconds, id, ...}]` — are
 * dispatched to the model when their time comes, so that a game can hang
 * something on the middle of a sound the way the pulse handlers allow.
 *
 * Pausing holds the sounds where they are: a `BufferSource` cannot be
 * stopped and restarted, but its `playbackRate` can go to 0 and back —
 * what Unity games do to pause music ("pitch 0"). That is the audio only:
 * the events of a sample are armed as `setTimeout` timers when the sound
 * starts (`scheduleEvents`), and `pauseBus` leaves them alone, so they still
 * fire at their original times while the bus is paused. `setRate` moves the
 * rate of everything playing live (music slowing down with the energy,
 * a DAC clocked down) and `fadeBus` takes the bus to silence over a time
 * and stops it (the fade-out of a track at a game over).
 */
export class AudioSampleHandler extends AbstractAudioHandler {

  /**
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'AudioSampleHandler';

    this.gain = null;
    this.playing = [];
    this.muted = false;
    this.busFactor = 1.0;
    this.eventTimers = [];
    this.paused = false;
    this.rate = 1.0;
    this.fadeTimer = null;
  } // constructor

  /**
   * Opens the bus: a gain node to the destination, muted or not as asked.
   * @param {string} bus - Identifier of the bus.
   * @param {Object} options - `muted`, `channelCount`.
   * @param {AudioContext} ctx - The shared AudioContext.
   */
  openBus(bus, options, ctx) {
    super.openBus(bus, options, ctx);
    if (this.ctx == null) {
      return;
    }
    this.muted = !!options.muted;
    this.gain = this.ctx.createGain();
    this.gain.connect(this.ctx.destination);
    this.applyGain();
    this.busy = false;
  } // openBus

  /**
   * Closes the bus, stopping what plays and releasing the gain node.
   * @returns {boolean} True when the bus was closed.
   */
  closeBus() {
    this.stopBus();
    if (this.gain !== null) {
      this.gain.disconnect();
      this.gain = null;
    }
    return super.closeBus();
  } // closeBus

  /**
   * Stops every sound of the bus and drops the pending events.
   */
  stopBus() {
    this.cancelEvents();
    this.cancelFade();
    var sources = this.playing;
    this.playing = [];
    sources.forEach((entry) => {
      entry.source.onended = null;
      try {
        entry.source.stop();
      } catch (error) {
        // already ended
      }
      entry.source.disconnect();
      entry.gain.disconnect();
    });
  } // stopBus

  /**
   * Pauses the bus — see the class note: the sounds hold at a rate of 0.
   */
  pauseBus() {
    this.paused = true;
    this.applyRate();
  } // pauseBus

  /**
   * Resumes the bus: the sounds go on at the rate they had.
   */
  continueBus() {
    this.paused = false;
    this.applyRate();
  } // continueBus

  /**
   * Sets the playback rate of everything playing, and of what plays next
   * (a `rate` in the play options multiplies it).
   * @param {number} rate - 1 = the sample's own speed; 0 holds.
   */
  setRate(rate) {
    this.rate = Math.max(0, rate);
    this.applyRate();
  } // setRate

  /**
   * Puts the bus rate and the pause on the sources.
   */
  applyRate() {
    var rate = this.paused ? 0 : this.rate;
    this.playing.forEach((entry) => {
      entry.source.playbackRate.value = rate*entry.rate;
    });
  } // applyRate

  /**
   * Takes the bus to silence over a time and stops it, the gain restored
   * for the next sound.
   * @param {number} seconds - The fade.
   */
  fadeBus(seconds) {
    if (this.gain === null || this.playing.length === 0) {
      return;
    }
    this.cancelFade();
    var now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0.0, now+Math.max(0.01, seconds));
    this.fadeTimer = setTimeout(() => {
      this.fadeTimer = null;
      this.stopBus();
      this.applyGain();
    }, Math.round(seconds*1000)+20);
  } // fadeBus

  /**
   * Drops a running fade, the gain back where the bus has it.
   */
  cancelFade() {
    if (this.fadeTimer !== null) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
      if (this.gain !== null) {
        this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.applyGain();
      }
    }
  } // cancelFade

  /**
   * Mutes or unmutes the bus.
   * @param {boolean} muted - True to mute.
   */
  muteBus(muted) {
    this.muted = !!muted;
    this.applyGain();
  } // muteBus

  /**
   * Sets the user volume of the bus.
   * @param {number} factor - Linear gain, 1.0 = the sample's own loudness.
   */
  setBusVolume(factor) {
    this.busFactor = factor;
    this.applyGain();
  } // setBusVolume

  /**
   * Puts the mute state and the bus volume on the gain node.
   */
  applyGain() {
    if (this.gain !== null) {
      this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gain.gain.value = this.muted ? 0.0 : this.busFactor;
    }
  } // applyGain

  /**
   * Whether the bus can take a sound: it has its context and gain node.
   * @returns {boolean} True when ready.
   */
  busIsReady() {
    return this.ctx !== null && this.gain !== null;
  } // busIsReady

  /**
   * Whether a sample is playing: the bus has a source that has not ended.
   * @returns {boolean} True while something plays.
   */
  isPlaying() {
    return this.playing.length > 0;
  } // isPlaying

  /**
   * The `AudioBuffer` of a sample under this context, made on the first play
   * and kept on the sample.
   * @param {PCMSample} sample - The sound.
   * @returns {AudioBuffer} Its buffer.
   */
  bufferOf(sample) {
    if (sample.samples === null && sample.audioBuffer) {
      return sample.audioBuffer;              // decoded by the browser: any context
    }
    if (!sample.audioBuffer || sample.audioBufferContext !== this.ctx) {
      var buffer = this.ctx.createBuffer(1, sample.samples.length, sample.sampleRate);
      buffer.copyToChannel(sample.samples, 0);
      sample.audioBuffer = buffer;
      sample.audioBufferContext = this.ctx;
    }
    return sample.audioBuffer;
  } // bufferOf

  /**
   * Plays a sample. `false` for the sample stops the bus.
   * @param {PCMSample|boolean} audioData - The sound, or false.
   * @param {Object|boolean} options - See the class note; false for none.
   */
  playSound(audioData, options) {
    if (audioData === false || !audioData || !(audioData.samples || audioData.audioBuffer)) {
      this.stopBus();
      return;
    }
    var opts = options || {};
    if (!opts.overlap) {
      this.stopBus();
    }
    var source = this.ctx.createBufferSource();
    source.buffer = this.bufferOf(audioData);
    var rate = opts.rate === undefined ? 1 : opts.rate;
    source.playbackRate.value = (this.paused ? 0 : this.rate)*rate;
    var passes = opts.repeat === true ? Infinity : (typeof opts.repeat === 'number' ? opts.repeat : 1);
    if (passes === Infinity) {
      source.loop = true;
    }
    var level = (audioData.volume === undefined ? 1 : audioData.volume)*(opts.volume === undefined ? 1 : opts.volume);
    var gain = this.ctx.createGain();
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(this.gain);
    var entry = {source: source, gain: gain, passes: passes, options: opts, sample: audioData, rate: rate};
    this.playing.push(entry);
    source.onended = () => this.soundEnded(entry);
    source.start();
    this.scheduleEvents(audioData, source.playbackRate.value || 1);
  } // playSound

  /**
   * When a sound ends: plays it again while passes remain, otherwise the
   * `nextSound` if there is one, and forgets it.
   * @param {Object} entry - The playing entry.
   */
  soundEnded(entry) {
    var at = this.playing.indexOf(entry);
    if (at < 0) {
      return;
    }
    this.playing.splice(at, 1);
    entry.source.disconnect();
    entry.gain.disconnect();
    if (entry.passes > 1 && entry.passes !== Infinity) {
      this.playSound(entry.sample, Object.assign({}, entry.options, {repeat: entry.passes-1, overlap: true}));
    } else if (entry.options.nextSound) {
      var next = Object.assign({}, entry.options, {overlap: true});
      delete next.nextSound;
      delete next.repeat;
      this.playSound(entry.options.nextSound, next);
    }
  } // soundEnded

  /**
   * Schedules the events a sample carries against the model's clock.
   * @param {PCMSample} sample - The sound, with an optional `events` list.
   * @param {number} rate - The playback rate, which stretches the times.
   */
  scheduleEvents(sample, rate) {
    if (!Array.isArray(sample.events)) {
      return;
    }
    sample.events.forEach((event) => {
      var delay = Math.round(event.at*1000/(rate || 1));
      var timer = setTimeout(() => {
        this.eventTimers = this.eventTimers.filter((t) => t !== timer);
        if (this.app.model) {
          this.app.model.sendEvent(0, Object.assign({}, event));
        }
      }, delay);
      this.eventTimers.push(timer);
    });
  } // scheduleEvents

  /**
   * Drops the pending events of stopped sounds.
   */
  cancelEvents() {
    this.eventTimers.forEach((timer) => clearTimeout(timer));
    this.eventTimers = [];
  } // cancelEvents

} // AudioSampleHandler
