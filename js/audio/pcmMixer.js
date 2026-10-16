// begin code

/**
 * A **software mixer of digitised sounds**: so many channels, each playing
 * one {@link PCMSample} at its own rate with a volume for the left and the
 * right ear, summed into stereo output. It is what the sound library of a
 * DOS game did in software between the game and the Sound Blaster's DAC -
 * DMX in DOOM mixed eight channels of 8-bit samples this way, Wolfenstein's
 * driver one - and what an `AudioWorklet` does for the remake.
 *
 * The mixer knows nothing about distance or direction: the game works out
 * how loud a sound is in each ear and tells the channel ({@link start},
 * {@link update}); the one law here is {@link PCMMixer.gainsOf}, the
 * volume and stereo separation of DOOM's own mixer turned into two gains,
 * which a game may use or replace.
 *
 * A sample plays at `sample.sampleRate · rate` samples a second whatever the
 * mixer's rate is, read with linear interpolation; an 11 025 Hz effect on a
 * 44 100 Hz output steps a quarter of a sample at a time. A channel is free
 * again when its sample runs out or is stopped.
 *
 * Deliberately free of DOM: the same class runs in a worklet, on the main
 * thread and under Node, where a tool writes what the player would hear
 * into a WAV (R-001).
 *
 * @example
 * var mixer = new PCMMixer({sampleRate: 44100, channels: 8});
 * mixer.start(0, pistol, PCMMixer.gainsOf(64, 128));
 * mixer.render(left, right, 4410);
 */
export class PCMMixer {

  /**
   * @param {Object} [options]
   * @param {number} [options.sampleRate=11025] - Output samples a second.
   * @param {number} [options.channels=8] - How many sounds at once.
   */
  constructor(options) {
    var settings = options || {};
    this.id = 'PCMMixer';
    this.sampleRate = settings.sampleRate || 11025;
    this.channels = [];
    var count = settings.channels || 8;
    for (var i = 0; i < count; i++) {
      this.channels.push({sample: null, position: 0, step: 1, left: 1, right: 1});
    }
    /** samples rendered so far */
    this.samples = 0;
  } // constructor

  /**
   * The gains of DOOM's mixer for a volume and a stereo separation
   * (`addsfx` of the released `i_sound.c`, id Software, GPLv2 - the law,
   * not the code): the volume falls off with the **square** of how far the
   * sound sits from each ear, so a sound dead ahead plays at three quarters
   * in both, one hard left at full on the left and nothing on the right.
   * @param {number} volume - 0..127.
   * @param {number} separation - 0..255; 128 is the middle, 0 the left.
   * @returns {{left: number, right: number}} Gains 0..1.
   */
  static gainsOf(volume, separation) {
    var sep = separation+1;
    var left = volume-((volume*sep*sep) >> 16);
    sep -= 257;
    var right = volume-((volume*sep*sep) >> 16);
    return {left: Math.max(0, Math.min(127, left))/127, right: Math.max(0, Math.min(127, right))/127};
  } // gainsOf

  /**
   * Plays a sample on a channel, replacing what played there.
   * @param {number} channel - 0..channels-1.
   * @param {PCMSample} sample - The sound (`samples` and `sampleRate`).
   * @param {Object} [options] - `left`, `right` gains 0..1 (1), `rate` playback rate (1).
   */
  start(channel, sample, options) {
    var settings = options || {};
    var c = this.channels[channel];
    c.sample = sample;
    c.position = 0;
    c.step = sample.sampleRate/this.sampleRate*(settings.rate === undefined ? 1 : settings.rate);
    c.left = settings.left === undefined ? 1 : settings.left;
    c.right = settings.right === undefined ? 1 : settings.right;
  } // start

  /**
   * Changes the gains of a playing channel (a sound that moved).
   * @param {number} channel - The channel.
   * @param {Object} gains - `left`, `right` 0..1.
   */
  update(channel, gains) {
    var c = this.channels[channel];
    if (gains.left !== undefined) c.left = gains.left;
    if (gains.right !== undefined) c.right = gains.right;
  } // update

  /** Silences a channel. */
  stop(channel) {
    this.channels[channel].sample = null;
  } // stop

  /** Whether a channel still has samples to play. */
  isPlaying(channel) {
    return this.channels[channel].sample !== null;
  } // isPlaying

  /** Silences everything. */
  reset() {
    for (var i = 0; i < this.channels.length; i++) this.channels[i].sample = null;
  } // reset

  /**
   * Renders the next samples of every channel, added into the output (the
   * arrays are cleared first).
   * @param {Float32Array} left - The left ear.
   * @param {Float32Array|null} right - The right ear, or null for mono (the mean of both).
   * @param {number} [count] - How many; the whole array by default.
   * @param {number} [offset=0] - Where in the arrays to start.
   */
  render(left, right, count, offset) {
    var at = offset || 0;
    var n = count === undefined ? left.length-at : count;
    left.fill(0, at, at+n);
    if (right !== null) right.fill(0, at, at+n);
    for (var i = 0; i < this.channels.length; i++) {
      var c = this.channels[i];
      if (c.sample === null) continue;
      var data = c.sample.samples;
      var last = data.length-1;
      var gl = right === null ? (c.left+c.right)/2 : c.left;
      var gr = c.right;
      for (var k = 0; k < n; k++) {
        var pos = c.position;
        if (pos >= last) { c.sample = null; break; }
        var index = Math.floor(pos);
        var frac = pos-index;
        var value = data[index]+(data[index+1]-data[index])*frac;
        left[at+k] += value*gl;
        if (right !== null) right[at+k] += value*gr;
        c.position = pos+c.step;
      }
    }
    this.samples += n;
  } // render

} // PCMMixer

export default PCMMixer;
