// begin code

/**
 * The 16 colours of the VIC-II, as hex strings, with the names the Commodore
 * manuals used and helpers to go from a register value to a colour. The
 * values are Pepto's measured PAL palette (see SOURCES.md), the one most
 * emulators default to; the hardware had no palette registers, so a game
 * never changes these — it only picks one of the 16 for each register.
 *
 * Where a colour comes from on the machine:
 *
 *   $D020  border                    {@link C64Color.color}(value & 15)
 *   $D021  background (all cells)    idem
 *   $D800  colour RAM, a nibble a cell — the foreground of that cell
 *   $D025..$D02E  sprite colours
 *
 * There is no bright bit and no attribute byte as on the Spectrum: every
 * register holds a plain index 0-15, so there is nothing to unpack here.
 */
export class C64Color {

  /**
   * Resolves a VIC-II colour index into its hex colour string.
   * @param {number} color - Colour index 0-15; higher bits are ignored, as the chip ignores them.
   * @returns {string} The hex colour string.
   */
  static color(color) {
    return this[this.colorsNames[color & 15]];
  } // color

  /**
   * The index of a colour name, for readable code: `C64Color.index('lightBlue')`.
   * @param {string} name - One of {@link C64Color.colorsNames}.
   * @returns {number} 0-15, or -1 for an unknown name.
   */
  static index(name) {
    return this.colorsNames.indexOf(name);
  } // index

} // C64Color

C64Color.black      = '#000000';
C64Color.white      = '#ffffff';
C64Color.red        = '#68372b';
C64Color.cyan       = '#70a4b2';
C64Color.purple     = '#6f3d86';
C64Color.green      = '#588d43';
C64Color.blue       = '#352879';
C64Color.yellow     = '#b8c76f';
C64Color.orange     = '#6f4f25';
C64Color.brown      = '#433900';
C64Color.lightRed   = '#9a6759';
C64Color.darkGrey   = '#444444';
C64Color.grey       = '#6c6c6c';
C64Color.lightGreen = '#9ad284';
C64Color.lightBlue  = '#6c5eb5';
C64Color.lightGrey  = '#959595';

/** the names in register order, so `colorsNames[6]` is 'blue' */
C64Color.colorsNames = [
  'black', 'white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow',
  'orange', 'brown', 'lightRed', 'darkGrey', 'grey', 'lightGreen', 'lightBlue', 'lightGrey'
];

/** the registers a game reaches for by name */
C64Color.BORDER = 0xD020;
C64Color.BACKGROUND = 0xD021;
