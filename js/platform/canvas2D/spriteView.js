/**/
const { AbstractView } = await import('../../abstractView.js?ver='+window.srcVersion);
/*/
import AbstractView from '../../abstractView.js';
/**/
// begin code

export class SpriteView  extends AbstractView {

  constructor(parentView, x, y, width, height, spriteData, penColor, bkColor) {
    super(parentView, x, y, width, height, penColor, false);
    this.id = 'SpriteView';

    this.spriteData = spriteData;
    this.bkSpriteColor = bkColor;
  } // constructor

  drawView() {
    super.drawView();
  
    if (this.bkSpriteColor !== false) {
      this.app.layout.paint(0, 0, this.width, this.height, this.bkSpriteColor);
    }

    this.spriteData.forEach((pixel) => {
      var color = this.penColor;
      if ('penColor' in pixel) {
        color = pixel['color'];
      }
      this.app.layout.paint(this, pixel['x'], pixel['y'], 1, 1, color);
    });  
  } // draView

} // class SpriteView

export default SpriteView;
