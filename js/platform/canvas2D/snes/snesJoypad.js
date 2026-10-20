// begin code

/**
 * The standard controller of the Super Nintendo as the program reads it:
 * twelve buttons in the 16-bit word of the automatic joypad read, `$4219`
 * in the high byte and `$4218` in the low one —
 *
 *     $4219  B Y Select Start Up Down Left Right
 *     $4218  A X L R 0 0 0 0
 *
 * — a pressed button is a set bit. A worker keeps one of these and hands
 * the word to the converted code where the original reads `$4218`; the
 * main thread turns keys, a gamepad and touches into `press`/`release`.
 *
 * The Gamepad API's "standard" layout is the SNES pad's one to one, so
 * {@link SNESJoypad.STANDARD_GAMEPAD} is a table, not code: the button
 * index of a standard gamepad → the name here. The library's own gamepad
 * handling (`inputEventsManager`, SETTINGS) maps physical buttons to event
 * names a game chooses; the table serves a default for a pad that reports
 * the standard mapping.
 *
 * ```js
 * var pad = new SNESJoypad();
 * pad.press('Y').press('Right');
 * pad.word                              // 0x4100
 * SNESJoypad.names(0x4100)              // ['Y', 'Right']
 * ```
 */
export class SNESJoypad {

  /** the bit of every button in the 16-bit word */
  static get BITS() {
    return {B: 0x8000, Y: 0x4000, Select: 0x2000, Start: 0x1000,
            Up: 0x0800, Down: 0x0400, Left: 0x0200, Right: 0x0100,
            A: 0x0080, X: 0x0040, L: 0x0020, R: 0x0010};
  }
  /** the names in the order of their bits, high to low */
  static get NAMES() { return ['B', 'Y', 'Select', 'Start', 'Up', 'Down', 'Left', 'Right', 'A', 'X', 'L', 'R']; }
  /** the button index of a standard-layout gamepad → the SNES button */
  static get STANDARD_GAMEPAD() {
    return {0: 'B', 1: 'A', 2: 'Y', 3: 'X', 4: 'L', 5: 'R', 8: 'Select', 9: 'Start',
            12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right'};
  }
  /** the low nibble of $4218 a real controller answers with (the ID 0000) */
  static get ID_MASK() { return 0xFFF0; }

  constructor() {
    this.id = 'SNESJoypad';
    /** the word as $4219:$4218 */
    this.word = 0;
  } // constructor

  /**
   * The bit of a button.
   * @param {string} name - 'B', 'Y', 'Select', 'Start', 'Up', 'Down', 'Left', 'Right', 'A', 'X', 'L', 'R'.
   * @returns {number} The bit, 0 for an unknown name.
   */
  static bit(name) {
    return SNESJoypad.BITS[name] || 0;
  } // bit

  /**
   * The word of a set of buttons.
   * @param {string[]} names - The buttons held.
   * @returns {number} The 16-bit word.
   */
  static wordOf(names) {
    var word = 0;
    (names || []).forEach((name) => { word |= SNESJoypad.bit(name); });
    return word & SNESJoypad.ID_MASK;
  } // wordOf

  /**
   * The buttons held in a word.
   * @param {number} word - The 16-bit word.
   * @returns {string[]} The names, in bit order.
   */
  static names(word) {
    return SNESJoypad.NAMES.filter((name) => (word & SNESJoypad.BITS[name]) !== 0);
  } // names

  /**
   * Presses a button.
   * @param {string} name - The button.
   * @returns {SNESJoypad} This.
   */
  press(name) {
    this.word = (this.word | SNESJoypad.bit(name)) & SNESJoypad.ID_MASK;
    return this;
  } // press

  /**
   * Releases a button.
   * @param {string} name - The button.
   * @returns {SNESJoypad} This.
   */
  release(name) {
    this.word = (this.word & ~SNESJoypad.bit(name)) & SNESJoypad.ID_MASK;
    return this;
  } // release

  /**
   * Sets a button to a state.
   * @param {string} name - The button.
   * @param {boolean} down - Pressed or not.
   * @returns {SNESJoypad} This.
   */
  set(name, down) {
    return down ? this.press(name) : this.release(name);
  } // set

  /**
   * Whether a button is held.
   * @param {string} name - The button.
   * @returns {boolean} True when pressed.
   */
  held(name) {
    return (this.word & SNESJoypad.bit(name)) !== 0;
  } // held

  /**
   * Releases everything.
   * @returns {SNESJoypad} This.
   */
  clear() {
    this.word = 0;
    return this;
  } // clear

  /** @returns {number} What `$4218` reads: A X L R 0000. */
  get low() {
    return this.word & 0xFF;
  } // low

  /** @returns {number} What `$4219` reads: B Y Select Start Up Down Left Right. */
  get high() {
    return (this.word >> 8) & 0xFF;
  } // high

} // SNESJoypad
