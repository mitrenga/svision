/**/
const { AbstractView } = await import('../../../abstractView.js?ver='+window.srcVersion);
/*/
import AbstractView from '../../../abstractView.js';
/**/
// begin code

export class ZXVideoBufferView extends AbstractView {

  constructor(parentView, x, y, width, height, bufferData, bufferAttributes) {
    super(parentView, x, y, width, height);
    this.id = 'ZXVideoBufferView';
    this.penColor = this.color('black');
    this.bkColor = false;

    this.bufferData = bufferData;
    this.bufferAttributes = bufferAttributes;
  } // constructor

  drawView() {
    super.drawView();

    for (var y = 0; y < this.bufferData.length; y++) {
      for (var x = 0; x < this.bufferData[y].length/2; x++) {
        var hexByte = this.bufferData[y].substring(x*2, x*2+2);
        var binByte = this.hexToBin(hexByte);
        var attr = this.hexToInt(this.bufferAttributes[(y%8)+Math.floor(y/64)*8].substring(x*2, x*2+2));
        for (var b = 0; b < binByte.length; b++) {
          if (binByte[b] == '1') {
            this.paint(x*8+b, (y%8)*8+Math.floor(y%64/8)+Math.floor(y/64)*64, 1, 1, this.penColorByAttribut(attr));
          } else {
            this.paint(x*8+b, (y%8)*8+Math.floor(y%64/8)+Math.floor(y/64)*64, 1, 1, this.bkColorByAttribut(attr));
          }
        }
      }
    }
  } // drawView

} // class ZXVideoBufferView

export default ZXVideoBufferView;
