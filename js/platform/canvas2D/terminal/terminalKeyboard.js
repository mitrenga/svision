// begin code

/**
 * The keyboard of a terminal: a key of the browser in, the bytes the terminal
 * would send to the host out. The model calls it from its key events (the
 * `key` of a `keyPress`, i.e. `KeyboardEvent.key`) and posts the bytes to the
 * worker, where the game reads them as its input from the line. Which bytes a
 * key sends is the application's table (R-061); touch controls are the
 * game's own and send bytes the same way.
 *
 * ```js
 * var keyboard = new TerminalKeyboard(charset, {
 *   keys: {Enter: 0x0D, Backspace: 0x7F, Escape: 0x1B, ArrowUp: [0x1B, 0x41]},
 *   printable: true       // a one-character key goes as the charset encodes it
 * });
 * var bytes = keyboard.bytesFor(event.key);   // Uint8Array, empty for a key
 *                                             // the terminal does not have
 * ```
 *
 * A printable key goes through {@link TerminalCharset#encode}, which puts a
 * shift code (SO/SI) in front of it when the key is in another set than the
 * last one. The keyboard keeps its own shift for that, apart from the
 * screen's: the host's output and the operator's typing are two directions of
 * the line. Free of DOM (R-001).
 */
export class TerminalKeyboard {

  /**
   * @param {TerminalCharset} charset - Character -> code + shift.
   * @param {Object} [config] - `keys` (key -> byte or array of bytes; null
   *        silences a key), `printable` (true), `upperCase` (false: letters
   *        go as typed; true: as capitals, the way a terminal without lower
   *        case sends them).
   */
  constructor(charset, config) {
    this.id = 'TerminalKeyboard';

    var c = Object.assign({keys: {}, printable: true, upperCase: false}, config || {});
    this.charset = charset;
    this.keys = c.keys;
    this.printable = c.printable;
    this.upperCase = c.upperCase;
    /** the shift the host last got from the keyboard */
    this.shift = charset.initial;
  } // constructor

  /**
   * The bytes a key sends.
   * @param {string} key - `KeyboardEvent.key`.
   * @returns {Uint8Array} The bytes; empty when the key sends nothing.
   */
  bytesFor(key) {
    if (key in this.keys) {
      var value = this.keys[key];
      if (value === null) {
        return new Uint8Array(0);
      }
      return Uint8Array.from(typeof value === 'number' ? [value] : value);
    }
    if (!this.printable || Array.from(key).length !== 1) {
      return new Uint8Array(0);
    }
    var ch = this.upperCase ? key.toUpperCase() : key;
    if (!(ch in this.charset.encodeMap)) {
      return new Uint8Array(0);
    }
    var encoded = this.charset.encode(ch, this.shift);
    this.shift = encoded.shift;
    return encoded.bytes;
  } // bytesFor

} // TerminalKeyboard
