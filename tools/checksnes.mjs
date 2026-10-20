#!/usr/bin/env node
/**
 * Self-check of the Super Nintendo platform classes under Node — the
 * DOM-free half of the platform: the colours, the planar tiles, the PPU over
 * VRAM/CGRAM/OAM (the ports, mode 1, the sprites with the chip's limits per
 * line, the brightness inside the frame), the joypad word and the platform's
 * geometry. Nothing here needs a browser; it is the harness a match* tool of
 * a SNES game stands on (`super-r-type/tools/matchscreen.mjs` measures the
 * same classes against the emulator's pixels).
 *
 * Every check is one line: what was expected, what came out. The report has
 * the shape of the match tools — the number of checks and the number of
 * differences — and the exit code is the number of differences.
 *
 * usage: node tools/checksnes.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { SNESColor } = await import('../js/platform/canvas2D/snes/snesColor.js');
const { SNESTiles } = await import('../js/platform/canvas2D/snes/snesTiles.js');
const { SNESPPU } = await import('../js/platform/canvas2D/snes/snesPPU.js');
const { SNESJoypad } = await import('../js/platform/canvas2D/snes/snesJoypad.js');
const { SNESPlatform } = await import('../js/platform/canvas2D/snes/snesPlatform.js');
import { createRequire } from 'node:module';
const { loadClassicScript } = createRequire(import.meta.url)('./classicScript.cjs');
// the worker's pure function of the sprite limits — held against the PPU's own flags below
const snesSpriteLimits = loadClassicScript(new URL('../js/platform/canvas2D/snes/snesSpriteLimits.js', import.meta.url).pathname);

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

/** a packed little-endian pixel as '#rrggbb' */
function hex(p) {
  return '#'+[p & 255, (p >> 8) & 255, (p >> 16) & 255].map((c) => c.toString(16).padStart(2, '0')).join('');
} // hex

const W = SNESPPU.WIDTH, H = SNESPPU.HEIGHT;
const px = new Uint32Array(W*H);
const at = (x, y) => hex(px[y*W+x]);

// ------------------------------------------------------------------ colours

{
  check('value(31,0,0) is red', SNESColor.value(31, 0, 0), 0x001F);
  check('value(0,0,31) is blue', SNESColor.value(0, 0, 31), 0x7C00);
  check('white', SNESColor.rgb(0x7FFF), '#ffffff');
  check('black', SNESColor.rgb(0), '#000000');
  check('red', SNESColor.rgb(0x001F), '#ff0000');
  check('5 bits widen as (c<<3)|(c>>2)', SNESColor.rgb(SNESColor.value(1, 2, 16)), '#081084');
  check('brightness 7 scales in integers', SNESColor.rgb(0x001F, 7), '#730000');
  check('brightness 0 is black', SNESColor.rgb(0x7FFF, 0), '#000000');
  check('brightness 15 is the colour', SNESColor.rgb(0x03E0, 15), '#00ff00');
  check('component(31, 8)', SNESColor.component(31, 8), (16 << 3) | (16 >> 2));
  check('lookup little-endian green', (SNESColor.lookup(true, 15)[0x03E0] >>> 0).toString(16), 'ff00ff00');
  check('lookup big-endian green', (SNESColor.lookup(false, 15)[0x03E0] >>> 0).toString(16), 'ff00ff');
  check('lookup is kept', SNESColor.lookup(true, 15) === SNESColor.lookup(true, 15), true);
  check('lookup per brightness', SNESColor.lookup(true, 15) !== SNESColor.lookup(true, 14), true);
  check('pack', (SNESColor.pack(0x001F, 15, true) >>> 0).toString(16), 'ff0000ff');
}

// -------------------------------------------------------------------- tiles

{
  const idx = new Uint8Array(64);
  idx[0] = 15; idx[9] = 5; idx[63] = 8;
  const bytes = SNESTiles.encode(idx, 4);
  check('4bpp tile is 32 bytes', bytes.length, 32);
  check('pixel (0,0)=15 sets bit 7 of all four planes', [bytes[0], bytes[1], bytes[16], bytes[17]], [0x80, 0x80, 0x80, 0x80]);
  check('pixel (1,1)=5 sets planes 0 and 2 of row 1', [bytes[2], bytes[3], bytes[18], bytes[19]], [0x40, 0, 0x40, 0]);
  check('pixel (7,7)=8 sets plane 3 of row 7', [bytes[14], bytes[15], bytes[30], bytes[31]], [0, 0, 0, 0x01]);
  const vram = new Uint8Array(0x10000);
  vram.set(bytes, 0x4000*2);
  check('decode round-trips', Array.from(SNESTiles.decode(vram, 0x4000, 4)), Array.from(idx));
  check('pixel()', [SNESTiles.pixel(vram, 0x4000, 4, 0, 0), SNESTiles.pixel(vram, 0x4000, 4, 1, 1), SNESTiles.pixel(vram, 0x4000, 4, 2, 2)], [15, 5, 0]);
  const two = SNESTiles.encode(idx.map((v) => v & 3), 2);
  check('2bpp tile is 16 bytes', two.length, 16);
  check('2bpp keeps two planes', [two[0], two[1], two[2]], [0x80, 0x80, 0x40]);
  const text = SNESTiles.fromText(['1.......', '.2......', '........', '........', '........', '........', '........', '.......f'], 4);
  check('fromText: 1 at (0,0) is plane 0, 2 at (1,1) is plane 1 of row 1, f at (7,7) is all four planes', [text[0], text[2], text[3], text[18], text[14], text[15], text[30], text[31]], [0x80, 0, 0x40, 0, 0x01, 0x01, 0x01, 0x01]);
  check('words()', [SNESTiles.words(2), SNESTiles.words(4), SNESTiles.words(8)], [8, 16, 32]);
}

// ------------------------------------------------------------ the registers

{
  const ppu = new SNESPPU();
  check('power-on: forced blank', ppu.forcedBlank, true);
  check('power-on: version 0', ppu.version, 0);
  ppu.write(0x2105, 0x09);
  check('BGMODE: mode 1 with BG3 priority', [ppu.bgMode, ppu.bg3Priority], [1, true]);
  ppu.write(0x2107, 0x03);
  check('BG1SC: map at 0, 64x64', [ppu.layers[0].tilemap, ppu.layers[0].wide, ppu.layers[0].tall], [0, true, true]);
  ppu.write(0x2108, 0x13);
  check('BG2SC: map at $1000', ppu.layers[1].tilemap, 0x1000);
  ppu.write(0x2109, 0x5C);
  check('BG3SC: map at $5C00, 32x32', [ppu.layers[2].tilemap, ppu.layers[2].wide, ppu.layers[2].tall], [0x5C00, false, false]);
  ppu.write(0x210B, 0x22);
  ppu.write(0x210C, 0x55);
  check('BG12NBA/BG34NBA: tiles at $2000 and $5000', [ppu.layers[0].chr, ppu.layers[1].chr, ppu.layers[2].chr], [0x2000, 0x2000, 0x5000]);
  ppu.write(0x2101, 0x03);
  check('OBSEL: 8x8/16x16, names at $6000, second table +$1000', [ppu.objSize, ppu.objBase, ppu.objGap], [0, 0x6000, 0x1000]);
  ppu.write(0x2101, 0x6B);
  check('OBSEL: 16x32/32x64, names at $6000, second table +$2000', [ppu.objSize, ppu.objBase, ppu.objGap], [3, 0x6000, 0x2000]);
  ppu.write(0x212C, 0x17);
  check('TM', ppu.tm, 0x17);
  check('writes bump the version', ppu.version > 0, true);
  // the scroll registers: two writes, the shared latch, 16 bits kept
  ppu.write(0x210F, 0x65); ppu.write(0x210F, 0x01);
  check('BG2HOFS 357 out of $65, $01', ppu.layers[1].hscroll & 0x3FF, 357);
  ppu.write(0x2110, 0x18); ppu.write(0x2110, 0x00);
  check('BG2VOFS 24', ppu.layers[1].vscroll & 0x3FF, 24);
  ppu.write(0x210D, 0xFF); ppu.write(0x210D, 0x03);
  check('BG1HOFS 1023', ppu.layers[0].hscroll & 0x3FF, 1023);
  ppu.write(0x210E, 0x34); ppu.write(0x210E, 0x12);
  check('BG1VOFS keeps the high byte for the next latch', ppu.layers[0].vscroll, 0x1234);
  // VRAM through the port
  ppu.write(0x2115, 0x80);
  ppu.write(0x2116, 0x00); ppu.write(0x2117, 0x40);
  ppu.write(0x2118, 0x12); ppu.write(0x2119, 0x34);
  check('VMDATA writes a word at $4000', [ppu.vram[0x8000], ppu.vram[0x8001], ppu.vramAddress], [0x12, 0x34, 0x4001]);
  check('vramWord', ppu.vramWord(0x4000), 0x3412);
  ppu.write(0x2115, 0x00);
  ppu.write(0x2118, 0x56);
  check('VMAIN bit 7 clear: the low byte steps the address', [ppu.vram[0x8002], ppu.vramAddress], [0x56, 0x4002]);
  ppu.write(0x2115, 0x81);
  ppu.write(0x2119, 0x78);
  check('VMAIN step 32', [ppu.vram[0x8005], ppu.vramAddress], [0x78, 0x4022]);
  // CGRAM through the port
  ppu.write(0x2121, 1);
  ppu.write(0x2122, 0xE0); ppu.write(0x2122, 0x03);
  ppu.write(0x2122, 0x1F); ppu.write(0x2122, 0xFF);
  check('CGDATA: low byte latched, high byte masked to 7 bits', [ppu.color(1), ppu.color(2), ppu.cgramAddress], [0x03E0, 0x7F1F, 3]);
  // OAM through the port
  ppu.write(0x2102, 0x00); ppu.write(0x2103, 0x00);
  ppu.write(0x2104, 0x10); ppu.write(0x2104, 0x20);
  check('OAMDATA: the low table takes words', [ppu.oam[0], ppu.oam[1], ppu.oamByteAddress], [0x10, 0x20, 2]);
  ppu.write(0x2104, 0x30);
  check('OAMDATA: the even byte waits in the latch', ppu.oam[2], 0);
  ppu.write(0x2102, 0x00); ppu.write(0x2103, 0x01);
  ppu.write(0x2104, 0x55);
  check('OAMDATA: the high table takes bytes', [ppu.oam[0x200], ppu.oamByteAddress], [0x55, 0x201]);
  ppu.write(0x2103, 0x80);
  check('OAMADDH bit 7 is the priority rotation', ppu.oamPriority, true);
  check('STAT77 at rest', ppu.status77(), 0x01);
  check('a line write list is sorted', (ppu.setLineWrites([{line: 5, x: 0, register: 0x2100, value: 1}, {line: 2, x: 9, register: 0x2100, value: 2}, {line: 2, x: 3, register: 0x2100, value: 3}]).lineWrites.map((w) => w.line+':'+w.x)), ['2:3', '2:9', '5:0']);
}

// ------------------------------------------------------ mode 1 backgrounds

/** a PPU in mode 1 with a small scene: BG1 map at 0, BG2 map at $400, BG3 map at $5C00, tiles at $2000 (4bpp) and $5000 (2bpp) */
function scene() {
  const ppu = new SNESPPU();
  ppu.write(0x2105, 0x09);               // mode 1, BG3 priority
  ppu.write(0x2107, 0x00);               // BG1 map at word 0, 32x32
  ppu.write(0x2108, 0x04);               // BG2 map at word $400
  ppu.write(0x2109, 0x5C);               // BG3 map at word $5C00
  ppu.write(0x210B, 0x22);               // BG1, BG2 tiles at word $2000
  ppu.write(0x210C, 0x05);               // BG3 tiles at word $5000
  ppu.write(0x2101, 0x03);               // sprites 8x8/16x16 at word $6000
  ppu.write(0x212C, 0x17);               // BG1 BG2 BG3 OBJ
  ppu.write(0x2100, 0x0F);               // full brightness, picture on
  // colours: backdrop blue; BG palettes 0: red, 1: green, 2 (2bpp, index 9): yellow; sprite palette 0: white, grey; palette 3: magenta
  const c = (i, v) => { ppu.cgram[i*2] = v & 0xFF; ppu.cgram[i*2+1] = v >> 8; };
  c(0, 0x7C00); c(1, 0x001F); c(17, 0x03E0); c(9, 0x03FF); c(129, 0x7FFF); c(130, 0x4210); c(128+48+1, 0x7C1F);
  // 4bpp tiles at $2000: 1 solid colour 1, 2 left half colour 1, 3 one pixel at (0,0), 4 solid colour 2
  const solid = (v) => new Uint8Array(64).fill(v);
  const half = new Uint8Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) half[y*8+x] = 1;
  const dot = new Uint8Array(64); dot[0] = 1;
  ppu.vram.set(SNESTiles.encode(solid(1), 4), (0x2000+16)*2);
  ppu.vram.set(SNESTiles.encode(half, 4), (0x2000+32)*2);
  ppu.vram.set(SNESTiles.encode(dot, 4), (0x2000+48)*2);
  ppu.vram.set(SNESTiles.encode(solid(2), 4), (0x2000+64)*2);
  // 2bpp tile 1 at $5000: solid colour 1
  ppu.vram.set(SNESTiles.encode(solid(1), 2), (0x5000+8)*2);
  // sprite tiles at $6000: the same four shapes as tiles 1-4, plus 16 (row 1) as colour 2 and 17 as a dot
  ppu.vram.set(SNESTiles.encode(solid(1), 4), (0x6000+16)*2);
  ppu.vram.set(SNESTiles.encode(half, 4), (0x6000+32)*2);
  ppu.vram.set(SNESTiles.encode(dot, 4), (0x6000+48)*2);
  ppu.vram.set(SNESTiles.encode(solid(2), 4), (0x6000+64)*2);
  ppu.vram.set(SNESTiles.encode(solid(2), 4), (0x6000+16*16)*2);
  ppu.vram.set(SNESTiles.encode(dot, 4), (0x6000+17*16)*2);
  // the second name table: tile 1 there is solid colour 2
  ppu.vram.set(SNESTiles.encode(solid(2), 4), (0x7000+16)*2);
  // every sprite off screen to begin with (X = -255, as the game parks them)
  for (let i = 0; i < 128; i++) { ppu.oam[i*4] = 1; ppu.oam[i*4+1] = 0xF0; }
  ppu.oam.fill(0x55, 0x200);
  ppu.touch();
  return ppu;
} // scene

/** a map entry */
function map(ppu, base, col, row, entry) {
  const word = base+row*32+col;
  ppu.vram[word*2] = entry & 0xFF;
  ppu.vram[word*2+1] = entry >> 8;
} // map

/** a sprite in OAM */
function sprite(ppu, i, x, y, tile, attr, large) {
  ppu.oam[i*4] = x & 0xFF;
  ppu.oam[i*4+1] = y & 0xFF;
  ppu.oam[i*4+2] = tile;
  ppu.oam[i*4+3] = attr;
  const shift = (i & 3)*2;
  const hi = ppu.oam[0x200+(i >> 2)] & ~(3 << shift);
  ppu.oam[0x200+(i >> 2)] = hi | ((x < 0 || x > 255 ? 1 : 0) << shift) | ((large ? 2 : 0) << shift);
} // sprite

{
  const ppu = scene();
  map(ppu, 0, 0, 0, 1);                  // BG1 tile 1 at the top left
  map(ppu, 0, 1, 0, 2 | 0x4000);         // tile 2 flipped
  map(ppu, 0, 2, 0, 1 | (1 << 10));      // palette 1
  map(ppu, 0, 3, 0, 1 | (1 << 10));      // over BG2
  map(ppu, 0x400, 3, 0, 1);              // BG2 tile 1 under it
  map(ppu, 0, 4, 0, 1);                  // under BG3 with priority
  map(ppu, 0x5C00, 4, 0, 1 | (2 << 10) | 0x2000);
  map(ppu, 0, 0, 1, 3 | 0x8000);         // the dot, flipped vertically: row 7 of tile = picture row 14
  ppu.touch();
  ppu.paint32(px, true);
  check('paint: backdrop is colour 0', at(100, 100), '#0000ff');
  check('paint: BG1 tile 1 is red', at(0, 0), '#ff0000');
  check('paint: row 0 shows map line 1 — tile row 0 ends on picture row 6', [at(0, 6), at(0, 7)], ['#ff0000', '#0000ff']);
  check('paint: horizontal flip', [at(8, 0), at(11, 0), at(12, 0), at(15, 0)], ['#0000ff', '#0000ff', '#ff0000', '#ff0000']);
  check('paint: palette 1 is green', at(16, 0), '#00ff00');
  check('paint: BG1 over BG2', at(24, 0), '#00ff00');
  check('paint: BG3 with priority over BG1 (mode 1 bit 3)', at(32, 0), '#ffff00');
  check('paint: vertical flip', [at(0, 14), at(0, 7)], ['#ff0000', '#0000ff']);
  check('paint: nothing unsupported', ppu.unsupported, {});
  check('paint: no overflow flags', [ppu.rangeOver, ppu.timeOver], [false, false]);
  map(ppu, 0x400, 3, 0, 1 | 0x2000);
  ppu.touch();
  ppu.paint32(px, true);
  check('paint: BG2 with the priority bit over BG1 without it', at(24, 0), '#ff0000');
  ppu.write(0x2105, 0x01);
  ppu.paint32(px, true);
  check('paint: BG3 without the mode bit is under BG1', at(32, 0), '#ff0000');
  ppu.write(0x2105, 0x09);
  ppu.write(0x212C, 0x16);
  ppu.paint32(px, true);
  check('paint: TM without BG1', [at(0, 0), at(24, 0)], ['#0000ff', '#ff0000']);
  ppu.write(0x212C, 0x17);
  // scroll: BG1 right by 4 and down by 1
  ppu.write(0x210D, 0x04); ppu.write(0x210D, 0x00);
  ppu.write(0x210E, 0x01); ppu.write(0x210E, 0x00);
  ppu.paint32(px, true);
  check('paint: horizontal scroll 4', [at(3, 0), at(4, 0)], ['#ff0000', '#0000ff']);
  check('paint: vertical scroll 1 — tile row 0 ends on picture row 5', [at(0, 5), at(0, 6)], ['#ff0000', '#0000ff']);
  ppu.write(0x210D, 0x00); ppu.write(0x210D, 0x00);
  ppu.write(0x210E, 0x00); ppu.write(0x210E, 0x00);
  // a 64x64 map: column 32 lives in the second screen (+$400 words), row 32 in the third (+$800)
  ppu.write(0x2107, 0x03);
  map(ppu, 0x400, 0, 0, 1 | (1 << 10));
  map(ppu, 0x800, 0, 0, 1);
  ppu.write(0x210D, 0x00); ppu.write(0x210D, 0x01);      // hscroll 256
  ppu.paint32(px, true);
  check('paint: 64-wide map, column 32 from the second screen', at(0, 0), '#00ff00');
  ppu.write(0x210D, 0x00); ppu.write(0x210D, 0x00);
  ppu.write(0x210E, 0xFF); ppu.write(0x210E, 0x00);      // vscroll 255: row 0 shows map line 256 = tile row 32
  ppu.paint32(px, true);
  check('paint: 64-tall map, row 32 from the third screen', at(0, 0), '#ff0000');
  ppu.write(0x210E, 0x00); ppu.write(0x210E, 0x00);
  ppu.write(0x2107, 0x00);
  // brightness and forced blank
  ppu.write(0x2100, 0x07);
  ppu.paint32(px, true);
  check('paint: brightness 7', [at(0, 0), at(100, 100)], ['#730000', '#000073']);
  ppu.write(0x2100, 0x8F);
  ppu.paint32(px, true);
  check('paint: forced blank is black', [at(0, 0), at(100, 100)], ['#000000', '#000000']);
  ppu.write(0x2100, 0x0F);
  // line writes: a fade from row 100, a split on row 50, back afterwards
  ppu.setLineWrites([{line: 100, x: 0, register: 0x2100, value: 0x07}, {line: 50, x: 128, register: 0x2100, value: 0x80}, {line: 60, x: 0, register: 0x2100, value: 0x0F}]);
  // tile row 12 is picture rows 95-102 (map line = row + 1), row 6 is rows 47-54, row 7 rows 55-62
  map(ppu, 0, 0, 12, 1); map(ppu, 0, 16, 6, 1); map(ppu, 0, 0, 6, 1); map(ppu, 0, 0, 7, 1);
  ppu.touch();
  ppu.paint32(px, true);
  check('line writes: full brightness above the write', [at(0, 99), at(100, 99)], ['#ff0000', '#0000ff']);
  check('line writes: dim from the row of the write', [at(0, 100), at(100, 100), at(0, 103)], ['#730000', '#000073', '#000073']);
  check('line writes: a split inside the row', [at(0, 50), at(7, 50), at(8, 50), at(127, 50), at(128, 50), at(135, 50)], ['#ff0000', '#ff0000', '#0000ff', '#0000ff', '#000000', '#000000']);
  check('line writes: the rows after the split are blank', [at(0, 51), at(128, 51)], ['#000000', '#000000']);
  check('line writes: the picture comes back on row 60', [at(0, 60), at(100, 60)], ['#ff0000', '#0000ff']);
  check('line writes: the registers come back after the paint', [ppu.brightness, ppu.forcedBlank], [15, false]);
  ppu.setLineWrites([]);
  // what is not modelled is counted
  ppu.write(0x2105, 0x00);
  ppu.paint32(px, true);
  check('unsupported: mode 0 counted per line, backdrop drawn', [ppu.unsupported.mode0, at(0, 0)], [224, '#0000ff']);
  ppu.write(0x2105, 0x19);
  ppu.paint32(px, true);
  check('unsupported: 16x16 tiles', ppu.unsupported.largeTiles, 224);
  ppu.write(0x2105, 0x09);
  ppu.write(0x2106, 0x01);
  ppu.paint32(px, true);
  check('mosaic of size 1 is nothing', ppu.unsupported, {});
  ppu.write(0x212E, 0x01);
  ppu.paint32(px, true);
  check('unsupported: a window on a visible layer', ppu.unsupported.windows, 224);
  ppu.write(0x212E, 0x00);
  ppu.write(0x2131, 0x01);
  ppu.paint32(px, true);
  check('unsupported: colour math', ppu.unsupported.colorMath, 224);
  ppu.write(0x2131, 0x00);
  ppu.write(0x2133, 0x01);
  ppu.paint32(px, true);
  check('unsupported: interlace', ppu.unsupported.setini, 224);
  ppu.write(0x2133, 0x00);
  ppu.paint32(px, true);
  check('clean again', ppu.unsupported, {});
}

// ------------------------------------------------------------------- mosaic

{
  // BG1: tile 1 (red) at column 1 row 1 only, scrolled so that it starts on picture (7, 7); the mosaic of 8 counts
  // its blocks from the picture's top left, so the block (0,0)-(7,7) shows the backdrop and the block (8,8) the red
  const ppu = scene();
  map(ppu, 0, 1, 1, 1);
  ppu.write(0x210D, 0x01); ppu.write(0x210D, 0x00);   // BG1 hscroll 1: tile column 1 starts at x = 7
  ppu.write(0x210E, 0x00); ppu.write(0x210E, 0x00);   // vscroll 0: map line 8 = picture row 7
  ppu.touch();
  ppu.paint32(px, true);
  check('no mosaic: the tile starts on (7,7)', [at(6, 7), at(7, 7), at(7, 6)], ['#0000ff', '#ff0000', '#0000ff']);
  ppu.write(0x2106, 0x71);                           // size 8, BG1
  ppu.paint32(px, true);
  check('mosaic 8: the block (0,0) shows its first pixel — the backdrop — over the tile\'s corner', [at(7, 7), at(7, 0)], ['#0000ff', '#0000ff']);
  check('mosaic 8: the block (8,8) shows the red of (8,8) everywhere in it', [at(8, 8), at(15, 15), at(15, 8)], ['#ff0000', '#ff0000', '#ff0000']);
  check('mosaic 8: the block (16,8) — the tile ends at x = 14, so its first pixel is the backdrop', at(16, 8), '#0000ff');
  check('mosaic 8: the row of blocks below the tile (rows 16-23) takes row 16 — backdrop', at(8, 16), '#0000ff');
  check('mosaic 8: not counted as unsupported', ppu.unsupported, {});
  ppu.write(0x2106, 0x72);                           // size 8 on BG2 only: BG1 unchanged
  ppu.paint32(px, true);
  check('mosaic on another layer leaves BG1 alone', [at(7, 7), at(6, 7)], ['#ff0000', '#0000ff']);
  ppu.write(0x2106, 0x00);
}

// ------------------------------------------------------------------ sprites

{
  const ppu = scene();
  sprite(ppu, 0, 10, 20, 1, 0x00);
  ppu.touch();
  ppu.paint32(px, true);
  check('sprite: 8x8 at (10,20) in sprite palette 0', [at(10, 20), at(17, 27), at(18, 20), at(10, 19), at(10, 28)], ['#ffffff', '#ffffff', '#0000ff', '#0000ff', '#0000ff']);
  sprite(ppu, 1, 30, 20, 2, 0x40);           // half tile, flipped
  sprite(ppu, 2, 50, 20, 3, 0x80);           // the dot, flipped vertically
  sprite(ppu, 3, 70, 20, 1, 0x06);           // palette 3
  sprite(ppu, 4, 90, 20, 1, 0x01);           // the second name table
  ppu.touch();
  ppu.paint32(px, true);
  check('sprite: horizontal flip', [at(30, 20), at(33, 20), at(34, 20), at(37, 20)], ['#0000ff', '#0000ff', '#ffffff', '#ffffff']);
  check('sprite: vertical flip', [at(50, 20), at(50, 27)], ['#0000ff', '#ffffff']);
  check('sprite: palette 3', at(70, 20), '#ff00ff');
  check('sprite: second name table', at(90, 20), hex(SNESColor.pack(0x4210, 15, true)));
  // 16x16: tiles n, n+1, n+16, n+17
  sprite(ppu, 5, 120, 20, 0, 0x00, true);
  ppu.touch();
  ppu.paint32(px, true);
  const grey = hex(SNESColor.pack(0x4210, 15, true));
  check('sprite: 16x16 quadrants (tile 0 empty, 1 solid, 16 colour 2, 17 a dot)', [at(120, 20), at(128, 20), at(120, 28), at(128, 28), at(129, 28)], ['#0000ff', '#ffffff', grey, '#ffffff', '#0000ff']);
  // priorities against the backgrounds
  map(ppu, 0, 20, 2, 1);                     // BG1 at x 160-167, picture rows 15-22
  map(ppu, 0, 21, 2, 1 | 0x2000);            // BG1 with priority at 168-175
  map(ppu, 0x5C00, 22, 2, 1 | (2 << 10) | 0x2000);   // BG3 with priority at 176-183
  sprite(ppu, 6, 160, 16, 4, 0x00);          // OBJ.0 under BG1.0
  sprite(ppu, 7, 168, 16, 4, 0x30);          // OBJ.3 over BG1.1
  sprite(ppu, 8, 176, 16, 4, 0x30);          // OBJ.3 under BG3.1a
  ppu.touch();
  ppu.paint32(px, true);
  check('sprite: priority 0 under BG1', at(160, 16), '#ff0000');
  check('sprite: priority 3 over BG1 with the priority bit', at(168, 16), grey);
  check('sprite: priority 3 under BG3 with priority in mode 1', at(176, 16), '#ffff00');
  sprite(ppu, 6, 160, 16, 4, 0x20);          // OBJ.2 over BG1.0
  ppu.touch();
  ppu.paint32(px, true);
  check('sprite: priority 2 over BG1 without the bit', at(160, 16), grey);
  // sprite over sprite: the lower OAM index wins, whatever the priority bits
  sprite(ppu, 9, 200, 40, 1, 0x00);          // white, priority 0
  sprite(ppu, 10, 204, 40, 4, 0x30);         // grey, priority 3, later in OAM
  ppu.touch();
  ppu.paint32(px, true);
  check('sprite: the lower index is on top', [at(204, 40), at(208, 40)], ['#ffffff', grey]);
  // Y wraps after 256 lines
  sprite(ppu, 11, 220, 252, 1, 0x00);
  ppu.touch();
  ppu.paint32(px, true);
  check('sprite: Y 252 shows on rows 0-3', [at(220, 3), at(220, 4)], ['#ffffff', '#0000ff']);
  check('sprite: no overflow so far', [ppu.rangeOver, ppu.timeOver], [false, false]);
}

/** the worker's `snesSpriteLimits` over the chip's OAM must say what the chip said */
function limitsAgree(name, ppu) {
  const l = snesSpriteLimits(ppu.oam, ppu.objSize);
  check('snesSpriteLimits agrees: '+name, [l.rangeOver, l.timeOver], [ppu.rangeOver, ppu.timeOver]);
} // limitsAgree

{
  // range over: the 33rd sprite on a line is dropped and the flag set
  const ppu = scene();
  for (let i = 0; i < 33; i++) {
    sprite(ppu, i, (i*7) & 0xFF, 100, 1, 0x00);
  }
  ppu.touch();
  ppu.paint32(px, true);
  check('range over: 33 sprites on a line set the flag', [ppu.rangeOver, ppu.status77() & 0x40], [true, 0x40]);
  limitsAgree('33 sprites', ppu);
  check('range over: the 32nd is drawn, the 33rd is not', [at(31*7, 100), at(32*7+7, 100)], ['#ffffff', '#0000ff']);
  sprite(ppu, 32, 1, 0xF0, 1, 0x00);
  ppu.touch();
  ppu.paint32(px, true);
  check('range over: 32 are fine', ppu.rangeOver, false);
  limitsAgree('32 sprites', ppu);
}

{
  // time over: 18 sprites of 16x16 want 36 tiles; the tiles are fetched from the last sprite back,
  // so the first sprite loses both of its tiles
  // a 16x16 sprite with tile number 1 is made of tiles 1, 2, 17, 18: its left column solid, its right the half tile
  const ppu = scene();
  for (let i = 0; i < 18; i++) {
    sprite(ppu, i, 16+i*13, 100, 1, 0x00, true);
  }
  ppu.touch();
  ppu.paint32(px, true);
  check('time over: 36 tiles set the flag', [ppu.timeOver, ppu.status77() & 0x80], [true, 0x80]);
  limitsAgree('36 tiles', ppu);
  check('time over: the first sprite vanishes, the second stays', [at(16, 100), at(28, 100), at(29, 100), at(16+17*13, 100)], ['#0000ff', '#0000ff', '#ffffff', '#ffffff']);
  sprite(ppu, 17, 1, 0xF0, 1, 0x00, true);
  ppu.touch();
  ppu.paint32(px, true);
  check('time over: 34 tiles are fine, the first sprite is back', [ppu.timeOver, at(16, 100)], [false, '#ffffff']);
  limitsAgree('34 tiles', ppu);
  // tiles off the left edge are not fetched: two 16x16 sprites at x -9 add one tile each — 32 + 2 = 34
  sprite(ppu, 16, 1, 0xF0, 1, 0x00, true);
  sprite(ppu, 16, -9, 100, 1, 0x00, true);
  sprite(ppu, 17, -9, 100, 1, 0x00, true);
  ppu.touch();
  ppu.paint32(px, true);
  check('time over: hidden tiles on the left do not count', [ppu.timeOver, at(0, 100), at(2, 100), at(3, 100), at(15, 100)], [false, '#ffffff', '#ffffff', '#0000ff', '#0000ff']);
  limitsAgree('left edge', ppu);
  sprite(ppu, 16, -7, 100, 1, 0x00, true);
  sprite(ppu, 17, -7, 100, 1, 0x00, true);
  ppu.touch();
  ppu.paint32(px, true);
  check('time over: at x -7 both tiles count — 36', ppu.timeOver, true);
  limitsAgree('x -7', ppu);
  // a tile off the right edge ends the sprite: 16x16 at x 248 is one tile — 32 + 1 + 1
  sprite(ppu, 16, 1, 0xF0, 1, 0x00, true);
  sprite(ppu, 17, 248, 100, 1, 0x00, true);
  sprite(ppu, 16, -9, 100, 1, 0x00, true);
  ppu.touch();
  ppu.paint32(px, true);
  check('time over: hidden tiles on the right do not count', [ppu.timeOver, at(248, 100), at(255, 100)], [false, '#ffffff', '#ffffff']);
  limitsAgree('right edge', ppu);
  // a sprite at X = -256 counts for both limits and draws nothing: 32 + 2 = 34, then 36
  sprite(ppu, 16, 1, 0xF0, 1, 0x00, true);
  sprite(ppu, 17, -256, 100, 1, 0x00, true);
  ppu.touch();
  ppu.paint32(px, true);
  check('X -256: counted, not drawn', [ppu.timeOver, at(0, 100), at(15, 100)], [false, '#0000ff', '#0000ff']);
  limitsAgree('X -256', ppu);
  sprite(ppu, 16, -256, 100, 1, 0x00, true);
  ppu.touch();
  ppu.paint32(px, true);
  check('X -256: two of them push the line over 34', [ppu.timeOver, at(16, 100), at(29, 100)], [true, '#0000ff', '#ffffff']);
  limitsAgree('two X -256', ppu);
  // the parked sprites of the game (X -255, Y 240) touch nothing
  const parked = scene();
  parked.paint32(px, true);
  check('parked sprites: no flags, nothing drawn', [parked.rangeOver, parked.timeOver, at(0, 0), at(0, 223)], [false, false, '#0000ff', '#0000ff']);
  limitsAgree('parked', parked);
}

// ------------------------------------------------------------------- joypad

{
  check('bits', [SNESJoypad.bit('B'), SNESJoypad.bit('Right'), SNESJoypad.bit('A'), SNESJoypad.bit('R'), SNESJoypad.bit('Z')], [0x8000, 0x0100, 0x0080, 0x0010, 0]);
  check('wordOf', SNESJoypad.wordOf(['B', 'Right']), 0x8100);
  check('names', SNESJoypad.names(0x4100), ['Y', 'Right']);
  const pad = new SNESJoypad();
  pad.press('Y').press('Right').press('A');
  check('press', [pad.word, pad.low, pad.high], [0x4180, 0x80, 0x41]);
  check('held', [pad.held('Y'), pad.held('B')], [true, false]);
  pad.release('Y').set('Start', true);
  check('release and set', SNESJoypad.names(pad.word), ['Start', 'Right', 'A']);
  pad.clear();
  check('clear', pad.word, 0);
  check('standard gamepad: button 0 is B, 9 is Start, 12 is Up', [SNESJoypad.STANDARD_GAMEPAD[0], SNESJoypad.STANDARD_GAMEPAD[9], SNESJoypad.STANDARD_GAMEPAD[12]], ['B', 'Start', 'Up']);
}

// ----------------------------------------------------------------- platform

{
  const platform = new SNESPlatform();
  check('platform: 256x224', [platform.desktop(null).width, platform.desktop(null).height], [256, 224]);
  check('platform: black desktop and border', [platform.desktop(null).defaultColor, platform.border(null).defaultColor], ['#000000', '#000000']);
  check('platform: pixel aspect 8:7 by default', platform.config.pixelAspect, 8/7);
  check('platform: name', platform.platformName(), 'Super Nintendo [HTML canvas 2D]');
  const square = new SNESPlatform({pixelAspect: 1, minimalBorder: 16});
  check('platform: config', [square.config.pixelAspect, square.border(null).minimal], [1, 16]);
}

console.log(`checksnes.mjs: ${checks} checks, ${differences} differences`);
process.exit(differences);
