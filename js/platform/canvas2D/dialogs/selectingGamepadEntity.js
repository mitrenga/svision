const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { DialogProperties } = await import('./dialogProperties.js?ver='+window.srcVersion);
const { DialogTheme } = await import('./dialogTheme.js?ver='+window.srcVersion);
// begin code

/**
 * Modal entity that lists the currently connected gamepads and lets the
 * user select one via keyboard, mouse or touch, emitting a
 * changeSelectionGamepad event with the chosen device (R-056; the ZX
 * Spectrum wrapper is ZXSelectingGamepadEntity).
 *
 * Contents only, no frame: SettingsEntity opens it in a window
 * (DialogEntity, without a title) with the `selectingGamepad` part of the
 * dialog properties, whose `theme` colours it — the list rows are `penColor`
 * on `hoverColor`/`clickColor`, the selected one `selectionPenColor` on
 * `selectionColor` (`selectionHoverColor`/`selectionClickColor`) — and whose
 * `labelFont` they are in. A row is the font's height plus 4, the rows are a
 * pixel apart, and as many of them as the height holds (eight of 10 px in
 * the ZX dialog). Closing sends 'contentClosed' to the parent so the window
 * can close with it.
 */
export class SelectingGamepadEntity extends AbstractEntity {

  /**
   * Creates the gamepad selection entity and initialises its menu state and colours.
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} selectionGamepad - The id of the gamepad currently selected.
   * @param {Object} [properties] - The `selectingGamepad` dialog properties, see DialogProperties; the contents use its `theme`.
   */
  constructor(parentEntity, x, y, width, height, selectionGamepad, properties = {}) {
    properties = DialogProperties.merge(properties, 'selectingGamepad');
    super(parentEntity, x, y, width, height, false, properties.theme.bkColor);
    this.id = 'SelectingGamepadEntity';

    this.properties = properties;
    this.theme = properties.theme;
    this.selectionItem = 0;
    this.selectionGamepad = selectionGamepad;
    this.menuSelectionEntity = null;
    this.penMenuItemColor = this.theme.penColor;
    this.penSelectionMenuItemColor = this.theme.selectionPenColor;
    this.menuEntities = [];
    this.menuItems = [];
    this.hoverColor = this.theme.hoverColor;
    this.clickColor = this.theme.clickColor;
    this.hoverSelectionColor = this.theme.selectionHoverColor;
    this.clickSelectionColor = this.theme.selectionClickColor;
    this.rowHeight = 9;
    this.rowPitch = 10;
    this.rows = 8;
  } // constructor

  /**
   * The height of a window that shows `rows` gamepads in a font: the rows a
   * pixel apart inside a 1 px frame.
   * @param {Object} fonts - The label font.
   * @param {number} [rows] - 8 by default.
   * @returns {number} Pixels.
   */
  static windowHeight(fonts, rows = 8) {
    return 1+rows*(fonts.charsHeight+5)+1;
  } // windowHeight

  /**
   * Builds the selection highlight and the menu text rows, then populates
   * them with the connected gamepads.
   */
  init() {
    super.init();
    var fonts = DialogTheme.font(this.app, this.theme.labelFont);
    this.rowHeight = fonts.charsHeight+4;
    this.rowPitch = this.rowHeight+1;
    this.rows = Math.max(1, Math.floor((this.height-1)/this.rowPitch));

    this.menuSelectionEntity = new AbstractEntity(this, 1, 1+this.selectionItem*this.rowPitch, this.width-2, this.rowHeight, false, this.theme.selectionColor);
    this.addEntity(this.menuSelectionEntity);

    for (var y = 0; y < this.rows; y++) {
      this.menuEntities[y] = new TextEntity(this, fonts, 1, 1+y*this.rowPitch, this.width-2, this.rowHeight, '', false, false, {margin: 2});
      this.addEntity(this.menuEntities[y]);
    }
    this.setMenuItems();
  } // init

  /**
   * Closes the dialog: the contents go, and the parent is told so a window
   * can go with them.
   */
  close() {
    this.destroy();
    this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
  } // close

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
      this.close();
    }

    for (var y = 0; y < this.rows; y++) {
      this.menuEntities[y].hoverColor = false;
      this.menuEntities[y].clickColor = false;
      this.menuEntities[y].setPenColor(false);
      this.menuEntities[y].setText('');
    }
    this.menuItems = [];
    var y = 0;
    this.selectionItem = 0;
    for (var d = 0; d < connectedDevices.length && this.menuItems.length < this.rows; d++) {
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
    this.menuSelectionEntity.y = 1+this.selectionItem*this.rowPitch;
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
    this.menuSelectionEntity.y = 1+this.selectionItem*this.rowPitch;
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
            this.close();
            return true;
          case 'Escape':
            this.close();
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
                this.close();
                return true;
              }
              if (this.pointOnEntity(event) && this.app.inputEventsManager.keysMap.Mouse1 == this) {
                return true;
              }
              if (this.app.inputEventsManager.keysMap.Mouse1 === true) {
                this.close();
                return true;
              }
            }
            break;
          case 'Touch':
            for (var i = 0; i < this.menuItems.length; i++) {
              if (this.menuEntities[i].pointOnEntity(event) && this.app.inputEventsManager.touchesMap[event.identifier] == this.menuEntities[i]) {
                this.changeMenuItem(i);
                this.sendEvent(0, 0, {id: 'changeSelectionGamepad', selectionGamepad: this.selectionGamepad});
                this.close();
                return true;
              }
              if (this.pointOnEntity(event) && this.app.inputEventsManager.touchesMap[event.identifier] == this) {
                return true;
              }
              if (this.app.inputEventsManager.touchesMap[event.identifier] === true) {
                this.close();
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

} // SelectingGamepadEntity
