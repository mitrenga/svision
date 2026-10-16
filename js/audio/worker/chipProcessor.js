// begin code

/**
 * An **AudioWorklet processor around a sound chip model** driven by a
 * {@link ChipStream}: the worker's frames of register writes come in over
 * the port, the chip renders on the audio thread. The general skeleton of
 * ROADMAP 3.4 — a game's board processor (Stinger, Pleiads) is the same
 * shape with a board of its own instead of a bare chip.
 *
 * An AudioWorklet module is a classic script and cannot import; the
 * {@link AudioChipHandler} therefore fetches the chip's file, `chipStream.js`
 * and this file, concatenates them (the bundle transformation of svtool,
 * `export ` stripped) and appends a line `registerChip('POKEY', POKEY);`
 * for the chip it wants, so the class is found by name in
 * `processorOptions.chip`. Nothing is duplicated: the very same chip file
 * renders under Node in `svision/tools/checkaudio.mjs` and in a game's
 * `match*` tool.
 *
 * Port messages:
 *   {id:'frame', frame, writes, blocks}   one worker frame: writes `[[line,
 *                 register, value], …]` and blocks of samples `[[line,
 *                 register, values, cadence, tag], …]` (a digitised sound;
 *                 `tag` is optional and comes back when the block has played)
 *
 * And back the other way:
 *   {id:'blockDone', tags:[…]}   the blocks with those tags have played out.
 *   ★ A game may have to **wait** for a digitised sound: Impossible
 *   Mission's `$BF51` polls its speech player before the world goes on,
 *   so the world is held until this arrives.
 *   {id:'play', audioData:{script: [[…writes], …]}}   a script from now (the volume dialogs' sample)
 *   {id:'stop'}    silence: the queue dropped, the chip reset
 *   {id:'pause'} / {id:'continue'} / {id:'mute'} / {id:'unmute'}
 *
 * `processorOptions`: `chip` (the registered name), `clock` (the chip's
 * clock in Hz), `rate`, `lines`, `latency`, `maxLead` (see ChipStream),
 * `gain` (the level the chip's full scale plays at, 1 by default).
 */

/** the chip classes by name, filled by the line the handler appends */
var CHIP_CLASSES = {};

/**
 * Makes a chip class available to the processor under a name.
 * @param {string} name - The name in `processorOptions.chip`.
 * @param {Function} chipClass - `new chipClass(clock, sampleRate)`.
 */
function registerChip(name, chipClass) {
  CHIP_CLASSES[name] = chipClass;
} // registerChip

class ChipProcessor extends AudioWorkletProcessor {

  constructor(options) {
    super(options);
    var o = (options && options.processorOptions) || {};
    var chipClass = CHIP_CLASSES[o.chip];
    if (!chipClass) {
      throw new Error('ChipProcessor: unknown chip '+o.chip);
    }
    this.chip = new chipClass(o.clock, sampleRate);
    this.stream = new ChipStream(this.chip, sampleRate, o);
    this.gain = ('gain' in o) ? o.gain : 1;
    this.paused = false;
    this.muted = false;
    this.port.onmessage = (event) => {
      var m = event.data;
      switch (m.id) {
        case 'frame':
          this.stream.frame(m.frame, m.writes);
          if (m.blocks) {
            for (var i = 0; i < m.blocks.length; i++) {
              var b = m.blocks[i];
              this.stream.block(m.frame, b[0], b[1], b[2], b[3], b[4]);
            }
          }
          break;
        case 'play':
          if (m.audioData && m.audioData.script) {
            this.stream.play(m.audioData.script);
          }
          break;
        case 'stop':
          this.stream.stop();
          break;
        case 'pause':
          this.paused = true;
          break;
        case 'continue':
          this.paused = false;
          break;
        case 'mute':
          this.muted = true;
          break;
        case 'unmute':
          this.muted = false;
          break;
      }
    };
  } // constructor

  /**
   * One render quantum: the stream renders into the first channel, the
   * other channels get a copy; paused, the stream stands still and the
   * output is silence.
   */
  process(inputs, outputs) {
    var channels = outputs[0];
    if (!channels || !channels.length) {
      return true;
    }
    var out = channels[0];
    if (this.paused) {
      out.fill(0);
    } else {
      this.stream.render(out, 0, out.length);
      var g = this.muted ? 0 : this.gain;
      if (g !== 1) {
        for (var i = 0; i < out.length; i++) {
          out[i] *= g;
        }
      }
    }
    for (var c = 1; c < channels.length; c++) {
      channels[c].set(out);
    }
    // ★ **What has finished is reported back** — even while paused, because
    // `stop` drops the blocks and whoever waits for them would wait forever.
    var done = this.stream.takeFinished();
    if (done.length) {
      this.port.postMessage({id: 'blockDone', tags: done});
    }
    return true;
  } // process

} // ChipProcessor

registerProcessor('ChipProcessor', ChipProcessor);
