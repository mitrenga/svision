/**/
const { BorderEntity } = await import('../../../borderEntity.js?ver='+window.srcVersion);
/*/
import BorderEntity from '../../../borderEntity.js';
/**/
// begin code

export class ZXBorderEntity  extends BorderEntity {

  constructor() {
    super();
    this.id = 'zxBorderEntity';

    this.diff = 0;
  } // constructor

  drawEntity() {
    super.drawEntity();
return;
    //var stripes = 25;
    var stripes = 50;
    var stripeHeight = Math.ceil((this.app.model.desktopHeight+2*this.app.model.borderHeight) / stripes);
    var y = 0;
    //var colors = ['cyan', 'red'];
    var colors = ['blue', 'yellow'];
    var color = 0;
    while (y < this.app.model.desktopHeight+2*this.app.model.borderHeight) {
      var extraStripe = 0;
      extraStripe = Math.round(Math.random()*stripeHeight);
      if (y+stripeHeight+extraStripe > this.app.model.desktopHeight+2*this.app.model.borderHeight) {
        stripeHeight = this.app.model.desktopHeight+2*this.app.model.borderHeight-y-extraStripe;
      }
      this.app.layout.paintRect(this.app.stack['ctx'], 0, y, this.app.model.desktopWidth+2*this.app.model.borderWidth, stripeHeight+extraStripe, this.app.platform.colorByName(colors[color]));
      y += stripeHeight+extraStripe;
      color = 1-color;
    }
  } // drawEntity

} // class ZXBorderEntity

export default ZXBorderEntity;
