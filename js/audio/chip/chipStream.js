// begin code

/**
 * A **stream of timed register writes** into a sound chip model — the
 * general half of "the game writes the chip's registers, the player hears
 * the chip" (ROADMAP 3.4). The game's worker reports, frame by frame, what
 * the original wrote and when within the frame (a scanline, or T-states
 * on a Z80 machine — any unit, `lines` of them a frame); the stream turns
 * every write into a sample position on its own clock and hands it to the
 * chip exactly there while rendering. The chip is any object with
 * `write(register, value)`, `render(out, offset, count)` and `reset()`
 * ({@link POKEY} first; an AY or a SID the same way).
 *
 * ## Two clocks
 *
 * The worker's frames arrive at roughly `rate` a second, jittered by
 * timers and by the renderer; the audio thread pulls samples at its own
 * steady pace. The stream anchors the two once — the first frame is placed
 * `latency` seconds ahead of the sample being rendered — and from then on
 * frame `f` sits at `anchor + (f - anchorFrame)·samplesPerFrame`, so the
 * writes keep the original's spacing whatever the jitter. When the frames
 * fall behind (a stalled worker, a paused tab) or run away (a stalled
 * audio thread), the anchor is moved rather than the sound stretched: a
 * frame that would land in the past, or more than `maxLead` seconds ahead,
 * re-anchors at `latency` again. Writes already queued keep their place.
 *
 * A write's position may lie beyond its frame (`line >= lines`): the game's
 * pass over the cave takes several frames in the original while the worker
 * does it in one tick, so the writes of a pass are spread into the frames
 * the original would have made them in (Boulder Dash, ZADANI §10.6).
 *
 * ## Scripts
 *
 * `play(frames)` plays a list of frames — each a list of writes — from now,
 * at `rate` a second: the sample of a volume dialog, a jingle. A script
 * re-anchors, so it starts at once.
 *
 * ## Blocks of samples
 *
 * A machine that plays a digitised sound writes one register thousands of
 * times a second — Impossible Mission's speech is 9 755 four-bit values a
 * second into the SID's volume register, 195 of them in a frame
 * (`impossiblemission/sources/docs/disasm_notes.md` §18). Sending those as
 * writes would be tens of thousands of little arrays a second, so
 * `block(frame, line, register, values, cadence)` sends the shape instead:
 * **N values from `line`, one every `cadence` units**. The stream keeps
 * the block whole and takes a value from it only when the renderer reaches
 * it, so a second of speech costs one message and one array.
 *
 * Free of the DOM: it runs in an AudioWorklet ({@link ChipProcessor}), on
 * the main thread and under Node, where `svision/tools/checkaudio.mjs`
 * checks the placement of the writes sample by sample.
 *
 * @example
 * var stream = new ChipStream(new POKEY(POKEY.CLOCK_PAL, 44100), 44100, {rate: 50, lines: 312});
 * stream.frame(1, [[0, 0, 0x23], [0, 1, 0xA3], [156, 1, 0xA0]]);   // on at the frame's start, off at its middle
 * var out = new Float32Array(4410);
 * stream.render(out, 0, out.length);
 */
export class ChipStream {

  /**
   * @param {Object} chip - The chip model (`write`, `render`, `reset`).
   * @param {number} sampleRate - Samples a second.
   * @param {Object} [options] - `rate` frames a second (50), `lines` units a frame (312),
   *   `latency` seconds the frames are placed ahead (0.06), `maxLead` seconds a frame may
   *   run ahead before re-anchoring (0.25).
   */
  constructor(chip, sampleRate, options) {
    options = options || {};
    this.id = 'ChipStream';
    this.chip = chip;
    this.sampleRate = sampleRate;
    this.rate = options.rate || 50;
    this.lines = options.lines || 312;
    this.latency = ('latency' in options) ? options.latency : 0.06;
    this.maxLead = ('maxLead' in options) ? options.maxLead : 0.25;
    this.samplesPerFrame = sampleRate/this.rate;
    /** samples rendered so far: the stream's clock */
    this.samples = 0;
    /** the anchor: frame `anchorFrame` starts at sample `anchor` */
    this.anchor = 0;
    this.anchorFrame = null;
    /** the writes to come, by position: [{pos, register, value}] */
    this.queue = [];
    /** the blocks of samples to come: [{pos, step, register, values, index, tag}] */
    this.blocks = [];
    /**
     * ★ **The tags of the blocks that have just finished**, for whoever
     * wants to know: a digitised sound is an event, and a game may have to
     * wait for it to end (Impossible Mission's `$BF51` waits for the speech
     * player before the world goes on). {@link ChipProcessor} takes them
     * after every render quantum and posts them back to the main thread.
     */
    this.finished = [];
    /** how many times the anchor moved (for a tool, and a curious dev mode) */
    this.reanchors = 0;
    /** the frame counter of a script */
    this.scriptFrame = 0;
  } // constructor

  /**
   * The sample position of a frame's start under the current anchor.
   * @param {number} frame - The frame number.
   * @returns {number} A sample position (fractional).
   */
  positionOf(frame) {
    return this.anchor+(frame-this.anchorFrame)*this.samplesPerFrame;
  } // positionOf

  /**
   * Anchors a frame at `latency` ahead of now.
   * @param {number} frame - The frame number.
   */
  reanchor(frame) {
    if (this.anchorFrame !== null) {
      this.reanchors++;
    }
    this.anchorFrame = frame;
    this.anchor = this.samples+this.latency*this.sampleRate;
  } // reanchor

  /**
   * One frame of the worker: its number and its writes as `[line, register,
   * value]` — `line` in units of `lines` a frame from the frame's start, and
   * possibly beyond it.
   * @param {number} frame - The frame number (any monotonic count).
   * @param {Array} writes - `[[line, register, value], …]`.
   */
  frame(frame, writes) {
    if (this.anchorFrame === null) {
      this.reanchor(frame);
    } else {
      var lead = this.positionOf(frame)-this.samples;
      if (lead < 0 || lead > this.maxLead*this.sampleRate) {
        this.reanchor(frame);
      }
    }
    if (!writes || !writes.length) {
      return;
    }
    var start = this.positionOf(frame);
    var perLine = this.samplesPerFrame/this.lines;
    for (var i = 0; i < writes.length; i++) {
      var w = writes[i];
      this.push(Math.round(start+w[0]*perLine), w[1], w[2]);
    }
  } // frame

  /**
   * A **block of samples**: `values.length` writes of one register,
   * starting `line` units into the frame and one every `cadence` units —
   * a digitised sound, kept whole instead of spelled out write by write.
   * The block is placed under the same anchor as a frame's writes, so it
   * keeps its place against them, and it may run past the end of its
   * frame.
   * @param {number} frame - The frame number the block starts in.
   * @param {number} line - Units from that frame's start (a cycle on a C64).
   * @param {number} register - The chip's register the values go to.
   * @param {Array|Uint8Array} values - The values, in order.
   * @param {number} cadence - Units between two values (101 cycles for this game's speech).
   * @param {*} [tag] - What to report in {@link #finished} when the block has
   *   played out; anything structured-cloneable, or nothing to report nothing.
   */
  block(frame, line, register, values, cadence, tag) {
    if (!values || !values.length) {
      return;
    }
    if (this.anchorFrame === null) {
      this.reanchor(frame);
    }
    var perLine = this.samplesPerFrame/this.lines;
    var entry = {pos: this.positionOf(frame)+line*perLine, step: cadence*perLine,
                 register: register, values: values, index: 0,
                 tag: (tag === undefined ? null : tag)};
    var b = this.blocks;
    var i = b.length;
    while (i > 0 && b[i-1].pos > entry.pos) {
      i--;
    }
    b.splice(i, 0, entry);
  } // block

  /**
   * The tags of the blocks that finished since this was last asked, and
   * forgets them.
   * @returns {Array} The tags, oldest first; empty when nothing finished.
   */
  takeFinished() {
    if (!this.finished.length) {
      return this.finished;
    }
    var out = this.finished;
    this.finished = [];
    return out;
  } // takeFinished

  /**
   * The sample position of the next value of the block that has one
   * soonest, or `null` when no block has any left.
   * @returns {?number} A sample position.
   */
  nextBlock() {
    var b = this.blocks, best = null;
    for (var i = 0; i < b.length; i++) {
      var pos = b[i].pos+b[i].index*b[i].step;
      if (best === null || pos < best) {
        best = pos;
      }
    }
    return best;
  } // nextBlock

  /**
   * Hands the chip every block value whose position has been reached.
   * @param {number} now - The sample position rendered up to.
   */
  drainBlocks(now) {
    var b = this.blocks;
    for (var i = 0; i < b.length; i++) {
      var block = b[i];
      while (block.index < block.values.length && block.pos+block.index*block.step <= now) {
        this.chip.write(block.register, block.values[block.index]);
        block.index++;
      }
      if (block.index >= block.values.length) {
        // ★ **Finished** — and if the block carried a tag, that is reported
        // (see {@link #finished}).
        if (block.tag !== null) {
          this.finished.push(block.tag);
        }
        b.splice(i, 1);
        i--;
      }
    }
  } // drainBlocks

  /**
   * Queues one write at a sample position, keeping the queue ordered; a
   * later write at the same position stays later (the order of the
   * program's writes is the order of the stream).
   * @param {number} pos - The sample position.
   * @param {number} register - The chip's register.
   * @param {number} value - The byte.
   */
  push(pos, register, value) {
    var entry = {pos: pos, register: register, value: value};
    var q = this.queue;
    var i = q.length;
    while (i > 0 && q[i-1].pos > pos) {
      i--;
    }
    q.splice(i, 0, entry);
  } // push

  /**
   * Plays a script from now: frames at `rate` a second, each a list of
   * `[line, register, value]`.
   * @param {Array} frames - `[[[line, register, value], …], …]`.
   */
  play(frames) {
    this.scriptFrame += 1000000;
    this.reanchor(this.scriptFrame);
    for (var f = 0; f < frames.length; f++) {
      this.frame(this.scriptFrame+f, frames[f]);
    }
    this.scriptFrame += frames.length;
  } // play

  /**
   * Silence: the queue dropped, the chip reset, the anchor forgotten (the
   * next frame anchors afresh).
   */
  stop() {
    this.queue.length = 0;
    // ★ Dropped blocks **are still reported**: whoever waits for them would
    // otherwise wait forever (`stop` is silence, not a pause).
    for (var s = 0; s < this.blocks.length; s++) {
      if (this.blocks[s].tag !== null) { this.finished.push(this.blocks[s].tag); }
    }
    this.blocks.length = 0;
    this.chip.reset();
    this.anchorFrame = null;
  } // stop

  /**
   * Renders samples, applying every write whose position falls before the
   * sample being rendered — late writes (from before `samples`) at once, in
   * their order.
   * @param {Float32Array} out - Where the samples go.
   * @param {number} offset - The first index written.
   * @param {number} count - How many samples.
   */
  render(out, offset, count) {
    var q = this.queue;
    var end = this.samples+count;
    var i = offset;
    while (this.samples < end) {
      while (q.length && q[0].pos <= this.samples) {
        var w = q.shift();
        this.chip.write(w.register, w.value);
      }
      if (this.blocks.length) {
        this.drainBlocks(this.samples);
      }
      var next = q.length ? Math.min(q[0].pos, end) : end;
      var block = this.blocks.length ? this.nextBlock() : null;
      if (block !== null && block < next) {
        next = Math.max(block, this.samples);
      }
      // ★ **Whole samples, not fractions.** `next` is the position of an
      // event and it is fractional: a sample block steps by
      // `cadence*perLine`, for Impossible Mission's speech 101 cycles =
      // 4.53 samples. Using it as the render length directly moves `i` by a
      // fraction — and a `Float32Array` silently drops `out[offset+i]` at a
      // **non-integer index**. The sound is then neither silence nor noise:
      // only what happens to land on a whole number gets through, a few
      // per cent of the samples, heard as **faint crackling**. The writes of
      // `frame()` do not suffer from it — they are queued through
      // `Math.round` — so it only shows on digitised sound.
      var n = Math.floor(next)-this.samples;
      if (n <= 0) {
        n = 1;
      }
      if (this.samples+n > end) {
        n = end-this.samples;
      }
      this.chip.render(out, i, n);
      this.samples += n;
      i += n;
    }
  } // render

} // ChipStream
