const { OPL2 } = await import('./opl2.js?ver='+window.srcVersion);
// begin code

/**
 * The **IMF player**: music that is not played but replayed.
 *
 * `IMF` is what the music of the id/Apogee games of the early nineties is
 * kept as, and it is the simplest music format there is: a **recording of
 * the register writes themselves**. Four bytes at a time - a register, the
 * value written to it, and how long to wait afterwards - and the waiting is
 * counted in ticks of a timer the game programmed, 700 a second in
 * Wolfenstein 3D, 560 or 280 in others.
 *
 * So there is nothing to interpret. Where {@link AdlibMidi} has to decide
 * which voice a note takes, what the instrument is and how loud the note
 * should be, this only has to write what it is given at the right moment.
 * Everything a musician of 1992 did with MUSE is already in the stream.
 *
 * ## The two shapes of the file
 *
 * A **type 1** file (and every track inside `AUDIOT`) begins with a
 * `UINT16` saying how many bytes of writes follow, and often carries a
 * record of the title after them. A **type 0** file is the writes and
 * nothing else. {@link AdlibIMF.stream} takes either and hands back the
 * writes.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches the browser: the same class renders in a worker and
 * under Node, so a tool can compare what it writes with the stream in the
 * game's own file, write for write (R-001).
 *
 * @example
 * var player = new AdlibIMF({sampleRate: 24858, gain: 4});
 * player.play(AdlibIMF.stream(bytes));
 * var samples = player.renderAll();
 */
export class AdlibIMF {

  /** Ticks a second in Wolfenstein 3D and Spear of Destiny. */
  static get RATE() { return 700; }
  /** What one write is: register, value, and a word of delay. */
  static get WRITE_SIZE() { return 4; }

  /**
   * @param {Object} [options]
   * @param {number} [options.sampleRate] - What to render at; the chip's own
   *        49716 Hz by default.
   * @param {number} [options.gain=1] - A factor on the way out.
   * @param {number} [options.rate=700] - Ticks of delay a second: 700 for
   *        Wolfenstein, 560 for Blake Stone, 280 for Commander Keen.
   * @param {OPL2} [options.chip] - A chip of one's own, for a test.
   */
  constructor(options) {
    var settings = options || {};
    this.id = 'AdlibIMF';
    this.chip = settings.chip || new OPL2({sampleRate: settings.sampleRate});
    this.sampleRate = this.chip.sampleRate;
    this.gain = settings.gain === undefined ? 1 : settings.gain;
    this.rate = settings.rate || AdlibIMF.RATE;
    /** how many samples one tick of the stream is */
    this.samplesPerTick = this.sampleRate/this.rate;

    /** the stream being played, or null */
    this.data = null;
    /** where in it the player is, in bytes */
    this.at = 0;
    /** how many samples of the current delay are left */
    this.wait = 0;
    /** how long the piece is, in ticks */
    this.ticks = 0;
    /** the writes have run out */
    this.finished = true;
  } // constructor

  /**
   * The writes of a file, whichever of the two shapes it is in.
   *
   * A type 1 file states its length in a word in front; type 0 does not.
   * The two are told apart by whether that word is a whole number of writes
   * that fits in the file - which is what every player of the format does,
   * because there is no other marker. It is a **guess**, and it can be
   * wrong: a type 0 file whose first write happens to read as a small
   * multiple of four would lose four bytes. Where the shape is known - a
   * chunk out of `AUDIOT` is always type 1, and data written by a tool is
   * whatever the tool wrote - hand {@link AdlibIMF#play} the writes
   * directly and leave this alone.
   * @param {Uint8Array} bytes - The whole file, or a chunk of `AUDIOT`.
   * @returns {Uint8Array} Just the quadruples.
   */
  static stream(bytes) {
    if (bytes.length < 2) {
      return bytes;
    }
    var stated = bytes[0] | (bytes[1] << 8);
    var fits = stated > 0 && stated%AdlibIMF.WRITE_SIZE === 0 && stated+2 <= bytes.length;
    if (fits) {
      return bytes.subarray(2, 2+stated);
    }
    // type 0: the writes start straight away, and the length has to be a
    // whole number of them
    return bytes.subarray(0, bytes.length-(bytes.length%AdlibIMF.WRITE_SIZE));
  } // stream

  /**
   * Starts a piece.
   * @param {Uint8Array} data - The quadruples, as {@link AdlibIMF.stream}
   *        hands them back.
   * @returns {AdlibIMF} This player.
   */
  play(data) {
    this.chip.reset();
    // The game set this when it found the card, and the recording was made
    // with it on: no IMF stream ever writes register 1 itself, and without it
    // every voice that asks for a waveform other than the sine plays a plain
    // one - the piece keeps its notes and loses its sound.
    this.chip.write(0x01, 0x20);
    this.chip.write(0x08, 0x00);
    this.chip.write(0xBD, 0x00);
    this.data = data;
    this.at = 0;
    this.wait = 0;
    this.ticks = AdlibIMF.ticksOf(data);
    this.finished = data.length < AdlibIMF.WRITE_SIZE;
    return this;
  } // play

  /**
   * How many ticks a stream lasts: the delays of all its writes.
   * @param {Uint8Array} data - The quadruples.
   * @returns {number} Ticks.
   */
  static ticksOf(data) {
    var ticks = 0;
    for (var at = 0; at+3 < data.length; at += AdlibIMF.WRITE_SIZE) {
      ticks += data[at+2] | (data[at+3] << 8);
    }
    return ticks;
  } // ticksOf

  /**
   * How long the piece plays.
   * @returns {number} Seconds, from the ticks and the rate.
   */
  get pieceSeconds() {
    return this.ticks/this.rate;
  } // pieceSeconds

  /**
   * How many writes it holds.
   * @returns {number} The count; 0 when nothing is loaded.
   */
  get writes() {
    return this.data ? Math.floor(this.data.length/AdlibIMF.WRITE_SIZE) : 0;
  } // writes

  /**
   * Renders the next samples, making the writes that fall in them. A piece
   * that has run out keeps sounding - a voice may still be in its release -
   * so this goes on producing samples until it is asked to stop;
   * {@link AdlibIMF#finished} says when the writes ran out.
   * @param {Float32Array} out - Where the samples go.
   * @param {number} [count] - How many; the whole array by default.
   * @param {number} [offset=0] - Where in the array to start.
   * @returns {Float32Array} `out`.
   */
  render(out, count, offset) {
    var at = offset || 0;
    var left = count === undefined ? out.length-at : count;
    while (left > 0) {
      if (this.wait <= 0 && !this.finished) {
        if (this.at+3 >= this.data.length) {
          this.finished = true;
        } else {
          this.chip.write(this.data[this.at], this.data[this.at+1]);
          this.wait += (this.data[this.at+2] | (this.data[this.at+3] << 8))*this.samplesPerTick;
          this.at += AdlibIMF.WRITE_SIZE;
          continue;             // several writes may fall on the same tick
        }
      }
      var chunk = this.finished ? left : Math.min(left, Math.max(1, Math.ceil(this.wait)));
      this.chip.render(out.subarray(at, at+chunk), chunk, this.gain);
      this.wait -= chunk;
      at += chunk;
      left -= chunk;
    }
    return out;
  } // render

  /**
   * The whole piece as samples.
   * @param {number} [seconds] - A length of one's own.
   * @returns {Float32Array} Mono samples, -1..1.
   */
  renderAll(seconds) {
    var length = seconds === undefined ? this.pieceSeconds : seconds;
    var out = new Float32Array(Math.max(1, Math.round(length*this.sampleRate)));
    return this.render(out);
  } // renderAll

} // AdlibIMF

export default AdlibIMF;
