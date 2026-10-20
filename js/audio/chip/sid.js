// begin code

/**
 * The MOS **6581 SID** (Sound Interface Device) — the sound chip of the
 * Commodore 64: three voices, each a 24-bit phase accumulator driving one
 * of four waveforms through an ADSR envelope, a shared analogue filter and
 * a master volume. The 6581 is the first of the two (the 8580 is the
 * later, cleaner one); which one a machine had is audible, and Impossible
 * Mission is one of the games that only works on a 6581 — its speech is a
 * stream of four-bit values written to the volume register, and on an 8580
 * that is almost inaudible (`impossiblemission/ZADANI.md` §9).
 *
 * ## The interface
 *
 * Registers, as the program wrote them (`$D400`-`$D418`):
 *
 * | register | what it is |
 * |---|---|
 * | 0, 1 (7, 8 / 14, 15) | `FRELO`/`FREHI` — the 16-bit frequency |
 * | 2, 3 (9, 10 / 16, 17) | `PWLO`/`PWHI` — the 12-bit pulse width |
 * | 4 (11 / 18) | `VCREG` — bit 0 gate, 1 sync, 2 ring, 3 test, 4 triangle, 5 sawtooth, 6 pulse, 7 noise |
 * | 5 (12 / 19) | `ATDCY` — attack in the top nibble, decay in the bottom |
 * | 6 (13 / 20) | `SUREL` — sustain in the top nibble, release in the bottom |
 * | 21, 22 | `CUTLO`/`CUTHI` — the 11-bit filter cutoff (3 bits + 8) |
 * | 23 | `RESFILT` — resonance in the top nibble, which voices go through the filter in the bottom |
 * | 24 | `SIGVOL` — bits 0-3 the master volume, 4 low-pass, 5 band-pass, 6 high-pass, 7 voice 3 off |
 *
 * The read-only registers (`$D419`-`$D41C`: the paddles, the oscillator and
 * the envelope of voice 3) are not modelled — nothing here reads them, and
 * a model that says so is better than one that pretends.
 *
 * ## The model
 *
 *  - **clock**: the chip runs at the machine's clock (985 248 Hz on PAL,
 *    1 022 727 Hz on NTSC). A voice's accumulator adds `FREQ` every clock
 *    and wraps at 2^24, so **f = FREQ·clock/2^24** — 0.06 Hz a step.
 *  - **waveforms**: the sawtooth is the top 12 bits of the accumulator;
 *    the triangle is those bits folded about the MSB and shifted up one;
 *    the pulse is all ones while the top 12 bits are at or above `PW`;
 *    the noise is eight bits of a 23-bit shift register (taps 22 and 17),
 *    clocked when bit 19 of the accumulator rises. **Combined waveforms**
 *    are the bitwise AND of the parts — the real chip's are a non-linear
 *    mess of the same shape, and this is the honest approximation of it
 *    (a table of the measured shapes belongs here the day a game needs
 *    one). Noise combined with anything else gives silence, as it does on
 *    the chip.
 *  - **ring modulation** replaces the triangle's fold bit with the XOR of
 *    this voice's MSB and the previous voice's; **sync** resets this
 *    voice's accumulator when the previous voice's MSB rises; the **test
 *    bit** holds the accumulator at zero and fills the noise register.
 *  - **envelope**: the 6581's rate counter, period by period. Attack
 *    counts up linearly; decay and release count *down* through the chip's
 *    five slowdowns (at 0x5d, 0x36, 0x1a, 0x0e and 0x06 the counter is
 *    stepped once every 2, 4, 8, 16 and 30 periods), which is what gives
 *    the SID its characteristic decay. The rate table is the measured one.
 *  - **the filter** is a two-pole state variable filter at the sample
 *    rate, with the 6581's cutoff curve as a documented approximation
 *    rather than a measured table: the chip's filter varies from machine
 *    to machine by a factor of two and no two sound alike. Impossible
 *    Mission routes no voice through it, so nothing here is measured
 *    against it yet.
 *  - **the volume register is an output stage, and that is the whole
 *    point**: the voices are summed with the 6581's **DC offset** and the
 *    sum is scaled by the volume, so a program that writes nothing but
 *    `SIGVOL` — every C64 speech and sample player, this game's among them
 *    — still makes sound. The offset would leave a step at the output, so
 *    a one-pole **DC blocker** stands at the end, as the capacitor on the
 *    board does.
 *  - **roles** (R-055): a game whose music and effects share the chip —
 *    an effect is a track of the song played on one voice for a while —
 *    can tell the model which **role** a voice has at the moment, through
 *    the pseudo-registers {@link SID.ROLE_REGISTER} + voice (not on the
 *    chip, ignored by nothing else; written in the stream, so they keep
 *    their place in the frame), and the mixer scales the AC part of the
 *    voice by the gain of its role ({@link SID#setRoleGain}: a music
 *    slider and an effects slider over one SID). The DC offset of the
 *    voice stays, so a role change does not click.
 *  - **time**: the model advances in chip clocks. When no voice is
 *    synced or ring-modulated it jumps a whole sample at a time (the
 *    accumulator is linear and the noise shifts are counted, not stepped);
 *    otherwise it steps clock by clock, because a sync is an event at one
 *    clock. The envelope always advances period by period.
 *
 * Deliberately free of the DOM: the same class renders in a worker, in a
 * worklet and under Node, so a tool prints the samples the player hears
 * (R-001). It is a chip for {@link ChipStream}: `write(register, value)`,
 * `render(out, offset, count)`, `reset()`.
 *
 * @example
 * var chip = new SID(SID.CLOCK_PAL, 44100);
 * chip.write(0, 0x6D); chip.write(1, 0x16);      // voice 1 at about 340 Hz
 * chip.write(5, 0x00); chip.write(6, 0xF0);      // no attack, full sustain
 * chip.write(4, 0x11);                           // triangle, gate on
 * chip.write(24, 0x0F);                          // full volume
 * var out = new Float32Array(4410);
 * chip.render(out, 0, out.length);
 */
export class SID {

  /** The clock of a PAL C64 (the machine this project measures on, R-038). */
  static get CLOCK_PAL() { return 985248; }

  /** The clock of an NTSC C64. */
  static get CLOCK_NTSC() { return 1022727; }

  /** the first of three pseudo-registers: `write(ROLE_REGISTER + voice, role)` sets a voice's role (R-055) */
  static get ROLE_REGISTER() { return 0x20; }

  /** the roles a voice can have */
  static get ROLE_MUSIC() { return 0; }
  static get ROLE_EFFECTS() { return 1; }

  /**
   * The gain of a role: what the mixer scales a voice of that role by.
   * Not reset with the chip — it is the listener's setting, not the
   * program's state.
   * @param {number} role - {@link SID.ROLE_MUSIC} or {@link SID.ROLE_EFFECTS}.
   * @param {number} gain - 0-1.
   */
  setRoleGain(role, gain) {
    if (role === 0 || role === 1) {
      this.roleGains[role] = Math.max(0, Number(gain) || 0);
    }
  } // setRoleGain

  /**
   * The rate counter periods of the envelope, one per nibble of `ATDCY`
   * and `SUREL`: how many chip clocks one step of the counter takes.
   * @returns {Array<number>} Sixteen periods.
   */
  static get RATES() {
    return [9, 32, 63, 95, 149, 220, 267, 313, 392, 977, 1954, 3126, 3907, 11720, 19532, 31251];
  } // RATES

  /**
   * @param {number} [clock] - The chip clock in Hz (985 248 by default).
   * @param {number} [sampleRate] - Samples a second the renderer produces (44 100 by default).
   */
  constructor(clock, sampleRate) {
    this.id = 'SID';
    this.clock = clock || SID.CLOCK_PAL;
    this.sampleRate = sampleRate || 44100;
    this.rates = SID.RATES;
    this.voices = [this.makeVoice(), this.makeVoice(), this.makeVoice()];
    /** the 11-bit cutoff, the resonance nibble and which voices are filtered */
    this.cutoff = 0;
    this.resonance = 0;
    this.filtered = 0;
    /** `SIGVOL`: the volume and the three filter modes, and voice 3 off */
    this.volume = 0;
    this.mode = 0;
    this.voice3off = false;
    /** the filter's two integrators */
    this.bandpass = 0;
    this.lowpass = 0;
    /** the DC blocker's state */
    this.dcLast = 0;
    this.dcOut = 0;
    /** the fraction of a chip clock owed to the sample being rendered */
    this.carry = 0;
    /** the role of each voice (0 music, 1 effects) and the gain of each role (R-055) */
    this.roles = [0, 0, 0];
    this.roleGains = [1, 1];
  } // constructor

  /**
   * One voice's state.
   * @returns {Object}
   */
  makeVoice() {
    return {
      freq: 0, pw: 0, control: 0,
      attack: 0, decay: 0, sustain: 0, release: 0,
      /** the 24-bit phase accumulator and the 23-bit noise register */
      accumulator: 0, shift: 0x7FFFF8,
      /** the MSB of the accumulator last time it was looked at, for sync */
      msb: 0,
      /** the envelope: its state (0 attack, 1 decay/sustain, 2 release) and counters */
      envelope: 0, state: 2, ratePeriod: 9, rateCounter: 0,
      expCounter: 0, expPeriod: 1, holdZero: true
    };
  } // makeVoice

  /**
   * A register write.
   * @param {number} register - 0-24 (`$D400`-`$D418`); anything else is ignored.
   * @param {number} value - A byte.
   */
  write(register, value) {
    value &= 0xFF;
    if (register < 21) {
      var v = this.voices[(register/7)|0];
      switch (register % 7) {
        case 0: v.freq = (v.freq & 0xFF00) | value; break;
        case 1: v.freq = (v.freq & 0x00FF) | (value << 8); break;
        case 2: v.pw = (v.pw & 0x0F00) | value; break;
        case 3: v.pw = (v.pw & 0x00FF) | ((value & 0x0F) << 8); break;
        case 4: this.setControl(v, value); break;
        case 5: v.attack = value >> 4; v.decay = value & 0x0F; this.setRate(v); break;
        case 6: v.sustain = value >> 4; v.release = value & 0x0F; this.setRate(v); break;
      }
      return;
    }
    if (register >= SID.ROLE_REGISTER && register < SID.ROLE_REGISTER+3) {
      this.roles[register-SID.ROLE_REGISTER] = value & 1;
      return;
    }
    switch (register) {
      case 21: this.cutoff = (this.cutoff & 0x7F8) | (value & 0x07); break;
      case 22: this.cutoff = (this.cutoff & 0x007) | (value << 3); break;
      case 23: this.resonance = value >> 4; this.filtered = value & 0x0F; break;
      case 24:
        this.volume = value & 0x0F;
        this.mode = (value >> 4) & 0x07;
        this.voice3off = (value & 0x80) !== 0;
        break;
    }
  } // write

  /**
   * `VCREG`: the waveform bits take effect at once, the gate starts the
   * attack or the release, and the test bit holds the oscillator.
   * @param {Object} v - The voice.
   * @param {number} value - The byte written.
   */
  setControl(v, value) {
    var wasGate = v.control & 0x01;
    v.control = value;
    if ((value & 0x08) !== 0) {
      v.accumulator = 0;
      v.shift = 0x7FFFF8;
    }
    if ((value & 0x01) !== 0 && !wasGate) {
      v.state = 0;
      v.holdZero = false;
      v.rateCounter = 0;
      this.setRate(v);
    } else if ((value & 0x01) === 0 && wasGate) {
      v.state = 2;
      this.setRate(v);
    }
  } // setControl

  /**
   * The rate counter's period for the state the voice is in.
   * @param {Object} v - The voice.
   */
  setRate(v) {
    v.ratePeriod = this.rates[v.state === 0 ? v.attack : (v.state === 1 ? v.decay : v.release)];
  } // setRate

  /**
   * Silences the chip: every register 0, the accumulators and the
   * envelopes at rest.
   */
  reset() {
    this.voices = [this.makeVoice(), this.makeVoice(), this.makeVoice()];
    this.cutoff = 0;
    this.resonance = 0;
    this.filtered = 0;
    this.volume = 0;
    this.mode = 0;
    this.voice3off = false;
    this.bandpass = 0;
    this.lowpass = 0;
    this.dcLast = 0;
    this.dcOut = 0;
    this.roles = [0, 0, 0];
  } // reset

  /**
   * One step of the noise shift register: bit 0 becomes bit 22 XOR bit 17.
   * @param {Object} v - The voice.
   */
  shiftNoise(v) {
    var bit = ((v.shift >> 22) ^ (v.shift >> 17)) & 1;
    v.shift = ((v.shift << 1) | bit) & 0x7FFFFF;
  } // shiftNoise

  /**
   * The eight bits of the shift register the chip puts on the waveform
   * output (taps 20, 18, 14, 11, 9, 5, 2, 0), as a 12-bit value.
   * @param {Object} v - The voice.
   * @returns {number} 0-4095.
   */
  noiseOf(v) {
    var s = v.shift;
    return (((s >> 20) & 1) << 11) | (((s >> 18) & 1) << 10) | (((s >> 14) & 1) << 9)
      | (((s >> 11) & 1) << 8) | (((s >> 9) & 1) << 7) | (((s >> 5) & 1) << 6)
      | (((s >> 2) & 1) << 5) | ((s & 1) << 4);
  } // noiseOf

  /**
   * A voice's waveform output as the chip's 12-bit value, now.
   * @param {number} index - 0-2.
   * @returns {number} 0-4095.
   */
  waveOf(index) {
    var v = this.voices[index];
    var wave = (v.control >> 4) & 0x0F;
    if (wave === 0) {
      return 0;
    }
    if (wave & 0x08) {
      return (wave === 0x08) ? this.noiseOf(v) : 0;      // noise combines with nothing
    }
    var out = 0xFFF;
    var top = (v.accumulator >>> 12) & 0xFFF;
    if (wave & 0x01) {                                    // triangle
      var msb = (v.control & 0x04)
        ? (((v.accumulator ^ this.voices[(index+2) % 3].accumulator) >>> 23) & 1)
        : ((v.accumulator >>> 23) & 1);
      var folded = (v.accumulator >>> 11) & 0xFFF;
      out &= (msb ? (~folded) : folded) & 0xFFF;
    }
    if (wave & 0x02) {                                    // sawtooth
      out &= top;
    }
    if (wave & 0x04) {                                    // pulse
      out &= ((v.control & 0x08) || top >= v.pw) ? 0xFFF : 0x000;
    }
    return out;
  } // waveOf

  /**
   * Whether any voice needs the accumulators stepped one clock at a time:
   * a sync or a ring modulation is an event at a single clock.
   * @returns {boolean}
   */
  get stepwise() {
    for (var i = 0; i < 3; i++) {
      if (this.voices[i].control & 0x06) {
        return true;
      }
    }
    return false;
  } // stepwise

  /**
   * Runs one voice's oscillator for `clocks` clocks without looking at the
   * other two: the accumulator is linear, so it is added to in one go, and
   * the noise register is shifted as many times as bit 19 rose.
   * @param {Object} v - The voice.
   * @param {number} clocks - Chip clocks.
   */
  advanceVoice(v, clocks) {
    if (v.control & 0x08) {                               // test: held at zero
      v.accumulator = 0;
      v.shift = (v.shift | 1) & 0x7FFFFF;
      return;
    }
    if (!v.freq) {
      return;
    }
    var before = v.accumulator;
    var after = before+v.freq*clocks;
    v.accumulator = after % 0x1000000;
    var rises = Math.floor(after/0x100000)-Math.floor(before/0x100000);
    for (var i = 0; i < rises; i++) {
      this.shiftNoise(v);
    }
  } // advanceVoice

  /**
   * One chip clock of every oscillator, in order, so that a sync reaches
   * the next voice at the clock it happened.
   */
  clockVoices() {
    var i, v;
    for (i = 0; i < 3; i++) {
      v = this.voices[i];
      v.msb = (v.accumulator >>> 23) & 1;
    }
    for (i = 0; i < 3; i++) {
      this.advanceVoice(this.voices[i], 1);
    }
    for (i = 0; i < 3; i++) {
      v = this.voices[i];
      var source = this.voices[(i+2) % 3];
      if ((v.control & 0x02) && !source.msb && ((source.accumulator >>> 23) & 1)) {
        v.accumulator = 0;
      }
    }
  } // clockVoices

  /**
   * The envelope of one voice, advanced by `clocks` chip clocks — period
   * by period, not clock by clock, because the periods are long.
   * @param {Object} v - The voice.
   * @param {number} clocks - Chip clocks.
   */
  advanceEnvelope(v, clocks) {
    while (clocks > 0) {
      var step = v.ratePeriod-v.rateCounter;
      if (step > clocks) {
        v.rateCounter += clocks;
        return;
      }
      clocks -= step;
      v.rateCounter = 0;
      if (v.state !== 0 && ++v.expCounter !== v.expPeriod) {
        continue;
      }
      v.expCounter = 0;
      if (v.holdZero) {
        continue;
      }
      if (v.state === 0) {
        v.envelope = (v.envelope+1) & 0xFF;
        if (v.envelope === 0xFF) {
          v.state = 1;
          this.setRate(v);
        }
      } else if (v.state === 1) {
        if (v.envelope !== v.sustain*0x11) {
          v.envelope = (v.envelope-1) & 0xFF;
        }
      } else {
        v.envelope = (v.envelope-1) & 0xFF;
      }
      switch (v.envelope) {
        case 0xFF: v.expPeriod = 1; break;
        case 0x5D: v.expPeriod = 2; break;
        case 0x36: v.expPeriod = 4; break;
        case 0x1A: v.expPeriod = 8; break;
        case 0x0E: v.expPeriod = 16; break;
        case 0x06: v.expPeriod = 30; break;
        case 0x00: v.expPeriod = 1; v.holdZero = true; break;
      }
    }
  } // advanceEnvelope

  /**
   * Runs the chip for a whole number of chip clocks.
   * @param {number} clocks - Chip clocks to run.
   */
  advance(clocks) {
    var i;
    for (i = 0; i < 3; i++) {
      this.advanceEnvelope(this.voices[i], clocks);
    }
    if (this.stepwise) {
      for (i = 0; i < clocks; i++) {
        this.clockVoices();
      }
      return;
    }
    for (i = 0; i < 3; i++) {
      this.advanceVoice(this.voices[i], clocks);
    }
  } // advance

  /**
   * The chip's output level right now, before the filter: the three
   * voices summed with the 6581's DC offset and scaled by the master
   * volume. The offset is why a program that writes only `SIGVOL` is
   * heard at all.
   * @returns {{direct: number, filter: number}} Both halves of the mixer, -1..1.
   */
  mix() {
    var direct = SID.MIXER_DC;
    var filter = 0;
    for (var i = 0; i < 3; i++) {
      var v = this.voices[i];
      if (i === 2 && this.voice3off && !(this.filtered & 0x04)) {
        continue;
      }
      var level = (this.waveOf(i)-SID.WAVE_ZERO)*v.envelope/(2048*255)*this.roleGains[this.roles[i]]+SID.VOICE_DC;
      if (this.filtered & (1 << i)) {
        filter += level;
      } else {
        direct += level;
      }
    }
    return {direct: direct, filter: filter};
  } // mix

  /** Where the 6581 puts the middle of a waveform (its output is not centred). */
  static get WAVE_ZERO() { return 0x380; }

  /** The DC a voice contributes whatever its envelope says — the chip's offset. */
  static get VOICE_DC() { return 0.34; }

  /** And the mixer's own, with the opposite sign. */
  static get MIXER_DC() { return -0.09; }

  /**
   * One sample of the filter, a two-pole state variable filter at the
   * sample rate. `cutoff` is mapped onto the 6581's curve — an
   * approximation, and said to be one.
   * @param {number} input - The filtered half of the mixer.
   * @returns {number} What the three mode bits pick out of it.
   */
  filter(input) {
    if (!this.mode || !this.filtered) {
      return this.mode ? 0 : input;
    }
    var fc = 30+(this.cutoff/2047)*(this.cutoff/2047)*11000+(this.cutoff/2047)*1000;
    var w0 = 2*Math.sin(Math.PI*Math.min(fc, this.sampleRate*0.45)/this.sampleRate);
    var q = 1.4-this.resonance/12;
    var highpass = input-this.lowpass-q*this.bandpass;
    this.bandpass += w0*highpass;
    this.lowpass += w0*this.bandpass;
    var out = 0;
    if (this.mode & 0x01) { out += this.lowpass; }
    if (this.mode & 0x02) { out += this.bandpass; }
    if (this.mode & 0x04) { out += highpass; }
    return out;
  } // filter

  /**
   * The sample the chip is putting out now: the mixer through the filter,
   * scaled by the volume and passed through the DC blocker that stands for
   * the capacitor on the board.
   * @returns {number} -1..1.
   */
  level() {
    var m = this.mix();
    var raw = (m.direct+this.filter(m.filter))*this.volume/15;
    this.dcOut = raw-this.dcLast+0.999*this.dcOut;
    this.dcLast = raw;
    return this.dcOut/3;
  } // level

  /**
   * Renders samples at `sampleRate`: the chip runs the clocks that fall
   * into each sample, and the sample is its level at the end of them.
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
      if (clocks) {
        this.advance(clocks);
      }
      out[offset+i] = this.level();
    }
  } // render

} // SID
