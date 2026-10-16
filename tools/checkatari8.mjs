#!/usr/bin/env node
/**
 * Self-check of the Atari 8-bit platform classes under Node — the DOM-free
 * half of the platform (colours, the three alphabets, the OS character set,
 * the display list, ANTIC and GTIA over the memory) and the boot model's
 * schedule driven against a stand-in application. Nothing here needs a
 * browser; it is the harness a match* tool of an Atari game will stand on.
 *
 * Every check is one line: what was expected, what came out. The report has
 * the shape of the match tools — the number of checks and the number of
 * differences — and the exit code is the number of differences.
 *
 * usage: node tools/checkatari8.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { Atari8Color } = await import('../js/platform/canvas2D/atari8/atari8Color.js');
const { Atari8Codes } = await import('../js/platform/canvas2D/atari8/atari8Codes.js');
const { Atari8Fonts8x8 } = await import('../js/platform/canvas2D/atari8/atari8Fonts8x8.js');
const { Atari8DisplayList } = await import('../js/platform/canvas2D/atari8/atari8DisplayList.js');
const { Atari8Screen } = await import('../js/platform/canvas2D/atari8/atari8Screen.js');
const { Atari8BootModel } = await import('../js/platform/canvas2D/atari8/atari8BootModel.js');

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

/** a byte array as a lower-case hex string, for the comparison */
function hex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
} // hex

/** the [r, g, b] of a '#rrggbb' colour string */
function rgb(hexColor) {
  return [1, 3, 5].map((i) => parseInt(hexColor.substring(i, i+2), 16));
} // rgb

// ------------------------------------------------------------------ colours

{
  check('256 colours', Atari8Color.palette.length, 256);
  check('0 is black', Atari8Color.color(0x00), '#000000');
  check('$0F is white', Atari8Color.color(0x0F), '#ffffff');
  check('greys are grey', rgb(Atari8Color.color(0x08)).every((c, i, a) => c === a[0]), true);
  const gr0 = rgb(Atari8Color.color(Atari8Color.OS_COLOR2));
  check('Graphics 0 background is blue', gr0[2] > gr0[0] && gr0[2] > gr0[1], true);
  const hue1 = rgb(Atari8Color.color(0x18));
  check('hue 1 is orange', hue1[0] > hue1[1] && hue1[1] > hue1[2], true);
  check('hue 1 and 15 are the same', Atari8Color.color(0x18), Atari8Color.color(0xF8));
  const green = rgb(Atari8Color.color(0xC8));
  check('hue 12 is green', green[1] > green[0] && green[1] > green[2], true);
  check('luminance rises', rgb(Atari8Color.color(0x9C))[0] > rgb(Atari8Color.color(0x94))[0], true);
  check('value()', Atari8Color.value(9, 4), 0x94);
  check('lookup little-endian black', (Atari8Color.lookup(true)[0] >>> 0).toString(16), 'ff000000');
  check('lookup big-endian white', (Atari8Color.lookup(false)[15] >>> 0).toString(16), 'ffffffff');
  const before = Atari8Color.color(0x94);
  Atari8Color.setup({delay: 22.5});
  check('setup changes the palette', Atari8Color.color(0x94) !== before, true);
  check('setup drops the lookups', Object.keys(Atari8Color.lookups).length, 0);
  Atari8Color.setup();
  check('default parameters', Atari8Color.parameters.delay, 18.5);
  Atari8Color.setPalette(new Array(256).fill('#123456'));
  check('setPalette', Atari8Color.color(200), '#123456');
  Atari8Color.setup();
}

// ---------------------------------------------------------------- alphabets

{
  check('ATASCII space is internal 0', Atari8Codes.toInternal(0x20), 0);
  check('ATASCII A is internal 33', Atari8Codes.toInternal(0x41), 33);
  check('ATASCII heart is internal 64', Atari8Codes.toInternal(0x00), 64);
  check('ATASCII a stays 97', Atari8Codes.toInternal(0x61), 97);
  check('inverse kept', Atari8Codes.toInternal(0xC1), 33 | 0x80);
  check('internal 0 is ATASCII space', Atari8Codes.toAtascii(0), 0x20);
  check('internal 64 is ATASCII 0', Atari8Codes.toAtascii(64), 0);
  let roundTrip = true;
  for (let a = 0; a < 256; a++) {
    if (Atari8Codes.toAtascii(Atari8Codes.toInternal(a)) !== a) roundTrip = false;
  }
  check('ATASCII round-trips through internal', roundTrip, true);
  check('encode A', Atari8Codes.encodeChar('A'), 33);
  check('encode a', Atari8Codes.encodeChar('a'), 97);
  check('encode space', Atari8Codes.encodeChar(' '), 0);
  check('encode heart', Atari8Codes.encodeChar('♥'), 64);
  check('encode arrow', Atari8Codes.encodeChar('→'), 64+31);
  check('encode unknown', Atari8Codes.encodeChar('ž'), Atari8Codes.encodeChar('?'));
  check('decode 33', Atari8Codes.decodeChar(33), 'A');
  check('decode inverse 33', Atari8Codes.decodeChar(33 | 0x80), 'A');
  check('decode 96 diamond', Atari8Codes.decodeChar(96), '♦');
  check('encode READY', Array.from(Atari8Codes.encode('READY')), [50, 37, 33, 36, 57]);
  let unicodeTrip = true;
  for (let i = 0; i < 128; i++) {
    if (Atari8Codes.encodeChar(Atari8Codes.decodeChar(i)) !== i) unicodeTrip = false;
  }
  check('every code round-trips through Unicode', unicodeTrip, true);
}

// ------------------------------------------------------------ character ROM

{
  const font = new Atari8Fonts8x8(null, false);
  check('glyph space', hex(font.glyphBytes(0)), '0000000000000000');
  check('glyph !', hex(font.glyphBytes(1)), '0018181818001800');
  check('glyph A', hex(font.glyphBytes(33)), '00183c66667e6600');
  check('glyph a', hex(font.glyphBytes(97)), '00003c063e663e00');
  check('glyph heart', hex(font.glyphBytes(64)), '00367f7f3e1c0800');
  check('glyph inverse space', hex(font.glyphBytes(128)), 'ffffffffffffffff');
  check('glyph inverse A', hex(font.glyphBytes(33 | 0x80)), 'ffe7c399998199ff');
  check('set is 1024 bytes', font.setBytes(0).length, 1024);
  check('set starts with the space', hex(font.setBytes(0).subarray(0, 8)), '0000000000000000');
  check('set A at 33*8', hex(font.setBytes(0).subarray(33*8, 33*8+8)), '00183c66667e6600');
  check('international set differs in the graphics', hex(font.glyphBytes(64, 1)) !== hex(font.glyphBytes(64, 0)), true);
  check('international set keeps A', hex(font.glyphBytes(33, 1)), '00183c66667e6600');
  check('charData A has 24 pixels', font.getCharData('A', '1', 1).data.length, 24);
  check('valid heart', font.validChar('♥'), true);
  check('invalid ž', font.validChar('ž'), false);
  check('proportional i is narrow', new Atari8Fonts8x8(null, true).getCharData('i', '1', 1).width < 8, true);
}

// ------------------------------------------------------------ display list

{
  const list = Atari8DisplayList.standard(2, 24, 0xBC40, 0xBC20);
  const bytes = list.bytes();
  check('OS list length', bytes.length, 32);
  check('OS list bytes', hex(bytes.subarray(0, 8)), '70707042 40bc0202'.replace(' ', ''));
  check('OS list ends with JVB', hex(bytes.subarray(29)), '4120bc');
  check('OS list covers 216 lines', list.scanLines(), 216);
  check('decode blank 8', Atari8DisplayList.decode(0x70), {kind: 'blank', lines: 8, dli: false, lms: false, hscrol: false, vscrol: false, hasAddress: false});
  check('decode blank 1 with DLI', Atari8DisplayList.decode(0x80).lines, 1);
  check('decode JVB', Atari8DisplayList.decode(0x41).jvb, true);
  check('decode JMP', Atari8DisplayList.decode(0x01).jvb, false);
  const m = Atari8DisplayList.decode(0x44 | 0x10 | 0x80);
  check('decode mode 4 LMS HSCROL DLI', [m.mode, m.lines, m.bytes, m.lms, m.hscrol, m.dli, m.hasAddress], [4, 8, 40, true, true, true, true]);
  check('decode mode 7', [Atari8DisplayList.decode(7).lines, Atari8DisplayList.decode(7).bytes], [16, 20]);
  check('decode mode E', [Atari8DisplayList.decode(0x0E).lines, Atari8DisplayList.decode(0x0E).bytes], [1, 40]);
  const split = new Atari8DisplayList().blank(8).blank(8).blank(8).mode(4, 20, {lms: 0x4000}).mode(2, 4, {lms: 0x5000}).jump(0x3000);
  check('split list bytes', split.bytes().length, 3+3+19+3+3+3);
  check('split list lines', split.scanLines(), 24+160+32);
}

// ------------------------------------------------------------- ANTIC + GTIA

{
  const font = new Atari8Fonts8x8(null, false);
  const screen = new Atari8Screen();
  screen.powerOn(font.setBytes(0));
  check('power-on: list at $BC20', screen.peek(0xBC20), 0x70);
  check('power-on: LMS to $BC40', screen.word(0xBC24), 0xBC40);
  check('power-on: charset at $E000', hex(screen.memory.subarray(0xE000+33*8, 0xE000+33*8+8)), '00183c66667e6600');
  check('power-on: colours', [screen.colbk, screen.colpf[1], screen.colpf[2]], [0x00, 0xCA, 0x94]);
  check('power-on: version moved', screen.version > 0, true);

  const px = new Uint32Array(320*240);
  const lut = Atari8Color.lookup(true);
  screen.paint32(px, true);
  check('paint: border lines above are COLBK', px[0], lut[0]);
  check('paint: line 24 is COLPF2', px[24*320], lut[0x94]);
  check('paint: line 215 is COLPF2', px[215*320+319], lut[0x94]);
  check('paint: line 216 is COLBK again', px[216*320], lut[0]);
  check('paint: nothing unsupported', screen.unsupported, {});

  screen.print(0, 0, 'A');
  screen.paint32(px, true);
  const fg = lut[0x9A];
  // A = 00 18 3C 66 66 7E 66 00: row 1 is 18 → pixels 3,4 set
  check('paint: text colour is hue of COLPF2 with luminance of COLPF1', px[25*320+3], fg);
  check('paint: A row 1', [px[25*320+2], px[25*320+3], px[25*320+4], px[25*320+5]].map((p) => p === fg ? 1 : 0), [0, 1, 1, 0]);
  check('paint: rowText', screen.rowText(0).trimEnd(), 'A');
  screen.print(1, 0, 'B', true);
  screen.paint32(px, true);
  check('paint: inverse B row 0 is all foreground', px[24*320+8] === fg && px[24*320+15] === fg, true);
  screen.setRegister('chactl', 0);
  screen.paint32(px, true);
  check('paint: CHACTL 0 shows inverse as normal', px[24*320+8], lut[0x94]);
  screen.setRegister('chactl', 1);
  screen.paint32(px, true);
  check('paint: CHACTL 1 blanks inverse', [px[24*320+8], px[25*320+8+3]], [lut[0x94], lut[0x94]]);
  screen.setRegister('chactl', 2);
  screen.setcolor(2, 0, 0);
  screen.setcolor(4, 12, 6);
  screen.paint32(px, true);
  check('paint: SETCOLOR 4 recolours the blank lines', px[0], lut[0xC6]);
  check('paint: SETCOLOR 2 recolours the text background', px[24*320+39*8], lut[0x00]);
  screen.setRegister('dmactl', 0);
  screen.paint32(px, true);
  check('paint: DMA off is all background', px[100*320+100], lut[0xC6]);
  screen.setRegister('dmactl', 0x22);

  // a custom character set in mode 4
  const tiles = new Uint8Array(1024);
  tiles.set([0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B], 8);   // char 1: pairs 00 01 10 11
  screen.write(0x7000, tiles);
  const list = new Atari8DisplayList().blank(8).blank(8).blank(8).mode(4, 24, {lms: 0x6000}).jump(0x6800);
  screen.write(0x6800, list.bytes());
  screen.setDisplayList(0x6800);
  screen.setCharsetPage(0x70);
  screen.memory.fill(1, 0x6000, 0x6000+960);
  screen.poke(0x6000+1, 1 | 0x80);
  screen.setColor('colbk', 0x00);
  screen.setColor('colpf0', 0x28);
  screen.setColor('colpf1', 0x94);
  screen.setColor('colpf2', 0xC8);
  screen.setColor('colpf3', 0x0E);
  screen.paint32(px, true);
  const row = 24*320;
  check('mode 4: pair 00 is COLBK', [px[row], px[row+1]], [lut[0], lut[0]]);
  check('mode 4: pair 01 is COLPF0', [px[row+2], px[row+3]], [lut[0x28], lut[0x28]]);
  check('mode 4: pair 10 is COLPF1', px[row+4], lut[0x94]);
  check('mode 4: pair 11 is COLPF2', px[row+6], lut[0xC8]);
  check('mode 4: bit 7 turns 11 into COLPF3', px[row+8+6], lut[0x0E]);
  check('mode 4: 8 lines tall', px[row+7*320+6], lut[0xC8]);
  check('mode 4: 24 rows', px[(24+191)*320+6], lut[0xC8]);
  check('mode 4: below is COLBK', px[216*320+6], lut[0]);

  // an unsupported mode is counted and left as background
  const other = new Atari8DisplayList().blank(8).mode(9, 4, {lms: 0x6000}).mode(2, 1).jump(0x6900);
  screen.write(0x6900, other.bytes());
  screen.setDisplayList(0x6900);
  screen.paint32(px, true);
  check('unsupported mode 9 counted', screen.unsupported, {9: 4});
  check('unsupported mode is background', px[8*320+6], lut[0]);
  // the mode 2 line reads code 1 at $60A0 through the tile set: bit 6 of $1B is set,
  // in the hue of COLPF2 ($C8) with the luminance of COLPF1 ($94)
  check('mode 2 after it still draws at line 24', [px[24*320+5], px[24*320+6]], [lut[0xC8], lut[0xC4]]);

  // --- step 2: mode E, mode 6, fine scrolling, DLI as data (Boulder Dash M1)
  screen.memory.fill(0, 0x6000, 0x6400);
  screen.memory[0x6000] = 0x1B;            // mode E: pairs 00 01 10 11
  const modeE = new Atari8DisplayList().blank(8).mode(14, 2, {lms: 0x6000}).jump(0x6A00);
  screen.write(0x6A00, modeE.bytes());
  screen.setDisplayList(0x6A00);
  screen.paint32(px, true);
  check('mode E: pairs are COLBK COLPF0 COLPF1 COLPF2', [px[8*320], px[8*320+2], px[8*320+4], px[8*320+6]], [lut[0], lut[0x28], lut[0x94], lut[0xC8]]);
  check('mode E: one scan line per line, second line from the next 40 bytes', px[9*320+2], lut[0]);
  check('mode E is no longer unsupported', screen.unsupported, {});
  // mode 6: 20 double-width characters, colour from bits 6-7; glyph 1 of the tile set is $1B rows
  screen.memory[0x6000] = 1;               // COLPF0
  screen.memory[0x6001] = 1 | 0x40;        // COLPF1
  screen.memory[0x6002] = 1 | 0x80;        // COLPF2
  screen.memory[0x6003] = 1 | 0xC0;        // COLPF3
  const mode6 = new Atari8DisplayList().blank(8).mode(6, 1, {lms: 0x6000}).mode(7, 1, {lms: 0x6000}).jump(0x6A10);
  screen.write(0x6A10, mode6.bytes());
  screen.setDisplayList(0x6A10);
  screen.paint32(px, true);
  // $1B = 00011011: bits 3, 4, 6, 7 set → pixels 6-9, 12-15 of the 16 px cell
  check('mode 6: clear bit is COLBK', [px[8*320], px[8*320+5]], [lut[0], lut[0]]);
  check('mode 6: set bit is COLPF0, two pixels wide', [px[8*320+6], px[8*320+7], px[8*320+9], px[8*320+10]], [lut[0x28], lut[0x28], lut[0x28], lut[0]]);
  check('mode 6: bit 6 of the code is COLPF1', px[8*320+16+6], lut[0x94]);
  check('mode 6: bit 7 is COLPF2', px[8*320+32+6], lut[0xC8]);
  check('mode 6: both is COLPF3', px[8*320+48+6], lut[0x0E]);
  check('mode 7: glyph rows doubled', [px[16*320+6], px[17*320+6], px[31*320+6]], [lut[0x28], lut[0x28], lut[0x28]]);
  // horizontal scrolling: the wide fetch, shifted right by HSCROL clocks
  screen.memory.fill(0, 0x6000, 0x6000+48);
  screen.memory[0x6004] = 1;               // the 5th byte of a 48-byte line: at HSCROL 0 it is the left edge
  const hs = new Atari8DisplayList().blank(8).mode(4, 1, {lms: 0x6000, hscrol: true}).mode(4, 1, {lms: 0x6000}).jump(0x6A20);
  screen.write(0x6A20, hs.bytes());
  screen.setDisplayList(0x6A20);
  screen.setRegister('hscrol', 0);
  screen.paint32(px, true);
  check('HSCROL 0: byte 4 of the wide line sits at x 0', [px[8*320+2], px[8*320+8]], [lut[0x28], lut[0]]);
  check('without the HSCROL bit byte 4 sits at x 32', [px[16*320+2], px[16*320+34]], [lut[0], lut[0x28]]);
  screen.setRegister('hscrol', 3);
  screen.paint32(px, true);
  check('HSCROL 3 shifts the line 6 px right', [px[8*320+2], px[8*320+8]], [lut[0], lut[0x28]]);
  screen.setRegister('hscrol', 15);
  screen.paint32(px, true);
  check('HSCROL 15 shifts 30 px', px[8*320+32], lut[0x28]);
  // vertical scrolling: a run of VSCROL lines starts VSCROL lines in, the line after shows VSCROL+1
  screen.memory.fill(1, 0x6000, 0x6000+120);
  screen.memory.fill(0x3C, 0x7008, 0x7010);  // glyph 1: 00111100 → COLBK COLPF2 COLPF2 COLBK per row … all rows alike
  screen.memory[0x7008] = 0x00;              // except row 0, which is empty
  const vs = new Atari8DisplayList().blank(8).mode(4, 2, {lms: 0x6000, vscrol: true}).mode(4, 1).jump(0x6A30);
  screen.write(0x6A30, vs.bytes());
  screen.setDisplayList(0x6A30);
  screen.setRegister('hscrol', 0);
  screen.setRegister('vscrol', 0);
  screen.paint32(px, true);
  check('VSCROL 0: first row of the glyph at line 8 is empty', px[8*320+2], lut[0]);
  check('VSCROL 0: the line after the run shows 1 line', [px[24*320+2], px[25*320+2]], [lut[0], lut[0]]);
  screen.setRegister('vscrol', 3);
  screen.paint32(px, true);
  // $3C = 00111100: pairs 00 11 11 00, so pixel 2 is COLPF2
  check('VSCROL 3: the run starts at glyph row 3', px[8*320+2], lut[0xC8]);
  // 5 lines (rows 3-7), 8 lines, then the line after the run: 4 lines (rows 0-3), row 0 empty
  check('VSCROL 3: 5 + 8 lines, then a tail of 4 starting with the empty row', [px[20*320+2], px[21*320+2], px[22*320+2], px[24*320+2], px[25*320+2]], [lut[0xC8], lut[0], lut[0xC8], lut[0xC8], lut[0]]);
  screen.setRegister('vscrol', 0);
  // DLI as data: the second line takes another CHBASE and colour
  const dl = new Atari8DisplayList().blank(8).mode(4, 1, {lms: 0x6000, dli: true}).mode(4, 1, {lms: 0x6000}).jump(0x6A40);
  screen.write(0x6A40, dl.bytes());
  screen.setDisplayList(0x6A40);
  screen.memory.fill(0, 0x6000, 0x6000+80);
  screen.memory[0x6000] = 1; screen.memory[0x6028] = 1;
  screen.memory.fill(0x1B, 0x7008, 0x7010);
  screen.memory.fill(0xFF, 0x7408, 0x7410);  // a second set at $7400: glyph 1 all 11
  screen.setDLI([{chbase: 0x74, colpf2: 0x36}]);
  screen.paint32(px, true);
  check('before the DLI the first set and COLPF2', [px[8*320+6], px[8*320+0]], [lut[0xC8], lut[0]]);
  check('after the DLI the second set and the new COLPF2', [px[16*320+0], px[16*320+6]], [lut[0x36], lut[0x36]]);
  check('the DLI registers come back after the frame', [screen.chbase, screen.colpf[2]], [0x70, 0xC8]);
  screen.setDLI([]);
  screen.memory.fill(0, 0x6000, 0x6400);
  screen.setDisplayList(0x6800);

  // players and missiles
  screen.setDisplayList(0x6800);
  screen.setRegister('pmbase', 0x30);
  screen.setRegister('dmactl', 0x3E);      // single line, players + missiles + playfield + list
  screen.setRegister('gractl', 3);
  screen.memory.fill(0, 0x3000, 0x4000);
  screen.setRegister('gractl', 0);
  screen.paint32(px, true);
  const plain = px.slice();               // the playfield under the players
  screen.setRegister('gractl', 3);
  screen.memory[0x3400+40] = 0x81;         // player 0: bits 7 and 0 on frame line 40 → picture line 32
  screen.setPosition(false, 0, 48);        // left edge of the playfield
  screen.setColor('colpm0', 0x38);
  screen.touch();
  screen.paint32(px, true);
  const line = 32*320;
  check('player 0: bit 7 at x 0-1', [px[line], px[line+1], px[line+2]], [lut[0x38], lut[0x38], plain[line+2]]);
  check('player 0: bit 0 at x 14-15', [px[line+13], px[line+14], px[line+15]], [plain[line+13], lut[0x38], lut[0x38]]);
  check('player 0: only that line', px[line+320], plain[line+320]);
  screen.setPlayerSize(0, 1);
  screen.paint32(px, true);
  check('player 0 double: bit 7 at x 0-3', [px[line+3], px[line+4]], [lut[0x38], plain[line+4]]);
  screen.setPlayerSize(0, 3);
  screen.paint32(px, true);
  check('player 0 quad: 64 wide', [px[line+7], px[line+8], px[line+63], px[line+64]], [lut[0x38], plain[line+8], lut[0x38], plain[line+64]]);
  screen.setPlayerSize(0, 0);
  screen.setPosition(false, 0, 40);        // partly off the left edge
  screen.paint32(px, true);
  check('player off the edge is clipped', px[line], plain[line]);
  screen.memory[0x3500+40] = 0xFF;         // player 1 on the same line
  screen.setPosition(false, 1, 48);
  screen.setPosition(false, 0, 52);
  screen.setColor('colpm1', 0x58);
  screen.touch();
  screen.paint32(px, true);
  check('player 0 is over player 1', [px[line+8], px[line+7]], [lut[0x38], lut[0x58]]);
  screen.memory[0x3300+40] = 0x03;         // missile 0, both bits
  screen.setPosition(true, 0, 100);
  screen.touch();
  screen.paint32(px, true);
  const mx = (100-48)*2;
  check('missile 0 in the player colour', [px[line+mx], px[line+mx+3], px[line+mx+4]], [lut[0x38], lut[0x38], plain[line+mx+4]]);
  screen.setRegister('prior', 0x10);
  screen.paint32(px, true);
  check('fifth player in COLPF3', px[line+mx], lut[0x0E]);
  screen.setRegister('dmactl', 0x2E);      // double line resolution
  screen.memory.fill(0, 0x3000, 0x4000);
  screen.memory[0x3200+20] = 0x80;         // player 0 double line: index 20 = frame lines 40,41 → picture 32,33
  screen.setPosition(false, 0, 48);
  screen.setRegister('prior', 0);
  screen.touch();
  screen.paint32(px, true);
  check('double line: two lines tall', [px[32*320], px[33*320], px[34*320]], [lut[0x38], lut[0x38], plain[34*320]]);

  const rgba = new Uint8ClampedArray(320*240*4);
  screen.paint(rgba);
  check('paint rgba: alpha', rgba[3], 255);
}

// ------------------------------------------------------------- boot model

{
  const font = new Atari8Fonts8x8(null, false);
  const app = {
    now: 0,
    stack: {},
    fonts: {atari8Fonts8x8: font},
    platform: {
      border: () => ({minimal: 16, defaultColor: '#000000'}),
      desktop: () => ({width: 320, height: 240, defaultColor: '#000000'}),
      pixelScale: 1,
      initEntity: () => false
    },
    layout: {
      newDrawingCache: (entity, index) => { entity.drawingCache[index] = {cleanCache() {}, preparePaint() { return false; }}; },
      clearCanvas: () => {},
      paintCache: () => {},
      paintImage: () => {},
      paintImagePart: () => {}
    },
    inputEventsManager: {updateGamepadsStates() {}},
    audioManager: false,
    switchedTo: null,
    setModel(name) { this.switchedTo = name; }
  };
  const model = new Atari8BootModel(app, {
    nextModel: 'DemoModel',
    commands: [{command: 'RUN "D:DEMO"', output: ['LOADING...'], ready: false}]
  });
  model.init();
  const screen = model.screen;
  check('border black', model.borderEntity.bkColor, '#000000');
  model.driveSteps(0);
  check('READY on row 0', screen.rowText(0).trimEnd(), 'READY');
  check('cursor on row 1', [model.cursor.col, model.cursor.row], [0, 1]);
  check('cursor is an inverse cell', screen.peek(screen.cellAddress(0, 1)), 0x80);
  const t = model.properties.timing;
  model.driveSteps(t.promptPauseMs+t.typingMs*3);
  check('typing', screen.rowText(1).trimEnd(), 'RUN');
  check('cursor follows the typing', screen.peek(screen.cellAddress(3, 1)), 0x80);
  const last = model.steps[model.steps.length-1].at;
  model.driveSteps(last-1);
  check('command typed', screen.rowText(1).trimEnd(), 'RUN "D:DEMO"');
  check('output printed', screen.rowText(2).trimEnd(), 'LOADING...');
  check('not finished yet', model.finished, false);
  model.driveSteps(last);
  check('finished', model.finished, true);
  check('cursor gone', screen.peek(screen.cellAddress(0, 3)), 0);

  const plain = new Atari8BootModel(app, {nextModel: 'DemoModel'});
  plain.init();
  plain.loopModel(500);
  check('plain: READY', plain.screen.rowText(0).trimEnd(), 'READY');
  check('plain: not over at 0.5 s', app.switchedTo, null);
  plain.loopModel(500+plain.properties.timing.readyPauseMs);
  plain.loopModel(501+plain.properties.timing.readyPauseMs);
  check('plain: handed over', app.switchedTo, 'DemoModel');

  app.switchedTo = null;
  const skipped = new Atari8BootModel(app, {nextModel: 'DemoModel', commands: [{command: 'CLOAD'}]});
  skipped.init();
  skipped.loopModel(0);
  check('skip: Escape', skipped.handleEvent({id: 'keyPress', key: 'Escape'}), true);
  check('skip: typed at once', skipped.screen.rowText(1).trimEnd(), 'CLOAD');
  skipped.loopModel(1);
  check('skip: handed over', app.switchedTo, 'DemoModel');

  // the editor scrolls
  const scroller = new Atari8BootModel(app, {nextModel: 'DemoModel'});
  scroller.init();
  scroller.driveSteps(0);
  for (let i = 0; i < 30; i++) scroller.printLine('LINE '+i);
  check('scroll: last line above the cursor row', scroller.screen.rowText(22).trimEnd(), 'LINE 29');
  check('scroll: cursor row blank', scroller.screen.rowText(23).trim(), '');
  check('scroll: READY gone', scroller.screen.rowText(0).trimEnd() !== 'READY', true);
}

console.log(`checkatari8: ${checks} checks, ${differences} differences`);
process.exit(differences);
