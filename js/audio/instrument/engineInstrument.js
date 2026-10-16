const { AbstractInstrument } = await import('./abstractInstrument.js?ver='+window.srcVersion);
// begin code

/**
 * The **engine** of the discrete sound boards: a 555 astable whose frequency
 * a control voltage moves between two states, clocking two 4-bit counters
 * that are preset to different counts, so that they divide by different
 * numbers (Battlezone: 4→15 = ÷12 and 6→15 = ÷10) and their top bits and
 * carries, mixed through equal resistors into a capacitor, beat against
 * each other — the rumble of a tank, the whine of a car. The control
 * voltage moves through an RC, so the engine revs up and settles rather
 * than jumps; Battlezone's revs up fast (the RC through a diode) and
 * settles slowly.
 *
 * A live instrument: `play()` starts it and it runs until the score stops;
 * the game moves it with `control('rev', 0|1)` (`AudioOscillatorHandler.
 * controlInstrument`), and the frequencies glide to the new state with the
 * descriptor's time constants. There is no note and no pitch — the score
 * gives it one note of any duration.
 *
 * Descriptor (all fields optional but the class):
 *   {
 *     class: 'EngineInstrument',
 *     clock: {idle: 353, rev: 833},            // the 555 in Hz at the two states
 *     glide: {up: 0.18, down: 1.0},            // seconds: the RC time constant revving up and settling down
 *     dividers: [{min: 4, max: 15}, {min: 6, max: 15}],   // the counters: preset and top count
 *     attack: 0.2,                             // seconds the engine takes to come up when it starts
 *     filter: {type: 'lowpass', freq: 71, Q: 0.5},        // the mixing capacitor (AbstractInstrument)
 *     gain: 0.3
 *   }
 *
 * The counters' waveforms are exact: over one period of `max - min + 1`
 * clocks the top bit (QD) is high for the counts 8 and up and the carry for
 * the last count, each into a resistor of the same value, so the sum is a
 * staircase 0 / 1 / 2 — built as a PeriodicWave from its Fourier series
 * (`EngineInstrument.waveform`, pure arithmetic a tool can check).
 */
export class EngineInstrument extends AbstractInstrument {

  /**
   * @param {AudioContext} ctx - The shared AudioContext.
   * @param {AudioNode} output - The node this instrument feeds into.
   * @param {Object} descriptor - The instrument descriptor (see the class note).
   */
  constructor(ctx, output, descriptor) {
    super(ctx, output, descriptor);
    this.clock = Object.assign({idle: 353, rev: 833}, descriptor.clock || {});
    this.glide = Object.assign({up: 0.18, down: 1.0}, descriptor.glide || {});
    this.dividers = descriptor.dividers || [{min: 4, max: 15}, {min: 6, max: 15}];
    this.attack = ('attack' in descriptor) ? descriptor.attack : 0.2;
    this.waves = this.dividers.map((d) => {
      var w = EngineInstrument.waveform(d.min, d.max, 32);
      return ctx.createPeriodicWave(w.real, w.imag, {disableNormalization: true});
    });
    this.voices = null;
    this.rev = 0;
  } // constructor

  /**
   * The Fourier series of a counter's output: over the period of
   * `max - min + 1` counts, the top bit adds 1 for every count of 8 and up
   * and the carry adds 1 for the last count.
   * @param {number} min - The preset count.
   * @param {number} max - The top count (15 for a 4-bit counter).
   * @param {number} harmonics - How many harmonics to keep.
   * @returns {{real: Float32Array, imag: Float32Array, period: number}} The coefficients, index 0 the DC term.
   */
  static waveform(min, max, harmonics) {
    var period = max-min+1;
    var levels = [];
    for (var count = min; count <= max; count++) {
      levels.push(((count & 8) ? 1 : 0)+(count === max ? 1 : 0));
    }
    var real = new Float32Array(harmonics+1);
    var imag = new Float32Array(harmonics+1);
    var dc = 0;
    levels.forEach((v) => { dc += v; });
    real[0] = dc/period;
    for (var n = 1; n <= harmonics; n++) {
      var a = 0, b = 0;
      for (var k = 0; k < period; k++) {
        var p1 = k/period, p2 = (k+1)/period;
        // ∫ v·cos(2πnφ) dφ and ∫ v·sin(2πnφ) dφ over the slot, times 2
        a += levels[k]*(Math.sin(2*Math.PI*n*p2)-Math.sin(2*Math.PI*n*p1))/(Math.PI*n);
        b += levels[k]*(Math.cos(2*Math.PI*n*p1)-Math.cos(2*Math.PI*n*p2))/(Math.PI*n);
      }
      real[n] = a;
      imag[n] = b;
    }
    return {real: real, imag: imag, period: period};
  } // waveform

  /**
   * The frequency of a counter's output at a 555 frequency.
   * @param {number} clock - The 555 in Hz.
   * @param {number} index - Which counter.
   * @returns {number} Hz.
   */
  frequency(clock, index) {
    var d = this.dividers[index];
    return clock/(d.max-d.min+1);
  } // frequency

  /**
   * Starts the engine (once: a second note while it runs is ignored): one
   * oscillator per counter at the idle state, coming up over `attack`.
   * @param {number} time - Start time on the AudioContext clock.
   * @param {number|string} pitch - Ignored.
   * @param {number} duration - Ignored: the engine runs until the score stops.
   * @param {number} [vol] - Per-note volume multiplier 0..1.
   */
  play(time, pitch, duration, vol) {
    if (this.voices !== null) {
      return;
    }
    var peak = Math.max(0.0001, this.gainLevel*((vol == null) ? 1 : vol));
    var gain = this.ctx.createGain();
    gain.gain.value = 0.0;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time+this.attack);
    gain.connect(this.input);
    var clock = this.rev ? this.clock.rev : this.clock.idle;
    var oscillators = this.waves.map((wave, i) => {
      var oscillator = this.ctx.createOscillator();
      oscillator.setPeriodicWave(wave);
      oscillator.frequency.value = this.frequency(clock, i);
      oscillator.connect(gain);
      oscillator.start(time);
      return oscillator;
    });
    this.voices = {gain: gain, oscillators: oscillators};
  } // play

  /**
   * Live control: `rev` (0 idle, 1 revving) glides the 555 to the other
   * state; `volume` is the base class's.
   * @param {string} name - The control.
   * @param {number} value - Its value.
   */
  control(name, value) {
    if (name !== 'rev') {
      super.control(name, value);
      return;
    }
    this.rev = value ? 1 : 0;
    if (this.voices === null) {
      return;
    }
    var clock = this.rev ? this.clock.rev : this.clock.idle;
    var tau = this.rev ? this.glide.up : this.glide.down;
    var now = this.ctx.currentTime;
    this.voices.oscillators.forEach((oscillator, i) => {
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.setTargetAtTime(this.frequency(clock, i), now, tau);
    });
  } // control

  /**
   * Stops the engine: a short fade, then the oscillators go.
   */
  cancel() {
    super.cancel();
    if (this.voices === null) {
      return;
    }
    var now = this.ctx.currentTime;
    var voices = this.voices;
    this.voices = null;
    voices.gain.gain.cancelScheduledValues(now);
    voices.gain.gain.setValueAtTime(voices.gain.gain.value, now);
    voices.gain.gain.linearRampToValueAtTime(0.0, now+0.03);
    voices.oscillators.forEach((oscillator) => {
      oscillator.stop(now+0.04);
      oscillator.onended = () => oscillator.disconnect();
    });
    setTimeout(() => voices.gain.disconnect(), 100);
  } // cancel

} // EngineInstrument
