const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { SlidingTextEntity } = await import('../slidingTextEntity.js?ver='+window.srcVersion);
const { SpriteEntity } = await import('../spriteEntity.js?ver='+window.srcVersion);
const { SpriteTool } = await import('../../../spriteTool.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { ZXRemapKeysEntity } = await import('./zxRemapKeysEntity.js?ver='+window.srcVersion);
const { ZXSelectingGamepadEntity } = await import('./zxSelectingGamepadEntity.js?ver='+window.srcVersion);
const { ZXDialogEntity } = await import('./zxDialogEntity.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
const { ZXDialogProperties } = await import('./zxDialogProperties.js?ver='+window.srcVersion);
// begin code

/**
 * ZX Spectrum themed control-settings panel. Lets the player choose an input
 * device (keyboard, mouse, gamepad, touchscreen), view its current key bindings
 * and launch the relevant remap/configuration dialogs.
 *
 * The panel is contents only: it draws no frame and no title. A game puts it
 * into a window (ZXDialogEntity), or straight onto its screen, at any position,
 * and gives it the colours through the `theme` of its dialog properties
 * (ZXDialogProperties). The layout needs 200 x 124 px; the columns spread
 * themselves over any width from 175 up. The dialogs the panel opens on top of
 * itself — ZXRemapKeysEntity (CHANGE, CONFIGURE) and ZXSelectingGamepadEntity —
 * go into windows of their own, placed and coloured by the `remapKeys` and
 * `selectingGamepad` parts of the same properties. When CLOSE shuts the panel,
 * a 'contentClosed' event goes to the parent so a window can close with it.
 */
export class ZXSettingsEntity extends AbstractEntity {

  /**
   * Creates the controls panel and initialises device selection state and palette.
   * @param {AbstractEntity} parentEntity - The parent entity that owns this panel.
   * @param {number} x - X position of the panel.
   * @param {number} y - Y position of the panel.
   * @param {number} width - Panel width.
   * @param {number} height - Panel height.
   * @param {Object} options - Per-device key/option definitions used to build the UI.
   * @param {Object} [properties] - The dialog properties, see ZXDialogProperties; the panel uses `theme`, `remapKeys` and `selectingGamepad`.
   */
  constructor(parentEntity, x, y, width, height, options, properties = {}) {
    properties = ZXDialogProperties.merge(properties);
    var theme = properties.theme;
    super(parentEntity, x, y, width, height, false, theme.bkColor);
    this.id = 'ZXSettingsEntity';

    this.properties = properties;
    this.theme = theme;
    // whether the nested dialogs (ZXRemapKeysEntity, ZXSelectingGamepadEntity) are
    // clipped to the contents; a game that puts one over the title bar of the
    // window (negative coordinates) sets `clipsChildren: false`
    this.clipsChildren = properties.clipsChildren;
    this.options = options;
    this.selectionDevice = 0;
    this.devicesSelectionEntity = null;
    this.penDeviceColor = theme.penColor;
    this.penSelectionDeviceColor = theme.selectionPenColor;
    this.devicesEntities = [];

    // The mouse row is there only for a game that offers the mouse as a game
    // control (`options.mouse`). A game whose mouse serves the buttons and the
    // menu alone leaves it out of its controlsOptions and the row is not shown.
    this.devices = [
      {label: 'KEYBOARD', type: 'keyboard'},
      {label: 'MOUSE', type: 'mouse'},
      {label: 'GAMEPAD', type: 'gamepad'},
      {label: 'TOUCHSCREEN', type: 'touchscreen'},
      {label: 'DISPLAY', type: 'display'}
    ].filter((device) => device.type != 'mouse' || ('mouse' in options));

    this.deviceHoverColor = theme.hoverColor;
    this.deviceClickColor = theme.clickColor;

    this.selectionGamepad = false;
    this.checkSelectionGamepad();

    this.controlsEntites = {};
  } // constructor

  /**
   * Builds all child entities of the panel: the device list, separators, and the
   * device-specific option rows and buttons of every group — keyboard, mouse,
   * gamepad, touchscreen and DISPLAY (the display style row and its CHANGE
   * button, see `displayStyleChange`). The mouse group (its icon, the
   * ENABLE/DISABLE buttons and the option rows) is built only when the game
   * offers the mouse as a game control, `'mouse' in options`; otherwise the
   * device list has no MOUSE row either.
   */
  init() {
    super.init();

    // Horizontal layout: the device list (68), the separator (1), the key labels (74)
    // and the key values (32) are spread so that the five gaps between them and the
    // panel edges are equal. A remainder that does not divide goes between the
    // labels and the values.
    var gap = Math.floor((this.width-(68+1+74+32))/5);
    var rest = this.width-(68+1+74+32)-5*gap;
    this.menuX = gap;
    this.separatorX = this.menuX+68+gap;
    this.keysX = this.separatorX+1+gap;
    this.valuesX = this.keysX+74+gap+rest;
    this.rightX = this.valuesX+32;                    // right edge of the content area
    this.centerX = Math.floor((this.keysX+this.rightX)/2);   // centre of the right-hand area

    this.devicesSelectionEntity = new AbstractEntity(this, this.menuX, 7+this.selectionDevice*12, 68, 9, false, this.theme.selectionColor);
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
      this.devicesEntities[y] = new TextEntity(this, this.app.fonts.fonts5x5, this.menuX, 7+y*12, 68, 9, this.devices[y].label, penColor, false, {margin: 2, hoverColor: hoverColor, clickColor: clickColor});
      this.addEntity(this.devicesEntities[y]);
    }

    this.addEntity(new AbstractEntity(this, this.separatorX, 4, 1, this.height-22, false, this.theme.separatorColor));

    // keyboard
    this.addOptionsEntities(7, 'keyboard', false, 'keyboard', false);
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-75, this.height-15, 39, 13, 'CHANGE', {id: 'keyboardRemapKeys'}, ['Enter', 'GamepadOK'], this.theme.buttonPenColor, this.theme.buttonColor, {align: 'center', margin: 4, group: 'keyboard'}));

    // mouse — only when the game offers it as a control
    if ('mouse' in this.options) {
      var spriteEntity = new SpriteEntity(this, this.keysX, 7, this.theme.iconColor, false, 0, 0);
      spriteEntity.group = 'mouse.disable';
      spriteEntity.hide = true;
      spriteEntity.setGraphicsData(SpriteTool.decode(
        'hR200290049050F010F081101110512011203130113021301130114012801260523072' +
        '2072207220722072207220722072207220722072207220722072207230526012801280' +
        '1280128012801280128011429FF00FF00FF00FF00FF00A00127022703250523081F05'
      ));
      // Disabled state: two zones stacked vertically — the mouse icon (with the
      // ENABLE button sitting on its bottom edge) and the two-line info text — with
      // equal gaps between the panel top, the icon zone, the text zone and the CLOSE
      // button. A remainder goes between the icon and the text. Horizontally the
      // icon and the button share the right-hand area with equal gaps left, between
      // and right; a remainder goes between them.
      var fonts = this.app.fonts.fonts5x5;
      var textHeight = 2*fonts.charsHeight+fonts.lineSpacing;
      var freeY = (this.height-15)-spriteEntity.height-textHeight;
      var gapY = Math.floor(freeY/3);
      var freeX = (this.rightX-this.keysX)-spriteEntity.width-54;
      var gapX = Math.floor(freeX/3);
      spriteEntity.x = this.keysX+gapX;
      spriteEntity.y = gapY;
      this.addEntity(spriteEntity);

      this.addEntity(new TextEntity(this, fonts, this.keysX, spriteEntity.y+spriteEntity.height+freeY-2*gapY, this.rightX-this.keysX, textHeight, 'MOUSE BUTTONS\nCONTROL IS DISABLED', this.theme.valueColor, false, {align: 'center', group: 'mouse.disable', hide: true}));
      this.addEntity(new ButtonEntity(this, fonts, spriteEntity.x+spriteEntity.width+freeX-2*gapX, spriteEntity.y+spriteEntity.height-13, 54, 13, 'ENABLE', {id: 'mouseEnable'}, [], this.theme.buttonPenColor, this.theme.buttonColor, {align: 'center', margin: 4, group: 'mouse.disable', hide: true}));
      this.addOptionsEntities(7, 'mouse', false, 'mouse.enable', true);
      this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-118, this.height-15, 41, 13, 'DISABLE',  {id: 'mouseDisable'}, [], this.theme.buttonPenColor, this.theme.dangerButtonColor, {align: 'center', margin: 4, group: 'mouse.enable', hide: true}));
      this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-75, this.height-15, 39, 13, 'CHANGE', {id: 'mouseRemapKeys'}, ['Enter', 'GamepadOK'], this.theme.buttonPenColor, this.theme.buttonColor, {align: 'center', margin: 4, group: 'mouse.enable', hide: true}));
    }

    // gamepad
    var spriteEntity = new SpriteEntity(this, this.keysX, 7, this.theme.iconColor, false, 0, 0);
    spriteEntity.group = 'gamepad.notFound';
    spriteEntity.hide = true;
    spriteEntity.setGraphicsData(SpriteTool.decode(
      'hR200690030163D2845214B1C4F1853145711590F5B0D5D0B5F0A5F0913063002160713082E04160613082D06150514082C08150414' +
      '082C08160215082D06170215082E04180116082F02300859181E0210021E1A1C040E041D1A1B060C061C1A1A080A081B1A1A080A081' +
      'B1A1B060C061C1A1C040E041E181E021002270861082F021A0115082E04180215082D06170314082C08160314082C08150513082D06' +
      '150613082E0416071306300216095F0A5F0B5D0D270D270F231323111F191F141B1D1B181721171C132513210E290E2806310616'
    ));
    spriteEntity.x = this.centerX-Math.floor(spriteEntity.width/2);   // centred in the right-hand area
    this.addEntity(spriteEntity);

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.keysX, 58, this.rightX-this.keysX, 19, 'PRESS A BUTTON\nON YOUR GAMEPAD\nTO START', this.theme.valueColor, false, {align: 'center', group: 'gamepad.notFound.supported', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.keysX, 66, this.rightX-this.keysX, 12, 'DEVICE DOES NOT\nSUPPORT GAMEPAD', this.theme.valueColor, false, {align: 'center', group: 'gamepad.notFound.unsupported', hide: true}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.keysX, 7, this.rightX-this.keysX, 9, '', {id: 'selectingGamepad'}, [], false, this.theme.buttonColor, {group: 'gamepad.connected', hoverColor: this.theme.buttonHoverColor, clickColor: this.theme.buttonClickColor, hide: true}));
    this.addEntity(this.controlsEntites.gpLabel = new SlidingTextEntity(this, this.app.fonts.fonts5x5, this.keysX, 7, this.rightX-this.keysX-8, 9, this.selectionGamepadName(), this.theme.buttonPenColor, false, {margin: 2, group: 'gamepad.connected', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.rightX-7, 7, 7, 9, '↓', this.theme.penColor, false, {align: 'center', topMargin: 2, group: 'gamepad.connected', hide: true}));

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.keysX, 31, this.rightX-this.keysX, 19, 'GAMEPAD IS NOT', this.theme.valueColor, false, {align: 'center', group: 'gamepad.connected.notConfigured', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.keysX, 38, this.rightX-this.keysX, 19, 'CONFIGURED', this.theme.valueColor, false, {align: 'center', group: 'gamepad.connected.notConfigured', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.centerX-27, 59, 54, 13, 'CONFIGURE', {id: 'gamepadRemapKeys'}, ['Enter', 'GamepadOK'], this.theme.buttonPenColor, this.theme.buttonColor, {align: 'center', margin: 4, group: 'gamepad.connected.notConfigured', hide: true}));
    this.addOptionsEntities(19, 'gamepads', this.selectionGamepad, 'gamepad.connected.configured', true);

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-113, this.height-15, 36, 13, 'IGNORE', {id: 'gamepadIgnore'}, [], this.theme.buttonPenColor, this.theme.dangerButtonColor, {align: 'center', margin: 4, group: 'gamepad.connected.configured', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-75, this.height-15, 39, 13, 'CHANGE', {id: 'gamepadRemapKeys'}, ['Enter', 'GamepadOK'], this.theme.buttonPenColor, this.theme.buttonColor, {align: 'center', margin: 4, group: 'gamepad.connected.configured', hide: true}));

    // touch screen
    var spriteEntity = new SpriteEntity(this, this.keysX, 7, this.theme.iconColor, false, 0, 0);
    spriteEntity.group = 'touchscreen';
    spriteEntity.hide = true;
    spriteEntity.setGraphicsData(SpriteTool.decode(
      'lP102X01O0I052N082R2T032V02012C0L070C060A04090G0123045676809A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A' +
      '9B7C90DE9F2G95E295E297CB97CB95E295E29F2G90DE9B7C9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9A9H86765403210'
    ));
    spriteEntity.x = this.centerX-Math.floor(spriteEntity.width/2);   // centred in the right-hand area
    this.addEntity(spriteEntity);

    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.keysX, 71, this.rightX-this.keysX, 7, 'DEVICE', this.theme.valueColor, false, {align: 'center', group: 'touchscreen.notFound', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.keysX, 78, this.rightX-this.keysX, 12, 'DOES NOT HAVE\nA TOUCHSCREEN', this.theme.valueColor, false, {align: 'center', group: 'touchscreen.notFound', hide: true}));

    var ts = this.options.touchscreen;
    ts.types.keys.forEach((key) => {
      ['left', 'right'].forEach((side) => {
        var x = {left: this.centerX-45, right: this.centerX-4};
        var spriteEntity = new SpriteEntity(this, x[side], 37, ZXColor.brightBlue, ZXColor.brightYellow, 0, 0);
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
    
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.centerX-32, 73, 64, 13, 'CHANGE', {id: 'touchscreenChange'}, ['Enter'], this.theme.buttonPenColor, this.theme.buttonColor, {align: 'center', margin: 4, group: 'touchscreen.supported', hide: true}));

    // display
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.keysX, 7, 74, 9, 'STYLE', this.theme.penColor, false, {margin: 2, group: 'display', hide: true}));
    this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.valuesX, 7, 32, 9, this.app.layout.displayStyle.toUpperCase(), this.theme.valueColor, false, {margin: 2, align: 'center', group: 'display', member: 'display.style', hide: true}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-75, this.height-15, 39, 13, 'CHANGE', {id: 'displayStyleChange'}, ['Enter', 'GamepadOK'], this.theme.buttonPenColor, this.theme.buttonColor, {align: 'center', margin: 4, group: 'display', hide: true}));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-34, this.height-15, 32, 13, 'CLOSE', {id: 'closeZXSettings'}, ['Escape', 'GamepadExit'], this.theme.buttonPenColor, this.theme.closeButtonColor, {align: 'center', margin: 4}));
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
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.keysX, y+12*k, 74, 9, this.options[device].keys[k].label, this.theme.penColor, false, {margin: 2, group: group, hide: hide}));
      var key = 'OFF';
      if (gamepad == false) {
        if (this.options[device].keys[k].action in this.app.controls[device]) {
          key = this.app.controls[device][this.options[device].keys[k].action];
        }
      } else {
        key = this.prettyGamepadKey(this.options[device].keys[k].action);
      }
      this.addEntity(new TextEntity(this, this.app.fonts.fonts5x5, this.valuesX, y+12*k, 32, 9, Tool.prettyKey(key), this.theme.valueColor, false, {margin: 2, align: 'center', group: group, member: device+'.'+this.options[device].keys[k].action, hide: hide}));
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
    if (newDevice != this.selectionDevice && this.devices[newDevice].type == 'gamepad') {
      this.controlsEntites.gpLabel.resetAnimation();
    }
    this.devicesEntities[this.selectionDevice].setPenColor(this.penDeviceColor);
    this.devicesEntities[this.selectionDevice].hoverColor = this.deviceHoverColor;
    this.devicesEntities[this.selectionDevice].clickColor = this.deviceClickColor;
    this.selectionDevice = newDevice;
    this.devicesEntities[this.selectionDevice].setPenColor(this.penSelectionDeviceColor);
    this.devicesEntities[this.selectionDevice].hoverColor = false;
    this.devicesEntities[this.selectionDevice].clickColor = false;
    this.devicesSelectionEntity.y = 7+this.selectionDevice*12;
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
   * Scans the connected gamepads for user activity — a pressed button or an
   * axis pushed past half of its range (well above stick drift, below the
   * input manager's config-mode threshold). The selected gamepad keeps
   * priority, so it does not flip away while being used.
   * @returns {string|false} The id of an active gamepad, or false when all
   *   are idle right now.
   */
  activeGamepadId() {
    var connected = navigator.getGamepads();
    var result = false;
    for (var d = 0; d < connected.length; d++) {
      var device = connected[d];
      if (device == null) {
        continue;
      }
      var active = false;
      for (var b = 0; b < device.buttons.length && !active; b++) {
        active = device.buttons[b].pressed;
      }
      for (var a = 0; a < device.axes.length && !active; a++) {
        active = Math.abs(device.axes[a]) > 0.5;
      }
      if (active) {
        if (device.id == this.selectionGamepad) {
          return device.id;
        }
        if (result === false) {
          result = device.id;
        }
      }
    }
    return result;
  } // activeGamepadId

  /**
   * Makes another gamepad the selected one and refreshes everything that
   * shows it: the sliding name label (restarted, in case the new name is long)
   * and the displayed bindings, incl. the group visibility for its
   * configured/notConfigured state.
   * @param {string} gamepadId - The id of the newly selected gamepad.
   */
  switchSelectionGamepad(gamepadId) {
    this.selectionGamepad = gamepadId;
    this.controlsEntites.gpLabel.setText(this.selectionGamepadName());
    this.controlsEntites.gpLabel.resetAnimation();
    this.gamepadActionsUpdate();
  } // switchSelectionGamepad

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
   * Opens the remap dialog for a device as the panel's modal: the window
   * (ZXDialogEntity) placed and coloured by the `remapKeys` properties, with
   * ZXRemapKeysEntity as its contents.
   * @param {Object} options - The device definition (`options.keyboard`, `.mouse`, `.gamepads`).
   */
  openRemapKeys(options) {
    var p = this.properties.remapKeys;
    this.addModalEntity(new ZXDialogEntity(this, p.x, p.y, p.width, p.height, 'REMAP '+options.device+' KEYS', p, (dialog) => new ZXRemapKeysEntity(dialog, dialog.innerX, dialog.innerY, dialog.innerWidth, dialog.innerHeight, options, p)));
  } // openRemapKeys

  /**
   * Handles input and UI events for the panel: device navigation, opening remap and
   * gamepad dialogs, enabling/disabling the mouse, ignoring gamepads, cycling
   * touchscreen layouts and toggling the display style (sharp/retro).
   * @param {Object} event - The event object, including its id and key fields.
   * @returns {boolean} True if the event was handled.
   */
  handleEvent(event) {
    // While the gamepad tab is shown (and no dialog is open above), the
    // selection follows the user's hands: a Gamepad* press coming from a
    // different gamepad than the selected one switches the selection to it
    // and is swallowed, so it cannot trigger anything else — the panel gets
    // the event before its buttons do. Presses on a not-yet-configured
    // gamepad emit no events at all; those are caught by polling in
    // loopEntity instead.
    if (this.modalEntity == null && event.id == 'keyPress' && String(event.key).substring(0, 7) == 'Gamepad' && this.devices[this.selectionDevice].type == 'gamepad') {
      var activeId = this.activeGamepadId();
      if (activeId !== false && activeId !== this.selectionGamepad) {
        this.switchSelectionGamepad(activeId);
        return true;
      }
    }

    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'closeZXSettings':
        this.destroy();
        this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
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
        this.openRemapKeys(this.options.keyboard);
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
        this.openRemapKeys(this.options.mouse);
        return true;

      case 'selectingGamepad':
        // the list drops down from the selected gamepad's label (keysX, 7,
        // rightX-keysX x 9): 2 px of the label stay visible above it and 2 px at
        // its right, and the window is centred in the panel — so its left edge
        // is as far from the left as its right edge from the right. The
        // properties give the height and the colours
        var p = this.properties.selectingGamepad;
        var x = this.width-this.rightX+2;
        this.addModalEntity(new ZXDialogEntity(this, x, 9, this.rightX-2-x, p.height, false, p, (dialog) => new ZXSelectingGamepadEntity(dialog, dialog.innerX, dialog.innerY, dialog.innerWidth, dialog.innerHeight, this.selectionGamepad, p)));
        return true;

      case 'changeSelectionGamepad':
        this.switchSelectionGamepad(event.selectionGamepad);
        return true;

      case 'gamepadRemapKeys':
        this.app.inputEventsManager.gamepadsConfig = this.selectionGamepad;
        this.openRemapKeys(this.options.gamepads);
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

      case 'displayStyleChange':
        var newStyle = (this.app.layout.displayStyle == 'retro') ? 'sharp' : 'retro';
        Tool.writeCookie('displayStyle', newStyle);
        // the layout constructor reads the cookie only at startup, so apply
        // the new style directly and force a resize to switch it immediately
        this.app.layout.displayStyle = newStyle;
        this.app.resizeRequested = true;
        this.sendEvent(0, 0, {id: 'updateEntity', member: 'display.style', text: newStyle.toUpperCase()});
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
    // Activity-based gamepad switching for presses that emit no events (a
    // not-yet-configured or unbound control) — see handleEvent for the
    // event-emitting ones, which are switched and swallowed there.
    if (this.modalEntity == null && this.devices[this.selectionDevice].type == 'gamepad') {
      var activeId = this.activeGamepadId();
      if (activeId !== false && activeId !== this.selectionGamepad) {
        this.switchSelectionGamepad(activeId);
      }
    }

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

} // ZXSettingsEntity
