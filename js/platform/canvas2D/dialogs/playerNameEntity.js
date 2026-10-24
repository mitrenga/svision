const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { InputEntity } = await import('../inputEntity.js?ver='+window.srcVersion);
const { KeyboardEntity } = await import('../keyboardEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { DialogProperties } = await import('./dialogProperties.js?ver='+window.srcVersion);
const { DialogTheme } = await import('./dialogTheme.js?ver='+window.srcVersion);
// begin code

/**
 * Dialog for entering the player's name (R-056; the platform wrappers are
 * ZXPlayerNameEntity, C64PlayerNameEntity, Atari8PlayerNameEntity). Renders
 * a text input with a character counter and an on-screen keyboard, with the
 * theme's `inputPrompt` over them (none on the C64), then
 * persists the name and optionally starts the game on confirmation.
 *
 * Contents only, no frame and no title: a game puts it into a window
 * (DialogEntity) or onto its screen and colours it through the `theme` of
 * its dialog properties (DialogProperties), whose fonts it is in:
 * `inputFont` for the prompt and the input, `keyboardFont` for the caps of
 * the keys, `keyboardLabelFont` for the labels of the wide keys,
 * `counterFont` for the counter (the 5x5 without one), `buttonFont` for
 * CANCEL and OK. The layout is computed
 * from them: a key is twice the caps' height square, a wide key as wide as
 * its label; the block of prompt, input and keyboard — the keyboard as big
 * as its layout — stays centred over the buttons, which are the button
 * font's height plus 8 at the bottom right, `buttonsBottomMargin` over the
 * edge. The keyboard is the plain one
 * of {@link #keyboardLayoutDefaults}, which a wrapper replaces (the ZX
 * Spectrum's with CAPS SHIFT and SYMBOL SHIFT) and the theme's
 * `keyboardLayout` alters. CANCEL and OK send a 'contentClosed' event to
 * the parent so a window can close with it.
 */
export class PlayerNameEntity extends AbstractEntity {

  /**
   * Creates the player-name dialog.
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {boolean} autoStartGame - Whether confirming the name should start the game immediately.
   * @param {Object} [properties] - The dialog properties, see DialogProperties; the dialog uses `theme` (the colours, the fonts and `keyboardLayout`).
   */
  constructor(parentEntity, x, y, width, height, autoStartGame, properties = {}) {
    properties = DialogProperties.merge(properties);
    var theme = properties.theme;
    super(parentEntity, x, y, width, height, false, theme.bkColor);
    this.id = 'PlayerNameEntity';

    this.properties = properties;
    this.theme = theme;
    this.maxNameChars = 15;
    this.inputEntity = null;
    this.charsCounter = null;
    this.autoStartGame = autoStartGame;
    this.keyboardLayout = null;
  } // constructor

  /**
   * The fonts of the dialog, resolved from the theme.
   * @returns {Object} `{label, button, input, keys, keyLabels, arrows, counter}` — `arrows` the first of the keys', the label and the input font that has the arrow glyphs, `counter` the theme's or the 5x5.
   */
  fonts() {
    var t = this.theme;
    var label = DialogTheme.font(this.app, t.labelFont);
    var input = t.inputFont ? DialogTheme.font(this.app, t.inputFont) : label;
    var keys = t.keyboardFont ? DialogTheme.font(this.app, t.keyboardFont) : input;
    var keyLabels = t.keyboardLabelFont ? DialogTheme.font(this.app, t.keyboardLabelFont) : label;
    // the ROM of the C64 has ← and ↑ alone, so a font is taken only with all four arrows (R-Type's own has them)
    var arrows = [keys, label, input].find((f) => ['←', '→', '↑', '↓'].every((a) => f.validChar(a))) || keys;
    // the counter: the theme's `counterFont`, the library's 5x5 without one (the ZX dialog's; C64 the machine's)
    var counter = t.counterFont ? DialogTheme.font(this.app, t.counterFont) : (this.app.fonts.fonts5x5 || label);
    return {label: label, button: DialogTheme.font(this.app, t.buttonFont), input: input, keys: keys, keyLabels: keyLabels, arrows: arrows, counter: counter};
  } // fonts

  /**
   * A wide key of the keyboard: as wide as its label (one or two lines in
   * the key labels' font) plus 4, the label centred.
   * @param {Object} fonts - See {@link #fonts}.
   * @param {string} label - The label, '\n' between its lines.
   * @param {number} keySize - The square keys' size.
   * @param {Object} [more] - Other options of the key.
   * @returns {Object} The key's options for the layout.
   */
  static wideKey(fonts, label, keySize, more) {
    var lines = label.split('\n');
    var f = fonts.keyLabels;
    var width = Math.max(keySize, Math.max.apply(null, lines.map((line) => DialogTheme.textWidth(f, line)))+4);
    var height = lines.length*f.charsHeight+(lines.length-1)*f.lineSpacing;
    return Object.assign({label: label, width: width, fonts: f, topMargin: Math.max(0, Math.floor((keySize-height)/2))}, more || {});
  } // wideKey

  /**
   * The keyboard the dialog comes with: a plain QWERTY of four rows with
   * SHIFT and SYM layers, square keys of twice the caps' height, the wide
   * keys labelled in the key labels' font. A platform wrapper returns its
   * machine's keyboard instead; the theme's `keyboardLayout` alters either.
   * @param {Object} fonts - See {@link #fonts}.
   * @returns {Object} The layout for KeyboardEntity.
   */
  keyboardLayoutDefaults(fonts) {
    var theme = this.theme;
    var size = fonts.keys.charsHeight*2;
    var arrow = {fonts: fonts.arrows, topMargin: Math.floor((size-fonts.arrows.charsHeight)/2)};
    return {
      options: {
        fnKeys: {
          '∅': false,
          '⏎': 'Enter',
          '⌫': 'Backspace',
          '←': 'ArrowLeft',
          '↓': 'ArrowDown',
          '↑': 'ArrowUp',
          '→': 'ArrowRight'
        },
        shiftKeys: {
          '⇧': {activeBkColor: theme.keyboardButtonsShiftColor},
          '⌥': {activeBkColor: theme.keyboardButtonsShiftColor}
        },
        buttons: {
          default: {
            width: size, height: size, keySpacing: 1, align: 'center', topMargin: Math.floor((size-fonts.keys.charsHeight)/2),
            fonts: fonts.keys,
            penColor: theme.keyboardButtonsPenColor,
            bkColor: theme.keyboardButtonsBkColor,
            hoverColor: theme.keyboardButtonsHoverColor,
            clickColor: theme.keyboardButtonsClickColor
          },
          '←': arrow, '↓': arrow, '↑': arrow, '→': arrow,
          '⌫': PlayerNameEntity.wideKey(fonts, 'DELETE', size),
          '⏎': PlayerNameEntity.wideKey(fonts, 'ENTER', size),
          '⇧': PlayerNameEntity.wideKey(fonts, 'SHIFT', size),
          '⌥': PlayerNameEntity.wideKey(fonts, 'SYM', size),
          ' ': PlayerNameEntity.wideKey(fonts, 'SPACE', size)
        },
        rows: [{shiftX: 0}, {shiftX: Math.floor(size*9/16)}, {shiftX: Math.floor(size*18/16)}, {shiftX: 0}]
      },
      keymap: {
        ' ': [
          ['1','2','3','4','5','6','7','8','9','0'],
          ['q','w','e','r','t','y','u','i','o','p'],
          ['a','s','d','f','g','h','j','k','l', '⏎'],
          ['⇧', 'z','x','c','v','b','n','m', '⌥', ' ']
        ],
        '⇧': [
          ['∅','∅','∅','∅','←','↓','↑','→','∅','⌫'],
          ['Q','W','E','R','T','Y','U','I','O','P'],
          ['A','S','D','F','G','H','J','K','L', '⏎'],
          ['⇧', 'Z','X','C','V','B','N','M', '⌥', ' ']
        ],
        '⌥': [
          ['!','@','#','$','%','&','\'','(',')','_'],
          ['~','∅','∅','<','>','{','}','∅',';','"'],
          ['|','∅','∅','[',']','∅','-','+','=', '⏎'],
          ['⇧', ':','£','?','/','*',',','.', '⌥', ' ']
        ]
      }
    };
  } // keyboardLayoutDefaults

  /**
   * Builds the dialog contents: prompt, name input, character counter,
   * on-screen keyboard and the cancel/confirm buttons.
   */
  init() {
    super.init();
    var fonts = this.fonts();
    this.keyboardLayout = DialogTheme.keyboardLayout(this.keyboardLayoutDefaults(fonts), this.theme.keyboardLayout);

    var buttonHeight = fonts.button.charsHeight+8;
    var buttonY = this.height-buttonHeight-this.theme.buttonsBottomMargin;   // CANCEL and OK 2 px over the bottom edge, on it on the C64 (the theme)
    var fh = fonts.input.charsHeight;
    // the block of the prompt, the input and the keyboard — the keyboard as big
    // as its layout and centred — sits centred between the top and the buttons,
    // so another height or keyboard moves it as a whole; at 200 x 124 with the
    // ZX keyboard of 194 x 67 that is the prompt at 9, the input at 19 and the
    // keyboard at 33
    var keyboardSize = KeyboardEntity.measure(this.keyboardLayout);
    var keyboardX = Math.floor((this.width-keyboardSize.width)/2);
    // the block of the prompt (when the theme has one — the C64's has none), the input and the keyboard,
    // centred over the buttons and moved by the theme's `inputBlockShift` — never above the top: a tall
    // keyboard (the C64's five rows) takes what it needs
    var prompt = this.theme.inputPrompt;
    var promptHeight = prompt ? fh+2 : 0;
    var keyboardOffset = promptHeight+fh+9;
    var blockY = Math.max(0, Math.floor((buttonY-(keyboardOffset+keyboardSize.height))/2)+this.theme.inputBlockShift);
    var inputY = blockY+promptHeight;
    var keyboardY = blockY+keyboardOffset-2+this.theme.keyboardShift;   // the theme moves the keyboard alone too (the C64's a pixel up)
    var counterWidth = DialogTheme.textWidth(fonts.counter, this.maxNameChars+'/'+this.maxNameChars)+6;

    if (prompt) {
      this.addEntity(new TextEntity(this, fonts.input, 3, blockY, this.width-6, fh, prompt, this.theme.penColor, false, {}));
    }
    // the input and the counter a pixel taller than the font, the text a pixel down (operator 2026-10-21)
    var inputHeight = fh+1;
    this.inputEntity = new InputEntity(this.app, fonts.input, 3, inputY, this.width-6-counterWidth-3, inputHeight, 'playerName', this.app.playerName, this.theme.inputPenColor, this.theme.inputBkColor, this.maxNameChars, {leftMargin: 1, topMargin: 1, cursorChar: this.theme.inputCursor || '‗', overwrite: !!this.theme.inputOverwrite});
    this.addEntity(this.inputEntity);
    this.charsCounter = new TextEntity(this, fonts.counter, this.width-3-counterWidth, inputY, counterWidth, inputHeight, this.inputEntity.value.length+'/'+this.maxNameChars, this.theme.inputPenColor, this.theme.inputBkColor, {align: 'right', rightMargin: 1, topMargin: 1+Math.max(0, Math.floor((fh-fonts.counter.charsHeight)/2))});
    this.addEntity(this.charsCounter);

    this.addEntity(new KeyboardEntity(this, keyboardX, keyboardY, keyboardSize.width, keyboardSize.height, this.keyboardLayout, false));

    // CANCEL and OK, as wide as CANCEL plus 15, OK 3 px from the right edge, CANCEL 2 px left of it
    var buttonWidth = DialogTheme.textWidth(fonts.button, 'CANCEL')+15;
    var topMargin = Math.floor((buttonHeight-fonts.button.charsHeight)/2);
    this.addEntity(new ButtonEntity(this, fonts.button, this.width-3-buttonWidth-2-buttonWidth, buttonY, buttonWidth, buttonHeight, 'CANCEL', {id: 'closePlayerName'}, ['Escape', 'GamepadExit'], this.theme.buttonPenColor, this.theme.dangerButtonColor, {align: 'center', topMargin: topMargin}));
    this.addEntity(new ButtonEntity(this, fonts.button, this.width-3-buttonWidth, buttonY, buttonWidth, buttonHeight, 'OK', {id: 'savePlayerName'}, ['Enter', 'GamepadOK'], this.theme.buttonPenColor, this.theme.okButtonColor, {align: 'center', topMargin: topMargin}));
  } // init

  /**
   * Handles the dialog's events: closing it, updating the character counter as the
   * input changes, and saving the name (then starting the game or refreshing the menu).
   * @param {Object} event - The event object, including its id and inputId fields.
   * @returns {boolean} True if the event was handled.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'closePlayerName':
        this.destroy();
        this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
        return true;

      case 'changeInputValue':
        if (event.inputId == 'playerName') {
          this.charsCounter.setText(this.inputEntity.value.length+'/'+this.maxNameChars);
          return true;
        }
        break;

      case 'savePlayerName':
        if (this.inputEntity.value.length > 0) {
          this.app.playerName = this.inputEntity.value;
          Tool.writeCookie('playerName', this.app.playerName);
          if (this.autoStartGame) {
            this.sendEvent(0, 0, {id: 'startGame'});
          } else {
            this.sendEvent(0, 0, {id: 'refreshMenu'});
            this.destroy();
            this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
          }
        }
        return true;
    }

    return false;
  } // handleEvent

} // PlayerNameEntity
