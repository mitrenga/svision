/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { SlidingTextEntity } = await import('../slidingTextEntity.js?ver='+window.srcVersion);
const { SpriteEntity } = await import('../spriteEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { ZXRemapKeysEntity } = await import('./zxRemapKeysEntity.js?ver='+window.srcVersion);
const { ZXSelectingGamepadEntity } = await import('./zxSelectingGamepadEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
import SlidingTextEntity from '../slidingTextEntity.js';
import SpriteEntity from '../spriteEntity.js';
import ButtonEntity from '../buttonEntity.js';
import ZXRemapKeysEntity from './zxRemapKeysEntity.js';
import ZXSelectingGamepadEntity from './zxSelectingGamepadEntity.js';
/**/
// begin code

export class ZXControlsEntity extends AbstractEntity {

  constructor(parentEntity, x, y, width, height) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXControlsEntity';
    this.selectionDevice = 0;
    
    this.devicesSelectionEntity = null;
    this.penDeviceColor = this.app.platform.colorByName('black');
    this.penSelectionDeviceColor = this.app.platform.colorByName('brightWhite');
    this.devicesEntities = [];

    this.devices = [
      {label: 'KEYBOARD', type: 'keyboard'},
      {label: 'MOUSE', type: 'mouse'},
      {label: 'GAMEPAD', type: 'gamepad'},
      {label: 'TOUCHSCREEN', type: 'touchscreen'}
    ];

    this.deviceHoverColor = '#b1ab79ff';
    this.deviceClickColor = '#939393ff';

    this.options = {
      'keyboard': {
        device: 'keyboard',
        keys: [
          {action: 'left', label: 'WALKING LEFT'},
          {action: 'right', label: 'WALKING RIGHT'},
          {action: 'jump', label: 'JUMP'},
          {action: 'music', label: 'MUTE MUSIC'},
          {action: 'sounds', label: 'MUTE SOUNDS'}
        ]
      },
      'mouse': {
        device: 'mouse',
        keys: [
          {action: 'left', label: 'WALKING LEFT'},
          {action: 'right', label: 'WALKING RIGHT'},
          {action: 'jump', label: 'JUMP'}
        ]
      },
      'gamepads': {
        device: 'gamepads',
        keys: [
          {action: 'left', label: 'WALKING LEFT'},
          {action: 'right', label: 'WALKING RIGHT'},
          {action: 'jump', label: 'JUMP'},
          {action: 'play', label: 'PLAY'},
          {action: 'pause', label: 'PAUSE'}
        ]
      }
    }

    this.selectionGamepad = false;
    this.checkSelectionGamepad();

    this.tsData = {
      'jump-left-right': {left: {x: 137, y: 47, width: 19, height: 22}, right: {x: 158, y: 47, width: 19, height: 22}, jump: {x: 97, y: 47, width: 38, height: 22}, next: 'left-right-jump'},
      'left-right-jump': {left: {x: 97, y: 47, width: 19, height: 22}, right: {x: 118, y: 47, width: 19, height: 22}, jump: {x: 139, y: 47, width: 38, height: 22}, next: 'left-jump-right'},
      'left-jump-right': {left: {x: 97, y: 47, width: 25, height: 22}, right: {x: 152, y: 47, width: 25, height: 22}, jump: {x: 124, y: 47, width: 26, height: 22}, next: 'jump-left-right'}
    };

    this.controlsEntites = {};
  } // constructor

  init() {
    super.init();
    
    this.addEntity(new AbstractEntity(this, 0, 0, this.width, this.height, false, this.app.platform.colorByName('black')));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 0, 0, this.width, 9, 'CONTROLS', this.app.platform.colorByName('brightWhite'), false, {align: 'center', topMargin: 2}));
    this.addEntity(new AbstractEntity(this, 1, 9, this.width-2, this.height-10, false, this.app.platform.colorByName('yellow')));

    this.devicesSelectionEntity = new AbstractEntity(this, 8, 16+this.selectionDevice*16, 68, 9, false, this.app.platform.colorByName('brightBlue'));
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

    this.addEntity(new AbstractEntity(this, 82, 13, 1, this.height-32, false, this.app.platform.colorByName('brightWhite')));

    // keyboard
    this.addOptionsEntities(16, 'keyboard', false, 'keyboard', false);
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 80, 64, 13, 'REMAP KEYS', 'keyboardRemapKeys', ['Enter'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'keyboard'}));

    // mouse
    var spriteEntity = new SpriteEntity(this, 90, 16, this.app.platform.colorByName('cyan'), false, 0, 0);
    spriteEntity.group = 'mouse.disable';
    spriteEntity.hide = true;
    spriteEntity.setCompressedGraphicsData(
      'hR200290049050F010F081101110512011203130113021301130114012801260523072' +
      '2072207220722072207220722072207220722072207220722072207230526012801280' +
      '1280128012801280128011429FF00FF00FF00FF00FF00A00127022703250523081F05',
      false
    );
    this.addEntity(spriteEntity);

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 93, 105, 19, 'MOUSE BUTTONS\nCONTROL IS DISABLED', this.app.platform.colorByName('brightBlue'), false, {align: 'center', group: 'mouse.disable', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 139, 76, 54, 13, 'ENABLE', 'mouseEnable', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'mouse.disable', hide: true}));
    this.addOptionsEntities(16, 'mouse', false, 'mouse.enable', true);
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 56, 64, 13, 'REMAP KEYS', 'mouseRemapKeys', ['Enter'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'mouse.enable', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 73, 64, 13, 'DISABLE', 'mouseDisable', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('red'), {align: 'center', margin: 4, group: 'mouse.enable', hide: true}));

    // gamepad
    var spriteEntity = new SpriteEntity(this, 90, 16, this.app.platform.colorByName('cyan'), false, 0, 0);
    spriteEntity.group = 'gamepad.notFound';
    spriteEntity.hide = true;
    spriteEntity.setCompressedGraphicsData(
      'hR200690030163D2845214B1C4F1853145711590F5B0D5D0B5F0A5F0913063002160713082E04160613082D06150514082C08150414' +
      '082C08160215082D06170215082E04180116082F02300859181E0210021E1A1C040E041D1A1B060C061C1A1A080A081B1A1A080A081' +
      'B1A1B060C061C1A1C040E041E181E021002270861082F021A0115082E04180215082D06170314082C08160314082C08150513082D06' +
      '150613082E0416071306300216095F0A5F0B5D0D270D270F231323111F191F141B1D1B181721171C132513210E290E2806310616',
      false
    );
    this.addEntity(spriteEntity);

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 67, 104, 19, 'PRESS A BUTTON\nON YOUR GAMEPAD\nTO START', this.app.platform.colorByName('brightBlue'), false, {align: 'center', group: 'gamepad.notFound.supported', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 75, 104, 12, 'DEVICE DOES NOT\nSUPPORT GAMEPAD', this.app.platform.colorByName('brightBlue'), false, {align: 'center', group: 'gamepad.notFound.unsupported', hide: true}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 90, 16, 104, 9, '', 'selectingGamepad', [], false, this.app.platform.colorByName('magenta'), {group: 'gamepad.connected', hoverColor: this.app.platform.colorByName('brightMagenta'), clickColor: '#7a7a7aff', hide: true}));
    this.addEntity(this.controlsEntites.gpLabel = new SlidingTextEntity(this, this.app.fonts.fonts5x5, 90, 16, 96, 9, this.selectionGamepadName().toUpperCase(), this.app.platform.colorByName('brightWhite'), false, {margin: 2, group: 'gamepad.connected', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 187, 16, 7, 9, '↓', this.app.platform.colorByName('black'), false, {align: 'center', topMargin: 2, group: 'gamepad.connected', hide: true}));

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 106, 40, 72, 19, 'GAMEPAD IS NOT', this.app.platform.colorByName('brightBlue'), false, {align: 'center', group: 'gamepad.connected.notConfigured', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 106, 47, 72, 19, 'CONFIGURED', this.app.platform.colorByName('brightBlue'), false, {align: 'center', group: 'gamepad.connected.notConfigured', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 115, 68, 54, 13, 'CONFIGURE', 'gamepadRemapKeys', ['Enter'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'gamepad.connected.notConfigured', hide: true}));
    this.addOptionsEntities(28, 'gamepads', this.selectionGamepad, 'gamepad.connected.configured', true);
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 88, 64, 13, 'REMAP KEYS', 'gamepadRemapKeys', ['Enter'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'gamepad.connected.configured', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 103, 64, 13, 'IGNORE', 'gamepadIgnore', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('red'), {align: 'center', margin: 4, group: 'gamepad.connected.configured', hide: true}));

    // touch screen
    var spriteEntity = new SpriteEntity(this, 90, 16, this.app.platform.colorByName('cyan'), false, 0, 0);
    spriteEntity.group = 'touchscreen';
    spriteEntity.hide = true;
    spriteEntity.setCompressedGraphicsData(
      'lP102X01O0I052N082R2T032V02012C0L070C060A04090G0123045676809A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A' +
      '9B7C90DE9F2G95E295E297CB97CB95E295E29F2G90DE9B7C9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9H86765403210',
      false
    );
    this.addEntity(spriteEntity);

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 107, 80, 70, 7, 'DEVICE', this.app.platform.colorByName('brightBlue'), false, {align: 'center', group: 'touchscreen.notFound', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 107, 87, 70, 12, 'DOES NOT HAVE\nA TOUCHSCREEN', this.app.platform.colorByName('brightBlue'), false, {align: 'justify', group: 'touchscreen.notFound', hide: true}));

    var tsType = this.tsData[this.app.controls.touchscreen.type];
    this.addEntity(this.controlsEntites.tsLeft = new TextEntity(
      this, this.app.fonts.fonts5x5,
      tsType.left.x, tsType.left.y, tsType.left.width, tsType.left.height,
      '←', this.app.platform.colorByName('brightBlue'), this.app.platform.colorByName('brightYellow'),
      {align: 'center', topMargin: 9, group: 'touchscreen.supported', hide: true}
    ));
    this.addEntity(this.controlsEntites.tsRight = new TextEntity(
      this, this.app.fonts.fonts5x5,
      tsType.right.x, tsType.right.y, tsType.right.width, tsType.right.height,
      '➔', this.app.platform.colorByName('brightBlue'), this.app.platform.colorByName('brightYellow'),
      {align: 'center', topMargin: 9, group: 'touchscreen.supported', hide: true}
    ));
    this.addEntity(this.controlsEntites.tsJump = new TextEntity(
      this, this.app.fonts.fonts5x5,
      tsType.jump.x, tsType.jump.y, tsType.jump.width, tsType.jump.height,
      '↑', this.app.platform.colorByName('brightBlue'), this.app.platform.colorByName('brightYellow'),
      {align: 'center', topMargin: 9, group: 'touchscreen.supported', hide: true}
    ));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 82, 64, 13, 'CHANGE', 'touchscreenChange', ['Enter'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'touchscreen.supported', hide: true}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-39, this.height-16, 36, 13, 'CLOSE', 'closeZXControls', ['Escape'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('blue'), {align: 'center', margin: 4}));
  } // init

  addOptionsEntities(y, device, gamepad, group, hide) {
    for (var k = 0; k < this.options[device].keys.length; k++) {
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, y+12*k, 74, 9, this.options[device].keys[k].label, this.app.platform.colorByName('black'), false, {margin: 2, group: group, hide: hide}));
      var key = 'OFF';
      if (gamepad == false) {
        if (this.options[device].keys[k].action in this.app.controls[device]) {
          key = this.app.controls[device][this.options[device].keys[k].action];
        }
      } else {
        key = this.prettyGamepadKey(this.options[device].keys[k].action);
      }
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 164, y+12*k, 32, 9, this.app.prettyKey(key), this.app.platform.colorByName('brightBlue'), false, {margin: 2, align: 'center', group: group, member: device+'.'+this.options[device].keys[k].action, hide: hide}));
    }
  } // addOptionsEntities

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

  refreshDevices() {
    for (var y = 0; y < this.devices.length; y++) {
      this.menuEntities[y].setText(this.devices[y].label);
    }
  } // refreshDevices

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
          if (!Object.keys(this.app.inputEventsManager.gamepads).length) {
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
          group += '.supported';
        } else {
          group += '.notFound';
        }
        break;
    }
    return group;
  } // getGroupPath

  selectionGamepadName() {
    if (this.selectionGamepad === false) {
      return '--- select gamepad ---';
    }
    return this.selectionGamepad;
  } // selectionGamepadName

  checkSelectionGamepad() {
    var gamepadsKeys = Object.keys(this.app.inputEventsManager.gamepads);
    if (gamepadsKeys.length) {
      if (this.selectionGamepad === false) {
        this.selectionGamepad = gamepadsKeys[0];
      }
      if (!(this.selectionGamepad in this.app.inputEventsManager.gamepads)) {
        this.selectionGamepad = gamepadsKeys[0];
      }
    } else {
      this.selectionGamepad = false;
    }
    this.gamepadActionsUpdate();
  } // checkSelectionGamepad

  gamepadActionsUpdate() {
    this.options.gamepads.keys.forEach((key) => {
      this.sendEvent(0, 0, {id: 'updateEntity', member: 'gamepads.'+key.action, text: this.prettyGamepadKey(key.action)});
    });
  } // gamepadActionsUpdate

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
            this.changeGroup(this.selectionDevice+1);
            return true;
          case 'ArrowUp':
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
        this.app.setCookie('mouse', JSON.stringify(this.app.controls.mouse));
        this.options.mouse.keys.forEach((key) => {
          this.sendEvent(0, 0, {id: 'updateEntity', member: 'mouse.'+key.action, text: this.app.prettyKey(this.app.controls.mouse[key.action])});
        });
        this.changeGroup(this.selectionDevice);
        return true;

      case 'mouseDisable':
        this.app.controls.mouse.enable = false;
        this.app.setCookie('mouse', JSON.stringify({enable: false}));
        this.changeGroup(this.selectionDevice);
        return true;

      case 'mouseRemapKeys':
        this.addModalEntity(new ZXRemapKeysEntity(this, 7, 16, 187, 115, this.options.mouse));
        return true;

      case 'gamepadConnected':
      case 'gamepadDisconnected':
        this.checkSelectionGamepad();
        this.controlsEntites.gpLabel.setText(this.selectionGamepadName().toUpperCase());
        this.changeGroup(this.selectionDevice);
        return true;

      case 'selectingGamepad':
        this.addModalEntity(new ZXSelectingGamepadEntity(this, 7, 18, 187, 83, this.selectionGamepad));
        return true;

      case 'changeSelectionGamepad':
        this.selectionGamepad = event.selectionGamepad;
        this.controlsEntites.gpLabel.setText(this.selectionGamepadName().toUpperCase());
        this.gamepadActionsUpdate();
        this.changeGroup(this.selectionDevice);
        return true;

      case 'gamepadRemapKeys':
        this.app.inputEventsManager.gamepadsConfig = this.selectionGamepad;
        this.addModalEntity(new ZXRemapKeysEntity(this, 7, 16, 187, 115, this.options.gamepads));
        return true;

      case 'touchscreenChange':
        this.app.controls.touchscreen.type = this.tsData[this.app.controls.touchscreen.type].next;
        var tsType = this.tsData[this.app.controls.touchscreen.type];
        this.controlsEntites.tsLeft.x = tsType.left.x;
        this.controlsEntites.tsLeft.y = tsType.left.y;
        this.controlsEntites.tsLeft.width = tsType.left.width;
        this.controlsEntites.tsLeft.height = tsType.left.height;
        this.controlsEntites.tsLeft.cleanCache();
        this.controlsEntites.tsRight.x = tsType.right.x;
        this.controlsEntites.tsRight.y = tsType.right.y;
        this.controlsEntites.tsRight.width = tsType.right.width;
        this.controlsEntites.tsRight.height = tsType.right.height;
        this.controlsEntites.tsRight.cleanCache();
        this.controlsEntites.tsJump.x = tsType.jump.x;
        this.controlsEntites.tsJump.y = tsType.jump.y;
        this.controlsEntites.tsJump.width = tsType.jump.width;
        this.controlsEntites.tsJump.height = tsType.jump.height;
        this.controlsEntites.tsJump.cleanCache();
        return true;
    }

    return false;
  } // handleEvent

  loopEntity(timestamp) {
    this.controlsEntites.gpLabel.loopEntity(timestamp);
  } // loopEntity

} // ZXControlsEntity

export default ZXControlsEntity;
