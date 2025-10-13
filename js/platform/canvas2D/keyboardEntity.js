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

    var layouts = Object.keys(this.layout.keymap);
    layouts.forEach((layoutId) => {
      var y = 0;
      for (var row = 0; row < this.layout.keymap[layoutId].length; row++) {
        var x = this.layout.options.rows[row].shiftX;
        for (var key = 0; key < this.layout.keymap[layoutId][row].length; key++) {
          var options = {...this.layout.options.buttons.default};
          if (this.layout.keymap[layoutId][row][key] in this.layout.options.buttons) {
            Object.keys(this.layout.options.buttons[this.layout.keymap[layoutId][row][key]]).forEach(option => {
              options[option] = this.layout.options.buttons[this.layout.keymap[layoutId][row][key]][option];
            });
          }
          var eventPrefix = 'blankKey';
          if (this.layout.keymap[layoutId][row][key] in this.layout.options.shiftKeys) {
            eventPrefix = 'shiftKey';
          } else if (!(this.layout.keymap[layoutId][row][key] in this.layout.options.fnKeys)) {
            eventPrefix = 'virtualKey';
          } else if (this.layout.options.fnKeys[this.layout.keymap[layoutId][row][key]] !== false) {
            eventPrefix = 'fnKey';
          }

          var label = false;
          if (this.layout.keymap[layoutId][row][key] in this.layout.options.buttons) {
            label = this.layout.options.buttons[this.layout.keymap[layoutId][row][key]].label || this.layout.keymap[layoutId][row][key];
          }
          if (eventPrefix == 'blankKey') {
            label = '';
          }

          if (label === false) {
            label = this.layout.keymap[layoutId][row][key];
          }

          var penColor = options.penColor;
          var bkColor = options.bkColor;
          if (layoutId == this.layout.keymap[layoutId][row][key] && this.layout.keymap[layoutId][row][key] in this.layout.options.shiftKeys) {
            penColor = this.layout.options.shiftKeys[this.layout.keymap[layoutId][row][key]].penColor || penColor; 
            bkColor = this.layout.options.shiftKeys[this.layout.keymap[layoutId][row][key]].activeBkColor || bkColor;
          }

          var keyEntity = new ButtonEntity(
            this, options.fonts, x, y, options.width, options.height, label,
            eventPrefix+this.layout.keymap[layoutId][row][key], [],
            penColor, bkColor, options
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

    if (event.id.substr(0, 8) == 'blankKey') {
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

    if (event.id.substr(0, 10) == 'virtualKey') {
      this.sendEvent(-1, 0, {'id': 'keyPress', 'key': event.id.substr(10, 1)});
      return true;
    }

    if (event.id.substr(0, 5) == 'fnKey') {
      this.sendEvent(-1, 0, {'id': 'keyPress', 'key': this.layout.options.fnKeys[event.id.substr(5)]});
      return true;
    }

    return false;
  } // handleEvent

} // class KeyboardEntity

export default KeyboardEntity;
