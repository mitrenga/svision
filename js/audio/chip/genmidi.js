// begin code

/**
 * The **GENMIDI** instrument bank: what the AdLib driver of the id games
 * plays a MIDI programme with.
 *
 * The `GENMIDI` lump of DOOM (and of Heretic, Hexen and Strife) holds one
 * OPL2 voice programme per General MIDI instrument - **128 melodic
 * instruments and 47 percussion sounds**, 175 records of 36 bytes, and after
 * them the 175 names of 32 bytes the editor gave them. It is the format of
 * the DMX sound library, not of any one game (`ROADMAP.md` 3.7), and it is
 * only data: which registers of the chip a note of a given instrument sets
 * ({@link AdlibMUS} does the setting).
 *
 * ## One record
 *
 * ```
 * u16  flags        bit 0: fixed pitch (a percussion at one note),
 *                   bit 2: two voices (the second detuned, an OPL3 luxury
 *                   a nine voice chip spends a voice on)
 * u8   fineTuning   detune of the second voice, 128 = none
 * u8   fixedNote    the note a fixed pitch instrument plays
 * 2 ×  voice (16 bytes):
 *        modulator: tremolo/vibrato/sustain/KSR/multiple (reg 0x20),
 *                   attack/decay (0x60), sustain/release (0x80),
 *                   waveform (0xE0), key scale level (top of 0x40),
 *                   output level (bottom of 0x40)
 *        feedback   feedback and connection (reg 0xC0)
 *        carrier    the same six bytes
 *        unused
 *        i16        base note offset, semitones added to every note
 * ```
 *
 * Read from the description of the format on doomwiki.org and
 * moddingwiki.shikadi.net (`doom/sources/reference/README.md`) and checked
 * against the lump: `#OPL_II#`, 175 records, 11 908 bytes in DOOM's.
 *
 * Deliberately free of DOM: a tool under Node reads the bank with the same
 * code the player uses (R-001).
 *
 * @example
 * var bank = new GenMidi(bytes);
 * bank.instruments[0].voices[0].carrier.attack;   // 0xF0 for the piano
 * bank.percussion(35).name;                        // "Acoustic Bass Drum"
 */
export class GenMidi {

  /** The eight bytes every bank starts with. */
  static get HEADER() { return '#OPL_II#'; }
  /** General MIDI: 128 melodic programmes. */
  static get INSTRUMENTS() { return 128; }
  /** Percussion keys 35..81, 47 of them. */
  static get PERCUSSION() { return 47; }
  static get FIRST_PERCUSSION_KEY() { return 35; }
  static get RECORD_SIZE() { return 36; }
  static get NAME_SIZE() { return 32; }
  /** Flags of a record. */
  static get FLAG_FIXED() { return 0x0001; }
  static get FLAG_2VOICE() { return 0x0004; }

  /**
   * @param {Uint8Array} bytes - The whole lump.
   */
  constructor(bytes) {
    this.id = 'GenMidi';
    var count = GenMidi.INSTRUMENTS+GenMidi.PERCUSSION;
    var header = '';
    for (var h = 0; h < GenMidi.HEADER.length && h < bytes.length; h++) header += String.fromCharCode(bytes[h]);
    /** true when the lump starts as it should; the driver of the original does not check ★ */
    this.valid = header === GenMidi.HEADER && bytes.length >= GenMidi.HEADER.length+count*(GenMidi.RECORD_SIZE+GenMidi.NAME_SIZE);
    if (bytes.length < GenMidi.HEADER.length+count*GenMidi.RECORD_SIZE) {
      throw new Error('GenMidi: '+bytes.length+' bytes is too short for 175 instruments');
    }
    /** the 175 records in lump order: 0..127 melodic, 128..174 percussion */
    this.instruments = [];
    var at = GenMidi.HEADER.length;
    for (var i = 0; i < count; i++) {
      this.instruments.push(GenMidi.record(bytes, at, i));
      at += GenMidi.RECORD_SIZE;
    }
    for (var n = 0; n < count; n++) {
      var name = '';
      for (var c = 0; c < GenMidi.NAME_SIZE && at+c < bytes.length; c++) {
        var code = bytes[at+c];
        if (code === 0) break;
        name += String.fromCharCode(code);
      }
      this.instruments[n].name = name;
      at += GenMidi.NAME_SIZE;
    }
  } // constructor

  /**
   * One operator's six bytes.
   * @param {Uint8Array} bytes - The lump.
   * @param {number} at - Where the six bytes start.
   * @returns {Object} `{tremolo, attack, sustain, waveform, scale, level}` - the register values as they are written.
   */
  static operator(bytes, at) {
    return {
      tremolo: bytes[at], attack: bytes[at+1], sustain: bytes[at+2],
      waveform: bytes[at+3], scale: bytes[at+4], level: bytes[at+5]
    };
  } // operator

  /**
   * One voice's sixteen bytes.
   * @param {Uint8Array} bytes - The lump.
   * @param {number} at - Where they start.
   * @returns {Object} `{modulator, feedback, carrier, baseNoteOffset}`.
   */
  static voice(bytes, at) {
    var offset = bytes[at+14] | (bytes[at+15] << 8);
    if (offset & 0x8000) offset -= 0x10000;
    return {
      modulator: GenMidi.operator(bytes, at),
      feedback: bytes[at+6],
      carrier: GenMidi.operator(bytes, at+7),
      baseNoteOffset: offset
    };
  } // voice

  /**
   * One instrument record.
   * @param {Uint8Array} bytes - The lump.
   * @param {number} at - Where the 36 bytes start.
   * @param {number} index - Its place in the bank, kept on the record.
   * @returns {Object} `{index, flags, fixed, twoVoices, fineTuning, fixedNote, voices: [voice, voice], name}`.
   */
  static record(bytes, at, index) {
    var flags = bytes[at] | (bytes[at+1] << 8);
    return {
      index: index,
      flags: flags,
      fixed: (flags & GenMidi.FLAG_FIXED) !== 0,
      twoVoices: (flags & GenMidi.FLAG_2VOICE) !== 0,
      fineTuning: bytes[at+2],
      fixedNote: bytes[at+3],
      voices: [GenMidi.voice(bytes, at+4), GenMidi.voice(bytes, at+20)],
      name: ''
    };
  } // record

  /**
   * A melodic instrument by its General MIDI programme number.
   * @param {number} programme - 0..127.
   * @returns {Object} The record.
   */
  instrument(programme) {
    return this.instruments[programme & 0x7F];
  } // instrument

  /**
   * A percussion sound by the MIDI key that plays it.
   * @param {number} key - 35..81.
   * @returns {Object|null} The record, or null outside that range - the
   *          driver plays nothing for such a key.
   */
  percussion(key) {
    if (key < GenMidi.FIRST_PERCUSSION_KEY || key >= GenMidi.FIRST_PERCUSSION_KEY+GenMidi.PERCUSSION) return null;
    return this.instruments[GenMidi.INSTRUMENTS+key-GenMidi.FIRST_PERCUSSION_KEY];
  } // percussion

  /**
   * Whether a record is one of the percussion sounds (the driver of the
   * original tells them apart by where they lie in the bank).
   * @param {Object} record - A record of this bank.
   * @returns {boolean} True for percussion.
   */
  isPercussion(record) {
    return record.index >= GenMidi.INSTRUMENTS;
  } // isPercussion

} // GenMidi

export default GenMidi;
