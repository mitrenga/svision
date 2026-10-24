const { AbstractAudioHandler } = await import('./abstractAudioHandler.js?ver='+window.srcVersion);
const { Tool } = await import('../tool.js?ver='+window.srcVersion);
const { PCMSample } = await import('./pcmSample.js?ver='+window.srcVersion);
// begin code

/**
 * Coordinates multiple named audio buses, each backed by an audio
 * handler. Owns bus creation, lifecycle (open/close/stop/pause/
 * continue/mute), an audio-data cache, and the playSound dispatch logic
 * including resume retries while a bus's context is not yet running.
 */
export class AbstractAudioManager {

  /**
   * Creates the manager with empty bus, cache, and restart-sound maps.
   * @param {Object} app - The owning application instance, providing access to the model for event dispatch.
   */
  constructor(app) {
    this.app = app;
    this.id = 'AbstractAudioManager';
    this.ctx = null;
    // Rate requested for the shared context; lower = less audio-thread CPU (and
    // duller sound). Persisted in the 'audioSampleRate' cookie; useful with the
    // worklet (1-bit pulses adapt via getSampleRate) and oscillator handlers alike.
    this.sampleRate = this.validSampleRate(Number(Tool.readCookie('audioSampleRate', 44100)));
    // 'interactive' = small buffer / low latency (SFX-first); 'playback' = larger
    // buffer, much more resistant to audio-thread underruns (music-first) at the
    // cost of a slightly later sound start. Applied at context creation.
    this.latencyHint = 'interactive';
    this.buses = {};
    this.unsupportedAudioBus = false;
    this.audioDataCache = {};
    this.restartSounds = {};
  } // constructor

  /**
   * Normalizes a requested sample rate: rounded and kept within the Web Audio
   * guaranteed range 8000..96000 Hz, anything else falls back to 44100.
   * @param {number} rate - The requested sample rate in Hz.
   * @returns {number} A usable sample rate.
   */
  validSampleRate(rate) {
    rate = Math.round(rate);
    if (isFinite(rate) && rate >= 8000 && rate <= 96000) {
      return rate;
    }
    return 44100;
  } // validSampleRate

  /**
   * Sets the requested sample rate of the shared AudioContext and persists it
   * in the 'audioSampleRate' cookie. The rate is fixed at context creation, so
   * it only takes effect after all buses are closed (discarding the context)
   * and playback reopens them.
   * @param {number} rate - The sample rate in Hz (8000..96000, e.g. 44100, 22050, 11025, 8000).
   * @returns {void}
   */
  setSampleRate(rate) {
    this.sampleRate = this.validSampleRate(rate);
    Tool.writeCookie('audioSampleRate', this.sampleRate);
  } // setSampleRate

  /**
   * Lazily creates the single shared AudioContext that backs every bus, using
   * the manager's requested `sampleRate` (changing it therefore only takes
   * effect after all buses close and the context is recreated). When the
   * constructor rejects the requested rate the context is retried with the
   * platform defaults, and only if that fails too it is left null (the Web
   * Audio API is unavailable); handlers then report the unsupported bus on a
   * null context and the manager falls back to the silent handler.
   * @returns {void}
   */
  openAudioContext() {
    if (this.ctx == null) {
      var classAudioCtx = (window.AudioContext || window.webkitAudioContext);
      if (classAudioCtx != null) {
        try {
          this.ctx = new (classAudioCtx)({sampleRate: this.sampleRate, latencyHint: this.latencyHint});
        } catch(error) {
          try {
            this.ctx = new (classAudioCtx)();
          } catch(error2) {
            this.ctx = null;
          }
        }
      }
    }
  } // openAudioContext

  /**
   * Closes and discards the shared AudioContext, releasing the audio hardware.
   * Called once no buses remain open.
   * @returns {void}
   */
  closeAudioContext() {
    if (this.ctx != null) {
      // ★ Let go of the context at once — a bus opened next gets a fresh one —
      // but close it only after the buses' fade-outs (AudioChipHandler.closeBus)
      // have played out, so the chip's DC does not click off with the context.
      var ctx = this.ctx;
      this.ctx = null;
      setTimeout(() => { ctx.close(); }, AbstractAudioManager.CLOSE_DELAY);
    }
  } // closeAudioContext

  /** milliseconds a dropped AudioContext stays open for the buses' fade-outs */
  static get CLOSE_DELAY() { return 150; }

  /**
   * Returns the sample rate of the shared AudioContext, falling back to the
   * fixed 44100 Hz used for event timing when no context exists (e.g. while
   * audio is disabled).
   * @returns {number} The sample rate in Hz.
   */
  getSampleRate() {
    if (this.ctx == null) {
      return 44100;
    }
    return this.ctx.sampleRate;
  } // getSampleRate

  /**
   * Factory hook that creates the audio handler for a bus. Returns
   * false in the base class; subclasses override to supply a concrete handler.
   * @param {string} bus - Identifier of the bus.
   * @param {Object} options - Bus configuration options.
   * @returns {AbstractAudioHandler|boolean} A handler instance, or false when none can be created.
   */
  createAudioHandler(bus, options) {
    return false;
  } // createAudioHandler
  
  /**
   * Opens a bus: creates and registers the bus's handler when not
   * already present, ensures the shared AudioContext exists when that handler
   * needs one, passes the context to the handler, and resets the bus's
   * audio-data cache. A bus that is already open is only lifted out of a pause
   * left behind by whoever had it before.
   * @param {string} bus - Identifier of the bus to open.
   * @param {Object} options - Bus configuration options; may include `channelCount` (1 = mono, 2 = stereo).
   * @returns {void}
   */
  openBus(bus, options) {
    if (!(bus in this.buses)) {
      var audioHandler = this.createAudioHandler(bus, options);
      if (audioHandler != false) {
        if (audioHandler.needsContext()) {
          this.openAudioContext();
        }
        audioHandler.openBus(bus, options, this.ctx);
        this.buses[bus] = audioHandler;
      }
    } else {
      // the bus is already open, kept from the model that ran before this one;
      // it may have paused it, and an opened bus has to be able to play
      this.buses[bus].continueBus();
    }
    this.audioDataCache[bus] = {};
  } // openBus

  /**
   * Closes a bus, removing its handler when the close succeeds, and
   * resets the bus's audio-data cache. Discards the shared AudioContext
   * once no buses remain open.
   * @param {string} bus - Identifier of the bus to close.
   * @returns {void}
   */
  closeBus(bus) {
    if (bus in this.buses) {
      if (this.buses[bus].closeBus() == true) {
        delete this.buses[bus];
      }
    }
    this.audioDataCache[bus] = {};
    if (Object.keys(this.buses).length == 0) {
      this.closeAudioContext();
    }
  } // closeBus

  /**
   * Closes every currently open bus.
   * @returns {void}
   */
  closeAllBuses() {
    while (Object.keys(this.buses).length > 0) {
      this.closeBus(Object.keys(this.buses)[0]);
    }
    this.closeCounter++;
  } // closeAllBuses
  
  /**
   * Resumes the AudioContext of any bus that is not currently running,
   * recording any resume error on the bus's handler.
   * @returns {void}
   */
  refreshAllBuses() {
    Object.keys(this.buses).forEach(bus => {
      if (this.buses[bus].getState() != 'running') {
        if (this.buses[bus].ctx) {
          this.buses[bus].ctx.resume()
            .then(() => {
            })
            .catch(error => {
              console.error('AudioContext error: '+error.message);
              this.buses[bus].error = error.message;
            });
        }
      }
    });
  } // refreshAllBuses

  /**
   * Stops playback on a single bus. Stopping also lifts a pause: a stopped bus
   * has nothing to go on playing, so leaving it paused would only hide the
   * pause from the next model, whose first sound would then be silent.
   * @param {string} bus - Identifier of the bus to stop.
   * @returns {void}
   */
  stopBus(bus) {
    if (bus in this.buses) {
      this.buses[bus].stopBus();
      this.buses[bus].continueBus();
    }
  } // stopBus

  /**
   * Stops playback on every open bus.
   * @returns {void}
   */
  stopAllBuses() {
    Object.keys(this.buses).forEach(bus => {
      this.stopBus(bus);
    });
  } // stopAllBuses

  /**
   * Pauses playback on a single bus.
   * @param {string} bus - Identifier of the bus to pause.
   * @returns {void}
   */
  pauseBus(bus) {
    if (bus in this.buses) {
      this.buses[bus].pauseBus();
    }
  } // pauseBus

  /**
   * Pauses playback on every open bus.
   * @returns {void}
   */
  pauseAllBuses() {
    Object.keys(this.buses).forEach(bus => {
      this.pauseBus(bus);
    });
  } // pauseAllBuses

  /**
   * Resumes playback on a single bus.
   * @param {string} bus - Identifier of the bus to resume.
   * @returns {void}
   */
  continueBus(bus) {
    if (bus in this.buses) {
      this.buses[bus].continueBus();
    }
  } // continueBus

  /**
   * Resumes playback on every open bus.
   * @returns {void}
   */
  continueAllBuses() {
    Object.keys(this.buses).forEach(bus => {
      this.continueBus(bus);
    });
  } // continueAllBuses

  /**
   * Mutes or unmutes a single bus.
   * @param {string} bus - Identifier of the bus.
   * @param {boolean} muted - True to mute, false to unmute.
   * @returns {void}
   */
  muteBus(bus, muted) {
    if (bus in this.buses) {
      this.buses[bus].muteBus(muted);
    }
  } // continueBus

  /**
   * Plays a sound on a bus. If the bus's context is not yet running
   * it attempts to resume and reschedules the request (up to 64 attempts);
   * once running and ready it dispatches the cached audio data to the handler.
   * @param {string} bus - Identifier of the bus.
   * @param {string} sound - Identifier of the sound to play.
   * @param {Object|boolean} options - Playback options; false is normalized to a fresh options object.
   * @returns {void}
   */
  playSound(bus, sound, options) {
    if (options === false) {
      options = {attempts: 0};
    }
    if (!('attempts' in options)) {
      options.attempts = 0;
    }

    if (bus in this.buses) {
      this.restartSounds[bus] = {sound: sound, options: options};
      if (this.buses[bus].getState() != 'running' && options.attempts < 64) {
        if (this.buses[bus].error === false) {
          this.buses[bus].ctx.resume()
            .then(() => {
              this.buses[bus].error = false;
            })
            .catch(error => {
              console.error('AudioContext error: '+error.message);
              this.buses[bus].error = error.message;
            });
          options.attempts += 1;
          this.app.model.sendEvent(1, {id: 'playSound', bus: bus, sound: sound, options: options});
        } else {
          this.app.model.sendEvent(1, {id: 'errorAudioBus', bus: bus, sound: sound, options: options, error: this.buses[bus].error});
        }
      } else {
        if (this.buses[bus].busIsReady()) {
          delete this.restartSounds[bus];
          this.buses[bus].playSound(this.audioData(bus, sound, options), options);
        } else if (options.attempts < 64) {
          options.attempts += 1;
          this.app.model.sendEvent(1, {id: 'playSound', bus: bus, sound: sound, options: options});
        }
      }
    }
  } // playSound

  /**
   * A sound file (AAC, MP3, Ogg — whatever the browser decodes) fetched and
   * decoded into a sample for a sample bus: `decodeAudioData` needs the
   * context, which is opened for it (a context may be made before the
   * user's gesture; it only stays suspended until then). The sample is an
   * AudioBuffer, plain data usable under any later context.
   * @param {string} url - The file.
   * @param {Function} done - `(sample|null) => void` — null when the fetch or the decoding failed (logged).
   */
  loadSample(url, done) {
    this.openAudioContext();
    if (this.ctx == null) {
      done(null);
      return;
    }
    fetch(url).then((response) => {
      // a missing file behind the rewrite of the site is the page itself (200, text/html): not a sound
      var type = response.headers.get('content-type') || '';
      if (!response.ok || !/^(audio|video|application\/octet-stream)/.test(type)) {
        console.warn(url+': not a sound ('+(response.ok ? type : response.status)+')');
        return null;
      }
      return response.arrayBuffer();
    }).then((bytes) => bytes === null ? null : new Promise((resolve, reject) => {
      // the callback form: Safari's promise form came late; the promise Chrome returns as well is taken care of
      var p = this.ctx.decodeAudioData(bytes, resolve, (error) => reject(error || new Error(url+': decoding failed')));
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    })).then((buffer) => done(buffer ? PCMSample.fromAudioBuffer(buffer) : null)).catch((error) => {
      console.error(error.message ? error.message : error);
      done(null);
    });
  } // loadSample

  /**
   * The playback rate of a bus that plays samples (the music slowing down
   * with the energy): straight to the handler, no event — a game sets it
   * every frame.
   * @param {string} bus - Identifier of the bus.
   * @param {number} rate - 1 = the sample's own speed.
   * @returns {boolean} True when the bus is open and takes a rate.
   */
  rateBus(bus, rate) {
    if (!(bus in this.buses) || typeof this.buses[bus].setRate !== 'function') {
      return false;
    }
    this.buses[bus].setRate(rate);
    return true;
  } // rateBus

  /**
   * Fades a bus out over a time and stops it (a bus that cannot fade stops
   * at once).
   * @param {string} bus - Identifier of the bus.
   * @param {number} seconds - The fade.
   */
  fadeBus(bus, seconds) {
    if (!(bus in this.buses)) {
      return;
    }
    if (typeof this.buses[bus].fadeBus === 'function') {
      this.buses[bus].fadeBus(seconds);
    } else {
      this.stopBus(bus);
    }
  } // fadeBus

  /**
   * A live control of an instrument playing on a bus (the engine's rev, a
   * buzz's volume): straight to the handler, no event — a game calls it
   * every frame and it must not queue.
   * @param {string} bus - Identifier of the bus.
   * @param {string} instrument - The instrument's name in the playing score.
   * @param {string} control - The control.
   * @param {number} value - Its value.
   * @returns {boolean} True when the bus is open and the instrument took it.
   */
  controlSound(bus, instrument, control, value) {
    if (!(bus in this.buses)) {
      return false;
    }
    return this.buses[bus].controlInstrument(instrument, control, value);
  } // controlSound

  /**
   * One frame of register writes for a chip bus (AudioChipHandler): what the
   * game's worker reports the original wrote into the chip this frame, with
   * the line of each write, `{frame, writes: [[line, register, value], …]}`.
   * A closed bus drops it.
   * @param {string} bus - Identifier of the bus.
   * @param {Object} batch - The frame's writes.
   * @returns {void}
   */
  writeChip(bus, batch) {
    if (bus in this.buses) {
      this.buses[bus].writeChip(batch);
      return;
    }
    // ★ A closed bus drops the writes — but **a tagged block is still
    // reported**, because a game may wait for digitised sound to finish
    // (`AbstractAudioHandler.reportBlocksDone`).
    if (batch && batch.blocks && batch.blocks.length && this.app && this.app.model) {
      var tags = [];
      for (var i = 0; i < batch.blocks.length; i++) {
        if (batch.blocks[i][4] !== undefined) { tags.push(batch.blocks[i][4]); }
      }
      if (tags.length) {
        this.app.model.sendEvent(1, {id: 'blockDone', data: {id: 'blockDone', tags: tags}});
      }
    }
  } // writeChip

  /**
   * Whether a bus is playing something — for a game that starts a sound only
   * when the channel is free (the priority rule of Battlezone's channel 1).
   * @param {string} bus - Identifier of the bus.
   * @returns {boolean} True while a sound plays; false for a closed bus.
   */
  busIsPlaying(bus) {
    if (!(bus in this.buses)) {
      return false;
    }
    return this.buses[bus].isPlaying();
  } // busIsPlaying

  /**
   * Looks up cached, decoded audio data for a sound on a bus.
   * @param {string} bus - Identifier of the bus.
   * @param {string} sound - Identifier of the sound.
   * @param {Object} options - Playback options (unused in the base lookup).
   * @returns {Object|boolean} The cached audio data, or false when not cached.
   */
  audioData(bus, sound, options) {
    if (bus in this.audioDataCache) {
      if (sound in this.audioDataCache[bus]) {
        return this.audioDataCache[bus][sound];
      }
    }
    return false;
  } // audioData

} // AbstractAudioManager
