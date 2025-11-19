/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
/**/
// begin code

export class ZXSelectingGamepadEntity extends AbstractEntity {

  constructor(parentEntity, x, y, width, height, selectedGamepad) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXSelectingGamepadEntity';

    this.selectedItem = 0;
    this.selectedGamepad = selectedGamepad;
    this.menuSelectedRow = null;
    this.penMenuItemColor = this.app.platform.colorByName('black');
    this.penSelectedMenuItemColor = this.app.platform.colorByName('brightWhite');
    this.menuEntities = [];
    this.menuItems = [];
  } // constructor

  init() {
    super.init();

    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, this.app.platform.colorByName('black')));
    this.addEntity(new AbstractEntity(this, 1, 1, this.width-2, this.height-2, false, this.app.platform.colorByName('white')));

    this.menuSelectedRow = new AbstractEntity(this, 2, 2+this.selectedItem*8, this.width-4, 7, false, this.app.platform.colorByName('magenta'));
    this.addEntity(this.menuSelectedRow);

    for (var y = 0; y < 8; y++) {
      this.menuEntities[y] = new TextEntity(this, this.app.fonts.fonts5x5, 2, 2+y*8, this.width-4, 9, '', false, false, {margin: 1});
      this.addEntity(this.menuEntities[y]);
    }
    this.setMenuItems();s
  } // init

  setMenuItems() {
    if (!Object.keys(this.app.inputEventsManager.gamepads).length) {
      this.destroy();
    }

    for (var y = 0; y < 8; y++) {
      this.menuEntities[y].setPenColor(false);
      this.menuEntities[y].setText('');
    }
    this.menuItems = [];
    for (var y = 0; y < Object.keys(this.app.inputEventsManager.gamepads).length && y < 8; y++) {
      this.menuItems.push(Object.keys(this.app.inputEventsManager.gamepads)[y]);
      this.menuEntities[y].setPenColor(this.penMenuItemColor);
      this.menuEntities[y].setText(this.menuItems[y].toUpperCase());
    }
    this.selectedItem = 0;
    for (var y = 0; y < this.menuItems.length; y++) {
      if (this.selectedGamepad == this.menuItems[y]) {
        this.selectedItem = y;
        break;
      }
    }
    this.menuEntities[this.selectedItem].setPenColor(this.penSelectedMenuItemColor);
    this.menuSelectedRow.y = 2+this.selectedItem*8;
  } // setMenuItems

  changeMenuItem(newItem) {
    if (newItem < 0 || newItem >= this.menuItems.length) {
      return;
    }
    this.menuEntities[this.selectedItem].setPenColor(this.penMenuItemColor);
    this.selectedItem = newItem;
    this.selectedGamepad = this.menuItems[this.selectedItem];
    this.menuEntities[this.selectedItem].setPenColor(this.penSelectedMenuItemColor);
    this.menuSelectedRow.y = 2+this.selectedItem*8;
  } // changeMenuItem

  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) { 

      case 'keyPress':
        switch (event.key) {
          case 'Enter':
            this.sendEvent(0, 0, {id: 'changeSelectedGamepad', selectedGamepad: this.selectedGamepad});
            this.destroy();
            return true;
          case 'Escape':
            this.destroy();
            return true;
          case 'ArrowDown':
            this.changeMenuItem(this.selectedItem+1);
            return true;
          case 'ArrowUp':
            this.changeMenuItem(this.selectedItem-1);
            return true;
          }
        break;

      case 'mouseClick':
        if (event.key == 'left') {
          for (var i = 0; i < this.menuItems.length; i++) {
            if (this.menuEntities[i].pointOnEntity(event)) {
              this.changeMenuItem(i);
              this.sendEvent(0, 0, {id: 'changeSelectedGamepad', selectedGamepad: this.selectedGamepad});
              this.destroy();
              return true;
            }
          }
          if (this.pointOnEntity(event)) {
            return true;
          }
          this.destroy();
          return true;
        }
        break;

      case 'gamepadConnected':
      case 'gamepadDisconnected':
        this.setMenuItems();
        break;
    }

    return false;
  } // handleEvent

} // ZXSelectingGamepadEntity

export default ZXSelectingGamepadEntity;
