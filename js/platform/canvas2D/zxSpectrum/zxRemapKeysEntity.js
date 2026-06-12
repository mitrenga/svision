/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import ButtonEntity from '../buttonEntity.js';
import TextEntity from '../textEntity.js';
import Tool from '../../../tool.js';
import ZXColor from './zxColor.js';
/**/
// begin code

/**
 * ZX Spectrum themed dialog that walks the player through rebinding each action of
 * a device (keyboard, mouse or gamepad) one key at a time, then persists the new
 * bindings. A blinking cursor marks the action awaiting input.
 */
export class ZXRemapKeysEntity extends AbstractEntity {

  /**
   * Creates the remap dialog and initialises the new-bindings buffer and the table
   * of valid function keys per device type.
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {Object} options - Device definition with its name and list of remappable keys.
   */
  constructor(parentEntity, x, y, width, height, options) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXRemapKeysEntity';

    this.options = options;
    this.newKeys = [];
    this.position = 0;
    this.validFnKeys = {
      keyboard: ['NoKey', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Delete', 'Clear', 'Shift', 'Control', 'Meta', 'Alt'],
      mouse: ['NoKey', 'Mouse1', 'Mouse2', 'Mouse4', 'Mouse8', 'Mouse16', 'Mouse32', 'Mouse64', 'Mouse128'],
      gamepads: ['NoKey']
    };
  } // constructor

  /**
   * Builds the dialog contents: the framed background, title, one label/value row per
   * remappable key, the skip button and the close button, and highlights the first action.
   */
  init() {
    super.init();

    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, ZXColor.black));
    this.addEntity(new AbstractEntity(this, 1, 1, this.width-2, this.height-2, false, ZXColor.white));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 0, this.width, 9, 'REMAP '+this.options.device+' KEYS', ZXColor.brightWhite, ZXColor.black, {align: 'center', margin: 2}));

    for (var k = 0; k < this.options.keys.length; k++) {
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 11, 18+12*k, 74, 9, this.options.keys[k].label, ZXColor.black, false, {margin: 2}));
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.width-83, 18+12*k, 32, 9, this.cursorText(), false, false, {align: 'center', margin: 2, hide: true, member: this.options.keys[k].action}));
    }
    this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[0].action, penColor: ZXColor.brightWhite, bkColor: ZXColor.brightBlue, text: this.cursorText(), hide: false});
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-44, 18, 32, 9, 'SKIP', {id: 'skipKey'}, [], ZXColor.brightWhite, ZXColor.red, {align: 'center', margin: 2, member: 'skipKey'}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-39, this.height-16, 36, 13, 'CLOSE', {id: 'closeZXRemapKeys'}, ['Escape', 'GamepadExit'], ZXColor.brightWhite, ZXColor.blue, {align: 'center', margin: 4}));
  } // init

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

      case 'closeZXRemapKeys':
        this.app.inputEventsManager.gamepadsConfig = false;
        this.destroy();
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
          if (this.options.device == 'keyboard' && event.key.toUpperCase() in this.app.fonts.fonts5x5.fontsData) {
            newKey = event.key.toUpperCase();
          }
        } else if (this.isValidFnKeys(this.options.device, event.key)) {
          newKey = event.key;
        }
        if ((newKey !== false && this.newKeys.find((key) => key.key == newKey) === undefined) || newKey == 'NoKey') {
          this.newKeys.push({action: this.options.keys[this.position].action, key: newKey});
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[this.position].action, penColor: ZXColor.brightBlue, bkColor: false, text: Tool.prettyKey(newKey)});
          this.position++;
          if (this.position == this.options.keys.length) {
            this.saveKeys();
            this.app.inputEventsManager.gamepadsConfig = false;
            this.destroy();
            return true;
          }
          this.sendEvent(1, 0, {id: 'updateEntity', member: this.options.keys[this.position].action, penColor: ZXColor.brightWhite, bkColor: ZXColor.brightBlue, text: this.cursorText(), hide: false});
          this.sendEvent(1, 0, {id: 'updateEntity', member: 'skipKey', y: 18+12*this.position});
        }
        break;
    }

    return false;
  } // handleEvent

  /**
   * Persists the collected bindings for the active device, writing them into the
   * app's controls, saving cookies and (for gamepads) refreshing the gamepad actions.
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

} // ZXRemapKeysEntity

export default ZXRemapKeysEntity;
