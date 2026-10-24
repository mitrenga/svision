const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { DialogProperties } = await import('./dialogProperties.js?ver='+window.srcVersion);
const { DialogTheme } = await import('./dialogTheme.js?ver='+window.srcVersion);
// begin code

/**
 * Dialog that walks the player through rebinding each action of a device
 * (keyboard, mouse or gamepad) one key at a time, then persists the new
 * bindings. A blinking cursor marks the action awaiting input (R-056; the
 * ZX Spectrum wrapper is ZXRemapKeysEntity).
 *
 * Contents only, no frame and no title: SettingsEntity opens it in a window
 * (DialogEntity) with the `remapKeys` part of the dialog properties, whose
 * `theme` colours it and gives it its fonts (`labelFont` for the rows,
 * `buttonFont` for SKIP and CLOSE). The layout is computed from the size
 * and the fonts: a row is the label font's height plus 4, the rows the
 * height plus 7 apart — or closer when the actions would otherwise run
 * into CLOSE — the labels two column gaps from the left, the values
 * (five characters wide) and SKIP at the right, CLOSE at the bottom right.
 * In 185 x 105 with the 5x5 font it is the ZX dialog as it was. The new
 * bindings go up to the owner as 'updateEntity' and 'refreshGamepadActions'
 * events; the window passes them through. Closing sends 'contentClosed' to
 * the parent so the window can close with it.
 */
export class RemapKeysEntity extends AbstractEntity {

  /**
   * Creates the remap dialog and initialises the new-bindings buffer and the table
   * of valid function keys per device type.
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {Object} options - Device definition with its name and list of remappable keys.
   * @param {Object} [properties] - The `remapKeys` dialog properties, see DialogProperties; the contents use its `theme`.
   */
  constructor(parentEntity, x, y, width, height, options, properties = {}) {
    properties = DialogProperties.merge(properties, 'remapKeys');
    super(parentEntity, x, y, width, height, false, properties.theme.bkColor);
    this.id = 'RemapKeysEntity';

    this.properties = properties;
    this.theme = properties.theme;
    this.options = options;
    this.newKeys = [];
    this.position = 0;
    this.labelFont = null;
    this.rowY = 9;
    this.rowPitch = 12;
    this.validFnKeys = {
      keyboard: ['NoKey', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Clear', 'Shift', 'Control', 'Meta', 'Alt'],
      mouse: ['NoKey', 'Mouse1', 'Mouse2', 'Mouse4', 'Mouse8', 'Mouse16', 'Mouse32', 'Mouse64', 'Mouse128'],
      gamepads: ['NoKey']
    };
  } // constructor

  /**
   * Builds the dialog contents: one label/value row per remappable key, the skip
   * button and the close button, and highlights the first action.
   */
  init() {
    super.init();
    var labelFont = this.labelFont = DialogTheme.font(this.app, this.theme.labelFont);
    var buttonFont = DialogTheme.font(this.app, this.theme.buttonFont);
    var gap = labelFont.charsHeight;
    var rowHeight = labelFont.charsHeight+4;
    var valuesWidth = DialogTheme.textWidth(labelFont, 'MMMMM')+4;
    var buttonHeight = buttonFont.charsHeight+8;
    var closeY = this.height-2-buttonHeight;
    var n = this.options.keys.length;
    this.rowY = gap+4;
    // the rows the height plus 7 apart, closer when they would run into CLOSE — down to the font plus 2
    this.rowPitch = rowHeight+3;
    if (n > 1) {
      this.rowPitch = Math.max(labelFont.charsHeight+2, Math.min(this.rowPitch, Math.floor((closeY-this.rowY-rowHeight)/(n-1))));
    }
    var skipX = this.width-gap-6-valuesWidth;
    var valuesX = skipX-7-valuesWidth;
    var labelsX = 2*gap;

    for (var k = 0; k < n; k++) {
      this.addEntity(new TextEntity(this, labelFont, labelsX, this.rowY+this.rowPitch*k, valuesX-gap-labelsX, rowHeight, this.options.keys[k].label, this.theme.penColor, false, {margin: 2}));
      this.addEntity(new TextEntity(this, labelFont, valuesX, this.rowY+this.rowPitch*k, valuesWidth, rowHeight, this.cursorText(), false, false, {align: 'center', margin: 2, hide: true, member: this.options.keys[k].action}));
    }
    this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[0].action, penColor: this.theme.selectionPenColor, bkColor: this.theme.selectionColor, text: this.cursorText(), hide: false});
    this.addEntity(new ButtonEntity(this, buttonFont, skipX, this.rowY, valuesWidth, rowHeight, 'SKIP', {id: 'skipKey'}, [], this.theme.buttonPenColor, this.theme.dangerButtonColor, {align: 'center', topMargin: Math.floor((rowHeight-buttonFont.charsHeight)/2), member: 'skipKey'}));

    var closeWidth = DialogTheme.textWidth(buttonFont, 'CLOSE')+10;
    this.addEntity(new ButtonEntity(this, buttonFont, this.width-2-closeWidth, closeY, closeWidth, buttonHeight, 'CLOSE', {id: 'closeRemapKeys'}, ['Escape', 'GamepadExit'], this.theme.buttonPenColor, this.theme.closeButtonColor, {align: 'center', topMargin: 4}));
  } // init

  /**
   * Closes the dialog: the contents go, and the parent is told so a window
   * can go with them.
   */
  close() {
    this.app.inputEventsManager.gamepadsConfig = false;
    this.destroy();
    this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
  } // close

  /**
   * Returns the blinking cursor glyph for the action currently awaiting input.
   * @returns {string} The cursor block character when the flash is on, otherwise an empty string.
   */
  cursorText() {
    var cursor = '';
    if (this.app.stack.flashState) {
      cursor = '█';
    }
    return cursor;
  } // cursorText

  /**
   * Handles the dialog's events: closing it, blinking the cursor, and capturing each
   * pressed (or skipped) key, advancing through the action list and saving when done.
   * @param {Object} event - The event object, including its id and key fields.
   * @returns {boolean} True if the event was handled.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {

      case 'closeRemapKeys':
        this.close();
        return true;

      case 'changeFlashState':
        if (this.position < this.options.keys.length) {
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[this.position].action, text: this.cursorText()});
        }
        break;

      case 'skipKey':
        event.key = 'NoKey';
      case 'keyPress':
        if (this.position >= this.options.keys.length) {
          break;
        }

        var newKey = false;
        if (event.key.length == 1) {
          if (this.options.device == 'keyboard' && this.labelFont.validChar(event.key.toUpperCase())) {
            newKey = event.key.toUpperCase();
          }
        } else if (this.isValidFnKeys(this.options.device, event.key)) {
          newKey = event.key;
        }
        if ((newKey !== false && this.newKeys.find((key) => key.key == newKey) === undefined) || newKey == 'NoKey') {
          this.newKeys.push({action: this.options.keys[this.position].action, key: newKey});
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[this.position].action, penColor: this.theme.valueColor, bkColor: false, text: Tool.prettyKey(newKey)});
          this.position++;
          if (this.position == this.options.keys.length) {
            this.saveKeys();
            this.close();
            return true;
          }
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[this.position].action, penColor: this.theme.selectionPenColor, bkColor: this.theme.selectionColor, text: this.cursorText(), hide: false});
          this.sendEvent(1, 0, {id: 'updateEntity', member: 'skipKey', y: this.rowY+this.rowPitch*this.position});
        }
        break;
    }

    return false;
  } // handleEvent

  /**
   * Persists the collected bindings for the active device, writing them into the
   * app's controls, saving cookies and (for gamepads) refreshing the gamepad
   * actions. The owner (SettingsEntity) learns of them through the events
   * sent up; the window between passes them through.
   */
  saveKeys() {
    switch (this.options.device) {

      case 'keyboard':
      case 'mouse':
        this.newKeys.forEach((newKey) => {
          this.sendEvent(-1, 0, {id: 'updateEntity', member: this.options.device+'.'+newKey.action, text: Tool.prettyKey(newKey.key)});
          this.app.controls[this.options.device][newKey.action] = newKey.key;
        });
        Tool.writeCookie(this.options.device, JSON.stringify(this.app.controls[this.options.device]));
        break;

      case 'gamepads':
        this.app.controls.gamepads.devices[this.app.inputEventsManager.gamepadsConfig] = {buttons: {}, axes: {}};
        var device = this.app.controls.gamepads.devices[this.app.inputEventsManager.gamepadsConfig];
        this.newKeys.forEach((newKey, k) => {
          if (newKey.key[0] == 'B') {
            device.buttons[newKey.key.substring(1)] = {action: newKey.action, event: this.options.keys[k].eventKey};
          }
          if (newKey.key[0] == 'A') {
            if (!(newKey.key.substring(1, newKey.key.length-1) in device.axes)) {
              device.axes[newKey.key.substring(1, newKey.key.length-1)] = {};
            }
            device.axes[newKey.key.substring(1, newKey.key.length-1)][newKey.key.substring(newKey.key.length-1)] = {action: newKey.action, event: this.options.keys[k].eventKey};
          }
        });
        var keys = Object.keys(this.app.controls.gamepads.devices);
        Tool.writeCookie('gamepads', JSON.stringify(keys));
        keys.forEach((id) => {
          Tool.writeCookie(id, JSON.stringify(this.app.controls.gamepads.devices[id]));
        });
        this.sendEvent(-1, 0, {id: 'refreshGamepadActions'});
        break;
    }
  } // saveKeys

  /**
   * Reports whether a key is an acceptable binding for the given device, including
   * gamepad button (B) and axis (A) codes and the device's whitelist of function keys.
   * @param {string} device - Device type ('keyboard', 'mouse' or 'gamepads').
   * @param {string} key - The candidate key identifier.
   * @returns {boolean} True if the key is valid for the device.
   */
  isValidFnKeys(device, key) {
    switch (device) {
      case 'gamepads':
        if (key.length > 1) {
          if (key[0] == 'B') {
            return true;
          }
          if (key[0] == 'A') {
            return true;
          }
        }
        break;
    }
    if (this.validFnKeys[device].indexOf(key) >= 0) {
      return true;
    }
    return false;
  } // isValidFnKeys

} // RemapKeysEntity
