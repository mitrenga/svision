/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('./buttonEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
import ButtonEntity from './buttonEntity.js';
/**/
// begin code

export class KeyboardEntity extends AbstractEntity {

  constructor(parentEntity, x, y, width, height, layout, bkColor) {
    super(parentEntity, x, y, width, height, false, bkColor);
    this.id = 'KeyboardEntity';

    this.layout = layout;
    this.shiftLayout = ' ';
  } // constructor

  init() {
    super.init();

    var layouts = Object.keys(this.layout.keys);
    layouts.forEach((layoutId) => {
      var y = 0;
      for (var row = 0; row < this.layout.keys[layoutId].length; row++) {
        var x = this.layout.options.rows[row].shift;
        for (var key = 0; key < this.layout.keys[layoutId][row].length; key++) {
          var options = {...this.layout.options.buttons.default};
          if (this.layout.keys[layoutId][row][key] in this.layout.options.buttons) {
            Object.keys(this.layout.options.buttons[this.layout.keys[layoutId][row][key]]).forEach(option => {
              options[option] = this.layout.options.buttons[this.layout.keys[layoutId][row][key]][option];
            });
          }
          var eventPrefix = 'virtualKey';
          if (layouts.indexOf(this.layout.keys[layoutId][row][key]) > 0) {
            eventPrefix = 'shiftKey';
          }

          var keyEntity = new ButtonEntity(
            this, options.fonts, x, y, options.width, options.height,
            this.layout.keys[layoutId][row][key],
            eventPrefix+this.layout.keys[layoutId][row][key], [],
            options.penColor, options.bkColor, options
          ); 
          keyEntity.group = layoutId;
          if (layoutId != ' ') {
            keyEntity.hide = true;
          }
          this.addEntity(keyEntity);
          x += options.width + options.keySpacing;
        }
        y += options.height + this.layout.options.buttons.default.keySpacing;
      }
    });
  } // init

  handleEvent(event) {
    var result = super.handleEvent(event);
    if (result == true) {
      return true;
    }

    if (event.id.substr(0, 10) == 'virtualKey') {
      this.sendEvent(-1, 0, {'id': 'keyPress', 'key': event.id.substr(10, 1)});
      return true;
    }

    if (event.id.substr(0, 8) == 'shiftKey') {
      var shiftKey = event.id.substr(8,1);
      if (this.shiftLayout == shiftKey) {
        this.shiftLayout = ' ';
      } else {
        this.shiftLayout = shiftKey;
      }
      this.entities.forEach ((entity) => {
        if (entity.group.length) {
          if (entity.group == this.shiftLayout) {
            entity.hide = false;
          } else {
            entity.hide = true;
          }
        }
      });
      return true;
    }

    return false;
  } // handleEvent

} // class KeyboardEntity

export default KeyboardEntity;
