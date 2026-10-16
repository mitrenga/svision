/**
 * PNG encoder for the offline tools — no dependencies beyond node:zlib.
 *
 * Encoder for two pixel formats, both the shapes the retro tools have to hand,
 * and a decoder (`decodePNG`) for reading screenshots back:
 *   - `encodeIndexedPNG`: one byte per pixel + a palette, the way a VGA
 *     screen or a sprite sheet of a paletted machine is held; colour 0 (or
 *     any chosen index) can be marked transparent;
 *   - `encodeRGBAPNG`: 4 bytes per pixel, for a painted picture.
 *
 * Shared home of what was `stinger/tools/lib/png.mjs` and
 * `pleiades/tools/lib/png.mjs` (R-008: tools common to several projects
 * belong to svision/tools/retro/, not to each project). Those two copies
 * can switch to this file; their `encodePNG(width, height, rgba, scale)` is
 * `encodeRGBAPNG` here, same signature.
 *
 * @module tools/retro/png
 */
import zlib from 'node:zlib';

const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
} // crc32

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData), 0);
  return Buffer.concat([len, typeData, crc]);
} // chunk

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function ihdr(width, height, colorType) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;           // bit depth
  data[9] = colorType;   // 3 indexed, 6 RGBA
  data[10] = 0; data[11] = 0; data[12] = 0;
  return chunk('IHDR', data);
} // ihdr

/**
 * Encodes RGBA pixels into a PNG file.
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array|Uint8ClampedArray} rgba - width*height*4 bytes.
 * @param {number} [scale=1] - Integer nearest-neighbour upscale.
 * @returns {Buffer} The whole file.
 */
export function encodeRGBAPNG(width, height, rgba, scale = 1) {
  const w = width*scale, h = height*scale;
  const raw = Buffer.alloc((w*4+1)*h);
  for (let y = 0; y < h; y++) {
    const rowStart = y*(w*4+1);
    raw[rowStart] = 0;   // filter: none
    const sy = Math.floor(y/scale);
    for (let x = 0; x < w; x++) {
      const si = (sy*width+Math.floor(x/scale))*4;
      const di = rowStart+1+x*4;
      raw[di] = rgba[si]; raw[di+1] = rgba[si+1]; raw[di+2] = rgba[si+2]; raw[di+3] = rgba[si+3];
    }
  }
  return Buffer.concat([
    SIGNATURE,
    ihdr(w, h, 6),
    chunk('IDAT', zlib.deflateSync(raw, {level: 9})),
    chunk('IEND', Buffer.alloc(0))
  ]);
} // encodeRGBAPNG

/**
 * Encodes one-byte-per-pixel pixels with a palette into an indexed PNG.
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} pixels - width*height palette indices.
 * @param {Uint8Array|number[]} palette - r, g, b per entry, 0-255; up to 256 entries.
 * @param {Object} [options]
 * @param {number} [options.transparent] - Index drawn fully transparent (a
 *        tRNS chunk); none by default.
 * @param {number} [options.scale=1] - Integer nearest-neighbour upscale.
 * @returns {Buffer} The whole file.
 */
export function encodeIndexedPNG(width, height, pixels, palette, options = {}) {
  const scale = options.scale || 1;
  const w = width*scale, h = height*scale;
  const raw = Buffer.alloc((w+1)*h);
  for (let y = 0; y < h; y++) {
    const rowStart = y*(w+1);
    raw[rowStart] = 0;
    const sy = Math.floor(y/scale);
    if (scale === 1) {
      raw.set(pixels.subarray(sy*width, sy*width+width), rowStart+1);
    } else {
      for (let x = 0; x < w; x++) {
        raw[rowStart+1+x] = pixels[sy*width+Math.floor(x/scale)];
      }
    }
  }
  const entries = Math.min(256, Math.floor(palette.length/3));
  const plte = Buffer.from(palette instanceof Uint8Array ? palette.subarray(0, entries*3) : palette.slice(0, entries*3));
  const chunks = [SIGNATURE, ihdr(w, h, 3), chunk('PLTE', plte)];
  if (options.transparent !== undefined) {
    const trns = Buffer.alloc(options.transparent+1, 255);
    trns[options.transparent] = 0;
    chunks.push(chunk('tRNS', trns));
  }
  chunks.push(chunk('IDAT', zlib.deflateSync(raw, {level: 9})));
  chunks.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
} // encodeIndexedPNG

// ------------------------------------------------------------------ decoding

/**
 * Decodes a PNG file to RGBA — what a match tool needs of a screenshot.
 * Bit depth 8 (and 1/2/4 for indexed and greyscale images), colour types
 * greyscale, RGB, indexed, greyscale+alpha, RGBA, all five filters, no
 * interlacing (a DOSBox or SDLPoP screenshot is none of the exotic ones).
 * @param {Uint8Array|Buffer} file - The whole file.
 * @returns {{width: number, height: number, rgba: Uint8Array, colorType: number,
 *           bitDepth: number, palette: Uint8Array|null}}
 */
export function decodePNG(file) {
  const bytes = Buffer.isBuffer(file) ? file : Buffer.from(file.buffer, file.byteOffset, file.byteLength);
  if (bytes.compare(SIGNATURE, 0, 8, 0, 8) !== 0) {
    throw new Error('decodePNG: not a PNG file');
  }
  let at = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  let palette = null, trns = null;
  const idat = [];
  while (at+8 <= bytes.length) {
    const length = bytes.readUInt32BE(at);
    const type = bytes.toString('latin1', at+4, at+8);
    const data = bytes.subarray(at+8, at+8+length);
    at += 12+length;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') {
      palette = new Uint8Array(data);
    } else if (type === 'tRNS') {
      trns = new Uint8Array(data);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  if (interlace) {
    throw new Error('decodePNG: interlaced images are not supported');
  }
  const channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[colorType];
  if (!channels) {
    throw new Error('decodePNG: colour type '+colorType);
  }
  if (bitDepth !== 8 && !(bitDepth < 8 && (colorType === 0 || colorType === 3))) {
    throw new Error('decodePNG: bit depth '+bitDepth+' with colour type '+colorType);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bitsPerPixel = channels*bitDepth;
  const stride = Math.ceil(width*bitsPerPixel/8);
  const bpp = Math.max(1, Math.ceil(bitsPerPixel/8));
  const lines = new Uint8Array(stride*height);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y*(stride+1)];
    const line = raw.subarray(y*(stride+1)+1, (y+1)*(stride+1));
    const out = lines.subarray(y*stride, (y+1)*stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x-bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x-bpp] : 0;
      let v = line[x];
      switch (filter) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a+b) >> 1; break;
        case 4: {
          const p = a+b-c;
          const pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          break;
        }
        default: throw new Error('decodePNG: filter '+filter);
      }
      out[x] = v & 0xFF;
    }
    prev = out;
  }
  const rgba = new Uint8Array(width*height*4);
  const sample = (line, x) => {   // one sub-byte sample of an indexed/grey line
    const bit = x*bitDepth;
    return (line[bit >> 3] >> (8-bitDepth-(bit & 7))) & ((1 << bitDepth)-1);
  };
  for (let y = 0; y < height; y++) {
    const line = lines.subarray(y*stride, (y+1)*stride);
    for (let x = 0; x < width; x++) {
      const o = (y*width+x)*4;
      switch (colorType) {
        case 0: {
          const g = bitDepth === 8 ? line[x] : Math.round(sample(line, x)*255/((1 << bitDepth)-1));
          rgba[o] = g; rgba[o+1] = g; rgba[o+2] = g; rgba[o+3] = 255;
          break;
        }
        case 2:
          rgba[o] = line[x*3]; rgba[o+1] = line[x*3+1]; rgba[o+2] = line[x*3+2]; rgba[o+3] = 255;
          break;
        case 3: {
          const i = bitDepth === 8 ? line[x] : sample(line, x);
          rgba[o] = palette[i*3]; rgba[o+1] = palette[i*3+1]; rgba[o+2] = palette[i*3+2];
          rgba[o+3] = trns && i < trns.length ? trns[i] : 255;
          break;
        }
        case 4:
          rgba[o] = line[x*2]; rgba[o+1] = line[x*2]; rgba[o+2] = line[x*2]; rgba[o+3] = line[x*2+1];
          break;
        case 6:
          rgba[o] = line[x*4]; rgba[o+1] = line[x*4+1]; rgba[o+2] = line[x*4+2]; rgba[o+3] = line[x*4+3];
          break;
      }
    }
  }
  return {width, height, rgba, colorType, bitDepth, palette};
} // decodePNG

/** the historical name of the RGBA encoder in the arcade projects */
export const encodePNG = encodeRGBAPNG;
export default encodeRGBAPNG;
