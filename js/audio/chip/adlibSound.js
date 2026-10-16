const { OPL2 } = await import('./opl2.js?ver='+window.srcVersion);
// begin code

/**
 * The **AdLib sound effect driver** of the id/Apogee games: one instrument,
 * one voice, and one byte of note every 1/140 s.
 *
 * Where {@link AdlibMidi} plays a piece of music with all nine voices, this
 * is the other half of the same era's sound: a gunshot, a door, a dog. The
 * games of id Software and Apogee kept those in a container of their own
 * (`AUDIOT`, written by the MUSE editor) and played them with a driver of
 * about twenty lines:
 *
 *  - **sixteen bytes of instrument** go into voice 0 — five registers for
 *    the modulator, five for the carrier, in the order
 *    `mChar, cChar, mScale, cScale, mAttack, cAttack, mSustain, cSustain,
 *    mWave, cWave, connection` and five bytes nothing reads;
 *  - **the feedback register is written as zero**, not from the instrument.
 *    That is not a simplification here: the original writes a zero and says
 *    in a comment that the instrument's own value is what an older MUSE
 *    wanted. An effect played with the instrument's connection byte sounds
 *    audibly different;
 *  - then **one byte per 1/140 s**: zero keys the voice off, anything else
 *    is the low byte of the frequency, and the block byte
 *    `((octave & 7) << 2) | 0x20` keys it on again. The same three writes
 *    make every sound the game has.
 *
 * A card of the era could make one noise at a time, and the game is written
 * around that — which of the sounds wins is the game's business (it carries
 * a priority in its own data); this class is asked to render one of them.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches the browser, so a `match*` tool under Node renders
 * exactly what the player hears (R-001).
 *
 * @example
 * var driver = new AdlibSound({sampleRate: 22050, gain: 4});
 * driver.play({instrument: sixteenBytes, octave: 3, data: noteBytes});
 * var samples = driver.renderAll();
 */
export class AdlibSound {

  /** One byte of note every 1/140 s, which is the rate the games service at. */
  static get RATE() { return 140; }
  /** How many bytes an instrument is. */
  static get INSTRUMENT_SIZE() { return 16; }
  /** How long the voice is left to die away after the last byte. */
  static get TAIL_SECONDS() { return 0.1; }

  /**
   * The registers an instrument goes into. The offsets are the chip's own
   * (`0x20` characteristics, `0x40` level and scale, `0x60` attack and
   * decay, `0x80` sustain and release, `0xE0` waveform), plus the two the
   * driver writes per voice.
   */
  static get REGISTER() {
    return {WAVEFORM_SELECT: 0x01, TIMER_MODE: 0x08,
            CHARACTERISTIC: 0x20, SCALE: 0x40, ATTACK: 0x60, SUSTAIN: 0x80,
            WAVE: 0xe0, FREQUENCY_LOW: 0xa0, FREQUENCY_HIGH: 0xb0,
            FEEDBACK: 0xc0, PERCUSSION: 0xbd};
  } // REGISTER

  /** Bit 5 of register 1: the waveforms other than the sine are there. */
  static get WAVEFORM_SELECT_ON() { return 0x20; }

  /** An effect plays on voice 0, whose two operators are 0 and 3. */
  static get MODULATOR() { return 0; }
  static get CARRIER() { return 3; }

  /**
   * @param {Object} [options]
   * @param {number} [options.sampleRate] - What to render at; the chip's own
   *        49716 Hz by default.
   * @param {number} [options.gain=1] - A factor on the way out. One voice of
   *        a YM3812 is a small part of full scale and the card had an
   *        amplifier behind it, so a game usually asks for more.
   * @param {number} [options.rate=140] - Bytes of note a second.
   * @param {number} [options.tailSeconds=0.1] - How long to keep rendering
   *        after the last byte.
   * @param {string} [options.connection='zero'] - What goes into the
   *        feedback and connection register: `'zero'` as the released driver
   *        writes it, or `'instrument'` for the byte the instrument carries.
   * @param {OPL2} [options.chip] - A chip of one's own, for a test.
   */
  constructor(options) {
    var settings = options || {};
    this.id = 'AdlibSound';
    this.chip = settings.chip || new OPL2({sampleRate: settings.sampleRate});
    this.sampleRate = this.chip.sampleRate;
    this.gain = settings.gain === undefined ? 1 : settings.gain;
    this.rate = settings.rate || AdlibSound.RATE;
    this.tailSeconds = settings.tailSeconds === undefined ? AdlibSound.TAIL_SECONDS : settings.tailSeconds;
    this.connection = settings.connection || 'zero';

    /** the effect being played, or null */
    this.sound = null;
    /** the block byte its notes are keyed on with */
    this.block = 0;
    /** which byte of it comes next */
    this.step = 0;
    /** how far the chip has been rendered, in samples */
    this.position = 0;
    /** how many samples one byte of note lasts */
    this.samplesPerStep = this.sampleRate/this.rate;
    /** the notes have run out; only the tail is left */
    this.finished = true;
  } // constructor

  /**
   * Writes an instrument into voice 0, in the order the games write it - and
   * the feedback register as zero, which is the one thing about this driver
   * that has to be copied rather than reasoned out.
   * @param {OPL2} chip - The chip to write to.
   * @param {Uint8Array|number[]} instrument - The sixteen bytes.
   * @param {string} [connection] - What goes into the feedback/connection
   *        register: `'instrument'` writes the instrument's own byte (the
   *        older MUSE way), anything else writes zero as the released
   *        source does.
   */
  static setInstrument(chip, instrument, connection) {
    var register = AdlibSound.REGISTER;
    var m = AdlibSound.MODULATOR;
    var c = AdlibSound.CARRIER;
    chip.write(register.CHARACTERISTIC+m, instrument[0]);
    chip.write(register.SCALE+m, instrument[2]);
    chip.write(register.ATTACK+m, instrument[4]);
    chip.write(register.SUSTAIN+m, instrument[6]);
    chip.write(register.WAVE+m, instrument[8]);
    chip.write(register.CHARACTERISTIC+c, instrument[1]);
    chip.write(register.SCALE+c, instrument[3]);
    chip.write(register.ATTACK+c, instrument[5]);
    chip.write(register.SUSTAIN+c, instrument[7]);
    chip.write(register.WAVE+c, instrument[9]);
    // The released source writes a **zero** here and not the instrument's own
    // byte, with a comment that the instrument's value is what an older MUSE
    // wanted; `connection: 'instrument'` is that older way. It is not a
    // detail: in nearly every effect of Wolfenstein the byte asks for the two
    // operators to be **added** rather than one to modulate the other, and
    // the two sound nothing like each other.
    chip.write(register.FEEDBACK, connection === 'instrument' ? instrument[10] : 0);
  } // setInstrument

  /** The instrument of silence the driver clears the voice with first. */
  static get ZERO_INSTRUMENT() { return new Uint8Array(AdlibSound.INSTRUMENT_SIZE); }

  /**
   * Starts an effect: the chip is cleared, the instrument written, and the
   * notes wait for {@link AdlibSound#render}.
   * @param {Object} sound - `{instrument, octave, data}`: the sixteen bytes,
   *        the octave (0-7) and one byte of note per 1/140 s.
   * @returns {AdlibSound} This driver.
   */
  play(sound) {
    this.chip.reset();
    // The games set this once, when they find the card (`alOut(1,0x20)`),
    // and every instrument written afterwards counts on it: **without it the
    // waveform byte does nothing** and an instrument that asks for a half or
    // a rectified sine plays a plain one. Two thirds of Wolfenstein's effects
    // ask for one, so this is the difference between the game's own sounds
    // and something that only has its rhythm.
    this.chip.write(AdlibSound.REGISTER.WAVEFORM_SELECT, AdlibSound.WAVEFORM_SELECT_ON);
    this.chip.write(AdlibSound.REGISTER.TIMER_MODE, 0);
    this.chip.write(AdlibSound.REGISTER.PERCUSSION, 0);
    AdlibSound.setInstrument(this.chip, AdlibSound.ZERO_INSTRUMENT, this.connection);
    AdlibSound.setInstrument(this.chip, sound.instrument, this.connection);

    this.sound = sound;
    this.block = ((sound.octave & 7) << 2) | 0x20;
    this.step = 0;
    this.position = 0;
    this.finished = !sound.data || sound.data.length === 0;
    return this;
  } // play

  /** How long the effect plays, before the tail. */
  get soundSeconds() {
    return this.sound && this.sound.data ? this.sound.data.length/this.rate : 0;
  } // soundSeconds

  /** And how long it is worth rendering altogether. */
  get pieceSeconds() {
    return this.soundSeconds+this.tailSeconds;
  } // pieceSeconds

  /**
   * Renders the next samples, keying the notes on and off as they fall due.
   * Once the notes have run out the voice is keyed off and whatever is left
   * of it goes on sounding, which is what the tail is for.
   * @param {Float32Array} out - Where the samples go.
   * @param {number} [count] - How many; the whole array by default.
   * @param {number} [offset=0] - Where in the array to start.
   * @returns {Float32Array} `out`.
   */
  render(out, count, offset) {
    var at = offset || 0;
    var left = count === undefined ? out.length-at : count;
    var register = AdlibSound.REGISTER;
    while (left > 0) {
      if (!this.finished && this.position >= Math.round(this.step*this.samplesPerStep)) {
        var note = this.sound.data[this.step];
        if (!note) {
          this.chip.write(register.FREQUENCY_HIGH, 0);
        } else {
          this.chip.write(register.FREQUENCY_LOW, note);
          this.chip.write(register.FREQUENCY_HIGH, this.block);
        }
        this.step++;
        if (this.step >= this.sound.data.length) {
          this.finished = true;
          this.chip.write(register.FREQUENCY_HIGH, 0);
        }
      }
      // as far as the next byte of note, or to the end when they ran out
      var next = this.finished ? this.position+left : Math.round(this.step*this.samplesPerStep);
      var chunk = Math.max(1, Math.min(left, next-this.position));
      this.chip.render(out.subarray(at, at+chunk), chunk, this.gain);
      this.position += chunk;
      at += chunk;
      left -= chunk;
    }
    return out;
  } // render

  /**
   * The whole effect as samples, its notes and its tail.
   * @param {number} [seconds] - A length of one's own.
   * @returns {Float32Array} Mono samples, -1..1.
   */
  renderAll(seconds) {
    var length = seconds === undefined ? this.pieceSeconds : seconds;
    var out = new Float32Array(Math.max(1, Math.round(length*this.sampleRate)));
    return this.render(out);
  } // renderAll

} // AdlibSound

export default AdlibSound;
