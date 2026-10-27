// begin code

/**
 * The serial line between the host and the terminal, as a queue that lets
 * bytes through at the speed of the line. At 9600 baud with a start bit, eight
 * data bits and a stop bit a byte takes 10 bits — 960 bytes a second — so a
 * host that sends a whole screen sees it appear in a fraction of a second,
 * row after row, not at once. Whether a remake needs that is a question of
 * its time model (R-061 point 7); with `baud: 0` the queue passes everything
 * on the next {@link TerminalLine#update}.
 *
 * ```js
 * var line = new TerminalLine((b) => vt.writeByte(b), {baud: 9600});
 * line.push(bytesFromWorker);
 * line.update(timestamp);          // once a frame, from the model
 * ```
 *
 * Time is whatever the caller counts in milliseconds; the queue only looks at
 * differences. Free of DOM (R-001).
 */
export class TerminalLine {

  /**
   * @param {Function} sink - Called with every byte the line lets through.
   * @param {Object} [config] - `baud` (0: no limit), `bitsPerByte` (10).
   */
  constructor(sink, config) {
    this.id = 'TerminalLine';

    var c = Object.assign({baud: 0, bitsPerByte: 10}, config || {});
    this.sink = sink;
    this.baud = c.baud;
    this.bitsPerByte = c.bitsPerByte;
    /** bytes waiting */
    this.queue = [];
    /** the time of the last update; null before the first */
    this.lastTime = null;
    /** bytes owed but not yet whole, carried to the next update */
    this.credit = 0;
  } // constructor

  /**
   * Queues bytes from the host.
   * @param {Uint8Array|Array<number>|number} data - The bytes, or one byte.
   * @returns {TerminalLine} This.
   */
  push(data) {
    if (typeof data === 'number') {
      this.queue.push(data);
    } else {
      for (var i = 0; i < data.length; i++) {
        this.queue.push(data[i]);
      }
    }
    return this;
  } // push

  /**
   * How many bytes are waiting.
   * @returns {number} The queue length.
   */
  get pending() {
    return this.queue.length;
  } // pending

  /**
   * Lets through what the line carried since the last update.
   * @param {number} time - The current time in milliseconds.
   * @returns {number} How many bytes went to the sink.
   */
  update(time) {
    var count = this.queue.length;
    if (this.baud > 0) {
      if (this.lastTime === null) {
        this.lastTime = time;
      }
      this.credit += (time-this.lastTime)*this.baud/this.bitsPerByte/1000;
      this.lastTime = time;
      count = Math.min(count, Math.floor(this.credit));
      this.credit -= count;
      if (this.queue.length === count) {
        this.credit = 0;   // an idle line saves nothing up
      }
    }
    var bytes = this.queue.splice(0, count);
    for (var i = 0; i < bytes.length; i++) {
      this.sink(bytes[i]);
    }
    return bytes.length;
  } // update

  /**
   * Lets everything through at once — a skip, or a tool that wants the end state.
   * @returns {number} How many bytes went to the sink.
   */
  flush() {
    var bytes = this.queue.splice(0);
    for (var i = 0; i < bytes.length; i++) {
      this.sink(bytes[i]);
    }
    this.credit = 0;
    return bytes.length;
  } // flush

} // TerminalLine
