const { OPL2 } = await import('./opl2.js?ver='+window.srcVersion);
const { GenMidi } = await import('./genmidi.js?ver='+window.srcVersion);
// begin code

/**
 * The **MUS player**: the music of DOOM on an OPL2, the way the DMX library
 * played it.
 *
 * `MUS` is the music format of the id games from DOOM on - a MIDI stream
 * squeezed into a byte or two per event, 140 ticks a second, sixteen
 * channels of which the last is percussion. The chip it was written for is
 * the two operator {@link OPL2} of the AdLib and the Sound Blaster, and
 * the instruments come from the game's own {@link GenMidi} bank. What this
 * class does is what the driver of the original did between the two:
 * read the events at their time, keep a channel's instrument, volume and
 * pitch bend, take a free one of the nine voices for a note, programme it,
 * set its volume and key it on - and when the voices run out, decide which
 * note gives way.
 *
 * ## What it reproduces ★
 *
 * The DMX library was never released. Its behaviour is known from the
 * reconstruction in Chocolate Doom's `i_oplmusic.c` (GPLv2; the behaviour
 * is followed, the code is not copied - R-029), which reproduces the
 * driver of DOOM v1.9 note for note, and two of its tables are facts about
 * that driver, taken as numbers: the **frequency curve** (the F-number of
 * every 32nd of a semitone, 668 entries) and the **volume map** (MIDI
 * volume to the chip's 0..127). Everything a listener can tell is here:
 *
 *  - **the MIDI channel a MUS channel plays on is handed out in the order
 *    the channels first appear** ★, skipping MIDI 9; MUS channel 15 is
 *    MIDI 9 (percussion). The driver then looks at the channels through a
 *    swap of 9 and 15, so the percussion has the lowest priority of all;
 *  - a note takes **the first voice of the free list**, and a released
 *    voice goes to **its end**; with none free, the voice given up is the
 *    last allocated one that plays a second voice or belongs to a channel
 *    with a number at least as high as the loser so far ★;
 *  - a pitch bend re-orders the allocated list: the voices it moved go to
 *    the back ★;
 *  - the volume of a note is `(map[velocity] · 2·(map[channel volume]+1))
 *    >> 9`, the carrier's level `0x3F` minus that; an additive instrument
 *    has its modulator follow the carrier down;
 *  - a channel's volume is clipped to the music volume at the time the song
 *    started ★ (`start_music_volume`), 64 of 127 by default - the setting
 *    of the original's `default.cfg`;
 *  - a note off is by channel and key; a second note on with velocity 0 is
 *    a note off; the percussion channel ignores keys outside 35..81;
 *  - a tick is `500 000 / 70` microseconds: MUS is converted to MIDI at 70
 *    ticks a beat, 120 beats a minute, and the wait before an event is
 *    **the floor of the whole product** ★, not the sum of rounded ticks;
 *  - a looping piece **restarts 5 ms after its end**, re-initialising the
 *    channels but leaving the sounding voices alone ★.
 *
 * What the OPL3 mode of the driver does (stereo, eighteen voices) is not
 * here: the reference machine has an OPL2 (`ZADANI.md` para 5).
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches the browser. The same class renders in a worklet, in
 * a worker and under Node, and with `log: true` it keeps every register
 * write with its time in microseconds - what `doom/tools/matchsound.mjs`
 * holds against the stream the original's driver wrote (R-001).
 *
 * @example
 * var player = new AdlibMUS({bank: new GenMidi(genmidiBytes), sampleRate: 44100});
 * player.play(musBytes, {looping: true});
 * var samples = player.renderAll(60);
 */
export class AdlibMUS {

  /** MUS ticks a second. */
  static get TICK_RATE() { return 140; }
  /** The MIDI the driver plays: 70 ticks a beat at 500 000 microseconds a beat. */
  static get TICKS_PER_BEAT() { return 70; }
  static get US_PER_BEAT() { return 500000; }
  /** A looping piece starts again this long after its end. */
  static get RESTART_US() { return 5000; }
  static get VOICES() { return 9; }
  static get CHANNELS() { return 16; }
  static get MUS_PERCUSSION() { return 15; }
  static get MIDI_PERCUSSION() { return 9; }
  /** The MUS controllers as MIDI controller numbers (`controller_map`). */
  static get CONTROLLER_MAP() { return CONTROLLER_MAP; }
  static get FREQUENCY_CURVE() { return FREQUENCY_CURVE; }
  static get VOLUME_MAP() { return VOLUME_MAP; }

  /**
   * @param {Object} options
   * @param {GenMidi} options.bank - The instruments.
   * @param {number} [options.sampleRate] - What to render at; the chip's own 49716 Hz by default.
   * @param {number} [options.gain=1] - A factor on the way out.
   * @param {number} [options.musicVolume=64] - The music volume, 0..127 (the original's default 8 of 15).
   * @param {boolean} [options.log=false] - Keep every register write as `[us, register, value]` in {@link AdlibMUS#log}.
   * @param {OPL2} [options.chip] - A chip of one's own.
   */
  constructor(options) {
    var settings = options || {};
    this.id = 'AdlibMUS';
    if (!settings.bank) throw new Error('AdlibMUS: a GenMidi bank is needed');
    this.bank = settings.bank;
    this.chip = settings.chip || new OPL2({sampleRate: settings.sampleRate});
    this.sampleRate = this.chip.sampleRate;
    this.gain = settings.gain === undefined ? 1 : settings.gain;
    /** every register write as `[us, register, value]`, when asked for */
    this.log = settings.log ? [] : null;
    /** the driver's clock, microseconds since the chip was initialised */
    this.time = 0;
    /** samples rendered so far */
    this.samples = 0;
    /** how many samples the clock is behind the samples (a pause) */
    this.offset = 0;
    this.paused = false;

    this.voices = [];
    for (var v = 0; v < AdlibMUS.VOICES; v++) {
      this.voices.push({
        index: v, op1: VOICE_OPERATORS[0][v], op2: VOICE_OPERATORS[1][v],
        instrument: null, instrumentVoice: 0, channel: null, key: 0, note: 0, freq: 0,
        noteVolume: 0, carVolume: 0, modVolume: 0, regPan: 0, priority: 0
      });
    }
    /** the free list and the allocated list, in the driver's order */
    this.free = this.voices.slice();
    this.allocated = [];
    this.channels = [];
    for (var c = 0; c < AdlibMUS.CHANNELS; c++) {
      this.channels.push({index: c, instrument: null, volume: 0, volumeBase: 0, pan: 0x30, bend: 0});
    }
    this.currentMusicVolume = 0;
    this.startMusicVolume = 0;

    /** the piece: its events, and where the player is in them */
    this.score = null;
    this.looping = false;
    this.position = 0;
    /** the next callback: the sample it falls on and what it does ('event', 'restart'), or null */
    this.next = null;
    this.finished = true;
    /** how many times the piece started over */
    this.restarts = 0;

    this.initRegisters();
    this.setMusicVolume(settings.musicVolume === undefined ? 64 : settings.musicVolume);
  } // constructor

  /**
   * The register writes a piece makes in so many seconds, without a chip:
   * the driver alone, on a clock of a microsecond a sample. What a tool
   * holds against the stream the original's driver wrote.
   * @param {GenMidi} bank - The instruments.
   * @param {Uint8Array|Object} piece - The MUS lump, or a score of it.
   * @param {number} seconds - How long to run.
   * @param {Object} [options] - `looping` (true), `musicVolume` (64).
   * @returns {Array} `[[us, register, value], ...]`, the initialisation first.
   */
  static writesOf(bank, piece, seconds, options) {
    var settings = options || {};
    var silent = {sampleRate: 1000000, write: function() {}, render: function() {}, reset: function() {}};
    var player = new AdlibMUS({bank: bank, chip: silent, log: true, musicVolume: settings.musicVolume});
    player.play(piece, {looping: settings.looping});
    var out = new Float32Array(1000000);
    var left = Math.round(seconds*1000000);
    while (left > 0) {
      var chunk = Math.min(left, out.length);
      player.render(out, chunk);
      left -= chunk;
    }
    return player.log;
  } // writesOf

  // ------------------------------------------------------------- the score

  /**
   * The events of a MUS lump, in order, with the MIDI channel each one
   * plays on. This is the conversion the original makes before playing
   * (MUS to MIDI): the channel mapping is part of what is heard, because
   * the driver's voice stealing goes by channel number.
   * @param {Uint8Array} bytes - The lump.
   * @returns {Object} `{header, events, ticks}`: the header's fields, the
   *   events `{delta, type, channel, key, velocity, value, controller, programme}`
   *   (delta in MUS ticks since the previous event, type one of 'off', 'on',
   *   'bend', 'control', 'program', 'end'), and the length in ticks.
   */
  static score(bytes) {
    var word = function(at) { return bytes[at] | (bytes[at+1] << 8); };
    var header = {
      id: String.fromCharCode(bytes[0], bytes[1], bytes[2]), marker: bytes[3],
      scoreLength: word(4), scoreStart: word(6),
      primaryChannels: word(8), secondaryChannels: word(10), instrumentCount: word(12),
      reserved: word(14),
      instruments: []
    };
    for (var i = 0; i < header.instrumentCount; i++) header.instruments.push(word(16+i*2));
    var events = [];
    var map = new Array(AdlibMUS.CHANNELS).fill(-1);
    var velocities = new Array(AdlibMUS.CHANNELS).fill(127);
    var queued = 0;
    var ticks = 0;
    var at = header.scoreStart;
    var push = function(event) { event.delta = queued; queued = 0; events.push(event); };
    var midiChannel = function(mus) {
      if (mus === AdlibMUS.MUS_PERCUSSION) return AdlibMUS.MIDI_PERCUSSION;
      if (map[mus] === -1) {
        var max = -1;
        for (var m = 0; m < map.length; m++) if (map[m] > max) max = map[m];
        var next = max+1;
        if (next === AdlibMUS.MIDI_PERCUSSION) next++;
        map[mus] = next;
        // a fresh channel starts with "all notes off", as the conversion writes it
        push({type: 'control', channel: next, controller: 0x7B, value: 0});
      }
      return map[mus];
    };
    var byte = function() {
      if (at >= bytes.length) throw new Error('AdlibMUS: the score runs past the end of the lump');
      return bytes[at++];
    };
    for (;;) {
      var descriptor = byte();
      var channel = midiChannel(descriptor & 0x0F);
      var type = descriptor & 0x70;
      var key, value, controller;
      var end = false;
      switch (type) {
        case 0x00:
          key = byte();
          push({type: 'off', channel: channel, key: key & 0x7F, velocity: 0});
          break;
        case 0x10:
          key = byte();
          if (key & 0x80) velocities[channel] = byte() & 0x7F;
          push({type: 'on', channel: channel, key: key & 0x7F, velocity: velocities[channel]});
          break;
        case 0x20:
          value = byte();
          // the wheel as 14 bits, of which the driver reads the top seven
          push({type: 'bend', channel: channel, value: (value*64 >> 7) & 0x7F});
          break;
        case 0x30:
          controller = byte();
          if (controller < 10 || controller > 14) throw new Error('AdlibMUS: system event '+controller+' is not one of 10..14');
          push({type: 'control', channel: channel, controller: CONTROLLER_MAP[controller], value: 0});
          break;
        case 0x40:
          controller = byte();
          value = byte();
          if (controller === 0) {
            push({type: 'program', channel: channel, programme: value & 0x7F});
          } else {
            if (controller > 9) throw new Error('AdlibMUS: controller '+controller+' is not one of 0..9');
            push({type: 'control', channel: channel, controller: CONTROLLER_MAP[controller], value: (value & 0x80) ? 0x7F : value});
          }
          break;
        case 0x60:
          end = true;
          break;
        default:
          throw new Error('AdlibMUS: event type 0x'+type.toString(16)+' is not MUS');
      }
      if (end) break;
      if (descriptor & 0x80) {
        var delay = 0;
        var b;
        do {
          b = byte();
          delay = delay*128+(b & 0x7F);
        } while (b & 0x80);
        queued += delay;
        ticks += delay;
      }
    }
    push({type: 'end', channel: 0});
    return {header: header, events: events, ticks: ticks};
  } // score

  /**
   * The wait before an event: its delta in MUS ticks as the driver times it.
   * @param {number} delta - MUS ticks.
   * @returns {number} Microseconds, the floor of the whole product ★.
   */
  static waitOf(delta) {
    return Math.floor(delta*AdlibMUS.US_PER_BEAT/AdlibMUS.TICKS_PER_BEAT);
  } // waitOf

  /**
   * How long one pass of a score lasts, from the start to its end marker.
   * @param {Object} score - As {@link AdlibMUS.score} gives it.
   * @returns {number} Microseconds.
   */
  static passUs(score) {
    var us = 0;
    for (var i = 0; i < score.events.length; i++) us += AdlibMUS.waitOf(score.events[i].delta);
    return us;
  } // passUs

  // ---------------------------------------------------------------- playing

  /**
   * Starts a piece. The chip's registers are as the driver left them - a
   * voice still sounding from the last piece is keyed off by the "all
   * notes off" a stop makes; call {@link AdlibMUS#stop} first for that.
   * @param {Uint8Array|Object} piece - The MUS lump, or a score of it.
   * @param {Object} [options] - `looping` (true): start over 5 ms after the end.
   * @returns {AdlibMUS} This player.
   */
  play(piece, options) {
    var settings = options || {};
    this.score = piece instanceof Uint8Array ? AdlibMUS.score(piece) : piece;
    this.looping = settings.looping === undefined ? true : !!settings.looping;
    this.position = 0;
    this.finished = false;
    this.restarts = 0;
    this.startMusicVolume = this.currentMusicVolume;
    this.scheduleEvent();
    for (var c = 0; c < this.channels.length; c++) this.initChannel(this.channels[c]);
    this.paused = false;
    return this;
  } // play

  /**
   * Stops the piece: every voice released, no more events.
   */
  stop() {
    this.next = null;
    this.finished = true;
    for (var c = 0; c < this.channels.length; c++) this.allNotesOff(this.channels[c]);
    this.score = null;
  } // stop

  /**
   * Pauses: the clock stops, the melodic voices are keyed off (the
   * percussion is left to ring out, as the original does ★).
   */
  pause() {
    if (this.paused) return;
    this.paused = true;
    for (var v = 0; v < this.voices.length; v++) {
      var voice = this.voices[v];
      if (voice.channel !== null && voice.instrument !== null && !this.bank.isPercussion(voice.instrument)) this.keyOff(voice);
    }
  } // pause

  /** Goes on after a pause. */
  resume() {
    this.paused = false;
  } // resume

  /**
   * The music volume, 0..127, applied to every channel (`I_OPL_SetMusicVolume`).
   * @param {number} volume - 0..127.
   */
  setMusicVolume(volume) {
    if (this.currentMusicVolume === volume) return;
    this.currentMusicVolume = volume;
    for (var c = 0; c < this.channels.length; c++) {
      var channel = this.channels[c];
      this.setChannelVolume(channel, c === 15 ? volume : channel.volumeBase, false);
    }
  } // setMusicVolume

  /** How long one pass of the piece is, in seconds (0 with nothing loaded). */
  get pieceSeconds() {
    return this.score === null ? 0 : AdlibMUS.passUs(this.score)/1000000;
  } // pieceSeconds

  /**
   * Renders the next samples, making the register writes that fall in them.
   * @param {Float32Array} out - Where the samples go.
   * @param {number} [count] - How many; the whole array by default.
   * @param {number} [offset=0] - Where in the array to start.
   * @returns {Float32Array} `out`.
   */
  render(out, count, offset) {
    var at = offset || 0;
    var left = count === undefined ? out.length-at : count;
    while (left > 0) {
      var chunk = left;
      if (this.paused) {
        this.offset += chunk;
      } else {
        while (this.next !== null && this.next.sample+this.offset <= this.samples) this.fire();
        if (this.next !== null) chunk = Math.min(left, Math.max(1, this.next.sample+this.offset-this.samples));
      }
      this.chip.render(out.subarray(at, at+chunk), chunk, this.gain);
      this.samples += chunk;
      at += chunk;
      left -= chunk;
    }
    return out;
  } // render

  /**
   * So many seconds of the piece as samples.
   * @param {number} seconds - The length.
   * @returns {Float32Array} Mono samples, -1..1.
   */
  renderAll(seconds) {
    var out = new Float32Array(Math.max(1, Math.round(seconds*this.sampleRate)));
    return this.render(out);
  } // renderAll

  // -------------------------------------------------------------- the clock

  /** The sample a time falls on. */
  sampleOf(us) {
    return Math.floor(us*this.sampleRate/1000000);
  } // sampleOf

  /** Queues the callback for the event at `position`, `wait` after now (`ScheduleTrack`). */
  scheduleEvent() {
    var event = this.score.events[this.position];
    var us = this.time+AdlibMUS.waitOf(event.delta);
    this.next = {us: us, sample: this.sampleOf(us), what: 'event'};
  } // scheduleEvent

  /** The next callback: an event of the track, or the restart of the piece. */
  fire() {
    var next = this.next;
    this.next = null;
    this.time = next.us;
    if (next.what === 'restart') {
      this.restart();
      return;
    }
    var event = this.score.events[this.position];
    this.handle(event);
    if (event.type === 'end') {
      if (this.looping) {
        var us = this.time+AdlibMUS.RESTART_US;
        this.next = {us: us, sample: this.sampleOf(us), what: 'restart'};
      } else {
        this.finished = true;
      }
      return;
    }
    this.position++;
    this.scheduleEvent();
  } // fire

  /** `RestartSong`: the track from its first event, the channels as at the start; the voices as they are ★. */
  restart() {
    this.restarts++;
    this.startMusicVolume = this.currentMusicVolume;
    this.position = 0;
    this.scheduleEvent();
    for (var c = 0; c < this.channels.length; c++) this.initChannel(this.channels[c]);
  } // restart

  // ------------------------------------------------------------- the driver

  /** One write to the chip, now. */
  write(register, value) {
    if (this.log !== null) this.log.push([this.time, register, value]);
    this.chip.write(register, value);
  } // write

  /**
   * What the original writes when it finds the card (`OPL_InitRegisters`):
   * every level register to silence, every other operator register to
   * zero - including a few that do not exist - the low registers to zero,
   * the timers reset, the waveform select on, the keyboard split on.
   */
  initRegisters() {
    var r;
    for (r = 0x40; r <= 0x40+OPERATOR_REGISTERS; r++) this.write(r, 0x3F);
    for (r = 0x60; r <= 0xE0+OPERATOR_REGISTERS; r++) this.write(r, 0x00);
    for (r = 1; r < 0x40; r++) this.write(r, 0x00);
    this.write(0x04, 0x60);
    this.write(0x04, 0x80);
    this.write(0x01, 0x20);
    this.write(0x08, 0x40);
  } // initRegisters

  /** `InitChannel`: the piano, the volume of the moment (at most 100), no bend. */
  initChannel(channel) {
    channel.instrument = this.bank.instruments[0];
    channel.volume = this.currentMusicVolume;
    channel.volumeBase = 100;
    if (channel.volume > channel.volumeBase) channel.volume = channel.volumeBase;
    channel.pan = 0x30;
    channel.bend = 0;
  } // initChannel

  /** The channel record an event's MIDI channel means: 9 and 15 swapped back to MUS numbering. */
  channelOf(event) {
    var number = event.channel;
    if (number === 9) number = 15;
    else if (number === 15) number = 9;
    return this.channels[number];
  } // channelOf

  handle(event) {
    switch (event.type) {
      case 'off': this.keyOffEvent(event); break;
      case 'on': this.keyOnEvent(event); break;
      case 'control': this.controllerEvent(event); break;
      case 'program': this.channelOf(event).instrument = this.bank.instruments[event.programme]; break;
      case 'bend': this.pitchBendEvent(event); break;
      default: break;
    }
  } // handle

  /** `GetFreeVoice`: the first of the free list, moved to the end of the allocated list. */
  freeVoice() {
    if (this.free.length === 0) return null;
    var voice = this.free.shift();
    this.allocated.push(voice);
    return voice;
  } // freeVoice

  /** `ReleaseVoice`: keyed off, out of the allocated list, to the end of the free list. */
  releaseVoice(index) {
    var voice = this.allocated[index];
    this.keyOff(voice);
    voice.channel = null;
    voice.note = 0;
    this.allocated.splice(index, 1);
    this.free.push(voice);
  } // releaseVoice

  keyOff(voice) {
    this.write(0xB0+voice.index, voice.freq >> 8);
  } // keyOff

  /** `LoadOperatorData`: the five registers of an operator; the level at full attenuation when asked. */
  loadOperator(operator, data, maxLevel) {
    var level = data.scale | (maxLevel ? 0x3F : data.level);
    this.write(0x40+operator, level);
    this.write(0x20+operator, data.tremolo);
    this.write(0x60+operator, data.attack);
    this.write(0x80+operator, data.sustain);
    this.write(0xE0+operator, data.waveform);
    return level;
  } // loadOperator

  /** `SetVoiceInstrument`: carrier first, then modulator, then the connection; the voice's priority from the carrier's envelope. */
  setVoiceInstrument(voice, instrument, instrumentVoice) {
    if (voice.instrument === instrument && voice.instrumentVoice === instrumentVoice) return;
    voice.instrument = instrument;
    voice.instrumentVoice = instrumentVoice;
    var data = instrument.voices[instrumentVoice];
    var modulating = (data.feedback & 0x01) === 0;
    voice.carVolume = this.loadOperator(voice.op2, data.carrier, true);
    voice.modVolume = this.loadOperator(voice.op1, data.modulator, !modulating);
    this.write(0xC0+voice.index, data.feedback | voice.regPan);
    voice.priority = 0x0F-(data.carrier.attack >> 4)+0x0F-(data.carrier.sustain & 0x0F);
  } // setVoiceInstrument

  /** `SetVoiceVolume`: the note's velocity times the channel's volume into the carrier's level. */
  setVoiceVolume(voice, volume) {
    voice.noteVolume = volume;
    var data = voice.instrument.voices[voice.instrumentVoice];
    var midiVolume = 2*(VOLUME_MAP[voice.channel.volume]+1);
    var full = (VOLUME_MAP[voice.noteVolume]*midiVolume) >> 9;
    var carVolume = 0x3F-full;
    if (carVolume !== (voice.carVolume & 0x3F)) {
      voice.carVolume = carVolume | (voice.carVolume & 0xC0);
      this.write(0x40+voice.op2, voice.carVolume);
      if ((data.feedback & 0x01) !== 0 && data.modulator.level !== 0x3F) {
        var modVolume = data.modulator.level;
        if (modVolume < carVolume) modVolume = carVolume;
        modVolume |= voice.modVolume & 0xC0;
        if (modVolume !== voice.modVolume) {
          voice.modVolume = modVolume;
          this.write(0x40+voice.op1, modVolume | (data.modulator.scale & 0xC0));
        }
      }
    }
  } // setVoiceVolume

  /** `FrequencyForVoice`: the note plus the instrument's offset, bent, through the curve. */
  frequencyOf(voice) {
    var instrument = voice.instrument;
    var data = instrument.voices[voice.instrumentVoice];
    var note = voice.note;
    if (!instrument.fixed) note += data.baseNoteOffset;
    while (note < 0) note += 12;
    while (note > 95) note -= 12;
    var index = 64+32*note+voice.channel.bend;
    if (voice.instrumentVoice !== 0) index += (instrument.fineTuning >> 1)-64;
    if (index < 0) index = 0;
    if (index < 284) return FREQUENCY_CURVE[index];
    var sub = (index-284)%384;
    var octave = Math.floor((index-284)/384);
    if (octave >= 7) octave = 7;
    return FREQUENCY_CURVE[sub+284] | (octave << 10);
  } // frequencyOf

  /** `UpdateVoiceFrequency`: both frequency registers, key on, when the value changed. */
  updateFrequency(voice) {
    var freq = this.frequencyOf(voice);
    if (voice.freq !== freq) {
      this.write(0xA0+voice.index, freq & 0xFF);
      this.write(0xB0+voice.index, (freq >> 8) | 0x20);
      voice.freq = freq;
    }
  } // updateFrequency

  /** `VoiceKeyOn`: a free voice programmed for the note, or nothing when there is none. */
  voiceKeyOn(channel, instrument, instrumentVoice, note, key, volume) {
    var voice = this.freeVoice();
    if (voice === null) return;
    voice.channel = channel;
    voice.key = key;
    voice.note = instrument.fixed ? instrument.fixedNote : note;
    voice.regPan = channel.pan;
    this.setVoiceInstrument(voice, instrument, instrumentVoice);
    this.setVoiceVolume(voice, volume);
    voice.freq = 0;
    this.updateFrequency(voice);
  } // voiceKeyOn

  /** `ReplaceExistingVoice`: the voice that gives way when none is free (DOOM v1.9). */
  replaceVoice() {
    var result = 0;
    for (var i = 0; i < this.allocated.length; i++) {
      if (this.allocated[i].instrumentVoice !== 0 || this.allocated[i].channel.index >= this.allocated[result].channel.index) result = i;
    }
    this.releaseVoice(result);
  } // replaceVoice

  keyOnEvent(event) {
    if (event.velocity <= 0) { this.keyOffEvent(event); return; }
    var channel = this.channelOf(event);
    var note = event.key;
    var instrument;
    if (event.channel === AdlibMUS.MIDI_PERCUSSION) {
      instrument = this.bank.percussion(event.key);
      if (instrument === null) return;
      note = 60;
    } else {
      instrument = channel.instrument;
    }
    if (this.free.length === 0) this.replaceVoice();
    this.voiceKeyOn(channel, instrument, 0, note, event.key, event.velocity);
    if (instrument.twoVoices) this.voiceKeyOn(channel, instrument, 1, note, event.key, event.velocity);
  } // keyOnEvent

  keyOffEvent(event) {
    var channel = this.channelOf(event);
    for (var i = 0; i < this.allocated.length; i++) {
      if (this.allocated[i].channel === channel && this.allocated[i].key === event.key) {
        this.releaseVoice(i);
        i--;
      }
    }
  } // keyOffEvent

  /** `SetChannelVolume`: clipped to the music volume, and to the one the song started with ★. */
  setChannelVolume(channel, volume, clipStart) {
    channel.volumeBase = volume;
    if (volume > this.currentMusicVolume) volume = this.currentMusicVolume;
    if (clipStart && volume > this.startMusicVolume) volume = this.startMusicVolume;
    channel.volume = volume;
    for (var v = 0; v < this.voices.length; v++) {
      if (this.voices[v].channel === channel) this.setVoiceVolume(this.voices[v], this.voices[v].noteVolume);
    }
  } // setChannelVolume

  allNotesOff(channel) {
    for (var i = 0; i < this.allocated.length; i++) {
      if (this.allocated[i].channel === channel) {
        this.releaseVoice(i);
        i--;
      }
    }
  } // allNotesOff

  controllerEvent(event) {
    var channel = this.channelOf(event);
    switch (event.controller) {
      case 0x07: this.setChannelVolume(channel, event.value, true); break;
      case 0x0A: break;             // pan: nothing on an OPL2
      case 0x7B: this.allNotesOff(channel); break;
      default: break;
    }
  } // controllerEvent

  /** `PitchBendEvent`: the channel's voices retuned - and moved to the back of the allocated list ★. */
  pitchBendEvent(event) {
    var channel = this.channelOf(event);
    channel.bend = event.value-64;
    var updated = [], others = [];
    for (var i = 0; i < this.allocated.length; i++) {
      var voice = this.allocated[i];
      if (voice.channel === channel) {
        this.updateFrequency(voice);
        updated.push(voice);
      } else {
        others.push(voice);
      }
    }
    this.allocated = others.concat(updated);
  } // pitchBendEvent

} // AdlibMUS

/** The two operators of each voice, as register offsets. */
const VOICE_OPERATORS = [
  [0x00, 0x01, 0x02, 0x08, 0x09, 0x0A, 0x10, 0x11, 0x12],
  [0x03, 0x04, 0x05, 0x0B, 0x0C, 0x0D, 0x13, 0x14, 0x15]
];
/** How many operator registers the original's initialisation walks (one past the eighteen operators' 21 slots). */
const OPERATOR_REGISTERS = 21;

/** MUS controller number -> MIDI controller (`mus2mid.c`); 0 is the programme change. */
const CONTROLLER_MAP = [0x00, 0x20, 0x01, 0x07, 0x0A, 0x0B, 0x5B, 0x5D, 0x40, 0x43, 0x78, 0x7B, 0x7E, 0x7F, 0x79];

/**
 * The F-number of every 32nd of a semitone, from a semitone below note 0
 * (a fact about the DMX driver of DOOM v1.9, as `i_oplmusic.c` of Chocolate
 * Doom reconstructs it; the last entry is the overrun the original reads).
 * The first 284 entries are read straight, the 384 after them repeat for
 * every octave with the octave in the block bits.
 */
const FREQUENCY_CURVE = Uint16Array.of(
  0x133, 0x133, 0x134, 0x134, 0x135, 0x136, 0x136, 0x137, 0x137, 0x138, 0x138, 0x139, 0x139, 0x13a, 0x13b, 0x13b,
  0x13c, 0x13c, 0x13d, 0x13d, 0x13e, 0x13f, 0x13f, 0x140, 0x140, 0x141, 0x142, 0x142, 0x143, 0x143, 0x144, 0x144,
  0x145, 0x146, 0x146, 0x147, 0x147, 0x148, 0x149, 0x149, 0x14a, 0x14a, 0x14b, 0x14c, 0x14c, 0x14d, 0x14d, 0x14e,
  0x14f, 0x14f, 0x150, 0x150, 0x151, 0x152, 0x152, 0x153, 0x153, 0x154, 0x155, 0x155, 0x156, 0x157, 0x157, 0x158,
  0x158, 0x159, 0x15a, 0x15a, 0x15b, 0x15b, 0x15c, 0x15d, 0x15d, 0x15e, 0x15f, 0x15f, 0x160, 0x161, 0x161, 0x162,
  0x162, 0x163, 0x164, 0x164, 0x165, 0x166, 0x166, 0x167, 0x168, 0x168, 0x169, 0x16a, 0x16a, 0x16b, 0x16c, 0x16c,
  0x16d, 0x16e, 0x16e, 0x16f, 0x170, 0x170, 0x171, 0x172, 0x172, 0x173, 0x174, 0x174, 0x175, 0x176, 0x176, 0x177,
  0x178, 0x178, 0x179, 0x17a, 0x17a, 0x17b, 0x17c, 0x17c, 0x17d, 0x17e, 0x17e, 0x17f, 0x180, 0x181, 0x181, 0x182,
  0x183, 0x183, 0x184, 0x185, 0x185, 0x186, 0x187, 0x188, 0x188, 0x189, 0x18a, 0x18a, 0x18b, 0x18c, 0x18d, 0x18d,
  0x18e, 0x18f, 0x18f, 0x190, 0x191, 0x192, 0x192, 0x193, 0x194, 0x194, 0x195, 0x196, 0x197, 0x197, 0x198, 0x199,
  0x19a, 0x19a, 0x19b, 0x19c, 0x19d, 0x19d, 0x19e, 0x19f, 0x1a0, 0x1a0, 0x1a1, 0x1a2, 0x1a3, 0x1a3, 0x1a4, 0x1a5,
  0x1a6, 0x1a6, 0x1a7, 0x1a8, 0x1a9, 0x1a9, 0x1aa, 0x1ab, 0x1ac, 0x1ad, 0x1ad, 0x1ae, 0x1af, 0x1b0, 0x1b0, 0x1b1,
  0x1b2, 0x1b3, 0x1b4, 0x1b4, 0x1b5, 0x1b6, 0x1b7, 0x1b8, 0x1b8, 0x1b9, 0x1ba, 0x1bb, 0x1bc, 0x1bc, 0x1bd, 0x1be,
  0x1bf, 0x1c0, 0x1c0, 0x1c1, 0x1c2, 0x1c3, 0x1c4, 0x1c4, 0x1c5, 0x1c6, 0x1c7, 0x1c8, 0x1c9, 0x1c9, 0x1ca, 0x1cb,
  0x1cc, 0x1cd, 0x1ce, 0x1ce, 0x1cf, 0x1d0, 0x1d1, 0x1d2, 0x1d3, 0x1d3, 0x1d4, 0x1d5, 0x1d6, 0x1d7, 0x1d8, 0x1d8,
  0x1d9, 0x1da, 0x1db, 0x1dc, 0x1dd, 0x1de, 0x1de, 0x1df, 0x1e0, 0x1e1, 0x1e2, 0x1e3, 0x1e4, 0x1e5, 0x1e5, 0x1e6,
  0x1e7, 0x1e8, 0x1e9, 0x1ea, 0x1eb, 0x1ec, 0x1ed, 0x1ed, 0x1ee, 0x1ef, 0x1f0, 0x1f1, 0x1f2, 0x1f3, 0x1f4, 0x1f5,
  0x1f6, 0x1f6, 0x1f7, 0x1f8, 0x1f9, 0x1fa, 0x1fb, 0x1fc, 0x1fd, 0x1fe, 0x1ff, 0x200, 0x201, 0x201, 0x202, 0x203,
  0x204, 0x205, 0x206, 0x207, 0x208, 0x209, 0x20a, 0x20b, 0x20c, 0x20d, 0x20e, 0x20f, 0x210, 0x210, 0x211, 0x212,
  0x213, 0x214, 0x215, 0x216, 0x217, 0x218, 0x219, 0x21a, 0x21b, 0x21c, 0x21d, 0x21e, 0x21f, 0x220, 0x221, 0x222,
  0x223, 0x224, 0x225, 0x226, 0x227, 0x228, 0x229, 0x22a, 0x22b, 0x22c, 0x22d, 0x22e, 0x22f, 0x230, 0x231, 0x232,
  0x233, 0x234, 0x235, 0x236, 0x237, 0x238, 0x239, 0x23a, 0x23b, 0x23c, 0x23d, 0x23e, 0x23f, 0x240, 0x241, 0x242,
  0x244, 0x245, 0x246, 0x247, 0x248, 0x249, 0x24a, 0x24b, 0x24c, 0x24d, 0x24e, 0x24f, 0x250, 0x251, 0x252, 0x253,
  0x254, 0x256, 0x257, 0x258, 0x259, 0x25a, 0x25b, 0x25c, 0x25d, 0x25e, 0x25f, 0x260, 0x262, 0x263, 0x264, 0x265,
  0x266, 0x267, 0x268, 0x269, 0x26a, 0x26c, 0x26d, 0x26e, 0x26f, 0x270, 0x271, 0x272, 0x273, 0x275, 0x276, 0x277,
  0x278, 0x279, 0x27a, 0x27b, 0x27d, 0x27e, 0x27f, 0x280, 0x281, 0x282, 0x284, 0x285, 0x286, 0x287, 0x288, 0x289,
  0x28b, 0x28c, 0x28d, 0x28e, 0x28f, 0x290, 0x292, 0x293, 0x294, 0x295, 0x296, 0x298, 0x299, 0x29a, 0x29b, 0x29c,
  0x29e, 0x29f, 0x2a0, 0x2a1, 0x2a2, 0x2a4, 0x2a5, 0x2a6, 0x2a7, 0x2a9, 0x2aa, 0x2ab, 0x2ac, 0x2ae, 0x2af, 0x2b0,
  0x2b1, 0x2b2, 0x2b4, 0x2b5, 0x2b6, 0x2b7, 0x2b9, 0x2ba, 0x2bb, 0x2bd, 0x2be, 0x2bf, 0x2c0, 0x2c2, 0x2c3, 0x2c4,
  0x2c5, 0x2c7, 0x2c8, 0x2c9, 0x2cb, 0x2cc, 0x2cd, 0x2ce, 0x2d0, 0x2d1, 0x2d2, 0x2d4, 0x2d5, 0x2d6, 0x2d8, 0x2d9,
  0x2da, 0x2dc, 0x2dd, 0x2de, 0x2e0, 0x2e1, 0x2e2, 0x2e4, 0x2e5, 0x2e6, 0x2e8, 0x2e9, 0x2ea, 0x2ec, 0x2ed, 0x2ee,
  0x2f0, 0x2f1, 0x2f2, 0x2f4, 0x2f5, 0x2f6, 0x2f8, 0x2f9, 0x2fb, 0x2fc, 0x2fd, 0x2ff, 0x300, 0x302, 0x303, 0x304,
  0x306, 0x307, 0x309, 0x30a, 0x30b, 0x30d, 0x30e, 0x310, 0x311, 0x312, 0x314, 0x315, 0x317, 0x318, 0x31a, 0x31b,
  0x31c, 0x31e, 0x31f, 0x321, 0x322, 0x324, 0x325, 0x327, 0x328, 0x329, 0x32b, 0x32c, 0x32e, 0x32f, 0x331, 0x332,
  0x334, 0x335, 0x337, 0x338, 0x33a, 0x33b, 0x33d, 0x33e, 0x340, 0x341, 0x343, 0x344, 0x346, 0x347, 0x349, 0x34a,
  0x34c, 0x34d, 0x34f, 0x350, 0x352, 0x353, 0x355, 0x357, 0x358, 0x35a, 0x35b, 0x35d, 0x35e, 0x360, 0x361, 0x363,
  0x365, 0x366, 0x368, 0x369, 0x36b, 0x36c, 0x36e, 0x370, 0x371, 0x373, 0x374, 0x376, 0x378, 0x379, 0x37b, 0x37c,
  0x37e, 0x380, 0x381, 0x383, 0x384, 0x386, 0x388, 0x389, 0x38b, 0x38d, 0x38e, 0x390, 0x392, 0x393, 0x395, 0x397,
  0x398, 0x39a, 0x39c, 0x39d, 0x39f, 0x3a1, 0x3a2, 0x3a4, 0x3a6, 0x3a7, 0x3a9, 0x3ab, 0x3ac, 0x3ae, 0x3b0, 0x3b1,
  0x3b3, 0x3b5, 0x3b7, 0x3b8, 0x3ba, 0x3bc, 0x3bd, 0x3bf, 0x3c1, 0x3c3, 0x3c4, 0x3c6, 0x3c8, 0x3ca, 0x3cb, 0x3cd,
  0x3cf, 0x3d1, 0x3d2, 0x3d4, 0x3d6, 0x3d8, 0x3da, 0x3db, 0x3dd, 0x3df, 0x3e1, 0x3e3, 0x3e4, 0x3e6, 0x3e8, 0x3ea,
  0x3ec, 0x3ed, 0x3ef, 0x3f1, 0x3f3, 0x3f5, 0x3f6, 0x3f8, 0x3fa, 0x3fc, 0x3fe, 0x36c,
);

/** MIDI volume 0..127 -> the driver's level 0..127 (the same source). */
const VOLUME_MAP = Uint8Array.of(
  0, 1, 3, 5, 6, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23,
  25, 26, 27, 29, 30, 32, 33, 34, 36, 37, 39, 41, 43, 45, 47, 49,
  50, 52, 54, 55, 57, 59, 60, 61, 63, 64, 66, 67, 68, 69, 71, 72,
  73, 74, 75, 76, 77, 79, 80, 81, 82, 83, 84, 84, 85, 86, 87, 88,
  89, 90, 91, 92, 92, 93, 94, 95, 96, 96, 97, 98, 99, 99, 100, 101,
  101, 102, 103, 103, 104, 105, 105, 106, 107, 107, 108, 109, 109, 110, 110, 111,
  112, 112, 113, 113, 114, 114, 115, 115, 116, 117, 117, 118, 118, 119, 119, 120,
  120, 121, 121, 122, 122, 123, 123, 123, 124, 124, 125, 125, 126, 126, 127, 127,
);

export default AdlibMUS;
