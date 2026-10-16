// begin code

/**
 * The display list of ANTIC: the program that tells the chip, line by line,
 * what the screen is. Each instruction is one byte (three with an address):
 *
 *   low nibble 0      blank lines, (bits 4-6)+1 of them
 *   low nibble 1      jump: bit 6 set waits for vertical blank (JVB, the
 *                     end of the frame), clear jumps at once (JMP); the
 *                     address follows, low byte first
 *   low nibble 2-F    a mode line — see {@link Atari8DisplayList.MODES};
 *                     bit 4 horizontal scroll, bit 5 vertical scroll,
 *                     bit 6 load memory scan (LMS: the screen address
 *                     follows), bit 7 display list interrupt
 *
 * The OS builds one for each Graphics mode: 3 blank-8 lines to get under
 * the vertical blank, an LMS mode line, the rest of the mode lines, JVB back
 * to the top. {@link Atari8DisplayList.standard} builds that; a game with a
 * text window, a split screen or a scrolling map builds its own from
 * {@link Atari8DisplayList#blank}, {@link Atari8DisplayList#mode} and
 * {@link Atari8DisplayList#jump}. `bytes()` is what goes into memory,
 * `decode()` reads one back — for a tool that dumps a game's screen.
 *
 * Nothing here touches the DOM (R-001).
 */
export class Atari8DisplayList {

  /**
   * The mode lines: scan lines per line, bytes per line at normal playfield
   * width, the BASIC Graphics number where there is one, and a `text` flag
   * for the character modes (2-7) as against the map modes (8-15).
   * @returns {Object} By ANTIC mode number.
   */
  static get MODES() {
    return {
      2: {lines: 8, bytes: 40, graphics: 0, text: true},
      3: {lines: 10, bytes: 40, graphics: null, text: true},
      4: {lines: 8, bytes: 40, graphics: 12, text: true},
      5: {lines: 16, bytes: 40, graphics: 13, text: true},
      6: {lines: 8, bytes: 20, graphics: 1, text: true},
      7: {lines: 16, bytes: 20, graphics: 2, text: true},
      8: {lines: 8, bytes: 10, graphics: 3, text: false},
      9: {lines: 4, bytes: 10, graphics: 4, text: false},
      10: {lines: 4, bytes: 20, graphics: 5, text: false},
      11: {lines: 2, bytes: 20, graphics: 6, text: false},
      12: {lines: 1, bytes: 20, graphics: 14, text: false},
      13: {lines: 2, bytes: 40, graphics: 7, text: false},
      14: {lines: 1, bytes: 40, graphics: 15, text: false},
      15: {lines: 1, bytes: 40, graphics: 8, text: false}
    };
  } // MODES

  /** instruction bits */
  static get LMS() { return 0x40; }
  static get DLI() { return 0x80; }
  static get HSCROL() { return 0x10; }
  static get VSCROL() { return 0x20; }
  static get JVB() { return 0x41; }
  static get JMP() { return 0x01; }

  /**
   * Starts with an empty list; the instructions are added by
   * {@link Atari8DisplayList#blank}, {@link Atari8DisplayList#mode} and
   * {@link Atari8DisplayList#jump}.
   */
  constructor() {
    this.id = 'Atari8DisplayList';
    /** the instructions, as objects: {op, address?} */
    this.instructions = [];
  } // constructor

  /**
   * Adds blank lines.
   * @param {number} lines - 1-8.
   * @param {boolean} [dli] - With a display list interrupt.
   * @returns {Atari8DisplayList} This.
   */
  blank(lines, dli) {
    var n = Math.max(1, Math.min(8, lines));
    this.instructions.push({op: ((n-1) << 4) | (dli ? Atari8DisplayList.DLI : 0)});
    return this;
  } // blank

  /**
   * Adds mode lines.
   * @param {number} mode - The ANTIC mode, 2-15.
   * @param {number} [count] - How many lines, 1 by default.
   * @param {Object} [options] - `lms` an address for the first line,
   *        `hscrol`, `vscrol`, `dli` flags for every line.
   * @returns {Atari8DisplayList} This.
   */
  mode(mode, count, options) {
    var opts = options || {};
    var n = count === undefined ? 1 : count;
    var flags = (opts.hscrol ? Atari8DisplayList.HSCROL : 0)
      | (opts.vscrol ? Atari8DisplayList.VSCROL : 0)
      | (opts.dli ? Atari8DisplayList.DLI : 0);
    for (var i = 0; i < n; i++) {
      if (i === 0 && opts.lms !== undefined) {
        this.instructions.push({op: (mode & 15) | flags | Atari8DisplayList.LMS, address: opts.lms & 0xFFFF});
      } else {
        this.instructions.push({op: (mode & 15) | flags});
      }
    }
    return this;
  } // mode

  /**
   * Adds the jump that ends the frame (JVB) or goes elsewhere (JMP).
   * @param {number} address - Where the list continues — its own start, as a rule.
   * @param {boolean} [immediate] - JMP instead of JVB.
   * @returns {Atari8DisplayList} This.
   */
  jump(address, immediate) {
    this.instructions.push({op: immediate ? Atari8DisplayList.JMP : Atari8DisplayList.JVB, address: address & 0xFFFF});
    return this;
  } // jump

  /**
   * The bytes of the list, as ANTIC reads them.
   * @returns {Uint8Array} The instructions.
   */
  bytes() {
    var out = [];
    this.instructions.forEach((ins) => {
      out.push(ins.op);
      if (ins.address !== undefined) {
        out.push(ins.address & 0xFF, ins.address >> 8);
      }
    });
    return Uint8Array.from(out);
  } // bytes

  /**
   * The scan lines the list covers up to its jump.
   * @returns {number} Scan lines.
   */
  scanLines() {
    var lines = 0;
    this.instructions.forEach((ins) => {
      var d = Atari8DisplayList.decode(ins.op);
      lines += d.lines;
    });
    return lines;
  } // scanLines

  /**
   * What one instruction byte means.
   * @param {number} op - The byte.
   * @returns {Object} {kind: 'blank'|'jump'|'mode', lines, mode?, bytes?, text?, lms, dli, hscrol, vscrol, jvb?, hasAddress};
   *   a mode instruction also carries `bytes` (screen bytes per line, what
   *   the painter advances the scan by) and `text` (a character mode).
   */
  static decode(op) {
    var low = op & 15;
    if (low === 0) {
      return {kind: 'blank', lines: ((op >> 4) & 7)+1, dli: !!(op & 0x80), lms: false, hscrol: false, vscrol: false, hasAddress: false};
    }
    if (low === 1) {
      return {kind: 'jump', lines: 0, jvb: !!(op & 0x40), dli: !!(op & 0x80), lms: false, hscrol: false, vscrol: false, hasAddress: true};
    }
    var m = Atari8DisplayList.MODES[low];
    return {
      kind: 'mode', mode: low, lines: m.lines, bytes: m.bytes, text: m.text,
      lms: !!(op & 0x40), dli: !!(op & 0x80), hscrol: !!(op & 0x10), vscrol: !!(op & 0x20),
      hasAddress: !!(op & 0x40)
    };
  } // decode

  /**
   * The list the OS builds for a full-screen Graphics mode: 24 blank lines,
   * then the mode lines with the screen at `screen`, then JVB to `address`.
   * @param {number} mode - The ANTIC mode (2 for Graphics 0).
   * @param {number} rows - How many mode lines (24 for Graphics 0).
   * @param {number} screen - The screen memory address.
   * @param {number} address - Where the list itself lives, for the JVB.
   * @returns {Atari8DisplayList} The list.
   */
  static standard(mode, rows, screen, address) {
    var list = new Atari8DisplayList();
    list.blank(8).blank(8).blank(8);
    list.mode(mode, rows, {lms: screen});
    list.jump(address);
    return list;
  } // standard

} // Atari8DisplayList
