const { C64DialogProperties } = await import('./c64DialogProperties.js?ver='+window.srcVersion);
const { PlayerNameEntity } = await import('../dialogs/playerNameEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The Commodore 64 look of PlayerNameEntity: the properties are completed
 * from C64DialogProperties (the machine's 8x8 for the prompt, the input and
 * the keys, 3x3 for the wide keys' labels), and the keyboard is the C64's
 * own — the number row with `+ - £`, CLR/HOME (HOME, CLR with SHIFT) and
 * INST/DEL (DEL, INST with SHIFT), the Q row with `@ *` and two blank keys
 * where ↑ and RESTORE sit, and
 * the A row with `: ; =` and RETURN, the bottom row as the machine's — SHIFT,
 * the letters, a second SHIFT and the two cursor keys (down and right, up
 * and left with SHIFT); the Commodore key is left out, its graphics are
 * nothing a name needs — and the space bar on a row of its own; the
 * upper case plain and the lower case with SHIFT (the opposite of the
 * machine's typewriter, the operator's choice), along with the shifted
 * symbols. The lower case
 * needs the ROM's second set (`c64Fonts8x8Lower`, C64DialogProperties). A
 * thin wrapper (R-056).
 */
export class C64PlayerNameEntity extends PlayerNameEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity that owns this dialog.
   * @param {number} x - X position of the dialog.
   * @param {number} y - Y position of the dialog.
   * @param {number} width - Dialog width.
   * @param {number} height - Dialog height.
   * @param {boolean} autoStartGame - Whether confirming the name should start the game immediately.
   * @param {Object} [properties] - The dialog properties, see C64DialogProperties.
   */
  constructor(parentEntity, x, y, width, height, autoStartGame, properties = {}) {
    super(parentEntity, x, y, width, height, autoStartGame, C64DialogProperties.merge(properties));
    this.id = 'C64PlayerNameEntity';
  } // constructor

  /**
   * The C64's keyboard: the plain layout's keys and layers with the
   * machine's rows over them.
   * @param {Object} fonts - See PlayerNameEntity#fonts.
   * @returns {Object} The layout for KeyboardEntity.
   */
  keyboardLayoutDefaults(fonts) {
    var layout = super.keyboardLayoutDefaults(fonts);
    var size = layout.options.buttons.default.width;
    // INST/DEL is one key that reads DEL, and INST with SHIFT held: two keys of the layout on the same place,
    // the same width, the SHIFT layer's one sending Insert (a space pushed in at the cursor, InputEntity)
    layout.options.fnKeys['⎀'] = 'Insert';
    var del = PlayerNameEntity.wideKey(fonts, 'DEL', size), inst = PlayerNameEntity.wideKey(fonts, 'INST', size);
    del.width = inst.width = Math.max(del.width, inst.width);
    // CLR/HOME the same way: HOME (the cursor to the start) plain, CLR (the whole name gone) with SHIFT
    layout.options.fnKeys['⌂'] = 'Home';
    layout.options.fnKeys['⌧'] = 'Clear';
    var home = PlayerNameEntity.wideKey(fonts, 'HOME', size), clr = PlayerNameEntity.wideKey(fonts, 'CLR', size);
    home.width = clr.width = Math.max(home.width, clr.width);
    Object.assign(layout.options.buttons, {
      '⌫': del,
      '⎀': inst,
      '⌂': home,
      '⌧': clr,
      '⏎': PlayerNameEntity.wideKey(fonts, 'RETURN', size),
      '⇧': PlayerNameEntity.wideKey(fonts, 'SHIFT', size),
      ' ': PlayerNameEntity.wideKey(fonts, 'SPACE', size)
    });
    // the Q row ends as the machine's: after `*` the ↑ key and RESTORE, both blank here (no character, no function),
    // the last one as wide as it takes to end flush with DEL
    // the blank keys at the left of the rows (← before 1, CTRL before Q, RUN/STOP and SHIFT LOCK before A, the
    // Commodore key before SHIFT) stagger the rows as the machine's keys do; the rows start flush
    // the ← key before 1 is 3 px wider than a key and CTRL before Q 7 px wider, as the machine's are
    layout.options.fnKeys['⇠'] = false;
    layout.options.fnKeys['⌃'] = false;
    layout.options.buttons['⇠'] = {width: size+3};
    layout.options.buttons['⌃'] = {width: size+7};
    var rowWidth = (size+3+1)+13*(size+1)+home.width+1+del.width;
    layout.options.fnKeys['⌁'] = false;
    layout.options.buttons['⌁'] = {width: rowWidth-(size+7+1)-13*(size+1)};
    // RETURN 5 px and the two SHIFTs 3 px wider than their labels ask (operator 2026-10-21)
    layout.options.buttons['⏎'].width += 5;
    layout.options.buttons['⇧'].width += 3;
    // the space bar on a row of its own under the rest, as the machine has it: from 2 px past the start of Z to
    // 2 px past the end of `/` (ten keys from Z)
    var zX = (size+1)+layout.options.buttons['⇧'].width+1;
    layout.options.buttons[' '].width = 10*(size+1)-1+2;
    layout.options.rows = [{shiftX: 4}, {shiftX: 4}, {shiftX: 0}, {shiftX: 0}, {shiftX: zX+6}];   // the top two rows 4 px right, the space bar 4 px right of its place and 2 px wider (operator 2026-10-21)
    // upper case plain and lower case with SHIFT (the operator's choice 2026-10-21 — a name is mostly typed in
    // capitals; the machine's typewriter has it the other way round), the shifted symbols and the cursor keys
    // up/left on the SHIFT layer
    // no Commodore key: on the machine it gives the graphics of the keys' left sides, nothing a name needs
    delete layout.options.shiftKeys['⌥'];
    delete layout.options.buttons['⌥'];
    layout.keymap = {
      ' ': [
        ['⇠','1','2','3','4','5','6','7','8','9','0','+','-','£','⌂','⌫'],
        ['⌃','Q','W','E','R','T','Y','U','I','O','P','@','*','∅','⌁'],
        ['∅','∅','A','S','D','F','G','H','J','K','L',':',';','=','⏎'],
        ['∅','⇧','Z','X','C','V','B','N','M',',','.','/','⇧','↓','→'],
        [' ']
      ],
      '⇧': [
        ['⇠','!','"','#','$','%','&','\'','(',')','0','∅','∅','∅','⌧','⎀'],
        ['⌃','q','w','e','r','t','y','u','i','o','p','∅','∅','∅','⌁'],
        ['∅','∅','a','s','d','f','g','h','j','k','l','[',']','∅','⏎'],
        ['∅','⇧','z','x','c','v','b','n','m','<','>','?','⇧','↑','←'],
        [' ']
      ]
    };
    return layout;
  } // keyboardLayoutDefaults

} // C64PlayerNameEntity
