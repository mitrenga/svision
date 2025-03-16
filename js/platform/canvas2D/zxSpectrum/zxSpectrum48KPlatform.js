/**/
const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { AutoLayout } = await import('../autoLayout.js?ver='+window.srcVersion);
const { ZXBorderEntity } = await import('./zxBorderEntity.js?ver='+window.srcVersion);
/*/
import Canvas2DPlatform from '../canvas2DPlatform.js';
import AutoLayout from '../autoLayout.js';
import ZXBorderEntity from './zxBorderEntity.js';
/**/
// begin code

export class ZXSpectrum48KPlatform extends Canvas2DPlatform {
  
  constructor() {
    super();

    this.zxColorsName = [
      ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'],
      ['brightBlack', 'brightBlue', 'brightRed', 'brightMagenta', 'brightGreen', 'brightCyan', 'brightYellow', 'brightWhite']
    ]; // zxColorsName

    this.zxColorsRGB = {
      'black': '#000000',
      'blue': '#0100ce',
      'red': '#cf0100',
      'magenta': '#cf01ce',
      'green': '#00cf15',
      'cyan': '#01cfcf',
      'yellow': '#cfcf15',
      'white': '#cfcfcf',
      'brightBlack': '#000000',
      'brightBlue': '#0200fd',
      'brightRed': '#ff0201',
      'brightMagenta': '#ff02fd',
      'brightGreen': '#00ff1c',
      'brightCyan': '#02ffff',
      'brightYellow': '#ffff1d',
      'brightWhite': '#ffffff',
    }; // zxColorsRGB
  } // constructor

  platformName() {
    return 'ZX Spectrum 48K [HTML canvas 2D]';
  } // platformName

  defaultBorderEntity() {
    return new ZXBorderEntity();
  } // defaultBorderEntity

  defaultLayout(app) {
    return new AutoLayout(app);
  } // defaultLayout

  desktop(app) {
    return {'width': 256, 'height': 192, 'defaultColor': this.colorByName('white')};
  } // desktop

  border(app) {
    return {'minimal': 4, 'optimal': 10, 'defaultColor': this.colorByName('white')};
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
        return this.platformColorByName(this.zxColorsName[0][color]);
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
      case 13:
      case 14:
      case 15:
        return this.platformColorByName(this.zxColorsName[1][color-8]);
      }
    return false;
  } // color

  zxColorByAttribut(attr, mask, displacement) {
    return this.colorByName(this.zxColorsName[(attr & 64) / 64][(attr & mask) / displacement]);
  } // zxColorByAttribut

  penColorByAttribut(attr) {
    return this.zxColorByAttribut(attr, 7, 1);
  } // penColorByAttribut

  bkColorByAttribut(attr) {
    return this.zxColorByAttribut(attr, 56, 8);
  } // bkColorByAttribut

} // class ZXSpectrum48KPlatform

export default ZXSpectrum48KPlatform;
