// begin code

/**
 * Which glyph of the {@link TerminalFont} a byte from the line shows, and which
 * character it is — the character set of a terminal, handed over by the
 * application (R-061). A terminal of the 1970s and 80s had a 7-bit line and
 * more glyphs than 128, so it switched between sets: SO (shift out) and SI
 * (shift in) on the Soviet terminals, where the same lower-case Latin code
 * meant an upper-case Cyrillic letter after SO (KOI-7 N2). The set that is in
 * force is a *shift*; the class knows them by name and nothing else.
 *
 * ```js
 * var charset = new TerminalCharset({
 *   initial: 'SI',
 *   // per shift: [first code, last code, glyph of the first code]; a code
 *   // in no range shows the glyph of its own number
 *   glyphs: {SI: [[0x00, 0x7F, 0x000]], SO: [[0x40, 0x7F, 0x0C0]]},
 *   // per shift: runs of characters from a code, for text written in JS
 *   unicode: {SI: [{from: 0x20, chars: ' !"#...'}], SO: [{from: 0x60, chars: 'ЮАБЦ...'}]},
 *   shiftCodes: {SO: 0x0E, SI: 0x0F}   // the bytes that select a shift
 * });
 * ```
 *
 * The tables of a particular terminal belong to the application; the library
 * has none until a second terminal needs the same (`ROADMAP.md` §2.3h).
 * Free of DOM, loadable under Node (R-001).
 */
export class TerminalCharset {

  /**
   * @param {Object} [config] - The settings above; all optional. Without any,
   *        one shift `'default'` whose code is its glyph, ASCII from 0x20.
   */
  constructor(config) {
    this.id = 'TerminalCharset';

    var c = Object.assign({
      initial: 'default',
      glyphs: {},
      unicode: null,
      shiftCodes: {}
    }, config || {});
    if (c.unicode === null) {
      c.unicode = {};
      c.unicode[c.initial] = [{from: 0x20, chars: TerminalCharset.ASCII}];
    }
    /** the shift in force after a reset */
    this.initial = c.initial;
    /** the bytes that select a shift, by shift name */
    this.shiftCodes = c.shiftCodes;

    /** the shift names: the initial one first, so it wins in charMap() */
    this.shifts = [c.initial];
    [c.glyphs, c.unicode, c.shiftCodes].forEach((table) => {
      Object.keys(table).forEach((name) => {
        if (this.shifts.indexOf(name) < 0) {
          this.shifts.push(name);
        }
      });
    });

    /** code -> glyph, 128 entries per shift */
    this.tables = {};
    this.shifts.forEach((name) => {
      var table = new Uint16Array(128);
      for (var code = 0; code < 128; code++) {
        table[code] = code;
      }
      (c.glyphs[name] || []).forEach((range) => {
        for (var code = range[0]; code <= range[1] && code < 128; code++) {
          table[code] = range[2]+code-range[0];
        }
      });
      this.tables[name] = table;
    });

    /** character -> {shift, code}; glyph -> character */
    this.encodeMap = {};
    this.decodeMap = {};
    this.shifts.forEach((name) => {
      (c.unicode[name] || []).forEach((run) => {
        var chars = Array.from(run.chars);
        chars.forEach((ch, i) => {
          var code = run.from+i;
          if (!(ch in this.encodeMap)) {
            this.encodeMap[ch] = {shift: name, code: code};
          }
          var glyph = this.tables[name][code & 0x7F];
          if (!(glyph in this.decodeMap)) {
            this.decodeMap[glyph] = ch;
          }
        });
      });
    });
  } // constructor

  /**
   * The glyph a code shows in a shift.
   * @param {number} code - The byte from the line; the eighth bit is dropped.
   * @param {string} shift - The shift in force.
   * @returns {number} The glyph index.
   */
  glyph(code, shift) {
    var table = this.tables[shift] || this.tables[this.initial];
    return table[code & 0x7F];
  } // glyph

  /**
   * The shift a byte selects, if it is one of the shift codes.
   * @param {number} code - The byte.
   * @returns {?string} The shift name, or null.
   */
  shiftOf(code) {
    for (var name in this.shiftCodes) {
      if (this.shiftCodes[name] === code) {
        return name;
      }
    }
    return null;
  } // shiftOf

  /**
   * The character a glyph is, for reading a screen back as text.
   * @param {number} glyph - The glyph index.
   * @returns {string} The character; U+FFFD for a glyph no table names.
   */
  decodeGlyph(glyph) {
    return glyph in this.decodeMap ? this.decodeMap[glyph] : '�';
  } // decodeGlyph

  /**
   * Text as bytes for the line, with the shift codes it needs in between —
   * what a program sending a message to the terminal does.
   * @param {string} text - The text; a character no table has goes as '?'.
   * @param {string} [shift] - The shift in force before the text; the initial one by default.
   * @returns {Object} `{bytes: Uint8Array, shift}` — the shift in force after it.
   */
  encode(text, shift) {
    var current = shift === undefined ? this.initial : shift;
    var bytes = [];
    Array.from(text).forEach((ch) => {
      var at = this.encodeMap[ch] || this.encodeMap['?'];
      if (!at) {
        return;
      }
      if (at.shift !== current && (at.shift in this.shiftCodes)) {
        bytes.push(this.shiftCodes[at.shift]);
        current = at.shift;
      }
      bytes.push(at.code);
    });
    return {bytes: Uint8Array.from(bytes), shift: current};
  } // encode

  /**
   * Character -> glyph for every character the tables name — the `chars` of
   * a {@link TerminalFont}, so text entities print the terminal's glyphs.
   * @returns {Object} The map.
   */
  charMap() {
    var map = {};
    for (var ch in this.encodeMap) {
      var at = this.encodeMap[ch];
      map[ch] = this.tables[at.shift][at.code & 0x7F];
    }
    return map;
  } // charMap

} // TerminalCharset

/** printable ASCII, 0x20-0x7E */
TerminalCharset.ASCII = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
