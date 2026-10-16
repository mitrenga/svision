// begin code

/**
 * Yamaha **YM3812 (OPL2)** — the chip on the AdLib card and on every Sound
 * Blaster up to the Pro, and with it the music of most DOS games of the era.
 *
 * ## What it is
 *
 * Nine channels, two operators each. An operator is a sine oscillator with an
 * envelope in front of it; a channel either stacks them (the first modulates
 * the phase of the second — two operator FM) or adds them together. Waveforms
 * can be shaped into four forms, the chip has vibrato and tremolo, and the
 * last three channels can be traded for five percussion voices.
 *
 * Everything about it is written through **registers**: the program writes a
 * register number and a value, exactly as it would into ports 388h/389h, and
 * that is the whole interface here too ({@link OPL2#write}).
 *
 * ## Deliberately free of DOM and of ports
 *
 * Nothing here touches the browser: the same class runs in an AudioWorklet, in
 * a worker and under Node, so an offline tool renders the same samples the
 * player hears (R-001). It is a model of the **chip**, not of any game's
 * driver: which registers to write and when is the game's business.
 *
 * ## The model
 *
 * Written from the description of the chip in its datasheet and the public
 * documents of the AdLib register set, not ported from another emulator —
 * R-029 rules out both DOSBox (GPL) and Nuked OPL3 (LGPL) as sources.
 *
 *  - **phase**: `F = fnum · 2^block · 49716 / 2^20` hertz, where 49716 is
 *    the chip's own sample rate (its 3.58 MHz clock over 72), multiplied by
 *    the operator's frequency multiple (the half is the reason for the table
 *    below). See `phaseStepOf()`.
 *  - **envelope**: a 9-bit attenuation, 0 loudest and 511 silence, in steps of
 *    0.1875 dB, walked by a counter whose speed is `4·rate + key scaling`.
 *    Attack curves, the three other phases are straight.
 *  - **level**: total level is 0.75 dB a step, key scale level takes the top
 *    octaves down by a table.
 *  - **output**: every operator is `sin(phase) · 10^(−attenuation/20)`, the
 *    channels are summed. The chip's own DAC is 16 bit; the samples here are
 *    floats between −1 and 1.
 *
 * ★ The **timing of the envelopes** is the part of this to check by ear: the
 * counter scheme reproduces the chip's design, but the exact rates are worth
 * holding against a recording of the original hardware or of DOSBox.
 *
 * @example
 * var chip = new OPL2();
 * chip.write(0x20, 0x01); chip.write(0x40, 0x10);
 * chip.write(0xA0, 0x98); chip.write(0xB0, 0x31);   // key on
 * var samples = new Float32Array(1024);
 * chip.render(samples, 1024);
 */
export class OPL2 {

  /** The clock of the chip on an AdLib card. */
  static get CLOCK() { return 3579545; }
  /** One sample every 72 clocks — the rate the chip itself runs at. */
  static get SAMPLE_RATE() { return OPL2.CLOCK/72; }
  /** Nine channels, two operators each. */
  static get CHANNELS() { return 9; }
  static get OPERATORS() { return 18; }

  /** Which operator pair belongs to which channel (the register layout). */
  static get SLOT_OF_CHANNEL() { return [0, 1, 2, 8, 9, 10, 16, 17, 18]; }

  /** The frequency multiple of an operator, in halves. */
  static get MULTIPLE() { return [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 20, 24, 24, 30, 30]; }

  /** Key scale level: how much an octave takes off, in 0.75 dB steps. */
  static get KSL_TABLE() {
    return [0, 32, 40, 45, 48, 51, 53, 55, 56, 58, 59, 60, 61, 62, 63, 64];
  }
  /** How much of that table each of the four settings uses. */
  static get KSL_SHIFT() { return [8, 1, 2, 0]; }

  /**
   * How far the envelope moves on a step, by the low two bits of the rate and
   * the place in the eight step cycle. This is the chip's own scheme: the
   * counter ticks every sample, a step happens when the low bits of the
   * counter are clear, and how often that is doubles with every four rates.
   */
  static get INCREMENT() {
    return [
      [0, 1, 0, 1, 0, 1, 0, 1],
      [0, 1, 0, 1, 1, 1, 0, 1],
      [0, 1, 1, 1, 0, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 1]
    ];
  }

  /** One turn of the phase. */
  static get TURN() { return 2*Math.PI; }

  /**
   * **How deep one operator modulates the next**, as turns of phase per unit
   * of the modulator's output.
   *
   * The chip has no notion of radians: an operator's output is a number in
   * +-4084 and the carrier simply **adds it to its ten bit phase counter**,
   * of which 1024 is a whole turn. A modulator at full level therefore swings
   * the carrier by very nearly four whole turns, not one - and that factor of
   * four is most of the brightness of FM. Modelling it as one turn (which is
   * what `out*2*PI` reads like, and what this did until 2026-09-15) leaves
   * the carrier close to a plain sine: the harmonics above the fundamental
   * all but vanish and every instrument sounds muffled and bass heavy
   * (reported by the operator on the Prince of Persia music).
   *
   * The same normalisation is already in the feedback below, where the shift
   * `9-fb` of the chip works out as `pi · 2^(fb−5)` on a +-1 output.
   */
  static get FM_INDEX() { return 4084/1024; }

  /**
   * Two to the power of nought to seven, and the 2^20 the f-number is a
   * fraction of. A lookup, not `Math.pow`: the phase step is worked out for
   * every operator on every sample, which is thirty-six powers of two a
   * sample, and the values are the same to the last bit either way.
   */
  static get POWER_OF_TWO() { return [1, 2, 4, 8, 16, 32, 64, 128]; }
  static get F_NUMBER_SCALE() { return 1048576; }

  /** Attenuation of one envelope step, in decibels. */
  static get STEP_DB() { return 0.1875; }
  /** Silence. */
  static get MAX_ATTENUATION() { return 511; }

  /**
   * @param {Object} [options]
   * @param {number} [options.sampleRate] - What to render at; the chip's own
   *        49716 Hz by default. Anything else is stepped through the phase
   *        accumulators at the right ratio, which is what a real card's output
   *        would sound like after resampling.
   */
  constructor(options) {
    this.id = 'OPL2';
    var settings = options || {};
    this.sampleRate = settings.sampleRate || OPL2.SAMPLE_RATE;
    /** how much chip time one output sample is */
    this.step = OPL2.SAMPLE_RATE/this.sampleRate;
    /** what is left of that after the last sample */
    this.fraction = 0;
    /** the last sample the chip produced */
    this.last = 0;

    /**
     * The card's output filter. A YM3812 does not drive a speaker directly:
     * on an AdLib the DAC goes through an amplifier that rolls the top off,
     * which is a large part of why the card sounds the way it does. Without
     * it a model of the chip is brighter than the real thing. Measured
     * against a recording of an AdLib playing Lemmings
     * (`lemmings/tools/matchmusic.mjs`): without it the centre of our spectrum
     * sits well above the card's. **A single pole at 13 kHz** lands on the
     * measured 4.4 kHz centre; that is the default.
     */
    this.lowPass = settings.lowPass === undefined ? 13000 : settings.lowPass;
    this.filtered = 0;
    /** the filter coefficient of `lowPass`, worked out on the first sample */
    this.alphaCutoff = 0;
    this.alpha = 0;

    /** the 256 registers, as written */
    this.registers = new Uint8Array(256);

    this.operators = [];
    for (var i = 0; i < OPL2.OPERATORS; i++) this.operators.push(OPL2.newOperator());
    this.channels = [];
    for (var c = 0; c < OPL2.CHANNELS; c++) {
      this.channels.push({
        fnum: 0, block: 0, keyOn: false,
        feedback: 0, additive: false,
        previous: [0, 0]
      });
    }

    /** waveform select enabled (register 1, bit 5) */
    this.waveformsEnabled = false;
    /** tremolo and vibrato depth, and the percussion voices (register 0xBD) */
    this.tremoloDepth = 1;
    this.vibratoDepth = 1;
    this.rhythm = false;

    /** the low frequency oscillators both effects run off */
    this.tremoloPhase = 0;
    this.vibratoPhase = 0;
    /** the noise the percussion voices use */
    this.noise = 1;

    this.reset();
  } // constructor

  /**
   * A fresh operator: what its registers say (multiple, key scaling,
   * envelope rates, waveform) and what it is doing (phase, envelope state
   * and attenuation, the last output).
   * @returns {Object} The operator state record.
   */
  static newOperator() {
    return {
      // what the registers say
      multiple: 1, ksr: false, sustaining: false, vibrato: false, tremolo: false,
      ksl: 0, totalLevel: 0,
      attack: 0, decay: 0, sustain: 0, release: 0,
      waveform: 0,
      // what it is doing
      phase: 0,
      state: 'off',          // off, attack, decay, sustain, release
      attenuation: OPL2.MAX_ATTENUATION,
      counter: 0,
      output: 0,
      // the last decibels that were turned into a factor, and that factor
      levelKey: NaN,
      levelValue: 0
    };
  } // newOperator

  /**
   * Clears the registers and silences every operator and channel, as the
   * chip is after power-up.
   * @returns {OPL2} This.
   */
  reset() {
    this.registers.fill(0);
    for (var i = 0; i < this.operators.length; i++) {
      var operator = this.operators[i];
      operator.phase = 0;
      operator.state = 'off';
      operator.attenuation = OPL2.MAX_ATTENUATION;
      operator.counter = 0;
      operator.output = 0;
    }
    for (var c = 0; c < this.channels.length; c++) {
      this.channels[c].keyOn = false;
      this.channels[c].previous = [0, 0];
    }
    return this;
  } // reset

  // ------------------------------------------------------------- registers

  /**
   * One write to the chip, the way a program does it through the two ports.
   * @param {number} address - 0x00..0xFF.
   * @param {number} value - 0x00..0xFF.
   * @returns {OPL2} This.
   */
  write(address, value) {
    address &= 0xFF;
    value &= 0xFF;
    this.registers[address] = value;

    // The operator registers come in groups of 32: 0x20..0x3F, 0x40..0x5F and
    // so on, which is 18 operators plus two unused slots in each row of eight.
    var group = address & 0xE0;
    var high = address & 0xF0;
    var low = address & 0x0F;

    if (address === 0x01) {
      this.waveformsEnabled = (value & 0x20) !== 0;
      return this;
    }
    if (address === 0xBD) {
      this.tremoloDepth = (value & 0x80) ? 4.8 : 1.0;
      this.vibratoDepth = (value & 0x40) ? 14 : 7;
      var rhythm = (value & 0x20) !== 0;
      this.rhythm = rhythm;
      if (rhythm) this.percussion(value);
      return this;
    }

    var slot = OPL2.slotOfAddress(address);
    if (slot >= 0) {
      var operator = this.operators[slot];
      switch (group) {
        case 0x20:
          operator.tremolo = (value & 0x80) !== 0;
          operator.vibrato = (value & 0x40) !== 0;
          operator.sustaining = (value & 0x20) !== 0;
          operator.ksr = (value & 0x10) !== 0;
          operator.multiple = OPL2.MULTIPLE[value & 0x0F]/2;
          break;
        case 0x40:
          operator.ksl = (value >> 6) & 3;
          operator.totalLevel = value & 0x3F;
          break;
        case 0x60:
          operator.attack = (value >> 4) & 0x0F;
          operator.decay = value & 0x0F;
          break;
        case 0x80:
          operator.sustain = (value >> 4) & 0x0F;
          operator.release = value & 0x0F;
          break;
        case 0xE0:
          operator.waveform = value & 3;
          break;
      }
      return this;
    }

    if (high === 0xA0 && low < 9) {
      var channelA = this.channels[low];
      channelA.fnum = (channelA.fnum & 0x300) | value;
      return this;
    }
    if (high === 0xB0 && low < 9) {
      var channelB = this.channels[low];
      channelB.fnum = (channelB.fnum & 0xFF) | ((value & 3) << 8);
      channelB.block = (value >> 2) & 7;
      var keyOn = (value & 0x20) !== 0;
      if (keyOn && !channelB.keyOn) this.keyOn(low);
      else if (!keyOn && channelB.keyOn) this.keyOff(low);
      channelB.keyOn = keyOn;
      return this;
    }
    if (high === 0xC0 && low < 9) {
      this.channels[low].feedback = (value >> 1) & 7;
      this.channels[low].additive = (value & 1) !== 0;
      return this;
    }
    return this;
  } // write

  /**
   * Which operator a register address belongs to, or -1 when it is not an
   * operator register. The eighteen operators sit in three rows of six with
   * two unused slots after each row.
   * @param {number} address - The register address, 0x00..0xFF.
   * @returns {number} The operator index 0..17, or -1.
   */
  static slotOfAddress(address) {
    var group = address & 0xE0;
    if (group !== 0x20 && group !== 0x40 && group !== 0x60 && group !== 0x80 && group !== 0xE0) return -1;
    var low = address & 0x1F;
    var row = low >> 3;
    var column = low & 7;
    if (column > 5 || row > 2) return -1;
    return row*6 + column;
  } // slotOfAddress

  /**
   * The two operators of a channel.
   * @param {number} channel - The channel index, 0..8.
   * @returns {Object[]} The modulator and the carrier, in that order.
   */
  operatorsOf(channel) {
    var slot = OPL2.SLOT_OF_CHANNEL[channel];
    var row = slot >> 3;
    var column = slot & 7;
    var first = row*6 + column;
    return [this.operators[first], this.operators[first+3]];
  } // operatorsOf

  /**
   * Starts the attack of both operators of a channel from a zero phase.
   * @param {number} channel - The channel index, 0..8.
   */
  keyOn(channel) {
    var pair = this.operatorsOf(channel);
    for (var i = 0; i < pair.length; i++) {
      pair[i].state = 'attack';
      pair[i].phase = 0;
      pair[i].counter = 0;
      // A key on with a very fast attack is already at full volume.
      if (pair[i].attack === 15) pair[i].attenuation = 0;
    }
  } // keyOn

  /**
   * Sends both operators of a channel into their release, unless they are
   * already off.
   * @param {number} channel - The channel index, 0..8.
   */
  keyOff(channel) {
    var pair = this.operatorsOf(channel);
    for (var i = 0; i < pair.length; i++) {
      if (pair[i].state !== 'off') pair[i].state = 'release';
    }
  } // keyOff

  /**
   * The five percussion voices share the last three channels (register 0xBD):
   * keys the channels on and off as the bits say.
   * @param {number} value - The value written to register 0xBD.
   */
  percussion(value) {
    var voices = [[6, 0x10], [7, 0x08], [8, 0x04], [7, 0x02], [8, 0x01]];
    for (var i = 0; i < voices.length; i++) {
      var channel = voices[i][0];
      var on = (value & voices[i][1]) !== 0;
      if (on && !this.channels[channel].keyOn) {
        this.keyOn(channel);
        this.channels[channel].keyOn = true;
      } else if (!on && this.channels[channel].keyOn) {
        this.keyOff(channel);
        this.channels[channel].keyOn = false;
      }
    }
  } // percussion

  // ------------------------------------------------------------- the sound

  /**
   * How fast the envelope of an operator walks: four steps a rate, plus the
   * key scaling, which makes high notes decay faster.
   * @param {Object} operator - The operator state record.
   * @param {Object} channel - The channel record (its `fnum` and `block`).
   * @param {number} rate - The register rate, 0..15.
   * @returns {number} The effective rate, 0..63; 0 means the envelope stands.
   */
  rateOf(operator, channel, rate) {
    if (rate === 0) return 0;
    var keyScale = (channel.block << 1) | ((channel.fnum >> 9) & 1);
    var offset = operator.ksr ? keyScale : (keyScale >> 2);
    return Math.min(63, rate*4 + offset);
  } // rateOf

  /**
   * One step of one operator's envelope.
   * @param {Object} operator - The operator state record.
   * @param {Object} channel - The channel record the operator belongs to.
   */
  stepEnvelope(operator, channel) {
    var rate = 0;
    switch (operator.state) {
      case 'attack': rate = this.rateOf(operator, channel, operator.attack); break;
      case 'decay': rate = this.rateOf(operator, channel, operator.decay); break;
      case 'release': rate = this.rateOf(operator, channel, operator.release); break;
      case 'sustain':
        // A sustaining operator holds its level; one that does not keeps
        // falling at its release rate.
        if (operator.sustaining) return;
        rate = this.rateOf(operator, channel, operator.release);
        break;
      default: return;
    }
    if (rate === 0) return;

    operator.counter++;
    var shift = 13 - (rate >> 2);
    if (shift < 0) shift = 0;
    var mask = (1 << shift) - 1;
    if ((operator.counter & mask) !== 0) return;
    var increment = OPL2.INCREMENT[rate & 3][(operator.counter >> shift) & 7];
    if (rate >= 60) increment = 4 + (rate & 3);
    if (increment === 0) return;

    if (operator.state === 'attack') {
      // The attack curves: the closer to full volume, the smaller the step.
      operator.attenuation -= ((operator.attenuation*increment) >> 3) + 1;
      if (operator.attenuation <= 0) {
        operator.attenuation = 0;
        operator.state = 'decay';
      }
      return;
    }

    operator.attenuation += increment;
    if (operator.state === 'decay') {
      // The sustain level is in steps of 3 dB, and fifteen means silence.
      var sustain = operator.sustain === 15 ? OPL2.MAX_ATTENUATION : operator.sustain*16;
      if (operator.attenuation >= sustain) {
        operator.attenuation = sustain;
        operator.state = 'sustain';
      }
    }
    if (operator.attenuation >= OPL2.MAX_ATTENUATION) {
      operator.attenuation = OPL2.MAX_ATTENUATION;
      if (operator.state === 'release' || operator.state === 'sustain') operator.state = 'off';
    }
  } // stepEnvelope

  /**
   * The four shapes an operator's sine can be cut into.
   * @param {number} shape - The waveform select, 0..3.
   * @param {number} phase - In radians.
   * @returns {number} The sample, between -1 and 1.
   */
  static waveform(shape, phase) {
    var value = Math.sin(phase);
    switch (shape) {
      case 0: return value;
      case 1: return value > 0 ? value : 0;
      case 2: return Math.abs(value);
      case 3: {
        // the first half of every half wave, the rest silence
        var quarter = (phase/(Math.PI/2)) % 4;
        return (quarter < 1 || (quarter >= 2 && quarter < 3)) ? Math.abs(value) : 0;
      }
      default: return value;
    }
  } // waveform

  /**
   * How loud an operator is right now, as a factor between 0 and 1.
   * @param {Object} operator - The operator state record.
   * @param {Object} channel - The channel record (for the key scale level).
   * @returns {number} The factor, 0 for silence.
   */
  levelOf(operator, channel) {
    var attenuation = operator.attenuation*OPL2.STEP_DB;
    attenuation += operator.totalLevel*0.75;
    if (operator.ksl) {
      // The block of the octave takes eight steps off the table's value, and
      // it is `8-block`, not `7-block` (which cost every key scaled operator
      // 1.5 dB too much until 2026-09-15).
      var ksl = OPL2.KSL_TABLE[(channel.fnum >> 6) & 0x0F] - 8*(8 - channel.block);
      if (ksl > 0) attenuation += (ksl*0.75)/(1 << (OPL2.KSL_SHIFT[operator.ksl] === 8 ? 8 : OPL2.KSL_SHIFT[operator.ksl]));
    }
    if (operator.tremolo) {
      // the tremolo moves every sample, so this one cannot be kept
      attenuation += this.tremoloDepth*0.5*(1 + Math.sin(this.tremoloPhase));
      return attenuation >= 96 ? 0 : Math.pow(10, -attenuation/20);
    }
    // Decibels into a factor is a power of ten, and the decibels only change
    // when the envelope steps - which is once in up to eight thousand
    // samples. Keeping the last one is the same number, not a near one.
    if (attenuation !== operator.levelKey) {
      operator.levelKey = attenuation;
      operator.levelValue = attenuation >= 96 ? 0 : Math.pow(10, -attenuation/20);
    }
    return operator.levelValue;
  } // levelOf

  /**
   * How far an operator's phase moves in one step of the chip.
   *
   * The pitch of a channel is `fnum · rate / 2^(20−block)`, where the rate is
   * the chip's own 49716 samples a second — **not** its 3.58 MHz clock. One
   * step of the chip is one of those samples, so the phase moves by
   * `2π · fnum · 2^block / 2^20` times the operator's multiple, and the sample
   * rate cancels out.
   * @param {Object} operator - The operator state record.
   * @param {Object} channel - The channel record (its `fnum` and `block`).
   * @returns {number} The phase step in radians.
   */
  phaseStepOf(operator, channel) {
    var fnum = channel.fnum;
    if (operator.vibrato) {
      // a few cents up and down, seven times a second
      fnum += fnum*(this.vibratoDepth/1200)*Math.sin(this.vibratoPhase)/100;
    }
    return 2*Math.PI*fnum*OPL2.POWER_OF_TWO[channel.block]/OPL2.F_NUMBER_SCALE*operator.multiple;
  } // phaseStepOf

  /**
   * The pitch of a channel in hertz, for the tools.
   * @param {Object} channel - The channel record (its `fnum` and `block`).
   * @returns {number} Hertz, before the operators' multiples.
   */
  frequencyOf(channel) {
    return channel.fnum*OPL2.SAMPLE_RATE/(OPL2.F_NUMBER_SCALE/OPL2.POWER_OF_TWO[channel.block]);
  } // frequencyOf

  /**
   * Renders samples.
   * @param {Float32Array} out - Where they go.
   * @param {number} count - How many.
   * @param {number} [gain=1] - A factor on the way out.
   * @returns {Float32Array} `out`.
   */
  render(out, count, gain) {
    var volume = gain === undefined ? 1 : gain;
    for (var i = 0; i < count; i++) {
      // The chip runs at its own 49716 Hz. At another output rate it takes
      // `step` of its own steps for one sample - and that is a fraction, so
      // what is left over has to be carried into the next sample. Rounding it
      // up instead (which is what a `while` plus an `if` does) makes the chip
      // run at twice its rate: every note comes out an octave high and out of
      // tune with itself.
      this.fraction += this.step;
      while (this.fraction >= 1) {
        this.last = this.stepChip();
        this.fraction -= 1;
      }
      var value = this.last;
      if (this.lowPass) {
        // a one pole filter, the simplest stand-in for the card's output stage
        var alpha = this.alphaOf(this.lowPass);
        this.filtered += alpha*(value - this.filtered);
        value = this.filtered;
      }
      out[i] = Math.max(-1, Math.min(1, value*volume));
    }
    return out;
  } // render

  /**
   * The coefficient of the output filter. It depends on nothing that changes
   * while a sound plays, so it is worked out once and kept — an exponential
   * on every sample of every render is a tenth of the chip's time.
   * @param {number} cutoff - In hertz.
   * @returns {number} The coefficient, between 0 and 1.
   */
  alphaOf(cutoff) {
    if (this.alphaCutoff !== cutoff) {
      this.alphaCutoff = cutoff;
      this.alpha = 1 - Math.exp(-2*Math.PI*cutoff/this.sampleRate);
    }
    return this.alpha;
  } // alphaOf

  /**
   * One step of the whole chip at its own 49716 Hz.
   * @returns {number} The sum of its channels, before the output filter.
   */
  stepChip() {
    this.tremoloPhase += 2*Math.PI*3.7/OPL2.SAMPLE_RATE;
    this.vibratoPhase += 2*Math.PI*6.1/OPL2.SAMPLE_RATE;
    // the noise the percussion voices use, a plain shift register
    this.noise = ((this.noise >> 1) ^ ((this.noise & 1) ? 0x800302 : 0)) >>> 0;

    var sum = 0;
    for (var c = 0; c < OPL2.CHANNELS; c++) {
      var channel = this.channels[c];
      var pair = this.operatorsOf(c);
      var modulator = pair[0];
      var carrier = pair[1];

      this.stepEnvelope(modulator, channel);
      this.stepEnvelope(carrier, channel);

      // The phase is kept inside one turn. Letting it run on looks harmless
      // and is not: after a few seconds it is in the tens of millions of
      // radians, where a double has no precision left for the fraction of a
      // turn that is the actual phase - the tone drifts out of tune and turns
      // to noise (reported by the operator 2026-09-14).
      modulator.phase = (modulator.phase + this.phaseStepOf(modulator, channel)) % OPL2.TURN;
      carrier.phase = (carrier.phase + this.phaseStepOf(carrier, channel)) % OPL2.TURN;

      // Feedback: the modulator hears the average of its own last two
      // outputs. The seven settings of the chip are modulation indices of
      // pi/16, pi/8, pi/4, pi/2, pi, 2pi and 4pi - that is `pi · 2^(fb−5)`.
      // Twice that (which is what an extra factor of two does) turns the
      // higher settings into noise.
      var feedback = 0;
      if (channel.feedback) {
        feedback = (channel.previous[0] + channel.previous[1])/2*Math.PI*Math.pow(2, channel.feedback-5);
      }
      var modulatorOut = OPL2.waveform(modulator.waveform, modulator.phase + feedback)*this.levelOf(modulator, channel);
      channel.previous[1] = channel.previous[0];
      channel.previous[0] = modulatorOut;

      var carrierOut;
      if (channel.additive) {
        carrierOut = OPL2.waveform(carrier.waveform, carrier.phase)*this.levelOf(carrier, channel) + modulatorOut;
      } else {
        carrierOut = OPL2.waveform(carrier.waveform, carrier.phase + modulatorOut*OPL2.TURN*OPL2.FM_INDEX)*this.levelOf(carrier, channel);
      }
      sum += carrierOut;
    }
    // nine channels at once would clip; the chip's own output is mixed down
    return sum/9;
  } // stepChip

} // OPL2

export default OPL2;
