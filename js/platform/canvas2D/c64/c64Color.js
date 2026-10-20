// begin code

/**
 * The 16 colours of the VIC-II, as hex strings, with the names the Commodore
 * manuals used and helpers to go from a register value to a colour. The
 * values are the **Colodore** PAL palette (Pepto's 2017 revision, see
 * SOURCES.md; R-051), the one today's emulators and most recordings show —
 * Pepto's 2001 measurement, used until 2026-10-18, has a blue so dark that
 * multicolour text in it (R-Type's panel) is hard to read. The hardware
 * had no palette registers, so a game never changes these — it only picks
 * one of the 16 for each register. `match*` tools compare colour indices,
 * never these values.
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
C64Color.red        = '#96282e';
C64Color.cyan       = '#5bd6ce';
C64Color.purple     = '#9f2dad';
C64Color.green      = '#41b936';
C64Color.blue       = '#2724c4';
C64Color.yellow     = '#eff347';
C64Color.orange     = '#9f4815';
C64Color.brown      = '#5e3500';
C64Color.lightRed   = '#da5f66';
C64Color.darkGrey   = '#474747';
C64Color.grey       = '#787878';
C64Color.lightGreen = '#91ff84';
C64Color.lightBlue  = '#6864ff';
C64Color.lightGrey  = '#aeaeae';

/** the names in register order, so `colorsNames[6]` is 'blue' */
C64Color.colorsNames = [
  'black', 'white', 'red', 'cyan', 'purple', 'green', 'blue', 'yellow',
  'orange', 'brown', 'lightRed', 'darkGrey', 'grey', 'lightGreen', 'lightBlue', 'lightGrey'
];

/** the registers a game reaches for by name */
C64Color.BORDER = 0xD020;
C64Color.BACKGROUND = 0xD021;
