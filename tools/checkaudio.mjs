#!/usr/bin/env node
/**
 * Self-check of the DOM-free audio models under Node: the POKEY (the
 * dividers' frequency, the volumes, the polys, the base clock of AUDCTL),
 * the SID 6581 (the oscillators' frequency, the four waveforms and their
 * combinations, sync and ring, the envelope's rates and its five
 * slowdowns, and the volume register as the output stage a sample player
 * writes to),
 * the discrete building blocks (the LFSR, the RC steps, the gated RC of
 * Battlezone, the switched-gain op-amp, the resistor mixer; the blocks of
 * Asteroids' board after MAME's `discrete`: the R-1 ladder DAC, the
 * current-controlled 555, the triangle and square waves, the fixed
 * square, the sample and hold, the ramp, the RC discharge, the filters of
 * first and second order) and the engine's counter waveforms (the Fourier
 * series against the staircase), and the two AdLib drivers of the id/Apogee
 * games — the sound effect (instrument, then a byte of note per 1/140 s)
 * and the IMF player (a recording of the register writes themselves) - and
 * from DOOM (D11) the GENMIDI bank, the MUS player with the DMX driver's
 * voice handling, and the PCM mixer's gains.
 * The Web Audio half (the instruments' nodes, the handlers) needs a
 * browser and is not here.
 *
 * Every check is one line: what was expected, what came out. The report
 * has the shape of the match tools — the number of checks and the number
 * of differences — and the exit code is the number of differences.
 *
 * usage: node tools/checkaudio.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { POKEY } = await import('../js/audio/chip/pokey.js');
const { ChipStream } = await import('../js/audio/chip/chipStream.js');
const { SID } = await import('../js/audio/chip/sid.js');
const { LFSRNoise, Clock, Lowpass, Highpass, GatedRC, SwitchedGainLowpass, mixerWeights,
  LadderDAC, CC555, TriangleWave, SquareWave, FixedSquare, SampleHold, Ramp, RCDischarge, Filter1, Filter2 } = await import('../js/audio/chip/discrete.js');
const { EngineInstrument } = await import('../js/audio/instrument/engineInstrument.js');
const { AdlibSound } = await import('../js/audio/chip/adlibSound.js');
const { AdlibIMF } = await import('../js/audio/chip/adlibIMF.js');
const { GenMidi } = await import('../js/audio/chip/genmidi.js');
const { AdlibMUS } = await import('../js/audio/chip/adlibMUS.js');
const { PCMMixer } = await import('../js/audio/pcmMixer.js');

const verbose = process.argv.includes('-v');
let checks = 0;
let differences = 0;

/** one check: counts it, and reports a difference when the JSON of the two sides differs */
function check(name, actual, expected) {
  checks++;
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    differences++;
    console.log(`  DIFF ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else if (verbose) {
    console.log(`  ok   ${name}`);
  }
} // check

/** rising crossings of the mean over a signal: the cycles it holds */
function cycles(samples) {
  let mean = 0;
  for (let i = 0; i < samples.length; i++) {
    mean += samples[i];
  }
  mean /= samples.length;
  let count = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i-1] < mean && samples[i] >= mean) {
      count++;
    }
  }
  return count;
} // cycles

/** the largest absolute value of a signal, rounded to four decimals */
function peak(samples) {
  let p = 0;
  for (let i = 0; i < samples.length; i++) {
    p = Math.max(p, Math.abs(samples[i]));
  }
  return Math.round(p*10000)/10000;
} // peak

// ------------------------------------------------------------------ POKEY

{
  const BZ = 1512000;
  const chip = new POKEY(BZ, 44100);
  check('pokey base rate', Math.round(chip.baseRate), 54000);
  const polys = POKEY.polys();
  check('poly lengths', [polys.p4.length, polys.p5.length, polys.p9.length, polys.p17.length], [15, 31, 511, 131071]);
  const ones = (t) => { let n = 0; for (let i = 0; i < t.length; i++) { n += t[i]; } return n; };
  check('poly ones', [ones(polys.p4), ones(polys.p5), ones(polys.p9), ones(polys.p17)], [8, 16, 256, 65536]);

  // the radar ping: AUDF $23, pure tone, volume 3 -> 750 Hz at 3/60
  chip.write(0, 0x23);
  chip.write(1, 0xA3);
  const out = new Float32Array(44100);
  chip.render(out, 0, out.length);
  check('pure tone 750 Hz', Math.abs(cycles(out)-750) <= 2, true);
  check('pure tone level', peak(out), 0.05);

  // f = 27000/(AUDF+1): AUDF $FF -> 105.5 Hz
  const chip2 = new POKEY(BZ, 44100);
  chip2.write(4, 0xFF);
  chip2.write(5, 0xA8);
  const out2 = new Float32Array(44100*4);
  chip2.render(out2, 0, out2.length);
  check('channel 3 AUDF $FF 105.5 Hz', Math.abs(cycles(out2)/4-105.5) < 1, true);

  // volume 0 is silence, whatever the divider does
  const chip3 = new POKEY(BZ, 44100);
  chip3.write(0, 0x23);
  chip3.write(1, 0xA0);
  const out3 = new Float32Array(4410);
  chip3.render(out3, 0, out3.length);
  check('volume 0 silent', peak(out3), 0);

  // AUDCTL bit 0: the 15 kHz base, 28/114 of the frequency
  const chip4 = new POKEY(BZ, 44100);
  chip4.write(8, 0x01);
  chip4.write(0, 0x23);
  chip4.write(1, 0xA3);
  const out4 = new Float32Array(44100);
  chip4.render(out4, 0, out4.length);
  check('15 kHz base 184 Hz', Math.abs(cycles(out4)-184) <= 2, true);

  // the 4-bit poly at AUDF 0 samples the poly every base tick: period 15
  const chip5 = new POKEY(BZ, BZ/28);
  chip5.write(0, 0x00);
  chip5.write(1, 0xCF);
  const out5 = new Float32Array(300);
  chip5.render(out5, 0, out5.length);
  let periodic = true, constant = true;
  for (let i = 30; i < 300-15; i++) {
    if (out5[i] !== out5[i+15]) {
      periodic = false;
    }
    if (out5[i] !== out5[30]) {
      constant = false;
    }
  }
  check('4-bit poly period 15', [periodic, constant], [true, false]);

  // the channels add: a square at full volume over a volume-only level
  const chip6 = new POKEY(BZ, BZ/28);
  chip6.write(0, 0x00);
  chip6.write(1, 0xAF);
  chip6.write(3, 0x1F);
  const out6 = new Float32Array(8);
  chip6.render(out6, 0, out6.length);
  const levels = Array.from(new Set(Array.from(out6).map((v) => Math.round(v*100)/100))).sort();
  check('channels add', levels, [0.25, 0.5]);
  chip6.reset();
  check('reset', [chip6.audf, chip6.audc, chip6.audctl], [[0, 0, 0, 0], [0, 0, 0, 0], 0]);

  // AUDCTL bit 6: channel 1 at the chip clock, f = clock/(2·(AUDF+4)) — $63 → 8 688 Hz (Atari NTSC)
  const chip7 = new POKEY(POKEY.CLOCK, 96000);
  chip7.write(8, 0x40);
  chip7.write(0, 0x63);
  chip7.write(1, 0xA8);
  const out7 = new Float32Array(96000);
  chip7.render(out7, 0, out7.length);
  check('1.79 MHz channel 1 AUDF $63 8688 Hz', Math.abs(cycles(out7)-Math.round(POKEY.CLOCK/(2*(0x63+4)))) <= 10, true);

  // AUDCTL $78 (Boulder Dash's title): 1+2 and 3+4 joined at 1.79 MHz, f = clock/(2·(AUDF16+7))
  // — AUDF1 $F6, AUDF2 $0A → 2806 → 318 Hz on channel 2 (PAL clock); channel 1 silent at volume 0
  const chip8 = new POKEY(POKEY.CLOCK_PAL, 44100);
  chip8.write(8, 0x78);
  chip8.write(0, 0xF6); chip8.write(2, 0x0A);
  chip8.write(1, 0x00); chip8.write(3, 0xA8);
  const out8 = new Float32Array(44100);
  chip8.render(out8, 0, out8.length);
  check('16-bit pair 1+2 at 1.79 MHz 318 Hz', Math.abs(cycles(out8)-Math.round(POKEY.CLOCK_PAL/(2*(0x0AF6+7)))) <= 2, true);
  check('16-bit pair period', chip8.period(1), 0x0AF6+7);
  check('16-bit low channel keeps its own period', chip8.period(0), 0xF6+4);

  // joined without the fast clock: (AUDF16+1) base ticks — $0100+$00 → 257 ticks of 28 clocks
  const chip9 = new POKEY(POKEY.CLOCK, 44100);
  chip9.write(8, 0x08);
  chip9.write(4, 0x00); chip9.write(6, 0x01);
  check('16-bit pair 3+4 at the base clock', chip9.period(3), 257*28);
}

// ---------------------------------------------------------------- ChipStream

{
  // a chip that records what it was told and when: the sample position of every write
  const log = [];
  const fake = {samples: 0, write(r, v) { log.push([this.samples, r, v]); }, render(out, offset, count) { out.fill(0, offset, offset+count); this.samples += count; }, reset() { log.push(['reset']); }};
  const stream = new ChipStream(fake, 50000, {rate: 50, lines: 312, latency: 0.1});
  const buf = new Float32Array(128);
  const render = (quanta) => { for (let i = 0; i < quanta; i++) { stream.render(buf, 0, buf.length); } };
  // 50 000 Hz, 50 frames: 1 000 samples a frame, 100 ms latency = 5 000 samples
  stream.frame(10, [[0, 1, 0xA0], [156, 1, 0xA5], [312+156, 3, 0x41]]);
  render(10);                                     // 1 280 samples: the frame is still ahead
  // the next frame keeps the spacing, whatever the jitter of its arrival
  stream.frame(12, [[0, 1, 0xA1]]);
  render(70);                                     // 8 960 samples: everything queued has played
  check('stream: frame anchored at the latency', log[0], [5000, 1, 0xA0]);
  check('stream: a write at half the frame', log[1], [5500, 1, 0xA5]);
  check('stream: a write beyond the frame', log[2], [6500, 3, 0x41]);
  check('stream: frame 12 two frames after 10', log[3], [7000, 1, 0xA1]);
  check('stream: no re-anchor yet', stream.reanchors, 0);
  // a frame from the past (the worker stalled, the audio ran on): re-anchored, its write lands at the latency again
  stream.frame(5, [[0, 1, 0xA2]]);
  const at = stream.samples;
  render(60);
  check('stream: a late frame re-anchors', [stream.reanchors, log[4][0] === at+5000], [1, true]);
  // two writes at the same position keep their order
  stream.frame(6, [[10, 1, 1], [10, 1, 2]]);
  render(60);
  check('stream: the order of writes at one position', [log[5][2], log[6][2]], [1, 2]);
  // a script plays from now
  stream.play([[[0, 7, 0xAA]], [[0, 7, 0]]]);
  const before = stream.samples;
  render(80);
  check('stream: a script at the latency, frames a frame apart', [log[7][0]-before, log[8][0]-log[7][0]], [5000, 1000]);
  stream.stop();
  check('stream: stop resets the chip and drops the anchor', [log[9], stream.anchorFrame, stream.queue.length], [['reset'], null, 0]);

  // a block of samples: N values of one register, one every `cadence` units
  log.length = 0;
  stream.frame(100, []);
  stream.block(100, 0, 24, [1, 2, 3, 4], 156);    // a value every half frame = 500 samples
  render(80);
  check("stream: a block starts where the frame's writes would", log[0], [stream.positionOf(100), 24, 1]);
  check('stream: the values of a block come one cadence apart', [log[1][0]-log[0][0], log[3][0]-log[0][0], log.length], [500, 1500, 4]);
  check('stream: a spent block is dropped', stream.blocks.length, 0);
  // a block and a frame's writes keep their order against each other
  log.length = 0;
  stream.frame(140, [[78, 9, 0xEE]]);
  stream.block(140, 0, 24, [5, 6], 156);
  render(80);
  check("stream: a block and the frame's writes interleave by position", log.map((e) => e[2]), [5, 0xEE, 6]);
  stream.stop();
  check('stream: stop drops the blocks too', stream.blocks.length, 0);

  // ★ **A block can be waited for.** A digitised sound is an event, not
  // state: Impossible Mission's `$BF51` polls its speech player and the
  // world does not go on until it has finished, so a block carries a tag
  // and the tag comes back when it has played out
  // ({@link ChipStream#takeFinished}, `chipProcessor` posts it as
  // `blockDone`). Nothing reports a block with no tag.
  log.length = 0;
  stream.frame(200, []);
  stream.block(200, 0, 24, [1, 2], 156, 'hello');
  stream.block(200, 0, 25, [3, 4], 156);
  check('stream: nothing has finished before it is rendered', stream.takeFinished(), []);
  render(40);
  check('stream: a half-played block reports nothing', stream.takeFinished(), []);
  render(40);
  check('stream: a played-out block reports its tag, once', [stream.takeFinished(),
        stream.takeFinished()], [['hello'], []]);
  // ★ and **stop reports what it drops**, or whoever waits would wait for ever
  stream.frame(300, []);
  stream.block(300, 0, 24, [1, 2, 3], 156, 7);
  stream.stop();
  check('stream: stop reports the tags of the blocks it drops', stream.takeFinished(), [7]);

  // ★ A block whose cadence is **not a whole number of samples**. The speech
  // of Impossible Mission is one value every 101 cycles of the 19 656 in a
  // PAL frame, so the step is 4,53 samples at 44 100 Hz. A renderer that
  // takes that fractional distance as the number of samples to draw moves
  // its output index by a fraction — and `out[offset+i]` at a **fractional
  // index** of a `Float32Array` is silently dropped. What comes out is not
  // silence and not noise: only the samples whose index happens to land on
  // a whole number survive, some three per cent, and it is heard as **faint
  // crackling** (reported by the operator 2026-09-20). The checks above miss
  // it because their cadence, 156 of 312, is exactly 500 samples.
  const holes = new Float32Array(2048).fill(NaN);
  const filling = {samples: 0, write() {}, reset() {},
                   render(out, offset, count) {
                     for (var i = 0; i < count; i++) { out[offset+i] = 0; }
                     this.samples += count;
                   }};
  const fine = new ChipStream(filling, 44100, {rate: 50, lines: 19656, latency: 0});
  fine.block(1, 0, 24, new Uint8Array(400).fill(7), 101);
  fine.render(holes, 0, holes.length);
  check('stream: a block with a fractional cadence leaves no sample unwritten',
        Array.prototype.filter.call(holes, (v) => Number.isNaN(v)).length, 0);
}

// ------------------------------------------------------------------- SID

{
  // the oscillator: f = FREQ * clock / 2^24, and a cycle of the waveform is one wrap
  const tone = (control, freqLo, freqHi, extra) => {
    const chip = new SID(SID.CLOCK_PAL, 44100);
    chip.write(0, freqLo); chip.write(1, freqHi);
    chip.write(5, 0x00); chip.write(6, 0xF0);     // no attack, full sustain
    if (extra) { extra(chip); }
    chip.write(4, control);
    chip.write(24, 0x0F);
    const out = new Float32Array(44100);
    chip.render(out, 0, out.length);
    return {chip: chip, out: out};
  };
  // $1C31 at 985 248 Hz over 2^24 is 423.8 Hz; counting the zero crossings of a
  // sawtooth gives every cycle but the ones the rendering straddles
  check('sid: a sawtooth of $1C31 is 424 Hz', Math.abs(cycles(tone(0x21, 0x31, 0x1C).out)-424) <= 5, true);
  check('sid: a triangle of $166D is 337 Hz', Math.abs(cycles(tone(0x11, 0x6D, 0x16).out)-337) <= 5, true);
  check('sid: a pulse of $166D is 337 Hz', Math.abs(cycles(tone(0x41, 0x6D, 0x16, (c) => { c.write(2, 0x00); c.write(3, 0x08); }).out)-337) <= 5, true);

  // the waveforms themselves, read straight out of the model at a known phase
  const shaped = new SID(SID.CLOCK_PAL, 44100);
  const at = (accumulator, control, pw) => {
    shaped.voices[0].accumulator = accumulator;
    shaped.voices[0].control = control;
    shaped.voices[0].pw = pw || 0;
    return shaped.waveOf(0);
  };
  check('sid: the sawtooth is the top twelve bits', [at(0x000000, 0x20), at(0x800000, 0x20), at(0xFFFFFF, 0x20)], [0x000, 0x800, 0xFFF]);
  check('sid: the triangle folds about the MSB and shifts up one', [at(0x000000, 0x10), at(0x7FF000, 0x10), at(0x800000, 0x10), at(0xFFF000, 0x10)], [0x000, 0xFFE, 0xFFF, 0x001]);
  check('sid: the pulse is all ones from PW up', [at(0x7FF000, 0x40, 0x800), at(0x800000, 0x40, 0x800), at(0xFFF000, 0x40, 0x800)], [0x000, 0xFFF, 0xFFF]);
  check('sid: the test bit holds the pulse high', at(0x000000, 0x48, 0x800), 0xFFF);
  check('sid: combined waveforms are the AND of the parts', at(0xABC000, 0x30), at(0xABC000, 0x20) & at(0xABC000, 0x10));
  check('sid: noise combines with nothing', at(0xABC000, 0x90), 0);
  check('sid: no waveform is silence', at(0xABC000, 0x00), 0);

  // the noise register: 23 bits, taps 22 and 17, clocked when bit 19 of the accumulator rises
  const noisy = new SID(SID.CLOCK_PAL, 44100);
  noisy.voices[0].freq = 0x8000; noisy.voices[0].control = 0x80;
  const before = noisy.voices[0].shift;
  noisy.advanceVoice(noisy.voices[0], 32);        // 32 * 0x8000 = 0x100000: one rise
  check('sid: the noise register shifts once a rise of bit 19', [noisy.voices[0].shift, noisy.voices[0].accumulator], [((before << 1) | (((before >> 22) ^ (before >> 17)) & 1)) & 0x7FFFFF, 0x100000]);
  check('sid: the taps of the noise output are 20, 18, 14, 11, 9, 5, 2 and 0', new SID().noiseOf({shift: 0x100001}), (1 << 11) | (1 << 4));

  // ring modulation and sync, the two things that make the model step clock by clock
  const ring = new SID(SID.CLOCK_PAL, 44100);
  ring.voices[0].control = 0x14;                  // triangle with ring from voice 3
  ring.voices[0].accumulator = 0x000000;
  ring.voices[2].accumulator = 0x800000;
  check("sid: ring modulation folds the triangle by the other voice's MSB", ring.waveOf(0), 0xFFF);
  check('sid: a ring or a sync makes the model step clock by clock', [new SID().stepwise, ring.stepwise], [false, true]);
  const sync = new SID(SID.CLOCK_PAL, 44100);
  sync.voices[0].control = 0x22; sync.voices[0].freq = 0x1000; sync.voices[0].accumulator = 0x123456;
  sync.voices[2].freq = 0x800000; sync.voices[2].accumulator = 0x000000;
  sync.clockVoices();
  check("sid: a sync resets the accumulator when the source's MSB rises", sync.voices[0].accumulator, 0);

  // the envelope: the measured rates, and the five slowdowns of the decay
  check('sid: the attack rates are the measured periods', [SID.RATES[0], SID.RATES[9], SID.RATES[15]], [9, 977, 31251]);
  const env = new SID(SID.CLOCK_PAL, 44100);
  env.write(5, 0x00); env.write(6, 0xF0); env.write(4, 0x11);
  check('sid: the gate starts the attack at the attack rate', [env.voices[0].state, env.voices[0].ratePeriod], [0, 9]);
  env.advanceEnvelope(env.voices[0], 9*255);
  check('sid: the attack counts up to 255 and turns into the decay', [env.voices[0].envelope, env.voices[0].state], [0xFF, 1]);
  env.advanceEnvelope(env.voices[0], 9*100);
  check('sid: the sustain of $F0 holds the envelope at 255', env.voices[0].envelope, 0xFF);
  env.write(4, 0x10);
  check('sid: dropping the gate starts the release', env.voices[0].state, 2);
  // 0xFF down to 0x5D is one step a period, from there two, then four, eight, sixteen, thirty
  const fall = (to) => { let clocks = 0; while (env.voices[0].envelope > to) { env.advanceEnvelope(env.voices[0], 9); clocks += 9; } return clocks/9; };
  check('sid: the release falls one step a period down to 0x5D', fall(0x5D), 0xFF-0x5D);
  check('sid: and one step every two periods down to 0x36', fall(0x36), (0x5D-0x36)*2);
  check('sid: and every four, eight, sixteen and thirty below that', [fall(0x1A), fall(0x0E), fall(0x06), fall(0x00)], [(0x36-0x1A)*4, (0x1A-0x0E)*8, (0x0E-0x06)*16, 6*30]);
  check('sid: the envelope holds at zero', [env.voices[0].holdZero, env.voices[0].envelope], [true, 0]);

  // the volume register as an output stage: the game's speech writes nothing else
  const digi = new SID(SID.CLOCK_PAL, 44100);
  const samples = new Float32Array(2048);
  for (let i = 0; i < 2048; i += 8) {
    digi.write(24, (i % 16) ? 0x00 : 0x0F);       // a square wave of four-bit values
    digi.render(samples, i, 8);
  }
  let span = 0;
  for (let i = 1024; i < 2048; i++) { span = Math.max(span, Math.abs(samples[i])); }
  check('sid: writing only the volume is heard — the 6581 DC offset', span > 0.02, true);
  const silent = new SID(SID.CLOCK_PAL, 44100);
  silent.write(24, 0x0F);
  const settle = new Float32Array(20000);
  silent.render(settle, 0, settle.length);
  check('sid: a steady volume and no voice is silence — the DC blocker', Math.abs(settle.at(-1)) < 0.001, true);
  check('sid: the volume, the filter modes and voice 3 off are one register', (() => { const c = new SID(); c.write(24, 0xB5); return [c.volume, c.mode, c.voice3off]; })(), [5, 3, true]);
  check('sid: the cutoff is three bits and eight', (() => { const c = new SID(); c.write(21, 0x07); c.write(22, 0x40); return c.cutoff; })(), (0x40 << 3) | 7);
  check('sid: the resonance and the filtered voices are one register', (() => { const c = new SID(); c.write(23, 0xF5); return [c.resonance, c.filtered]; })(), [0x0F, 0x05]);
  check('sid: reset silences everything', (() => { const c = new SID(); c.write(24, 0x0F); c.write(4, 0x11); c.reset(); return [c.volume, c.voices[0].control]; })(), [0, 0]);
}

// --------------------------------------------------------------- discrete

{
  const lfsr = new LFSRNoise(16, [3, 14], true, 15);
  check('lfsr first step', [lfsr.step(), lfsr.register], [0, 1]);
  let n = 0, ones = 0;
  const seen = new Set();
  let period = 0;
  const start = lfsr.register;
  for (let i = 0; i < 200000; i++) {
    ones += lfsr.step();
    n++;
    if (lfsr.register === start && period === 0) {
      period = n;
    }
  }
  check('lfsr not stuck', period === 0 || period > 1000, true);
  check('lfsr balanced', Math.abs(ones/n-0.5) < 0.02, true);

  const clock = new Clock(6000, 1/48000);
  let edges = 0;
  for (let i = 0; i < 48000; i++) {
    edges += clock.step();
  }
  check('clock 6 kHz edges a second', edges, 6000);

  const lp = new Lowpass(0.01, 0.001);
  let v = 0;
  for (let i = 0; i < 10; i++) {
    v = lp.step(1);
  }
  check('lowpass one tau', Math.round(v*1000)/1000, 0.632);

  const hp = new Highpass(0.01, 0.001);
  let h = 0;
  for (let i = 0; i < 100; i++) {
    h = hp.step(1);
  }
  check('highpass blocks DC', h < 0.01, true);

  const gate = new GatedRC(23000, 4.7e-6, 5, 1/48000);
  let g = 0;
  for (let i = 0; i < 480; i++) {
    g = gate.step(1, 0);                       // 10 ms of trigger, no noise: charges, output 0
  }
  check('gated rc charges', [Math.round(gate.vCap*100)/100, g], [4.94, 0]);
  g = gate.step(0, 1);
  check('gated rc output is the cap', Math.round(g*100)/100, 4.94);
  for (let i = 0; i < 48000*0.108; i++) {
    g = gate.step(0, 1);                       // one tau of noise: decays to 1/e
  }
  check('gated rc decays one tau', Math.round(g/4.94*100)/100, 0.37);
  check('gated rc holds without noise', gate.step(0, 0), 0);

  const filter = new SwitchedGainLowpass({r1: 33000, r2: 10000, r3: 22000, r4: 1000, r5: 330000}, 4.7e-9, 22, 1/48000);
  check('op-amp gains soft/loud', filter.gain.map((x) => Math.round(x*10)/10), [8.7, 33.1]);
  let f = 0;
  for (let i = 0; i < 4800; i++) {
    f = filter.step(1, 5);
  }
  check('op-amp loud 5 V in', Math.round(f*10)/10, 7.2);
  for (let i = 0; i < 4800; i++) {
    f = filter.step(1, 50);
  }
  check('op-amp clips at the rail', Math.round(f*10)/10, 20.5);
  const filter2 = new SwitchedGainLowpass({r1: 33000, r2: 10000, r3: 22000, r4: 1000, r5: 330000}, 4.7e-9, 22, 1/48000);
  for (let i = 0; i < 4800; i++) {
    f = filter2.step(0, 5);
  }
  check('op-amp soft 5 V in', Math.round(f*100)/100, 1.89);

  const w = mixerWeights([100000, 100000, 33000+33000/4, 330000], 22000);
  check('mixer weights', w.map((x) => Math.round(x*1000)/1000), [0.108, 0.108, 0.261, 0.033]);
  check('mixer weights sum under 1', w.reduce((a, b) => a+b, 0) < 1, true);
}

// --------------------------------------------------- discrete (Asteroids)

{
  const rate = 44100, dt = 1/rate;
  // the thump's DAC (asteroid_a.cpp): 2.533 V at 0, 2.832 V at 4 — bit 2's 47 k
  const dac = new LadderDAC([220000, 100000, 47000, 22000], 3.5, 4.3, 6800, 47000, 0.01e-6, dt);
  check('dac steps 0, 4, 15', [dac.steps[0], dac.steps[4], dac.steps[15]].map((v) => Math.round(v*1000)/1000), [2.533, 2.832, 3.673]);
  let d = 0;
  for (let i = 0; i < 100; i++) {
    d = dac.step(4);
  }
  check('dac settles through its capacitor', Math.round(d*1000)/1000, 2.832);

  // the 555: i = (5 − (Vin + 0.8))/22 k into 0.22 µ, discharge through 18 k
  // toward i·18 k — 81 Hz at DAC 0, 87 Hz at DAC 4, reset to 0
  const hz = (vIn) => {
    const cc = new CC555({r: 22000, c: 0.22e-6, rDischarge: 18000, vPos: 5, vbe: 0.8, toCap: true, ac: true}, dt);
    const out = new Float32Array(rate);
    for (let i = 0; i < rate; i++) {
      out[i] = cc.step(1, vIn);
    }
    return {f: cycles(out), peak: peak(out), reset: cc.step(0, vIn)};
  };
  const low = hz(dac.steps[0]), high = hz(dac.steps[4]);
  check('555 cc frequencies at DAC 0 / 4', [low.f, high.f], [81, 86]);
  check('555 cc square ±1.9 V, reset 0', [low.peak, low.reset], [1.9, 0]);

  const tri = new TriangleWave(dt);
  const t = new Float32Array(rate);
  for (let i = 0; i < rate; i++) {
    t[i] = tri.step(1, 100, 2, 1);
  }
  let tMin = 1e9, tMax = -1e9;
  for (let i = 0; i < rate; i++) {
    tMin = Math.min(tMin, t[i]);
    tMax = Math.max(tMax, t[i]);
  }
  check('triangle 100 Hz, 0..2', [cycles(t), Math.round(tMin*100)/100, Math.round(tMax*100)/100], [100, 0, 2]);
  check('triangle disabled is 0', tri.step(0, 100, 2, 1), 0);

  const sq = new SquareWave(dt);
  let high25 = 0;
  for (let i = 0; i < rate; i++) {
    high25 += sq.step(1, 50, 2, 25, 0) > 0 ? 1 : 0;
  }
  check('square 50 Hz duty 25 %', Math.round(high25/rate*100), 25);
  const sq2 = new SquareWave(dt);
  let over = 0;
  for (let i = 0; i < 100; i++) {
    over += sq2.step(1, 50, 2, 110, 0) > 0 ? 1 : 0;
  }
  check('square duty over 100 stays high', over, 100);

  const fixed = new FixedSquare(3000, 50, dt);
  const f3 = new Float32Array(rate);
  for (let i = 0; i < rate; i++) {
    f3[i] = fixed.step(1, 100, 0);
  }
  check('fixed square 3 kHz ±50', [cycles(f3), peak(f3)], [3000, 50]);
  const clock = new FixedSquare(1000, 100/12, dt);
  let onSamples = 0, rising = 0, last = 0;
  for (let i = 0; i < rate; i++) {
    const v = clock.step(1, 1, 0.5);
    onSamples += v;
    if (v > last) {
      rising++;
    }
    last = v;
  }
  check('pitch clock 12 kHz / 12: 1000 edges a second, on 1/12', [rising, Math.abs(onSamples/rate*12-1) < 0.05], [1001, true]);

  const hold = new SampleHold();
  check('sample hold takes the input on the rising edge', [hold.step(3, 0), hold.step(5, 1), hold.step(7, 1), hold.step(9, 0), hold.step(11, 1)], [3, 5, 5, 5, 11]);

  const ramp = new Ramp((820-110)/0.28, 820, 110, 0, dt);
  let r = 0;
  for (let i = 0; i < Math.round(0.14*rate); i++) {
    r = ramp.step(1, 1);
  }
  check('ramp halfway in 0.14 s', Math.round(r), 465);
  for (let i = 0; i < Math.round(0.2*rate); i++) {
    r = ramp.step(1, 1);
  }
  check('ramp clamps at its end', r, 110);
  check('ramp disabled is the clamp', ramp.step(0, 1), 0);

  const disc = new RCDischarge(8100, 1e-5, dt);
  disc.step(1, 46);
  let dv = 0;
  for (let i = 0; i < Math.round(0.081*rate); i++) {
    dv = disc.step(1, 46);
  }
  check('rc discharge one tau', Math.round(dv/46*100)/100, 0.37);
  check('rc discharge disabled is 0', disc.step(0, 46), 0);

  const lp = new Filter1(160, 'lowpass', dt);
  let steady = 0;
  for (let i = 0; i < rate; i++) {
    steady = lp.step(1);
  }
  check('filter1 lowpass passes DC', Math.round(steady*1000)/1000, 1);
  const gainAt = (make, f) => {
    const filter = make();
    let p = 0;
    for (let i = 0; i < rate; i++) {
      const y = filter.step(Math.sin(2*Math.PI*f*i/rate));
      if (i > rate/2) {
        p = Math.max(p, Math.abs(y));
      }
    }
    return Math.round(p*100)/100;
  };
  check('filter1 lowpass 160 Hz at 160 Hz −3 dB', gainAt(() => new Filter1(160, 'lowpass', dt), 160), 0.71);
  const band = () => new Filter2(89.5, 1/7.6, 'bandpass', dt);
  check('filter2 bandpass 89.5 Hz: centre 1, 30 Hz and 300 Hz down', [gainAt(band, 89.5), gainAt(band, 30) < 0.2, gainAt(band, 300) < 0.2], [1, true, true]);
  check('filter2 lowpass passes DC', gainAt(() => new Filter2(160, 1, 'lowpass', dt), 1), 1);

  // the noise of Asteroids: 16 bits, XNOR of bits 6 and 14, from zero — the
  // taps are not a maximal pair: from 0 it enters a cycle of 32767 (2.73 s at 12 kHz)
  const noise = new LFSRNoise(16, [6, 14], true, 0);
  noise.step();
  let n = 0, period = 0;
  while (n < 70000 && period === 0) {
    noise.step();
    n++;
    if (noise.register === 1) {
      period = n;
    }
  }
  check('asteroids lfsr cycle from zero', period, 32767);
}

// ----------------------------------------------------------------- engine

{
  const w = EngineInstrument.waveform(4, 15, 64);
  check('counter 4..15 period', w.period, 12);
  check('counter 4..15 DC', Math.round(w.real[0]*1000)/1000, 0.75);
  // the series at the slot centres against the staircase 0 (4..7), 1 (8..14), 2 (15)
  const levels = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2];
  let worst = 0;
  for (let k = 0; k < 12; k++) {
    const phi = (k+0.5)/12;
    let s = w.real[0];
    for (let n = 1; n <= 64; n++) {
      s += w.real[n]*Math.cos(2*Math.PI*n*phi)+w.imag[n]*Math.sin(2*Math.PI*n*phi);
    }
    worst = Math.max(worst, Math.abs(s-levels[k]));
  }
  check('counter 4..15 series fits', worst < 0.2, true);
  const w2 = EngineInstrument.waveform(6, 15, 8);
  check('counter 6..15 period, DC', [w2.period, Math.round(w2.real[0]*100)/100], [10, 0.9]);
}

// ------------------------------------------------------- the AdLib drivers

{
  // an instrument goes into voice 0 in the order the games write it, and the
  // feedback register is written as zero, not from the instrument
  const written = [];
  const chip = {write: (register, value) => written.push([register, value]), reset: () => written.push(['reset']),
    render: (out, count) => out, sampleRate: 22050};
  const instrument = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0xFF, 0, 0, 0, 0, 0]);
  AdlibSound.setInstrument(chip, instrument);
  check('adlib sound: the eleven register writes of an instrument', written, [
    [0x20, 1], [0x40, 3], [0x60, 5], [0x80, 7], [0xE0, 9],
    [0x23, 2], [0x43, 4], [0x63, 6], [0x83, 8], [0xE3, 10],
    [0xC0, 0]
  ]);

  // a note is the low byte of the frequency plus the block; a zero keys off
  const notes = [];
  const noteChip = {write: (register, value) => notes.push([register, value]), reset: () => {},
    render: (out, count) => out, sampleRate: 140*4};
  const driver = new AdlibSound({chip: noteChip});
  driver.play({instrument: AdlibSound.ZERO_INSTRUMENT, octave: 3, data: Uint8Array.from([0x41, 0, 0x42])});
  // the games set the waveform select when they find the card, and every
  // instrument written afterwards counts on it
  check('adlib sound: the waveform select is turned on', notes[0], [0x01, 0x20]);
  notes.length = 0;
  driver.renderAll();
  check('adlib sound: note, key off, note, and the key off at the end', notes, [
    [0xA0, 0x41], [0xB0, 0x2C], [0xB0, 0], [0xA0, 0x42], [0xB0, 0x2C], [0xB0, 0]
  ]);
  check('adlib sound: three bytes at 140 Hz plus the tail', Math.round(driver.pieceSeconds*1000),
    Math.round((3/140+AdlibSound.TAIL_SECONDS)*1000));

  // IMF: a type 1 stream states its length in front, a type 0 one does not
  const writes = Uint8Array.from([0x20, 0x01, 0x02, 0x00, 0xA0, 0x40, 0x00, 0x00]);
  const typeOne = Uint8Array.from([8, 0, ...writes, 0x41, 0x42]);
  check('imf: the length word of a type 1 file is taken off', Array.from(AdlibIMF.stream(typeOne)), Array.from(writes));
  check('imf: a type 0 file is its own stream', Array.from(AdlibIMF.stream(writes)), Array.from(writes));
  check('imf: the ticks are the delays of the writes', AdlibIMF.ticksOf(writes), 2);

  const played = [];
  const imfChip = {write: (register, value) => played.push([register, value]), reset: () => {},
    render: (out, count) => out, sampleRate: 700};
  const player = new AdlibIMF({chip: imfChip});
  player.play(writes);
  check('imf: the piece is as long as its ticks', Math.round(player.pieceSeconds*1000), Math.round(2/700*1000));
  player.renderAll(0.02);
  check('imf: the waveform select is turned on before the stream', played.slice(0, 3),
    [[0x01, 0x20], [0x08, 0x00], [0xBD, 0x00]]);
  check('imf: both writes are made, in order', played.slice(3), [[0x20, 0x01], [0xA0, 0x40]]);
  check('imf: and then the piece is over', player.finished, true);
}

// --------------------------------------------------- GENMIDI, MUS, mixer
{
  // a bank of 175 empty instruments, the fifth with an offset, the drum fixed
  const bank = new Uint8Array(8+175*36+175*32);
  bank.set(Array.from('#OPL_II#', (c) => c.charCodeAt(0)), 0);
  const record = (i) => 8+i*36;
  bank[record(5)+4+7+1] = 0xF0;                    // carrier attack of the fifth
  bank[record(5)+4+14] = 0xF4; bank[record(5)+4+15] = 0xFF;   // base note offset -12
  bank[record(128)] = 0x01; bank[record(128)+3] = 36;         // the bass drum: fixed at note 36
  bank.set(Array.from('Drum', (c) => c.charCodeAt(0)), 8+175*36+128*32);
  const genmidi = new GenMidi(bank);
  check('genmidi: the header and 175 records', [genmidi.valid, genmidi.instruments.length], [true, 175]);
  check('genmidi: an offset is a signed word', genmidi.instruments[5].voices[0].baseNoteOffset, -12);
  check('genmidi: the carrier attack is where the format puts it', genmidi.instruments[5].voices[0].carrier.attack, 0xF0);
  check('genmidi: percussion 35 is record 128, fixed at its note, named', [genmidi.percussion(35).index, genmidi.percussion(35).fixed, genmidi.percussion(35).fixedNote, genmidi.percussion(35).name], [128, true, 36, 'Drum']);
  check('genmidi: keys outside 35..81 have no percussion', [genmidi.percussion(34), genmidi.percussion(82)], [null, null]);

  // a MUS: programme 5 on channel 3, a note with its velocity, a drum, a wait, the note off, the end
  const mus = Uint8Array.from([
    0x4D, 0x55, 0x53, 0x1A, 12, 0, 18, 0, 2, 0, 0, 0, 1, 0, 0, 0, 5, 0,
    0x43, 0x00, 0x05,          // channel 3: controller 0 (programme) = 5
    0x93, 0xBC, 100,           // channel 3, last of its tick: key 60 on, velocity 100
    0x46,                      // then 70 ticks
    0x9F, 0x23,                // channel 15 (percussion): key 35 on at the velocity kept for it (127)
    0x02,                      // then 2 ticks
    0x83, 0x3C,                // channel 3: key 60 off
    0x00,                      // then nothing
    0x60                       // the end
  ]);
  const score = AdlibMUS.score(mus);
  check('mus: the header', [score.header.scoreStart, score.header.instrumentCount, score.header.instruments], [18, 1, [5]]);
  // the first MUS channel used is MIDI 0 and starts with "all notes off"; percussion is MIDI 9 straight away;
  // the end marker's own channel bits (MUS channel 0) allocate one more channel before the end, as the conversion does
  check('mus: the events, with the channels as the conversion hands them out',
    score.events.map((e) => [e.type, e.channel, e.delta, e.key ?? e.programme ?? e.controller ?? null]),
    [['control', 0, 0, 0x7B], ['program', 0, 0, 5], ['on', 0, 0, 60], ['on', 9, 70, 35], ['off', 0, 2, 60], ['control', 1, 0, 0x7B], ['end', 0, 0, null]]);
  check('mus: velocity 100 kept on the channel, 127 for the drum', [score.events[2].velocity, score.events[3].velocity], [100, 127]);
  check('mus: the wait of a tick is the floor of the whole product', [AdlibMUS.waitOf(70), AdlibMUS.waitOf(3), AdlibMUS.passUs(score)], [500000, 21428, 514285]);

  // the driver on a silent chip: the writes of the note
  const musWrites = [];
  const musChip = {write: (r, v) => musWrites.push([r, v]), reset: () => {}, render: () => {}, sampleRate: 1000000};
  const player = new AdlibMUS({bank: genmidi, chip: musChip, log: true});
  check('mus: the initialisation is 239 writes ending with the keyboard split', [musWrites.length, musWrites[238]], [239, [0x08, 0x40]]);
  musWrites.length = 0;
  player.play(score, {looping: true});
  player.render(new Float32Array(10), 10);
  // note 60 with offset -12 on voice 0 (operators 0 and 3): the instrument (11 writes), the level, then the frequency
  check('mus: a note on programs the carrier first, then the modulator, then the connection', musWrites.slice(0, 11).map((w) => w[0]),
    [0x43, 0x23, 0x63, 0x83, 0xE3, 0x40, 0x20, 0x60, 0x80, 0xE0, 0xC0]);
  check('mus: the carrier level is 0x3F less the mapped velocity times the mapped channel volume >> 9', musWrites[11], [0x43, 0x3F-((116*2*(89+1)) >> 9)]);
  // index 64+32*48 = 1600: entry 164 of the looped range (0x2b1) in octave 3
  check('mus: note 48 goes through the curve', musWrites.slice(12, 14), [[0xA0, 0xB1], [0xB0, 0x2E]]);
  check('mus: the note took voice 0 off the free list', [player.free.length, player.allocated.length, player.allocated[0].key], [8, 1, 60]);
  player.render(new Float32Array(500000), 500000);
  check('mus: the drum keys on voice 1 at its fixed note 36 (index 1216: 0x2b1 of octave 2)', musWrites.filter((w) => w[0] === 0xA1 || w[0] === 0xB1), [[0xA1, 0xB1], [0xB1, 0x2A]]);
  player.render(new Float32Array(15000), 15000);   // past the note off and the end marker, before the restart
  check('mus: the note off keys voice 0 off and frees it to the end of the list', [musWrites.at(-1), player.free.length, player.free.at(-1).index], [[0xB0, 0x0E], 8, 0]);
  check('mus: the piece restarts 5 ms after its end', player.next.us, 514285+5000);
  const stream = AdlibMUS.writesOf(genmidi, mus, 1.1, {looping: true});
  check('mus: the write listing agrees with the chip run and goes on after the restart', [stream.length > musWrites.length+239, stream.filter((w) => w[0] > 519285).length > 0], [true, true]);

  // the mixer: DOOM's gains, and a sample played out
  const middle = PCMMixer.gainsOf(127, 128);
  check('mixer: dead ahead at full volume is 95 and 96 of 127', [Math.round(middle.left*127), Math.round(middle.right*127)], [95, 96]);
  const hardLeft = PCMMixer.gainsOf(64, 0);
  check('mixer: hard left is all on the left', [Math.round(hardLeft.left*127), hardLeft.right], [64, 0]);
  const mixer = new PCMMixer({sampleRate: 100, channels: 2});
  mixer.start(1, {samples: Float32Array.of(0.5, -0.5, 0.25, 0), sampleRate: 100}, {left: 1, right: 0.5});
  const left = new Float32Array(6), right = new Float32Array(6);
  mixer.render(left, right, 6);
  check('mixer: the sample plays at the gains and the channel is free after it', [Array.from(left), Array.from(right), mixer.isPlaying(1)],
    [[0.5, -0.5, 0.25, 0, 0, 0], [0.25, -0.25, 0.125, 0, 0, 0], false]);
}

console.log(`checkaudio: ${checks} checks, ${differences} differences`);
process.exit(differences);
