/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
import ZXColor from './zxColor.js';
/**/
// begin code

/**
 * ZX Spectrum themed modal entity that lists the currently connected gamepads
 * and lets the user select one via keyboard, mouse or touch, emitting a
 * changeSelectionGamepad event with the chosen device.
 */
export class ZXSelectingGamepadEntity extends AbstractEntity {

  /**
   * Creates the gamepad selection entity and initialises its menu state and colours.
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} selectionGamepad - The id of the gamepad currently selected.
   */
  constructor(parentEntity, x, y, width, height, selectionGamepad) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXSelectingGamepadEntity';

    this.selectionItem = 0;
    this.selectionGamepad = selectionGamepad;
    this.menuSelectionEntity = null;
    this.penMenuItemColor = ZXColor.black;
    this.penSelectionMenuItemColor = ZXColor.brightWhite;
    this.menuEntities = [];
    this.menuItems = [];
    this.hoverColor = '#b1ab79ff';
    this.clickColor = '#939393ff';
    this.hoverSelectionColor = ZXColor.brightMagenta;
    this.clickSelectionColor = '#7a7a7aff';
  } // constructor

  /**
   * Builds the border, the selection highlight and the eight menu text rows,
   * then populates them with the connected gamepads.
   */
  init() {
    super.init();

    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, ZXColor.black));
    this.addEntity(new AbstractEntity(this, 1, 1, this.width-2, this.height-2, false, ZXColor.white));

    this.menuSelectionEntity = new AbstractEntity(this, 2, 2+this.selectionItem*8, this.width-4, 9, false, ZXColor.magenta);
    this.addEntity(this.menuSelectionEntity);

    for (var y = 0; y < 8; y++) {
      this.menuEntities[y] = new TextEntity(this, this.app.fonts.fonts5x5, 2, 2+y*10, this.width-4, 9, '', false, false, {margin: 2});
      this.addEntity(this.menuEntities[y]);
    }
    this.setMenuItems();
  } // init

  /**
   * Rebuilds the menu list from the currently connected gamepads, destroying the
   * entity if none are connected and highlighting the currently selected gamepad.
   */
  setMenuItems() {
    var connectedDevices = navigator.getGamepads();
    var isConnectedGamepad = false;
    for (var d = 0; d < connectedDevices.length && isConnectedGamepad == false; d++) {
      if (connectedDevices[d] != null) {
        isConnectedGamepad = true;
        break;
      }
    }
    if (!isConnectedGamepad) {
      this.destroy();
    }

    for (var y = 0; y < 8; y++) {
      this.menuEntities[y].hoverColor = false;
      this.menuEntities[y].clickColor = false;
      this.menuEntities[y].setPenColor(false);
      this.menuEntities[y].setText('');
    }
    this.menuItems = [];
    var y = 0;
    this.selectionItem = 0;
    for (var d = 0; d < connectedDevices.length && this.menuItems.length < 8; d++) {
      var connectedDevice = connectedDevices[d];
      if (connectedDevice != null) {
        this.menuItems.push(connectedDevice.id);
        this.menuEntities[y].hoverColor = this.hoverColor;
        this.menuEntities[y].clickColor = this.clickColor;
        this.menuEntities[y].setPenColor(this.penMenuItemColor);
        this.menuEntities[y].setText(this.menuItems[y]);
        if (connectedDevice.id == this.selectionGamepad) {
          this.selectionItem = y;
        }
        y++;
      }
    }
    this.menuEntities[this.selectionItem].hoverColor = this.hoverSelectionColor;
    this.menuEntities[this.selectionItem].clickColor = this.clickSelectionColor;
    this.menuEntities[this.selectionItem].setPenColor(this.penSelectionMenuItemColor);
    this.menuSelectionEntity.y = 2+this.selectionItem*10;
  } // setMenuItems

  /**
   * Moves the selection highlight to the given menu index and updates the
   * selected gamepad accordingly, ignoring out-of-range indices.
   * @param {number} newItem - The index of the menu item to select.
   */
  changeMenuItem(newItem) {
    if (newItem < 0 || newItem >= this.menuItems.length) {
      return;
    }
    this.menuEntities[this.selectionItem].setPenColor(this.penMenuItemColor);
    this.selectionItem = newItem;
    this.selectionGamepad = this.menuItems[this.selectionItem];
    this.menuEntities[this.selectionItem].setPenColor(this.penSelectionMenuItemColor);
    this.menuSelectionEntity.y = 2+this.selectionItem*10;
  } // changeMenuItem

  /**
   * Handles key, mouse and touch events to navigate, confirm or cancel the
   * gamepad selection, emitting changeSelectionGamepad on confirmation.
   * @param {Object} event - The event object, identified by its id property.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {

      case 'keyPress':
        switch (event.key) {
          case 'Enter':
            this.sendEvent(0, 0, {id: 'changeSelectionGamepad', selectionGamepad: this.selectionGamepad});
            this.destroy();
            return true;
          case 'Escape':
            this.destroy();
            return true;
          case 'ArrowDown':
            this.changeMenuItem(this.selectionItem+1);
            return true;
          case 'ArrowUp':
            this.changeMenuItem(this.selectionItem-1);
            return true;
          case 'Mouse1':
            for (var i = 0; i < this.menuItems.length; i++) {
              if (this.menuEntities[i].pointOnEntity(event)) {
                this.app.inputEventsManager.keysMap.Mouse1 = this.menuEntities[i];
                this.menuEntities[i].clickState = true;
                return true;
              }
            }
            if (this.pointOnEntity(event)) {
              this.app.inputEventsManager.keysMap.Mouse1 = this;
              return true;
            }
            this.app.inputEventsManager.keysMap.Mouse1 = true;
            return true;
          case 'Touch':
            for (var i = 0; i < this.menuItems.length; i++) {
              if (this.menuEntities[i].pointOnEntity(event)) {
                this.app.inputEventsManager.touchesMap[event.identifier] = this.menuEntities[i];
                this.menuEntities[i].clickState = true;
                return true;
              }
            }
            if (this.pointOnEntity(event)) {
              this.app.inputEventsManager.touchesMap[event.identifier] = this;
              return true;
            }
            this.app.inputEventsManager.touchesMap[event.identifier] = true;
            return true;
          }
        break;

      case 'keyRelease':
        switch (event.key) {
          case 'Mouse1':
            for (var i = 0; i < this.menuItems.length; i++) {
              if (this.menuEntities[i].pointOnEntity(event) && this.app.inputEventsManager.keysMap.Mouse1 == this.menuEntities[i]) {
                this.changeMenuItem(i);
                this.sendEvent(0, 0, {id: 'changeSelectionGamepad', selectionGamepad: this.selectionGamepad});
                this.destroy();
                return true;
              }
              if (this.pointOnEntity(event) && this.app.inputEventsManager.keysMap.Mouse1 == this) {
                return true;
              }
              if (this.app.inputEventsManager.keysMap.Mouse1 === true) {
                this.destroy();
                return true;
              }
            }
            break;
          case 'Touch':
            for (var i = 0; i < this.menuItems.length; i++) {
              if (this.menuEntities[i].pointOnEntity(event) && this.app.inputEventsManager.touchesMap[event.identifier] == this.menuEntities[i]) {
                this.changeMenuItem(i);
                this.sendEvent(0, 0, {id: 'changeSelectionGamepad', selectionGamepad: this.selectionGamepad});
                this.destroy();
                return true;
              }
              if (this.pointOnEntity(event) && this.app.inputEventsManager.touchesMap[event.identifier] == this) {
                return true;
              }
              if (this.app.inputEventsManager.touchesMap[event.identifier] === true) {
                this.destroy();
                return true;
              }
            }
            break;
        }
    }

    return false;
  } // handleEvent

  /**
   * Per-frame update that detects changes in the connected gamepads and
   * rebuilds the menu list when the set of devices has changed.
   * @param {number} timestamp - The current frame timestamp in milliseconds.
   */
  loopEntity(timestamp) {
    var connectedDevices = navigator.getGamepads();
    var y = 0;
    for (var d = 0; d < connectedDevices.length; d++) {
      var connectedDevice = connectedDevices[d];
      if (connectedDevice != null) {
        if (y == this.menuItems.length) {
          this.setMenuItems();
          break;
        }
        if (connectedDevice.id != this.menuItems[y]) {
          this.setMenuItems();
          break;
        }
        y++;
      }
    }
    if (y != this.menuItems.length) {
      this.setMenuItems();
    }
  } // loopEntity

} // ZXSelectingGamepadEntity

export default ZXSelectingGamepadEntity;
