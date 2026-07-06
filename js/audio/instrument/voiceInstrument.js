/**/
const { AbstractInstrument } = await import('./abstractInstrument.js?ver='+window.srcVersion);
/*/
import AbstractInstrument from './abstractInstrument.js';
/**/
// begin code

/**
 * A simple formant ("vocal") instrument: a harmonically rich oscillator
 * (sawtooth by default) fed through a bank of parallel band-pass filters tuned
 * to vowel formant frequencies, summed into the shared volume envelope. This
 * approximates a sung vowel with native Web Audio nodes - a coarser version of
 * the per-sample formant synthesis some software synths use. The vowel is fixed
 * per instrument via the descriptor's `formants`.
 *
 * Descriptor fields (besides the AbstractInstrument common ones):
 *   oscType: 'sawtooth'                                  // source waveform
 *   formants: { f:[Hz,...], a:[dB,...] }                 // formant peaks and their gains
 */
export class VoiceInstrument extends AbstractInstrument {

  /**
   * Plays a sung note: one oscillator at the note frequency through a parallel
   * band-pass formant bank, shaped by the volume envelope.
   * @param {number} time - Start time on the AudioContext clock.
   * @param {number|string} pitch - Frequency in hertz or a note name.
   * @param {number} duration - Held duration in seconds before the release phase.
   * @param {number} [vol] - Per-note volume multiplier 0..1.
   * @returns {void}
   */
  play(time, pitch, duration, vol) {
    const frequency = this.resolvePitch(pitch);
    const envelope = this.createEnvelope(time, duration, vol);
    const oscType = this.descriptor.oscType || 'sawtooth';
    const formants = this.descriptor.formants || {f: [650, 1080, 2650, 2900, 3250], a: [0, -6, -7, -8, -22]};

    const oscillator = this.ctx.createOscillator();
    oscillator.type = oscType;
    oscillator.frequency.value = frequency;

    const cleanup = [envelope.gain];
    for (let i = 0; i < formants.f.length; i++) {
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = formants.f[i];
      bandpass.Q.value = Math.max(3, Math.min(20, formants.f[i] / 120));
      const formantGain = this.ctx.createGain();
      formantGain.gain.value = Math.pow(10, formants.a[i] / 20);
      oscillator.connect(bandpass);
      bandpass.connect(formantGain);
      formantGain.connect(envelope.gain);
      cleanup.push(bandpass, formantGain);
    }

    // actively prune the finished note's subgraph (see OscillatorInstrument)
    oscillator.onended = () => {
      cleanup.forEach((node) => node.disconnect());
    };
    oscillator.start(time);
    oscillator.stop(envelope.endTime);
  } // play

} // VoiceInstrument

export default VoiceInstrument;
