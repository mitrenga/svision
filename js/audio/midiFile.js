// begin code

/**
 * A **standard MIDI file**, parsed into events — no player, no sound, just
 * what the file says.
 *
 * DOS games of the era that drove an AdLib card from a sequencer kept their
 * music as ordinary SMF (Prince of Persia's `MIDISND*.DAT` holds one file per
 * piece); the driver that turns the events into chip registers is another
 * matter and lives elsewhere ({@link AdlibMidi}). Nothing here touches the
 * browser: the class runs in a worklet, in a worker and under Node, so a tool
 * measures the same file the player hears (R-001).
 *
 * ## The shape
 *
 * The tracks are read into one list of events in playing order, each with the
 * **absolute tick** it happens on. Where two tracks have an event on the same
 * tick, the earlier track comes first — that is the order a sequencer walking
 * the tracks side by side produces, and the order the instrument of a channel
 * is set in before the note that uses it.
 *
 * An event is `{tick, delta, track, order, status, channel, param1, param2}`
 * for a channel message, `{tick, delta, track, order, status: 0xFF, meta,
 * data}` for a meta event and `{tick, delta, track, order, status: 0xF0|0xF7,
 * data}` for a sysex; `order` is the event's position in its track, the last
 * key of the sort that merges the tracks. Running status is resolved, so
 * every channel event carries its own `status`.
 *
 * @example
 * var file = MidiFile.fromBytes(bytes);
 * file.seconds;              // how long it plays, from the tempo map
 * file.events[0].status;     // 0x90 — a note on
 */
export class MidiFile {

  /** The tempo a file plays at until it says otherwise: 120 bpm. */
  static get DEFAULT_MICROS_PER_BEAT() { return 500000; }

  /**
   * @param {Object} parts - `{format, tracks, division, events}`.
   */
  constructor(parts) {
    this.id = 'MidiFile';
    /** 0 (one track), 1 (tracks together) or 2 (tracks one after another) */
    this.format = parts.format || 0;
    /** how many tracks the header promised */
    this.tracks = parts.tracks || 0;
    /** the division word as written */
    this.division = parts.division || 0;
    /** every event of every track, in playing order, with absolute ticks */
    this.events = parts.events || [];
  } // constructor

  /**
   * Reads a file.
   * @param {Uint8Array} bytes - The whole file, starting at `MThd`.
   * @returns {MidiFile|null} Null when it is not a MIDI file.
   */
  static fromBytes(bytes) {
    if (!bytes || bytes.length < 14 || MidiFile.tag(bytes, 0) !== 'MThd') {
      return null;
    }
    var headerLength = MidiFile.u32(bytes, 4);
    var format = MidiFile.u16(bytes, 8);
    var tracks = MidiFile.u16(bytes, 10);
    var division = MidiFile.u16(bytes, 12);
    var events = [];
    var at = 8+headerLength;
    for (var track = 0; track < tracks && at+8 <= bytes.length; track++) {
      if (MidiFile.tag(bytes, at) !== 'MTrk') {
        break;
      }
      var length = MidiFile.u32(bytes, at+4);
      MidiFile.readTrack(bytes, at+8, Math.min(bytes.length, at+8+length), track, events);
      at += 8+length;
    }
    // A stable sort by the tick keeps the tracks in their own order where
    // several have something to say on the same tick.
    events.sort(function(a, b) { return a.tick-b.tick || a.track-b.track || a.order-b.order; });
    return new MidiFile({format: format, tracks: tracks, division: division, events: events});
  } // fromBytes

  /**
   * One track, appended to `events`.
   * @param {Uint8Array} bytes - The whole file.
   * @param {number} from - First byte of the track's data.
   * @param {number} to - Past its last byte.
   * @param {number} track - Which track this is.
   * @param {Array} events - Where the events go.
   */
  static readTrack(bytes, from, to, track, events) {
    var at = from;
    var tick = 0;
    var status = 0;
    var order = 0;
    while (at < to) {
      var delta = MidiFile.variable(bytes, at, to);
      at = delta.at;
      tick += delta.value;
      var first = bytes[at];
      if (first === 0xFF) {
        var meta = bytes[at+1];
        at += 2;
        var metaSize = MidiFile.variable(bytes, at, to);
        at = metaSize.at;
        events.push({tick: tick, delta: delta.value, track: track, order: order++, status: 0xFF,
          meta: meta, data: bytes.subarray(at, at+metaSize.value)});
        at += metaSize.value;
        if (meta === 0x2F) {
          return;   // end of track; whatever follows is not ours
        }
      } else if (first === 0xF0 || first === 0xF7) {
        at++;
        var sysexSize = MidiFile.variable(bytes, at, to);
        at = sysexSize.at;
        events.push({tick: tick, delta: delta.value, track: track, order: order++, status: first,
          data: bytes.subarray(at, at+sysexSize.value)});
        at += sysexSize.value;
      } else {
        if (first & 0x80) {
          status = first;
          at++;
        }
        var high = status & 0xF0;
        var single = (high === 0xC0 || high === 0xD0);
        events.push({tick: tick, delta: delta.value, track: track, order: order++,
          status: high, channel: status & 0x0F, param1: bytes[at], param2: single ? 0 : bytes[at+1]});
        at += single ? 1 : 2;
      }
    }
  } // readTrack

  /**
   * A variable length number: seven bits a byte, the top bit says "more".
   * @param {Uint8Array} bytes - The whole file.
   * @param {number} at - The first byte of the number.
   * @param {number} to - Past the last byte that may be read.
   * @returns {Object} `{value, at}` — the number and the offset after it.
   */
  static variable(bytes, at, to) {
    var value = 0, b;
    do {
      b = bytes[at++];
      value = (value << 7) | (b & 0x7F);
    } while ((b & 0x80) && at < to);
    return {value: value, at: at};
  } // variable

  /**
   * A four character chunk tag.
   * @param {Uint8Array} bytes - The whole file.
   * @param {number} at - The first byte of the tag.
   * @returns {string} The tag, `'MThd'` or `'MTrk'`.
   */
  static tag(bytes, at) {
    return String.fromCharCode(bytes[at], bytes[at+1], bytes[at+2], bytes[at+3]);
  } // tag

  /**
   * A big-endian 32-bit unsigned number.
   * @param {Uint8Array} bytes - The whole file.
   * @param {number} at - The first byte of the number.
   * @returns {number}
   */
  static u32(bytes, at) {
    return ((bytes[at] << 24) | (bytes[at+1] << 16) | (bytes[at+2] << 8) | bytes[at+3]) >>> 0;
  } // u32

  /**
   * A big-endian 16-bit unsigned number.
   * @param {Uint8Array} bytes - The whole file.
   * @param {number} at - The first byte of the number.
   * @returns {number}
   */
  static u16(bytes, at) {
    return (bytes[at] << 8) | bytes[at+1];
  } // u16

  /**
   * Whether the division is SMPTE (frames a second) rather than ticks a beat.
   * @returns {boolean}
   */
  get smpte() {
    return (this.division & 0x8000) !== 0;
  } // smpte

  /**
   * Ticks in a beat; for an SMPTE division, ticks in a second.
   * @returns {number}
   */
  get ticksPerBeat() {
    if (this.smpte) {
      return (256-(this.division >> 8))*(this.division & 0xFF);
    }
    return this.division;
  } // ticksPerBeat

  /**
   * The last tick anything happens on.
   * @returns {number} The tick; 0 for an empty file.
   */
  get endTick() {
    return this.events.length ? this.events[this.events.length-1].tick : 0;
  } // endTick

  /**
   * How long the file plays, in seconds, according to its tempo map (120 bpm
   * until a set-tempo event says otherwise). An SMPTE division is a fixed
   * number of ticks a second and ignores the tempo.
   * @param {number} [modifier=0] - A fraction added to every tempo, the way a
   *        game fine-tunes a piece to line up with a cutscene (0.03 = 3 %
   *        slower, the microseconds a beat being longer).
   * @returns {number} Seconds.
   */
  secondsOf(modifier) {
    var endTick = this.endTick;
    if (this.smpte) {
      return endTick/this.ticksPerBeat;
    }
    var factor = 1+(modifier || 0);
    var seconds = 0, lastTick = 0, micros = MidiFile.DEFAULT_MICROS_PER_BEAT*factor;
    for (var i = 0; i < this.events.length; i++) {
      var event = this.events[i];
      if (event.status === 0xFF && event.meta === 0x51 && event.data.length === 3) {
        seconds += (event.tick-lastTick)*micros/this.division/1e6;
        lastTick = event.tick;
        micros = ((event.data[0] << 16) | (event.data[1] << 8) | event.data[2])*factor;
      }
    }
    seconds += (endTick-lastTick)*micros/this.division/1e6;
    return seconds;
  } // secondsOf

  /**
   * How long the file plays at its own tempo.
   * @returns {number} Seconds.
   */
  get seconds() {
    return this.secondsOf(0);
  } // seconds

} // MidiFile

export default MidiFile;
