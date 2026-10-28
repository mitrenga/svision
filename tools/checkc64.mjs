#!/usr/bin/env node
/**
 * Self-check of the Commodore 64 platform classes under Node — the DOM-free
 * half of the platform (colours, screen codes, the character ROM, the text
 * screen, sprite data) and the boot model's schedule driven against a
 * stand-in application. Nothing here needs a browser; it is the harness a
 * match* tool of a C64 game will stand on.
 *
 * Every check is one line: what was expected, what came out. The report has
 * the shape of the match tools — the number of checks and the number of
 * differences — and the exit code is the number of differences.
 *
 * usage: node tools/checkc64.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { C64Color } = await import('../js/platform/canvas2D/c64/c64Color.js');
const { C64ScreenCodes } = await import('../js/platform/canvas2D/c64/c64ScreenCodes.js');
const { C64Fonts8x8 } = await import('../js/platform/canvas2D/c64/c64Fonts8x8.js');
const { C64TextRAM } = await import('../js/platform/canvas2D/c64/c64TextRAM.js');
const { C64Charset } = await import('../js/platform/canvas2D/c64/c64Charset.js');
const { C64SpriteData } = await import('../js/platform/canvas2D/c64/c64SpriteData.js');
const { C64SpriteEntity } = await import('../js/platform/canvas2D/c64/c64SpriteEntity.js');
const { C64Sprites } = await import('../js/platform/canvas2D/c64/c64Sprites.js');
// ★ a classic script, not a module — the same file a game's worker pulls in
import { createRequire } from 'node:module';
const { loadClassicScript } = createRequire(import.meta.url)('./classicScript.cjs');
const C64Collision = loadClassicScript(
  new URL('../js/platform/canvas2D/c64/c64Collision.js', import.meta.url).pathname);
const { C64BootModel } = await import('../js/platform/canvas2D/c64/c64BootModel.js');

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

// ------------------------------------------------------------------ colours

{
  check('colour 0 black', C64Color.color(0), '#000000');
  check('colour 6 blue', C64Color.color(6), '#2724c4');
  check('colour 14 light blue', C64Color.color(14), '#6864ff');
  check('colour 15 light grey', C64Color.color(15), '#aeaeae');
  check('high bits ignored', C64Color.color(22), C64Color.color(6));
  check('index by name', C64Color.index('lightBlue'), 14);
  check('unknown name', C64Color.index('bright'), -1);
  check('16 names', C64Color.colorsNames.length, 16);
}

// ------------------------------------------------------------- screen codes

{
  check('@ is 0', C64ScreenCodes.encodeChar('@'), 0);
  check('A is 1', C64ScreenCodes.encodeChar('A'), 1);
  check('a in set 0 shows A', C64ScreenCodes.encodeChar('a', 0), 1);
  check('a in set 1', C64ScreenCodes.encodeChar('a', 1), 1);
  check('A in set 1', C64ScreenCodes.encodeChar('A', 1), 65);
  check('space is 32', C64ScreenCodes.encodeChar(' '), 32);
  check('0 keeps ASCII', C64ScreenCodes.encodeChar('0'), 48);
  check('? is 63', C64ScreenCodes.encodeChar('?'), 63);
  check('pound', C64ScreenCodes.encodeChar('£'), 28);
  check('up arrow', C64ScreenCodes.encodeChar('↑'), 30);
  check('horizontal line', C64ScreenCodes.encodeChar('─'), 64);
  check('box corner', C64ScreenCodes.encodeChar('┌'), 112);
  check('unknown char', C64ScreenCodes.encodeChar('ž'), 63);
  check('shifted space', C64ScreenCodes.encodeChar(' '), 96);
  check('decode 1', C64ScreenCodes.decodeChar(1), 'A');
  check('decode 1 set 1', C64ScreenCodes.decodeChar(1, 1), 'a');
  check('decode 65 set 1', C64ScreenCodes.decodeChar(65, 1), 'A');
  check('decode reverse', C64ScreenCodes.decodeChar(0x81), 'A');
  check('decode heart', C64ScreenCodes.decodeChar(83), '♥');
  check('encode READY.', Array.from(C64ScreenCodes.encode('READY.')), [18, 5, 1, 4, 25, 46]);
  check('encode astral pair', C64ScreenCodes.encode('\u{1FB8C}').length, 1);
  let roundTrip = true;
  for (let code = 0; code < 128; code++) {
    for (const set of [0, 1]) {
      if (code === 96) continue;   // the shifted space decodes to NBSP and encodes back to 96 — covered above
      const ch = C64ScreenCodes.decodeChar(code, set);
      const back = C64ScreenCodes.encodeChar(ch, set);
      if (back !== code) {
        roundTrip = false;
        if (verbose) console.log(`  round trip ${set}/${code} '${ch}' -> ${back}`);
      }
    }
  }
  check('every code round-trips through Unicode', roundTrip, true);
}

// ------------------------------------------------------------ character ROM

{
  const font = new C64Fonts8x8(null, false);
  check('glyph @', hex(font.glyphBytes(0)), '3c666e6e60623c00');
  check('glyph A', hex(font.glyphBytes(1)), '183c667e66666600');
  check('glyph a (set 1)', hex(font.glyphBytes(1, 1)), '00003c063e663e00');
  check('glyph A (set 1)', hex(font.glyphBytes(65, 1)), '183c667e66666600');
  check('glyph space', hex(font.glyphBytes(32)), '0000000000000000');
  // the ROM's reverse @ is not a bit-exact inverse of @: row 5 differs by a pixel
  check('glyph reverse @', hex(font.glyphBytes(128)), 'c39991919f99c3ff');
  check('glyph reverse space', hex(font.glyphBytes(160)), 'ffffffffffffffff');
  check('glyph horizontal line', hex(font.glyphBytes(64)), '000000ffff000000');
  check('set 0 is 2048 bytes', font.setBytes(0).length, 2048);
  check('set 1 starts with @', hex(font.setBytes(1).subarray(0, 8)), '3c666e6e60623c00');
  check('cached glyph is the same array', font.glyphBytes(1) === font.glyphBytes(1), true);
  check('charData A has 28 pixels', font.getCharData('A', '1', 1).data.length, 28);
  check('charData A width', font.getCharData('A', '1', 1).width, 8);
  check('charData space is a cell wide', font.getCharData(' ', '1', 1).width, 8);
  check('proportional space', new C64Fonts8x8(null, true).getCharData(' ', '1', 1).width, 5);
  check('valid a', font.validChar('a'), true);
  check('valid box', font.validChar('┼'), true);
  check('invalid ž', font.validChar('ž'), false);
  const lower = new C64Fonts8x8(null, true, 1);
  check('lowercase font prints a', hex(lower.glyphBytes(C64ScreenCodes.encodeChar('a', lower.set), lower.set)), '00003c063e663e00');
  check('proportional i is narrow', lower.getCharData('i', '1', 1).width < 8, true);
}

// -------------------------------------------------------------- text screen

{
  const font = new C64Fonts8x8(null, false);
  const text = new C64TextRAM();
  check('boots blue', text.background, 6);
  check('boots light blue text', text.color, 14);
  check('blank row', text.rowText(0), ' '.repeat(40));
  check('colour RAM filled', text.colorAt(39, 24), 14);

  text.print('READY.\n');
  check('print', text.rowText(0).trimEnd(), 'READY.');
  check('cursor after newline', [text.cursor.col, text.cursor.row], [0, 1]);
  text.print('A'.repeat(45));
  check('wrap fills row 1', text.rowText(1), 'A'.repeat(40));
  check('wrap continues on row 2', text.rowText(2).trimEnd(), 'AAAAA');
  check('cursor after wrap', [text.cursor.col, text.cursor.row], [5, 2]);
  text.print('\rB');
  check('carriage return', text.rowText(2).trimEnd(), 'BAAAA');
  text.printAt(0, 24, 'SCORE 000100', 1);
  check('printAt', text.rowText(24).trimEnd(), 'SCORE 000100');
  check('printAt colour', text.colorAt(0, 24), 1);
  check('printAt keeps other colours', text.colorAt(20, 24), 14);
  text.printAt(38, 24, 'XYZ');
  check('printAt clips', text.rowText(24).substring(38), 'XY');
  text.setReverse(true).print('R');
  check('RVS ON sets bit 7', text.charAt(1, 2), 0x92);
  check('RVS reads back as R', text.rowText(2).substring(0, 3), 'BRA');
  text.print('\n');
  check('newline turns RVS off', text.reverse, false);

  text.setCursor(0, 24);
  text.print('Z\n');
  check('scroll moves row 1 up', text.rowText(0), 'A'.repeat(40));
  check('scroll brings Z to row 23', text.rowText(23).substring(0, 6), 'ZCORE ');
  check('scroll blanks last row', text.rowText(24), ' '.repeat(40));
  check('scroll keeps cursor on last row', text.cursor.row, 24);
  check('scroll moves colour RAM', text.colorAt(0, 23), 14);
  check('version bumps', text.version > 10, true);

  text.setCharset(1);
  text.print('abcXYZ');
  check('set 1 prints lowercase', text.rowText(24).trimEnd(), 'abcXYZ');
  check('set 1 codes', [text.charAt(0, 24), text.charAt(3, 24)], [1, 88]);
  text.setCharset(0);
  check('same codes read as uppercase in set 0', text.rowText(24).trimEnd(), 'ABC' + String.fromCodePoint(0x2663, 0x1FB75, 0x2666));

  // painting
  const picture = new C64TextRAM();
  const px = new Uint32Array(320*200);
  const lut = C64TextRAM.lookup(true);
  check('lookup blue', (lut[6] >>> 0).toString(16), 'ffc42427');
  check('lookup big-endian blue', (C64TextRAM.lookup(false)[6] >>> 0).toString(16), '2724c4ff');
  picture.showCursor(false);
  picture.paint32(px, font, true);
  check('paint: background everywhere', px[0] === lut[6] && px[320*200-1] === lut[6], true);
  picture.print('@', 1);
  picture.paint32(px, font, true);
  check('paint: @ row 0 is 3C', [px[0], px[1], px[2], px[5], px[6]].map((p) => p === lut[1] ? 1 : 0), [0, 0, 1, 1, 0]);
  check('paint: @ row 1 is 66', [px[320+1], px[320+2], px[320+3]].map((p) => p === lut[1] ? 1 : 0), [1, 1, 0]);
  check('paint: cell 1 untouched', px[8], lut[6]);
  picture.setBackground(0);
  picture.paint32(px, font, true);
  check('paint: background register', px[8], lut[0]);
  picture.showCursor(true);
  picture.setCursor(0, 0);
  picture.paint32(px, font, true, {cursorPhase: true});
  check('paint: cursor inverts the cell', [px[0], px[2]].map((p) => p === lut[1] ? 1 : 0), [1, 0]);
  picture.paint32(px, font, true, {cursorPhase: false});
  check('paint: cursor off phase', [px[0], px[2]].map((p) => p === lut[1] ? 1 : 0), [0, 1]);
  picture.putChar(1, 0, 32 | 0x80, 7);
  picture.paint32(px, font, true, {cursor: false});
  check('paint: reverse space is a block', px[8] === lut[7] && px[15+7*320] === lut[7], true);
  const rgba = new Uint8ClampedArray(320*200*4);
  picture.paint(rgba, font, {cursor: false});
  check('paint rgba: yellow block', [rgba[8*4], rgba[8*4+1], rgba[8*4+2], rgba[8*4+3]], [0xef, 0xf3, 0x47, 255]);

  const restored = new C64TextRAM(picture.screen, picture.colorRAM);
  check('constructor from bytes', restored.rowText(0).substring(0, 2), '@ ');
  check('constructor keeps colours', restored.colorAt(1, 0), 7);
}

// ------------------------------------------------------------------ sprites

{
  const ball = [];
  for (let y = 0; y < 21; y++) {
    let line = '';
    for (let x = 0; x < 24; x++) {
      const dx = x-11.5, dy = y-10;
      line += dx*dx/121+dy*dy/100 <= 1 ? '2' : '.';
    }
    ball.push(line);
  }
  const bytes = C64SpriteData.encode(ball);
  check('encode is 63 bytes', bytes.length, 63);
  check('row 10 is the widest', hex(bytes.subarray(30, 33)), '7ffffe');
  check('row 0 is narrow', hex(bytes.subarray(0, 3)), '000000');
  check('decode round-trips', C64SpriteData.decode(bytes), ball);
  const wide = C64SpriteData.decode(bytes, {expandX: true});
  check('expandX is 48 wide', [wide.length, wide[0].length], [21, 48]);
  check('expandX doubles pixels', wide[10].substring(0, 6), '..2222');
  const tall = C64SpriteData.decode(bytes, {expandY: true});
  check('expandY is 42 tall', [tall.length, tall[0].length], [42, 24]);
  check('expandY repeats rows', tall[20] === tall[21], true);

  const mc = [];
  for (let y = 0; y < 21; y++) {
    mc.push('112233..'.repeat(3));
  }
  const mcBytes = C64SpriteData.encode(mc, {multicolor: true});
  check('multicolour row is 01 10 11 00', hex(mcBytes.subarray(0, 3)), '6c6c6c');
  check('multicolour decodes pairs', C64SpriteData.decode(mcBytes, {multicolor: true})[0], '112233..'.repeat(3));
  check('hires read of multicolour data', C64SpriteData.decode(mcBytes)[0].substring(0, 8), '.22.22..');

  const memory = new Uint8Array(64*3);
  memory.set(bytes, 64);
  memory.set(mcBytes, 128);
  const frames = C64SpriteData.decodeBlocks(memory, 64, 2);
  check('decodeBlocks: two frames', frames.length, 2);
  check('decodeBlocks: first is the ball', frames[0][10], '.'+'2'.repeat(22)+'.');

  check('palette hires', C64SpriteData.palette(1), {'2': '#ffffff'});
  check('palette multicolour', C64SpriteData.palette(1, 11, 15), {'2': '#ffffff', '1': '#474747', '3': '#aeaeae'});
  check('toDesktop origin', C64SpriteData.toDesktop(24, 50), {x: 0, y: 0});
  check('fromDesktop', C64SpriteData.fromDesktop(100, 100), {x: 124, y: 150});
  check('toDesktop off screen', C64SpriteData.toDesktop(0, 0), {x: -24, y: -50});
}

// ---------------------------------------------- sprite collisions ($D01E)

{
  // a solid 24x21 block and a single dot, so every check can be read by eye
  const solid = C64SpriteData.encode(Array(21).fill('2'.repeat(24)));
  const dot = C64SpriteData.encode(Array(21).fill('.'.repeat(24))
    .map((row, y) => (y === 0 ? '2'+'.'.repeat(23) : row)));
  const at = (i, x, y, bytes, more) =>
    Object.assign({index: i, x, y, bytes, enabled: true}, more || {});
  const none = Array(8).fill(null);
  const put = (...list) => { const s = none.slice(); for (const e of list) { s[e.index] = e; } return s; };

  check('★ the sprite box agrees with C64SpriteData',
        [C64Collision.WIDTH, C64Collision.HEIGHT, C64Collision.ORIGIN_X, C64Collision.ORIGIN_Y],
        [C64SpriteData.WIDTH, C64SpriteData.HEIGHT,
         C64SpriteData.ORIGIN_X, C64SpriteData.ORIGIN_Y]);
  check('shapeMask: a solid sprite is 24x21 set',
        (() => { const m = C64Collision.shapeMask(solid);
                 return [m.width, m.height, m.pixels.every((p) => p === 1)]; })(),
        [24, 21, true]);
  check('shapeMask: multicolour counts every pair that is not 00',
        (() => { const bytes = C64SpriteData.encode(Array(21).fill('112233..'.repeat(3)),
                                                    {multicolor: true});
                 const m = C64Collision.shapeMask(bytes, {multicolor: true});
                 return Array.from(m.pixels.subarray(0, 8)).join(''); })(),
        '11111100');
  check('shapeMask: expandX doubles the box',
        (() => { const m = C64Collision.shapeMask(solid, {expandX: true});
                 return [m.width, m.height]; })(), [48, 21]);

  check('two solid sprites apart do not collide',
        C64Collision.spriteSprite(put(at(1, 100, 100, solid), at(2, 200, 100, solid))), 0);
  check('two solid sprites over each other collide, both bits',
        C64Collision.spriteSprite(put(at(1, 100, 100, solid), at(2, 110, 100, solid))), 0x06);
  check('touching by one column is a collision',
        C64Collision.spriteSprite(put(at(1, 100, 100, solid), at(2, 123, 100, solid))), 0x06);
  check('one column further is not',
        C64Collision.spriteSprite(put(at(1, 100, 100, solid), at(2, 124, 100, solid))), 0);
  check('★ boxes overlap but pixels do not: no collision',
        C64Collision.spriteSprite(put(at(1, 100, 100, dot), at(2, 101, 100, dot))), 0);
  check('★ the same dots on the same spot: collision',
        C64Collision.spriteSprite(put(at(1, 100, 100, dot), at(2, 100, 100, dot))), 0x06);
  check('three sprites in a heap set all three bits',
        C64Collision.spriteSprite(put(at(0, 100, 100, solid), at(1, 105, 100, solid),
                                      at(3, 110, 100, solid))), 0x0B);
  check('a sprite switched off never collides',
        C64Collision.spriteSprite(put(at(1, 100, 100, solid),
                                      at(2, 100, 100, solid, {enabled: false}))), 0);
  check('one sprite alone gives nothing',
        C64Collision.spriteSprite(put(at(1, 100, 100, solid))), 0);
  check('expandX makes a sprite reach further',
        [C64Collision.spriteSprite(put(at(1, 100, 100, solid), at(2, 130, 100, solid))),
         C64Collision.spriteSprite(put(at(1, 100, 100, solid, {expandX: true}),
                                       at(2, 130, 100, solid)))], [0, 0x06]);

  // ★ the border: it hides the picture, it does not stop the collision.
  // Measured on the original of Impossible Mission — see the class comment.
  const W = C64Collision.PICTURE;
  check('★ behind the left border sprites still collide',
        C64Collision.spriteSprite(put(at(1, W.x-24, 100, solid), at(2, W.x-24, 100, solid))), 0x06);
  check('★ behind the right border too',
        C64Collision.spriteSprite(put(at(1, W.x+W.width, 100, solid),
                                      at(2, W.x+W.width, 100, solid))), 0x06);
  check('★ above the picture too',
        C64Collision.spriteSprite(put(at(1, 100, W.y-21, solid), at(2, 100, W.y-21, solid))), 0x06);
  check('★ below the picture too',
        C64Collision.spriteSprite(put(at(1, 100, W.y+W.height, solid),
                                      at(2, 100, W.y+W.height, solid))), 0x06);
  check('★ half in and half out: the hidden half counts as well',
        C64Collision.spriteSprite(put(at(1, W.x+W.width-2, 100, solid),
                                      at(2, W.x+W.width+10, 100, solid))), 0x06);
  check('a caller who asks for the picture only gets the border cut off',
        C64Collision.spriteSprite(put(at(1, W.x-24, 100, solid), at(2, W.x-24, 100, solid)), W), 0);
  check('and one column inside the picture it collides again',
        C64Collision.spriteSprite(put(at(1, W.x-23, 100, solid), at(2, W.x-23, 100, solid)), W), 0x06);

  // the latch: it piles up and reading empties it
  const latch = C64Collision.latch();
  latch.add(0x06);
  check('latch: what was added is in it', latch.peek(), 0x06);
  latch.add(0x10);
  check('latch: the next sweep piles on', latch.peek(), 0x16);
  check('★ latch: reading gives it out', latch.read(), 0x16);
  check('★ latch: and clears it', latch.peek(), 0);
  check('latch: an empty read is zero', latch.read(), 0);
}

// ------------------------------------------- boot model and a sprite entity

{
  // a stand-in application: the platform, a layout with caches that never paint
  const font = new C64Fonts8x8(null, false);
  const app = {
    now: 0,
    stack: {},
    fonts: {c64Fonts8x8: font},
    platform: {
      border: () => ({minimal: 24, defaultColor: C64Color.lightBlue}),
      desktop: () => ({width: 320, height: 200, defaultColor: C64Color.blue}),
      pixelScale: 1,
      initEntity: () => false
    },
    layout: {
      newDrawingCache: (entity, index) => { entity.drawingCache[index] = {cleanCache() {}, preparePaint() { return false; }}; },
      // ★ a C64 sprite is drawn through the crop cache, because **the border
      // clips it** (c64SpriteEntity) — so the stub layout has to support it too
      newDrawingCropCache: (entity) => { entity.drawingCropCache = {cleanCache() {}, preparePaint() { return false; }}; },
      clearCanvas: () => {},
      paintCache: () => {},
      paintCropCache: () => {},
      paintImage: () => {}
    },
    inputEventsManager: {updateGamepadsStates() {}},
    audioManager: false,
    switchedTo: null,
    setModel(name) { this.switchedTo = name; }
  };
  const model = new C64BootModel(app, {
    nextModel: 'DemoModel',
    commands: [
      {command: 'LOAD"DEMO",8,1', output: ['', 'SEARCHING FOR DEMO', 'LOADING'], ready: true},
      {command: 'RUN'}
    ]
  });
  model.init();
  const text = model.screen.textRAM;
  check('border light blue', model.borderEntity.bkColor, C64Color.lightBlue);
  check('screen blue', model.desktopEntity.bkColor, C64Color.blue);
  check('boot steps compiled', model.steps.length > 20, true);
  model.driveSteps(0);
  check('banner row 1', text.rowText(1).trim(), '**** COMMODORE 64 BASIC V2 ****');
  check('banner row 3', text.rowText(3).trim(), '64K RAM SYSTEM  38911 BASIC BYTES FREE');
  check('READY on row 5', text.rowText(5).trimEnd(), 'READY.');
  check('cursor on row 6', [text.cursor.col, text.cursor.row], [0, 6]);
  const t = model.properties.timing;
  model.driveSteps(t.promptPauseMs+t.typingMs*4);
  check('typing in progress', text.rowText(6).trimEnd(), 'LOAD');
  const last = model.steps[model.steps.length-1].at;
  model.driveSteps(last-1);
  check('not finished before the last step', model.finished, false);
  check('whole command typed', text.rowText(6).trimEnd(), 'LOAD"DEMO",8,1');
  check('searching', text.rowText(8).trimEnd(), 'SEARCHING FOR DEMO');
  check('loading', text.rowText(9).trimEnd(), 'LOADING');
  check('ready again', text.rowText(10).trimEnd(), 'READY.');
  check('RUN typed', text.rowText(11).trimEnd(), 'RUN');
  model.driveSteps(last);
  check('finished at the last step', model.finished, true);
  check('cursor hidden for the program', text.cursorEnabled, false);

  // the loop hands over once finished
  const timed = new C64BootModel(app, {nextModel: 'DemoModel'});
  timed.init();
  timed.loopModel(1000);
  check('loop: not over at 1 s', app.switchedTo, null);
  timed.loopModel(1000+timed.steps[timed.steps.length-1].at);
  check('loop: finished', timed.finished, true);
  timed.loopModel(1000+timed.steps[timed.steps.length-1].at+1);
  check('loop: handed over', app.switchedTo, 'DemoModel');
  check('default LOAD command', timed.screen.textRAM.rowText(6).trimEnd(), 'LOAD"*",8,1');

  // the skip
  app.switchedTo = null;
  const skipped = new C64BootModel(app, {nextModel: 'DemoModel'});
  skipped.init();
  skipped.loopModel(0);
  check('skip: Tab is not a skip key', skipped.handleEvent({id: 'keyPress', key: 'Tab'}), false);
  check('skip: Escape is', skipped.handleEvent({id: 'keyPress', key: 'Escape'}), true);
  check('skip: finished at once', skipped.finished, true);
  check('skip: everything printed', skipped.screen.textRAM.rowText(11).trimEnd(), 'RUN');
  skipped.loopModel(1);
  check('skip: handed over', app.switchedTo, 'DemoModel');

  // a sprite entity on the desktop of the stand-in
  const grid = [];
  for (let y = 0; y < 21; y++) grid.push('2'.repeat(24));
  const shape = new Uint8Array(64);
  shape.set(C64SpriteData.encode(grid));
  const sprite = new C64SpriteEntity(model.desktopEntity, {multicolor: false});
  sprite.setShapes(shape, 1);
  check('sprite: 24x21', [sprite.width, sprite.height], [24, 21]);
  check('sprite: one frame', sprite.frames, 1);
  check('sprite: 504 pixels', sprite.spriteData[0].length, 504);
  sprite.setColors(7);
  check('sprite: colour register', sprite.sharedPalette['2'], C64Color.yellow);
  check('sprite: pixel colour', sprite.pixelColor(sprite.spriteData[0][0], sprite.sharedPalette, 0), C64Color.yellow);
  sprite.setExpand(true, true);
  check('sprite: expanded 48x42', [sprite.width, sprite.height], [48, 42]);
  // the expansions are the scale: the shape stays 24 x 21, the pixels get bigger
  check('sprite: expanded is the scale', [sprite.scaleX, sprite.scaleY], [2, 2]);
  check('sprite: expanded keeps the shape', sprite.spriteData[0].length, 504);
  sprite.setExpand(false, false);
  check('sprite: expansion off again', [sprite.width, sprite.height, sprite.scaleX, sprite.scaleY], [24, 21, 1, 1]);
  sprite.setExpand(true, true);
  sprite.setSpritePosition(24, 50);
  check('sprite: position origin', [sprite.x, sprite.y], [0, 0]);
  sprite.setSpritePosition(200, 100);
  check('sprite: position', [sprite.x, sprite.y], [176, 50]);
  const two = new Uint8Array(128);
  two.set(C64SpriteData.encode(grid), 0);
  two.set(C64SpriteData.encode(grid.map((row) => row.replace(/2/g, '.'))), 64);
  const animated = new C64SpriteEntity(model.desktopEntity, {multicolor: true});
  animated.setShapes(two, 2);
  check('sprite: two frames', animated.frames, 2);
  check('sprite: multicolour reads pairs', animated.spriteData[0][0].c, '3');
  check('sprite: empty frame has no pixels', animated.spriteData[1].length, 0);
  check('sprite: fixed size even when empty', [animated.width, animated.height], [24, 21]);

  // ★ **The border clips sprites**, as on the machine: the VIC-II border unit
  // overrides the sprite output, so a sprite reaching the edge of the picture
  // is not drawn into the border. The entity therefore draws through the crop
  // cache and `blitCache` works out by itself what of it is visible.
  check('sprite draws through the crop cache', sprite.paintsWithVisibility(), true);
  const painted = [];
  model.app.layout.paintCache = (entity) => { painted.push(['whole', entity.x, entity.y]); };
  model.app.layout.paintCropCache = (entity, i, posX, posY, moveX, moveY) => {
    painted.push(['cropped', entity.x, entity.y, posX, posY, moveX, moveY]);
  };
  const edge = new C64SpriteEntity(model.desktopEntity, {multicolor: false});
  edge.setShapes(shape, 1);
  // ★ drawn **the way the model does it**: `drawSubEntity` itself works out
  // what of the parent's area the child gets — and the area is the picture,
  // 320 × 200. The desktop gets its area from `Canvas2DLayout.resizeModel`,
  // which the stub does not call, so the same four lines are set here.
  const desk = model.desktopEntity;
  desk.x = 24; desk.y = 24;
  desk.width = 320; desk.height = 200;
  desk.parentWidth = 320+2*24; desk.parentHeight = 200+2*24;
  const draw = (x, y) => {
    edge.setSpritePosition(x, y);
    model.desktopEntity.drawSubEntity(edge);
    return painted.pop();
  };
  check('inside the picture it is drawn whole', draw(24+100, 50+100), ['whole', 100, 100]);
  check('past the left edge it is cropped', draw(24-5, 50+100), ['cropped', -5, 100, 5, 0, 5, 0]);
  check('past the right edge too', draw(24+310, 50+100), ['cropped', 310, 100, -14, 0, -14, 0]);
  check('and above the top edge', draw(24+100, 50-3), ['cropped', 100, -3, 0, 3, 0, 3]);
  model.app.layout.paintCache = () => {};
  model.app.layout.paintCropCache = () => {};
}

// ------------------------------------------------- multicolour text mode
{
  // a game's own character set: no inversion in hardware, 256 glyphs of 8 bytes
  const bytes = new Uint8Array(2048);
  bytes.set([0b00011011, 0, 0, 0, 0, 0, 0, 0], 1*8);     // code 1: one of each bit pair
  bytes.set([0xFF, 0, 0, 0, 0, 0, 0, 0], 2*8);           // code 2: all bits set
  const charset = new C64Charset(bytes);
  check('charset: glyph bytes are read straight', Array.from(charset.glyphBytes(1)).slice(0, 1), [0b00011011]);
  check('charset: high codes are not inverted', Array.from(charset.glyphBytes(0x81)), [0, 0, 0, 0, 0, 0, 0, 0]);
  check('charset: a set is 2 KB', charset.setBytes(0).length, 2048);
  charset.setGlyph(3, [1, 2, 3, 4, 5, 6, 7, 8]);
  check('charset: a glyph can be rewritten', Array.from(charset.glyphBytes(3)), [1, 2, 3, 4, 5, 6, 7, 8]);

  const text = new C64TextRAM();
  text.showCursor(false);
  text.clear(1);
  text.setBackground(6);            // $D021
  text.setSharedColors(15, 12);     // $D022, $D023
  text.setMulticolor(true);
  text.putChar(0, 0, 1, 8);         // colour 8: multicolour, own colour 0
  text.putChar(1, 0, 2, 5);         // colour 5: stays hires even in the mode
  const pixels = new Uint32Array(320*200);
  text.paint32(pixels, charset, true, {cursor: false});
  const palette = C64TextRAM.lookup(true);
  // cell 0: bit pairs 00 01 10 11 -> $D021, $D022, $D023, own colour, two pixels each
  check('multicolour: bit pair 00 is the background',
        [pixels[0], pixels[1]], [palette[6], palette[6]]);
  check('multicolour: bit pair 01 is $D022',
        [pixels[2], pixels[3]], [palette[15], palette[15]]);
  check('multicolour: bit pair 10 is $D023',
        [pixels[4], pixels[5]], [palette[12], palette[12]]);
  check('multicolour: bit pair 11 is the cell colour',
        [pixels[6], pixels[7]], [palette[0], palette[0]]);
  check('multicolour: a cell with colour 0-7 stays hires',
        [pixels[8], pixels[9], pixels[15]], [palette[5], palette[5], palette[5]]);
  text.setMulticolor(false);
  text.paint32(pixels, charset, true, {cursor: false});
  check('multicolour off: the same cell is hires again',
        [pixels[0], pixels[3], pixels[4]], [palette[6], palette[8], palette[8]]);
  const before = text.version;
  text.setMulticolor(true);
  text.setSharedColors(1, 2);
  check('multicolour: the mode and the shared colours bump the version', text.version, before+2);
}

// ------------------------------------------------- raster splits ($D018 mid-frame)
{
  // two sets: one draws every pixel of a cell, the other none
  const solid = new Uint8Array(2048); solid.fill(0xFF);
  const empty = new Uint8Array(2048);
  const setA = new C64Charset(solid), setB = new C64Charset(empty);

  const text = new C64TextRAM();
  text.showCursor(false);
  text.clear(1);                       // colour 1 = white, hires
  text.setBackground(0);
  const pixels = new Uint32Array(320*200);
  const palette = C64TextRAM.lookup(true);

  text.setSplits([{fromLine: 0, font: setA, background: 6},
                  {fromLine: 100, font: setB, background: 2}]);
  check('splits: sorted and kept', text.splits.length, 2);
  check('splits: a line before the second one takes the first',
        [text.splitAt(99).background, text.splitAt(100).background], [6, 2]);
  check('splits: what a split leaves out is inherited',
        text.splitAt(100).background1, text.background1);

  text.paint32(pixels, setA, true, {cursor: false});
  check('splits: above the split the first set paints', pixels[0], palette[1]);
  check('splits: below the split the second set paints nothing',
        pixels[100*320], palette[2]);
  check('splits: the background changes with the split',
        [pixels[99*320], pixels[100*320]], [palette[1], palette[2]]);

  // a split inside a cell: the set changes on line 4 of row 0
  text.setSplits([{fromLine: 0, font: setA, background: 6},
                  {fromLine: 4, font: setB, background: 2}]);
  text.paint32(pixels, setA, true, {cursor: false});
  check('splits: a set can change inside a cell',
        [pixels[3*320], pixels[4*320]], [palette[1], palette[2]]);

  text.setSplits(null);
  text.paint32(pixels, setA, true, {cursor: false});
  check('splits: null goes back to one set of registers',
        [pixels[0], pixels[100*320]], [palette[1], palette[1]]);
}

// ------------------------- fine scroll, 38 columns, splits inside a line ($D016)
{
  // column 0 solid white, everything else empty: the scroll shows where it went
  const glyphs = new Uint8Array(2048);
  for (let i = 0; i < 8; i++) glyphs[1*8+i] = 0xFF;          // code 1 solid
  const set = new C64Charset(glyphs);
  const text = new C64TextRAM();
  text.showCursor(false);
  text.clear(1);
  text.screen.fill(0);
  for (let row = 0; row < 25; row++) text.screen[row*40] = 1; // column 0
  text.setBackground(0).setBorder(2);
  const pixels = new Uint32Array(320*200);
  const palette = C64TextRAM.lookup(true);
  const line = (y, x0, n) => Array.from(pixels.subarray(y*320+x0, y*320+x0+n));
  const W = palette[1], K = palette[0], R = palette[2];

  text.paint32(pixels, set, true, {cursor: false});
  check('scroll 0: column 0 at x 0-7', line(0, 0, 9), [W, W, W, W, W, W, W, W, K]);
  check('scroll 0 and 40 columns keep the old painter', text.needsLinePainter(), false);

  text.setScrollX(3);
  text.paint32(pixels, set, true, {cursor: false});
  check('scroll 3: the background uncovered on the left',
        line(0, 0, 12), [K, K, K, W, W, W, W, W, W, W, W, K]);
  check('scroll: the register keeps three bits', text.setScrollX(11).scrollX, 3);

  text.setColumns(38);
  text.paint32(pixels, set, true, {cursor: false});
  check('38 columns: the border covers 7 pixels on the left',
        line(0, 0, 12), [R, R, R, R, R, R, R, W, W, W, W, K]);
  check('38 columns: and 9 on the right', line(0, 310, 10), [K, R, R, R, R, R, R, R, R, R]);
  text.paint32(pixels, set, true, {cursor: false, border: false});
  check('border: false leaves it to paintBorder32', line(0, 0, 4), [K, K, K, W]);
  text.paintBorder32(pixels, true);
  check('paintBorder32 paints it afterwards', line(0, 0, 4), [R, R, R, R]);

  // a panel: from line 100 on, 40 columns and no scroll
  text.setSplits([{fromLine: 100, scrollX: 0, columns: 40}]);
  text.paint32(pixels, set, true, {cursor: false});
  check('split: scroll and columns per band',
        [line(99, 0, 8), line(100, 0, 8)], [[R, R, R, R, R, R, R, W], [W, W, W, W, W, W, W, W]]);

  // inside a line: the scroll changes from x 160 of line 50
  text.setColumns(40).setScrollX(0);
  for (let row = 0; row < 25; row++) text.screen[row*40+20] = 1;   // column 20 too
  text.setSplits([{fromLine: 50, fromX: 160, scrollX: 4}]);
  text.paint32(pixels, set, true, {cursor: false});
  check('split inside a line: the left part of the line keeps the old scroll',
        [line(50, 0, 2), line(50, 160, 6)], [[W, W], [K, K, K, K, W, W]]);
  check('split inside a line: the line above is untouched', line(49, 160, 6), [W, W, W, W, W, W]);
  check('split inside a line: the line below has it from x 0', line(51, 0, 6), [K, K, K, K, W, W]);
  check('splitAt honours fromX', [text.splitAt(50, 159).scrollX, text.splitAt(50, 160).scrollX], [0, 4]);
}

// -------------------------------------------- sprites in the frame, multiplexed
{
  const bank = new Uint8Array(16384);
  for (let i = 0; i < 63; i++) bank[0x80*64+i] = 0xFF;       // block $80: solid
  for (let i = 0; i < 63; i += 3) bank[0x81*64+i] = 0x40;    // block $81: multicolour 01 in pair 0
  const sprites = new C64Sprites(bank);
  const vic = new Uint8Array(0x2F);
  vic[0x15] = 0x01;                     // sprite 0 on
  vic[0x00] = 24; vic[0x01] = 50;       // top left of the picture
  vic[0x27] = 1;                        // white
  sprites.setRegisters(vic).setPointers([0x80, 0, 0, 0, 0, 0, 0, 0]);
  const palette = C64TextRAM.lookup(true);
  const pixels = new Uint32Array(320*200);
  const at = (x, y) => pixels[y*320+x];
  const W = palette[1];

  sprites.paint32(pixels, true);
  check('sprite: Y 50 starts on line 0, 24 wide', [at(0, 0), at(23, 0), at(24, 0)], [W, W, 0]);
  check('sprite: 21 lines high', [at(0, 20), at(0, 21)], [W, 0]);

  // multiplex: the same sprite again lower down, written on line 30
  pixels.fill(0);
  sprites.setWrites([{line: 30, register: 0xD001, value: 150}, {line: 30, register: 0xD000, value: 124},
                     {line: 30, register: 0xD027, value: 2}]);
  sprites.paint32(pixels, true);
  check('multiplex: the first use is drawn whole', at(0, 20), W);
  check('multiplex: the second use starts at its new Y with its new X and colour',
        [at(100, 99), at(100, 100), at(100, 120), at(100, 121)], [0, palette[2], palette[2], 0]);

  // a store to Y while the sprite is shown does not restart it
  pixels.fill(0);
  sprites.setWrites([{line: 10, register: 0xD001, value: 61}]);
  sprites.paint32(pixels, true);
  check('Y written while shown: the sprite runs out its 21 lines', [at(0, 20), at(0, 21)], [W, 0]);

  // expanded both ways, sprite 1 behind sprite 0, X over 255 through $D010
  pixels.fill(0);
  vic[0x15] = 0x03; vic[0x17] = 0x01; vic[0x1D] = 0x01;
  vic[0x02] = 24; vic[0x03] = 50; vic[0x28] = 5;
  sprites.setRegisters(vic).setPointers([0x80, 0x80, 0, 0, 0, 0, 0, 0]).setWrites(null);
  sprites.paint32(pixels, true);
  check('sprite 0 is in front of sprite 1', at(0, 0), W);
  check('expanded: 48 wide and 42 high', [at(47, 41), at(48, 0), at(0, 42)], [W, 0, 0]);
  pixels.fill(0);
  vic[0x15] = 0x01; vic[0x17] = 0; vic[0x1D] = 0; vic[0x00] = 0x20; vic[0x10] = 0x01;
  sprites.setRegisters(vic).setPointers([0x80]);
  sprites.paint32(pixels, true);
  check('$D010: X 288 is picture x 264', [at(263, 0), at(264, 0)], [0, W]);

  // multicolour: pair 01 is $D025, two pixels wide
  pixels.fill(0);
  vic[0x10] = 0; vic[0x00] = 24; vic[0x1C] = 0x01; vic[0x25] = 7;
  sprites.setRegisters(vic).setPointers([0x81]);
  sprites.paint32(pixels, true);
  check('multicolour: 01 is $D025 and two pixels wide', [at(0, 0), at(1, 0), at(2, 0)], [palette[7], palette[7], 0]);
}

console.log(`checkc64: ${checks} checks, ${differences} differences`);
process.exit(differences);
