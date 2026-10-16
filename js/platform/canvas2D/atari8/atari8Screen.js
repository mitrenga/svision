const { Atari8Color } = await import('./atari8Color.js?ver='+window.srcVersion);
const { Atari8Codes } = await import('./atari8Codes.js?ver='+window.srcVersion);
const { Atari8DisplayList } = await import('./atari8DisplayList.js?ver='+window.srcVersion);
// begin code

/**
 * The screen of an Atari 8-bit computer (400/800/XL/XE alike) as ANTIC and
 * GTIA make it: **64 KB
 * of memory** and the registers of the two chips. There is no screen memory
 * at a fixed address — ANTIC walks the display list at `dlist`, fetches the
 * screen bytes and the character set from wherever the list and CHBASE
 * point, and GTIA colours every pixel from its colour registers and lays
 * the players and missiles over it. A game writes into the memory the way
 * the original did, sets the registers, and the picture follows.
 *
 * The picture is the **normal playfield: 320 pixels by 240 scan lines**,
 * the lines 8-247 of the frame ANTIC can display. The OS's display list
 * starts with 24 blank lines, so the 192 lines of Graphics 0 sit at 24-215
 * with the background colour above and below; a game's list can use all
 * 240. Narrow and wide playfields are not modelled (the frame stays 320).
 *
 * ## What is modelled in this step
 *
 * - blank lines, mode 2 (Graphics 0: 40x24 text, a glyph's set bits in the
 *   luminance of COLPF1 on the hue of COLPF2), mode 4 (Graphics 12: 40x24
 *   characters of 4 pixel pairs, 00 COLBK, 01 COLPF0, 10 COLPF1, 11 COLPF2
 *   or COLPF3 with bit 7 of the code) — the mode Boulder Dash and most
 *   tile games ran in; JVB and JMP;
 * - CHACTL: inverse video (bit 1) and blanking of inverse characters (bit 0);
 * - players and missiles, single or double line resolution, normal, double
 *   and quadruple width, the fifth player, players over the playfield in
 *   number order — the priority register beyond that is not read;
 * - **step 2 (Boulder Dash M1)**: mode 6 and 7 (Graphics 1 and 2: 20
 *   double-width characters, the colour from bits 6-7 of the code), the map
 *   modes D, E and F (Graphics 7, 15 and 8), **fine scrolling** — a mode
 *   line with the HSCROL bit fetches the wide playfield and shows it
 *   shifted right by HSCROL colour clocks, a run of lines with the VSCROL
 *   bit starts VSCROL scan lines into its first line and the line after
 *   the run shows VSCROL+1 lines — and **display list interrupts as data**:
 *   `dli` is a list of register changes, one per DLI bit met in the frame
 *   (`{chbase: 0x44}`, `{colpf0: .., colbk: ..}`), applied after the line
 *   that carries the bit, the way the game's DLI routine does after its
 *   WSYNC; the registers come back at the end of the frame, as the VBI
 *   puts them back on the machine;
 * - the other modes (3, 5, 8-C) draw as background and are counted in
 *   `unsupported`. Each of these is a branch to add when a game needs it
 *   (R-039).
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches `document` or a canvas: the picture goes into a
 * buffer of packed pixels, so a tool under Node paints what the browser
 * paints (R-001). The entity owning a canvas is {@link Atari8ScreenEntity}.
 * The memory does not know when it was written; call {@link Atari8Screen#touch}
 * after writing into it, as {@link ZXVideoRAMEntity#invalidate} is called.
 * Register setters touch by themselves.
 *
 * ```js
 * var screen = new Atari8Screen();
 * screen.powerOn(font.setBytes(0));         // the OS's Graphics 0 screen
 * screen.print(0, 0, 'READY');
 * screen.setColor('colbk', 0x94);           // SETCOLOR 4,9,4
 * ```
 */
export class Atari8Screen {

  /** the picture in pixels */
  static get WIDTH() { return 320; }
  static get HEIGHT() { return 240; }
  /** the first scan line of the picture in the frame ANTIC counts */
  static get FIRST_LINE() { return 8; }
  /** the first colour clock of the normal playfield, as HPOS counts */
  static get FIRST_CLOCK() { return 48; }
  /** where the OS puts the Graphics 0 screen on a 64 KB machine */
  static get OS_DLIST() { return 0xBC20; }
  static get OS_SCREEN() { return 0xBC40; }
  /** register defaults: DMA on with normal playfield, players and missiles off */
  static get DMACTL_NORMAL() { return 0x22; }
  static get CHACTL_NORMAL() { return 0x02; }

  /**
   * @param {Uint8Array} [memory] - 64 KB to share with a game; a new one otherwise.
   */
  constructor(memory) {
    this.id = 'Atari8Screen';

    /** the whole address space, as the chips see it */
    this.memory = memory || new Uint8Array(65536);
    /** ANTIC: DLISTL/H, DMACTL, CHBASE (page), CHACTL, HSCROL, VSCROL */
    this.dlist = Atari8Screen.OS_DLIST;
    this.dmactl = Atari8Screen.DMACTL_NORMAL;
    this.chbase = 0xE0;
    this.chactl = Atari8Screen.CHACTL_NORMAL;
    this.hscrol = 0;
    this.vscrol = 0;
    this.pmbase = 0;
    /** GTIA: the colour registers */
    this.colbk = Atari8Color.OS_COLOR4;
    this.colpf = [Atari8Color.OS_COLOR0, Atari8Color.OS_COLOR1, Atari8Color.OS_COLOR2, Atari8Color.OS_COLOR3];
    this.colpm = [0, 0, 0, 0];
    /** GTIA: players and missiles */
    this.gractl = 0;
    this.hposp = [0, 0, 0, 0];
    this.hposm = [0, 0, 0, 0];
    this.sizep = [0, 0, 0, 0];
    this.sizem = 0;
    this.prior = 0;
    /** display list interrupts as data: the n-th DLI bit met in a frame
        applies `dli[n]`, an object of register values ('chbase', 'colbk',
        'colpf0'-'colpf3', 'colpm0'-'colpm3', 'hscrol', 'vscrol', 'prior');
        a missing entry changes nothing */
    this.dli = [];
    /** bumped by every register write and by `touch()` */
    this.version = 0;
    /** mode lines met that are not drawn, by mode; a tool reads it */
    this.unsupported = {};
  } // constructor

  // ---------------------------------------------------------------- memory

  /**
   * Says the memory changed, so the entity repaints.
   * @returns {Atari8Screen} This.
   */
  touch() {
    this.version++;
    return this;
  } // touch

  /**
   * Writes bytes into the memory.
   * @param {number} address - Where.
   * @param {Uint8Array|number[]} bytes - What.
   * @returns {Atari8Screen} This.
   */
  write(address, bytes) {
    this.memory.set(bytes, address & 0xFFFF);
    return this.touch();
  } // write

  /**
   * Writes one byte.
   * @param {number} address - Where.
   * @param {number} value - What.
   * @returns {Atari8Screen} This.
   */
  poke(address, value) {
    this.memory[address & 0xFFFF] = value & 0xFF;
    return this.touch();
  } // poke

  /**
   * Reads one byte.
   * @param {number} address - Where.
   * @returns {number} The byte.
   */
  peek(address) {
    return this.memory[address & 0xFFFF];
  } // peek

  /**
   * A 16-bit word, low byte first.
   * @param {number} address - Where.
   * @returns {number} The word.
   */
  word(address) {
    return this.memory[address & 0xFFFF] | (this.memory[(address+1) & 0xFFFF] << 8);
  } // word

  // ------------------------------------------------------------- registers

  /**
   * Sets a colour register: 'colbk', 'colpf0'-'colpf3', 'colpm0'-'colpm3'.
   * @param {string} register - The name.
   * @param {number} value - Hue in the high nibble, luminance in the low.
   * @returns {Atari8Screen} This.
   */
  setColor(register, value) {
    var v = value & 0xFF;
    if (register === 'colbk') {
      this.colbk = v;
    } else if (register.substring(0, 5) === 'colpf') {
      this.colpf[register.charCodeAt(5)-48] = v;
    } else if (register.substring(0, 5) === 'colpm') {
      this.colpm[register.charCodeAt(5)-48] = v;
    }
    return this.touch();
  } // setColor

  /**
   * SETCOLOR of BASIC: register 0-3 are COLPF0-3, 4 is COLBK.
   * @param {number} register - 0-4.
   * @param {number} hue - 0-15.
   * @param {number} luminance - 0-15.
   * @returns {Atari8Screen} This.
   */
  setcolor(register, hue, luminance) {
    return this.setColor(register === 4 ? 'colbk' : 'colpf'+register, Atari8Color.value(hue, luminance));
  } // setcolor

  /**
   * Points ANTIC at a display list.
   * @param {number} address - The list.
   * @returns {Atari8Screen} This.
   */
  setDisplayList(address) {
    this.dlist = address & 0xFFFF;
    return this.touch();
  } // setDisplayList

  /**
   * Points ANTIC at a character set (CHBASE, a page: the set is 1 KB aligned).
   * @param {number} page - The high byte of the address, $E0 for the ROM.
   * @returns {Atari8Screen} This.
   */
  setCharsetPage(page) {
    this.chbase = page & 0xFC;
    return this.touch();
  } // setCharsetPage

  /**
   * Sets ANTIC and GTIA control registers by name: 'dmactl', 'chactl',
   * 'gractl', 'prior', 'pmbase', 'sizem', 'hscrol', 'vscrol'.
   * @param {string} register - The name.
   * @param {number} value - The byte.
   * @returns {Atari8Screen} This.
   */
  setRegister(register, value) {
    this[register] = value & 0xFF;
    return this.touch();
  } // setRegister

  /**
   * Sets the display list interrupts as data (see `dli`).
   * @param {Object[]} list - One object of register values per DLI bit in the frame.
   * @returns {Atari8Screen} This.
   */
  setDLI(list) {
    this.dli = Array.isArray(list) ? list : [];
    return this.touch();
  } // setDLI

  /**
   * Applies one DLI's register values, without touching (it is the frame
   * being painted, not the machine being changed).
   * @param {Object} values - The register values.
   */
  applyDLI(values) {
    if (!values) {
      return;
    }
    Object.keys(values).forEach((key) => {
      var v = values[key] & 0xFF;
      if (key === 'chbase') {
        this.chbase = v & 0xFC;
      } else if (key === 'colbk') {
        this.colbk = v;
      } else if (key.substring(0, 5) === 'colpf') {
        this.colpf[key.charCodeAt(5)-48] = v;
      } else if (key.substring(0, 5) === 'colpm') {
        this.colpm[key.charCodeAt(5)-48] = v;
      } else if (key === 'hscrol' || key === 'vscrol' || key === 'prior') {
        this[key] = v;
      }
    });
  } // applyDLI

  /**
   * Places a player or a missile: HPOSP0-3 / HPOSM0-3.
   * @param {boolean} missile - A missile rather than a player.
   * @param {number} index - 0-3.
   * @param {number} hpos - The colour clock, 48 is the left edge of the playfield.
   * @returns {Atari8Screen} This.
   */
  setPosition(missile, index, hpos) {
    (missile ? this.hposm : this.hposp)[index & 3] = hpos & 0xFF;
    return this.touch();
  } // setPosition

  /**
   * Sets a player's width: SIZEP0-3, 0 normal, 1 double, 3 quadruple.
   * @param {number} index - 0-3.
   * @param {number} size - 0-3.
   * @returns {Atari8Screen} This.
   */
  setPlayerSize(index, size) {
    this.sizep[index & 3] = size & 3;
    return this.touch();
  } // setPlayerSize

  // --------------------------------------------------------- the OS screen

  /**
   * What the OS does at power-on for Graphics 0: the whole 64 KB cleared to
   * zero first — including a game's memory when the constructor was handed
   * one to share — then the character set at $E000, the display list at
   * $BC20, a cleared screen at $BC40, the default colours, players off.
   * @param {Uint8Array} charset - The 1 KB of the ROM set ({@link Atari8Fonts8x8#setBytes}).
   * @returns {Atari8Screen} This.
   */
  powerOn(charset) {
    this.memory.fill(0);
    this.memory.set(charset, 0xE000);
    var list = Atari8DisplayList.standard(2, 24, Atari8Screen.OS_SCREEN, Atari8Screen.OS_DLIST);
    this.memory.set(list.bytes(), Atari8Screen.OS_DLIST);
    this.dlist = Atari8Screen.OS_DLIST;
    this.dmactl = Atari8Screen.DMACTL_NORMAL;
    this.chbase = 0xE0;
    this.chactl = Atari8Screen.CHACTL_NORMAL;
    this.colbk = Atari8Color.OS_COLOR4;
    this.colpf = [Atari8Color.OS_COLOR0, Atari8Color.OS_COLOR1, Atari8Color.OS_COLOR2, Atari8Color.OS_COLOR3];
    this.colpm = [0, 0, 0, 0];
    this.gractl = 0;
    this.prior = 0;
    return this.touch();
  } // powerOn

  /**
   * The address of a cell of a 40-column screen whose memory starts at
   * `screen` (the OS's by default).
   * @param {number} col - 0-39.
   * @param {number} row - 0-23.
   * @param {number} [screen] - The screen memory address.
   * @returns {number} The address.
   */
  cellAddress(col, row, screen) {
    return ((screen === undefined ? Atari8Screen.OS_SCREEN : screen)+row*40+col) & 0xFFFF;
  } // cellAddress

  /**
   * Writes text into a 40-column screen as internal codes, no wrap, no
   * cursor — a label. The OS's editor with its cursor and scrolling is the
   * boot model's business.
   * @param {number} col - 0-39.
   * @param {number} row - 0-23.
   * @param {string} text - The text.
   * @param {boolean} [inverse] - In inverse video.
   * @param {number} [screen] - The screen memory address.
   * @returns {Atari8Screen} This.
   */
  print(col, row, text, inverse, screen) {
    var codes = Atari8Codes.encode(text);
    var at = this.cellAddress(col, row, screen);
    for (var i = 0; i < codes.length && col+i < 40; i++) {
      this.memory[(at+i) & 0xFFFF] = codes[i] | (inverse ? Atari8Codes.INVERSE : 0);
    }
    return this.touch();
  } // print

  /**
   * One row of a 40-column screen as a string, inverse dropped.
   * @param {number} row - 0-23.
   * @param {number} [screen] - The screen memory address.
   * @returns {string} 40 characters.
   */
  rowText(row, screen) {
    var text = '';
    var at = this.cellAddress(0, row, screen);
    for (var col = 0; col < 40; col++) {
      text += Atari8Codes.decodeChar(this.memory[(at+col) & 0xFFFF]);
    }
    return text;
  } // rowText

  // ------------------------------------------------------------ to the screen

  /**
   * Paints the picture into packed pixels, 320 x 240, walking the display
   * list as ANTIC does and colouring as GTIA does.
   * @param {Uint32Array} pixels - Target, 320*240 elements.
   * @param {boolean} littleEndian - Byte order of the target.
   * @returns {Atari8Screen} This.
   */
  paint32(pixels, littleEndian) {
    var colors = Atari8Color.lookup(littleEndian);
    var width = Atari8Screen.WIDTH;
    var height = Atari8Screen.HEIGHT;
    var memory = this.memory;
    var bk = colors[this.colbk];
    pixels.fill(bk, 0, width*height);
    this.unsupported = {};

    if (!(this.dmactl & 0x20)) {
      // no display list DMA: the screen is the background colour
      this.paintPlayers(pixels, colors);
      return this;
    }

    // the registers a DLI may change come back at the end of the frame
    var saved = {chbase: this.chbase, colbk: this.colbk, colpf: this.colpf.slice(), colpm: this.colpm.slice(),
                 hscrol: this.hscrol, vscrol: this.vscrol, prior: this.prior};
    var pc = this.dlist;
    var y = 0;
    var scan = 0;          // the memory scan counter, set by LMS
    var guard = 0;
    var dliCount = 0;
    var inVscrol = false;  // inside a run of VSCROL lines
    while (y < height && guard++ < 1024) {
      var op = memory[pc];
      pc = (pc+1) & 0xFFFF;
      var d = Atari8DisplayList.decode(op);
      if (d.kind === 'jump') {
        var target = memory[pc] | (memory[(pc+1) & 0xFFFF] << 8);
        if (d.jvb) {
          break;
        }
        pc = target;
        continue;
      }
      if (d.kind === 'blank') {
        y += d.lines;
        if (d.dli) {
          this.applyDLI(this.dli[dliCount++]);
        }
        continue;
      }
      if (d.lms) {
        scan = memory[pc] | (memory[(pc+1) & 0xFFFF] << 8);
        pc = (pc+2) & 0xFFFF;
      }
      // vertical scrolling: the first line of a run starts VSCROL scan lines
      // in, the line after the run shows VSCROL+1 lines
      var first = 0, count = d.lines;
      if (d.vscrol && !inVscrol) {
        first = Math.min(this.vscrol & 15, d.lines-1);
        count = d.lines-first;
      } else if (!d.vscrol && inVscrol) {
        count = Math.min((this.vscrol & 15)+1, d.lines);
      }
      inVscrol = d.vscrol;
      var lines = Math.min(count, height-y);
      // horizontal scrolling: the wide playfield, shifted right by HSCROL clocks
      var shift = d.hscrol ? 16-(this.hscrol & 15) : 0;
      var bytes = d.hscrol ? ({40: 48, 20: 24, 10: 12}[d.bytes] || d.bytes) : d.bytes;
      switch (d.mode) {
        case 2:
          this.paintMode2(pixels, colors, y, lines, scan, first, shift, bytes);
          break;
        case 4:
          this.paintMode4(pixels, colors, y, lines, scan, first, shift, bytes);
          break;
        case 6:
        case 7:
          this.paintMode6(pixels, colors, y, lines, scan, first, shift, bytes, d.mode === 7);
          break;
        case 13:
        case 14:
          this.paintModeE(pixels, colors, y, lines, scan, shift, bytes);
          break;
        case 15:
          this.paintModeF(pixels, colors, y, lines, scan, shift, bytes);
          break;
        default:
          this.unsupported[d.mode] = (this.unsupported[d.mode] || 0)+1;
          break;
      }
      scan = (scan+bytes) & 0xFFFF;
      y += lines;
      if (d.dli) {
        this.applyDLI(this.dli[dliCount++]);
      }
    }
    this.chbase = saved.chbase; this.colbk = saved.colbk; this.colpf = saved.colpf; this.colpm = saved.colpm;
    this.hscrol = saved.hscrol; this.vscrol = saved.vscrol; this.prior = saved.prior;
    this.paintPlayers(pixels, colors);
    return this;
  } // paint32

  /**
   * The pixel columns of one character cell of a line with `bytes` screen
   * bytes: the cell's left edge on the screen, given the horizontal shift
   * (colour clocks; 0 without scrolling, 16-HSCROL with it, when the fetch
   * starts 16 clocks left of the playfield).
   * @param {number} col - The byte's index in the line.
   * @param {number} clocksPerByte - 4 in the 40-byte modes, 8 in the 20-byte ones.
   * @param {number} shift - The horizontal shift in colour clocks.
   * @returns {number} The x of the left edge, may be negative or past the edge.
   */
  static cellX(col, clocksPerByte, shift) {
    return (col*clocksPerByte-shift)*2;
  } // cellX

  /**
   * Puts `count` pixels of one colour on a scan line, clipped to the picture.
   * @param {Uint32Array} pixels - Target.
   * @param {number} row - The scan line's offset in the target.
   * @param {number} x - The first pixel.
   * @param {number} count - How many.
   * @param {number} color - The packed pixel.
   */
  static span(pixels, row, x, count, color) {
    var from = Math.max(0, x), to = Math.min(Atari8Screen.WIDTH, x+count);
    for (var px = from; px < to; px++) {
      pixels[row+px] = color;
    }
  } // span

  /**
   * One line of mode 2: 40 characters, 8 scan lines; a set bit shows the
   * luminance of COLPF1 on the hue of COLPF2, a clear bit COLPF2.
   * @param {Uint32Array} pixels - Target.
   * @param {Uint32Array} colors - The lookup.
   * @param {number} y - The first scan line.
   * @param {number} lines - How many scan lines to draw.
   * @param {number} scan - The screen memory address of the line.
   * @param {number} [first] - The first glyph row shown (vertical scrolling).
   * @param {number} [shift] - Horizontal shift in colour clocks.
   * @param {number} [bytes] - Screen bytes of the line, 40 or 48.
   */
  paintMode2(pixels, colors, y, lines, scan, first, shift, bytes) {
    var memory = this.memory;
    var width = Atari8Screen.WIDTH;
    var bg = colors[this.colpf[2]];
    var fg = colors[(this.colpf[2] & 0xF0) | (this.colpf[1] & 0x0F)];
    var base = this.chbase << 8;
    var n = bytes || 40;
    for (var col = 0; col < n; col++) {
      var x0 = Atari8Screen.cellX(col, 4, shift || 0);
      if (x0 <= -8 || x0 >= width) {
        continue;
      }
      var code = memory[(scan+col) & 0xFFFF];
      var glyph = base+(code & 0x7F)*8;
      var inverse = (code & 0x80) && (this.chactl & 2);
      var blank = (code & 0x80) && (this.chactl & 1);
      for (var line = 0; line < lines; line++) {
        var mask = blank ? 0 : memory[(glyph+(first || 0)+line) & 0xFFFF];
        if (inverse) {
          mask ^= 0xFF;
        }
        var row = (y+line)*width;
        for (var bit = 0; bit < 8; bit++) {
          var px = x0+bit;
          if (px >= 0 && px < width) {
            pixels[row+px] = (mask & (0x80 >> bit)) ? fg : bg;
          }
        }
      }
    }
  } // paintMode2

  /**
   * One line of mode 4: 40 characters of four pixel pairs, 8 scan lines;
   * 00 COLBK, 01 COLPF0, 10 COLPF1, 11 COLPF2 — COLPF3 when bit 7 of the
   * code is set.
   * @param {Uint32Array} pixels - Target.
   * @param {Uint32Array} colors - The lookup.
   * @param {number} y - The first scan line.
   * @param {number} lines - How many scan lines to draw.
   * @param {number} scan - The screen memory address of the line.
   * @param {number} [first] - The first glyph row shown (vertical scrolling).
   * @param {number} [shift] - Horizontal shift in colour clocks.
   * @param {number} [bytes] - Screen bytes of the line, 40 or 48.
   */
  paintMode4(pixels, colors, y, lines, scan, first, shift, bytes) {
    var memory = this.memory;
    var width = Atari8Screen.WIDTH;
    var base = this.chbase << 8;
    var palette = [colors[this.colbk], colors[this.colpf[0]], colors[this.colpf[1]], colors[this.colpf[2]]];
    var alternate = colors[this.colpf[3]];
    var n = bytes || 40;
    for (var col = 0; col < n; col++) {
      var x0 = Atari8Screen.cellX(col, 4, shift || 0);
      if (x0 <= -8 || x0 >= width) {
        continue;
      }
      var code = memory[(scan+col) & 0xFFFF];
      var glyph = base+(code & 0x7F)*8;
      var third = (code & 0x80) ? alternate : palette[3];
      for (var line = 0; line < lines; line++) {
        var byte = memory[(glyph+(first || 0)+line) & 0xFFFF];
        var row = (y+line)*width;
        for (var pair = 0; pair < 4; pair++) {
          var value = (byte >> (6-pair*2)) & 3;
          Atari8Screen.span(pixels, row, x0+pair*2, 2, value === 3 ? third : palette[value]);
        }
      }
    }
  } // paintMode4

  /**
   * One line of mode 6 (Graphics 1) or 7 (Graphics 2): 20 characters of
   * double width, 8 or 16 scan lines; the glyph is code & $3F, the colour
   * bits 6-7 of the code: 00 COLPF0, 01 COLPF1, 10 COLPF2, 11 COLPF3, a
   * clear bit is COLBK.
   * @param {Uint32Array} pixels - Target.
   * @param {Uint32Array} colors - The lookup.
   * @param {number} y - The first scan line.
   * @param {number} lines - How many scan lines to draw.
   * @param {number} scan - The screen memory address of the line.
   * @param {number} [first] - The first scan line of the cell shown (vertical scrolling).
   * @param {number} [shift] - Horizontal shift in colour clocks.
   * @param {number} [bytes] - Screen bytes of the line, 20 or 24.
   * @param {boolean} [tall] - Mode 7: every glyph row twice.
   */
  paintMode6(pixels, colors, y, lines, scan, first, shift, bytes, tall) {
    var memory = this.memory;
    var width = Atari8Screen.WIDTH;
    var base = this.chbase << 8;
    var bg = colors[this.colbk];
    var n = bytes || 20;
    for (var col = 0; col < n; col++) {
      var x0 = Atari8Screen.cellX(col, 8, shift || 0);
      if (x0 <= -16 || x0 >= width) {
        continue;
      }
      var code = memory[(scan+col) & 0xFFFF];
      var glyph = base+(code & 0x3F)*8;
      var fg = colors[this.colpf[code >> 6]];
      for (var line = 0; line < lines; line++) {
        var cellLine = (first || 0)+line;
        var mask = memory[(glyph+(tall ? cellLine >> 1 : cellLine)) & 0xFFFF];
        var row = (y+line)*width;
        for (var bit = 0; bit < 8; bit++) {
          Atari8Screen.span(pixels, row, x0+bit*2, 2, (mask & (0x80 >> bit)) ? fg : bg);
        }
      }
    }
  } // paintMode6

  /**
   * One line of mode E (Graphics 15) or D (Graphics 7): 40 bytes of four
   * pixel pairs, one or two scan lines; 00 COLBK, 01 COLPF0, 10 COLPF1,
   * 11 COLPF2.
   * @param {Uint32Array} pixels - Target.
   * @param {Uint32Array} colors - The lookup.
   * @param {number} y - The first scan line.
   * @param {number} lines - How many scan lines to draw (1 or 2).
   * @param {number} scan - The screen memory address of the line.
   * @param {number} [shift] - Horizontal shift in colour clocks.
   * @param {number} [bytes] - Screen bytes of the line, 40 or 48.
   */
  paintModeE(pixels, colors, y, lines, scan, shift, bytes) {
    var memory = this.memory;
    var width = Atari8Screen.WIDTH;
    var palette = [colors[this.colbk], colors[this.colpf[0]], colors[this.colpf[1]], colors[this.colpf[2]]];
    var n = bytes || 40;
    for (var col = 0; col < n; col++) {
      var x0 = Atari8Screen.cellX(col, 4, shift || 0);
      if (x0 <= -8 || x0 >= width) {
        continue;
      }
      var byte = memory[(scan+col) & 0xFFFF];
      for (var line = 0; line < lines; line++) {
        var row = (y+line)*width;
        for (var pair = 0; pair < 4; pair++) {
          Atari8Screen.span(pixels, row, x0+pair*2, 2, palette[(byte >> (6-pair*2)) & 3]);
        }
      }
    }
  } // paintModeE

  /**
   * One line of mode F (Graphics 8): 40 bytes of eight pixels, one scan
   * line; a set bit is the luminance of COLPF1 on the hue of COLPF2, a
   * clear bit COLPF2 (as mode 2).
   * @param {Uint32Array} pixels - Target.
   * @param {Uint32Array} colors - The lookup.
   * @param {number} y - The scan line.
   * @param {number} lines - 1.
   * @param {number} scan - The screen memory address of the line.
   * @param {number} [shift] - Horizontal shift in colour clocks.
   * @param {number} [bytes] - Screen bytes of the line, 40 or 48.
   */
  paintModeF(pixels, colors, y, lines, scan, shift, bytes) {
    var memory = this.memory;
    var width = Atari8Screen.WIDTH;
    var bg = colors[this.colpf[2]];
    var fg = colors[(this.colpf[2] & 0xF0) | (this.colpf[1] & 0x0F)];
    var n = bytes || 40;
    for (var col = 0; col < n; col++) {
      var x0 = Atari8Screen.cellX(col, 4, shift || 0);
      if (x0 <= -8 || x0 >= width) {
        continue;
      }
      var byte = memory[(scan+col) & 0xFFFF];
      for (var line = 0; line < lines; line++) {
        var row = (y+line)*width;
        for (var bit = 0; bit < 8; bit++) {
          var px = x0+bit;
          if (px >= 0 && px < width) {
            pixels[row+px] = (byte & (0x80 >> bit)) ? fg : bg;
          }
        }
      }
    }
  } // paintModeF

  /**
   * The players and missiles over the playfield, from the PM memory at
   * PMBASE: each scan line of the frame is one byte of a player (or half a
   * byte in double-line resolution), placed at its HPOS and stretched by
   * its size; a missile is two bits of the shared missile byte. Player 0 is
   * on top, then 1, 2, 3, then the missiles' owners; with bit 4 of PRIOR
   * the missiles are a fifth player in COLPF3.
   * @param {Uint32Array} pixels - Target.
   * @param {Uint32Array} colors - The lookup.
   */
  paintPlayers(pixels, colors) {
    var players = (this.gractl & 2) && (this.dmactl & 8);
    var missiles = (this.gractl & 1) && (this.dmactl & 4);
    if (!players && !missiles) {
      return;
    }
    var single = !!(this.dmactl & 0x10);
    var base = this.pmbase << 8;
    var width = Atari8Screen.WIDTH;
    var height = Atari8Screen.HEIGHT;
    var widths = [1, 2, 1, 4];
    var fifth = !!(this.prior & 0x10);

    for (var y = 0; y < height; y++) {
      var frameLine = y+Atari8Screen.FIRST_LINE;
      var index = single ? frameLine : (frameLine >> 1);
      var row = y*width;
      // missiles first, players over them, player 0 last
      if (missiles) {
        var mbyte = this.memory[(base+(single ? 768 : 384)+index) & 0xFFFF];
        for (var m = 3; m >= 0; m--) {
          var bits = (mbyte >> (m*2)) & 3;
          if (bits) {
            var mw = widths[(this.sizem >> (m*2)) & 3];
            var mc = colors[fifth ? this.colpf[3] : this.colpm[m]];
            this.paintStrip(pixels, row, this.hposm[m], bits, 2, mw, mc);
          }
        }
      }
      if (players) {
        for (var p = 3; p >= 0; p--) {
          var pbyte = this.memory[(base+(single ? 1024+256*p : 512+128*p)+index) & 0xFFFF];
          if (pbyte) {
            this.paintStrip(pixels, row, this.hposp[p], pbyte, 8, widths[this.sizep[p]], colors[this.colpm[p]]);
          }
        }
      }
    }
  } // paintPlayers

  /**
   * One scan line of a player or missile: `bits` wide bits from the top,
   * each `size` colour clocks (two pixels each) wide, from HPOS.
   * @param {Uint32Array} pixels - Target.
   * @param {number} row - The offset of the scan line in the target.
   * @param {number} hpos - The colour clock of the left edge.
   * @param {number} byte - The shape bits, bit (bits-1) leftmost.
   * @param {number} bits - 8 for a player, 2 for a missile.
   * @param {number} size - 1, 2 or 4 colour clocks per bit.
   * @param {number} color - The packed pixel.
   */
  paintStrip(pixels, row, hpos, byte, bits, size, color) {
    var x = (hpos-Atari8Screen.FIRST_CLOCK)*2;
    var step = size*2;
    for (var bit = bits-1; bit >= 0; bit--) {
      if (byte & (1 << bit)) {
        for (var i = 0; i < step; i++) {
          var px = x+i;
          if (px >= 0 && px < Atari8Screen.WIDTH) {
            pixels[row+px] = color;
          }
        }
      }
      x += step;
    }
  } // paintStrip

  /**
   * The same painting into RGBA bytes — for a tool under Node that wants a
   * PNG of the screen.
   * @param {Uint8ClampedArray|Uint8Array} rgba - Target, 320*240*4 bytes.
   * @returns {Atari8Screen} This.
   */
  paint(rgba) {
    var littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    var view = new Uint32Array(rgba.buffer, rgba.byteOffset, Atari8Screen.WIDTH*Atari8Screen.HEIGHT);
    return this.paint32(view, littleEndian);
  } // paint

} // Atari8Screen
