#!/usr/bin/env node
/**
 * Self-check of the ZX Spectrum platform classes under Node — the DOM-free
 * half of the platform: the video memory (the ULA's addressing, the write
 * operations, the shifted blit, linear <-> interleaved, painting to RGBA with
 * BRIGHT, FLASH and the attribute mask, the ink plane of R-036: the pen,
 * the owners a write marks and loses, the plane byte's layout), the colours, the glyph bytes of the
 * ROM font and the pulse data of the machine's sounds. Nothing here needs a
 * browser; it is the ground a match* tool of a ZX game stands on.
 *
 * Every check is one line: what was expected, what came out. The report has
 * the shape of the match tools — the number of checks and the number of
 * differences — and the exit code is the number of differences.
 *
 * usage: node tools/checkzx.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { ZXVideoRAM } = await import('../js/platform/canvas2D/zxSpectrum/zxVideoRAM.js');
const { ZXColor } = await import('../js/platform/canvas2D/zxSpectrum/zxColor.js');
const { ZXFonts8x8 } = await import('../js/platform/canvas2D/zxSpectrum/zxFonts8x8.js');
const { ZXMachineSounds } = await import('../js/platform/canvas2D/zxSpectrum/zxMachineSounds.js');
const { ZXRomPrint } = await import('../js/platform/canvas2D/zxSpectrum/zxRomPrint.js');
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { loadClassicScript } = createRequire(import.meta.url)('./classicScript.cjs');
const ZXRomDraw = loadClassicScript(path.join(path.dirname(fileURLToPath(import.meta.url)),
                                              '../js/platform/canvas2D/zxSpectrum/zxRomDraw.js'));

const verbose = process.argv.includes('-v');
let checks = 0;
let differences = 0;

function check(name, actual, expected) {
  checks++;
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    differences++;
    console.log(`  DIFF ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else if (verbose) {
    console.log(`  ok   ${name}`);
  }
} // check

/** a typed array as a plain array, for the JSON comparison */
function list(bytes) {
  return Array.from(bytes);
} // list

/** the RGB of one pixel of an RGBA buffer of the given width */
function pixel(rgba, width, x, y) {
  const at = (y*width+x)*4;
  return [rgba[at], rgba[at+1], rgba[at+2], rgba[at+3]];
} // pixel

// ------------------------------------------------------------- addressing

{
  check('constants', [ZXVideoRAM.BASE, ZXVideoRAM.BYTES, ZXVideoRAM.BITMAP_BYTES, ZXVideoRAM.ATTRIBUTES_OFFSET, ZXVideoRAM.ATTRIBUTES_BYTES],
        [0x4000, 6912, 0x1800, 0x1800, 0x300]);
  check('lineOffset 0', ZXVideoRAM.lineOffset(0), 0);
  check('lineOffset 1 (next pixel line, +256)', ZXVideoRAM.lineOffset(1), 0x100);
  check('lineOffset 8 (next character row, +32)', ZXVideoRAM.lineOffset(8), 0x20);
  check('lineOffset 64 (second third)', ZXVideoRAM.lineOffset(64), 0x800);
  check('lineOffset 191 (last line)', ZXVideoRAM.lineOffset(191), 0x17E0);
  check('addressOf top left', ZXVideoRAM.addressOf(0, 0), {l: 0x00, h: 0x40});
  check('addressOf bottom right', ZXVideoRAM.addressOf(255, 191), {l: 0xFF, h: 0x57});
  check('addressOf (8, 0) is L+1', ZXVideoRAM.addressOf(8, 0), {l: 0x01, h: 0x40});
  check('addressOf (0, 1) is H+1', ZXVideoRAM.addressOf(0, 1), {l: 0x00, h: 0x41});
  check('addressOf (0, 8) is L+32', ZXVideoRAM.addressOf(0, 8), {l: 0x20, h: 0x40});
  check('addressOf wraps x mod 256', ZXVideoRAM.addressOf(256, 0), {l: 0x00, h: 0x40});
  check('attributeAddressOf top left', ZXVideoRAM.attributeAddressOf(0, 0), 0x5800);
  check('attributeAddressOf bottom right', ZXVideoRAM.attributeAddressOf(255, 191), 0x5AFF);
  check('attributeAddress(23, 31)', ZXVideoRAM.attributeAddress(23, 31), 0x5AFF);
  check('isVideoAddress below', ZXVideoRAM.isVideoAddress(0x3FFF), false);
  check('isVideoAddress first', ZXVideoRAM.isVideoAddress(0x4000), true);
  check('isVideoAddress last', ZXVideoRAM.isVideoAddress(0x5AFF), true);
  check('isVideoAddress above', ZXVideoRAM.isVideoAddress(0x5B00), false);
  check('area default is the screen', ZXVideoRAM.area(), {col: 0, row: 0, cols: 32, rows: 24});
  check('area rows only', ZXVideoRAM.area({row: 2, rows: 22}), {col: 0, row: 2, cols: 32, rows: 22});
  check('area clipped', ZXVideoRAM.area({col: 30, row: 20, cols: 8, rows: 8}), {col: 30, row: 20, cols: 2, rows: 4});
}

// ---------------------------------------------------------- reading, writing

{
  check('combine none', ZXVideoRAM.combine(0xF0, 0x0F), 0x0F);
  check('combine xor', ZXVideoRAM.combine(0xF0, 0xFF, 'xor'), 0x0F);
  check('combine and', ZXVideoRAM.combine(0xF0, 0x3C, 'and'), 0x30);
  check('combine or', ZXVideoRAM.combine(0xF0, 0x0F, 'or'), 0xFF);

  const vram = new ZXVideoRAM();
  check('new memory is zero', vram.bytes.every((b) => b === 0), true);
  check('poke first byte', vram.poke(0x40, 0x00, 0xAA), true);
  check('peek first byte', vram.peek(0x40, 0x00), 0xAA);
  check('peekOffset 0', vram.peekOffset(0), 0xAA);
  vram.poke(0x40, 0x00, 0xAA, 'xor');
  check('poke xor twice rubs out', vram.peekOffset(0), 0);
  check('poke into ROM is dropped', vram.poke(0x3F, 0xFF, 0x55), false);
  check('poke beyond is dropped', vram.pokeAddress(0x5B00, 0x55), false);
  check('peek outside is 0', vram.peekAddress(0x8000), 0);
  check('pokeAttribute last cell', vram.pokeAttribute(23, 31, 0x47), true);
  check('peekAddress $5AFF', vram.peekAddress(0x5AFF), 0x47);
  check('peekAttribute(23, 31)', vram.peekAttribute(23, 31), 0x47);
  check('pokeAttribute off screen', vram.pokeAttribute(24, 0, 0x47), false);

  const glyph = [0x00, 0x3C, 0x42, 0x42, 0x7E, 0x42, 0x42, 0x00];
  check('pokeCell (0, 1)', vram.pokeCell(0, 1, glyph), true);
  check('pokeCell lines land 256 apart', [0, 1, 2, 3, 4, 5, 6, 7].map((l) => vram.peekOffset(l*0x100+1)), glyph);
  check('pokeCell off screen', vram.pokeCell(0, 32, glyph), false);
  check('pokeCell (1, 0) starts at +32', (vram.pokeCell(1, 0, glyph), vram.peekOffset(0x20+0x100)), 0x3C);

  vram.clear(0x55, 0x38);
  check('clear fills bitmap', vram.peekOffset(0x17FF), 0x55);
  check('clear fills attributes', vram.peekAttribute(0, 0), 0x38);
  vram.clearArea({col: 2, row: 1, cols: 2, rows: 1}, 0x07);
  check('clearArea zeroes the cells', [vram.peekOffset(ZXVideoRAM.lineOffset(8)+2), vram.peekOffset(ZXVideoRAM.lineOffset(15)+3)], [0, 0]);
  check('clearArea leaves the neighbour', vram.peekOffset(ZXVideoRAM.lineOffset(8)+4), 0x55);
  check('clearArea sets the attribute', vram.peekAttribute(1, 3), 0x07);
  vram.fillAttributes({col: 0, row: 0, cols: 32, rows: 1}, 0x40, 'or');
  check('fillAttributes or', vram.peekAttribute(0, 31), 0x78);
  check('copy is independent', (() => { const c = vram.copy(); c.pokeOffset(0, 0x11); return [c.peekOffset(0), vram.peekOffset(0)]; })(), [0x11, 0x55]);
  check('restore from a memory', new ZXVideoRAM().restore(vram).peekAttribute(1, 3), 0x07);
}

// ------------------------------------------------------------ shifted blit

{
  const vram = new ZXVideoRAM();
  const span = vram.blitShifted(new Uint8Array([0xFF]), 1, 1, 4, 0, undefined, 'xor');
  check('blitShifted widens by a byte', span, 2);
  check('blitShifted shifts and carries', [vram.peekOffset(0), vram.peekOffset(1)], [0x0F, 0xF0]);
  vram.blitShifted(new Uint8Array([0xFF]), 1, 1, 4, 0, undefined, 'xor');
  check('blitShifted xor twice rubs out', [vram.peekOffset(0), vram.peekOffset(1)], [0, 0]);
  check('blitShifted aligned is one byte', vram.blitShifted(new Uint8Array([0xFF]), 1, 1, 8, 0), 1);
  check('blitShifted aligned lands in column 1', vram.peekOffset(1), 0xFF);
  vram.clear();
  vram.blitShifted(new Uint8Array([0xFF, 0xFF]), 1, 2, 0, 15, {col: 0, row: 2, cols: 32, rows: 1});
  check('blitShifted clips lines above the area', vram.peekOffset(ZXVideoRAM.lineOffset(15)), 0);
  check('blitShifted keeps lines in the area', vram.peekOffset(ZXVideoRAM.lineOffset(16)), 0xFF);
  vram.clear();
  vram.blitShifted(new Uint8Array([0xFF]), 1, 1, 252, 0);
  check('blitShifted clips the column past the edge', [vram.peekOffset(31), vram.peekOffset(32)], [0x0F, 0]);
  vram.clear();
  vram.blitShifted(new Uint8Array([0xFF]), 1, 1, -4, 0);
  check('blitShifted negative x', [vram.peekOffset(0)], [0xF0]);
}

// ---------------------------------------------------- linear <-> interleaved

{
  const area = {col: 4, row: 2, cols: 3, rows: 2};
  const bitmap = new Uint8Array(3*16);
  const attributes = new Uint8Array(6);
  let seed = 0xBEEF;
  for (let i = 0; i < bitmap.length; i++) {
    seed = (seed*1103515245+12345) & 0x7FFFFFFF;
    bitmap[i] = (seed >> 16) & 0xFF;
  }
  for (let i = 0; i < 6; i++) {
    attributes[i] = 0x40+i;
  }
  const vram = new ZXVideoRAM();
  vram.setLinear(area, bitmap, attributes);
  check('setLinear first byte at its address', vram.peekOffset(ZXVideoRAM.lineOffset(16)+4), bitmap[0]);
  check('setLinear line 9 at its address', vram.peekOffset(ZXVideoRAM.lineOffset(25)+6), bitmap[9*3+2]);
  check('setLinear attributes', [vram.peekAttribute(2, 4), vram.peekAttribute(3, 6)], [0x40, 0x45]);
  check('setLinear leaves the neighbour', vram.peekOffset(ZXVideoRAM.lineOffset(16)+7), 0);
  const back = vram.toLinear(area);
  check('toLinear size', [back.width, back.height, back.cols, back.rows], [24, 16, 3, 2]);
  check('toLinear bitmap round trip', list(back.bitmap), list(bitmap));
  check('toLinear attributes round trip', list(back.attributes), list(attributes));
  const whole = vram.toLinear();
  check('toLinear whole screen', [whole.bitmap.length, whole.attributes.length], [6144, 768]);

  // base64 in, the way the data files carry it
  const b64 = Buffer.from(bitmap).toString('base64');
  const fromB64 = new ZXVideoRAM().setLinear(area, b64, Buffer.from(attributes).toString('base64'));
  check('setLinear from base64', list(fromB64.toLinear(area).bitmap), list(bitmap));
  check('decode passes bytes through', ZXVideoRAM.decode(bitmap) === bitmap, true);
  check('hexToBytes', list(ZXVideoRAM.hexToBytes('003C42')), [0x00, 0x3C, 0x42]);
  let threw = false;
  try { ZXVideoRAM.decode({not: 'bytes'}); } catch (e) { threw = true; }
  check('decode refuses an object', threw, true);
}

// ---------------------------------------------------------------- painting

{
  const red = [0xb6, 0x39, 0x1e, 255], white = [0xb8, 0xb8, 0xb8, 255];
  const brightRed = [0xfc, 0x3b, 0x34, 255], brightWhite = [0xff, 0xff, 0xff, 255];
  check('PALETTE is ZXColor', ZXVideoRAM.PALETTE.length, 16);
  check('PALETTE bright cyan', ZXVideoRAM.PALETTE[13], [0x4d, 0xdc, 0xfc]);

  const vram = new ZXVideoRAM();
  vram.pokeOffset(0, 0x80);                    // one ink pixel, top left
  vram.pokeAttribute(0, 0, 0x02 | (7 << 3));   // red on white
  const rgba = new Uint8Array(256*192*4);
  vram.paint(rgba);
  check('paint ink pixel', pixel(rgba, 256, 0, 0), red);
  check('paint paper pixel', pixel(rgba, 256, 1, 0), white);
  check('paint zero attribute is black on black', pixel(rgba, 256, 8, 0), [0, 0, 0, 255]);
  check('paint last pixel has alpha', pixel(rgba, 256, 255, 191)[3], 255);

  vram.pokeAttribute(0, 0, 0x42 | (7 << 3));   // BRIGHT
  vram.paint(rgba);
  check('paint BRIGHT ink', pixel(rgba, 256, 0, 0), brightRed);
  check('paint BRIGHT paper', pixel(rgba, 256, 1, 0), brightWhite);

  vram.pokeAttribute(0, 0, 0x82 | (7 << 3));   // FLASH
  vram.paint(rgba, false);
  check('paint FLASH phase 0', pixel(rgba, 256, 0, 0), red);
  vram.paint(rgba, true);
  check('paint FLASH phase 1 swaps', [pixel(rgba, 256, 0, 0), pixel(rgba, 256, 1, 0)], [white, red]);

  vram.pokeAttribute(0, 0, 0xC2 | (7 << 3));   // BRIGHT + FLASH
  vram.paint(rgba, true, undefined, 0x3F);
  check('paint mask takes BRIGHT and FLASH off', [pixel(rgba, 256, 0, 0), pixel(rgba, 256, 1, 0)], [red, white]);

  // a rectangle of cells paints into a buffer of its own size
  vram.clear();
  vram.pokeOffset(ZXVideoRAM.lineOffset(16)+4, 0x01);
  vram.pokeAttribute(2, 4, 0x07);
  const part = new Uint8Array(24*16*4);
  vram.paint(part, false, {col: 4, row: 2, cols: 3, rows: 2});
  check('paint area: pixel at its place', pixel(part, 24, 7, 0), white);
  check('paint area: paper black', pixel(part, 24, 6, 0), [0, 0, 0, 255]);

  // paintLinear gives the same picture
  const lin = vram.toLinear({col: 4, row: 2, cols: 3, rows: 2});
  const part2 = new Uint8Array(24*16*4);
  ZXVideoRAM.paintLinear(part2, lin.bitmap, lin.attributes, 3, 2, false);
  check('paintLinear equals paint', Buffer.compare(Buffer.from(part), Buffer.from(part2)), 0);
}

// --------------------------------------------------------------- ink plane

{
  const vram = new ZXVideoRAM();
  check('ink plane off by default', vram.inkPlane, null);
  vram.enableInkPlane(true).setPen(0x45);         // bright cyan
  check('enableInkPlane allocates a byte per pixel', vram.inkPlane.length, 256*192);
  check('encodeInk: bit 7 owned, bit 4 FLASH, bit 3 BRIGHT, bits 0-2 ink', [ZXVideoRAM.encodeInk(0x45), ZXVideoRAM.encodeInk(0xC2), ZXVideoRAM.encodeInk(0x07)], [0x8D, 0x9A, 0x87]);
  vram.poke(0x40, 0x00, 0xF0);
  check('poke marks the lit pixels with the pen', list(vram.inkPlane.subarray(0, 8)), [0x8D, 0x8D, 0x8D, 0x8D, 0, 0, 0, 0]);
  vram.setPen(null).poke(0x40, 0x00, 0x0F, 'or');
  check('a null pen draws unowned', list(vram.inkPlane.subarray(4, 8)), [0, 0, 0, 0]);
  vram.poke(0x40, 0x00, 0x3F, 'and');
  check('an and write takes the owners of dark pixels away', list(vram.inkPlane.subarray(0, 4)), [0, 0, 0x8D, 0x8D]);
  check('clearInk forgets an area', (vram.clearInk({col: 0, row: 0, cols: 1, rows: 1}), list(vram.inkPlane.subarray(0, 8))), [0, 0, 0, 0, 0, 0, 0, 0]);
  vram.setPen(0x45).poke(0x40, 0x00, 0xFF);
  vram.clear();
  check('clear forgets the owners', vram.inkPlane.every((b) => b === 0), true);
}

// ------------------------------------------------------------------ colours

{
  check('colorsNames', ZXColor.colorsNames.length, 16);
  check('color(2) red', ZXColor.color(2), '#b6391e');
  check('color(10) bright red', ZXColor.color(10), '#fc3b34');
  check('color(16) is false', ZXColor.color(16), false);
  check('penAttrColor $47', ZXColor.penAttrColor(0x47), '#ffffff');
  check('bkAttrColor $38', ZXColor.bkAttrColor(0x38), '#b8b8b8');
  check('bkAttrColor $78 bright', ZXColor.bkAttrColor(0x78), '#ffffff');
  check('penAttrColor $42 bright red', ZXColor.penAttrColor(0x42), '#fc3b34');
  check('black and brightBlack are the same', ZXColor.black === ZXColor.brightBlack, true);
}

// --------------------------------------------------------------------- font

{
  const font = new ZXFonts8x8({}, false);
  check('fontsChars count', font.fontsChars.length, 96);
  check('glyphBytes A', list(font.glyphBytes('A')), [0x00, 0x3C, 0x42, 0x42, 0x7E, 0x42, 0x42, 0x00]);
  check('glyphBytes space', list(font.glyphBytes(' ')), [0, 0, 0, 0, 0, 0, 0, 0]);
  check('glyphBytes ©', list(font.glyphBytes('©')), [0x3C, 0x42, 0x99, 0xA1, 0xA1, 0x99, 0x42, 0x3C]);
  check('glyphBytes unknown is ?', list(font.glyphBytes('€')), list(font.glyphBytes('?')));
  check('glyphBytes matches getCharData', (() => {
    const rects = font.getCharData('A', '1', 1).data;      // [x, y, 1, 1] per set pixel
    const bytes = new Uint8Array(8);
    rects.forEach((r) => { bytes[r[1]] |= 0x80 >> r[0]; });
    return list(bytes);
  })(), list(font.glyphBytes('A')));
  const prop = new ZXFonts8x8({}, true);
  check('glyphBytes ignores proportional', list(prop.glyphBytes('I')), list(font.glyphBytes('I')));
}

// ------------------------------------------------------------------- sounds

{
  const rate = 44100;
  check('tStatesPerSecond', ZXMachineSounds.tStatesPerSecond, 3500000);
  check('pulse 2168 T', ZXMachineSounds.pulse(rate, 2168), 28);
  check('tapeFragments', ZXMachineSounds.tapeFragments(rate), [9, 10, 11, 22, 12]);
  check('tapePilotTone', ZXMachineSounds.tapePilotTone(rate, 0.1), {fragments: [28], pulses: [0], volume: 0.1});
  const rnd = ZXMachineSounds.tapeRndData(rate, 0.1);
  check('tapeRndData sync then random bits', [rnd.pulses, rnd.infinityRndPulses], [[0, 0, 1, 1], {fragments: [2, 3], quantity: 2}]);
  const block = ZXMachineSounds.tapeData(rate, 0.1, [0xA5], {byteEvent: 'tapeByte', endEvent: 'tapeEnd', firstByte: 7});
  check('tapeData pulses of $A5', block.pulses, [0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 3, 3, 2, 2, 3, 3, 4]);
  check('tapeData byte event after its bits', block.events[20], {id: 'tapeByte', at: 7, value: 0xA5});
  check('tapeData end event after the last pulse', block.events[21], {id: 'tapeEnd', bytes: 1});
  check('tapeData without events has none', 'events' in ZXMachineSounds.tapeData(rate, 0.1, [1]), false);
  // a turbo block in its own timing: 3 pilot pulses, the flag, one byte of
  // picture and the checksum; byte events only for the middle one
  const turbo = ZXMachineSounds.tapeBlock(rate, 0.1,
    {pilot: 2165, pilotPulses: 3, zero: 856, one: 1712}, [0xFF, 0xA5, 0x5A],
    {pilotEndEvent: 'pilotEnd', byteEvent: 'tapeByte', firstEventByte: 1, lastEventByte: 1,
     endEvent: 'blockEnd', eventData: {block: 8}});
  check('tapeBlock fragments: pilot, sync, bits, end', turbo.fragments, [28, 9, 10, 11, 22, 12]);
  check('tapeBlock pilot pulses then sync', turbo.pulses.slice(0, 5), [0, 0, 0, 1, 2]);
  check('tapeBlock pulses', turbo.pulses.length, 3+2+3*16+1);
  check('tapeBlock pilot end event', turbo.events[3], {id: 'pilotEnd', block: 8});
  check('tapeBlock byte event counted from firstEventByte', turbo.events[3+2+2*16], {id: 'tapeByte', at: 0, value: 0xA5, block: 8});
  check('tapeBlock no event for flag and checksum', Object.values(turbo.events).filter((e) => e.id == 'tapeByte').length, 1);
  check('tapeBlock end event', turbo.events[turbo.pulses.length], {id: 'blockEnd', bytes: 3, block: 8});
  check('tapeBlock defaults are the ROM block', ZXMachineSounds.tapeBlock(rate, 0.1, {}, [0]).pulses.length, 3223+2+16+1);
  check('dataBytes hex', list(ZXMachineSounds.dataBytes('a55a')), [0xA5, 0x5A]);
  check('dataBytes passes bytes through', ZXMachineSounds.dataBytes([1, 2]), [1, 2]);
  check('keyClick', ZXMachineSounds.keyClick(rate, 0.2), {fragments: [15], pulses: [0], volume: 0.2});
  const beeps = ZXMachineSounds.basicBeeps(rate, 0.1);
  check('basicBeeps seven notes and a rest', beeps.fragments.length, 8);
  check('basicBeeps first note C4 half period', beeps.fragments[0], Math.ceil(rate/261.626/2));
  check('basicBeeps ends with the rest', beeps.pulses[beeps.pulses.length-1], 7);
  check('basicBeeps every note lasts 100 ms or more', (() => {
    let ok = true;
    for (let n = 0; n < 7; n++) {
      const count = beeps.pulses.filter((p) => p === n).length;
      ok = ok && count*beeps.fragments[n] >= rate/10;
    }
    return ok;
  })(), true);
}

// ------------------------------------------------------------- ROM printing

{
  const font = new ZXFonts8x8({}, false);
  const cellBytes = (ram, row, col) => Array.from({length: 8}, (_, l) => ram.bytes[ZXVideoRAM.lineOffset(row*8+l)+col]);
  const ram = new ZXVideoRAM();
  const print = new ZXRomPrint(ram, 0x00);
  // PAPER 5: INK 0: AT 1,12; "AB"
  const used = print.print([17, 5, 16, 0, 22, 1, 12, 0x41, 0x42, 0xFF, 0x43]);
  check('romPrint stops after $FF', used, 10);
  check('romPrint glyph A', cellBytes(ram, 1, 12), list(font.glyphBytes('A')));
  check('romPrint attribute PAPER 5 INK 0', ram.bytes[ZXVideoRAM.ATTRIBUTES_OFFSET+32+12], 0x28);
  check('romPrint position moves on', [print.row, print.col], [1, 14]);
  print.print([20, 1, 0x41, 20, 0]);
  check('romPrint INVERSE 1', cellBytes(ram, 1, 14), list(font.glyphBytes('A')).map((b) => b ^ 0xFF));
  print.print([21, 1, 22, 1, 12, 0x41, 21, 0]);
  check('romPrint OVER 1 XORs', cellBytes(ram, 1, 12), [0, 0, 0, 0, 0, 0, 0, 0]);
  print.print([19, 1, 18, 1, 22, 2, 31, 0x20, 0x20]);
  check('romPrint BRIGHT 1 FLASH 1', ram.bytes[ZXVideoRAM.ATTRIBUTES_OFFSET+2*32+31], 0xE8);
  check('romPrint wraps past column 31', [print.row, print.col], [3, 1]);
  check('romPrint string with ©', new ZXRomPrint(new ZXVideoRAM()).codeOf('©'), 0x7F);
  check('romPrint string with £', new ZXRomPrint(new ZXVideoRAM()).codeOf('£'), 0x60);
  check('romPrint refuses INK 8', (() => { try { new ZXRomPrint(new ZXVideoRAM()).print([16, 8]); return 'printed'; } catch (e) { return 'refused'; } })(), 'refused');
  check('romPrint refuses UDG', (() => { try { new ZXRomPrint(new ZXVideoRAM()).print([0x90]); return 'printed'; } catch (e) { return 'refused'; } })(), 'refused');
}

// ------------------------------------------------------------- ROM PLOT / DRAW

{
  // Expected values from the real 48K ROM run in SkoolKit's Z80 simulator
  // (tools/retro/romdrawref.py): the same screen pattern, the same system
  // variables, the checksum of the 6912 bytes after and COORDS.
  const cases = [
    ['plot 0,0', 'plot', 0, 0, 0, 0, 0, 0, 0x00, 0x38, 0x00, 3782832936, 0, 0],
    ['plot 255,175', 'plot', 0, 0, 175, 255, 0, 0, 0x00, 0x47, 0x00, 3271964146, 255, 175],
    ['plot over', 'plot', 0, 0, 100, 37, 0, 0, 0x01, 0x16, 0x00, 3059231290, 37, 100],
    ['plot inverse', 'plot', 0, 0, 33, 200, 0, 0, 0x04, 0x29, 0xF0, 3245793542, 200, 33],
    ['plot ink9 paper9', 'plot', 0, 0, 77, 77, 0, 0, 0x50, 0x0A, 0x00, 319670553, 77, 77],
    ['line up', 'line', 128, 40, 60, 0, 1, 1, 0x00, 0x47, 0x00, 471234504, 128, 100],
    ['line down', 'line', 128, 140, 60, 0, 255, 1, 0x00, 0x47, 0x00, 2827172552, 128, 80],
    ['line right', 'line', 10, 88, 0, 200, 1, 1, 0x00, 0x30, 0x00, 3004085587, 210, 88],
    ['line left', 'line', 250, 88, 0, 200, 1, 255, 0x00, 0x30, 0x00, 1846636518, 50, 88],
    ['line shallow +', 'line', 0, 0, 37, 250, 1, 1, 0x00, 0x05, 0x00, 167293653, 250, 37],
    ['line steep -', 'line', 255, 175, 170, 61, 255, 255, 0x00, 0x05, 0x00, 4254733624, 194, 5],
    ['line diagonal', 'line', 20, 20, 100, 100, 1, 1, 0x00, 0x44, 0x00, 4262618841, 120, 120],
    ['line steep + -', 'line', 200, 10, 150, 99, 1, 255, 0x01, 0x38, 0x07, 4206721284, 101, 160],
    ['line shallow - +', 'line', 3, 170, 13, 251, 255, 1, 0x04, 0x20, 0x00, 3727209335, 254, 157],
    ['line over twice', 'line2', 60, 60, 50, 50, 1, 1, 0x01, 0x38, 0x00, 1271957354, 110, 110],
    ['line zero', 'line', 99, 99, 0, 0, 1, 1, 0x00, 0x38, 0x00, 4123045376, 99, 99],
  ];
  const machine = () => {
    const mem = new Uint8Array(65536);
    for (let i = 0; i < 6144; i++) { mem[0x4000+i] = (i*37+(i >> 5)) & 0xFF; }
    for (let i = 0; i < 768; i++) { mem[0x5800+i] = (i*11) & 0x7F; }
    return {mem, rd: (a) => mem[a & 0xFFFF], wr: (a, v) => { if ((a & 0xFFFF) >= 0x4000) { mem[a & 0xFFFF] = v & 0xFF; } }};
  };
  const checksum = (mem) => {
    let s = 0;
    for (let i = 0; i < 6912; i++) { s = (Math.imul(s, 31)+mem[0x4000+i]+i) >>> 0; }
    return s;
  };
  for (const [name, kind, x, y, b, c, d, e, flags, attr, mask, sum, cx, cy] of cases) {
    const m = machine();
    const draw = new ZXRomDraw(m);
    m.mem[0x5C7D] = x; m.mem[0x5C7E] = y;
    m.mem[0x5C8F] = attr; m.mem[0x5C90] = mask; m.mem[0x5C91] = flags;
    if (kind === 'plot') {
      draw.plotSub(b, c);
    } else {
      for (let n = 0; n < (kind === 'line2' ? 2 : 1); n++) {
        m.mem[0x5C7D] = x; m.mem[0x5C7E] = y;
        draw.drawLine(b, c, d, e);
      }
    }
    check('romDraw '+name, [checksum(m.mem), m.mem[0x5C7D], m.mem[0x5C7E]], [sum, cx, cy]);
  }
  const m = machine();
  const draw = new ZXRomDraw(m);
  let s = 0;
  for (let yy = 0; yy < 176; yy += 7) {
    for (let xx = 0; xx < 256; xx += 13) {
      const p = draw.pixelAdd(yy, xx);
      s = (Math.imul(s, 31)+p.address*8+p.bit) >>> 0;
    }
  }
  check('romDraw pixelAdd grid', s, 3387558964);
  check('romDraw refuses y 176', (() => { try { draw.pixelAdd(176, 0); return 'drawn'; } catch (err) { return 'refused'; } })(), 'refused');
}

console.log(`checkzx: ${checks} checks, ${differences} differences`);
process.exit(differences);
