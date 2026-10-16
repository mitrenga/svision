// begin code

/**
 * The controls of a DOS game of the VGA era, as the library's control tables.
 *
 * Every game in the library describes its controls twice: `controlsOptions`
 * (what the settings dialog lists — actions, labels, gamepad event keys) and
 * the default bindings `getControls()` hands back when no cookie overrides
 * them. Both are plain objects that every project used to write out by hand,
 * so here the shape is built from one compact list of actions.
 *
 * ## What the PC had
 *
 * A keyboard, and a joystick on the game port — two buttons, two axes, read
 * through BIOS INT 15h or the port at 201h. Prince of Persia's manual names
 * the cursor keys for the four directions, Shift for the action (careful
 * step, grab a ledge, drink, sword) and the diagonals of the **numeric
 * keypad**: 7 and 9 to jump left and right, 1 and 3 to step down. Home, PgUp,
 * End and PgDn are what those keypad keys send with Num Lock off, and both
 * spellings are honoured here. Gobliiins used the mouse and the mouse only;
 * the library reports mouse buttons as keys `Mouse1`…, so a point-and-click
 * game binds those.
 *
 * ```js
 * this.controlsOptions = VGAControls.controlsOptions(VGAControls.PRINCE);
 * ...
 * case 'keyboard': result = VGAControls.defaultControls('keyboard', VGAControls.PRINCE);
 * ```
 *
 * Touch controls are not here: the on-screen joystick of a touch layout needs
 * the game's own sprites for its icons, so a game adds its `touchscreen`
 * object next to the ones built here.
 */
export class VGAControls {

  /**
   * The actions of Prince of Persia: cursor keys, Shift, and the joystick's
   * two buttons (button A for the action, button B unused in the original and
   * left to the game).
   * @returns {Object[]} The action list, see {@link VGAControls.controlsOptions}.
   */
  static get PRINCE() {
    return [
      {action: 'left', label: 'LEFT', keyboard: 'ArrowLeft', gamepad: 'GamepadLeft'},
      {action: 'right', label: 'RIGHT', keyboard: 'ArrowRight', gamepad: 'GamepadRight'},
      {action: 'up', label: 'UP / JUMP', keyboard: 'ArrowUp', gamepad: 'GamepadUp'},
      {action: 'down', label: 'DOWN / CROUCH', keyboard: 'ArrowDown', gamepad: 'GamepadDown'},
      {action: 'shift', label: 'SHIFT (ACTION)', keyboard: 'Shift', gamepad: 'GamepadJump'},
      {action: 'pause', label: 'PAUSE', keyboard: 'Escape', gamepad: 'GamepadExit', menu: true},
      {action: 'ok', label: 'OK', keyboard: 'Enter', gamepad: 'GamepadOK', menu: true},
      {action: 'music', label: 'MUTE MUSIC', keyboard: 'M'},
      {action: 'sounds', label: 'MUTE SOUNDS', keyboard: 'S'}
    ];
  } // PRINCE

  /**
   * The actions of a point-and-click game: the two mouse buttons, and cursor
   * keys with a gamepad for those who have no mouse.
   * @returns {Object[]} The action list.
   */
  static get POINT_AND_CLICK() {
    return [
      {action: 'click', label: 'ACTION', keyboard: 'Enter', mouse: 'Mouse1', gamepad: 'GamepadJump'},
      {action: 'look', label: 'SECOND ACTION', keyboard: ' ', mouse: 'Mouse2', gamepad: 'GamepadOK'},
      {action: 'left', label: 'CURSOR LEFT', keyboard: 'ArrowLeft', gamepad: 'GamepadLeft'},
      {action: 'right', label: 'CURSOR RIGHT', keyboard: 'ArrowRight', gamepad: 'GamepadRight'},
      {action: 'up', label: 'CURSOR UP', keyboard: 'ArrowUp', gamepad: 'GamepadUp'},
      {action: 'down', label: 'CURSOR DOWN', keyboard: 'ArrowDown', gamepad: 'GamepadDown'},
      {action: 'pause', label: 'MENU', keyboard: 'Escape', gamepad: 'GamepadExit', menu: true},
      {action: 'music', label: 'MUTE MUSIC', keyboard: 'M'},
      {action: 'sounds', label: 'MUTE SOUNDS', keyboard: 'S'}
    ];
  } // POINT_AND_CLICK

  /**
   * The numeric keypad as the games read it: a key → the direction actions it
   * stands for, in both its Num Lock spellings. 5 is the centre and does
   * nothing; the cursor keys themselves are bound through the action list.
   * @returns {Object} key → array of action names.
   */
  static get NUMPAD() {
    return {
      '7': ['up', 'left'], '8': ['up'], '9': ['up', 'right'],
      '4': ['left'], '6': ['right'],
      '1': ['down', 'left'], '2': ['down'], '3': ['down', 'right'],
      'Home': ['up', 'left'], 'PageUp': ['up', 'right'],
      'End': ['down', 'left'], 'PageDown': ['down', 'right']
    };
  } // NUMPAD

  /**
   * The direction actions a keypad key stands for, or null for any other key.
   * A game feeds every `keyPress`/`keyRelease` through this before its own
   * bindings, so that the keypad diagonals work as the manual says.
   * @param {string} key - The `event.key` the library reports.
   * @returns {string[]|null} The actions — one or two of 'up', 'down', 'left', 'right'.
   */
  static numpadActions(key) {
    var table = VGAControls.NUMPAD;
    return key in table ? table[key] : null;
  } // numpadActions

  /**
   * Builds the `controlsOptions` object the settings dialog reads, from an
   * action list. Actions without a `keyboard` key are left out of the
   * keyboard device, and so on for `mouse` and `gamepad`.
   * @param {Object[]} actions - Entries {action, label, keyboard?, mouse?, gamepad?}.
   * @returns {Object} {keyboard, mouse, gamepads}, each {device, keys: [...]}.
   */
  static controlsOptions(actions) {
    var options = {
      keyboard: {device: 'keyboard', keys: []},
      mouse: {device: 'mouse', keys: []},
      gamepads: {device: 'gamepads', keys: []}
    };
    actions.forEach((entry) => {
      if (entry.keyboard !== undefined) {
        options.keyboard.keys.push({action: entry.action, label: entry.label});
      }
      if (entry.mouse !== undefined) {
        options.mouse.keys.push({action: entry.action, label: entry.label});
      }
      if (entry.gamepad !== undefined) {
        options.gamepads.keys.push({action: entry.action, label: entry.label, eventKey: entry.gamepad});
      }
    });
    return options;
  } // controlsOptions

  /**
   * Builds the default bindings of one device from an action list — what a
   * game's `getControls(device)` starts from before the cookie overrides it.
   * @param {string} device - 'keyboard', 'mouse' or 'gamepads'.
   * @param {Object[]} actions - The same list as for {@link VGAControls.controlsOptions}.
   * @returns {Object} action → key for the keyboard and mouse (the mouse with
   *          `enable: false`); {supported: false, devices: {}} for gamepads.
   */
  static defaultControls(device, actions) {
    var result = {};
    switch (device) {
      case 'keyboard':
        actions.forEach((entry) => {
          if (entry.keyboard !== undefined) {
            result[entry.action] = entry.keyboard;
          }
        });
        break;
      case 'mouse':
        result.enable = false;
        actions.forEach((entry) => {
          if (entry.mouse !== undefined) {
            result[entry.action] = entry.mouse;
          }
        });
        break;
      case 'gamepads':
        result = {supported: false, devices: {}};
        break;
    }
    return result;
  } // defaultControls

  /**
   * The action a reported key stands for under the current bindings — the
   * switch every game model writes in its `keyPress` handler, done once. A
   * gamepad event key matches by the action list, a keyboard key by the
   * bindings; letters compare case-insensitively, as the models do.
   * @param {string} key - The `event.key` the library reports.
   * @param {Object} keyboard - The current keyboard bindings, action → key.
   * @param {Object[]} actions - The action list, for the gamepad event keys.
   * @returns {string|null} The action, or null for a key bound to nothing.
   */
  static actionOf(key, keyboard, actions) {
    var pressed = key.length === 1 ? key.toUpperCase() : key;
    var found = null;
    Object.keys(keyboard).forEach((action) => {
      var bound = keyboard[action];
      if (typeof bound === 'string' && (bound.length === 1 ? bound.toUpperCase() : bound) === pressed) {
        found = action;
      }
    });
    if (found === null) {
      actions.forEach((entry) => {
        if (entry.gamepad === key || entry.mouse === key) {
          found = entry.action;
        }
      });
    }
    return found;
  } // actionOf

} // VGAControls
