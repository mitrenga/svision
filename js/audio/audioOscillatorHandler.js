/**/
const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
const { OscillatorInstrument } = await import('./instrument/oscillatorInstrument.js?ver='+window.srcVersion);
const { NoiseInstrument } = await import('./instrument/noiseInstrument.js?ver='+window.srcVersion);
const { VoiceInstrument } = await import('./instrument/voiceInstrument.js?ver='+window.srcVersion);
/*/
import AbstractAudioHandler from './abstractAudioHandler.js';
import OscillatorInstrument from './instrument/oscillatorInstrument.js';
import NoiseInstrument from './instrument/noiseInstrument.js';
import VoiceInstrument from './instrument/voiceInstrument.js';
/**/
// begin code

/**
 * Audio handler that renders music and sound effects with real-time Web Audio
 * synthesis (oscillators, filters, envelopes) instead of the 1-bit pulse stream
 * used by the worklet/script-processor handlers. Its `audioData` is a declarative
 * "score": a tempo, a bank of instrument descriptors and one or more tracks of
 * notes. A look-ahead scheduler walks the score against the AudioContext clock
 * and asks each track's instrument to play its notes; a single master gain node
 * carries the bus volume and mute state.
 *
 * Score shape:
 *   {
 *     tempo: 120,                 // beats per minute (4/4, 16 ticks per bar)
 *     volume: 0.3,                // bus master gain
 *     defaultDuration: 4,         // note length in ticks when a note omits `dur`
 *     instruments: { name: {descriptor}, ... },   // see AbstractInstrument
 *     tracks: [ { instrument:'name', pattern:[ [ {tick, pitch, dur?, vol?}, ... ], ... ] } ],
 *     repeat: false,              // loop the whole score
 *     echo: {time, feedback, mix},   // optional feedback delay (echo)
 *     reverb: {seconds, decay, mix}, // optional convolution reverb
 *     flanger: {base, depth, rate, feedback, mix}  // optional LFO-swept comb (metallic sheen)
 *   }
 * The effects are bus-wide by default, or fed only by voices whose descriptor
 * sets echoSend/reverbSend/flangerSend.
 */
export class AudioOscillatorHandler extends AbstractAudioHandler {

  /**
   * Creates the handler with no master gain, no instruments and an idle
   * scheduler. Registers the built-in instrument classes usable from a score's
   * `class` field.
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    this.id = 'AudioOscillatorHandler';
    this.masterGain = null;
    this.echoNodes = null;
    this.reverbNodes = null;
    this.flangerNodes = null;
    this.score = false;
    this.instruments = {};
    this.instrumentClasses = {OscillatorInstrument: OscillatorInstrument, NoiseInstrument: NoiseInstrument, VoiceInstrument: VoiceInstrument};

    this.schedulerId = false;
    this.schedulerActive = false;
    this.worker = null;
    this.paused = false;
    this.muted = false;
    this.volume = 0.0;

    this.barCount = 0;
    this.nextBar = 0;
    this.nextBarTime = 0;
    this.pendingNotes = [];
    this.secondsPerBeat = 0;
    this.secondsPerBar = 0;
    this.secondsPerTick = 0;
    this.lookahead = 0;
    this.repeat = false;

    // Scheduler diagnostics (for monitoring feed timing on weak devices):
    // gap between scheduler ticks (ms) and how far ahead notes are scheduled (s).
    // Worst values are kept in five 1-second buckets, so displays can show the
    // worst case over a sliding ~5 s window instead of an all-time extreme.
    this.diagTickGapMs = 0;
    this.diagMaxTickGapMs = 0;
    this.diagMarginSec = 0;
    this.diagMinMarginSec = 0;
    this.diagLastTickPerf = 0;
    this.diagStartTime = -1;   // -1 = not playing yet (currentTime can legitimately be 0 at start)
    this.diagStartPerf = 0;
    this.diagBucketStamps = [0, 0, 0, 0, 0];
    this.diagGapBuckets = [0, 0, 0, 0, 0];
    this.diagMarginBuckets = [Infinity, Infinity, Infinity, Infinity, Infinity];
  } // constructor

  /**
   * Opens the bus via the base handler and, when a context is available, creates
   * the master gain node feeding the destination and applies the initial muted
   * state.
   * @param {string} bus - Identifier of the bus.
   * @param {Object} options - Bus configuration options; may include `muted`.
   * @param {AudioContext} ctx - The shared AudioContext to use.
   * @returns {void}
   */
  openBus(bus, options, ctx) {
    super.openBus(bus, options, ctx);
    if (this.error === false && this.ctx != null) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0;
      this.masterGain.connect(this.ctx.destination);
      if ('muted' in options && options.muted) {
        this.muted = true;
      }
      this.loadWorker();
    }
    this.busy = false;
  } // openBus

  /**
   * Creates the metronome worker that drives the scheduler off the main thread.
   * A plain `new Worker(url)` request is served by the service worker like any
   * other, so it works offline once cached (no blob dance needed - that is only
   * required for audioWorklet.addModule). If the environment has no Worker
   * support the scheduler falls back to a main-thread recursive setTimeout.
   * @returns {void}
   */
  loadWorker() {
    try {
      this.worker = new Worker(this.app.importPath+'/svision/js/audio/worker/oscilatorWorker.js?ver='+window.srcVersion);
      this.worker.onmessage = () => this.onSchedulerTick();
    } catch (error) {
      this.worker = null;
    }
  } // loadWorker

  /**
   * Indicates whether the bus is ready to play sounds.
   * @returns {boolean} True once the master gain node exists.
   */
  busIsReady() {
    return this.masterGain != null;
  } // busIsReady

  /**
   * Plays a score. A falsy score stops playback. Otherwise it stops any current
   * playback, reads tempo/volume/repeat, builds the score's instruments, and
   * starts the look-ahead scheduler.
   * @param {Object|boolean} audioData - The score to play, or false to stop.
   * @param {Object|boolean} options - Playback options; may include `repeat`. False when none.
   * @returns {void}
   */
  playSound(audioData, options) {
    this.stopScheduler();
    this.clearInstruments();

    if (!audioData || !audioData.tracks) {
      this.score = false;
      return;
    }

    this.score = audioData;

    this.repeat = false;
    if (options !== false && 'repeat' in options) {
      this.repeat = options.repeat;
    } else if ('repeat' in audioData) {
      this.repeat = audioData.repeat;
    }

    this.volume = ('volume' in audioData) ? audioData.volume : 0.2;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.muted ? 0.0 : this.volume, now);

    this.buildOutput(audioData);

    const tempo = audioData.tempo || 120;
    this.secondsPerBeat = 60 / tempo;
    this.secondsPerBar = this.secondsPerBeat * 4;
    this.secondsPerTick = this.secondsPerBeat / 4;
    this.lookahead = this.secondsPerBeat;

    this.buildInstruments(audioData);
    this.connectEchoSends();
    this.connectReverbSends();
    this.connectFlangerSends();

    this.barCount = 0;
    audioData.tracks.forEach((track) => {
      if (track.pattern.length > this.barCount) {
        this.barCount = track.pattern.length;
      }
    });

    this.paused = false;
    this.nextBar = 0;
    this.nextBarTime = this.ctx.currentTime + 0.1;
    this.pendingNotes = [];
    this.diagStartTime = this.ctx.currentTime;
    this.diagStartPerf = performance.now();
    this.scheduleAutomation(this.nextBarTime);
    this.startScheduler();
  } // playSound

  /**
   * Schedules each track's parameter automation onto the instrument's
   * automatable AudioParams, relative to the first bar. Each event is
   * `{bar, tick?, value, transition}` where `transition:'ramp'` uses an
   * exponential ramp and anything else sets the value immediately.
   * @param {number} firstBarTime - Start time of bar 0 on the AudioContext clock.
   * @returns {void}
   */
  scheduleAutomation(firstBarTime) {
    this.score.tracks.forEach((track) => {
      if (track.automation == null) {
        return;
      }
      const instrument = this.instruments[track.instrument];
      if (instrument == null) {
        return;
      }
      Object.keys(track.automation).forEach((paramPath) => {
        const param = instrument.automatableParam(paramPath);
        if (param == null) {
          return;
        }
        track.automation[paramPath].forEach((event) => {
          const time = firstBarTime + event.bar * this.secondsPerBar + (event.tick || 0) * this.secondsPerTick;
          if (event.transition === 'ramp') {
            param.exponentialRampToValueAtTime(Math.max(0.0001, event.value), time);
          } else {
            param.setValueAtTime(event.value, time);
          }
        });
      });
    });
  } // scheduleAutomation

  /**
   * Instantiates every instrument declared in the score, choosing its class
   * from the registry by the descriptor's `class` field (defaulting to
   * Instrument) and wiring it to the master gain.
   * @param {Object} score - The score whose `instruments` map is built.
   * @returns {void}
   */
  buildInstruments(score) {
    this.instruments = {};
    Object.keys(score.instruments).forEach((name) => {
      const descriptor = score.instruments[name];
      const InstrumentClass = this.instrumentClasses[descriptor.class] || OscillatorInstrument;
      this.instruments[name] = new InstrumentClass(this.ctx, this.masterGain, descriptor);
    });
  } // buildInstruments

  /**
   * Disconnects and drops all current instruments.
   * @returns {void}
   */
  clearInstruments() {
    Object.keys(this.instruments).forEach((name) => {
      this.instruments[name].cancel();
      this.instruments[name].disconnect();
    });
    this.instruments = {};
  } // clearInstruments

  /**
   * (Re)wires the bus output for the given score. The master gain always feeds
   * the destination directly (dry). When the score has a `reverb` block a
   * convolution reverb is added in parallel, and when it has an `echo` block a
   * feedback delay is added in parallel; each effect's input is wired later by
   * connectReverbSends()/connectEchoSends(). Any previous effect networks are
   * torn down first.
   * @param {Object} score - The score; `echo` = {time (s), feedback (0..0.95), mix}; `reverb` = {seconds, decay, mix}.
   * @returns {void}
   */
  buildOutput(score) {
    this.teardownEcho();
    this.teardownReverb();
    this.teardownFlanger();
    this.masterGain.disconnect();
    this.masterGain.connect(this.ctx.destination);

    if ('flanger' in score && score.flanger) {
      // a short LFO-modulated delay mixed back in (comb filtering with a slowly
      // sweeping notch pattern) - the classic metallic "flanged" sheen
      const flanger = score.flanger;
      const delay = this.ctx.createDelay(0.05);
      delay.delayTime.value = ('base' in flanger) ? flanger.base : 0.002;
      const lfoOsc = this.ctx.createOscillator();
      lfoOsc.frequency.value = ('rate' in flanger) ? flanger.rate : 0.25;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = ('depth' in flanger) ? flanger.depth : 0.0015;
      lfoOsc.connect(lfoGain);
      lfoGain.connect(delay.delayTime);
      lfoOsc.start();
      const feedback = this.ctx.createGain();
      feedback.gain.value = Math.min(0.9, Math.max(-0.9, ('feedback' in flanger) ? flanger.feedback : 0.3));
      delay.connect(feedback);
      feedback.connect(delay);
      const wet = this.ctx.createGain();
      wet.gain.value = Math.max(0.0, ('mix' in flanger) ? flanger.mix : 0.7);
      delay.connect(wet);
      wet.connect(this.ctx.destination);

      // Input wired later by connectFlangerSends(): whole bus or flangerSend voices.
      this.flangerNodes = {delay: delay, lfoOsc: lfoOsc, lfoGain: lfoGain, feedback: feedback, wet: wet};
    }

    if ('reverb' in score && score.reverb) {
      const reverb = score.reverb;
      const convolver = this.ctx.createConvolver();
      convolver.buffer = this.createImpulse(('seconds' in reverb) ? reverb.seconds : 1.5, ('decay' in reverb) ? reverb.decay : 2.5);
      const wet = this.ctx.createGain();
      wet.gain.value = Math.max(0.0, ('mix' in reverb) ? reverb.mix : 0.4);

      convolver.connect(wet);
      wet.connect(this.ctx.destination);

      // Input wired later by connectReverbSends(): whole bus or reverbSend voices.
      this.reverbNodes = {convolver: convolver, wet: wet};
    }

    if ('echo' in score && score.echo) {
      const echo = score.echo;
      const time = Math.min(0.99, Math.max(0.001, ('time' in echo) ? echo.time : 0.3));
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = time;
      const feedback = this.ctx.createGain();
      feedback.gain.value = Math.min(0.95, Math.max(0.0, ('feedback' in echo) ? echo.feedback : 0.4));
      const wet = this.ctx.createGain();
      wet.gain.value = Math.max(0.0, ('mix' in echo) ? echo.mix : 0.35);

      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(this.ctx.destination);

      // The echo's input is wired later by connectEchoSends(): either the whole
      // bus (master) or only the instruments that opt in via echoSend.
      this.echoNodes = {delay: delay, feedback: feedback, wet: wet};
    }
  } // buildOutput

  /**
   * Feeds the echo network's input. If any instrument opts in with `echoSend`,
   * only those instruments are routed to the echo; otherwise the whole bus
   * (master gain) is, so a plain `score.echo` still echoes everything.
   * @returns {void}
   */
  connectEchoSends() {
    if (this.echoNodes == null) {
      return;
    }
    const sends = Object.keys(this.instruments).filter((name) => this.instruments[name].echoSend);
    if (sends.length > 0) {
      sends.forEach((name) => this.instruments[name].instrumentGain.connect(this.echoNodes.delay));
    } else {
      this.masterGain.connect(this.echoNodes.delay);
    }
  } // connectEchoSends

  /**
   * Disconnects and drops the current echo network, if any.
   * @returns {void}
   */
  teardownEcho() {
    if (this.echoNodes != null) {
      this.echoNodes.delay.disconnect();
      this.echoNodes.feedback.disconnect();
      this.echoNodes.wet.disconnect();
      this.echoNodes = null;
    }
  } // teardownEcho

  /**
   * Generates a synthetic reverb impulse response: decaying stereo white noise.
   * @param {number} seconds - Length of the reverb tail.
   * @param {number} decay - Decay exponent (higher = faster fade).
   * @returns {AudioBuffer} The impulse-response buffer.
   */
  createImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * seconds));
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  } // createImpulse

  /**
   * Feeds the reverb network's input. If any instrument opts in with
   * `reverbSend`, only those are routed to the reverb; otherwise the whole bus.
   * @returns {void}
   */
  connectReverbSends() {
    if (this.reverbNodes == null) {
      return;
    }
    const sends = Object.keys(this.instruments).filter((name) => this.instruments[name].reverbSend);
    if (sends.length > 0) {
      sends.forEach((name) => this.instruments[name].instrumentGain.connect(this.reverbNodes.convolver));
    } else {
      this.masterGain.connect(this.reverbNodes.convolver);
    }
  } // connectReverbSends

  /**
   * Disconnects and drops the current reverb network, if any.
   * @returns {void}
   */
  teardownReverb() {
    if (this.reverbNodes != null) {
      this.reverbNodes.convolver.disconnect();
      this.reverbNodes.wet.disconnect();
      this.reverbNodes = null;
    }
  } // teardownReverb

  /**
   * Feeds the flanger network's input. If any instrument opts in with
   * `flangerSend`, only those are routed to the flanger; otherwise the whole bus.
   * @returns {void}
   */
  connectFlangerSends() {
    if (this.flangerNodes == null) {
      return;
    }
    const sends = Object.keys(this.instruments).filter((name) => this.instruments[name].flangerSend);
    if (sends.length > 0) {
      sends.forEach((name) => this.instruments[name].instrumentGain.connect(this.flangerNodes.delay));
    } else {
      this.masterGain.connect(this.flangerNodes.delay);
    }
  } // connectFlangerSends

  /**
   * Stops and disconnects the current flanger network, if any.
   * @returns {void}
   */
  teardownFlanger() {
    if (this.flangerNodes != null) {
      this.flangerNodes.lfoOsc.stop();
      this.flangerNodes.lfoOsc.disconnect();
      this.flangerNodes.lfoGain.disconnect();
      this.flangerNodes.delay.disconnect();
      this.flangerNodes.feedback.disconnect();
      this.flangerNodes.wet.disconnect();
      this.flangerNodes = null;
    }
  } // teardownFlanger

  /**
   * Starts the look-ahead scheduler and runs the first window immediately. The
   * loop is then driven by ticks from the metronome worker (which runs on its
   * own thread, unaffected by main-thread jank); if the worker is not ready yet
   * or is unavailable, it falls back to a main-thread recursive setTimeout.
   * Either way the actual note scheduling happens here on the main thread
   * against the AudioContext clock. Never setInterval (drifts / piles up).
   * @returns {void}
   */
  startScheduler() {
    this.schedulerActive = true;
    this.diagMaxTickGapMs = 0;
    this.diagMinMarginSec = this.lookahead;
    this.diagLastTickPerf = 0;
    this.diagSkipFirst = true;   // the very first schedule() measures the 0.1 s pre-roll, not a real margin
    this.schedule();
    const intervalMs = Math.max(25, this.secondsPerTick * 1000);
    if (this.worker != null) {
      this.worker.postMessage({id: 'start', intervalMs: intervalMs});
    } else {
      this.schedulerId = setTimeout(() => this.runScheduler(), intervalMs);
    }
  } // startScheduler

  /**
   * Handles one scheduler tick (from the worker or the main-thread fallback):
   * records how long since the previous tick (to spot a lagging/starved feeder)
   * and tops up the look-ahead window.
   * @returns {void}
   */
  onSchedulerTick() {
    if (!this.schedulerActive) {
      return;
    }
    const nowPerf = performance.now();
    if (this.diagLastTickPerf > 0) {
      this.diagTickGapMs = nowPerf - this.diagLastTickPerf;
      if (this.diagTickGapMs > this.diagMaxTickGapMs) {
        this.diagMaxTickGapMs = this.diagTickGapMs;
      }
      const bucket = this.diagBucket();
      if (this.diagTickGapMs > this.diagGapBuckets[bucket]) {
        this.diagGapBuckets[bucket] = this.diagTickGapMs;
      }
    }
    this.diagLastTickPerf = nowPerf;
    this.schedule();
  } // onSchedulerTick

  /**
   * Returns the index of the current 1-second diagnostics bucket, clearing it
   * first when it still holds data from an older second.
   * @returns {number} The bucket index (0..4).
   */
  diagBucket() {
    const second = Math.floor(performance.now() / 1000);
    const index = second % 5;
    if (this.diagBucketStamps[index] !== second) {
      this.diagBucketStamps[index] = second;
      this.diagGapBuckets[index] = 0;
      this.diagMarginBuckets[index] = Infinity;
    }
    return index;
  } // diagBucket

  /**
   * Returns the worst (largest) scheduler tick gap seen during the last ~5 seconds.
   * @returns {number} The gap in milliseconds.
   */
  diagWindowGapMax() {
    const second = Math.floor(performance.now() / 1000);
    let worst = 0;
    for (let i = 0; i < 5; i++) {
      if (this.diagBucketStamps[i] > second - 5 && this.diagGapBuckets[i] > worst) {
        worst = this.diagGapBuckets[i];
      }
    }
    return worst;
  } // diagWindowGapMax

  /**
   * Returns the worst (smallest) look-ahead margin seen during the last ~5 seconds.
   * @returns {number} The margin in seconds (the look-ahead size when no data).
   */
  diagWindowMarginMin() {
    const second = Math.floor(performance.now() / 1000);
    let worst = Infinity;
    for (let i = 0; i < 5; i++) {
      if (this.diagBucketStamps[i] > second - 5 && this.diagMarginBuckets[i] < worst) {
        worst = this.diagMarginBuckets[i];
      }
    }
    return (worst === Infinity) ? this.lookahead : worst;
  } // diagWindowMarginMin

  /**
   * Main-thread fallback tick used only while the worker is not available: tops
   * up the look-ahead window and re-arms via recursive setTimeout. Once the
   * worker takes over (or playback stops), it stops re-arming.
   * @returns {void}
   */
  runScheduler() {
    this.onSchedulerTick();
    if (this.schedulerActive && this.worker == null) {
      this.schedulerId = setTimeout(() => this.runScheduler(), Math.max(25, this.secondsPerTick * 1000));
    }
  } // runScheduler

  /**
   * Stops the scheduler loop (worker tick and/or main-thread fallback).
   * Already-scheduled notes still play out on the audio thread.
   * @returns {void}
   */
  stopScheduler() {
    this.schedulerActive = false;
    if (this.schedulerId !== false) {
      clearTimeout(this.schedulerId);
      this.schedulerId = false;
    }
    if (this.worker != null) {
      this.worker.postMessage({id: 'stop'});
    }
  } // stopScheduler

  /**
   * Look-ahead step: schedules every bar whose start time falls within the
   * look-ahead window ahead of the current clock. Loops on repeat, otherwise
   * stops and emits a 'melodyEnd' event when the score ends.
   * @returns {void}
   */
  schedule() {
    if (this.paused || this.score === false || this.barCount === 0) {
      return;
    }
    // How far ahead of the play head the next unscheduled bar still is, before
    // topping up. Healthy ~= lookahead minus one tick interval; approaching 0
    // (or negative) means the feeder fell behind and notes risk being scheduled
    // in the past (glitch). The first call after start is skipped - it would
    // only measure the fixed 0.1 s pre-roll and pin the minimum forever.
    this.diagMarginSec = this.nextBarTime - this.ctx.currentTime;
    if (this.diagSkipFirst) {
      this.diagSkipFirst = false;
    } else {
      if (this.diagMarginSec < this.diagMinMarginSec) {
        this.diagMinMarginSec = this.diagMarginSec;
      }
      const bucket = this.diagBucket();
      if (this.diagMarginSec < this.diagMarginBuckets[bucket]) {
        this.diagMarginBuckets[bucket] = this.diagMarginSec;
      }
    }
    while (this.nextBarTime < this.ctx.currentTime + this.lookahead) {
      if (this.nextBar >= this.barCount) {
        if (this.repeat) {
          this.nextBar = 0;
          // Re-apply the score's automation, rebased onto this new loop's start
          // time, so filter sweeps etc. play again on every repeat.
          this.scheduleAutomation(this.nextBarTime);
        } else {
          this.dispatchPendingNotes(Infinity);   // flush the tail of the last bar
          this.stopScheduler();
          this.app.model.sendEvent(1, {id: 'melodyEnd', bus: this.bus});
          return;
        }
      }
      this.enqueueBar(this.nextBar, this.nextBarTime);
      this.nextBar++;
      this.nextBarTime += this.secondsPerBar;
    }
    this.dispatchPendingNotes(this.ctx.currentTime + this.lookahead);
  } // schedule

  /**
   * Converts every note of the given bar into an absolute-time entry on the
   * pending queue (sorted by start time), WITHOUT creating any audio nodes yet.
   * Notes are then materialized gradually by dispatchPendingNotes() as their
   * start time enters the look-ahead window - creating a whole bar's nodes in
   * one burst stalls the audio thread on dense scores (audible click on every
   * bar line). A note's optional `vol` (0..1, e.g. a MIDI velocity) scales that
   * one note's loudness.
   * @param {number} bar - Index of the bar to enqueue.
   * @param {number} barTime - Start time of the bar on the AudioContext clock.
   * @returns {void}
   */
  enqueueBar(bar, barTime) {
    const defaultDuration = ('defaultDuration' in this.score) ? this.score.defaultDuration : 4;
    const entries = [];
    this.score.tracks.forEach((track) => {
      const instrument = this.instruments[track.instrument];
      if (instrument == null) {
        return;
      }
      const notes = track.pattern[bar];
      if (notes == null) {
        return;
      }
      notes.forEach((note) => {
        entries.push({
          time: barTime + (note.tick || 0) * this.secondsPerTick,
          instrument: instrument,
          pitch: note.pitch,
          duration: (('dur' in note) ? note.dur : defaultDuration) * this.secondsPerTick,
          vol: ('vol' in note) ? note.vol : 1
        });
      });
    });
    entries.sort((a, b) => a.time - b.time);
    this.pendingNotes.push(...entries);
  } // enqueueBar

  /**
   * Materializes queued notes whose start time lies before the horizon,
   * spreading node creation across scheduler ticks instead of bar-sized bursts.
   * @param {number} horizon - Absolute AudioContext time up to which notes are created.
   * @returns {void}
   */
  dispatchPendingNotes(horizon) {
    while (this.pendingNotes.length > 0 && this.pendingNotes[0].time < horizon) {
      const entry = this.pendingNotes.shift();
      entry.instrument.play(entry.time, entry.pitch, entry.duration, entry.vol);
    }
  } // dispatchPendingNotes

  /**
   * Stops playback: halts the scheduler and quickly fades the master gain to
   * silence (~30 ms, click-free) so already-scheduled and still-ringing notes
   * are cut immediately rather than being left to ring out. Since every voice
   * routes through the master gain, this silences the whole bus at once; the
   * lingering audio nodes are inaudible and get replaced/freed on the next play.
   * @returns {void}
   */
  stopBus() {
    this.stopScheduler();
    this.pendingNotes = [];
    this.score = false;
    if (this.masterGain != null) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0, now + 0.03);
      // also cut the echo/reverb tails so stop is immediate rather than ringing out
      if (this.echoNodes != null) {
        this.echoNodes.wet.gain.cancelScheduledValues(now);
        this.echoNodes.wet.gain.setValueAtTime(this.echoNodes.wet.gain.value, now);
        this.echoNodes.wet.gain.linearRampToValueAtTime(0.0, now + 0.03);
      }
      if (this.reverbNodes != null) {
        this.reverbNodes.wet.gain.cancelScheduledValues(now);
        this.reverbNodes.wet.gain.setValueAtTime(this.reverbNodes.wet.gain.value, now);
        this.reverbNodes.wet.gain.linearRampToValueAtTime(0.0, now + 0.03);
      }
      if (this.flangerNodes != null) {
        this.flangerNodes.wet.gain.cancelScheduledValues(now);
        this.flangerNodes.wet.gain.setValueAtTime(this.flangerNodes.wet.gain.value, now);
        this.flangerNodes.wet.gain.linearRampToValueAtTime(0.0, now + 0.03);
      }
    }
  } // stopBus

  /**
   * Pauses playback by halting the scheduler; notes in flight ring out.
   * @returns {void}
   */
  pauseBus() {
    this.paused = true;
    this.stopScheduler();
  } // pauseBus

  /**
   * Resumes playback from the current bar pointer, rebasing the next bar onto
   * the current clock.
   * @returns {void}
   */
  continueBus() {
    if (this.paused && this.score !== false) {
      this.paused = false;
      this.nextBarTime = this.ctx.currentTime + 0.05;
      this.pendingNotes = [];   // queued entries carry pre-pause absolute times
      this.startScheduler();
    }
  } // continueBus

  /**
   * Mutes or unmutes the bus by zeroing or restoring the master gain.
   * @param {boolean} muted - True to mute, false to unmute.
   * @returns {void}
   */
  muteBus(muted) {
    this.muted = muted;
    if (this.masterGain != null) {
      this.masterGain.gain.value = muted ? 0.0 : this.volume;
    }
  } // muteBus

  /**
   * Closes the bus: stops the scheduler, drops instruments, disconnects the
   * master gain and releases the context via the base handler.
   * @returns {boolean} True when the bus was closed, false if the handler was busy.
   */
  closeBus() {
    if (this.waitForBusy('closeAudioBus')) {
      return false;
    }
    this.stopScheduler();
    if (this.worker != null) {
      this.worker.terminate();
      this.worker = null;
    }
    this.clearInstruments();
    this.teardownEcho();
    this.teardownReverb();
    this.teardownFlanger();
    if (this.masterGain != null) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    this.score = false;
    return super.closeBus();
  } // closeBus

} // AudioOscillatorHandler

export default AudioOscillatorHandler;
