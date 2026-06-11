/**/

/*/

/**/
// begin code

export class ZXColor {

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
