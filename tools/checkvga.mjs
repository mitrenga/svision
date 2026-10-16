#!/usr/bin/env node
/**
 * Self-check of the VGA platform classes under Node — the DOM-free half of the
 * platform (palette, video memory, text memory, PCM samples) and the boot
 * model's schedule driven against a stand-in application. Nothing here needs
 * a browser; it is the harness a match* tool of a VGA game will stand on.
 *
 * Every check is one line: what was expected, what came out. The report has
 * the shape of the match tools — the number of checks and the number of
 * differences — and the exit code is the number of differences.
 *
 * usage: node tools/checkvga.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { VGAPalette } = await import('../js/platform/canvas2D/vga/vgaPalette.js');
const { VGAVideoRAM } = await import('../js/platform/canvas2D/vga/vgaVideoRAM.js');
const { VGATextRAM } = await import('../js/platform/canvas2D/vga/vgaTextRAM.js');
const { PCMSample } = await import('../js/audio/pcmSample.js');
const { VGAFonts8x16 } = await import('../js/platform/canvas2D/vga/vgaFonts8x16.js');
const { DOSBootModel } = await import('../js/platform/canvas2D/vga/dosBootModel.js');

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

// ------------------------------------------------------------------ palette

{
  const p = VGAPalette.defaultPalette();
  check('default 0 black', p.get(0), [0, 0, 0]);
  check('default 1 blue', p.get(1), [0, 0, 42]);
  check('default 6 brown', p.get(6), [42, 21, 0]);
  check('default 15 white', p.get(15), [63, 63, 63]);
  check('default 16 grey 0', p.get(16), [0, 0, 0]);
  check('default 31 grey 15', p.get(31), [63, 63, 63]);
  check('default 32 ring blue', p.get(32), [0, 0, 63]);
  check('default 34 half rounds down', p.get(34), [31, 0, 63]);
  check('default 36 magenta', p.get(36), [63, 0, 63]);
  check('default 40 red', p.get(40), [63, 0, 0]);
  check('default 41', p.get(41), [63, 16, 0]);
  check('default 44 yellow', p.get(44), [63, 63, 0]);
  check('default 48 green', p.get(48), [0, 63, 0]);
  check('default 52 cyan', p.get(52), [0, 63, 63]);
  check('default 55 last hue', p.get(55), [0, 16, 63]);
  check('default 56 medium saturation', p.get(56), [31, 31, 63]);
  check('default 80 low saturation', p.get(80), [45, 45, 63]);
  check('default 104 dim block', p.get(104), [0, 0, 28]);
  check('default 128', p.get(128), [14, 14, 28]);
  check('default 152', p.get(152), [20, 20, 28]);
  check('default 176 dark block', p.get(176), [0, 0, 16]);
  check('default 200', p.get(200), [8, 8, 16]);
  check('default 224', p.get(224), [11, 11, 16]);
  check('default 247 last colour', p.get(247), [11, 12, 16]);
  check('default 248 black', p.get(248), [0, 0, 0]);
  check('default 255 black', p.get(255), [0, 0, 0]);
  check('to8bit 63', VGAPalette.to8bit(63), 255);
  check('to8bit 0', VGAPalette.to8bit(0), 0);
  check('to8bit 32', VGAPalette.to8bit(32), 130);
  check('cssColor 40', p.cssColor(40), '#ff0000');

  const lut = p.lookup(true);
  check('lookup little-endian red', (lut[40] >>> 0).toString(16), 'ff0000ff');
  check('lookup big-endian red', (p.lookup(false)[40] >>> 0).toString(16), 'ff0000ff');
  check('lookup big-endian blue', (p.lookup(false)[32] >>> 0).toString(16), 'ffff');
  check('lookup little-endian blue', (p.lookup(true)[32] >>> 0).toString(16), 'ffff0000');

  const black = new VGAPalette();
  const fading = p.copy();
  let steps = 0;
  while (!fading.fadeStep(black, 4)) {
    steps++;
  }
  check('fade 63 -> 0 by 4 in 16 steps', steps+1, 16);
  check('fade arrives', fading.equals(black), true);
  const versionBefore = p.version;
  p.rotate(32, 55, true);
  check('rotate forward moves 32 to 33', p.get(33), [0, 0, 63]);
  check('rotate forward wraps 55 to 32', p.get(32), [0, 16, 63]);
  p.rotate(32, 55, false);
  check('rotate back restores', p.equals(VGAPalette.defaultPalette()), true);
  check('rotate bumps version', p.version > versionBefore, true);
  const mixed = new VGAPalette().blend(black, p, 0.5);
  check('blend half of 63', mixed.get(15), [32, 32, 32]);
  const loaded = new VGAPalette().load([63, 0, 0, 0, 63, 0], 10);
  check('load at 10', [loaded.get(10), loaded.get(11), loaded.get(12)], [[63, 0, 0], [0, 63, 0], [0, 0, 0]]);
  check('load8bit scales', new VGAPalette().load8bit([255, 128, 0]).get(0), [63, 32, 0]);
}

// ------------------------------------------------------------- video memory

{
  const v = new VGAVideoRAM();
  check('vram size', v.bytes.length, 64000);
  v.fillRect(-10, -10, 20, 20, 5);
  check('fillRect clips top-left', [v.pixel(0, 0), v.pixel(9, 9), v.pixel(10, 10)], [5, 5, 0]);
  v.fillRect(315, 195, 20, 20, 6);
  check('fillRect clips bottom-right', [v.pixel(319, 199), v.pixel(314, 194)], [6, 0]);
  check('setPixel outside dropped', v.setPixel(320, 0, 1), false);
  check('pixel outside is 0', v.pixel(-1, 5), 0);

  const sprite = VGAVideoRAM.buffer(3, 2, new Uint8Array([1, 0, 2, 3, 0, 4]));
  v.fill(9);
  v.blit(sprite, 100, 100, {transparent: 0});
  check('blit with transparency', [v.pixel(100, 100), v.pixel(101, 100), v.pixel(102, 100), v.pixel(100, 101), v.pixel(102, 101)], [1, 9, 2, 3, 4]);
  v.blit(sprite, 100, 100, {transparent: 0, flipX: true});
  check('blit flipX', [v.pixel(100, 100), v.pixel(102, 100)], [2, 1]);
  v.fill(0);
  v.blit(sprite, -1, 199);
  check('blit clipped both ways', [v.pixel(0, 199), v.pixel(1, 199)], [0, 2]);

  v.fill(0);
  v.fillRect(0, 0, 4, 1, 7);
  v.copyRect(0, 0, 4, 1, 2, 0);
  check('copyRect overlapping', [v.pixel(0, 0), v.pixel(1, 0), v.pixel(5, 0), v.pixel(6, 0)], [7, 7, 7, 0]);
  const other = new VGAVideoRAM();
  v.copyRect(0, 0, 6, 1, 10, 10, other);
  check('copyRect to another buffer', [other.pixel(10, 10), other.pixel(15, 10), other.pixel(16, 10)], [7, 7, 0]);
  const piece = v.cut(4, 0, 4, 1);
  check('cut', Array.from(piece.bytes), [7, 7, 0, 0]);
  check('differences', v.differences(other), 12);
  check('differences of a copy', v.differences(v.copy()), 0);

  const b64 = Buffer.from(v.bytes).toString('base64');
  globalThis.atob = globalThis.atob || ((s) => Buffer.from(s, 'base64').toString('binary'));
  check('restore from base64', new VGAVideoRAM(b64).differences(v), 0);
  check('restore from data file field', new VGAVideoRAM().restore({videoRAM: v.bytes}).differences(v), 0);

  const p = VGAPalette.defaultPalette();
  const rgba = new Uint8Array(64000*4);
  const px32 = new Uint32Array(64000);
  v.fill(40);
  v.paint(rgba, p);
  v.paint32(px32, p.lookup(true));
  check('paint red', [rgba[0], rgba[1], rgba[2], rgba[3]], [255, 0, 0, 255]);
  check('paint32 equals paint', Buffer.compare(Buffer.from(rgba), Buffer.from(new Uint8Array(px32.buffer))), 0);

  const font = new VGAFonts8x16(null, false);
  v.fill(0);
  v.drawText(font, 8, 8, 'A', 15, 1);
  let ink = 0, paper = 0;
  for (let y = 8; y < 24; y++) {
    for (let x = 8; x < 16; x++) {
      if (v.pixel(x, y) === 15) ink++;
      if (v.pixel(x, y) === 1) paper++;
    }
  }
  check('drawText fills the cell', ink+paper, 128);
  check('drawText has ink', ink > 20, true);
  check('drawText outside cell untouched', v.pixel(16, 8), 0);
}

// -------------------------------------------------------------- text memory

{
  const t = new VGATextRAM();
  check('text size', t.bytes.length, 4000);
  check('cleared to spaces', [t.charAt(0, 0), t.attributeAt(79, 24)], [0x20, 0x07]);
  t.print('Hello', 0x1F);
  check('print advances cursor', [t.cursor.col, t.cursor.row], [5, 0]);
  check('print writes attribute', t.attributeAt(0, 0), 0x1F);
  check('rowText', t.rowText(0).substring(0, 6), 'Hello ');
  t.print('\n'+'x'.repeat(85));
  check('wrap at 80', [t.cursor.col, t.cursor.row, t.charAt(79, 1), t.charAt(4, 2)], [5, 2, 0x78, 0x78]);
  t.setCursor(0, 24);
  t.print('bottom\n');
  check('scroll on last row', [t.cursor.row, t.rowText(23).substring(0, 6), t.rowText(0).substring(0, 5)], [24, 'bottom', 'x'.repeat(5)]);
  check('scroll blanks the new row', t.rowText(24).trim(), '');
  t.printAt(70, 5, 'wide text runs off', 0x70);
  check('printAt clips at column 80', [t.charAt(79, 5), t.attributeAt(79, 5), t.charAt(0, 6)], [0x20, 0x70, 0x20]);
  check('cp437 box drawing', VGATextRAM.encodeChar('═'), 0xCD);
  check('cp437 block', VGATextRAM.encodeChar('█'), 0xDB);
  check('cp437 missing glyph', VGATextRAM.encodeChar('☃'), 0x3F);
  let roundTrip = 0;
  for (let code = 1; code < 256; code++) {
    if (VGATextRAM.encodeChar(VGATextRAM.decodeChar(code)) === code) {
      roundTrip++;
    }
  }
  check('cp437 round trip 1-255', roundTrip, 255);
  check('cp437 nul shows blank', VGATextRAM.decodeChar(0), ' ');

  const font = new VGAFonts8x16(null, false);
  const glyphA = font.glyphBytes('A'.codePointAt(0));
  check('glyphBytes 16 rows', glyphA.length, 16);
  check('glyphBytes has pixels', glyphA.some((row) => row !== 0), true);
  check('glyphBytes missing gives ?', Array.from(font.glyphBytes(0x1F600)), Array.from(font.glyphBytes('?'.codePointAt(0))));

  const s = new VGATextRAM();
  s.clear(0x1E);       // yellow on blue
  s.print('A');
  s.showCursor(false);
  const px = new Uint32Array(640*400);
  s.paint32(px, font, true, {});
  const yellow = VGATextRAM.lookup(true)[14], blue = VGATextRAM.lookup(true)[1];
  let ink = 0, paper = 0, other = 0;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 8; x++) {
      const v = px[y*640+x];
      if (v === yellow) ink++; else if (v === blue) paper++; else other++;
    }
  }
  check('text paint cell colours', [ink+paper, other, ink > 0], [128, 0, true]);
  check('text paint empty cell is paper', px[8], blue);
  s.showCursor(true);
  s.paint32(px, font, true, {cursorPhase: true});
  check('cursor underline in ink', [px[14*640+8], px[15*640+8], px[13*640+8]], [yellow, yellow, blue]);
  s.paint32(px, font, true, {cursorPhase: false});
  check('cursor off phase', px[14*640+8], blue);
  s.putChar(2, 0, 0x41, 0x8E);   // blinking yellow on black
  s.paint32(px, font, true, {blinkPhase: false});
  let visible = 0;
  for (let y = 0; y < 16; y++) {
    for (let x = 16; x < 24; x++) {
      if (px[y*640+x] !== VGATextRAM.lookup(true)[0]) visible++;
    }
  }
  check('blink off hides the glyph', visible, 0);
}

// ---------------------------------------------------------------- PCM sample

{
  const bytes = new Uint8Array(256);
  for (let i = 0; i < 256; i++) bytes[i] = i;
  const s = PCMSample.fromUnsigned8(bytes, 11025);
  check('u8 silence at 128', s.samples[128], 0);
  check('u8 round trip', Buffer.compare(Buffer.from(s.toUnsigned8()), Buffer.from(bytes)), 0);
  check('duration', s.duration, 256/11025);
  const wav8 = s.toWAV(8);
  check('wav8 header', [String.fromCharCode(...wav8.subarray(0, 4)), wav8.length], ['RIFF', 44+256]);
  const back8 = PCMSample.fromWAV(wav8);
  check('wav8 round trip', [back8.sampleRate, Buffer.compare(Buffer.from(back8.toUnsigned8()), Buffer.from(bytes))], [11025, 0]);
  const wav16 = s.toWAV(16);
  const back16 = PCMSample.fromWAV(wav16);
  check('wav16 round trip', Buffer.compare(Buffer.from(back16.toUnsigned8()), Buffer.from(bytes)), 0);
  check('s16 decode', PCMSample.fromSigned16(new Uint8Array([0x00, 0x80, 0xFF, 0x7F]), 8000).samples[0], -1);
  check('s8 decode', PCMSample.fromSigned8(new Uint8Array([0x80, 0x7F]), 8000).samples[0], -1);
  const tone = PCMSample.tone(11025, 440, 0.5, {volume: 0.5});
  check('tone length', tone.samples.length, Math.round(11025*0.5));
  check('tone within volume', Math.max(...tone.samples) <= 0.5, true);
  // a stereo WAV mixes down
  const stereo = new Uint8Array(44+4);
  stereo.set(s.toWAV(8).subarray(0, 44));
  const view = new DataView(stereo.buffer);
  view.setUint16(22, 2, true);
  view.setUint32(40, 4, true);
  stereo.set([64, 192, 128, 128], 44);
  check('stereo mixdown', Array.from(PCMSample.fromWAV(stereo).samples), [0, 0]);
}

// ---------------------------------------------------------------- boot model

{
  // a stand-in application: the platform, a layout with caches that never paint
  const font = new VGAFonts8x16(null, false);
  const app = {
    now: 0,
    stack: {},
    fonts: {vgaFonts8x16Mono: font},
    platform: {
      border: () => ({minimal: 0, defaultColor: '#000000'}),
      desktop: () => ({width: 320, height: 200, defaultColor: '#000000'}),
      pixelScale: 1,
      initEntity: () => false
    },
    layout: {
      newDrawingCache: (entity, index) => { entity.drawingCache[index] = {cleanCache() {}, preparePaint() { return false; }}; },
      clearCanvas: () => {},
      paintCache: () => {},
      paintImage: () => {}
    },
    inputEventsManager: {updateGamepadsStates() {}},
    audioManager: false,
    switchedTo: null,
    setModel(name) { this.switchedTo = name; }
  };
  const model = new DOSBootModel(app, {
    nextModel: 'DemoModel',
    dos: {commands: [{command: 'CD PRINCE', prompt: 'C:\\PRINCE>'}, {command: 'PRINCE'}]}
  });
  model.init();
  const text = model.screen.textRAM;
  check('boot steps compiled', model.steps.length > 60, true);
  model.driveSteps(0);
  check('POST title printed', text.rowText(0).trim(), 'ROM BIOS  Version 1.02');
  const lastPost = model.steps[model.steps.length-1].at;
  model.driveSteps(model.properties.timing.memoryStepMs*10);
  check('memory counts', text.rowText(5).includes('640K OK'), true);
  // find the moment DOS starts: the first step after the count and post pause
  let dosAt = 0;
  for (const step of model.steps) {
    if (step.at > model.properties.timing.memoryStepMs*Math.ceil(3712/64)+model.properties.timing.postPauseMs) {
      dosAt = step.at;
      break;
    }
  }
  model.driveSteps(dosAt);
  check('DOS clears the screen', text.rowText(0).trim(), 'Starting MS-DOS...');
  model.driveSteps(lastPost-model.properties.timing.blackMs);
  const rows = [];
  for (let r = 0; r < 25; r++) rows.push(text.rowText(r).trimEnd());
  check('commands typed at the prompt', rows.filter((row) => row.length).slice(-2), ['C:\\>CD PRINCE', 'C:\\PRINCE>PRINCE']);
  check('config line printed', rows.includes('HIMEM is testing extended memory...done.'), true);
  check('mode 13h: text screen hidden', model.screen.hide, true);
  check('not finished yet', model.finished, false);
  // the model's own loop: hands over once finished
  app.now = 0;
  model.loopModel(0);
  model.loopModel(lastPost+1);
  check('finished by the loop', model.finished, true);
  check('hands over to nextModel', app.switchedTo, 'DemoModel');

  // and the skip
  const quick = new DOSBootModel(app, {nextModel: 'DemoModel'});
  quick.init();
  app.switchedTo = null;
  app.now = 1000;
  quick.loopModel(1000);
  check('skip key handled', quick.handleEvent({id: 'keyPress', key: 'Escape'}), true);
  check('skip runs everything', [quick.stepIndex, quick.finished], [quick.steps.length, true]);
  quick.loopModel(1300);
  check('skip hands over on the next loop', app.switchedTo, 'DemoModel');
}

console.log(`checkvga: ${checks} checks, ${differences} differences`);
process.exit(differences);
