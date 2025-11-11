/**/
const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { SlidingTextEntity } = await import('../slidingTextEntity.js?ver='+window.srcVersion);
const { SpriteEntity } = await import('../spriteEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { ZXSelectingGamepadEntity } = await import('./zxSelectingGamepadEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../../abstractEntity.js';
import TextEntity from '../textEntity.js';
import SlidingTextEntity from '../slidingTextEntity.js';
import SpriteEntity from '../spriteEntity.js';
import ButtonEntity from '../buttonEntity.js';
import ZXSelectingGamepadEntity from './zxSelectingGamepadEntity.js';
/**/
// begin code

export class ZXControlsEntity extends AbstractEntity {

  constructor(parentEntity, x, y, width, height) {
    super(parentEntity, x, y, width, height, false, false);
    this.id = 'ZXControlsEntity';
    this.selectedDevice = 0;
    
    this.devicesSelectedRow = null;
    this.penDeviceColor = this.app.platform.colorByName('black');
    this.penSelectedDeviceColor = this.app.platform.colorByName('brightWhite');
    this.devicesEntities = [];

    this.devices = [
      {label: 'KEYBOARD', type: 'keyboard'},
      {label: 'MOUSE', type: 'mouse'},
      {label: 'GAMEPAD', type: 'gamepad'},
      {label: 'TOUCHSCREEN', type: 'touchscreen'}
    ];

    this.selectedGamepad = false;
    this.checkSelectedGamepad();

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

    this.devicesSelectedRow = new AbstractEntity(this, 8, 16+this.selectedDevice*16, 68, 9, false, this.app.platform.colorByName('brightBlue'));
    this.addEntity(this.devicesSelectedRow);

    for (var y = 0; y < this.devices.length; y++) {
      var penColor = this.penDeviceColor;
      if (y == this.selectedDevice) {
        penColor = this.penSelectedDeviceColor;
      }
      this.devicesEntities[y] = new TextEntity(this, this.app.fonts.fonts5x5, 8, 16+y*12, 68, 9, this.devices[y].label, penColor, false, {margin: 2});
      this.addEntity(this.devicesEntities[y]);
    }

    this.addEntity(new AbstractEntity(this, 82, 13, 1, this.height-32, false, this.app.platform.colorByName('brightWhite')));

    // keyboard
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 16, 74, 9, 'WALKING LEFT', this.app.platform.colorByName('black'), false, {margin: 2, group: 'keyboard'}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 28, 74, 9, 'WALKING RIGHT', this.app.platform.colorByName('black'), false, {margin: 2, group: 'keyboard'}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 40, 74, 9, 'JUMP', this.app.platform.colorByName('black'), false, {margin: 2, group: 'keyboard'}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 52, 74, 9, 'MUSIC ON/OFF', this.app.platform.colorByName('black'), false, {margin: 2, group: 'keyboard'}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 64, 74, 9, 'SOUNDS ON/OFF', this.app.platform.colorByName('black'), false, {margin: 2, group: 'keyboard'}));

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 164, 16, 32, 9, '←', this.app.platform.colorByName('brightBlue'), false, {margin: 2, align: 'center', group: 'keyboard'}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 164, 28, 32, 9, '➔', this.app.platform.colorByName('brightBlue'), false, {margin: 2, align: 'center', group: 'keyboard'}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 164, 40, 32, 9, 'SPACE', this.app.platform.colorByName('brightBlue'), false, {margin: 2, align: 'center', group: 'keyboard'}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 164, 52, 32, 9, 'M', this.app.platform.colorByName('brightBlue'), false, {margin: 2, align: 'center', group: 'keyboard'}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 164, 64, 32, 9, 'S', this.app.platform.colorByName('brightBlue'), false, {margin: 2, align: 'center', group: 'keyboard'}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 80, 64, 13, 'REMAP KEYS', 'remapKeys', ['Enter'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'keyboard'}));

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

    this.addEntity(this.controlsEntites.moWarning = new TextEntity(this, this.app.fonts.fonts5x5, 90, 93, 105, 19, 'MOUSE BUTTONS\nCONTROL IS DISABLED', this.app.platform.colorByName('brightBlue'), false, {align: 'center', group: 'mouse.disable', hide: true}));
    this.addEntity(this.controlsEntites.tsChange = new ButtonEntity(this, this.app.fonts.fonts5x5, 139, 76, 54, 13, 'ENABLE', 'mouseEnable', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'mouse.disable', hide: true}));

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 16, 74, 9, 'WALKING LEFT', this.app.platform.colorByName('black'), false, {margin: 2, group: 'mouse.enable', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 28, 74, 9, 'WALKING RIGHT', this.app.platform.colorByName('black'), false, {margin: 2, group: 'mouse.enable', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 90, 40, 74, 9, 'JUMP', this.app.platform.colorByName('black'), false, {margin: 2, group: 'mouse.enable', hide: true}));

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 175, 16, 21, 9, 'B0', this.app.platform.colorByName('brightBlue'), false, {margin: 2, group: 'mouse.enable', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 175, 28, 21, 9, 'B1', this.app.platform.colorByName('brightBlue'), false, {margin: 2, group: 'mouse.enable', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 175, 40, 21, 9, 'B2', this.app.platform.colorByName('brightBlue'), false, {margin: 2, group: 'mouse.enable', hide: true}));

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

    this.addEntity(this.controlsEntites.gpLabel = new SlidingTextEntity(this, this.app.fonts.fonts5x5, 90, 16, 96, 9, this.selectedGamepadName().toUpperCase(), this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {margin: 2, group: 'gamepad.connected', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, 187, 16, 7, 9, '↓', this.app.platform.colorByName('yellow'), this.app.platform.colorByName('magenta'), {align: 'center', topMargin: 2, group: 'gamepad.connected', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, 90, 16, 104, 9, '', 'selectGamepad', [], false, false, {group: 'gamepad.connected', hide: true}));

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

    this.addEntity(this.controlsEntites.tsWarning1 = new TextEntity(this, this.app.fonts.fonts5x5, 107, 80, 70, 7, 'DEVICE', this.app.platform.colorByName('brightBlue'), false, {align: 'center', group: 'touchscreen.notFound', hide: true}));
    this.addEntity(this.controlsEntites.tsWarning2 = new TextEntity(this, this.app.fonts.fonts5x5, 107, 87, 70, 12, 'DOES NOT HAVE\nA TOUCHSCREEN', this.app.platform.colorByName('brightBlue'), false, {align: 'justify', group: 'touchscreen.notFound', hide: true}));

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

    this.addEntity(this.controlsEntites.tsChange = new ButtonEntity(this, this.app.fonts.fonts5x5, 110, 82, 64, 13, 'CHANGE', 'touchscreenChange', ['Enter'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('magenta'), {align: 'center', margin: 4, group: 'touchscreen.supported', hide: true}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-39, this.height-16, 36, 13, 'CLOSE', 'closeAbout', ['Escape'], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('brightBlue'), {align: 'center', margin: 4}));

// ************************ SMAZAT *************************
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 0, this.height-3, 7, 3, '1', 'addController1', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 8, this.height-3, 7, 3, '2', 'addController2', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 16, this.height-3, 7, 3, '3', 'addController3', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 24, this.height-3, 7, 3, '4', 'addController4', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 32, this.height-3, 7, 3, '5', 'addController5', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 40, this.height-3, 7, 3, '6', 'addController6', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 48, this.height-3, 7, 3, '7', 'addController7', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 56, this.height-3, 7, 3, '8', 'addController8', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 64, this.height-3, 7, 3, '9', 'addController9', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 72, this.height-3, 7, 3, '1', 'delController1', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 80, this.height-3, 7, 3, '2', 'delController2', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 88, this.height-3, 7, 3, '3', 'delController3', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 96, this.height-3, 7, 3, '4', 'delController4', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 104, this.height-3, 7, 3, '5', 'delController5', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 112, this.height-3, 7, 3, '6', 'delController6', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 120, this.height-3, 7, 3, '7', 'delController7', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 128, this.height-3, 7, 3, '8', 'delController8', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts3x3, 136, this.height-3, 7, 3, '9', 'delController9', [], this.app.platform.colorByName('brightWhite'), this.app.platform.colorByName('black'), {align: 'center'}));
// ************************ SMAZAT *************************
  } // init

  refreshDevices() {
    for (var y = 0; y < this.devices.length; y++) {
      this.menuEntities[y].setText(this.devices[y].label);
    }
  } // refreshDevices

  changeGroup(newDevice) {
    if (newDevice < 0 || newDevice >= this.devices.length) {
      return;
    }
    if (newDevice != this.selectedDevice && newDevice == 2) {
      this.controlsEntites.gpLabel.resetAnimation();
    }
    this.devicesEntities[this.selectedDevice].setPenColor(this.penDeviceColor);
    this.selectedDevice = newDevice;
    this.devicesEntities[this.selectedDevice].setPenColor(this.penSelectedDeviceColor);
    this.devicesSelectedRow.y = 16+this.selectedDevice*12;
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
    var group = this.devices[this.selectedDevice].type;
    switch (group) {
      case 'mouse':
        if (this.app.controls.mouse.enable) {
          group += '.enable';
        } else {
          group += '.disable';
        }
        break;

      case 'gamepad':
        if (!this.app.controls.gamepad.supported) {
            group += '.notFound.unsupported';
        } else {
          if (!Object.keys(this.app.inputEventsManager.gamepads).length) {
            group += '.notFound.supported';
          } else {
            group += '.connected';
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

  selectedGamepadName() {
    if (this.selectedGamepad === false) {
      return '--- select gamepad ---';
    }
    return this.selectedGamepad;
  } // selectedGamepadName

  checkSelectedGamepad() {
    var gamepadsKeys = Object.keys(this.app.inputEventsManager.gamepads);
    if (gamepadsKeys.length) {
      if (this.selectedGamepad === false) {
        this.selectedGamepad = gamepadsKeys[0];
      }
      if (!(this.selectedGamepad in this.app.inputEventsManager.gamepads)) {
        this.selectedGamepad = gamepadsKeys[0];
      }
    } else {
      this.selectedGamepad = false;
    }
  } // checkSelectedGamepad

  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

// ************************ SMAZAT *************************
    if (event.id.substring(0, 13) == 'addController') {
      this.app.inputEventsManager.eventGamepadConnected({gamepad: {id: event.id.substring(13)}});
      return true;
    }
    if (event.id.substring(0, 13) == 'delController') {
      this.app.inputEventsManager.eventGamepadDisconnected({gamepad: {id: event.id.substring(13)}});
      return true;
    }
// ************************ SMAZAT *************************

    switch (event.id) {
      case 'closeAbout':
        this.destroy();
        return true;

      case 'selectGamepad':
        this.addModalEntity(new ZXSelectingGamepadEntity(this, 7, 18, 187, 67, this.selectedGamepad));
        return true;

      case 'changeSelectedGamepad':
        this.selectedGamepad = event.selectedGamepad;
        this.controlsEntites.gpLabel.setText(this.selectedGamepadName().toUpperCase());
        this.changeGroup(this.selectedDevice);
        return true;

      case 'keyPress':
        switch (event.key) {
          case 'ArrowDown':
            this.changeGroup(this.selectedDevice+1);
            return true;
          case 'ArrowUp':
            this.changeGroup(this.selectedDevice-1);
            return true;
          }
        break;

      case 'mouseClick':
        if (event.key == 'left') {
          for (var i = 0; i < this.devices.length; i++) {
            if (this.devicesEntities[i].pointOnEntity(event)) {
              this.changeGroup(i);
              return true;
            }
          }
        }
        break;

      case 'mouseEnable':
        this.app.controls.mouse.enable = true;
        this.changeGroup(this.selectedDevice);
        return true;

      case 'mouseDisable':
        this.app.controls.mouse.enable = false;
        this.changeGroup(this.selectedDevice);
        return true;

      case 'gamepadConnected':
      case 'gamepadDisconnected':
        this.checkSelectedGamepad();
        this.controlsEntites.gpLabel.setText(this.selectedGamepadName().toUpperCase());
        this.changeGroup(this.selectedDevice);
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
