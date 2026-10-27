#!/usr/bin/env node
/**
 * Self-check of the terminal platform classes under Node (R-061) — the
 * DOM-free half: the font, the charset, the screen with its painting, the
 * VT52 firmware, the line and the keyboard, plus the desktop the platform
 * computes. It uses a test font of its own and the VGA font of the library,
 * no ROM of any terminal; a game checks its own terminal against the original
 * in its match tools.
 *
 * Every check is one line: what was expected, what came out. The report has
 * the shape of the match tools — the number of checks and the number of
 * differences — and the exit code is the number of differences.
 *
 * usage: node tools/checkterminal.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { TerminalFont } = await import('../js/platform/canvas2D/terminal/terminalFont.js');
const { TerminalCharset } = await import('../js/platform/canvas2D/terminal/terminalCharset.js');
const { TerminalScreen } = await import('../js/platform/canvas2D/terminal/terminalScreen.js');
const { TerminalVT52 } = await import('../js/platform/canvas2D/terminal/terminalVT52.js');
const { TerminalLine } = await import('../js/platform/canvas2D/terminal/terminalLine.js');
const { TerminalKeyboard } = await import('../js/platform/canvas2D/terminal/terminalKeyboard.js');
const { TerminalPlatform } = await import('../js/platform/canvas2D/terminal/terminalPlatform.js');
const { VGAFonts8x16 } = await import('../js/platform/canvas2D/vga/vgaFonts8x16.js');
const { TerminalLayout } = await import('../js/platform/canvas2D/terminal/terminalLayout.js');
const { AspectLayout } = await import('../js/platform/canvas2D/aspectLayout.js');

const verbose = process.argv.includes('-v');
let checks = 0;
let differences = 0;

/** one check: counts it, and reports a difference when the JSON of the two sides differs */
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

/** whether a call throws */
function throws(fn) {
  try {
    fn();
    return false;
  } catch (e) {
    return true;
  }
} // throws

/** bytes of a string, one per character */
function bytes(text) {
  return Array.from(text, (ch) => ch.charCodeAt(0));
} // bytes

// A test font in the shape of a terminal ROM: 5-pixel glyphs in bits 6-2 of a
// byte, 6 rows, 8 bytes a glyph, placed at 1,1 in a 7x9 cell. Glyph 0 blank,
// 1 the left column, 2 the top row, 3 a full block, 4 a diagonal; the
// rest blank. Bits 7, 1 and 0 are set everywhere to show they are not drawn.
function testFontData() {
  const data = new Uint8Array(8*8).fill(0x83);
  for (let y = 0; y < 6; y++) {
    data[1*8+y] = 0x83 | 0x40;
    data[3*8+y] = 0x83 | 0x7C;
    data[4*8+y] = 0x83 | (y < 5 ? 0x40 >> y : 0);
  }
  data[2*8] = 0x83 | 0x7C;
  data[0*8+6] = 0x7C;   // row 6 is beyond glyphHeight: never drawn
  return data;
} // testFontData

const testFont = new TerminalFont(null, {
  data: testFontData(), count: 8, bytesPerGlyph: 8, glyphWidth: 5, glyphHeight: 6,
  firstBit: 6, cellWidth: 7, cellHeight: 9, glyphX: 1, glyphY: 1,
  chars: {'|': 1, '-': 2, '#': 3, '\\': 4, '?': 2}
});

// ------------------------------------------------------------------- font

{
  const f = testFont;
  check('font count', f.count, 8);
  check('font glyph 1 row 0 normalised', f.glyphRow(1, 0), 0x10);
  check('font glyph 3 row 5 full', f.glyphRow(3, 5), 0x1F);
  check('font glyph 2 row 0 / row 1', [f.glyphRow(2, 0), f.glyphRow(2, 1)], [0x1F, 0]);
  check('font diagonal', [0, 1, 2, 3, 4, 5].map((y) => f.glyphRow(4, y)), [0x10, 0x08, 0x04, 0x02, 0x01, 0]);
  check('font row beyond glyphHeight blank', f.glyphRow(0, 6), 0);
  check('font glyph outside blank', [f.glyphRow(8, 0), f.glyphRow(-1, 0)], [0, 0]);
  check('font cellPixel placed at 1,1', [f.cellPixel(1, 1, 1), f.cellPixel(1, 0, 1), f.cellPixel(1, 1, 0), f.cellPixel(1, 2, 1)],
    [true, false, false, false]);
  check('font cellPixel right edge', [f.cellPixel(3, 5, 6), f.cellPixel(3, 6, 6), f.cellPixel(3, 5, 7)], [true, false, false]);
  check('font metrics for TextEntity', [f.charsHeight, f.monospaceWidth, f.proportional], [9, 7, false]);
  const block = f.getCharData('#', '1', 1);
  check('font getCharData width', block.width, 7);
  check('font getCharData lit pixels', block.data.length, 30);
  check('font getCharData first rect', block.data[0], [1, 1, 1, 1]);
  check('font getCharData reverse', f.getCharData('#', '0', 1).data.length, 7*9-30);
  check('font getCharData scale', f.getCharData('|', '1', 2).data[0], [2, 2, 2, 2]);
  check('font unknown char prints ?', f.getCharData('Z', '1', 1).data.length, 5);
  check('font space is a cell', f.getCharData(' ', '1', 1), {data: [], width: 7});
  check('font validChar', [f.validChar('#'), f.validChar(' '), f.validChar('Z')], [true, true, false]);
  check('font row wider than a byte throws', throws(() => new TerminalFont(null, {data: new Uint8Array(8), glyphWidth: 9, glyphHeight: 8})), true);
  check('font firstBit too low throws', throws(() => new TerminalFont(null, {data: new Uint8Array(8), glyphWidth: 7, glyphHeight: 8, firstBit: 5})), true);
  check('font glyph outside cell throws', throws(() => new TerminalFont(null, {data: new Uint8Array(8), glyphWidth: 7, glyphHeight: 8, cellWidth: 8, glyphX: 2})), true);
  const short = new TerminalFont(null, {data: new Uint8Array([0xFF]), count: 2, glyphWidth: 8, glyphHeight: 2});
  check('font data shorter than count reads blank', [short.glyphRow(0, 0), short.glyphRow(0, 1), short.glyphRow(1, 0)], [0xFF, 0, 0]);

  const vga = new VGAFonts8x16(null, false);
  const points = Array.from({length: 95}, (_, i) => 0x20+i);
  const vf = TerminalFont.fromGlyphSource(null, vga, points, {glyphWidth: 8, glyphHeight: 16, cellWidth: 8, cellHeight: 16});
  check('fromGlyphSource count', vf.count, 95);
  check('fromGlyphSource A = VGA A', Array.from({length: 16}, (_, y) => vf.glyphRow(0x41-0x20, y)), Array.from(vga.glyphBytes(0x41)));
  check('fromGlyphSource chars', [vf.chars['A'], vf.chars[' '], vf.chars['~']], [0x21, 0, 94]);
  check('fromGlyphSource cell', [vf.cellWidth, vf.cellHeight, vf.glyphX], [8, 16, 0]);
}

// ---------------------------------------------------------------- charset

// a charset in the manner of KOI-7: SO shifts 0x40-0x7F to glyphs 0xC0-0xFF
const koiLike = new TerminalCharset({
  initial: 'SI',
  glyphs: {SO: [[0x40, 0x7F, 0xC0]]},
  unicode: {SI: [{from: 0x20, chars: TerminalCharset.ASCII}], SO: [{from: 0x60, chars: 'ЮАБЦ'}]},
  shiftCodes: {SO: 0x0E, SI: 0x0F}
});

{
  const plain = new TerminalCharset();
  check('charset default shift', [plain.initial, plain.shifts], ['default', ['default']]);
  check('charset default glyph = code', [plain.glyph(0x41, 'default'), plain.glyph(0x7F, 'default')], [0x41, 0x7F]);
  check('charset eighth bit dropped', plain.glyph(0xC1, 'default'), 0x41);
  check('charset default decode', [plain.decodeGlyph(0x41), plain.decodeGlyph(0x20), plain.decodeGlyph(0x7F)], ['A', ' ', '�']);
  check('charset default encode', Array.from(plain.encode('Hi?').bytes), [0x48, 0x69, 0x3F]);
  check('charset no shift codes', plain.shiftOf(0x0E), null);

  check('charset shifts', koiLike.shifts, ['SI', 'SO']);
  check('charset SI identity', koiLike.glyph(0x61, 'SI'), 0x61);
  check('charset SO range', [koiLike.glyph(0x40, 'SO'), koiLike.glyph(0x61, 'SO'), koiLike.glyph(0x7F, 'SO')], [0xC0, 0xE1, 0xFF]);
  check('charset SO outside range = code', koiLike.glyph(0x31, 'SO'), 0x31);
  check('charset unknown shift = initial', koiLike.glyph(0x61, 'XX'), 0x61);
  check('charset shiftOf', [koiLike.shiftOf(0x0E), koiLike.shiftOf(0x0F), koiLike.shiftOf(0x41)], ['SO', 'SI', null]);
  check('charset decode Cyrillic', [koiLike.decodeGlyph(0xE1), koiLike.decodeGlyph(0x61)], ['А', 'a']);
  const e1 = koiLike.encode('aАБ1');
  check('charset encode inserts SO and SI', Array.from(e1.bytes), [0x61, 0x0E, 0x61, 0x62, 0x0F, 0x31]);
  check('charset encode ends in SI', e1.shift, 'SI');
  const e2 = koiLike.encode('Ю', 'SO');
  check('charset encode from SO', [Array.from(e2.bytes), e2.shift], [[0x60], 'SO']);
  check('charset unknown char -> ?', Array.from(koiLike.encode('ж').bytes), [0x3F]);
  const map = koiLike.charMap();
  check('charset charMap', [map['A'], map['А'], map['Ю']], [0x41, 0xE1, 0xE0]);
}

// ----------------------------------------------------------------- screen

{
  const s = new TerminalScreen({cols: 4, rows: 3});
  check('screen blank', s.snapshot().cells, Array(12).fill(0x20));
  check('screen put', [s.putGlyph(1, 2, 7), s.glyphAt(1, 2), s.putGlyph(4, 0, 7), s.putGlyph(0, -1, 7)], [true, 7, false, false]);
  check('screen outside reads blank', s.glyphAt(9, 9), 0x20);
  const v = s.version;
  s.putGlyph(0, 0, 1);
  check('screen version bumps', s.version > v, true);

  [[0, 0, 1], [1, 0, 2], [2, 0, 3], [3, 0, 4], [0, 1, 5], [1, 1, 6], [2, 1, 7], [3, 1, 8], [0, 2, 9]].forEach(([c, r, g]) => s.putGlyph(c, r, g));
  s.setCursor(2, 1).clearToEndOfLine();
  check('screen clearToEndOfLine', s.snapshot().cells.slice(4, 8), [5, 6, 0x20, 0x20]);
  s.setCursor(1, 0).clearToEndOfScreen();
  check('screen clearToEndOfScreen', s.snapshot().cells, [1].concat(Array(11).fill(0x20)));

  [[0, 0, 1], [0, 1, 2], [0, 2, 3]].forEach(([c, r, g]) => s.putGlyph(c, r, g));
  s.scrollUp(1);
  check('screen scrollUp', [s.glyphAt(0, 0), s.glyphAt(0, 1), s.glyphAt(0, 2)], [2, 3, 0x20]);
  s.scrollDown(1);
  check('screen scrollDown', [s.glyphAt(0, 0), s.glyphAt(0, 1), s.glyphAt(0, 2)], [0x20, 2, 3]);
  s.scrollUp(9);
  check('screen scroll all', s.snapshot().cells, Array(12).fill(0x20));
  s.setCursor(9, -3);
  check('screen cursor clamped', s.cursor, {col: 3, row: 0});
  s.putGlyph(3, 2, 5);
  s.clear();
  check('screen clear homes', [s.cursor, s.glyphAt(3, 2)], [{col: 0, row: 0}, 0x20]);
  check('screen no status in snapshot', s.snapshot().status, null);
  check('screen needs cols and rows', throws(() => new TerminalScreen({cols: 4})), true);

  const n = new TerminalScreen({cols: 2, rows: 1, cursor: null});
  check('screen cursor null', [n.cursorEnabled, n.showCursor(true).cursorEnabled], [false, false]);

  // painting: 3x2 cells with a status line on top, test font
  const p = new TerminalScreen({cols: 3, rows: 2, statusLine: 'top', cursor: {lines: [7, 8]}});
  check('screen frame size', [p.frameWidth(testFont), p.frameHeight(testFont)], [21, 27]);
  p.putGlyph(1, 0, 1);       // left column of text cell 1,0
  p.putStatus(2, 2);         // top row in status cell 2
  p.setCursor(0, 1);
  const W = 21;
  const px = new Uint32Array(W*27);
  p.paint32(px, testFont, {foreground: 1, background: 0});
  const at = (x, y) => px[y*W+x];
  check('paint glyph below status', [at(7+1, 9+1), at(7+1, 9+6), at(7+1, 9+7), at(7+2, 9+1)], [1, 1, 0, 0]);
  check('paint status on top', [at(14+1, 1), at(14+5, 1), at(14+6, 1), at(14+1, 2)], [1, 1, 0, 0]);
  check('paint cursor bar', [at(1, 18+7), at(5, 18+8), at(0, 18+7), at(6, 18+7), at(1, 18+6)], [1, 1, 0, 0, 0]);
  check('paint lit pixels', px.reduce((a, b) => a+b, 0), 6+5+2*5);
  p.paint32(px, testFont, {foreground: 1, background: 0, cursorPhase: false});
  check('paint cursor phase off', px.reduce((a, b) => a+b, 0), 6+5);
  p.putStatus(9, 2);
  check('paint putStatus off the line', p.putStatus(9, 2), false);
  const b = new TerminalScreen({cols: 1, rows: 1, statusLine: 'bottom', cursor: null});
  b.putStatus(0, 3);
  const bpx = new Uint32Array(7*18);
  b.paint32(bpx, testFont, {foreground: 1, background: 0});
  check('paint status at the bottom', [bpx[10*7+1], bpx[1*7+1]], [1, 0]);
  const rgba = new Uint8Array(7*18*4);
  b.paint(rgba, testFont, {foreground: '#00c000', background: '#000000'});
  check('paint RGBA colours', Array.from(rgba.slice((10*7+1)*4, (10*7+1)*4+4)), [0, 0xC0, 0, 255]);
  check('pack little-endian', TerminalScreen.pack('#102030', true).toString(16), 'ff302010');
  check('pack big-endian', TerminalScreen.pack('#102030', false).toString(16), '102030ff');
}

// ------------------------------------------------------------------- VT52

function vt52(cols, rows, profile, charset) {
  const screen = new TerminalScreen({cols: cols, rows: rows});
  return new TerminalVT52(screen, charset || new TerminalCharset(), profile);
} // vt52

{
  const t = vt52(4, 3);
  t.write(bytes('AB'));
  check('vt print advances', [t.screen.glyphAt(0, 0), t.screen.glyphAt(1, 0), t.screen.cursor], [0x41, 0x42, {col: 2, row: 0}]);
  t.write(bytes('CDE'));
  check('vt no wrap: last column overwritten', [t.screen.glyphAt(3, 0), t.screen.cursor], [0x45, {col: 3, row: 0}]);
  t.write([0x0D, 0x0A]);
  check('vt CR LF', t.screen.cursor, {col: 0, row: 1});
  t.write([0x0A, 0x0A]);
  check('vt LF on last row scrolls', [t.screen.cursor, t.screen.glyphAt(0, 0), t.screen.glyphAt(3, 0)], [{col: 0, row: 2}, 0x20, 0x20]);
  t.write([0x08]);
  check('vt BS at column 0 stays', t.screen.cursor.col, 0);
  t.write([0x09]);
  check('vt TAB clamps at the last column', t.screen.cursor.col, 3);

  const w = vt52(3, 2, {autoWrap: true});
  w.write(bytes('ABCD'));
  check('vt autoWrap', [w.screen.glyphAt(2, 0), w.screen.glyphAt(0, 1), w.screen.cursor], [0x43, 0x44, {col: 1, row: 1}]);

  const a = vt52(80, 24);
  a.write([0x1B, 0x59, 0x20+5, 0x20+10]);
  check('vt ESC Y row col', a.screen.cursor, {col: 10, row: 5});
  a.write(bytes('X'));
  check('vt ESC Y then print', a.screen.glyphAt(10, 5), 0x58);
  a.write([0x1B, 0x59, 0x7E, 0x7E]);   // row 94, column 94
  check('vt ESC Y out of range clamps', a.screen.cursor, {col: 79, row: 23});
  a.write([0x1B, 0x48]);
  check('vt ESC H', a.screen.cursor, {col: 0, row: 0});
  a.write([0x1B, 0x41, 0x1B, 0x44]);
  check('vt ESC A / ESC D at the corner stay', a.screen.cursor, {col: 0, row: 0});
  a.write([0x1B, 0x42, 0x1B, 0x43, 0x1B, 0x43]);
  check('vt ESC B / ESC C', a.screen.cursor, {col: 2, row: 1});
  a.write([0x1B, 0x4A]);
  check('vt ESC J clears from cursor', [a.screen.glyphAt(10, 5), a.screen.cursor], [0x20, {col: 2, row: 1}]);
  a.write([0x1B, 0x48]).write(bytes('ABC')).write([0x1B, 0x44, 0x1B, 0x4B]);
  check('vt ESC K', [a.screen.glyphAt(0, 0), a.screen.glyphAt(1, 0), a.screen.glyphAt(2, 0)], [0x41, 0x42, 0x20]);
  a.write([0x1B, 0x48, 0x1B, 0x49]);
  check('vt ESC I on the first row scrolls down', [a.screen.glyphAt(0, 1), a.screen.glyphAt(0, 0)], [0x41, 0x20]);
  a.write([0x1B, 0x5A]);
  check('vt unsupported counted', a.unsupported, {'ESC Z': 1});
  a.write(bytes('Q'));
  check('vt after unsupported prints', a.screen.glyphAt(0, 0), 0x51);
  a.write([0x01, 0x7F]);
  check('vt ignored controls and DEL', [a.ignored, a.screen.cursor.col], [2, 1]);
  let rung = 0;
  a.onBell = () => rung++;
  a.write([0x07, 0x07]);
  check('vt BEL', [a.bells, rung], [2, 2]);
  a.write([0xC1]);
  check('vt eighth bit dropped', a.screen.glyphAt(1, 0), 0x41);
  check('vt byte count', a.bytes, 4+1+4+2+4+6+2+9+4+2+1+2+2+1);

  const d = vt52(4, 1, {printDel: true});
  d.write([0x7F]);
  check('vt printDel', d.screen.glyphAt(0, 0), 0x7F);

  const limited = vt52(4, 2, {sequences: {H: 'home', J: 'clearToEndOfScreen', Y: 'cursorAddress'}});
  limited.write([0x1B, 0x41, 0x1B, 0x4B, 0x1B, 0x4B]);
  check('vt profile replaces the sequence set', limited.unsupported, {'ESC A': 1, 'ESC K': 2});

  const k = vt52(8, 1, {}, koiLike);
  k.write([0x61, 0x0E, 0x61, 0x60, 0x0F, 0x61]);
  check('vt SO/SI select glyphs', [0, 1, 2, 3].map((c) => k.screen.glyphAt(c, 0)), [0x61, 0xE1, 0xE0, 0x61]);
  check('vt shift codes print nothing', k.screen.cursor.col, 4);
  check('vt rowText', k.screen.rowText(0, koiLike), 'aАЮa    ');
  k.write([0x0E]).reset();
  check('vt reset to initial shift', [k.shift, k.bytes], ['SI', 0]);

  // the way TET.SAV draws: home, clear, address, text in SO
  const g = vt52(80, 24, {printDel: true}, koiLike);
  g.write([0x1B, 0x48, 0x1B, 0x4A, 0x1B, 0x59, 0x20+3, 0x20+20, 0x0E, 0x60, 0x0F, 0x7F, 0x7F]);
  check('vt game-like sequence', [g.screen.glyphAt(20, 3), g.screen.glyphAt(21, 3), g.screen.glyphAt(22, 3), g.screen.cursor],
    [0xE0, 0x7F, 0x7F, {col: 23, row: 3}]);
  check('vt nothing unsupported', [g.unsupported, g.ignored], [{}, 0]);
}

// ------------------------------------------------------------------- line

{
  const out = [];
  const line = new TerminalLine((b) => out.push(b), {baud: 9600});
  line.push(new Uint8Array(200));
  check('line first update sends nothing', line.update(1000), 0);
  check('line 100 ms at 9600 Bd = 96 bytes', line.update(1100), 96);
  check('line 1 ms = 0.96: nothing yet', line.update(1101), 0);
  check('line credit carried', line.update(1102), 1);
  check('line pending', line.pending, 103);
  check('line flush', [line.flush(), line.pending, out.length], [103, 0, 200]);
  line.update(5000);
  line.push([1, 2, 3]);
  check('line idle saves nothing up', line.update(5001), 0);
  check('line 5 ms later', line.update(5006), 3);

  const fast = new TerminalLine((b) => out.push(b));
  fast.push(7);
  check('line baud 0 passes all', [fast.update(0), out[out.length-1]], [1, 7]);
}

// --------------------------------------------------------------- keyboard

{
  const kb = new TerminalKeyboard(koiLike, {keys: {Enter: 0x0D, ArrowUp: [0x1B, 0x41], F1: null}});
  check('keyboard table byte', Array.from(kb.bytesFor('Enter')), [0x0D]);
  check('keyboard table bytes', Array.from(kb.bytesFor('ArrowUp')), [0x1B, 0x41]);
  check('keyboard silenced key', Array.from(kb.bytesFor('F1')), []);
  check('keyboard unknown named key', Array.from(kb.bytesFor('Shift')), []);
  check('keyboard printable', Array.from(kb.bytesFor('7')), [0x37]);
  check('keyboard shift on Cyrillic', Array.from(kb.bytesFor('А')), [0x0E, 0x61]);
  check('keyboard stays in SO', Array.from(kb.bytesFor('Б')), [0x62]);
  check('keyboard back to SI', Array.from(kb.bytesFor(' ')), [0x0F, 0x20]);
  check('keyboard char without code', Array.from(kb.bytesFor('ж')), []);
  const up = new TerminalKeyboard(new TerminalCharset(), {upperCase: true, printable: true});
  check('keyboard upperCase', Array.from(up.bytesFor('q')), [0x51]);
  const none = new TerminalKeyboard(new TerminalCharset(), {printable: false});
  check('keyboard printable off', Array.from(none.bytesFor('q')), []);
}

// --------------------------------------------------------------- platform

{
  const ie15Like = new TerminalFont(null, {data: new Uint8Array(256*8), glyphWidth: 7, glyphHeight: 8, cellWidth: 10, cellHeight: 11});
  const platform = new TerminalPlatform({cols: 80, rows: 24, statusLine: 'top', font: ie15Like, foreground: '#00c000', pixelAspect: 2});
  check('platform desktop 80x24 + status in 10x11', platform.desktop(null), {width: 800, height: 275, defaultColor: '#000000'});
  check('platform name', platform.platformName(), 'terminal 80x24 [HTML canvas 2D]');
  check('platform border', platform.border(null), {minimal: 0, defaultColor: '#000000'});
  const demo = new TerminalPlatform({cols: 80, rows: 25, font: new TerminalFont(null, {data: new Uint8Array(16), glyphWidth: 8, glyphHeight: 16})});
  check('platform desktop 80x25 in 8x16', [demo.desktop(null).width, demo.desktop(null).height], [640, 400]);
  check('platform needs a font', throws(() => new TerminalPlatform({cols: 80, rows: 24})), true);
  // whole ratios only: never a fractional dot between 1x and 2x
  // (the prototype: a layout instance needs a document)
  check('layout whole ratios', [0.6, 1, 1.55, 1.99, 2, 2.4, 3.7].map((f) => TerminalLayout.prototype.fitRatio(f)), [1, 1, 1, 1, 2, 2, 3]);
  check('aspect layout ratios unchanged', [0.6, 1, 1.55, 2, 2.4, 3.7].map((f) => AspectLayout.prototype.fitRatio(f)), [1, 1, 1.55, 2, 2, 3]);
}

console.log(`checkterminal: ${checks} checks, ${differences} differences`);
process.exit(differences);
