const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
// begin code

/**
 * How many frames of writes are kept while the AudioWorklet is still
 * loading: the module is fetched, composed and registered while the worker
 * already sends frames. A fifth of a second covers a cold cache; the chip
 * only needs the recent past, since its state is the register history.
 */
var BACKLOG_FRAMES = 12;

/**
 * And the bound on batches that carry a **block of samples**, which are
 * kept where plain writes are dropped (see {@link AudioChipHandler#trimBacklog}):
 * a sentence of speech is one batch, so this is generous and still bounded.
 */
var BACKLOG_BLOCKS = 64;

/**
 * The svtool bundle transformation (svision/tools/svtool, bundleCode()), so
 * an ES module can be concatenated into a classic script: what follows the
 * `// begin code` marker, without `export default` lines and without the
 * leading `export ` of declarations.
 * @param {string} text - The module's source.
 * @param {string} name - Its name, for a comment line.
 * @returns {string} The classic script.
 */
function bundleCode(text, name) {
  var marker = '// begin code';
  var pos = text.indexOf(marker);
  var code = (pos < 0) ? text : text.substring(pos+marker.length);
  code = code.replace(/^[ \t]*export[ \t]+default[ \t]+[^\n;]+;[ \t]*$/gm, '');
  code = code.replace(/^([ \t]*)export[ \t]+/gm, '$1');
  return '// === '+name+' ===\n'+code;
} // bundleCode

/**
 * Audio handler of a **sound chip driven by register writes**: the chip
 * model ({@link POKEY} first) runs in the AudioWorklet
 * `audio/worker/chipProcessor.js` on a {@link ChipStream}, and the game's
 * model feeds it the writes its worker reports frame by frame
 * (`writeChip`, through `AbstractAudioManager.writeChip`). A `playSound`
 * audioData is a script `{script: [[[line, register, value], …], …]}` — one
 * entry per frame — which is how a volume dialog plays its sample; its
 * `options.repeat` (true, a count, false) makes the script go round the way
 * the other handlers repeat a sound.
 *
 * Modelled on {@link AudioWorkletHandler}: the module is fetched and
 * registered from a blob URL so the service worker can serve it offline,
 * one registration per AudioContext and chip, and the bus volume is a gain
 * node between the worklet node and the destination. The worklet is
 * composed from three files (see chipProcessor.js), so the chip file stays
 * single-sourced for the browser, the worker and Node.
 *
 * Bus options beside the common ones (`muted`, `channelCount`):
 *   chip        the chip class's name ('POKEY')
 *   chipSource  its file under svision/js ('audio/chip/pokey.js')
 *   clock       the chip clock in Hz
 *   rate, lines, latency, maxLead   the ChipStream's timing (50 frames of 312 lines by default)
 *   gain        the level of the chip's full scale (1)
 *   fadeIn      seconds the bus gain takes to come up after the first frame
 *               of writes (0: none). ★ A chip comes out of reset with its
 *               volume at 0, and the program's first write of the volume
 *               register steps the output by the chip's whole DC offset — on
 *               the 6581 the thump every C64 program starts with, loud at the
 *               bus's gain. The ramp, over the stream's latency plus `fadeIn`,
 *               covers that first write. Off by default since the SID model
 *               charges its DC blocker on that write itself (2026-10-21): a
 *               ramp would only soften the first sound of a sample.
 *   fadeOut     seconds the gain takes to go down when the bus closes (0.05;
 *               0 for none): the chip is stopped and the nodes disconnected
 *               after it, so the DC the chip sits at does not click off.
 *
 * No ScriptProcessor fallback: a browser without AudioWorklet gets the
 * unsupported-bus event and the manager's silent handler.
 */
export class AudioChipHandler extends AbstractAudioHandler {

  /**
   * @param {Object} app - The owning application instance.
   */
  constructor(app) {
    super(app);
    /** R-055: the gains of the voice roles, posted to the worklet when it is up */
    this.roleGains = {};
    this.id = 'AudioChipHandler';
    this.node = null;
    this.gain = null;
    this.backlog = [];
    this.options = {};
    this.busFactor = 1.0;
    /** the fade-in of the gain after the first frame: seconds, and when it ends on the context's clock */
    this.fadeIn = 0;
    this.fadeOut = 0.05;
    this.latency = 0.06;
    this.fadeEnd = 0;
    this.faded = false;
    this.muted = false;
  } // constructor

  /**
   * Opens the bus and starts the worklet.
   * @param {string} bus - Identifier of the bus.
   * @param {Object} options - Bus options (see the class).
   * @param {AudioContext} ctx - The shared AudioContext.
   */
  openBus(bus, options, ctx) {
    super.openBus(bus, options, ctx);
    if (this.error === false && this.ctx != null) {
      this.options = options;
      this.muted = ('muted' in options) ? !!options.muted : false;
      this.openProcessor(options);
    } else {
      this.busy = false;
    }
  } // openBus

  /**
   * Fetches, composes and registers the worklet module, once per context
   * and chip; a failure clears the cached promise so a later bus can retry.
   * @returns {Promise<void>}
   */
  loadProcessorModule() {
    var key = 'chipProcessorModule_'+this.options.chip;
    if (!this.ctx[key]) {
      this.ctx[key] = (async () => {
        var base = this.app.importPath+'/svision/js/';
        var sources = [this.options.chipSource || 'audio/chip/pokey.js', 'audio/chip/chipStream.js', 'audio/worker/chipProcessor.js'];
        var parts = [];
        for (var i = 0; i < sources.length; i++) {
          var response = await fetch(base+sources[i]+'?ver='+window.srcVersion);
          if (!response.ok) {
            throw new Error(sources[i]+' '+response.status);
          }
          parts.push(bundleCode(await response.text(), sources[i]));
        }
        parts.push('registerChip('+JSON.stringify(this.options.chip)+', '+this.options.chip+');\n');
        var blobURL = URL.createObjectURL(new Blob([parts.join('\n')], {type: 'text/javascript'}));
        try {
          await this.ctx.audioWorklet.addModule(blobURL);
        } finally {
          URL.revokeObjectURL(blobURL);
        }
      })().catch((error) => {
        this.ctx[key] = null;
        throw error;
      });
    }
    return this.ctx[key];
  } // loadProcessorModule

  /**
   * Registers the module, creates the node with the chip's options and the
   * gain stage, and hands over the frames that arrived meanwhile; on any
   * failure reports the unsupported bus.
   * @param {Object} options - Bus options.
   * @returns {Promise<void>}
   */
  async openProcessor(options) {
    try {
      await this.loadProcessorModule();
      var o = {chip: options.chip, clock: options.clock, rate: options.rate, lines: options.lines, gain: options.gain};
      if ('latency' in options) {
        o.latency = options.latency;
      }
      if ('maxLead' in options) {
        o.maxLead = options.maxLead;
      }
      Object.keys(o).forEach((k) => { if (o[k] === undefined) delete o[k]; });
      this.node = new AudioWorkletNode(this.ctx, 'ChipProcessor', {
        numberOfInputs: 0, numberOfOutputs: 1,
        outputChannelCount: [Math.min(this.channelCount, this.ctx.destination.maxChannelCount || 1)],
        processorOptions: o
      });
      this.gain = this.ctx.createGain();
      this.fadeIn = ('fadeIn' in options) ? Number(options.fadeIn) || 0 : 0;
      this.fadeOut = ('fadeOut' in options) ? Number(options.fadeOut) || 0 : 0.05;
      this.latency = ('latency' in options) ? options.latency : 0.06;
      this.faded = false;
      this.fadeEnd = 0;
      // the gain waits at 0 for the first frame of writes (startFade), unless there is no fade
      this.gain.gain.value = (this.fadeIn > 0) ? 0.0 : (this.muted ? 0.0 : this.busFactor);
      this.node.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      Object.keys(this.roleGains).forEach((role) => { this.post({id: 'roleGain', role: Number(role), gain: this.roleGains[role]}); });
      this.node.port.onmessage = (event) => {
        this.app.model.sendEvent(1, {id: event.data.id, data: event.data});
      };
      this.flushBacklog();
    } catch (error) {
      console.error('AudioChipHandler: '+error.message);
      this.node = null;
      this.app.model.sendEvent(1, {id: 'unsupportedAudioBus', bus: this.bus});
    } finally {
      this.busy = false;
    }
  } // openProcessor

  /**
   * Stops the processor, disconnects the nodes and closes the bus. ★ With
   * `fadeOut` the gain goes down first and the stop and the disconnecting
   * follow after it (the manager keeps the AudioContext open that long,
   * {@link AbstractAudioManager#closeAudioContext}); the bus itself counts
   * as closed at once.
   * @returns {boolean} True when the bus was closed.
   */
  closeBus() {
    if (this.waitForBusy('closeAudioBus')) {
      return false;
    }
    if (this.node) {
      var node = this.node, gain = this.gain, ctx = this.ctx;
      var finish = () => {
        node.port.postMessage({id: 'stop'});
        node.disconnect();
        if (gain) {
          gain.disconnect();
        }
      };
      if (gain && ctx && this.fadeOut > 0 && ctx.state === 'running') {
        var now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0, now+this.fadeOut);
        setTimeout(finish, Math.round(this.fadeOut*1000)+20);
      } else {
        finish();
      }
      this.node = null;
      this.gain = null;
    }
    // ★ What is left in the backlog **is still reported**: whoever waits for
    // a block to finish would wait forever once the bus is closed.
    for (var i = 0; i < this.backlog.length; i++) {
      this.reportBlocksDone(this.backlog[i]);
    }
    this.backlog.length = 0;
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
    return super.closeBus();
  } // closeBus

  post(message) {
    if (this.node != null) {
      this.node.port.postMessage(message);
    }
  } // post

  /**
   * The gain's target as it stands: 0 when muted, the bus factor otherwise.
   * @returns {number}
   */
  gainTarget() {
    return this.muted ? 0.0 : this.busFactor;
  } // gainTarget

  /**
   * Brings the gain up from 0 after the first frame of writes or script:
   * a linear ramp over the stream's latency plus `fadeIn`, so the chip's
   * first volume write lands under it. Once per opened bus.
   */
  startFade() {
    if (this.faded || !this.gain) {
      return;
    }
    this.faded = true;
    if (this.fadeIn <= 0) {
      return;
    }
    var now = this.ctx.currentTime;
    this.fadeEnd = now+this.latency+this.fadeIn;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(0.0, now);
    this.gain.gain.linearRampToValueAtTime(this.gainTarget(), this.fadeEnd);
  } // startFade

  /**
   * Applies the gain's target: at once, or — while the fade-in is still
   * running — as the rest of the ramp, so a volume set or a mute right after
   * the bus opened does not cut the fade short and let the thump through.
   */
  applyGain() {
    if (!this.gain) {
      return;
    }
    var now = this.ctx.currentTime;
    var value = this.gain.gain.value;
    this.gain.gain.cancelScheduledValues(now);
    if (this.faded && now < this.fadeEnd) {
      this.gain.gain.setValueAtTime(value, now);
      this.gain.gain.linearRampToValueAtTime(this.gainTarget(), this.fadeEnd);
    } else if (!this.faded && this.fadeIn > 0) {
      this.gain.gain.setValueAtTime(0.0, now);
    } else {
      this.gain.gain.setValueAtTime(this.gainTarget(), now);
    }
  } // applyGain

  /**
   * One frame of the worker's writes: `{frame, writes: [[line, register,
   * value], …]}`, and optionally `blocks: [[line, register, values,
   * cadence, tag], …]` — blocks of samples, which a digitised sound comes
   * in rather than write by write ({@link ChipStream#block}). Held in a
   * bounded backlog while the worklet loads.
   *
   * ★ A block's optional **`tag`** comes back as an event `blockDone` with
   * the tags of the blocks that have played out, so a game can **wait** for
   * a digitised sound (Impossible Mission's `$BF51` waits for its speech
   * player before the world goes on). A tag is reported exactly once, even
   * when the bus cannot play the block at all
   * ({@link AbstractAudioHandler#reportBlocksDone}).
   * @param {Object} batch - The frame's writes.
   */
  writeChip(batch) {
    if (!batch) {
      return;
    }
    if (this.node == null) {
      this.backlog.push(batch);
      this.trimBacklog();
      return;
    }
    this.flushBacklog();
    this.postBatch(batch);
  } // writeChip

  /**
   * Cuts the backlog back to its bound — but ★ **a block of samples is not
   * dropped**. A frame of register writes may be thrown away because the
   * chip's state is its register history: the writes that follow say what
   * the chip is. A **block** is not state, it is an event — a digitised
   * sound that was played once — and a dropped one is a sentence nobody
   * hears. Since a block is rare (one message for seconds of sound), they
   * are kept up to a much higher bound of their own, so the backlog stays
   * bounded either way.
   */
  trimBacklog() {
    var i;
    while (this.backlog.length > BACKLOG_FRAMES) {
      for (i = 0; i < this.backlog.length; i++) {
        if (!this.backlog[i].blocks || !this.backlog[i].blocks.length) {
          this.backlog.splice(i, 1);
          break;
        }
      }
      if (i >= this.backlog.length) {
        break;                                 // nothing but blocks left
      }
    }
    while (this.backlog.length > BACKLOG_BLOCKS) {
      this.backlog.shift();
    }
  } // trimBacklog

  /**
   * One batch over the port: the frame's writes and its blocks of samples.
   * @param {Object} batch - `{frame, writes, blocks}`.
   */
  postBatch(batch) {
    this.node.port.postMessage({id: 'frame', frame: batch.frame,
                                writes: batch.writes, blocks: batch.blocks});
    this.startFade();
  } // postBatch

  /** hands over the frames that arrived while the worklet was still loading */
  flushBacklog() {
    if (this.backlog.length === 0 || this.node == null) {
      return;
    }
    for (var i = 0; i < this.backlog.length; i++) {
      this.postBatch(this.backlog[i]);
    }
    this.backlog.length = 0;
  } // flushBacklog

  stopBus() {
    this.backlog.length = 0;
    this.post({id: 'stop'});
  } // stopBus

  pauseBus() {
    this.post({id: 'pause'});
  } // pauseBus

  continueBus() {
    this.post({id: 'continue'});
  } // continueBus

  muteBus(muted) {
    this.muted = !!muted;
    this.applyGain();
  } // muteBus

  /**
   * The bus volume: a factor on the gain stage.
   * @param {number} factor - Linear gain (1.0 = the chip's own level).
   */
  setBusVolume(factor) {
    this.busFactor = factor;
    this.applyGain();
  } // setBusVolume

  /**
   * R-055: the gain of a **role** of the chip's voices — music or effects —
   * for a chip whose program plays both on the same voices and says which
   * is which in the stream (`SID.ROLE_REGISTER`). Kept here too, so a bus
   * opened later gets it when its worklet is up.
   * @param {number} role - 0 music, 1 effects.
   * @param {number} gain - 0-1.
   */
  setRoleGain(role, gain) {
    this.roleGains[role] = gain;
    this.post({id: 'roleGain', role: role, gain: gain});
  } // setRoleGain

  busIsReady() {
    return this.node != null;
  } // busIsReady

  /**
   * Plays a script: `audioData = {script: [[[line, register, value], …], …]}`.
   * @param {Object} audioData - The script.
   * @param {Object|boolean} options - Unused.
   */
  playSound(audioData, options) {
    this.post({id: 'play', audioData: audioData, options: {repeat: (options && 'repeat' in options) ? options.repeat : false}});
    this.startFade();
  } // playSound

} // AudioChipHandler
