/**/

/*/

/**/
// begin code

/**
 * Provides the 16-colour ZX Spectrum palette (8 normal plus 8 bright colours)
 * as hex strings, with helpers for resolving raw colour indices and Spectrum
 * attribute bytes into those hex values.
 */
export class ZXColor {

  /**
   * Resolves a numeric ZX Spectrum colour index into its hex colour string.
   * @param {number} color - Colour index in the range 0-15.
   * @returns {string|false} The hex colour string, or false if the index is out of range.
   */
  static color(color) {
    if (color >= 0 && color < 16) {
      return this[this.colorsNames[color]];
    }
    return false;
  } // color

  /**
   * Extracts a colour from a ZX Spectrum attribute byte using the given mask and
   * scaling, applying the BRIGHT bit (bit 6) to select the bright half of the palette.
   * @param {number} attr - The Spectrum attribute byte.
   * @param {number} mask - Bit mask selecting the ink or paper bits.
   * @param {number} displacement - Divisor that scales the masked bits down to a 0-7 index.
   * @returns {string} The resolved hex colour string.
   */
  static attrColor(attr, mask, displacement) {
    return this[this.colorsNames[(attr&64)/64*8+(attr&mask)/displacement]];
  } // attrColor

  /**
   * Returns the ink (pen) colour encoded in a ZX Spectrum attribute byte.
   * @param {number} attr - The Spectrum attribute byte.
   * @returns {string} The resolved ink hex colour string.
   */
  static penAttrColor(attr) {
    return this.attrColor(attr, 7, 1);
  } // penAttrColor

  /**
   * Returns the paper (background) colour encoded in a ZX Spectrum attribute byte.
   * @param {number} attr - The Spectrum attribute byte.
   * @returns {string} The resolved paper hex colour string.
   */
  static bkAttrColor(attr) {
    return this.attrColor(attr, 56, 8);
  } // bkAttrColor

} // ZXColor

ZXColor.black         = '#000000';
ZXColor.blue          = '#1435b2';
ZXColor.red           = '#b6391e';
ZXColor.magenta       = '#b442b4';
ZXColor.green         = '#41a329';
ZXColor.cyan          = '#4cb7a7';
ZXColor.yellow        = '#dcb533';
ZXColor.white         = '#b8b8b8';
ZXColor.brightBlack   = '#000000';
ZXColor.brightBlue    = '#1e48f7';
ZXColor.brightRed     = '#fc3b34';
ZXColor.brightMagenta = '#fb6ee9';
ZXColor.brightGreen   = '#53d734';
ZXColor.brightCyan    = '#4ddcfc';
ZXColor.brightYellow  = '#ffe15a';
ZXColor.brightWhite   = '#ffffff';

ZXColor.colorsNames = [
  'black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white',
  'brightBlack', 'brightBlue', 'brightRed', 'brightMagenta', 'brightGreen', 'brightCyan', 'brightYellow', 'brightWhite'
];

export default ZXColor;
