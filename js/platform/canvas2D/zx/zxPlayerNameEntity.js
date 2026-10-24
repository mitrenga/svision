const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { InputEntity } = await import('../inputEntity.js?ver='+window.srcVersion);
const { KeyboardEntity } = await import('../keyboardEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { Tool } = await import('../../../tool.js?ver='+window.srcVersion);
const { ZXColor } = await import('./zxColor.js?ver='+window.srcVersion);
const { ZXDialogTheme } = await import('./zxDialogTheme.js?ver='+window.srcVersion);
const { ZXDialogProperties } = await import('./zxDialogProperties.js?ver='+window.srcVersion);
// begin code

/**
 * ZX Spectrum themed dialog for entering the player's name. Renders a text input
 * with a character counter and an on-screen Spectrum-style keyboard, then persists
 * the name and optionally starts the game on confirmation.
 *
 * Contents only, no frame and no title: a game puts it into a window
 * (ZXDialogEntity) or onto its screen and colours it through the `theme` of
 * its dialog properties (ZXDialogProperties). The
 * layout is made for 200 x 124 px; in another height the block of prompt,
 * input and keyboard stays centred over the buttons, and the keyboard is
 * centred and as big as its layout, which the theme's `keyboardLayout` may
 * alter. CANCEL and OK send a 'contentClosed' event to
 * the parent so a window can close with it.
 */
export class ZXPlayerNameEntity extends AbstractEntity {

  /**
   * Creates the player-name dialog and defines its on-screen keyboard layout.
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {boolean} autoStartGame - Whether confirming the name should start the game immediately.
   * @param {Object} [properties] - The dialog properties, see ZXDialogProperties; the dialog uses `theme` (the colours and `keyboardLayout`).
   */
  constructor(parentEntity, x, y, width, height, autoStartGame, properties = {}) {
    properties = ZXDialogProperties.merge(properties);
    var theme = properties.theme;
    super(parentEntity, x, y, width, height, false, theme.bkColor);
    this.id = 'ZXPlayerNameEntity';

    this.properties = properties;
    this.theme = theme;
    this.maxNameChars = 15;
    this.inputEntity = null;
    this.charsCounter = null;
    this.autoStartGame = autoStartGame;

    // the ZX Spectrum keyboard; the theme's `keyboardLayout` alters it or
    // replaces it (ZXDialogTheme.keyboardLayout)
    this.keyboardLayout = ZXDialogTheme.keyboardLayout({
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
            width: 16, height: 16, keySpacing: 1, align: 'center', topMargin: 4,
            fonts: this.app.fonts.zxFonts8x8Keys,
            penColor: theme.keyboardButtonsPenColor,
            bkColor: theme.keyboardButtonsBkColor,
            hoverColor: theme.keyboardButtonsHoverColor,
            clickColor: theme.keyboardButtonsClickColor
          },

          '←': {fonts: this.app.fonts.fonts5x5, topMargin: 6},
          '↓': {fonts: this.app.fonts.fonts5x5, topMargin: 6},
          '↑': {fonts: this.app.fonts.fonts5x5, topMargin: 6},
          '→': {fonts: this.app.fonts.fonts5x5, topMargin: 6},
          '⌫': {label: 'DELETE', width: 25, fonts: this.app.fonts.fonts3x3, topMargin: 7},
          '⏎': {label: 'ENTER', width: 23, fonts: this.app.fonts.fonts3x3, topMargin: 7},
          '⇧': {label: 'CAPS\nSHIFT', width: 23, fonts: this.app.fonts.fonts3x3},
          '⌥': {label: 'SYMBOL\nSHIFT', width: 25, penColor: ZXColor.brightRed, fonts: this.app.fonts.fonts3x3},
          ' ': {label: 'SPACE', width: 25, fonts: this.app.fonts.fonts3x3, topMargin: 7},
        },
        rows: [{shiftX: 0}, {shiftX: 9}, {shiftX: 18}, {shiftX: 0}]
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
    }, theme.keyboardLayout);
  } // constructor

  /**
   * Builds the dialog contents: prompt, name input, character counter,
   * on-screen keyboard and the cancel/confirm buttons.
   */
  init() {
    super.init();


    // the block of the prompt, the input and the keyboard — the keyboard as big
    // as its layout and centred — sits centred between the top and the buttons
    // (at height-15), so another height or keyboard moves it as a whole; at
    // 200 x 124 with the default keyboard of 194 x 67 that is the prompt at 9,
    // the input at 19 and the keyboard at 33
    var keyboardSize = KeyboardEntity.measure(this.keyboardLayout);
    var keyboardX = Math.floor((this.width-keyboardSize.width)/2);
    var blockY = Math.floor((this.height-15-(24+keyboardSize.height))/2);
    var keyboardY = blockY+24;

    this.addEntity(new TextEntity(this, this.app.fonts.zxFonts8x8, 3, blockY, this.width-6, 8, 'Enter your player name:', this.theme.penColor, false, {}));
    this.inputEntity = new InputEntity(this.app, this.app.fonts.zxFonts8x8, 3, blockY+10, this.width-36, 8, 'playerName', this.app.playerName, this.theme.inputPenColor, this.theme.inputBkColor, this.maxNameChars, {leftMargin: 1});
    this.addEntity(this.inputEntity);
    this.charsCounter = new TextEntity(this, this.app.fonts.fonts5x5, this.width-33, blockY+10, 30, 8, this.inputEntity.value.length+'/'+this.maxNameChars, this.theme.inputPenColor, this.theme.inputBkColor, {align: 'right', rightMargin: 1, topMargin: 2});
    this.addEntity(this.charsCounter);

    this.addEntity(new KeyboardEntity(this, keyboardX, keyboardY, keyboardSize.width, keyboardSize.height, this.keyboardLayout, false));

    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-97, this.height-15, 46, 13, 'CANCEL', {id: 'closeZXPlayerName'}, ['Escape', 'GamepadExit'], this.theme.buttonPenColor, this.theme.dangerButtonColor, {align: 'center', margin: 4}));
    this.addEntity(new ButtonEntity(this, this.app.fonts.fonts5x5, this.width-49, this.height-15, 46, 13, 'OK', {id: 'saveZXPlayerName'}, ['Enter', 'GamepadOK'], this.theme.buttonPenColor, this.theme.okButtonColor, {align: 'center', margin: 4}));
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
      case 'closeZXPlayerName':
        this.destroy();
        this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
        return true;

      case 'changeInputValue':
        if (event.inputId == 'playerName') {
          this.charsCounter.setText(this.inputEntity.value.length+'/'+this.maxNameChars);
          return true;
        }
        break;

      case 'saveZXPlayerName':
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

} // ZXPlayerNameEntity
