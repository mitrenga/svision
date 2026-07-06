/**/
const { MusicNotes } = await import('../musicNotes.js?ver='+window.srcVersion);
/*/
import MusicNotes from '../musicNotes.js';
/**/
// begin code

/**
 * Base class for a synthesis voice ("instrument") used by the
 * AudioOscillatorHandler. It is data-driven: a plain descriptor object
 * configures a persistent output chain (optional biquad filter, optional
 * stereo panner) and the default ADSR volume envelope, so most instruments need
 * no code at all - just a different descriptor. Concrete instruments subclass
 * this and implement play(); the reusable building blocks (pitch resolution,
 * envelope, output chain) live here so subclasses can compose them.
 *
 * Signal flow of the persistent chain: per-note voice -> [filter] -> [pan] ->
 * output (the handler's master gain). Per-note nodes (oscillators, envelope
 * gain) are created fresh in play() and connected to `input`.
 *
 * Descriptor shape (all fields optional):
 *   {
 *     class: 'Instrument',                        // handler picks the subclass
 *     osc: [ {type:'sawtooth', detune:0}, ... ],  // oscillator layers
 *     filter: {type:'lowpass', freq:1500, Q:1},   // persistent biquad filter
 *     pan: 0.4,                                    // -1 (L) .. 1 (R)
 *     env: {attack, decay, sustain, release},      // ADSR (seconds; sustain 0..1)
 *     gain: 0.25,                                   // peak level of the envelope
 *     echoSend: true,                               // route this voice to the bus echo (if any)
 *     reverbSend: true                              // route this voice to the bus reverb (if any)
 *   }
 */
export class AbstractInstrument {

  /**
   * Builds the instrument's persistent output chain from its descriptor.
   * @param {AudioContext} ctx - The shared AudioContext.
   * @param {AudioNode} output - The node this instrument feeds into (the handler's master gain).
   * @param {Object} descriptor - The instrument descriptor (see class docs).
   */
  constructor(ctx, output, descriptor) {
    this.ctx = ctx;
    this.output = output;
    this.descriptor = descriptor;
    this.echoSend = descriptor.echoSend === true;
    this.reverbSend = descriptor.reverbSend === true;
    this.flangerSend = descriptor.flangerSend === true;
    this.gainLevel = ('gain' in descriptor) ? descriptor.gain : 0.2;
    this.env = descriptor.env || {attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1};
    this.filter = null;
    this.pan = null;
    this.instrumentGain = null;

    // Assemble the chain from the output backwards so `input` ends up being the
    // first node a per-note voice should connect to. A per-instrument gain node
    // heads the chain so disconnect() can sever every voice at once - even for
    // instruments with no filter/pan.
    let tail = output;
    if ('pan' in descriptor && typeof ctx.createStereoPanner === 'function') {
      this.pan = ctx.createStereoPanner();
      this.pan.pan.value = descriptor.pan;
      this.pan.connect(tail);
      tail = this.pan;
    }
    if ('filter' in descriptor) {
      this.filter = ctx.createBiquadFilter();
      this.filter.type = descriptor.filter.type || 'lowpass';
      this.filter.frequency.value = ('freq' in descriptor.filter) ? descriptor.filter.freq : 1000;
      if ('Q' in descriptor.filter) {
        this.filter.Q.value = descriptor.filter.Q;
      }
      this.filter.connect(tail);
      tail = this.filter;
    }
    this.instrumentGain = ctx.createGain();
    this.instrumentGain.connect(tail);
    this.input = this.instrumentGain;
  } // constructor

  /**
   * Resolves a pitch to a frequency in hertz. Numbers pass through unchanged;
   * strings are looked up in MusicNotes (e.g. 'C4'). Unknown/missing pitches
   * fall back to 440 Hz so a bad note never produces NaN.
   * @param {number|string} pitch - Frequency in hertz or a note name.
   * @returns {number} The frequency in hertz.
   */
  resolvePitch(pitch) {
    if (typeof pitch === 'number') {
      return pitch;
    }
    if (typeof pitch === 'string' && pitch in MusicNotes) {
      return MusicNotes[pitch];
    }
    return 440;
  } // resolvePitch

  /**
   * Creates a fresh per-note gain node with a volume envelope scheduled on it,
   * connected to the instrument's input. Two envelope shapes are supported by
   * the descriptor's `env.sustain`:
   *   - sustain <= 0: percussive AD - attack to the peak, then a single
   *     exponential decay straight to silence over `decay` seconds. Without
   *     `release` the note rings out its full decay tail regardless of the
   *     scored duration (drums, SFX). With `release` set it is damped: at the
   *     end of the scored duration the ringing tail is cut to silence over
   *     `release` seconds - like a piano string stopped by its damper when the
   *     key is released.
   *   - sustain > 0: ADSR - decay to the sustain level, hold it until the note's
   *     release point (scored `duration`), then release to silence (pads, leads).
   * @param {number} time - Start time (AudioContext clock) of the note.
   * @param {number} duration - How long the note is held before the release phase, in seconds (ADSR only).
   * @param {number} [vol] - Per-note volume multiplier 0..1 (e.g. MIDI velocity); defaults to 1.
   * @param {number} [decayScale] - Multiplier applied to the decay time (key tracking: low notes ring longer); defaults to 1.
   * @returns {{gain: GainNode, endTime: number}} The envelope gain node and the time the note fully ends.
   */
  createEnvelope(time, duration, vol, decayScale) {
    const velocity = (vol == null) ? 1 : vol;
    const peak = Math.max(0.0001, this.gainLevel * velocity);
    const attack = ('attack' in this.env) ? this.env.attack : 0.01;
    const decay = (('decay' in this.env) ? this.env.decay : 0.1) * ((decayScale == null) ? 1 : decayScale);
    const sustain = ('sustain' in this.env) ? this.env.sustain : 1.0;
    const release = ('release' in this.env) ? this.env.release : 0.1;

    const gain = this.ctx.createGain();
    gain.connect(this.input);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + attack);

    if (sustain <= 0) {
      const naturalEnd = time + attack + decay;
      // damped percussive: an explicit release cuts the ringing tail at the end
      // of the scored duration (piano damper); without it the tail rings out
      const dampStart = time + Math.max(duration, attack + 0.001);
      if (('release' in this.env) && release > 0 && dampStart + release < naturalEnd) {
        const progress = (dampStart - (time + attack)) / decay;
        const valueAtDamp = Math.max(0.0001, peak * Math.pow(0.0001 / peak, progress));
        gain.gain.exponentialRampToValueAtTime(valueAtDamp, dampStart);
        gain.gain.exponentialRampToValueAtTime(0.0001, dampStart + release);
        return {gain: gain, endTime: dampStart + release};
      }
      gain.gain.exponentialRampToValueAtTime(0.0001, naturalEnd);
      return {gain: gain, endTime: naturalEnd};
    }

    const sustainLevel = Math.max(0.0001, peak * sustain);
    const releaseStart = Math.max(time + attack + decay, time + duration);
    gain.gain.exponentialRampToValueAtTime(sustainLevel, time + attack + decay);
    gain.gain.setValueAtTime(sustainLevel, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + release);

    return {gain: gain, endTime: releaseStart + release};
  } // createEnvelope

  /**
   * Creates a fresh per-note biquad filter whose cutoff sweeps over time from
   * the descriptor's `filterEnv` ({type, from, to, decay, Q}), or returns null
   * when the descriptor has no `filterEnv`. Used to fade a voice's brightness as
   * it decays (a piano note darkening, an explosion tail closing down). Shared by
   * Instrument and NoiseInstrument.
   * @param {number} time - Start time of the note on the AudioContext clock.
   * @returns {BiquadFilterNode|null} The configured filter, or null.
   */
  createVoiceFilter(time) {
    if (!('filterEnv' in this.descriptor)) {
      return null;
    }
    const filterEnv = this.descriptor.filterEnv;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterEnv.type || 'lowpass';
    if ('Q' in filterEnv) {
      filter.Q.value = filterEnv.Q;
    }
    const from = ('from' in filterEnv) ? filterEnv.from : 6000;
    const to = Math.max(1, ('to' in filterEnv) ? filterEnv.to : 500);
    const decay = ('decay' in filterEnv) ? filterEnv.decay : 1.0;
    filter.frequency.setValueAtTime(from, time);
    filter.frequency.exponentialRampToValueAtTime(to, time + decay);
    return filter;
  } // createVoiceFilter

  /**
   * Plays a single note. No-op in the base class; concrete instruments override it.
   * @param {number} time - Start time on the AudioContext clock.
   * @param {number|string} pitch - Frequency in hertz or a note name.
   * @param {number} duration - Held duration in seconds before release.
   * @param {number} [vol] - Per-note volume multiplier 0..1; defaults to 1.
   * @returns {void}
   */
  play(time, pitch, duration, vol) {
  } // play

  /**
   * Resolves an automation parameter path to the AudioParam it controls on the
   * persistent chain, so the handler can schedule score automation against it.
   * Supported paths: 'filter.freq', 'filter.Q', 'pan'.
   * @param {string} path - The parameter path.
   * @returns {AudioParam|null} The AudioParam, or null when not available.
   */
  automatableParam(path) {
    switch (path) {
      case 'filter.freq':
        return this.filter ? this.filter.frequency : null;
      case 'filter.Q':
        return this.filter ? this.filter.Q : null;
      case 'pan':
        return this.pan ? this.pan.pan : null;
    }
    return null;
  } // automatableParam

  /**
   * Cancels any scheduled automation on the persistent chain's parameters from
   * the current time onward. Called when playback stops so ramps do not linger.
   * @returns {void}
   */
  cancel() {
    const now = this.ctx.currentTime;
    if (this.filter) {
      this.filter.frequency.cancelScheduledValues(now);
      this.filter.Q.cancelScheduledValues(now);
    }
    if (this.pan) {
      this.pan.pan.cancelScheduledValues(now);
    }
  } // cancel

  /**
   * Disconnects the persistent chain from the output. Called when the
   * instrument is discarded (new score or bus close).
   * @returns {void}
   */
  disconnect() {
    if (this.instrumentGain) {
      this.instrumentGain.disconnect();
    }
    if (this.filter) {
      this.filter.disconnect();
    }
    if (this.pan) {
      this.pan.disconnect();
    }
  } // disconnect

} // AbstractInstrument

export default AbstractInstrument;
