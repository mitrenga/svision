/**/
const { MusicNotes } = await import('./musicNotes.js?ver='+window.srcVersion);
/*/
import MusicNotes from './musicNotes.js';
/**/
// begin code

/**
 * Static complexity analysis of a score for the AudioOscillatorHandler: without
 * playing anything it estimates how expensive the score is for the audio
 * thread, so songs can be given an empirical "load score" and rejected for
 * production (or downgraded in quality) when they exceed a device budget.
 *
 * The model mirrors what the engine actually builds per note (oscillator
 * layers, layer gains, envelope gain, per-note filter, lfo pair, formant banks,
 * noise sources) and how long each note lives (percussive decay with key
 * tracking and damper release, or ADSR hold + release). Weights are heuristic
 * "node units" (a biquad costs more than a gain); the absolute numbers mean
 * nothing by themselves - they are meant to be calibrated against real devices
 * (e.g. "the old TV copes up to peak X").
 */

/**
 * Resolves a note pitch to hertz like the instruments do.
 * @param {number|string} pitch - Frequency in hertz or a note name.
 * @returns {number} The frequency in hertz.
 */
function pitchToHz(pitch) {
  if (typeof pitch === 'number') {
    return pitch;
  }
  if (typeof pitch === 'string' && pitch in MusicNotes) {
    return MusicNotes[pitch];
  }
  return 440;
} // pitchToHz

/**
 * Estimated sustained node units of one playing note of the instrument.
 * @param {Object} descriptor - The instrument descriptor.
 * @returns {number} Node units while the note is alive.
 */
function unitsPerNote(descriptor) {
  const OSC = 1.0;
  const GAIN = 0.3;
  const BIQUAD = 1.2;
  if (descriptor.class === 'NoiseInstrument') {
    return OSC + GAIN + (('filterEnv' in descriptor) ? BIQUAD : 0);
  }
  if (descriptor.class === 'VoiceInstrument') {
    const formants = (descriptor.formants && descriptor.formants.f) ? descriptor.formants.f.length : 5;
    return OSC + GAIN + formants * (BIQUAD + GAIN);
  }
  const layers = (descriptor.osc && descriptor.osc.length) ? descriptor.osc.length : 1;
  let units = layers * OSC + GAIN;
  if (descriptor.osc) {
    descriptor.osc.forEach((layer) => {
      if ('gain' in layer) {
        units += GAIN;
      }
    });
  }
  if ('filterEnv' in descriptor) {
    units += BIQUAD;
  }
  if ('lfo' in descriptor) {
    units += OSC + GAIN;
  }
  return units;
} // unitsPerNote

/**
 * How long one note keeps its nodes alive, in seconds - mirrors
 * AbstractInstrument.createEnvelope (percussive with optional damper, or ADSR)
 * including OscillatorInstrument's keyTrack decay scaling.
 * @param {Object} descriptor - The instrument descriptor.
 * @param {Object} note - The note ({tick, pitch, dur?, vol?}).
 * @param {number} durationSec - The note's scored duration in seconds.
 * @returns {number} Lifetime in seconds.
 */
function noteLifetime(descriptor, note, durationSec) {
  const env = descriptor.env || {};
  const attack = ('attack' in env) ? env.attack : 0.01;
  let decay = ('decay' in env) ? env.decay : 0.1;
  const sustain = ('sustain' in env) ? env.sustain : 1.0;
  const release = ('release' in env) ? env.release : 0.1;

  if ('keyTrack' in descriptor) {
    const keyTrack = descriptor.keyTrack;
    const refHz = pitchToHz(('ref' in keyTrack) ? keyTrack.ref : 'C4');
    const exponent = ('decay' in keyTrack) ? keyTrack.decay : 0.5;
    decay *= Math.min(4, Math.max(0.25, Math.pow(refHz / pitchToHz(note.pitch), exponent)));
  }

  if (sustain <= 0) {
    const natural = attack + decay;
    if (('release' in env) && release > 0 && durationSec + release < natural) {
      return durationSec + release;
    }
    return natural;
  }
  return Math.max(attack + decay, durationSec) + release;
} // noteLifetime

/**
 * Analyzes a score and returns its estimated audio-thread load.
 * @param {Object} score - The score (as consumed by AudioOscillatorHandler).
 * @returns {{peak: number, average: number, churnPerSec: number, effectUnits: number, cluster: number, notes: number, seconds: number}}
 *   peak/average = worst/mean concurrently-alive note units (excl. effects),
 *   churnPerSec = node units created per second (graph mutation pressure),
 *   effectUnits = fixed cost of effects + persistent instrument chains,
 *   cluster = the largest batch of note units starting at the SAME instant -
 *     synchronized starts/ends click on sensitive browsers (Firefox); keep
 *     chords rolled/staggered to keep this low,
 *   notes = total note count, seconds = score length.
 */
export function scoreLoad(score) {
  const tempo = score.tempo || 120;
  const secondsPerBeat = 60 / tempo;
  const secondsPerBar = secondsPerBeat * (score.beatsPerBar || 4);
  const secondsPerTick = secondsPerBeat / 4;
  const defaultDuration = ('defaultDuration' in score) ? score.defaultDuration : 4;

  let bars = 0;
  score.tracks.forEach((track) => {
    if (track.pattern.length > bars) {
      bars = track.pattern.length;
    }
  });
  const seconds = Math.max(0.001, bars * secondsPerBar - (score.upbeat || 0) * secondsPerTick);

  // collect note lifetimes as +units/-units boundary events
  const boundaries = [];
  let totalUnitSeconds = 0;
  let totalCreatedUnits = 0;
  let notes = 0;
  score.tracks.forEach((track) => {
    const descriptor = score.instruments[track.instrument];
    if (descriptor == null) {
      return;
    }
    const units = unitsPerNote(descriptor);
    track.pattern.forEach((barNotes, bar) => {
      (barNotes || []).forEach((note) => {
        const start = bar * secondsPerBar + (note.tick || 0) * secondsPerTick;
        const durationSec = (('dur' in note) ? note.dur : defaultDuration) * secondsPerTick;
        const life = noteLifetime(descriptor, note, durationSec);
        boundaries.push([start, units], [start + life, -units]);
        totalUnitSeconds += units * life;
        totalCreatedUnits += units;
        notes++;
      });
    });
  });

  boundaries.sort((a, b) => a[0] - b[0]);
  let level = 0;
  let peak = 0;
  boundaries.forEach((event) => {
    level += event[1];
    if (level > peak) {
      peak = level;
    }
  });

  // largest batch of units starting at the same instant (1 ms resolution)
  const starts = {};
  let cluster = 0;
  boundaries.forEach((event) => {
    if (event[1] > 0) {
      const key = Math.round(event[0] * 1000);
      starts[key] = (starts[key] || 0) + event[1];
      if (starts[key] > cluster) {
        cluster = starts[key];
      }
    }
  });

  // fixed effect networks + persistent per-instrument chains
  let effectUnits = 0;
  if (score.reverb) {
    effectUnits += (('seconds' in score.reverb) ? score.reverb.seconds : 1.5) * 25;   // convolver cost grows with impulse length
  }
  if (score.echo) {
    effectUnits += 3;
  }
  if (score.flanger) {
    effectUnits += 3;
  }
  Object.keys(score.instruments).forEach((name) => {
    const descriptor = score.instruments[name];
    effectUnits += 0.3 + (('filter' in descriptor) ? 1.2 : 0) + (('pan' in descriptor) ? 0.5 : 0);
  });

  return {
    peak: Math.round(peak),
    average: Math.round(totalUnitSeconds / seconds),
    churnPerSec: Math.round(totalCreatedUnits / seconds),
    effectUnits: Math.round(effectUnits),
    cluster: Math.round(cluster),
    notes: notes,
    seconds: Math.round(seconds * 10) / 10
  };
} // scoreLoad

export default scoreLoad;
