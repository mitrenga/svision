// begin code

/**
 * Atari **POKEY** (C012294) — the sound half of the chip: four channels, each
 * a divide-by-N counter that either toggles a square wave or samples a
 * polynomial noise, with a four-bit volume. The Atari 8-bit computers had one,
 * and so did the arcade boards of the vector era (Battlezone, Red Baron,
 * Tempest, Asteroids Deluxe, Missile Command …), where it sat next to a
 * discrete board.
 *
 * ## The interface
 *
 * Registers, as the program wrote them (`$D200`-`$D208` on the computers,
 * `$1820`-`$1828` in Battlezone): `AUDF1..4` (0, 2, 4, 6) the divider,
 * `AUDC1..4` (1, 3, 5, 7) the control and volume, `AUDCTL` (8). Nothing else
 * of the chip is here — no pots, no keyboard, no serial port, and the random
 * number register is not an audio matter.
 *
 * ## The model
 *
 *  - **clock**: the chip runs at `clock` Hz (1.79 MHz NTSC, 1.77 MHz PAL on
 *    the computers, 1.512 MHz in Battlezone). The channel dividers count a
 *    base clock of `clock/28` (≈ 64 kHz) or `clock/114` (≈ 15 kHz) by
 *    `AUDCTL` bit 0. A channel's divider fires every `AUDF + 1` base clocks
 *    and a pure tone toggles on every fire, so **f = base / (2·(AUDF + 1))**
 *    — `27000/(AUDF + 1)` in Battlezone.
 *  - **AUDCTL bits 5 and 6** clock channels 3 and 1 with the chip clock
 *    itself: the divider then fires every `AUDF + 4` chip clocks
 *    (f = clock / (2·(AUDF + 4))), the reload taking the four clocks the
 *    hardware takes.
 *  - **AUDCTL bits 3 and 4** join channels 3+4 and 1+2 into 16-bit dividers:
 *    the low channel's underflow clocks the high one, so channel 2 (4)
 *    fires every `AUDF2·256 + AUDF1 + 1` base clocks, or every
 *    `AUDF2·256 + AUDF1 + 7` chip clocks when the low channel runs at the
 *    chip clock — the way a program plays a tune in tune (Boulder Dash's
 *    title: `AUDCTL = $78`, both pairs at 1.79 MHz). The low channel keeps
 *    its own 8-bit output, which is why a program sets its volume to 0.
 *  - **AUDC**: bits 0–3 the volume, bit 4 volume-only (a DC level, for
 *    digitised sound), bit 5 pure tone, bit 6 the 4-bit poly instead of the
 *    17-bit, bit 7 bypass the 5-bit poly (which otherwise gates the fires).
 *    `$Ax` is a square wave, `$Cx` 4-bit noise, `$8x` 17-bit noise, `$4x`
 *    4-bit noise gated by the 5-bit one (Boulder Dash's walk), `$0x` the
 *    17-bit gated (its explosion).
 *  - **polys**: the 4-, 5-, 9- and 17-bit shift registers run at the chip
 *    clock and a channel *samples* them when its divider fires; here they are
 *    tables indexed by the chip clock count, which gives the same sample
 *    without stepping a register on every clock.
 *  - **AUDCTL bit 7** picks the 9-bit poly over the 17-bit one. Bits 1 and 2
 *    — the high-pass filters of channels 2 and 1 — are not modelled: no game
 *    here uses them yet, and the model says so rather than pretending (they
 *    are accepted and ignored).
 *  - **output**: the four volumes add; the sum of 60 is full scale, so one
 *    channel at 15 is 0.25 — the chip's own DAC weights, before whatever RC
 *    sat on the pin (Battlezone had 10 kΩ / 15 nF; that belongs to the board
 *    model, not here). A sample is the mean level over the chip clocks it
 *    covers, a box filter that takes the edge off the aliasing.
 *  - **time**: the model advances in chip clocks from fire to fire (a fire
 *    is a divider reaching zero), never clock by clock, so a 1.79 MHz
 *    channel costs no more than a 15 kHz one. A register write takes effect
 *    at the channel's next fire, as on the chip (no `STIMER` here).
 *
 * Deliberately free of the DOM: the same class renders in a worker, in a
 * worklet and under Node, so a tool prints the samples the player hears
 * (R-001). It is a chip for {@link ChipStream}: `write(register, value)`,
 * `render(out, offset, count)`, `reset()`.
 *
 * @example
 * var chip = new POKEY(1512000, 44100);
 * chip.write(0, 0x23); chip.write(1, 0xA3);      // channel 1: 750 Hz, volume 3
 * var out = new Float32Array(4410);
 * chip.render(out, 0, out.length);
 */
export class POKEY {

  /** The clock of the Atari 8-bit computers (NTSC). */
  static get CLOCK() { return 1789790; }

  /** The clock of a PAL Atari 8-bit computer (Boulder Dash is measured on one). */
  static get CLOCK_PAL() { return 1773447; }

  /**
   * @param {number} [clock] - The chip clock in Hz (1 789 790 by default).
   * @param {number} [sampleRate] - Samples a second the renderer produces (44 100 by default).
   */
  constructor(clock, sampleRate) {
    this.id = 'POKEY';
    this.clock = clock || POKEY.CLOCK;
    this.sampleRate = sampleRate || 44100;
    this.audf = [0, 0, 0, 0];
    this.audc = [0, 0, 0, 0];
    this.audctl = 0;
    /** chip clocks until each channel's divider fires */
    this.counter = [28, 28, 28, 28];
    /** the output bit of each channel */
    this.out = [0, 0, 0, 0];
    /** the chip clock count, the index into the poly tables */
    this.time = 0;
    /** the fraction of a chip clock owed to the sample being rendered */
    this.carry = 0;
    this.polys = POKEY.polys();
  } // constructor

  /**
   * The four polynomial counters as bit tables, made once and shared: maximal
   * length shift registers of 4, 5, 9 and 17 bits (periods 15, 31, 511 and
   * 131 071).
   * @returns {{p4: Uint8Array, p5: Uint8Array, p9: Uint8Array, p17: Uint8Array}}
   */
  static polys() {
    if (!POKEY.polyTables) {
      POKEY.polyTables = {
        p4: POKEY.poly(4, 3),
        p5: POKEY.poly(5, 3),
        p9: POKEY.poly(9, 5),
        p17: POKEY.poly(17, 14)
      };
    }
    return POKEY.polyTables;
  } // polys

  /**
   * One maximal-length sequence: an n-bit shift register with the feedback
   * `x^n + x^tap + 1`, started from all ones, output the low bit.
   * @param {number} bits - The register length.
   * @param {number} tap - The second tap.
   * @returns {Uint8Array} `2^bits - 1` bits.
   */
  static poly(bits, tap) {
    var length = (1 << bits)-1;
    var table = new Uint8Array(length);
    var mask = length;
    var state = mask;
    for (var i = 0; i < length; i++) {
      table[i] = state & 1;
      var feedback = ((state >> (bits-1)) ^ (state >> (tap-1))) & 1;
      state = ((state << 1) | feedback) & mask;
    }
    return table;
  } // poly

  /**
   * The base clock the dividers count, in Hz: the chip clock over 28, or
   * over 114 with `AUDCTL` bit 0.
   * @returns {number} Hz.
   */
  get baseRate() {
    return this.clock/this.baseDivider;
  } // baseRate

  /**
   * Chip clocks a base tick.
   * @returns {number}
   */
  get baseDivider() {
    return (this.audctl & 0x01) ? 114 : 28;
  } // baseDivider

  /**
   * Whether a channel's divider counts the chip clock itself (`AUDCTL` bit 6
   * for channel 1, bit 5 for channel 3).
   * @param {number} channel - 0..3
   * @returns {boolean}
   */
  fast(channel) {
    return (channel === 0 && (this.audctl & 0x40) !== 0) || (channel === 2 && (this.audctl & 0x20) !== 0);
  } // fast

  /**
   * Whether a channel is the high half of a joined 16-bit divider (`AUDCTL`
   * bit 4 joins 1+2 into channel 2, bit 3 joins 3+4 into channel 4).
   * @param {number} channel - 0..3
   * @returns {boolean}
   */
  joined(channel) {
    return (channel === 1 && (this.audctl & 0x10) !== 0) || (channel === 3 && (this.audctl & 0x08) !== 0);
  } // joined

  /**
   * Chip clocks between two fires of a channel, from the registers as they
   * are now: `(AUDF + 1)` base ticks, `AUDF + 4` chip clocks at the chip
   * clock, and for the high half of a joined pair `AUDF·256 + AUDFlow + 1`
   * base ticks or `+ 7` chip clocks.
   * @param {number} channel - 0..3
   * @returns {number} At least 1.
   */
  period(channel) {
    if (this.joined(channel)) {
      var f16 = (this.audf[channel] << 8) | this.audf[channel-1];
      return this.fast(channel-1) ? f16+7 : (f16+1)*this.baseDivider;
    }
    return this.fast(channel) ? this.audf[channel]+4 : (this.audf[channel]+1)*this.baseDivider;
  } // period

  /**
   * A register write.
   * @param {number} register - 0..7 `AUDF1, AUDC1 … AUDF4, AUDC4`, 8 `AUDCTL`.
   * @param {number} value - A byte.
   */
  write(register, value) {
    value &= 0xFF;
    if (register === 8) {
      this.audctl = value;
      return;
    }
    var channel = (register >> 1) & 3;
    if (register & 1) {
      this.audc[channel] = value;
    } else {
      this.audf[channel] = value;
    }
  } // write

  /**
   * Silences the chip: every register 0, the dividers reloaded.
   */
  reset() {
    for (var c = 0; c < 4; c++) {
      this.audf[c] = 0;
      this.audc[c] = 0;
      this.counter[c] = 28;
      this.out[c] = 0;
    }
    this.audctl = 0;
  } // reset

  /**
   * A channel's divider fired at chip clock `t`: the 5-bit poly gates it
   * unless bypassed, then the output toggles or samples a poly.
   * @param {number} c - The channel 0..3.
   * @param {number} t - The chip clock count.
   */
  fire(c, t) {
    var p = this.polys;
    var audc = this.audc[c];
    if (!(audc & 0x80) && !p.p5[t % 31]) {
      return;
    }
    if (audc & 0x20) {
      this.out[c] ^= 1;                                     // pure tone
    } else if (audc & 0x40) {
      this.out[c] = p.p4[t % 15];                           // 4-bit poly
    } else if (this.audctl & 0x80) {
      this.out[c] = p.p9[t % 511];                          // 9-bit poly
    } else {
      this.out[c] = p.p17[t % 131071];                      // 17-bit poly
    }
  } // fire

  /**
   * The output level right now: the volumes of the channels whose output is
   * high (or which are in volume-only mode), over the full scale of 60.
   * @returns {number} 0..1
   */
  level() {
    var sum = 0;
    for (var c = 0; c < 4; c++) {
      var audc = this.audc[c];
      if ((audc & 0x10) || this.out[c]) {
        sum += audc & 0x0F;
      }
    }
    return sum/60;
  } // level

  /**
   * Runs the chip for a whole number of chip clocks, fire by fire, and
   * returns the level integrated over them (level × clocks).
   * @param {number} clocks - Chip clocks to run.
   * @returns {number} The integral of the level.
   */
  advance(clocks) {
    var sum = 0;
    var counter = this.counter;
    while (clocks > 0) {
      var step = clocks;
      for (var c = 0; c < 4; c++) {
        if (counter[c] < step) {
          step = counter[c];
        }
      }
      sum += this.level()*step;
      this.time += step;
      clocks -= step;
      for (c = 0; c < 4; c++) {
        counter[c] -= step;
        if (counter[c] <= 0) {
          this.fire(c, this.time);
          counter[c] += this.period(c);
        }
      }
    }
    return sum;
  } // advance

  /**
   * Renders samples at `sampleRate`: each sample is the mean level over the
   * chip clocks that fall into it.
   * @param {Float32Array} out - Where the samples go.
   * @param {number} offset - The first index written.
   * @param {number} count - How many samples.
   */
  render(out, offset, count) {
    var clocksPerSample = this.clock/this.sampleRate;
    for (var i = 0; i < count; i++) {
      this.carry += clocksPerSample;
      var clocks = Math.floor(this.carry);
      this.carry -= clocks;
      out[offset+i] = clocks ? this.advance(clocks)/clocks : this.level();
    }
  } // render

} // POKEY
