const { ZXVideoRAM } = await import('./zxVideoRAM.js?ver='+window.srcVersion);
const { ZXFonts8x8 } = await import('./zxFonts8x8.js?ver='+window.srcVersion);
// begin code

/**
 * The ROM's own printing to the upper screen (`RST $10` on channel S),
 * into a {@link ZXVideoRAM}: what a ZX game gets when it sends a stream of
 * characters and control codes through the ROM, as many of them print their
 * menus, their instructions and their panels.
 *
 * It belongs to the machine, not to a game: the codes, the attribute rules
 * and the font are the ROM's. What it does, code by code:
 *
 * - **32-127** — a character of the ROM font (96 is £, 127 is ©;
 *   svision's ZXFonts8x8 carries the ROM's glyph bytes, all 96 of them). The eight bytes go into the
 *   cell — XORed with $FF under INVERSE 1, XORed with what is there under
 *   OVER 1 — and ATTR-T into its attribute (PO-ATTR with MASK-T 0). The
 *   position moves on; past column 31 it wraps to the next line
 * - **16 INK n, 17 PAPER n, 18 FLASH n, 19 BRIGHT n** (0 or 1) — the
 *   temporary attribute ATTR-T
 * - **20 INVERSE n, 21 OVER n** — the print flags
 * - **22 AT row, col** — the print position
 * - **13** — to the start of the next line
 *
 * What the ROM does with the rest — INK/PAPER 8 and 9, TAB, the comma
 * control, the block graphics and the UDGs, scrolling — is not here, and a
 * stream that uses it is refused (an Error) rather than printed differently
 * from the machine. A game that needs one of them adds it here, checked the
 * way tools/checkzx.mjs checks the rest.
 *
 * A stream may be a string, an array of codes or a Uint8Array; `$FF` ends
 * it, the way the print loops of the games end their streams.
 *
 * Free of DOM dependencies (R-001).
 */
export class ZXRomPrint {

  /**
   * @param {ZXVideoRAM} videoRAM - The video memory to print into.
   * @param {number} [attrP] - ATTR-P, the permanent attribute ATTR-T starts
   *        from (as after CLS); the ROM's default is $38.
   */
  constructor(videoRAM, attrP) {
    this.videoRAM = videoRAM;
    this.font = new ZXFonts8x8({}, false);
    this.attrT = (attrP === undefined ? ZXVideoRAM.BLANK_ATTRIBUTE : attrP) & 0xFF;
    this.inverse = false;
    this.over = false;
    this.row = 0;
    this.col = 0;
  } // constructor

  /**
   * Sets the print position.
   * @param {number} row - 0-23.
   * @param {number} col - 0-31.
   */
  at(row, col) {
    if (row < 0 || row > 23 || col < 0 || col > 31) {
      throw new Error('AT '+row+','+col+' is off the upper screen');
    }
    this.row = row;
    this.col = col;
  } // at

  /**
   * Prints a stream up to its end or its first $FF.
   * @param {string|number[]|Uint8Array} stream - The codes.
   * @returns {number} How many codes were consumed (the $FF included).
   */
  print(stream) {
    var codes = typeof stream === 'string'
      ? Array.from(stream, (ch) => this.codeOf(ch))
      : stream;
    var i = 0;
    while (i < codes.length) {
      var code = codes[i++];
      if (code === 0xFF) {
        return i;
      }
      if (code >= 0x20 && code <= 0x7F) {
        this.character(code);
        continue;
      }
      var arg = codes[i];
      switch (code) {
        case 13:
          this.col = 0;
          this.row++;
          break;
        case 16:
          this.attrT = (this.attrT & 0xF8) | this.colour(arg);
          i++;
          break;
        case 17:
          this.attrT = (this.attrT & 0xC7) | (this.colour(arg) << 3);
          i++;
          break;
        case 18:
          this.attrT = (this.attrT & 0x7F) | (this.flag(arg) << 7);
          i++;
          break;
        case 19:
          this.attrT = (this.attrT & 0xBF) | (this.flag(arg) << 6);
          i++;
          break;
        case 20:
          this.inverse = this.flag(arg) === 1;
          i++;
          break;
        case 21:
          this.over = this.flag(arg) === 1;
          i++;
          break;
        case 22:
          this.at(arg, codes[i+1]);
          i += 2;
          break;
        default:
          throw new Error('ZXRomPrint: code '+code+' is not supported');
      }
    }
    return i;
  } // print

  /**
   * The ROM's code of a character of a string: its place in the ROM's
   * character order (so '£' is 96 and '©' 127), control codes as they are.
   * @param {string} ch - One character.
   * @returns {number} The code.
   */
  codeOf(ch) {
    var place = this.font.fontsChars.indexOf(ch);
    if (place >= 0) {
      return 0x20+place;
    }
    return ch.charCodeAt(0);
  } // codeOf

  /** a colour 0-7; 8 and 9 (transparent, contrast) are not supported */
  colour(value) {
    if (!(value >= 0 && value <= 7)) {
      throw new Error('ZXRomPrint: colour '+value+' is not supported');
    }
    return value;
  } // colour

  /** a flag 0 or 1; 8 (transparent) is not supported */
  flag(value) {
    if (value !== 0 && value !== 1) {
      throw new Error('ZXRomPrint: flag '+value+' is not supported');
    }
    return value;
  } // flag

  /**
   * One character of the ROM font at the print position.
   * @param {number} code - 32-127.
   */
  character(code) {
    if (this.row > 23) {
      throw new Error('ZXRomPrint: scrolling is not supported');
    }
    // by the ROM's order of the characters, not by ASCII: code 96 is £ and
    // 127 is © (ZXFonts8x8.fontsChars)
    var glyph = this.font.glyphBytes(this.font.fontsChars.charAt(code-0x20));
    var bytes = this.videoRAM.bytes;
    var at = ZXVideoRAM.lineOffset(this.row*8)+this.col;
    for (var line = 0; line < 8; line++) {
      var value = glyph[line] ^ (this.inverse ? 0xFF : 0);
      if (this.over) {
        value ^= bytes[at+line*256];
      }
      bytes[at+line*256] = value;
    }
    bytes[ZXVideoRAM.ATTRIBUTES_OFFSET+this.row*32+this.col] = this.attrT;
    this.col++;
    if (this.col > 31) {
      this.col = 0;
      this.row++;
    }
  } // character

} // ZXRomPrint
