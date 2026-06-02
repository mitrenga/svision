/**/

/*/

/**/
// begin code

export class ZXColor {

  static black         = '#000000';
  static blue          = '#1435b2';
  static red           = '#b6391e';
  static magenta       = '#b442b4';
  static green         = '#41a329';
  static cyan          = '#4cb7a7';
  static yellow        = '#dcb533';
  static white         = '#b8b8b8';
  static brightBlack   = '#000000';
  static brightBlue    = '#1e48f7';
  static brightRed     = '#fc3b34';
  static brightMagenta = '#fb6ee9';
  static brightGreen   = '#53d734';
  static brightCyan    = '#4ddcfc';
  static brightYellow  = '#ffe15a';
  static brightWhite   = '#ffffff';

  static colorsNames = [
    'black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white',
    'brightBlack', 'brightBlue', 'brightRed', 'brightMagenta', 'brightGreen', 'brightCyan', 'brightYellow', 'brightWhite'
  ];

  static color(color) {
    if (color >= 0 && color < 16) {
      return this[this.colorsNames[color]];
    }
    return false;
  } // color

  static attrColor(attr, mask, displacement) {
    return this[this.colorsNames[(attr&64)/64*8+(attr&mask)/displacement]];
  } // attrColor

  static penAttrColor(attr) {
    return this.attrColor(attr, 7, 1);
  } // penAttrColor

  static bkAttrColor(attr) {
    return this.attrColor(attr, 56, 8);
  } // bkAttrColor

} // ZXColor

export default ZXColor;
