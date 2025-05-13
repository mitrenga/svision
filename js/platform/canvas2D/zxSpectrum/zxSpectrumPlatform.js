/**/
const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { ZXSpectrumLayout } = await import('./zxSpectrumLayout.js?ver='+window.srcVersion);
const { ZXBorderEntity } = await import('./zxBorderEntity.js?ver='+window.srcVersion);
/*/
import Canvas2DPlatform from '../canvas2DPlatform.js';
import ZXSpectrumLayout from './zxSpectrumLayout.js';
import ZXBorderEntity from './zxBorderEntity.js';
/**/
// begin code

export class ZXSpectrumPlatform extends Canvas2DPlatform {
  
  constructor() {
    super();

    this.zxColorsName = [
      ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'],
      ['brightBlack', 'brightBlue', 'brightRed', 'brightMagenta', 'brightGreen', 'brightCyan', 'brightYellow', 'brightWhite']
    ]; // zxColorsName

    this.zxColorsRGB = {
      'black': '#000000',
      'blue': '#1435b2',
      'red': '#b6391e',
      'magenta': '#b442b4',
      'green': '#41a329',
      'cyan': '#4cb7a7',
      'yellow': '#dcb533',
      'white': '#b8b8b8',
      'brightBlack': '#000000',
      'brightBlue': '#1e48f7',
      'brightRed': '#fc3b34',
      'brightMagenta': '#fb6ee9',
      'brightGreen': '#53d734',
      'brightCyan': '#4ddcfc',
      'brightYellow': '#ffe15a',
      'brightWhite': '#ffffff',
    }; // zxColorsRGB
  } // constructor

  platformName() {
    return 'ZX Spectrum [HTML canvas 2D]';
  } // platformName

  defaultBorderEntity() {
    return new ZXBorderEntity();
  } // defaultBorderEntity

  defaultLayout(app) {
    return new ZXSpectrumLayout(app);
  } // defaultLayout

  desktop() {
    return {'width': 256, 'height': 192, 'defaultColor': this.colorByName('white')};
  } // desktop

  border() {
    return {'minimal': 8, 'defaultColor': this.colorByName('white')};
  } // border

  colorByName(colorName) {
    if (colorName in this.zxColorsRGB) {
      return this.zxColorsRGB[colorName];
    }
    return false;
  } // colorByName

  color(color) {
    switch (color) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        return this.colorByName(this.zxColorsName[0][color]);
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
      case 14:
      case 15:
        return this.colorByName(this.zxColorsName[1][color-8]);
      }
    return false;
  } // color

  zxColorByAttribute(attr, mask, displacement) {
    return this.colorByName(this.zxColorsName[(attr & 64) / 64][(attr & mask) / displacement]);
  } // zxColorByAttribute

  penColorByAttribute(attr) {
    return this.zxColorByAttribute(attr, 7, 1);
  } // penColorByAttribute

  bkColorByAttribute(attr) {
    return this.zxColorByAttribute(attr, 56, 8);
  } // bkColorByAttribute

} // class ZXSpectrumPlatform

export default ZXSpectrumPlatform;
