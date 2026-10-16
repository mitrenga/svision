const { OPL2 } = await import('./opl2.js?ver='+window.srcVersion);
const { MidiFile } = await import('../midiFile.js?ver='+window.srcVersion);
// begin code

/**
 * The **AdLib music driver**: a MIDI sequencer in front of an {@link OPL2}.
 *
 * A DOS game with AdLib music carried two things — a standard MIDI file per
 * piece and a table of **instruments**, sixteen bytes each, which is simply
 * the register set of one two operator voice. The driver walks the file, and
 * for every note it takes a free one of the chip's nine voices, writes the
 * instrument of the note's MIDI channel into it, sets the pitch and keys it
 * on. That is the whole of it: no channel volume, no pitch bend, no
 * percussion — what the games of 1990 asked of the card.
 *
 * ## Deliberately free of DOM and of ports
 *
 * Nothing here touches the browser. The same class renders in a worklet, in a
 * worker and under Node, so a tool can write a piece to a file and the player
 * hears the same samples (R-001).
 *
 * ## What it reproduces
 *
 * Written from the disassembly notes in SDLPoP's `midi.c` (the behaviour, not
 * the code — R-029 rules out copying), which are in turn the original's
 * `seg009` driver:
 *
 *  - **voices** are taken round robin: the first free one after the last
 *    one used, so a voice just freed is usually left to finish its release
 *    while the others are free — but it is taken as soon as it is the next
 *    one in the rotation. A note off frees the voice its note holds.
 *  - **pitch**: note 69 is A4 = 440 Hz, but the driver plays everything
 *    **an octave lower**, and a sysex can move all of it by whole semitones.
 *  - **volume**: the modulator keeps the instrument's own level; the carrier
 *    mixes it with the note's velocity, `((level+64)·225)/(velocity+161)`
 *    clamped to 64..127. Velocity 0 is a note off.
 *  - **instruments** come from the game's table; MIDI channel *n* starts on
 *    instrument *n* and a program change moves it.
 *  - **tempo** is the file's, optionally pulled a few percent either way: a
 *    game whose cutscene is timed to the music needs the music, not the
 *    animation, adjusted.
 *
 * @example
 * var player = new AdlibMidi({instruments: bank, sampleRate: 49716});
 * player.play(MidiFile.fromBytes(bytes));
 * var samples = player.renderAll();
 */
export class AdlibMidi {

  /** The chip has nine two operator voices, and the driver uses all of them. */
  static get VOICES() { return 9; }
  /** MIDI has sixteen channels. */
  static get CHANNELS() { return 16; }
  /** How many bytes an instrument of the table is. */
  static get INSTRUMENT_SIZE() { return 16; }

  /**
   * What the driver falls back on when the game's table is missing — the
   * register set of one plain voice, so that something is heard.
   */
  static get DEFAULT_INSTRUMENT() {
    return {feedbackConnection: 0x04, operators: [
      {multiple: 0x13, level: 0x09, attackDecay: 0x8D, sustainRelease: 0xD7, waveform: 0x00},
      {multiple: 0x02, level: 0x03, attackDecay: 0xF5, sustainRelease: 0x18, waveform: 0x00}
    ]};
  } // DEFAULT_INSTRUMENT

  /**
   * @param {Object} [options]
   * @param {Array|Uint8Array} [options.instruments] - The game's table: either
   *        instruments as objects, or the bytes as the game stores them (a
   *        count byte and then sixteen bytes each — {@link AdlibMidi.bank}).
   * @param {number} [options.sampleRate] - What to render at; the chip's own
   *        49716 Hz by default.
   * @param {number} [options.gain=1] - A factor on the way out.
   * @param {number} [options.tempoModifier=0] - A fraction added to every
   *        tempo of the file; 0.03 plays it 3 % slower.
   * @param {OPL2} [options.chip] - A chip of one's own, for a test.
   */
  constructor(options) {
    var settings = options || {};
    this.id = 'AdlibMidi';
    this.chip = settings.chip || new OPL2({sampleRate: settings.sampleRate});
    this.sampleRate = this.chip.sampleRate;
    this.gain = settings.gain === undefined ? 1 : settings.gain;
    this.tempoModifier = settings.tempoModifier || 0;
    this.instruments = AdlibMidi.bank(settings.instruments);

    /** the file being played */
    this.file = null;
    /** which event of it comes next */
    this.eventIndex = 0;
    /** how far the chip has been rendered, in samples */
    this.position = 0;
    /** the sample the next event happens on */
    this.nextAt = 0;
    /** where the walk over the events has got to, in ticks and in seconds */
    this.tick = 0;
    this.seconds = 0;
    this.microsPerBeat = MidiFile.DEFAULT_MICROS_PER_BEAT;

    this.voiceNote = new Uint8Array(AdlibMidi.VOICES);
    this.voiceChannel = new Uint8Array(AdlibMidi.VOICES);
    this.voiceInstrument = new Int16Array(AdlibMidi.VOICES);
    this.channelInstrument = new Int16Array(AdlibMidi.CHANNELS);
    this.lastVoice = 0;
    /** how many semitones up everything sounds (a sysex of the game's) */
    this.semitones = 0;
    /** true once every event has been played */
    this.finished = true;
    /** how many notes found no free voice — nine at once is the chip's limit */
    this.dropped = 0;
  } // constructor

  /**
   * The instrument table from whatever it was given: the bytes as the game
   * stores them (one count byte, then sixteen bytes an instrument), a list of
   * instruments already read, or nothing.
   * @param {Array|Uint8Array|null} source
   * @returns {Array} The instruments.
   */
  static bank(source) {
    if (!source) {
      return [AdlibMidi.DEFAULT_INSTRUMENT];
    }
    if (Array.isArray(source) && (source.length === 0 || typeof source[0] === 'object')) {
      return source.length ? source : [AdlibMidi.DEFAULT_INSTRUMENT];
    }
    var bytes = source;
    var count = bytes[0];
    if (bytes.length !== 1+count*AdlibMidi.INSTRUMENT_SIZE) {
      return [AdlibMidi.DEFAULT_INSTRUMENT];
    }
    var instruments = [];
    for (var i = 0; i < count; i++) {
      instruments.push(AdlibMidi.instrument(bytes, 1+i*AdlibMidi.INSTRUMENT_SIZE));
    }
    return instruments.length ? instruments : [AdlibMidi.DEFAULT_INSTRUMENT];
  } // bank

  /**
   * One instrument of the table. The first two bytes are a block and f-number
   * the driver does not use (the pitch comes from the note), and the last
   * three say whether it is a percussion voice, which these games do not use.
   * @param {Uint8Array} bytes
   * @param {number} at - Where the sixteen bytes start.
   * @returns {Object}
   */
  static instrument(bytes, at) {
    var operator = function(from) {
      return {multiple: bytes[from], level: bytes[from+1], attackDecay: bytes[from+2],
        sustainRelease: bytes[from+3], waveform: bytes[from+4]};
    };
    return {
      blockLow: bytes[at], blockHigh: bytes[at+1],
      feedbackConnection: bytes[at+2],
      operators: [operator(at+3), operator(at+8)],
      percussion: bytes[at+13]
    };
  } // instrument

  // --------------------------------------------------------------- the chip

  /**
   * The register offset of one operator of a voice (`adlib_op` plus three).
   * @param {number} voice - The voice (chip channel), 0..8.
   * @param {number} operator - 0 for the modulator, 1 for the carrier.
   * @returns {number} The offset to add to 0x20, 0x40, 0x60, 0x80 or 0xE0.
   */
  static operatorOffset(voice, operator) {
    return OPL2.SLOT_OF_CHANNEL[voice]+(operator ? 3 : 0);
  } // operatorOffset

  /**
   * A write that keeps the bits outside the mask as they were.
   * @param {number} address - The register address, 0x00..0xFF.
   * @param {number} value - The bits to write; only those inside `mask` count.
   * @param {number} mask - Which bits of the register to replace.
   */
  writeMasked(address, value, mask) {
    this.chip.write(address, (this.chip.registers[address] & ~mask) | (value & mask));
  } // writeMasked

  /**
   * Writes an instrument into a voice.
   * @param {Object} instrument - An entry of the instrument table: its
   *   `feedbackConnection` and the registers of its two `operators`.
   * @param {number} voice - The voice (chip channel), 0..8.
   */
  writeInstrument(instrument, voice) {
    this.chip.write(0xC0+voice, instrument.feedbackConnection & 0x0F);
    for (var i = 0; i < 2; i++) {
      var operator = instrument.operators[i];
      var at = AdlibMidi.operatorOffset(voice, i);
      this.chip.write(0x20+at, operator.multiple);
      this.chip.write(0x40+at, operator.level);
      this.chip.write(0x60+at, operator.attackDecay);
      this.chip.write(0x80+at, operator.sustainRelease);
      this.chip.write(0xE0+at, operator.waveform);
    }
  } // writeInstrument

  /**
   * The instrument of a program number; the first one where there is none.
   * @param {number} program - The MIDI program number.
   * @returns {Object} An entry of the instrument table.
   */
  instrumentOf(program) {
    return (program >= 0 && program < this.instruments.length) ? this.instruments[program] : this.instruments[0];
  } // instrumentOf

  // ------------------------------------------------------------ the sequencer

  /**
   * Starts a piece. The chip is reset, every voice gets the first instrument
   * of the table and MIDI channel *n* starts on instrument *n*.
   * @param {MidiFile} file
   * @returns {AdlibMidi} This.
   */
  play(file) {
    this.file = file;
    this.chip.reset();
    // The waveforms of the OPL2 are only there once this is set; without it
    // every instrument of the table that asks for one plays a plain sine.
    this.chip.write(0x01, 0x20);
    this.chip.write(0x08, 0x00);
    this.chip.write(0xBD, 0x00);
    for (var voice = 0; voice < AdlibMidi.VOICES; voice++) {
      this.writeInstrument(this.instruments[0], voice);
      this.voiceInstrument[voice] = 0;
      this.voiceNote[voice] = 0;
      this.voiceChannel[voice] = 0;
    }
    for (var channel = 0; channel < AdlibMidi.CHANNELS; channel++) {
      this.channelInstrument[channel] = channel;
    }
    this.eventIndex = 0;
    this.position = 0;
    this.nextAt = 0;
    this.tick = 0;
    this.seconds = 0;
    this.microsPerBeat = MidiFile.DEFAULT_MICROS_PER_BEAT*(1+this.tempoModifier);
    this.lastVoice = 0;
    this.semitones = 0;
    this.dropped = 0;
    this.finished = !file || !file.events.length;
    return this;
  } // play

  /**
   * How long the piece plays, in seconds — the tempo modifier included.
   * @returns {number} Seconds; 0 when nothing is loaded.
   */
  get pieceSeconds() {
    return this.file ? this.file.secondsOf(this.tempoModifier) : 0;
  } // pieceSeconds

  /**
   * Keys every voice off (`stop_midi`) and marks them all free.
   */
  allNotesOff() {
    for (var voice = 0; voice < AdlibMidi.VOICES; voice++) {
      this.writeMasked(0xB0+voice, 0, 0x20);
      this.voiceNote[voice] = 0;
    }
  } // allNotesOff

  /**
   * The sample an event falls on. The tempo map is walked as the events are
   * played, so a tempo change moves everything after it and nothing before.
   * @param {Object} event
   * @returns {number} Samples from the start of the piece.
   */
  sampleOf(event) {
    var ticks = event.tick-this.tick;
    if (ticks > 0) {
      var perTick = this.file.smpte ? 1/this.file.ticksPerBeat : this.microsPerBeat/this.file.ticksPerBeat/1e6;
      this.seconds += ticks*perTick;
      this.tick = event.tick;
    }
    return Math.round(this.seconds*this.sampleRate);
  } // sampleOf

  /**
   * One event of the file: notes, program changes, the game's own sysex and
   * the tempo meta event; everything else is ignored.
   * @param {Object} event - An event of `MidiFile.events`.
   */
  handle(event) {
    switch (event.status) {
      case 0x80:
        this.noteOff(event.channel, event.param1);
        break;
      case 0x90:
        if (event.param2 === 0) {
          this.noteOff(event.channel, event.param1);
        } else {
          this.noteOn(event.channel, event.param1, event.param2);
        }
        break;
      case 0xC0:
        this.channelInstrument[event.channel] = event.param1;
        break;
      case 0xF0:
        // The game's own sysex: seven bytes, `34 00|01 00 <semitones>`, moving
        // every note up by whole semitones.
        if (event.data.length === 7 && event.data[2] === 0x34 &&
            (event.data[3] === 0 || event.data[3] === 1) && event.data[4] === 0) {
          this.semitones = (event.data[5] << 24) >> 24;
        }
        break;
      case 0xFF:
        if (event.meta === 0x51 && event.data.length === 3) {
          this.microsPerBeat = ((event.data[0] << 16) | (event.data[1] << 8) | event.data[2])*(1+this.tempoModifier);
        }
        break;
    }
  } // handle

  /**
   * Frees the voice a note is playing on, if it is still playing.
   * @param {number} channel - The MIDI channel, 0..15.
   * @param {number} note - The MIDI note number, 0..127.
   */
  noteOff(channel, note) {
    for (var voice = 0; voice < AdlibMidi.VOICES; voice++) {
      if (this.voiceChannel[voice] === channel && this.voiceNote[voice] === note) {
        this.writeMasked(0xB0+voice, 0, 0x20);
        this.voiceNote[voice] = 0;
        return;
      }
    }
  } // noteOff

  /**
   * Starts a note on the next free voice; nothing sounds when all nine are busy.
   * @param {number} channel - The MIDI channel, 0..15; picks the instrument.
   * @param {number} note - The MIDI note number, 0..127; 69 is A4.
   * @param {number} velocity - 1..127; mixed into the carrier's level.
   */
  noteOn(channel, note, velocity) {
    var voice = -1;
    var candidate = this.lastVoice;
    for (var i = 0; i < AdlibMidi.VOICES; i++) {
      candidate = (candidate+1) % AdlibMidi.VOICES;
      if (this.voiceNote[candidate] === 0) {
        voice = candidate;
        break;
      }
    }
    if (voice < 0) {
      this.dropped++;   // nine notes already sound; the card could do no more
      return;
    }
    this.lastVoice = voice;
    var program = this.channelInstrument[channel];
    var instrument = this.instrumentOf(program);
    if (this.voiceInstrument[voice] !== program) {
      this.writeInstrument(instrument, voice);
      this.voiceInstrument[voice] = program;
    }
    this.voiceNote[voice] = note;
    this.voiceChannel[voice] = channel;

    // The pitch: note 69 is A4, and the driver plays an octave below that.
    var octaves = (note-69-12+this.semitones)/12;
    var frequency = Math.pow(2, octaves)*440;
    var fnumFloat = frequency*(1 << 20)/OPL2.SAMPLE_RATE;
    var block = Math.trunc(Math.log2(fnumFloat)-9) & 7;
    var fnum = (Math.trunc(fnumFloat) >> block) & 1023;
    this.chip.write(0xA0+voice, fnum & 0xFF);
    this.chip.write(0xB0+voice, 0x20 | (block << 2) | (fnum >> 8));

    // The modulator keeps the instrument's own level; the carrier's is mixed
    // with the velocity (`seg009:6C3C`) and never goes above the instrument's.
    this.writeMasked(0x40+AdlibMidi.operatorOffset(voice, 0), instrument.operators[0].level, 0x3F);
    var level = instrument.operators[1].level & 0x3F;
    var carrier = Math.trunc(((level+64)*225)/(velocity+161));
    carrier = Math.max(64, Math.min(127, carrier))-64;
    this.writeMasked(0x40+AdlibMidi.operatorOffset(voice, 1), carrier, 0x3F);
  } // noteOn

  // ------------------------------------------------------------- the samples

  /**
   * Renders the next samples of the piece, playing the events that fall in
   * them on the way. The piece may go on sounding after its last event — a
   * note still in its release — so this keeps producing samples until it is
   * asked to stop; {@link AdlibMidi#finished} says when the events ran out.
   * @param {Float32Array} out - Where the samples go.
   * @param {number} [count] - How many; the whole array by default.
   * @param {number} [offset=0] - Where in the array to start.
   * @returns {Float32Array} `out`.
   */
  render(out, count, offset) {
    var at = offset || 0;
    var left = count === undefined ? out.length-at : count;
    while (left > 0) {
      if (!this.finished && this.position >= this.nextAt) {
        // everything that falls on this sample, then where the next one is
        while (this.eventIndex < this.file.events.length) {
          var event = this.file.events[this.eventIndex];
          var sample = this.sampleOf(event);
          if (sample > this.position) {
            this.nextAt = sample;
            break;
          }
          this.handle(event);
          this.eventIndex++;
        }
        if (this.eventIndex >= this.file.events.length) {
          this.finished = true;
        }
      }
      var chunk = this.finished ? left : Math.min(left, Math.max(1, this.nextAt-this.position));
      this.chip.render(out.subarray(at, at+chunk), chunk, this.gain);
      this.position += chunk;
      at += chunk;
      left -= chunk;
    }
    return out;
  } // render

  /**
   * The whole piece as samples, as long as its tempo map says it plays — the
   * length the game counts frames with.
   * @param {number} [seconds] - A length of one's own.
   * @returns {Float32Array} Mono samples, -1..1.
   */
  renderAll(seconds) {
    var length = seconds === undefined ? this.pieceSeconds : seconds;
    var out = new Float32Array(Math.max(0, Math.round(length*this.sampleRate)));
    return this.render(out);
  } // renderAll

} // AdlibMidi

export default AdlibMidi;
