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
    this.animation = false;
    this.stripes = [];
    this.style = {
      'pilotTone': {'colors': ['cyan', 'red'], 'stripeHeight': 10},
      'dataTone': {'colors': ['blue', 'yellow'], 'stripeHeight': 3}
    };

  } // constructor

  drawEntity() {
    super.drawEntity();
    if (this.animation === false) {
      return;
    }

    var y = 0;
    var color = Math.floor(this.diff/10);
    if (this.stripes.length == 0) {
      while (y < this.height) {
        var stripeHeight = this.style[this.animation]['stripeHeight'];
        if ((y == 0) && (this.animation == 'pilotTone')) {
          stripeHeight = 10-this.diff%10;
        }
        var extraStripe = 0;
        if (this.animation == 'dataTone') {
          extraStripe = Math.round(Math.random()*stripeHeight);
        }
        if (y+stripeHeight+extraStripe > this.height) {
          stripeHeight = this.height-y-extraStripe;
        }
        this.stripes.push({'y': y, 'height': stripeHeight+extraStripe, 'color': this.app.platform.colorByName(this.style[this.animation]['colors'][color])});
        y += stripeHeight+extraStripe;
        color = 1-color;
      }
    }
    for (var s = 0; s < this.stripes.length; s++) {
      this.app.layout.paintRect(this.app.stack['ctx'], 0, this.stripes[s]['y'], this.width, this.stripes[s]['height'], this.stripes[s]['color']);
    }
  } // drawEntity

  handleEvent(event) {
    switch (event['id']) {
      case 'setBorderAnimation':
        this.animation = event['value'];
        if (this.animation === 'pilotTone') {
          this.sendEvent(0, 50, {'id': 'moveStripes'});
        }
        return true;
      case 'moveStripes':
        this.stripes = [];
        this.diff = this.app.rotateInc(this.diff, 0, 19);
        if (this.animation !== false) {
          this.sendEvent(0, 50, {'id': 'moveStripes'});
        }
        return true;
    }

    return super.handleEvent(event);
  } // handleEvent

} // class ZXBorderEntity

export default ZXBorderEntity;
