// begin code

/**
 * A digitised sound: samples and the rate they were recorded at — what a Sound
 * Blaster played out of its DAC, and what the DOS games carry in their data
 * files as raw unsigned 8-bit PCM (Prince of Persia's `.DAT` sounds, the `SND`
 * files of Gobliiins) or as `.VOC`/`.WAV`.
 *
 * The samples are kept as `Float32Array` in -1..1, which is what an
 * `AudioBuffer` takes; the decoders here take the era's byte formats to that.
 * Playing is not here — {@link AudioSampleHandler} does it — so this file
 * stays free of the Web Audio API and a Node tool can decode, encode and
 * round-trip samples with the very same code (R-001).
 *
 * ```js
 * var sample = PCMSample.fromUnsigned8(bytes, 11025);
 * var wav = sample.toWAV(8);                 // for a dump* tool
 * var back = PCMSample.fromWAV(wav);         // and back again, byte for byte
 * ```
 *
 * A **decoded file** (an AAC or Ogg track the browser decoded with
 * `decodeAudioData`, `AbstractAudioManager.loadSample`) is a sample too —
 * `PCMSample.fromAudioBuffer` — but keeps its `AudioBuffer` (stereo, at
 * its own rate) instead of `samples`: the handler plays it as it is, the
 * decoders and encoders here do not touch it (`samples` is null).
 *
 * Two optional fields are read by `AudioSampleHandler`: `volume`, the
 * sample's own loudness factor (1 when absent; `fromAudioBuffer` sets it),
 * and `events`, a list `[{at: seconds, id, ...}]` the game hangs on the
 * sample to have the model told when a moment of the sound comes.
 */
export class PCMSample {

  /**
   * @param {Float32Array} samples - Mono samples, -1..1.
   * @param {number} sampleRate - Samples per second.
   */
  constructor(samples, sampleRate) {
    this.id = 'PCMSample';

    /** the samples, one channel */
    this.samples = samples;
    /** how many of them make a second */
    this.sampleRate = sampleRate;
  } // constructor

  /**
   * How long the sound plays.
   * @returns {number} Seconds.
   */
  get duration() {
    if (this.samples === null) {
      return this.audioBuffer ? this.audioBuffer.duration : 0;
    }
    return this.samples.length/this.sampleRate;
  } // duration

  /**
   * A sample over an `AudioBuffer` the browser decoded (a music track, a
   * recorded effect in a file): no `samples`, the buffer plays as it is,
   * with its channels. An AudioBuffer is plain data, usable under any
   * context, so the sample outlives the context it was decoded under.
   * @param {AudioBuffer} buffer - The decoded audio.
   * @param {number} [volume] - The sample's own loudness factor (1).
   * @returns {PCMSample} The sound.
   */
  static fromAudioBuffer(buffer, volume) {
    var sample = new PCMSample(null, buffer.sampleRate);
    sample.audioBuffer = buffer;
    sample.audioBufferContext = null;       // any context
    if (volume !== undefined) {
      sample.volume = volume;
    }
    return sample;
  } // fromAudioBuffer

  // ---------------------------------------------------------------- decoding

  /**
   * Unsigned 8-bit PCM, silence at 128 — the DAC format of the Sound Blaster
   * and the Covox, and of nearly every DOS game's sound data.
   * @param {Uint8Array} bytes - One byte per sample.
   * @param {number} sampleRate - Samples per second.
   * @returns {PCMSample} The sound.
   */
  static fromUnsigned8(bytes, sampleRate) {
    var samples = new Float32Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
      samples[i] = (bytes[i]-128)/128;
    }
    return new PCMSample(samples, sampleRate);
  } // fromUnsigned8

  /**
   * Signed 8-bit PCM, silence at 0.
   * @param {Uint8Array|Int8Array} bytes - One byte per sample.
   * @param {number} sampleRate - Samples per second.
   * @returns {PCMSample} The sound.
   */
  static fromSigned8(bytes, sampleRate) {
    var samples = new Float32Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
      var v = bytes[i];
      samples[i] = (v > 127 ? v-256 : v)/128;
    }
    return new PCMSample(samples, sampleRate);
  } // fromSigned8

  /**
   * Signed 16-bit little-endian PCM.
   * @param {Uint8Array} bytes - Two bytes per sample.
   * @param {number} sampleRate - Samples per second.
   * @returns {PCMSample} The sound.
   */
  static fromSigned16(bytes, sampleRate) {
    var count = bytes.length >> 1;
    var samples = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      var v = bytes[i*2] | (bytes[i*2+1] << 8);
      if (v > 32767) {
        v -= 65536;
      }
      samples[i] = v/32768;
    }
    return new PCMSample(samples, sampleRate);
  } // fromSigned16

  /**
   * A RIFF WAVE file — PCM, 8 or 16 bits, any number of channels (mixed down
   * to one). Chunks other than `fmt ` and `data` are skipped, so a file with
   * a `LIST` chunk decodes too.
   * @param {Uint8Array} bytes - The whole file.
   * @returns {PCMSample} The sound.
   */
  static fromWAV(bytes) {
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var tag = function(at) {
      return String.fromCharCode(bytes[at], bytes[at+1], bytes[at+2], bytes[at+3]);
    };
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
      throw new Error('PCMSample.fromWAV: not a RIFF WAVE file');
    }
    var format = null;
    var data = null;
    var at = 12;
    while (at+8 <= bytes.length) {
      var id = tag(at);
      var size = view.getUint32(at+4, true);
      var body = at+8;
      if (id === 'fmt ') {
        format = {
          tag: view.getUint16(body, true),
          channels: view.getUint16(body+2, true),
          sampleRate: view.getUint32(body+4, true),
          bits: view.getUint16(body+14, true)
        };
      } else if (id === 'data') {
        data = bytes.subarray(body, Math.min(bytes.length, body+size));
      }
      at = body+size+(size & 1);   // chunks are word aligned
    }
    if (format === null || data === null) {
      throw new Error('PCMSample.fromWAV: fmt or data chunk missing');
    }
    if (format.tag !== 1 || (format.bits !== 8 && format.bits !== 16)) {
      throw new Error('PCMSample.fromWAV: only 8 and 16 bit PCM');
    }
    var channels = Math.max(1, format.channels);
    var sample = format.bits === 8
      ? PCMSample.fromUnsigned8(data, format.sampleRate)
      : PCMSample.fromSigned16(data, format.sampleRate);
    if (channels > 1) {
      var frames = Math.floor(sample.samples.length/channels);
      var mono = new Float32Array(frames);
      for (var f = 0; f < frames; f++) {
        var sum = 0;
        for (var c = 0; c < channels; c++) {
          sum += sample.samples[f*channels+c];
        }
        mono[f] = sum/channels;
      }
      sample.samples = mono;
    }
    return sample;
  } // fromWAV

  // ---------------------------------------------------------------- encoding

  /**
   * The samples as unsigned 8-bit PCM — back into the era's format, and the
   * payload of an 8-bit WAV.
   * @returns {Uint8Array} One byte per sample.
   */
  toUnsigned8() {
    var bytes = new Uint8Array(this.samples.length);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = PCMSample.clamp(Math.round(this.samples[i]*128)+128, 0, 255);
    }
    return bytes;
  } // toUnsigned8

  /**
   * The samples as signed 16-bit little-endian PCM.
   * @returns {Uint8Array} Two bytes per sample.
   */
  toSigned16() {
    var bytes = new Uint8Array(this.samples.length*2);
    for (var i = 0; i < this.samples.length; i++) {
      var v = PCMSample.clamp(Math.round(this.samples[i]*32768), -32768, 32767);
      bytes[i*2] = v & 0xFF;
      bytes[i*2+1] = (v >> 8) & 0xFF;
    }
    return bytes;
  } // toSigned16

  /**
   * A mono RIFF WAVE file — the open format a `dump*` tool writes the sounds
   * of a game out as.
   * @param {number} [bits] - 8 (unsigned) or 16 (signed); 8 by default, which
   *        is lossless for the era's data.
   * @returns {Uint8Array} The whole file.
   */
  toWAV(bits) {
    var depth = bits === 16 ? 16 : 8;
    var payload = depth === 8 ? this.toUnsigned8() : this.toSigned16();
    var bytes = new Uint8Array(44+payload.length+(payload.length & 1));
    var view = new DataView(bytes.buffer);
    var tag = function(at, text) {
      for (var i = 0; i < 4; i++) {
        bytes[at+i] = text.charCodeAt(i);
      }
    };
    tag(0, 'RIFF');
    view.setUint32(4, bytes.length-8, true);
    tag(8, 'WAVE');
    tag(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);                          // PCM
    view.setUint16(22, 1, true);                          // mono
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate*depth/8, true);   // bytes per second
    view.setUint16(32, depth/8, true);                    // block align
    view.setUint16(34, depth, true);
    tag(36, 'data');
    view.setUint32(40, payload.length, true);
    bytes.set(payload, 44);
    return bytes;
  } // toWAV

  // ------------------------------------------------------------------- misc

  /**
   * A synthesised test sound: a tone with an exponential decay, the way a
   * chip would play it — for a demo and for a tool that has no game data.
   * @param {number} sampleRate - Samples per second.
   * @param {number} frequency - Hz.
   * @param {number} seconds - Length.
   * @param {Object} [options] - `volume` 0-1 (0.8 by default), `decay` in
   *        seconds (the length by default), `wave`: 'sine' (default), 'square'
   *        or 'saw'.
   * @returns {PCMSample} The sound.
   */
  static tone(sampleRate, frequency, seconds, options) {
    var opts = options || {};
    var volume = opts.volume === undefined ? 0.8 : opts.volume;
    var decay = opts.decay === undefined ? seconds : opts.decay;
    var wave = opts.wave || 'sine';
    var count = Math.round(sampleRate*seconds);
    var samples = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      var t = i/sampleRate;
      var phase = (t*frequency) % 1;
      var value;
      switch (wave) {
        case 'square': value = phase < 0.5 ? 1 : -1; break;
        case 'saw': value = phase*2-1; break;
        default: value = Math.sin(phase*2*Math.PI); break;
      }
      samples[i] = value*volume*Math.exp(-t/decay*4);
    }
    return new PCMSample(samples, sampleRate);
  } // tone

  /**
   * Clamps a number.
   * @param {number} value - The number.
   * @param {number} low - The least allowed.
   * @param {number} high - The most allowed.
   * @returns {number} The clamped number.
   */
  static clamp(value, low, high) {
    return value < low ? low : (value > high ? high : value);
  } // clamp

} // PCMSample
