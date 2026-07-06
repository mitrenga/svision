/**/
const { AbstractInstrument } = await import('./abstractInstrument.js?ver='+window.srcVersion);
/*/
import AbstractInstrument from './abstractInstrument.js';
/**/
// begin code

/**
 * Percussion/effect instrument driven by noise instead of oscillators. A
 * looping noise buffer is shaped by the shared volume envelope, an optional
 * per-note `filterEnv` and the persistent filter/pan chain from
 * AbstractInstrument, so different descriptors yield hi-hats (short,
 * high-passed), snares, reverse-swell noise (slow attack) or explosion tails
 * (long, low-passed with decaying brightness). The descriptor's `noise` field
 * chooses the source texture: 'white' (default, smooth broadband hiss) or
 * 'crackle' (sparse random impulses - a sizzling/spitting sound for fire and
 * explosions, with density set by `noiseDensity`). `bitEnv: {baud, levels}`
 * chops the noise into a data stream: while the note holds, the level steps
 * every 1/baud seconds to a random `levels` entry (carrier-less binary
 * chatter; the frequency `ratios` of the oscillator variant have no meaning
 * for noise and are ignored). This is the "approach A" subclass: it reuses
 * the base building blocks but supplies its own sound source.
 */
export class NoiseInstrument extends AbstractInstrument {

  /**
   * Creates the noise instrument and generates its noise buffer, reused (looped)
   * for every note. White noise uses a short 0.5 s buffer; crackle uses a longer
   * 2 s buffer so its sparse impulses do not audibly repeat within a hit.
   * @param {AudioContext} ctx - The shared AudioContext.
   * @param {AudioNode} output - The node this instrument feeds into.
   * @param {Object} descriptor - The instrument descriptor; may include `noise` ('white'|'crackle') and `noiseDensity` (crackle impulse probability per sample, default 0.02).
   */
  constructor(ctx, output, descriptor) {
    super(ctx, output, descriptor);
    const type = ('noise' in descriptor) ? descriptor.noise : 'white';
    const seconds = (type === 'crackle') ? 2.0 : 0.5;
    const length = Math.floor(ctx.sampleRate * seconds);
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    if (type === 'crackle') {
      const density = ('noiseDensity' in descriptor) ? descriptor.noiseDensity : 0.02;
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() < density) ? (Math.random() * 2 - 1) : 0;
      }
    } else {
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
  } // constructor

  /**
   * Plays a noise hit: a looped noise buffer source shaped by the volume
   * envelope, scheduled to start at `time` and stop when the envelope ends. The
   * note's pitch is ignored (noise has no pitch).
   * @param {number} time - Start time on the AudioContext clock.
   * @param {number|string} pitch - Ignored.
   * @param {number} duration - Held duration in seconds before the release phase (ADSR only).
   * @param {number} [vol] - Per-note volume multiplier 0..1.
   * @returns {void}
   */
  play(time, pitch, duration, vol) {
    const envelope = this.createEnvelope(time, duration, vol);

    let target = envelope.gain;
    const voiceFilter = this.createVoiceFilter(time);
    if (voiceFilter !== null) {
      voiceFilter.connect(envelope.gain);
      target = voiceFilter;
    }

    // data-signal mode: chop the noise per bit with discontinuous level steps
    // (same binary grit as OscillatorInstrument's bitEnv, minus the carrier)
    let bitGain = null;
    if ('bitEnv' in this.descriptor) {
      const bitEnv = this.descriptor.bitEnv;
      const levels = bitEnv.levels || [0, 1];
      const step = 1 / (('baud' in bitEnv) ? bitEnv.baud : 300);
      bitGain = this.ctx.createGain();
      for (let t = 0; t < duration; t += step) {
        bitGain.gain.setValueAtTime(levels[Math.floor(Math.random() * levels.length)], time + t);
      }
      bitGain.connect(target);
      target = bitGain;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    noise.connect(target);
    // actively prune the finished note's subgraph (see OscillatorInstrument)
    noise.onended = () => {
      envelope.gain.disconnect();
      if (voiceFilter !== null) {
        voiceFilter.disconnect();
      }
      if (bitGain !== null) {
        bitGain.disconnect();
      }
    };
    noise.start(time);
    noise.stop(envelope.endTime);
  } // play

} // NoiseInstrument

export default NoiseInstrument;
