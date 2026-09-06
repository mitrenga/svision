// begin code

/**
 * Sound data that belongs to the **machine**, not to a game.
 *
 * The ZX Spectrum has a one-bit beeper on bit 4 of port $FE and no AY, so
 * a sound is nothing but a list of pulse lengths: the svision audio handlers
 * take {fragments, pulses}, where `fragments` are pulse lengths in samples and
 * `pulses` indexes into them. That is the same shape the real machine
 * produces, which is why a remake synthesizes these rather than plays samples.
 *
 * What is here are the sounds every ZX remake shares because they are not its
 * own: the pulse format of the tape (pilot tone, sync pulses, data bits) used
 * by the loading screen, and the ROM's own key click and rising scale.
 *
 * A game's own sounds do **not** belong here. They come out of the routines of
 * the original, played instruction by instruction on a beeper simulator, and
 * live in the game.
 */
export class ZXMachineSounds {

  /** The Z80 clock of the machine: 3.5 million T states a second. */
  static tStatesPerSecond = 3500000;

  /**
   * Converts a duration in Z80 T states into a pulse length in samples.
   * @param {number} sampleRate - The audio context sample rate.
   * @param {number} tStates - Duration in T states.
   * @returns {number} The pulse length in samples.
   */
  static pulse(sampleRate, tStates) {
    return Math.ceil(sampleRate*tStates/this.tStatesPerSecond);
  } // pulse

  /**
   * Tape pilot tone: a single 2168 T state pulse, repeated for the whole
   * leader (8063 times before a header block, 3223 before a data block).
   * @param {number} sampleRate - The audio context sample rate.
   * @param {number} volume - Bus volume level.
   * @returns {Object} svision pulse data.
   */
  static tapePilotTone(sampleRate, volume) {
    return {fragments: [this.pulse(sampleRate, 2168)], pulses: [0], volume: volume};
  } // tapePilotTone

  /**
   * Tape data of no particular content: the two sync pulses (667 and 735
   * T states) followed by endless random bits, a zero bit being two 855
   * T state pulses and a one bit two 1710 T state ones. Used where the
   * loading show only needs to sound like data, not carry any.
   * @param {number} sampleRate - The audio context sample rate.
   * @param {number} volume - Bus volume level.
   * @returns {Object} svision pulse data.
   */
  static tapeRndData(sampleRate, volume) {
    return {
      fragments: this.tapeFragments(sampleRate),
      pulses: [0, 0, 1, 1],
      volume: volume,
      infinityRndPulses: {fragments: [2, 3], quantity: 2}
    };
  } // tapeRndData

  /**
   * Tape data carrying real bytes: the two sync pulses, every bit of the given
   * data encoded the way the tape format does it, and the terminating pulse
   * the ROM writes after the last bit.
   *
   * ## Bytes that are also pictures
   *
   * A block can say where it is: with `byteEvent` the sound carries one event
   * per byte, fired the moment that byte has finished going down the tape, and
   * with `endEvent` one more when the block is over. A game showing a loading
   * screen puts the bytes into its video memory as they arrive and gets the
   * real thing — the picture appears at the speed of the sound because it *is*
   * the sound — instead of an animation timed to look like it.
   *
   * The events are dispatched by every handler, the silent one included, so a
   * player with no audio or a muted bus still sees the picture load.
   *
   * @param {number} sampleRate - The audio context sample rate.
   * @param {number} volume - Bus volume level.
   * @param {Uint8Array|number[]|string} data - The bytes to encode, or a
   *        hexadecimal string of them.
   * @param {Object} [options] - {byteEvent, endEvent, firstByte}: `byteEvent`
   *        and `endEvent` are event ids; `firstByte` is the offset reported for
   *        the first byte, 0 by default.
   * @returns {Object} svision pulse data.
   */
  static tapeData(sampleRate, volume, data, options) {
    var opts = options || {};
    var bytes = this.dataBytes(data);
    var pulses = [0, 0, 1, 1];
    var events = false;
    for (var x = 0; x < bytes.length; x++) {
      for (var b = 7; b >= 0; b--) {
        var fragment = ((bytes[x] >> b) & 1) ? 3 : 2;
        pulses.push(fragment);
        pulses.push(fragment);
      }
      if (opts.byteEvent) {
        events = events || {};
        events[pulses.length] = {id: opts.byteEvent,
                                 at: (opts.firstByte || 0)+x, value: bytes[x]};
      }
    }
    pulses.push(4);
    if (opts.endEvent) {
      events = events || {};
      events[pulses.length] = {id: opts.endEvent, bytes: bytes.length};
    }
    var audioData = {fragments: this.tapeFragments(sampleRate),
                     pulses: pulses, volume: volume};
    if (events !== false) {
      audioData.events = events;
    }
    return audioData;
  } // tapeData

  /**
   * The bytes of a block, however the caller happens to hold them.
   * @param {Uint8Array|number[]|string} data - Bytes, or a hexadecimal string.
   * @returns {Uint8Array|number[]} The bytes.
   */
  static dataBytes(data) {
    if (typeof data !== 'string') {
      return data;
    }
    var bytes = new Uint8Array(Math.floor(data.length/2));
    for (var x = 0; x < bytes.length; x++) {
      bytes[x] = parseInt(data.substring(x*2, x*2+2), 16);
    }
    return bytes;
  } // dataBytes

  /**
   * The pulse lengths of the tape format: the two sync pulses (667 and 735
   * T states), the two data bit pulses (855 for a zero, 1710 for a one) and
   * the terminating pulse (945) that closes a block.
   * @param {number} sampleRate - The audio context sample rate.
   * @returns {number[]} The pulse lengths in samples.
   */
  static tapeFragments(sampleRate) {
    return [667, 735, 855, 1710, 945].map(
      (tStates) => this.pulse(sampleRate, tStates));
  } // tapeFragments

  /**
   * The rising scale the ZX BASIC ROM beeps while a header is accepted.
   * @param {number} sampleRate - The audio context sample rate.
   * @param {number} volume - Bus volume level.
   * @returns {Object} svision pulse data.
   */
  static basicBeeps(sampleRate, volume) {
    var beeps = [261.626, 293.665, 329.628, 369.994, 415.305, 466.164, 523.251];
    var fragments = beeps.map((freq) => Math.ceil(sampleRate/freq/2));
    fragments.push(Math.ceil(sampleRate/44));
    var pulses = [];
    for (var x = 0; x < beeps.length; x++) {
      var duration = 0;
      do {
        pulses.push(x);
        duration += fragments[x];
      } while (duration < sampleRate/10);
      pulses.push(beeps.length);
    }
    return {fragments: fragments, pulses: pulses, volume: volume};
  } // basicBeeps

  /**
   * The click of a ZX key press.
   * @param {number} sampleRate - The audio context sample rate.
   * @param {number} volume - Bus volume level.
   * @returns {Object} svision pulse data.
   */
  static keyClick(sampleRate, volume) {
    return {fragments: [Math.ceil(15*sampleRate/44100)], pulses: [0], volume: volume};
  } // keyClick

} // ZXMachineSounds
