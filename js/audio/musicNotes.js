/**/

/*/

/**/
// begin code

/**
 * Lookup table of musical note names to their frequency in hertz, covering
 * octaves 0-8 in twelve-tone equal temperament (A4 = 440 Hz). Every semitone is
 * available under both its flat and sharp spelling (e.g. `Db4` and `C#4` map to
 * the same frequency), so scores can be written in whichever notation reads
 * best. Keys are `<name><octave>`, for example `C4`, `A4`, `Gb2`.
 */
export const MusicNotes = {};

// Enharmonic name(s) for each of the twelve semitones, starting at C.
const SEMITONE_NAMES = [
  ['C'], ['Db', 'C#'], ['D'], ['Eb', 'D#'], ['E'], ['F'],
  ['Gb', 'F#'], ['G'], ['Ab', 'G#'], ['A'], ['Bb', 'A#'], ['B']
];

for (let octave = 0; octave <= 8; octave++) {
  for (let semitone = 0; semitone < 12; semitone++) {
    // MIDI note number with C0 = 12, so A4 (octave 4, semitone 9) = 69.
    const midi = 12 + octave * 12 + semitone;
    const frequency = Math.round(440 * Math.pow(2, (midi - 69) / 12) * 1000) / 1000;
    for (const name of SEMITONE_NAMES[semitone]) {
      MusicNotes[name + octave] = frequency;
    }
  }
}

export default MusicNotes;
