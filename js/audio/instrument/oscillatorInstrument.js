/**/
const { AbstractInstrument } = await import('./abstractInstrument.js?ver='+window.srcVersion);
/*/
import AbstractInstrument from './abstractInstrument.js';
/**/
// begin code

/**
 * Universal, fully data-driven oscillator instrument. It layers one oscillator per entry
 * in the descriptor's `osc` array, runs them through the shared volume envelope
 * (ADSR or percussive AD) and, optionally, a per-note filter whose cutoff decays
 * over time (`filterEnv`, e.g. a piano's brightness fading with the note), then
 * through the persistent filter/pan chain from AbstractInstrument. It needs no
 * bespoke code - oscillator types, filters and envelopes in the descriptor cover
 * most melodic, bass and percussive voices (and, later, a "chip" flavour). When
 * a descriptor cannot express a voice, subclass AbstractInstrument (or this
 * class) and override play().
 *
 * Beyond the basic waveforms, an osc entry may be `{type: 'custom',
 * harmonics: [h1, h2, ...]}` - the amplitudes of the fundamental and its
 * overtones, turned into a PeriodicWave (an instrument-specific spectrum, e.g.
 * a piano-like tone), plus an optional per-entry `gain` for layer balance.
 * Two more acoustic touches: `keyTrack: {ref, decay}` scales the envelope decay
 * by pitch (low notes ring longer, high notes die faster - like real strings),
 * and `attackNoise: {gain, decay}` adds a tiny noise burst at note start (the
 * hammer/pluck transient). Finally `lfo: {rate, depth, spread}` adds a slow
 * sine vibrato on the note's detune (depth in cents); `spread` randomizes the
 * rate per note so simultaneous voices drift independently of each other - an
 * organic, chorus-like motion that static detuning cannot give. `damp: true`
 * enables restrike damping: replaying a pitch fades the previous same-pitch
 * voice out (a piano string being re-struck) instead of stacking a second
 * identical oscillator, which would phase-beat and read as out of tune.
 * `bitEnv: {ratios, baud, levels}` turns the note into a data signal: for the
 * note's held duration the oscillator frequency hops at the baud rate to a
 * randomly picked entry of `ratios` (multiples of the note's frequency) -
 * FSK-style modem chatter, retro computer/data sound effects (mutually
 * exclusive with `pitchEnv`). Optional `levels` additionally steps the layer
 * gain to a random entry each bit; the discontinuous amplitude jumps add the
 * gritty baud-rate buzz of phase/amplitude keying that smooth frequency hops
 * alone cannot give.
 */
export class OscillatorInstrument extends AbstractInstrument {

  /**
   * Creates the instrument: prepares PeriodicWaves for `custom` osc entries and
   * the short noise buffer when the descriptor asks for an attack transient.
   * @param {AudioContext} ctx - The shared AudioContext.
   * @param {AudioNode} output - The node this instrument feeds into.
   * @param {Object} descriptor - The instrument descriptor.
   */
  constructor(ctx, output, descriptor) {
    super(ctx, output, descriptor);

    this.waves = {};
    const oscillators = descriptor.osc || [];
    for (let i = 0; i < oscillators.length; i++) {
      if (oscillators[i].type === 'custom' && oscillators[i].harmonics) {
        const harmonics = oscillators[i].harmonics;
        const real = new Float32Array(harmonics.length + 1);
        const imag = new Float32Array(harmonics.length + 1);
        for (let h = 0; h < harmonics.length; h++) {
          imag[h + 1] = harmonics[h];
        }
        this.waves[i] = ctx.createPeriodicWave(real, imag);
      }
    }

    this.activeVoices = {};   // per-pitch last envelope, for restrike damping
    this.attackNoiseBuffer = null;
    if ('attackNoise' in descriptor) {
      const length = Math.floor(ctx.sampleRate * 0.05);
      this.attackNoiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.attackNoiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
  } // constructor

  /**
   * Plays a single note: builds the volume envelope (decay scaled by keyTrack
   * when configured), optionally a per-note decaying filter, an optional attack
   * noise transient, and one oscillator per `osc` descriptor entry (all tuned to
   * the note's frequency), scheduled to start at `time` and stop when the
   * envelope ends.
   *
   * `filterEnv` shape (all optional bar the times): {type:'lowpass', from, to,
   * decay, Q} - the cutoff sweeps exponentially from `from` to `to` over `decay`
   * seconds; `fromRatio`/`toRatio` make the sweep key-tracked (multiples of
   * the note's frequency), combinable with `from`/`to` as an absolute floor -
   * see createVoiceFilter.
   * `pitchEnv` shape: {from, to, decay} in absolute Hz (drum thumps,
   * SFX sweeps), or {fromRatio, toRatio, decay} as ratios of the note's own
   * frequency (melodic bends, e.g. fromRatio 2 = slide in from an octave above).
   * `keyTrack` shape: {ref: 'C4', decay: 0.7} - the envelope decay is multiplied
   * by (refFrequency/noteFrequency)^decay, clamped to 0.25..4.
   * `attackNoise` shape: {gain: 0.35, decay: 0.015} - noise burst level
   * (relative to the instrument gain) and its decay in seconds.
   * `bitEnv` shape: {ratios: [1, 1.2], baud: 300, levels: [0.4, 1]} - random
   * frequency hops between frequency*ratio carriers every 1/baud seconds while
   * the note holds; optional `levels` steps the gain per bit as well.
   * @param {number} time - Start time on the AudioContext clock.
   * @param {number|string} pitch - Frequency in hertz or a note name (e.g. 'C4').
   * @param {number} duration - Held duration in seconds before the release phase (ADSR only).
   * @param {number} [vol] - Per-note volume multiplier 0..1 (e.g. MIDI velocity).
   * @returns {void}
   */
  play(time, pitch, duration, vol) {
    const frequency = this.resolvePitch(pitch);

    let decayScale = 1;
    if ('keyTrack' in this.descriptor) {
      const keyTrack = this.descriptor.keyTrack;
      const refFrequency = this.resolvePitch(('ref' in keyTrack) ? keyTrack.ref : 'C4');
      const exponent = ('decay' in keyTrack) ? keyTrack.decay : 0.5;
      decayScale = Math.min(4, Math.max(0.25, Math.pow(refFrequency / frequency, exponent)));
    }

    const envelope = this.createEnvelope(time, duration, vol, decayScale);

    // restrike damping (descriptor `damp: true`): striking the same pitch again
    // re-excites the same string, it does not add a second one - so quickly
    // fade the previous same-pitch voice. Without this, two oscillators at the
    // identical frequency interfere (phase beating) and repeated notes sound
    // detuned/chorused; setTargetAtTime keeps the fade continuous from
    // whatever level the old envelope has at that moment.
    if (this.descriptor.damp) {
      const voiceKey = Math.round(frequency * 8);
      const previous = this.activeVoices[voiceKey];
      if (previous != null && previous.endTime > time) {
        previous.gain.gain.setTargetAtTime(0.0001, time, 0.012);
      }
      this.activeVoices[voiceKey] = {gain: envelope.gain, endTime: envelope.endTime};
    }

    let voiceInput = envelope.gain;
    const voiceFilter = this.createVoiceFilter(time, frequency);
    if (voiceFilter !== null) {
      voiceFilter.connect(envelope.gain);
      voiceInput = voiceFilter;
    }

    if (this.attackNoiseBuffer !== null) {
      const attackNoise = this.descriptor.attackNoise;
      const noiseLevel = Math.max(0.0001, this.gainLevel * (('gain' in attackNoise) ? attackNoise.gain : 0.3) * ((vol == null) ? 1 : vol));
      const noiseDecay = ('decay' in attackNoise) ? attackNoise.decay : 0.02;
      const noiseGain = this.ctx.createGain();
      // start from 0, not the node's default gain of 1: float rounding can make
      // the buffer source emit its first sample a frame before the setValueAtTime
      // event lands, and that sample would pass at full level (a loud click)
      noiseGain.gain.value = 0.0;
      noiseGain.gain.setValueAtTime(noiseLevel, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + noiseDecay);
      noiseGain.connect(this.input);
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.attackNoiseBuffer;
      noise.connect(noiseGain);
      noise.onended = () => noiseGain.disconnect();
      noise.start(time);
      noise.stop(time + noiseDecay);
    }

    // per-note vibrato: a slow sine wired into the voice oscillators' detune;
    // its rate is randomized by `spread` so parallel voices drift independently
    let lfoGain = null;
    if ('lfo' in this.descriptor) {
      const lfo = this.descriptor.lfo;
      const spread = ('spread' in lfo) ? lfo.spread : 0;
      const lfoOsc = this.ctx.createOscillator();
      lfoOsc.frequency.value = Math.max(0.01, (('rate' in lfo) ? lfo.rate : 0.2) * (1 + (Math.random() - 0.5) * spread));
      lfoGain = this.ctx.createGain();
      lfoGain.gain.value = ('depth' in lfo) ? lfo.depth : 5;   // cents
      lfoOsc.connect(lfoGain);
      lfoOsc.start(time);
      lfoOsc.stop(envelope.endTime);
    }

    // per-note nodes collected for the end-of-note cleanup below
    const cleanup = [envelope.gain];
    if (voiceFilter !== null) {
      cleanup.push(voiceFilter);
    }
    if (lfoGain !== null) {
      cleanup.push(lfoGain);
    }

    const pitchEnv = ('pitchEnv' in this.descriptor) ? this.descriptor.pitchEnv : false;
    const oscillators = this.descriptor.osc || [{type: 'sine'}];
    let firstOscillator = null;
    for (let i = 0; i < oscillators.length; i++) {
      const oscDescriptor = oscillators[i];
      const oscillator = this.ctx.createOscillator();
      if (firstOscillator === null) {
        firstOscillator = oscillator;
      }
      if (i in this.waves) {
        oscillator.setPeriodicWave(this.waves[i]);
      } else {
        oscillator.type = oscDescriptor.type || 'sine';
      }
      if (pitchEnv !== false) {
        // absolute Hz (from/to) for drums and SFX, or ratios of the note's own
        // frequency (fromRatio/toRatio) for melodic bends that work on any pitch
        const from = ('from' in pitchEnv) ? pitchEnv.from : frequency * (('fromRatio' in pitchEnv) ? pitchEnv.fromRatio : 1);
        const to = Math.max(0.0001, ('to' in pitchEnv) ? pitchEnv.to : frequency * (('toRatio' in pitchEnv) ? pitchEnv.toRatio : 1));
        const decay = ('decay' in pitchEnv) ? pitchEnv.decay : 0.3;
        oscillator.frequency.setValueAtTime(from, time);
        oscillator.frequency.exponentialRampToValueAtTime(to, time + decay);
      }
      let bitGain = null;
      if (pitchEnv === false && 'bitEnv' in this.descriptor) {
        // data-signal mode: hop between the carrier ratios at the baud rate,
        // picking a random "bit" each step for the note's held duration; the
        // optional level steps jump the gain DISCONTINUOUSLY (unlike frequency,
        // which Web Audio changes phase-continuously) - that grit at the baud
        // rate is what makes it read as binary data instead of smooth noise
        const bitEnv = this.descriptor.bitEnv;
        const ratios = bitEnv.ratios || [1];
        const levels = bitEnv.levels || null;
        const step = 1 / (('baud' in bitEnv) ? bitEnv.baud : 300);
        if (levels !== null) {
          bitGain = this.ctx.createGain();
          cleanup.push(bitGain);
        }
        for (let t = 0; t < duration; t += step) {
          oscillator.frequency.setValueAtTime(frequency * ratios[Math.floor(Math.random() * ratios.length)], time + t);
          if (bitGain !== null) {
            bitGain.gain.setValueAtTime(levels[Math.floor(Math.random() * levels.length)], time + t);
          }
        }
      } else if (pitchEnv === false) {
        oscillator.frequency.value = frequency;
      }
      if ('detune' in oscDescriptor) {
        oscillator.detune.value = oscDescriptor.detune;
      }
      if (lfoGain !== null) {
        lfoGain.connect(oscillator.detune);
      }
      let oscOutput = oscillator;
      if (bitGain !== null) {
        oscillator.connect(bitGain);
        oscOutput = bitGain;
      }
      if ('gain' in oscDescriptor) {
        const layerGain = this.ctx.createGain();
        layerGain.gain.value = oscDescriptor.gain;
        oscOutput.connect(layerGain);
        layerGain.connect(voiceInput);
        cleanup.push(layerGain);
      } else {
        oscOutput.connect(voiceInput);
      }
      oscillator.start(time);
      oscillator.stop(envelope.endTime);
    }

    // Actively prune the finished note's subgraph. Browsers reclaim stopped
    // fire-and-forget nodes lazily; with dense scores the graph silts up over
    // time (progressive stutter), so disconnect explicitly once the note ends.
    if (firstOscillator !== null) {
      firstOscillator.onended = () => {
        cleanup.forEach((node) => node.disconnect());
      };
    }
  } // play

} // OscillatorInstrument

export default OscillatorInstrument;
