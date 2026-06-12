/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { SlidingTextEntity } = await import('../slidingTextEntity.js?ver='+window.srcVersion);
const { SpriteEntity } = await import('../spriteEntity.js?ver='+window.srcVersion);
const { SpriteTool } = await import('../../../spriteTool.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { ZXRemapKeysEntity } = await import('./zxRemapKeysEntity.js?ver='+window.srcVersion);
const { ZXSelectingGamepadEntity } = await import('./zxSelectingGamepadEntity.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
import SlidingTextEntity from '../slidingTextEntity.js';
import SpriteEntity from '../spriteEntity.js';
import SpriteTool from '../../../spriteTool.js';
import ButtonEntity from '../buttonEntity.js';
import ZXRemapKeysEntity from './zxRemapKeysEntity.js';
import ZXSelectingGamepadEntity from './zxSelectingGamepadEntity.js';
import Tool from '../../../tool.js';
import ZXColor from './zxColor.js';
/**/
// begin code

/**
 * ZX Spectrum themed control-settings panel. Lets the player choose an input
 * device (keyboard, mouse, gamepad, touchscreen), view its current key bindings
 * and launch the relevant remap/configuration dialogs.
 */
export class ZXControlsEntity extends AbstractEntity {

  /**
   * Creates the controls panel and initialises device selection state and palette.
   * @param {AbstractEntity} parentEntity - The parent entity that owns this panel.
   * @param {number} x - X position of the panel.
   * @param {number} y - Y position of the panel.
   * @param {number} width - Panel width.
   * @param {number} height - Panel height.
   * @param {Object} options - Per-device key/option definitions used to build the UI.
   */
  constructor(parentEntity, x, y, width, height, options) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXControlsEntity';

    this.options = options;
    this.selectionDevice = 0;
    this.devicesSelectionEntity = null;
    this.penDeviceColor = ZXColor.black;
    this.penSelectionDeviceColor = ZXColor.brightWhite;
    this.devicesEntities = [];

    this.devices = [
      {label: 'KEYBOARD', type: 'keyboard'},
      {label: 'MOUSE', type: 'mouse'},
      {label: 'GAMEPAD', type: 'gamepad'},
      {label: 'TOUCHSCREEN', type: 'touchscreen'}
    ];

    this.deviceHoverColor = '#b1ab79ff';
    this.deviceClickColor = '#939393ff';

    this.selectionGamepad = false;
    this.checkSelectionGamepad();

    this.controlsEntites = {};
  } // constructor

  /**
   * Builds all child entities of the panel: the device list, separators, and the
   * device-specific option rows and buttons for keyboard, mouse, gamepad and touchscreen.
   */
  init() {
    super.init();
    
    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, ZXColor.black));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 0, this.width, 9, 'CONTROLS', ZXColor.brightWhite, false, {align: 'center', topMargin: 2}));
    this.addEntity(new AbstractEntity(this, 1, 9, this.width-2, this.height-10, false, ZXColor.yellow));

    this.devicesSelectionEntity = new AbstractEntity(this, 8, 16+this.selectionDevice*16, 68, 9, false, ZXColor.brightBlue);
    this.addEntity(this.devicesSelectionEntity);

    for (var y = 0; y < this.devices.length; y++) {
      var penColor = this.penDeviceColor;
      var hoverColor = this.deviceHoverColor;
      var clickColor = this.deviceClickColor;
      if (y == this.selectionDevice) {
        penColor = this.penSelectionDeviceColor;
        hoverColor = false;
        clickColor = false;
      }
      this.devicesEntities[y] = new TextEntity(this, this.app.fonts.fonts5x5, 8, 16+y*12, 68, 9, this.devices[y].label, penColor, false, {margin: 2, hoverColor: hoverColor, clickColor: clickColor});
      this.addEntity(this.devicesEntities[y]);
    }

    this.addEntity(new AbstractEntity(this, 82, 13, 1, this.height-32, false, ZXColor.brightWhite));

    // keyboard
    this.addOptionsEntities(16, 'keyboard', false, 'keyboard', false);
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 126, this.height-16, 39, 13, 'CHANGE', {id: 'keyboardRemapKeys'}, ['Enter', 'GamepadOK'], ZXColor.brightWhite, ZXColor.magenta, {align: 'center', margin: 4, group: 'keyboard'}));

    // mouse
    var spriteEntity = new SpriteEntity(this, 90, 16, ZXColor.cyan, false, 0, 0);
    spriteEntity.group = 'mouse.disable';
    spriteEntity.hide = true;
    spriteEntity.setGraphicsData(SpriteTool.decode(
      'hR200290049050F010F081101110512011203130113021301130114012801260523072' +
      '2072207220722072207220722072207220722072207220722072207230526012801280' +
      '1280128012801280128011429FF00FF00FF00FF00FF00A00127022703250523081F05'
    ));
    this.addEntity(spriteEntity);

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 93, 105, 19, 'MOUSE BUTTONS\nCONTROL IS DISABLED', ZXColor.brightBlue, false, {align: 'center', group: 'mouse.disable', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 139, 76, 54, 13, 'ENABLE', {id: 'mouseEnable'}, [], ZXColor.brightWhite, ZXColor.magenta, {align: 'center', margin: 4, group: 'mouse.disable', hide: true}));
    this.addOptionsEntities(16, 'mouse', false, 'mouse.enable', true);
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 83, this.height-16, 41, 13, 'DISABLE',  {id: 'mouseDisable'}, [], ZXColor.brightWhite, ZXColor.red, {align: 'center', margin: 4, group: 'mouse.enable', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 126, this.height-16, 39, 13, 'CHANGE', {id: 'mouseRemapKeys'}, ['Enter', 'GamepadOK'], ZXColor.brightWhite, ZXColor.magenta, {align: 'center', margin: 4, group: 'mouse.enable', hide: true}));

    // gamepad
    var spriteEntity = new SpriteEntity(this, 90, 16, ZXColor.cyan, false, 0, 0);
    spriteEntity.group = 'gamepad.notFound';
    spriteEntity.hide = true;
    spriteEntity.setGraphicsData(SpriteTool.decode(
      'hR200690030163D2845214B1C4F1853145711590F5B0D5D0B5F0A5F0913063002160713082E04160613082D06150514082C08150414' +
      '082C08160215082D06170215082E04180116082F02300859181E0210021E1A1C040E041D1A1B060C061C1A1A080A081B1A1A080A081' +
      'B1A1B060C061C1A1C040E041E181E021002270861082F021A0115082E04180215082D06170314082C08160314082C08150513082D06' +
      '150613082E0416071306300216095F0A5F0B5D0D270D270F231323111F191F141B1D1B181721171C132513210E290E2806310616'
    ));
    this.addEntity(spriteEntity);

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 67, 104, 19, 'PRESS A BUTTON\nON YOUR GAMEPAD\nTO START', ZXColor.brightBlue, false, {align: 'center', group: 'gamepad.notFound.supported', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 75, 104, 12, 'DEVICE DOES NOT\nSUPPORT GAMEPAD', ZXColor.brightBlue, false, {align: 'center', group: 'gamepad.notFound.unsupported', hide: true}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 90, 16, 104, 9, '', {id: 'selectingGamepad'}, [], false, ZXColor.magenta, {group: 'gamepad.connected', hoverColor: ZXColor.brightMagenta, clickColor: '#7a7a7aff', hide: true}));
    this.addEntity(this.controlsEntites.gpLabel = new SlidingTextEntity(this, this.app.fonts.fonts5x5, 90, 16, 96, 9, this.selectionGamepadName(), ZXColor.brightWhite, false, {margin: 2, group: 'gamepad.connected', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 187, 16, 7, 9, '↓', ZXColor.black, false, {align: 'center', topMargin: 2, group: 'gamepad.connected', hide: true}));

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 106, 40, 72, 19, 'GAMEPAD IS NOT', ZXColor.brightBlue, false, {align: 'center', group: 'gamepad.connected.notConfigured', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 106, 47, 72, 19, 'CONFIGURED', ZXColor.brightBlue, false, {align: 'center', group: 'gamepad.connected.notConfigured', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 115, 68, 54, 13, 'CONFIGURE', {id: 'gamepadRemapKeys'}, ['Enter', 'GamepadOK'], ZXColor.brightWhite, ZXColor.magenta, {align: 'center', margin: 4, group: 'gamepad.connected.notConfigured', hide: true}));
    this.addOptionsEntities(28, 'gamepads', this.selectionGamepad, 'gamepad.connected.configured', true);

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 88, this.height-16, 36, 13, 'IGNORE', {id: 'gamepadIgnore'}, [], ZXColor.brightWhite, ZXColor.red, {align: 'center', margin: 4, group: 'gamepad.connected.configured', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 126, this.height-16, 39, 13, 'CHANGE', {id: 'gamepadRemapKeys'}, ['Enter', 'GamepadOK'], ZXColor.brightWhite, ZXColor.magenta, {align: 'center', margin: 4, group: 'gamepad.connected.configured', hide: true}));

    // touch screen
    var spriteEntity = new SpriteEntity(this, 90, 16, ZXColor.cyan, false, 0, 0);
    spriteEntity.group = 'touchscreen';
    spriteEntity.hide = true;
    spriteEntity.setGraphicsData(SpriteTool.decode(
      'lP102X01O0I052N082R2T032V02012C0L070C060A04090G0123045676809A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A' +
      '9B7C90DE9F2G95E295E297CB97CB95E295E29F2G90DE9B7C9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9H86765403210'
    ));
    this.addEntity(spriteEntity);

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 107, 80, 70, 7, 'DEVICE', ZXColor.brightBlue, false, {align: 'center', group: 'touchscreen.notFound', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 107, 87, 70, 12, 'DOES NOT HAVE\nA TOUCHSCREEN', ZXColor.brightBlue, false, {align: 'justify', group: 'touchscreen.notFound', hide: true}));

    var ts = this.options.touchscreen;
    ts.types.keys.forEach((key) => {
      ['left', 'right'].forEach((side) => {
        var x = {left: 97, right: 138};
        var spriteEntity = new SpriteEntity(this, x[side], 46, ZXColor.brightBlue, ZXColor.brightYellow, 0, 0);
        spriteEntity.group = 'touchscreen.supported.'+key;
        spriteEntity.hide = true;
        if ('compressedSpriteData' in ts.icons[ts.types[key][side].sprite]) {
          spriteEntity.setGraphicsData(SpriteTool.decode(ts.icons[ts.types[key][side].sprite].compressedSpriteData));
        } else {
          spriteEntity.setGraphicsData(ts.icons[ts.types[key][side].sprite]);
        }
        this.addEntity(spriteEntity);
      });
    });
    
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 82, 64, 13, 'CHANGE', {id: 'touchscreenChange'}, ['Enter'], ZXColor.brightWhite, ZXColor.magenta, {align: 'center', margin: 4, group: 'touchscreen.supported', hide: true}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-35, this.height-16, 32, 13, 'CLOSE', {id: 'closeZXControls'}, ['Escape', 'GamepadExit'], ZXColor.brightWhite, ZXColor.blue, {align: 'center', margin: 4}));
  } // init

  /**
   * Adds the label and current-binding text entities for every key of a device.
   * @param {number} y - Top Y offset where the first option row is drawn.
   * @param {string} device - Device options key (e.g. 'keyboard', 'mouse', 'gamepads').
   * @param {string|false} gamepad - Selected gamepad id, or false when not a gamepad device.
   * @param {string} group - Visibility group path assigned to the created entities.
   * @param {boolean} hide - Whether the created entities start hidden.
   */
  addOptionsEntities(y, device, gamepad, group, hide) {
    for (var k = 0; k < this.options[device].keys.length; k++) {
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, y+12*k, 74, 9, this.options[device].keys[k].label, ZXColor.black, false, {margin: 2, group: group, hide: hide}));
      var key = 'OFF';
      if (gamepad == false) {
        if (this.options[device].keys[k].action in this.app.controls[device]) {
          key = this.app.controls[device][this.options[device].keys[k].action];
        }
      } else {
        key = this.prettyGamepadKey(this.options[device].keys[k].action);
      }
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 164, y+12*k, 32, 9, Tool.prettyKey(key), ZXColor.brightBlue, false, {margin: 2, align: 'center', group: group, member: device+'.'+this.options[device].keys[k].action, hide: hide}));
    }
  } // addOptionsEntities

  /**
   * Finds the human-readable button or axis label bound to a gamepad action on the
   * currently selected gamepad.
   * @param {string|false} action - The action name to look up, or false.
   * @returns {string} A label such as 'B0' or 'A1+', or 'OFF' if unbound.
   */
  prettyGamepadKey(action) {
    var result = 'OFF';
    if (action !== false) {
      if (this.selectionGamepad in this.app.controls.gamepads.devices) {
        var gamepad = this.app.controls.gamepads.devices[this.selectionGamepad];
        if ('buttons' in gamepad) {
          Object.keys(gamepad.buttons).forEach((button) => {
            if (gamepad.buttons[button].action == action) {
              result = 'B'+button;
            }
          });
        }
        if ('axes' in gamepad) {
          Object.keys(gamepad.axes).forEach((axis) => {
            Object.keys(gamepad.axes[axis]).forEach((direction) => {
              if (gamepad.axes[axis][direction].action == action) {
                result = 'A'+axis+direction;
              }
            });
          });
        }
      }
    }
    return result;
  } // prettyGamepadKey

  /**
   * Refreshes the displayed label text of every device menu entity.
   */
  refreshDevices() {
    for (var y = 0; y < this.devices.length; y++) {
      this.menuEntities[y].setText(this.devices[y].label);
    }
  } // refreshDevices

  /**
   * Switches the selected device, updates highlight colours and the selection bar,
   * and shows/hides child entities according to their group path.
   * @param {number} newDevice - Index of the device to select.
   */
  changeGroup(newDevice) {
    if (newDevice < 0 || newDevice >= this.devices.length) {
      return;
    }
    if (newDevice != this.selectionDevice && newDevice == 2) {
      this.controlsEntites.gpLabel.resetAnimation();
    }
    this.devicesEntities[this.selectionDevice].setPenColor(this.penDeviceColor);
    this.devicesEntities[this.selectionDevice].hoverColor = this.deviceHoverColor;
    this.devicesEntities[this.selectionDevice].clickColor = this.deviceClickColor;
    this.selectionDevice = newDevice;
    this.devicesEntities[this.selectionDevice].setPenColor(this.penSelectionDeviceColor);
    this.devicesEntities[this.selectionDevice].hoverColor = false;
    this.devicesEntities[this.selectionDevice].clickColor = false;
    this.devicesSelectionEntity.y = 16+this.selectionDevice*12;
    this.entities.forEach ((entity) => {
      if (entity.group.length) {
        if (entity.group == this.getGroupPath().substring(0, entity.group.length)) {
          entity.hide = false;
        } else {
          entity.hide = true;
        }
      }
    });
  } // changeGroup

  /**
   * Computes the current visibility group path for the selected device based on its
   * runtime state (e.g. mouse enabled, gamepad connected/configured, touchscreen support).
   * @returns {string} The dotted group path string.
   */
  getGroupPath() {
    var group = this.devices[this.selectionDevice].type;
    switch (group) {
      case 'mouse':
        if (this.app.controls.mouse.enable) {
          group += '.enable';
        } else {
          group += '.disable';
        }
        break;

      case 'gamepad':
        if (!this.app.controls.gamepads.supported) {
            group += '.notFound.unsupported';
        } else {
          var connectedDevices = navigator.getGamepads();
          var isConnectedGamepad = false;
          for (var d = 0; d < connectedDevices.length && isConnectedGamepad == false; d++) {
            if (connectedDevices[d] != null) {
              isConnectedGamepad = true;
              break;
            }
          }
          if (!isConnectedGamepad) {
            group += '.notFound.supported';
          } else {
            if (this.selectionGamepad in this.app.controls.gamepads.devices) {
              group += '.connected.configured';
            } else {
              group += '.connected.notConfigured';
            }
          }
        }
        break;

      case 'touchscreen':
        if (this.app.controls.touchscreen.supported) {
          group += '.supported.'+this.app.controls.touchscreen.type;
        } else {
          group += '.notFound';
        }
        break;
    }
    return group;
  } // getGroupPath

  /**
   * Returns a display name for the currently selected gamepad.
   * @returns {string} The gamepad id, or a placeholder prompt when none is selected.
   */
  selectionGamepadName() {
    if (this.selectionGamepad === false) {
      return '--- select gamepad ---';
    }
    return this.selectionGamepad;
  } // selectionGamepadName

  /**
   * Reconciles the selected gamepad against currently connected devices, defaulting
   * to the first connected gamepad and clearing the selection when none are present.
   */
  checkSelectionGamepad() {
    var connectedDevices = navigator.getGamepads();
    var firstConnectedGamepad = false;
    for (var d = 0; d < connectedDevices.length && firstConnectedGamepad === false; d++) {
      if (connectedDevices[d] != null) {
        firstConnectedGamepad = connectedDevices[d].id;
        break;
      }
    }
    if (firstConnectedGamepad !== false) {
      if (this.selectionGamepad === false) {
        this.selectionGamepad = firstConnectedGamepad;
      }
        var connectedDevice = false;
        for (var d = 0; d < connectedDevices.length && connectedDevice === false; d++) {
          if (connectedDevices[d] != null && connectedDevices[d].id == this.selectionGamepad) {
            connectedDevice = connectedDevices[d];
            break;
          }
        }
        if (connectedDevice === false) {
          this.selectionGamepad = firstConnectedGamepad;
        }
    } else {
      this.selectionGamepad = false;
    }
  } // checkSelectionGamepad

  /**
   * Refreshes the displayed binding text for every gamepad action and re-applies the
   * current group visibility.
   */
  gamepadActionsUpdate() {
    this.options.gamepads.keys.forEach((key) => {
      this.sendEvent(0, 0, {id: 'updateEntity', member: 'gamepads.'+key.action, text: this.prettyGamepadKey(key.action)});
    });
    this.changeGroup(this.selectionDevice);
  } // gamepadActionsUpdate

  /**
   * Handles input and UI events for the panel: device navigation, opening remap and
   * gamepad dialogs, enabling/disabling the mouse, ignoring gamepads and cycling
   * touchscreen layouts.
   * @param {Object} event - The event object, including its id and key fields.
   * @returns {boolean} True if the event was handled.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'closeZXControls':
        this.destroy();
        return true;

      case 'keyPress':
        switch (event.key) {
          case 'ArrowDown':
          case 'GamepadDown':
            this.changeGroup(this.selectionDevice+1);
            return true;
          case 'ArrowUp':
          case 'GamepadUp':
            this.changeGroup(this.selectionDevice-1);
            return true;
          case 'Mouse1':
            for (var i = 0; i < this.devices.length; i++) {
              if (this.devicesEntities[i].pointOnEntity(event)) {
                this.app.inputEventsManager.keysMap.Mouse1 = this.devicesEntities[i];
                this.devicesEntities[i].clickState = true;
                return true;
              }
            }
            break;
          case 'Touch':
            for (var i = 0; i < this.devices.length; i++) {
              if (this.devicesEntities[i].pointOnEntity(event)) {
                this.app.inputEventsManager.touchesMap[event.identifier] = this.devicesEntities[i];
                this.devicesEntities[i].clickState = true;
                return true;
              }
            }
            break;
          }
        break;

      case 'keyRelease':
        switch (event.key) {
          case 'Mouse1':
            for (var i = 0; i < this.devices.length; i++) {
              if (this.devicesEntities[i].pointOnEntity(event) && this.app.inputEventsManager.keysMap.Mouse1 == this.devicesEntities[i]) {
                this.changeGroup(i);
                return true;
              }
            }
            break;
          case 'Touch':
            for (var i = 0; i < this.devices.length; i++) {
              if (this.devicesEntities[i].pointOnEntity(event) && this.app.inputEventsManager.touchesMap[event.identifier] == this.devicesEntities[i]) {
                this.changeGroup(i);
                return true;
              }
            }
            break;
        }
        break;

      case 'keyboardRemapKeys':
        this.addModalEntity(new ZXRemapKeysEntity(this, 7, 16, 187, 115, this.options.keyboard));
        return true;

      case 'mouseEnable':
        this.app.controls.mouse = this.app.getControls('mouse', false);
        this.app.controls.mouse.enable = true;
        Tool.writeCookie('mouse', JSON.stringify(this.app.controls.mouse));
        this.options.mouse.keys.forEach((key) => {
          this.sendEvent(0, 0, {id: 'updateEntity', member: 'mouse.'+key.action, text: Tool.prettyKey(this.app.controls.mouse[key.action])});
        });
        this.changeGroup(this.selectionDevice);
        return true;

      case 'mouseDisable':
        this.app.controls.mouse.enable = false;
        Tool.writeCookie('mouse', JSON.stringify({enable: false}));
        this.changeGroup(this.selectionDevice);
        return true;

      case 'mouseRemapKeys':
        this.addModalEntity(new ZXRemapKeysEntity(this, 7, 16, 187, 115, this.options.mouse));
        return true;

      case 'selectingGamepad':
        this.addModalEntity(new ZXSelectingGamepadEntity(this, 7, 18, 187, 83, this.selectionGamepad));
        return true;

      case 'changeSelectionGamepad':
        this.selectionGamepad = event.selectionGamepad;
        this.controlsEntites.gpLabel.setText(this.selectionGamepadName());
        this.gamepadActionsUpdate();
        this.changeGroup(this.selectionDevice);
        return true;

      case 'gamepadRemapKeys':
        this.app.inputEventsManager.gamepadsConfig = this.selectionGamepad;
        this.addModalEntity(new ZXRemapKeysEntity(this, 7, 16, 187, 115, this.options.gamepads));
        return true;

      case 'refreshGamepadActions':
        this.gamepadActionsUpdate();
        this.changeGroup(this.selectionDevice);
        return true;
      
      case 'gamepadIgnore':
        delete this.app.controls.gamepads.devices[this.selectionGamepad];
        Tool.deleteCookie(this.selectionGamepad);
        var keys = Object.keys(this.app.controls.gamepads.devices);
        Tool.writeCookie('gamepads', JSON.stringify(keys));
        this.gamepadActionsUpdate();
        this.changeGroup(this.selectionDevice);
        return true;

      case 'touchscreenChange':
        var keys = this.options.touchscreen.types.keys;
        var ndx = keys.findIndex((key) => key == this.app.controls.touchscreen.type)+1;
        if (ndx >= keys.length) {
          ndx = 0;
        }
        this.app.controls.touchscreen.type = keys[ndx];
        Tool.writeCookie('touchscreen', JSON.stringify({type: keys[ndx]}));
        this.changeGroup(this.selectionDevice);
        return true;
    }

    return false;
  } // handleEvent

  /**
   * Per-frame update: detects gamepad connection changes and refreshes the gamepad
   * selection/UI, then advances the sliding label and any modal child entity.
   * @param {number} timestamp - Current animation timestamp.
   */
  loopEntity(timestamp) {
    var updateGamepadSelection = false;
    if (this.selectionGamepad !== false) {
      updateGamepadSelection = true;
    }
    var connectedDevices = navigator.getGamepads();
    for (var d = 0; d < connectedDevices.length; d++) {
      if (connectedDevices[d] != null) {
        if (this.selectionGamepad === false) { 
          updateGamepadSelection = true;
          break;
        } else {
          if (connectedDevices[d].id == this.selectionGamepad) {
            updateGamepadSelection = false;
            break;
          }
        }
      }
    }
    if (updateGamepadSelection) {
      this.checkSelectionGamepad();
      this.gamepadActionsUpdate();
      this.controlsEntites.gpLabel.setText(this.selectionGamepadName());
      this.changeGroup(this.selectionDevice);
    }

    this.controlsEntites.gpLabel.loopEntity(timestamp);

    if (this.modalEntity != null) {
      this.modalEntity.loopEntity(timestamp);
    }
  } // loopEntity

} // ZXControlsEntity

export default ZXControlsEntity;
