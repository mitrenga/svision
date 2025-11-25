/**/
const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { ZXSpectrumLayout } = await import('./zxSpectrumLayout.js?ver='+window.srcVersion);
/*/
import Canvas2DPlatform from '../canvas2DPlatform.js';
import ZXSpectrumLayout from './zxSpectrumLayout.js';
/**/
// begin code

export class ZXSpectrumPlatform extends Canvas2DPlatform {
  
  constructor() {
    super();

    this.zxColorsName = [
      ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'],
      ['brightBlack', 'brightBlue', 'brightRed', 'brightMagenta', 'brightGreen', 'brightCyan', 'brightYellow', 'brightWhite']
    ]; // zxColorsName

    this.zxColors = {
      black: '#000000',
      blue: '#1435b2',
      red: '#b6391e',
      magenta: '#b442b4',
      green: '#41a329',
      cyan: '#4cb7a7',
      yellow: '#dcb533',
      white: '#b8b8b8',
      brightBlack: '#000000',
      brightBlue: '#1e48f7',
      brightRed: '#fc3b34',
      brightMagenta: '#fb6ee9',
      brightGreen: '#53d734',
      brightCyan: '#4ddcfc',
      brightYellow: '#ffe15a',
      brightWhite: '#ffffff',
    };
  } // constructor

  platformName() {
    return 'ZX Spectrum [HTML canvas 2D]';
  } // platformName

  initCanvasElement(app, parentElementID) {
    super.initCanvasElement(app, parentElementID);
    
    app.stack.flashState = false;
    var buttonClickColor = '#7a7a7aff';
    app.stack.ButtonEntity = {clickColor: {}, hoverColor: {}};
    app.stack.ButtonEntity.clickColor[this.colorByName('black')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('blue')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('red')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('magenta')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('green')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('cyan')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('yellow')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('white')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('brightBlack')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('brightBlue')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('brightRed')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('brightMagenta')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('brightGreen')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('brightCyan')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('brightYellow')] = buttonClickColor;
    app.stack.ButtonEntity.clickColor[this.colorByName('brightWhite')] = buttonClickColor;
    app.stack.ButtonEntity.hoverColor[this.colorByName('black')] = '#3d3d3dff';
    app.stack.ButtonEntity.hoverColor[this.colorByName('blue')] = this.colorByName('brightBlue');
    app.stack.ButtonEntity.hoverColor[this.colorByName('red')] = this.colorByName('brightRed');
    app.stack.ButtonEntity.hoverColor[this.colorByName('magenta')] = this.colorByName('brightMagenta');
    app.stack.ButtonEntity.hoverColor[this.colorByName('green')] = this.colorByName('brightGreen');
    app.stack.ButtonEntity.hoverColor[this.colorByName('cyan')] = this.colorByName('brightCyan');
    app.stack.ButtonEntity.hoverColor[this.colorByName('yellow')] = this.colorByName('brightYellow');
    app.stack.ButtonEntity.hoverColor[this.colorByName('white')] = this.colorByName('brightWhite');
    app.stack.ButtonEntity.hoverColor[this.colorByName('brightBlack')] = '#3d3d3dff';
    app.stack.ButtonEntity.hoverColor[this.colorByName('brightBlue')] = this.colorByName('blue');
    app.stack.ButtonEntity.hoverColor[this.colorByName('brightRed')] = this.colorByName('red');
    app.stack.ButtonEntity.hoverColor[this.colorByName('brightMagenta')] = this.colorByName('magenta');
    app.stack.ButtonEntity.hoverColor[this.colorByName('brightGreen')] = this.colorByName('green');
    app.stack.ButtonEntity.hoverColor[this.colorByName('brightCyan')] = this.colorByName('cyan');
    app.stack.ButtonEntity.hoverColor[this.colorByName('brightYellow')] = this.colorByName('yellow');
    app.stack.ButtonEntity.hoverColor[this.colorByName('brightWhite')] = this.colorByName('white');
  } // initCanvasElement

  newLayout(app) {
    return new ZXSpectrumLayout(app);
  } // newLayout

  desktop(app) {
    return {width: 256, height: 192, defaultColor: this.colorByName('white')};
  } // desktop

  border(app) {
    return {minimal: 8, defaultColor: this.colorByName('white')};
  } // border

  colorByName(colorName) {
    if (colorName in this.zxColors) {
      return this.zxColors[colorName];
    }
    return false;
  } // colorByName

  color(color) {
    if (color >= 0 && color < 8) {
      return this.colorByName(this.zxColorsName[0][color]);
    }
    if (color > 7 && color < 16) {
      return this.colorByName(this.zxColorsName[1][color-8]);
    }
    return false;
  } // color

  zxColorByAttr(attr, mask, displacement) {
    return this.colorByName(this.zxColorsName[(attr & 64) / 64][(attr & mask) / displacement]);
  } // zxColorByAttr

  penColorByAttr(attr) {
    return this.zxColorByAttr(attr, 7, 1);
  } // penColorByAttr

  bkColorByAttr(attr) {
    return this.zxColorByAttr(attr, 56, 8);
  } // bkColorByAttr

} // ZXSpectrumPlatform

export default ZXSpectrumPlatform;
