/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('./buttonEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
import ButtonEntity from './buttonEntity.js';
/**/
// begin code

export class KeyboardEntity extends AbstractEntity {

  constructor(parentEntity, fonts, x, y, width, height, layout, bkColor) {
    super(parentEntity, x, y, width, height, false, bkColor);
    this.id = 'KeyboardEntity';

    this.fonts = fonts;
    this.layout = layout;
  } // constructor

  init() {
    super.init();

    var y = 0;
    for (var row = 0; row < this.layout.keys[0].length; row++) {
      var x = this.layout.options.rows[row].shift;
      for (var key = 0; key < this.layout.keys[0][row].length; key++) {
        var w = this.layout.options.buttons.default.width;
        if (this.layout.keys[0][row][key] in this.layout.options.buttons) {
          if ('width' in this.layout.options.buttons[this.layout.keys[0][row][key]]) {
            w = this.layout.options.buttons[this.layout.keys[0][row][key]].width;
          }
        } 
        var h = this.layout.options.buttons.default.height;
        if (this.layout.keys[0][row][key] in this.layout.options.buttons) {
          if ('height' in this.layout.options.buttons[this.layout.keys[0][row][key]]) {
            h = this.layout.options.buttons[this.layout.keys[0][row][key]].height;
          }
        }
        var s = this.layout.options.buttons.default.space;
        if (this.layout.keys[0][row][key] in this.layout.options.buttons) {
          if ('space' in this.layout.options.buttons[this.layout.keys[0][row][key]]) {
            s = this.layout.options.buttons[this.layout.keys[0][row][key]].space;
          }
        }
        this.addEntity(new ButtonEntity(this, this.fonts, x, y, w, h, this.layout.keys[0][row][key], 'virtualKey'+this.layout.keys[0][row][key], [], this.app.platform.colorByName('black'), this.app.platform.colorByName('brightWhite'), {align: 'center', margin: 4}));
        x += w + s;
      }
      y += h + this.layout.options.buttons.default.space;
    }
  } // init

  handleEvent(event) {
    var result = super.handleEvent(event);
    if (result == true) {
      return true;
    }

    if (event.id.substr(0, 10) == 'virtualKey') {
      if (this.fonts.validChar(event.id.substr(10, 1))) {
        this.sendEvent(-1, 0, {'id': 'keyPress', 'key': event.id.substr(10, 1)});
        return true;
      }
    }
    return false;
  } // handleEvent

} // class KeyboardEntity

export default KeyboardEntity;
