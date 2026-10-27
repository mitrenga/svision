// begin code

/**
 * The firmware of a VT52-like terminal: bytes from the line in, changes of a
 * {@link TerminalScreen} out. A program on the host never draws — it sends
 * characters, carriage returns and escape sequences, and the terminal decides
 * what the screen shows. Here that decision is a state machine the browser and
 * a match tool under Node run alike (R-001, R-061).
 *
 * VT52 is a family more than a standard: DEC's terminal of 1975 and the many
 * that copied it, the Soviet 15IE-00-013 ("mostly VT52") among them. Which
 * sequences a particular terminal knows, and what it does with a byte it does
 * not, is a **profile** the application hands over:
 *
 * ```js
 * var vt = new TerminalVT52(screen, charset, {
 *   sequences: {H: 'home', J: 'clearToEndOfScreen', Y: 'cursorAddress'},
 *   printDel: true,        // DEL is a glyph on this terminal, not ignored
 *   autoWrap: false        // a character in the last column stays there
 * });
 * vt.onBell = () => sound.beep();
 * vt.write(bytes);
 * ```
 *
 * {@link TerminalVT52.VT52} is the sequence set of DEC's VT52 without the
 * graphics set and identification; a profile replaces it, it does not add to
 * it. A sequence the profile lacks is **counted** in `unsupported`, under its
 * name (`'ESC Z'`), and does nothing — never silently drawn wrong (as
 * `SNESPPU` does with what it has not built).
 *
 * The shift codes (SO/SI) come from the {@link TerminalCharset}: a byte that
 * selects a shift changes what the next printable bytes show.
 *
 * Bytes are written synchronously; how fast they came down the line is the
 * business of {@link TerminalLine}.
 */
export class TerminalVT52 {

  /**
   * @param {TerminalScreen} screen - The screen it writes.
   * @param {TerminalCharset} charset - Code + shift -> glyph.
   * @param {Object} [profile] - `sequences` (final byte -> action, see
   *        {@link TerminalVT52.ACTIONS}), `controls` (control code -> action),
   *        `printDel` (false), `autoWrap` (false), `dataMask` (0x7F: the
   *        eighth bit is dropped), `tabWidth` (8).
   */
  constructor(screen, charset, profile) {
    this.id = 'TerminalVT52';

    this.screen = screen;
    this.charset = charset;
    this.profile = Object.assign({
      sequences: TerminalVT52.VT52,
      controls: TerminalVT52.CONTROLS,
      printDel: false,
      autoWrap: false,
      dataMask: 0x7F,
      tabWidth: 8
    }, profile || {});

    /** called on BEL; the platform has no sound of its own (R-061) */
    this.onBell = null;
    this.reset();
  } // constructor

  /**
   * The terminal after power-on: initial shift, no sequence in progress,
   * counters cleared. The screen itself is not touched.
   * @returns {TerminalVT52} This.
   */
  reset() {
    /** the shift in force */
    this.shift = this.charset.initial;
    /** 0 ground, 1 after ESC, 2 after ESC Y, 3 after ESC Y row */
    this.state = 0;
    this.addressRow = 0;
    /** bytes written */
    this.bytes = 0;
    /** BEL received */
    this.bells = 0;
    /** control codes the profile has no action for, ignored as a terminal does */
    this.ignored = 0;
    /** sequences the profile has no action for, by name */
    this.unsupported = {};
    return this;
  } // reset

  /**
   * Writes bytes from the line.
   * @param {Uint8Array|Array<number>|number} data - The bytes, or one byte.
   * @returns {TerminalVT52} This.
   */
  write(data) {
    if (typeof data === 'number') {
      this.writeByte(data);
    } else {
      for (var i = 0; i < data.length; i++) {
        this.writeByte(data[i]);
      }
    }
    return this;
  } // write

  /**
   * Writes one byte from the line.
   * @param {number} value - The byte.
   */
  writeByte(value) {
    var code = value & this.profile.dataMask;
    this.bytes++;

    switch (this.state) {
      case 1:
        this.state = 0;
        var final = String.fromCharCode(code);
        var action = this.profile.sequences[final];
        if (action === 'cursorAddress') {
          this.state = 2;
        } else if (action && TerminalVT52.ACTIONS[action]) {
          TerminalVT52.ACTIONS[action](this);
        } else {
          this.count('ESC '+final);
        }
        return;
      case 2:
        this.addressRow = code-0x20;
        this.state = 3;
        return;
      case 3:
        this.state = 0;
        this.screen.setCursor(code-0x20, this.addressRow);
        return;
    }

    if (code === 0x1B) {
      this.state = 1;
      return;
    }
    var shift = this.charset.shiftOf(code);
    if (shift !== null) {
      this.shift = shift;
      return;
    }
    if (code < 0x20 || (code === 0x7F && !this.profile.printDel)) {
      var control = this.profile.controls[code];
      if (control && TerminalVT52.ACTIONS[control]) {
        TerminalVT52.ACTIONS[control](this);
      } else {
        this.ignored++;
      }
      return;
    }
    this.print(this.charset.glyph(code, this.shift));
  } // writeByte

  /**
   * Puts a glyph at the cursor and moves it on.
   * @param {number} glyph - The glyph index.
   */
  print(glyph) {
    var screen = this.screen;
    screen.putGlyph(screen.cursor.col, screen.cursor.row, glyph);
    if (screen.cursor.col < screen.cols-1) {
      screen.cursor.col++;
    } else if (this.profile.autoWrap) {
      screen.cursor.col = 0;
      this.lineFeed();
    }
  } // print

  /**
   * Cursor one row down, scrolling on the last row.
   */
  lineFeed() {
    var screen = this.screen;
    if (screen.cursor.row < screen.rows-1) {
      screen.setCursor(screen.cursor.col, screen.cursor.row+1);
    } else {
      screen.scrollUp(1);
    }
  } // lineFeed

  /**
   * Counts a sequence the profile does not know.
   * @param {string} name - E.g. 'ESC Z'.
   */
  count(name) {
    this.unsupported[name] = (this.unsupported[name] || 0)+1;
  } // count

} // TerminalVT52

/**
 * What an action does — the names a profile maps bytes to. `cursorAddress`
 * is handled by the state machine (two bytes follow: row + 040, column + 040).
 */
TerminalVT52.ACTIONS = {
  cursorUp: (vt) => vt.screen.setCursor(vt.screen.cursor.col, vt.screen.cursor.row-1),
  cursorDown: (vt) => vt.screen.setCursor(vt.screen.cursor.col, vt.screen.cursor.row+1),
  cursorRight: (vt) => vt.screen.setCursor(vt.screen.cursor.col+1, vt.screen.cursor.row),
  cursorLeft: (vt) => vt.screen.setCursor(vt.screen.cursor.col-1, vt.screen.cursor.row),
  home: (vt) => vt.screen.setCursor(0, 0),
  clearToEndOfScreen: (vt) => vt.screen.clearToEndOfScreen(),
  clearToEndOfLine: (vt) => vt.screen.clearToEndOfLine(),
  reverseLineFeed: (vt) => {
    if (vt.screen.cursor.row > 0) {
      vt.screen.setCursor(vt.screen.cursor.col, vt.screen.cursor.row-1);
    } else {
      vt.screen.scrollDown(1);
    }
  },
  carriageReturn: (vt) => vt.screen.setCursor(0, vt.screen.cursor.row),
  lineFeed: (vt) => vt.lineFeed(),
  backspace: (vt) => vt.screen.setCursor(vt.screen.cursor.col-1, vt.screen.cursor.row),
  tab: (vt) => {
    var width = vt.profile.tabWidth;
    vt.screen.setCursor((Math.floor(vt.screen.cursor.col/width)+1)*width, vt.screen.cursor.row);
  },
  bell: (vt) => {
    vt.bells++;
    if (vt.onBell) {
      vt.onBell();
    }
  }
};

/** DEC VT52 without the graphics set (ESC F / ESC G) and identification (ESC Z) */
TerminalVT52.VT52 = {
  A: 'cursorUp',
  B: 'cursorDown',
  C: 'cursorRight',
  D: 'cursorLeft',
  H: 'home',
  I: 'reverseLineFeed',
  J: 'clearToEndOfScreen',
  K: 'clearToEndOfLine',
  Y: 'cursorAddress'
};

/** the control codes a VT52 acts on; the others are ignored */
TerminalVT52.CONTROLS = {
  0x07: 'bell',
  0x08: 'backspace',
  0x09: 'tab',
  0x0A: 'lineFeed',
  0x0D: 'carriageReturn'
};
