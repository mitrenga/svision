// begin code

/**
 * Building blocks of the **discrete sound boards** of the arcade era — the
 * TTL and op-amp circuits that sat next to a sound chip (Battlezone,
 * Asteroids, Lunar Lander …) and made the noises no chip could: a shift
 * register for noise, a capacitor charged through a resistor for an
 * envelope, an op-amp with a capacitor in its feedback for a filter. The
 * MAME `discrete` library models the same parts; the netlists there
 * (`bzone_a.cpp` …) name them, and these are the few needed so far, written
 * from the circuits.
 *
 * Everything is a sample-domain step: a block is made for a time step `dt`
 * and `step()` takes the inputs of one sample and returns the output. No
 * DOM, no Web Audio: a board model made of these renders the same samples in
 * a tool under Node and in the player's browser (R-001).
 */

/**
 * A **linear feedback shift register** — a chain of 74LS164 shift registers
 * with an XOR of two taps fed back into the first bit, the classic TTL noise
 * source. `taps` are the bit numbers XORed, `invert` puts a NOT after the XOR
 * (so that a register of zeros starts on its own), `output` is the bit read.
 * The whole register is exposed for circuits that decode more of it
 * (Battlezone NANDs bits 11–14 for its explosion noise).
 */
export class LFSRNoise {

  /**
   * @param {number} bits - The register length.
   * @param {number[]} taps - The two bits XORed for the feedback.
   * @param {boolean} invert - Whether the feedback is inverted.
   * @param {number} output - The bit taken as the output.
   */
  constructor(bits, taps, invert, output) {
    this.id = 'LFSRNoise';
    this.bits = bits;
    this.mask = bits >= 32 ? 0xFFFFFFFF : (1 << bits)-1;
    this.taps = taps;
    this.invert = invert;
    this.output = output;
    this.register = 0;
  } // constructor

  /**
   * One clock: shifts and returns the output bit.
   * @returns {number} 0 or 1.
   */
  step() {
    var feedback = ((this.register >> this.taps[0]) ^ (this.register >> this.taps[1])) & 1;
    if (this.invert) {
      feedback ^= 1;
    }
    this.register = ((this.register << 1) | feedback) & this.mask;
    return (this.register >> this.output) & 1;
  } // step

  /**
   * The output bit as it stands.
   * @returns {number} 0 or 1.
   */
  get bit() {
    return (this.register >> this.output) & 1;
  } // bit

} // LFSRNoise

/**
 * A clock at a rate below the sample rate, with the rising edges counted
 * for a divide-by-two flip-flop: `step()` returns how many clock edges fell
 * into the sample (0 or 1 while the rate is under the sample rate).
 */
export class Clock {

  /**
   * @param {number} rate - The clock rate in Hz.
   * @param {number} dt - The time step in seconds.
   */
  constructor(rate, dt) {
    this.id = 'Clock';
    this.increment = rate*dt;
    this.phase = 0;
  } // constructor

  /**
   * @returns {number} The number of edges in this sample.
   */
  step() {
    this.phase += this.increment;
    var edges = Math.floor(this.phase);
    this.phase -= edges;
    return edges;
  } // step

} // Clock

/**
 * A **one-pole RC low-pass** (a resistor into a capacitor to ground, or an
 * op-amp with a capacitor across its feedback resistor): the output follows
 * the input with the time constant `tau`.
 */
export class Lowpass {

  /**
   * @param {number} tau - R·C in seconds.
   * @param {number} dt - The time step in seconds.
   */
  constructor(tau, dt) {
    this.id = 'Lowpass';
    this.exp = 1-Math.exp(-dt/tau);
    this.value = 0;
  } // constructor

  /**
   * @param {number} input
   * @returns {number} The output.
   */
  step(input) {
    this.value += (input-this.value)*this.exp;
    return this.value;
  } // step

} // Lowpass

/**
 * A **one-pole RC high-pass** — a coupling capacitor into a resistor: what
 * every mixer had on its way to the amplifier, removing the DC the circuits
 * sit on.
 */
export class Highpass {

  /**
   * @param {number} tau - R·C in seconds.
   * @param {number} dt - The time step in seconds.
   */
  constructor(tau, dt) {
    this.id = 'Highpass';
    this.alpha = tau/(tau+dt);
    this.lastInput = 0;
    this.value = 0;
  } // constructor

  /**
   * @param {number} input
   * @returns {number} The output.
   */
  step(input) {
    this.value = this.alpha*(this.value+input-this.lastInput);
    this.lastInput = input;
    return this.value;
  } // step

} // Highpass

/**
 * The **gated RC circuit** of Battlezone's shell and explosion (MAME
 * `DISCRETE_RC_CIRCUIT_1`): a CD4066 switch closed by the trigger bit
 * charges a capacitor almost at once (through the switch's 270 Ω), a
 * resistor discharges it slowly, and a noise bit switches the capacitor's
 * voltage to the output — so the output is the noise, chopped, under an
 * envelope that jumps up with the trigger and decays after it with `r·c`
 * (108 ms for the shell, 230 ms for the explosion).
 *
 *  - trigger 1, noise 0: the capacitor charges toward `vCharge` through the switch, the output is 0
 *  - trigger 1, noise 1: it charges, and the output is its voltage
 *  - trigger 0, noise 1: it discharges through `r`, and the output is its voltage
 *  - trigger 0, noise 0: it holds, the output is 0
 */
export class GatedRC {

  /**
   * @param {number} r - The discharge resistor in ohms.
   * @param {number} c - Farads.
   * @param {number} vSupply - The voltage behind the switch (5 V).
   * @param {number} dt - The time step in seconds.
   */
  constructor(r, c, vSupply, dt) {
    this.id = 'GatedRC';
    var rOn = 270;
    this.expCharge = 1-Math.exp(-dt/(rOn*c));
    this.expBoth = 1-Math.exp(-dt/(((rOn*r)/(rOn+r))*c));
    this.expDischarge = 1-Math.exp(-dt/(r*c));
    this.vCharge = vSupply*r/(rOn+r);
    this.vCap = 0;
  } // constructor

  /**
   * @param {number} trigger - The gate bit.
   * @param {number} noise - The noise bit.
   * @returns {number} Volts.
   */
  step(trigger, noise) {
    if (trigger) {
      this.vCap += (this.vCharge-this.vCap)*(noise ? this.expBoth : this.expCharge);
    } else if (noise) {
      this.vCap -= this.vCap*this.expDischarge;
    }
    return noise ? this.vCap : 0;
  } // step

} // GatedRC

/**
 * The **op-amp low-pass with a switched gain** on Battlezone's shell and
 * explosion (MAME `bzone_custom_filter`): the input comes through a divider
 * (`r3`, `r4`), a CD4066 shorts `r1` for the loud setting, and the feedback
 * `r5` with `c` across it makes the stage a one-pole low-pass of gain
 * `1 + r5/(r1 + r2)` (soft) or `1 + r5/(270 Ω ∥ r1 + r2)` (loud), clipped at
 * the op-amp's rail.
 */
export class SwitchedGainLowpass {

  /**
   * @param {Object} r - `{r1, r2, r3, r4, r5}` in ohms.
   * @param {number} c - The feedback capacitor in farads.
   * @param {number} vRail - The op-amp's supply; the output clips 1.5 V under it.
   * @param {number} dt - The time step in seconds.
   */
  constructor(r, c, vRail, dt) {
    this.id = 'SwitchedGainLowpass';
    var rOn = 270;                                        // a CD4066 switch, on
    this.gain = [
      r.r5/(r.r1+r.r2)+1,
      r.r5/((rOn*r.r1)/(rOn+r.r1)+r.r2)+1
    ];
    this.inputGain = r.r4/(r.r3+r.r4);
    this.vMax = vRail-1.5;
    this.lowpass = new Lowpass(r.r5*c, dt);
  } // constructor

  /**
   * @param {number} loud - The gain switch bit.
   * @param {number} input - Volts.
   * @returns {number} Volts.
   */
  step(loud, input) {
    var v = input*this.inputGain*this.gain[loud ? 1 : 0];
    if (v > this.vMax) {
      v = this.vMax;
    } else if (v < 0) {
      v = 0;
    }
    return this.lowpass.step(v);
  } // step

} // SwitchedGainLowpass

/**
 * A **resistor mixer**: each input through its resistor into a summing node
 * with a resistor to ground — the weights are the conductances over the total.
 * @param {number[]} resistors - The input resistors in ohms.
 * @param {number} rGround - The resistor from the node to ground (0 for none).
 * @returns {number[]} The weight of each input.
 */
export function mixerWeights(resistors, rGround) {
  var total = rGround > 0 ? 1/rGround : 0;
  var conductances = resistors.map((r) => 1/r);
  conductances.forEach((g) => { total += g; });
  return conductances.map((g) => g/total);
} // mixerWeights

/**
 * An **R-1 resistor ladder DAC** with a bias resistor, a resistor to ground
 * and a smoothing capacitor (MAME `DISCRETE_DAC_R1`): each bit of the data
 * drives its resistor with `vData` (a CMOS/TTL high) or 0 V, `rBias` pulls
 * the node to `vBias`, `rGnd` to ground — the node voltage is the Millman
 * sum of the currents over the parallel resistance, then the capacitor
 * smooths a change with `rTotal·c`. Asteroids' thump: four bits (220 k,
 * 100 k, 47 k, 22 k), 6.8 k to 4.3 V, 47 k to ground, 10 nF.
 */
export class LadderDAC {

  /**
   * @param {number[]} resistors - The ladder, bit 0 first, in ohms (0 = out of circuit).
   * @param {number} vData - Volts of a bit that is on.
   * @param {number} vBias - Volts behind `rBias`.
   * @param {number} rBias - Ohms (0 for none).
   * @param {number} rGnd - Ohms to ground (0 for none).
   * @param {number} c - The smoothing capacitor in farads (0 for none).
   * @param {number} dt - The time step in seconds.
   */
  constructor(resistors, vData, vBias, rBias, rGnd, c, dt) {
    this.id = 'LadderDAC';
    var g = 0;
    resistors.forEach((r) => { if (r > 0) { g += 1/r; } });
    if (rBias > 0) {
      g += 1/rBias;
    }
    if (rGnd > 0) {
      g += 1/rGnd;
    }
    var rTotal = 1/g;
    var iBias = rBias > 0 ? vBias/rBias : 0;
    var count = 1 << resistors.length;
    /** the node voltage of every data value */
    this.steps = new Float64Array(count);
    for (var d = 0; d < count; d++) {
      var i = iBias;
      for (var bit = 0; bit < resistors.length; bit++) {
        if (((d >> bit) & 1) && resistors[bit] > 0) {
          i += vData/resistors[bit];
        }
      }
      this.steps[d] = i*rTotal;
    }
    this.exp = c > 0 ? 1-Math.exp(-dt/(rTotal*c)) : 1;
    this.value = 0;
  } // constructor

  /**
   * @param {number} data - The bits.
   * @returns {number} Volts.
   */
  step(data) {
    var v = this.steps[data & (this.steps.length-1)];
    this.value += (v-this.value)*this.exp;
    return this.value;
  } // step

} // LadderDAC

/**
 * A **555 charged by a constant current source** — a VCO when the current
 * follows a control voltage (MAME `DISCRETE_555_CC`, the type with only a
 * discharge resistor, as Asteroids' thump: a PNP off the DAC's voltage
 * charges the timing capacitor, `i = (Vcc − (Vin + Vbe))/r`, so a higher
 * control voltage means a lower pitch). The capacitor climbs linearly to
 * the threshold (2/3 Vcc) and is then discharged through `rDischarge`
 * toward `i·rDischarge` (`toCap`: the source stays connected — "Asteroids
 * special case" in MAME) or toward 0, until the trigger (1/3 Vcc). The
 * output is the square wave, 0 or `Vcc − 1.2`, centred when `ac`; the
 * cycle boundaries are placed within the sample as MAME does. Reset
 * (enable low) holds the capacitor at 0 and the output at 0. Two
 * pathological cases are the circuit's own: a control voltage under which
 * the capacitor cannot reach the threshold stops the oscillation high, one
 * under which the discharge cannot reach the trigger stops it low.
 */
export class CC555 {

  /**
   * @param {Object} p - `{r, c, rDischarge, vPos, vbe, toCap, ac}`: the source's resistor, the timing capacitor, the discharge resistor, the supply, the junction drop, the two options.
   * @param {number} dt - The time step in seconds.
   */
  constructor(p, dt) {
    this.id = 'CC555';
    this.dt = dt;
    this.r = p.r;
    this.c = p.c;
    this.rDischarge = p.rDischarge;
    this.vPos = p.vPos;
    this.vbe = p.vbe || 0;
    this.toCap = !!p.toCap;
    this.vHigh = this.vPos-1.2;
    this.acShift = p.ac ? -this.vHigh/2 : 0;
    this.threshold = this.vPos*2/3;
    this.trigger = this.vPos/3;
    this.tauDischarge = this.rDischarge*this.c;
    this.tauBleed = 10e6*this.c;                          // DEFAULT_555_BLEED_R
    this.flipFlop = 1;
    this.vCap = 0;
  } // constructor

  /**
   * @param {number|boolean} enable - Low = reset.
   * @param {number} vIn - The control voltage.
   * @returns {number} Volts.
   */
  step(enable, vIn) {
    if (!enable) {
      this.flipFlop = 1;
      this.vCap = 0;
      return 0;
    }
    var dt = this.dt, vCap = this.vCap, ff = this.flipFlop;
    var limit = vIn+this.vbe;                              // the most the source can charge the cap to
    var i = (this.vPos-limit)/this.r;
    if (i < 0) {
      i = 0;
    }
    var vi = i*this.rDischarge;
    var countF = 0, countR = 0, guard = 0;
    do {
      var next;
      if (ff) {
        if (i == 0) {
          vCap -= vCap*(1-Math.exp(-dt/this.tauBleed));
          dt = 0;
        } else {
          next = vCap+i*dt/this.c;
          if (next > limit) {
            next = limit;
          }
          dt = 0;
          if (next >= this.threshold) {
            dt = this.c*(next-this.threshold)/i;           // the overshoot's time
            next = this.threshold;
            ff = 0;
            countF++;
          }
          vCap = next;
        }
      } else {
        var e = 1-Math.exp(-dt/this.tauDischarge);
        if (this.toCap) {
          var v = vCap < limit ? vi : limit;
          next = vCap+(v-vCap)*e;
        } else {
          next = vCap-vCap*e;
        }
        var before = vCap;
        dt = 0;
        if (next <= this.trigger) {
          dt = this.tauDischarge*Math.log(1/(1-((this.trigger-next)/before)));
          next = this.trigger;
          ff = 1;
          countR++;
        }
        vCap = next;
      }
    } while (dt > 0 && ++guard < 64);
    var out;
    if (countF+countR >= 2) {
      out = this.flipFlop ? 0 : this.vHigh;                 // force at least one toggle
    } else {
      out = ff*this.vHigh;
    }
    this.flipFlop = ff;
    this.vCap = vCap;
    return out+this.acShift;
  } // step

} // CC555

/**
 * A **triangle wave** by a phase accumulator (MAME `DISCRETE_TRIANGLEWAVE`;
 * a 566 or a 555 with its capacitor's voltage taken as the output): the
 * frequency is an input, so a slow one can warble a fast one — Asteroids'
 * saucer. The phase turns whether enabled or not; disabled, the output is 0.
 */
export class TriangleWave {

  /**
   * @param {number} dt - The time step in seconds.
   * @param {number} [phase] - The starting phase in degrees.
   */
  constructor(dt, phase) {
    this.id = 'TriangleWave';
    this.dt = dt;
    this.phase = ((phase || 0)/360*2*Math.PI) % (2*Math.PI);
  } // constructor

  /**
   * @param {number|boolean} enable
   * @param {number} freq - Hz.
   * @param {number} amp - Peak to peak.
   * @param {number} bias - The DC offset.
   * @returns {number}
   */
  step(enable, freq, amp, bias) {
    var out = 0;
    if (enable) {
      var p = this.phase;
      out = (p < Math.PI ? amp*(p/(Math.PI/2)-1) : amp*(3-p/(Math.PI/2)))/2+bias;
    }
    this.phase = (this.phase+2*Math.PI*freq*this.dt) % (2*Math.PI);
    return out;
  } // step

} // TriangleWave

/**
 * A **square wave** with a frequency and a duty cycle as inputs (MAME
 * `DISCRETE_SQUAREWAVE`: a phase accumulator, the output high for the last
 * `duty` per cent of the cycle) — a 555 whose timing changes while it
 * runs, as Asteroids' shots. A duty over 100 leaves the output high.
 */
export class SquareWave {

  /**
   * @param {number} dt - The time step in seconds.
   * @param {number} [phase] - The starting phase in degrees.
   */
  constructor(dt, phase) {
    this.id = 'SquareWave';
    this.dt = dt;
    this.phase = ((phase || 0)/360*2*Math.PI) % (2*Math.PI);
  } // constructor

  /**
   * @param {number|boolean} enable
   * @param {number} freq - Hz.
   * @param {number} amp - Peak to peak.
   * @param {number} duty - Per cent high.
   * @param {number} bias - The DC offset.
   * @returns {number}
   */
  step(enable, freq, amp, duty, bias) {
    var out = 0;
    if (enable) {
      var trigger = (100-duty)/100*2*Math.PI;
      out = (this.phase > trigger ? amp/2 : -amp/2)+bias;
    }
    this.phase = (this.phase+2*Math.PI*freq*this.dt) % (2*Math.PI);
    return out;
  } // step

} // SquareWave

/**
 * A **square wave from a clock divider** (MAME `DISCRETE_SQUAREWFIX`): the
 * on and off times are kept as times, so a fixed frequency comes out
 * exact whatever the sample rate — the 3 kHz of Asteroids' extra-ship
 * tone, the explosion's pitch clock (12 kHz over a counter: high for one
 * clock, low for the rest). The output is `±amp/2 + bias`, 0 when disabled;
 * the phase turns on regardless.
 */
export class FixedSquare {

  /**
   * @param {number} freq - Hz.
   * @param {number} duty - Per cent high.
   * @param {number} dt - The time step in seconds.
   */
  constructor(freq, duty, dt) {
    this.id = 'FixedSquare';
    this.dt = dt;
    this.flipFlop = 1;
    this.setTiming(freq, duty);
    this.tLeft = this.tOn;
  } // constructor

  /**
   * @param {number} freq - Hz.
   * @param {number} duty - Per cent high.
   */
  setTiming(freq, duty) {
    this.tOff = 1/freq;
    this.tOn = this.tOff*(duty/100);
    this.tOff -= this.tOn;
  } // setTiming

  /**
   * @param {number|boolean} enable
   * @param {number} amp - Peak to peak.
   * @param {number} bias - The DC offset.
   * @returns {number}
   */
  step(enable, amp, bias) {
    this.tLeft -= this.dt;
    while (this.tLeft <= 0) {
      this.flipFlop = this.flipFlop ? 0 : 1;
      this.tLeft += this.flipFlop ? this.tOn : this.tOff;
    }
    return enable ? (this.flipFlop ? amp/2 : -amp/2)+bias : 0;
  } // step

} // FixedSquare

/**
 * A **sample and hold** clocked on the rising edge (MAME `DISCRETE_SAMPLHOLD`
 * with `REDGE`): a D latch taking the input whenever the clock goes up.
 */
export class SampleHold {

  /**
   * Starts empty: the held value is 0 and the first clock sample counts as
   * a rising edge.
   */
  constructor() {
    this.id = 'SampleHold';
    this.value = 0;
    this.lastClock = -1;
  } // constructor

  /**
   * @param {number} input
   * @param {number} clock
   * @returns {number} The held value.
   */
  step(input, clock) {
    if (clock > this.lastClock) {
      this.value = input;
    }
    this.lastClock = clock;
    return this.value;
  } // step

} // SampleHold

/**
 * A **ramp with clamps** (MAME `DISCRETE_RAMP`): while enabled, the output
 * starts at `start` and moves by `gradient` a second toward `end`, where it
 * stays; disabled, it sits at `clamp`. The frequency of a 555 pulled down
 * by a discharging capacitor — Asteroids' shots fall from 820 to 110 Hz in
 * 0.28 s.
 */
export class Ramp {

  /**
   * @param {number} gradient - Units a second (the sign is the direction's).
   * @param {number} start
   * @param {number} end
   * @param {number} clamp - The output while disabled.
   * @param {number} dt - The time step in seconds.
   */
  constructor(gradient, start, end, clamp, dt) {
    this.id = 'Ramp';
    this.step_ = gradient*dt;
    this.start = start;
    this.end = end;
    this.clamp = clamp;
    this.up = end >= start;
    this.value = clamp;
    this.wasEnabled = false;
  } // constructor

  /**
   * @param {number|boolean} enable
   * @param {number|boolean} forward - Ramps toward `end` (else back toward `start`).
   * @returns {number}
   */
  step(enable, forward) {
    if (!enable) {
      this.wasEnabled = false;
      this.value = this.clamp;
      return this.value;
    }
    if (!this.wasEnabled) {
      this.wasEnabled = true;
      this.value = this.start;
    }
    var toward = this.up ? forward : !forward;
    this.value += toward ? this.step_ : -this.step_;
    if (this.up ? this.value < this.start : this.value > this.start) {
      this.value = this.start;
    }
    if (this.up ? this.value > this.end : this.value < this.end) {
      this.value = this.end;
    }
    return this.value;
  } // step

} // Ramp

/**
 * An **RC discharge from a trigger** (MAME `DISCRETE_RCDISC`): the output
 * is the input times `exp(−t/RC)`, `t` running from the moment the enable
 * went high; 0 while it is low. The fading amplitude of a shot.
 */
export class RCDischarge {

  /**
   * @param {number} r - Ohms.
   * @param {number} c - Farads.
   * @param {number} dt - The time step in seconds.
   */
  constructor(r, c, dt) {
    this.id = 'RCDischarge';
    this.dt = dt;
    this.tau = r*c;
    this.t = 0;
    this.running = false;
  } // constructor

  /**
   * @param {number|boolean} enable
   * @param {number} input - The starting amplitude.
   * @returns {number}
   */
  step(enable, input) {
    if (!enable) {
      this.running = false;
      return 0;
    }
    if (!this.running) {
      this.running = true;
      this.t = 0;
      return 0;
    }
    var out = input*Math.exp(-this.t/this.tau);
    this.t += this.dt;
    return out;
  } // step

} // RCDischarge

/**
 * The bilinear transform's warped cutoff, shared by the two filters.
 * @param {number} fc - Hz.
 * @param {number} rate - Samples a second.
 * @returns {number} Radians a second.
 */
function warpedCutoff(fc, rate) {
  return rate*2*Math.tan(Math.PI*fc/rate);
} // warpedCutoff

/**
 * A **first-order active filter** (MAME `DISCRETE_FILTER1`: an op-amp
 * low-pass or high-pass at `fc`, as an IIR by the bilinear transform with
 * pre-warping).
 */
export class Filter1 {

  /**
   * @param {number} fc - Hz.
   * @param {string} type - 'lowpass' | 'highpass'
   * @param {number} dt - The time step in seconds.
   */
  constructor(fc, type, dt) {
    this.id = 'Filter1';
    var rate = 1/dt;
    var wc = warpedCutoff(fc, rate);
    var twoOverT = 2*rate;
    var den = wc+twoOverT;
    this.a1 = (wc-twoOverT)/den;
    if (type == 'highpass') {
      this.b0 = twoOverT/den;
      this.b1 = -this.b0;
    } else {
      this.b0 = this.b1 = wc/den;
    }
    this.x1 = 0;
    this.y1 = 0;
  } // constructor

  /**
   * @param {number} input
   * @returns {number}
   */
  step(input) {
    var out = -this.a1*this.y1+this.b0*input+this.b1*this.x1;
    this.x1 = input;
    this.y1 = out;
    return out;
  } // step

} // Filter1

/**
 * A **second-order filter** (MAME `DISCRETE_FILTER2`: low-pass, band-pass or
 * high-pass at `fc` with the damping `d = 1/Q`, the prototypes of
 * Lancaster's Active-Filter Cookbook through the bilinear transform with
 * pre-warping) — the Sallen-Key band-pass at 89.5 Hz, Q 7.6, of Asteroids'
 * thrust.
 */
export class Filter2 {

  /**
   * @param {number} fc - Hz.
   * @param {number} damp - 1/Q.
   * @param {string} type - 'lowpass' | 'bandpass' | 'highpass'
   * @param {number} dt - The time step in seconds.
   */
  constructor(fc, damp, type, dt) {
    this.id = 'Filter2';
    var rate = 1/dt;
    var wc = warpedCutoff(fc, rate);
    var wc2 = wc*wc;
    var twoOverT = 2*rate;
    var twoOverT2 = twoOverT*twoOverT;
    var den = twoOverT2+damp*wc*twoOverT+wc2;
    this.a1 = 2*(-twoOverT2+wc2)/den;
    this.a2 = (twoOverT2-damp*wc*twoOverT+wc2)/den;
    if (type == 'bandpass') {
      this.b0 = damp*wc*twoOverT/den;
      this.b1 = 0;
      this.b2 = -this.b0;
    } else if (type == 'highpass') {
      this.b0 = this.b2 = twoOverT2/den;
      this.b1 = -2*this.b0;
    } else {
      this.b0 = this.b2 = wc2/den;
      this.b1 = 2*this.b0;
    }
    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
  } // constructor

  /**
   * @param {number} input
   * @returns {number}
   */
  step(input) {
    var out = -this.a1*this.y1-this.a2*this.y2+this.b0*input+this.b1*this.x1+this.b2*this.x2;
    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = out;
    return out;
  } // step

} // Filter2
