#!/usr/bin/env node
/**
 * Self-check of the vector platform under Node — the DOM-free half: the
 * display list (primitives, defaults, bounds, translation, differences) and
 * its markup, which is the same string the browser layout injects and a
 * match* tool of a vector game diffs; the vector font, the text, menu,
 * name and hall-of-fame entities and the headless layout drawn through a
 * stand-in application; and the Atari vector generators AVG and DVG with
 * the math box (Battlezone, Asteroids) against hand-assembled programs.
 *
 * Every check is one line: what was expected, what came out. The report has
 * the shape of the match tools — the number of checks and the number of
 * differences — and the exit code is the number of differences.
 *
 * usage: node tools/checkvector.mjs [-v]
 */
import './nodeEnv.mjs';   // must come first: the import headers read window.srcVersion

const { VectorDisplayList } = await import('../js/platform/vector/vectorDisplayList.js');
const { VectorFont } = await import('../js/platform/vector/vectorFont.js');
const { VectorPlatform } = await import('../js/platform/vector/vectorPlatform.js');
const { VectorEntity } = await import('../js/platform/vector/vectorEntity.js');
const { VectorTextEntity } = await import('../js/platform/vector/vectorTextEntity.js');
const { VectorMenuEntity } = await import('../js/platform/vector/vectorMenuEntity.js');
const { VectorNameEntity } = await import('../js/platform/vector/vectorNameEntity.js');
const { VectorHallOfFameEntity } = await import('../js/platform/vector/vectorHallOfFameEntity.js');
const { AbstractModel } = await import('../js/abstractModel.js');
const { headlessVectorApp } = await import('./headlessApp.mjs');
const { AVG } = await import('../js/platform/vector/atari/avg.js');
const { MathBox } = await import('../js/platform/vector/atari/mathbox.js');
const { DVG } = await import('../js/platform/vector/atari/dvg.js');

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

// ------------------------------------------------------------ primitives

{
  const l = new VectorDisplayList();
  check('empty list', l.items.length, 0);
  check('empty version', l.version, 0);
  check('empty bounds', l.bounds(), false);

  l.line(0, 0, 10, 5);
  check('line defaults', l.items[0], {color: '#ffffff', fill: 'none', strokeWidth: 1, intensity: 15, opacity: 1, type: 'line', x1: 0, y1: 0, x2: 10, y2: 5});
  check('version after line', l.version, 1);

  l.polyline([1, 2, 3, 4, 5, 6], {color: '#00ff00', intensity: 7});
  check('polyline style', [l.items[1].color, l.items[1].intensity, l.items[1].points], ['#00ff00', 7, [1, 2, 3, 4, 5, 6]]);
  l.polygon([0, 0, 4, 0, 4, 4], {fill: '#ff0000'});
  l.rect(-2, -3, 5, 6, {radius: 1});
  l.circle(10, 10, 2.5);
  l.text(3, 4, 'A<B&"C"', {size: 8, anchor: 'middle'});
  l.path('M0 0 L1 1');
  check('seven items', l.items.length, 7);
  check('bounds', l.bounds(), {x: -2, y: -3, width: 14.5, height: 15.5});

  const pts = [1, 2, 3, 4];
  l.polyline(pts);
  pts[0] = 99;
  check('polyline copies points', l.items[7].points[0], 1);

  const before = l.version;
  l.clear();
  check('clear empties', l.items.length, 0);
  check('clear bumps version', l.version, before+1);
  l.clear();
  check('clear of empty keeps version', l.version, before+1);
}

// ----------------------------------------------------------------- markup

{
  const l = new VectorDisplayList();
  l.line(0, 0, 10, 5);
  check('line markup', VectorDisplayList.element(l.items[0]),
    '<line x1="0" y1="0" x2="10" y2="5" stroke="#ffffff" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');

  l.clear().polyline([1, 2, 3.14159, 4], {color: '#00ff00', intensity: 7.5, strokeWidth: 2});
  check('polyline markup: numbers to 3 decimals, intensity to opacity', VectorDisplayList.element(l.items[0]),
    '<polyline points="1,2 3.142,4" stroke="#00ff00" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>');

  l.clear().polygon([0, 0, 4, 0, 4, 4], {fill: '#ff0000'});
  check('polygon markup', VectorDisplayList.element(l.items[0]),
    '<polygon points="0,0 4,0 4,4" stroke="#ffffff" stroke-width="1" fill="#ff0000" stroke-linecap="round" stroke-linejoin="round"/>');

  l.clear().rect(1, 2, 3, 4, {radius: 0.5, opacity: 0.5, intensity: 15});
  check('rect markup', VectorDisplayList.element(l.items[0]),
    '<rect x="1" y="2" width="3" height="4" rx="0.5" stroke="#ffffff" stroke-width="1" fill="none" opacity="0.5"/>');

  l.clear().circle(10, 10, 2.5, {className: 'dot'});
  check('circle markup', VectorDisplayList.element(l.items[0]),
    '<circle cx="10" cy="10" r="2.5" stroke="#ffffff" stroke-width="1" fill="none" class="dot"/>');

  l.clear().text(3, 4, 'A<B&"C"', {size: 8, anchor: 'middle', weight: 'bold', color: '#ffff00'});
  check('text markup escapes', VectorDisplayList.element(l.items[0]),
    '<text x="3" y="4" fill="#ffff00" font-family="monospace" font-size="8" text-anchor="middle" font-weight="bold">A&lt;B&amp;&quot;C&quot;</text>');

  l.clear().path('M0 0 L1 1', {transform: 'rotate(45)'});
  check('path markup', VectorDisplayList.element(l.items[0]),
    '<path d="M0 0 L1 1" stroke="#ffffff" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="rotate(45)"/>');

  l.clear().line(0, 0, 1, 1).line(1, 1, 2, 2);
  check('markup joins with newlines', l.markup().split('\n').length, 2);
  check('toSVG viewBox from bounds', l.toSVG().split('\n')[0], '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2">');
  check('toSVG explicit size and background', l.toSVG({width: 100, height: 50, background: '#000'}).split('\n').slice(0, 2),
    ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">', '<rect width="100%" height="100%" fill="#000"/>']);
  check('toSVG closes', l.toSVG().endsWith('</svg>\n'), true);
}

// ------------------------------------------------------ translate, append

{
  const a = new VectorDisplayList();
  a.line(0, 0, 1, 1).polygon([0, 0, 1, 0]).rect(0, 0, 1, 1).circle(0, 0, 1).text(0, 0, 'x').path('M0 0');
  const b = new VectorDisplayList();
  b.append(a, 10, 20);
  check('append count', b.items.length, 6);
  check('translate line', [b.items[0].x1, b.items[0].y1, b.items[0].x2, b.items[0].y2], [10, 20, 11, 21]);
  check('translate polygon', b.items[1].points, [10, 20, 11, 20]);
  check('translate rect', [b.items[2].x, b.items[2].y], [10, 20]);
  check('translate circle', [b.items[3].cx, b.items[3].cy], [10, 20]);
  check('translate text', [b.items[4].x, b.items[4].y], [10, 20]);
  check('translate path by transform', b.items[5].transform, 'translate(10 20)');
  check('append leaves source', a.items[0].x1, 0);
}

// ------------------------------------------------------------ differences

{
  const a = new VectorDisplayList();
  const b = new VectorDisplayList();
  a.line(0, 0, 1, 1).circle(5, 5, 1);
  b.line(0, 0, 1, 1).circle(5, 5, 1);
  check('same lists: 0', a.differences(b), 0);
  b.items[1].r = 2;
  check('one changed: 1', a.differences(b), 1);
  b.line(0, 0, 0, 0);
  check('one changed, one extra: 2', a.differences(b), 2);
  check('symmetric', b.differences(a), 2);
  const c = new VectorDisplayList();
  c.circle(5, 5, 1).line(0, 0, 1, 1);
  check('swapped pair counts twice', a.differences(c), 2);
}

// ------------------------------------------------------------------- font

{
  const f = VectorFont.simple();
  check('simple font is one instance', VectorFont.simple() === f, true);
  check('metrics', f.metrics, {width: 4, height: 6, advance: 6, descent: 1});
  check('capitals, digits, punctuation present', ['A', 'Z', '0', '9', ' ', '.', '©', '?'].every((ch) => f.glyph(ch) !== false), true);
  check('lower case maps to upper', f.glyph('a'), f.glyph('A'));
  check('unknown glyph is false', f.glyph('ř'), false);
  check('width of empty text', f.textWidth('', 12), 0);
  check('width of one cell: the glyph only', f.textWidth('A', 12), 8);
  check('width of two cells', f.textWidth('AB', 12), 20);
  check('width with spacing', f.textWidth('AB', 12, 1), 22);

  const l = new VectorDisplayList();
  const next = f.draw(l, 10, 20, 'I', {size: 12, intensity: 10});
  check('I is three strokes', l.items.length, 3);
  check('stroke scaled and placed', l.items[1], {color: '#ffffff', fill: 'none', strokeWidth: 1.2, intensity: 10, opacity: 1, type: 'polyline', points: [14, 20, 14, 32]});
  check('next x after one cell', next, 22);
  l.clear();
  f.draw(l, 100, 0, 'AB', {size: 6, anchor: 'end'});
  check('anchor end: A starts at 100-10', l.items[0].points[0], 90);
  l.clear();
  f.draw(l, 100, 0, 'AB', {size: 6, anchor: 'middle'});
  check('anchor middle: A starts at 100-5', l.items[0].points[0], 95);
  l.clear();
  f.draw(l, 0, 0, '©', {size: 6});
  check('© is a stroke and a circle', l.items.map((i) => i.type), ['polyline', 'circle']);
  l.clear();
  f.draw(l, 0, 0, 'ř', {size: 6});
  check('unknown glyph draws a box', l.items[0].type, 'polygon');
  check('same markup for the same text', (() => { const a = new VectorDisplayList(), b = new VectorDisplayList(); f.draw(a, 3, 4, 'TEXT 12', {size: 9}); f.draw(b, 3, 4, 'TEXT 12', {size: 9}); return a.markup() === b.markup() && a.differences(b); })(), 0);
}

// --------------------------------------------- entities on the headless layout

{
  class Model extends AbstractModel {
    constructor(app) { super(app); this.id = 'CheckModel'; this.log = []; }
    init() {
      super.init();
      this.desktopEntity.bkColor = false;
      this.text = new VectorTextEntity(this.desktopEntity, 10, 20, 100, 12, '#00ff00', false, 'HI', {size: 12});
      this.desktopEntity.addEntity(this.text);
      this.menu = new VectorMenuEntity(this.desktopEntity, 0, 100, 200, 100, false, {size: 12, itemPitch: 20, t2Width: 60, selection: 1}, this, (self, key, row) => {
        switch (key) {
          case 'numberOfItems': return 3;
          case 't1': return 'ITEM '+row;
          case 't2': return row == 0 ? 'ON' : '';
          case 'event': return {id: 'chosen', row: row};
        }
        return '';
      });
      this.desktopEntity.addEntity(this.menu);
    }
    handleEvent(event) {
      if (super.handleEvent(event)) return true;
      if (event.id == 'chosen') { this.log.push(event.row); return true; }
      return false;
    }
  }
  const app = headlessVectorApp(new VectorPlatform({width: 400, height: 300, border: {minimal: 0, defaultColor: '#000000'}}), 800, 600, {});
  const model = new Model(app);
  app.model = model;
  model.init();
  model.resizeModel();
  check('fit: no border on a 4:3 element', [model.borderWidth, model.borderHeight], [0, 0]);
  check('fit: viewBox', app.layout.viewBox, {width: 400, height: 300});
  check('fit: ratio', app.layout.ratio, 2);
  check('pointer to model units', [app.layout.convertClientCoordinateX(400), app.layout.convertClientCoordinateY(150)], [200, 75]);

  const markup = app.layout.markup();
  check('frame starts with the border', markup.split('\n')[0], '<rect x="0" y="0" width="400" height="300" stroke="none" stroke-width="0" fill="#000000"/>');
  check('text placed at the entity', markup.split('\n')[1], '<polyline points="10,20 10,32" stroke="#00ff00" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
  check('text entity rebuilds on setText', (() => { const v = model.text.list.version; model.text.setText('HO'); return model.text.list.version > v; })(), true);
  check('entities draw on the content layer unless told otherwise', model.text.layer, 'content');
  check('text entity: align is the option, anchor its old name', [new VectorTextEntity(model.desktopEntity, 0, 0, 10, 5, false, false, 'A', {align: 'right'}).options.align, new VectorTextEntity(model.desktopEntity, 0, 0, 10, 5, false, false, 'A', {anchor: 'right'}).options.align], ['right', 'right']);
  check('text entity keeps version on same text', (() => { const v = model.text.list.version; model.text.setText('HO'); return model.text.list.version; })(), model.text.list.version);
  check('same frame twice: 0 differences', (() => { model.drawModel(); const a = app.layout.list; model.drawModel(); return a.differences(app.layout.list); })(), 0);

  check('menu: selection 1 bright, others dim', model.menu.menuEntities.map((row) => row[0].options.intensity), [9, 15, 9]);
  check('menu: cursor on row 1', model.menu.cursorEntity.y, 20);
  model.handleEvent({id: 'keyPress', key: 'ArrowDown'});
  check('menu: ArrowDown moves', [model.menu.selection, model.menu.cursorEntity.y], [2, 40]);
  model.handleEvent({id: 'keyPress', key: 'ArrowDown'});
  check('menu: stays on the last row', model.menu.selection, 2);
  model.handleEvent({id: 'keyPress', key: 'Enter'});
  check('menu: Enter sends the row event', model.log, [2]);
  model.drawModel();
  const rowAt = model.menu.rowAt({x: 50, y: 105});
  check('menu: row under a pointer', rowAt, 0);
  model.handleEvent({id: 'keyPress', key: 'Mouse1', x: 50, y: 105});
  model.handleEvent({id: 'keyRelease', key: 'Mouse1', x: 50, y: 105});
  check('menu: click selects and chooses', [model.menu.selection, model.log], [0, [2, 0]]);
  model.handleEvent({id: 'keyPress', key: 'Mouse1', x: 50, y: 105});
  model.handleEvent({id: 'keyRelease', key: 'Mouse1', x: 50, y: 145});
  check('menu: release elsewhere chooses nothing', model.log, [2, 0]);
  check('menu: value column', model.menu.menuEntities[0][1].text, 'ON');
  check('menu: one column leaves ArrowRight to the model', model.menu.handleEvent({id: 'keyPress', key: 'ArrowRight'}), false);

  // two columns by rows: 0 1 / 2 3 / 4
  const menu2 = new VectorMenuEntity(model.desktopEntity, 0, 200, 200, 60, false, {size: 12, itemPitch: 20, columns: 2, columnGap: 10}, model, (self, key, row) => {
    switch (key) {
      case 'numberOfItems': return 5;
      case 't1': return 'ITEM '+row;
      case 'event': return {id: 'chosen', row: row};
    }
    return '';
  });
  model.desktopEntity.addEntity(menu2);
  const at = () => [menu2.selection, menu2.cursorEntity.x, menu2.cursorEntity.y];
  const key = (k) => menu2.handleEvent({id: 'keyPress', key: k});
  check('columns: item width shares the width', menu2.options.itemWidth, 95);
  check('columns: laid out by rows', menu2.menuEntities.map((row) => [row[0].x, row[0].y]), [[12, 0], [117, 0], [12, 20], [117, 20], [12, 40]]);
  check('columns: ArrowRight moves within the row', [key('ArrowRight'), at()], [true, [1, 105, 0]]);
  check('columns: ArrowRight stops at the row end', [key('ArrowRight'), menu2.selection], [true, 1]);
  key('ArrowDown');
  check('columns: ArrowDown by a row', at(), [3, 105, 20]);
  key('ArrowDown');
  check('columns: ArrowDown to a shorter last row lands on its last item', at(), [4, 0, 40]);
  key('ArrowDown');
  check('columns: ArrowDown stops on the last row', menu2.selection, 4);
  key('GamepadUp');
  check('columns: up by a row', menu2.selection, 2);
  key('ArrowLeft');
  check('columns: ArrowLeft stops at the row start', menu2.selection, 2);
  model.drawModel();
  check('columns: item under a pointer in the second column', menu2.rowAt({x: 150, y: 225}), 3);
  check('headless SVG document', app.layout.toSVG().startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">\n<rect width="100%" height="100%" fill="#000000"/>'), true);
}

// ------------------------------------------------- the dialogs (BZ-M6)

{
  class Model extends AbstractModel {
    constructor(app) { super(app); this.id = 'DialogModel'; this.log = []; }
    init() { super.init(); this.desktopEntity.bkColor = false; }
    handleEvent(event) {
      if (super.handleEvent(event)) return true;
      if (['refreshMenu', 'go', 'contentClosed'].includes(event.id)) this.log.push(event.id);
      return true;
    }
  }
  const app = headlessVectorApp(new VectorPlatform({width: 800, height: 600, border: {minimal: 0, defaultColor: '#000000'}}), 800, 600, {playerName: 'AB'});
  // the dialogs close through queued events: a model loop or two delivers them
  const settle = () => { model.loopModel(1); model.loopModel(2); return model.desktopEntity.modalEntity == null; };
  const model = new Model(app);
  app.model = model;
  model.init();
  model.resizeModel();

  const name = new VectorNameEntity(model.desktopEntity, 80, 150, 640, 300, {maxLength: 5, continueEvent: {id: 'go'}});
  model.desktopEntity.addModalEntity(name);
  check('name: starts with the app\'s name', name.name, 'AB');
  model.handleEvent({id: 'keyPress', key: 'c'});
  model.handleEvent({id: 'keyPress', key: '1'});
  model.handleEvent({id: 'keyPress', key: '!'});
  check('name: letters and digits typed upper case, others not', name.name, 'ABC1');
  model.handleEvent({id: 'keyPress', key: 'Backspace'});
  check('name: Backspace', name.name, 'ABC');
  model.handleEvent({id: 'keyPress', key: 'd'});
  model.handleEvent({id: 'keyPress', key: 'e'});
  model.handleEvent({id: 'keyPress', key: 'f'});
  check('name: at most maxLength', name.name, 'ABCDE');
  check('name: the text entity follows', name.nameEntity.text, 'ABCDE');
  model.handleEvent({id: 'keyPress', key: 'Enter'});
  check('name: Enter keeps the name on the app', app.playerName, 'ABCDE');
  check('name: Enter sends refreshMenu and the continue event, then closes (contentClosed goes to the parent)', [settle(), model.log], [true, ['refreshMenu', 'go']]);
  const name2 = new VectorNameEntity(model.desktopEntity, 80, 150, 640, 300, {});
  model.desktopEntity.addModalEntity(name2);
  model.handleEvent({id: 'keyPress', key: 'x'});
  model.handleEvent({id: 'keyPress', key: 'Escape'});
  check('name: Escape keeps nothing', [settle(), app.playerName], [true, 'ABCDE']);

  model.log = [];
  const hof = new VectorHallOfFameEntity(model.desktopEntity, 80, 40, 640, 520, {rows: 3});
  model.desktopEntity.addModalEntity(hof);
  check('hall of fame: asks the server', app.fetched.map((f) => f.url), ['hallOfFame.db']);
  check('hall of fame: LOADING until then', hof.statusEntity.text, 'LOADING');
  hof.setData({url: 'hallOfFame.db', data: [{name: 'one', score: 30000}, {name: 'two', score: 20000}, {name: 'three', score: 10000}, {name: 'four', score: 5000}]});
  check('hall of fame: rows x 3 entities, at most `rows`', hof.rowEntities.length, 9);
  check('hall of fame: a row is place, name upper case, score', hof.rowEntities.slice(0, 3).map((e) => e.text), ['1.', 'ONE', '30000']);
  check('hall of fame: the best score on the app', app.hiScore, 30000);
  model.drawModel();
  check('hall of fame: drawn', app.layout.markup().split('\n').length > 60, true);
  model.handleEvent({id: 'keyPress', key: 'Escape'});
  check('hall of fame: Escape closes', [settle(), model.log], [true, []]);
  const hof2 = new VectorHallOfFameEntity(model.desktopEntity, 80, 40, 640, 520, {});
  model.desktopEntity.addModalEntity(hof2);
  hof2.errorData(new Error('down'));
  check('hall of fame: an error is the offline notice', [hof2.statusEntity.text, hof2.statusEntity2.text], ['SYSTEM OFFLINE', 'SCORES UNAVAILABLE']);
}

// -------------------------------------------------------------- Atari AVG

{
  // a little program: SCAL B=1, STAT 10 with the lower-left corner, move, STAT with the upper-right,
  // VCTR, SVEC, a subroutine, CNTR, HALT
  const words = [];
  const w = (v) => words.push(v & 0xFF, (v >> 8) & 0xFF);
  const vctr = (dx, dy, z) => { w(dy & 0x1FFF); w((z << 13) | (dx & 0x1FFF)); };
  w(0x7100);                                  // SCAL B=1 L=0
  w(0x6000 | (10 << 4));                      // STAT Z=10, E=0, H=0: lower left corner at (0,0)
  vctr(100, 50, 0);                           // move dark to (100, 50)
  w(0x6200 | (12 << 4));                      // STAT Z=12, H=1: upper right corner at (100, 50)
  vctr(-100, -50, 1);                         // draw back to (0,0) with the STAT intensity 12
  vctr(200, 0, 3);                            // draw to (200, 0): clipped at x=100, intensity 6
  w(0x4000 | (2 << 5) | ((-4 >> 1) & 0x1F) | (((6 >> 1) & 0x1F) << 8));   // SVEC dx=-4 dy=+6 ZZZ=2
  w(0xA000 | (0x40 >> 1));                    // JSRL 0x40
  w(0x8040);                                  // CNTR
  vctr(10, 10, 7);                            // dot-ish line from the centre, intensity 14
  w(0x2000);                                  // HALT
  while (words.length < 0x40) words.push(0);
  w(0x6400 | (5 << 4));                       // STAT Z=5, E=1: intensity only, window kept
  vctr(0, -20, 1);                            // draw down 20 at intensity 5
  w(0xC000);                                  // RTSL
  const mem = new Uint8Array(0x2000);
  mem.set(words);
  const a = new AVG(mem);
  a.run(0);
  check('avg halts', a.halted, true);
  check('avg window from the two STATs', a.window, {left: 0, bottom: 0, right: 100, top: 50});
  // the beam moves the whole vector even where the drawing is clipped: after
  // VCTR 200 it stands at (200,0), so the SVEC and the subroutine draw outside
  check('avg segments', a.segments.map((s) => [s.x1, s.y1, s.x2, s.y2, s.intensity]), [
    [100, 50, 0, 0, 12],                      // ZZZ=1: the STAT intensity
    [0, 0, 100, 0, 6],                        // ZZZ=3 -> 6, clipped at the window's right edge
    [0, 0, 10, 10, 14]                        // after CNTR, ZZZ=7 -> 14
  ]);
  check('avg beam after the run', [a.x, a.y], [10, 10]);
  check('avg stack empty after RTSL', a.stack.length, 0);

  const b = new AVG(mem);
  b.scaleB = 2;                               // SCAL in the program overrides it
  b.run(0);
  check('avg SCAL in the program', b.segments[0], a.segments[0]);

  // SVEC alone, window open: 5-bit halves doubled, ZZZ=2 -> 4; a STAT with E=1 keeps the window
  const mem2 = new Uint8Array(0x2000);
  mem2.set([0x50, 0x64, 0x5E, 0x43, 0x00, 0x20]);   // STAT Z=5 E=1; SVEC dx=-4 dy=+6 ZZZ=2; HALT
  const c = new AVG(mem2);
  c.run(0);
  check('avg SVEC', c.segments.map((s) => [s.x1, s.y1, s.x2, s.y2, s.intensity]), [[0, 0, -4, 6, 4]]);
  check('avg STAT E=1 keeps the window open', c.window.right, Infinity);
  const list = new VectorDisplayList();
  AVG.appendTo(list, [{x1: -10, y1: 20, x2: 10, y2: -20, intensity: 8}], 512, 384);
  check('avg appendTo flips y around the centre', [list.items[0].x1, list.items[0].y1, list.items[0].x2, list.items[0].y2, list.items[0].intensity], [502, 364, 522, 404, 8]);
  AVG.appendTo(list, [{x1: 3, y1: 340, x2: 3, y2: 340, intensity: 14}], 512, 384, {strokeWidth: 1.5});
  check('avg appendTo: a dot is a short line 2.5 x as wide', [list.items[1].x1, list.items[1].x2, list.items[1].y1, list.items[1].strokeWidth], [515, 515.01, 44, 3.75]);
  AVG.appendTo(list, [{x1: 0, y1: 0, x2: 0, y2: 0, intensity: 14}], 0, 0, {strokeWidth: 1.5, dotWidth: 5});
  check('avg appendTo: dotWidth given', [list.items[2].strokeWidth, 'dotWidth' in list.items[2]], [5, false]);
  check('avg clip: outside', AVG.clip(200, 200, 300, 300, {left: 0, bottom: 0, right: 100, top: 100}), false);
  check('avg clip: crossing', AVG.clip(-50, 50, 150, 50, {left: 0, bottom: 0, right: 100, top: 100}), {x1: 0, y1: 50, x2: 100, y2: 50});
  check('avg signed13', [AVG.signed13(0x1FFF), AVG.signed13(0x1000), AVG.signed13(0x0FFF)], [-1, -4096, 4095]);
  check('avg signed5', [AVG.signed5(0x1F), AVG.signed5(0x10), AVG.signed5(0x0F)], [-1, -16, 15]);
}

// -------------------------------------------------------------- Atari DVG

{
  // the words of the ROM as McFadden's DVG disassembler reads them (asteroids notes 2.2, 2.4)
  check('dvg decode LABS 0,128 sc=0', DVG.decode(0xA080, 0x0000), {op: 'LABS', words: 2, x: 0, y: 128, scale: 0});
  check('dvg decode VCTR +1023,+0 T=9 Z=7', DVG.decode(0x9000, 0x73FF), {op: 'VCTR', words: 2, t: 9, dx: 1023, dy: 0, z: 7});
  check('dvg decode VCTR -1023,+0', DVG.decode(0x9000, 0x77FF).dx, -1023);
  check('dvg decode VCTR +0,-767', DVG.decode(0x96FF, 0x7000).dy, -767);
  check('dvg decode VCTR 256,-256 as 512,-512 at T=8', DVG.decode(0x8600, 0x7200), {op: 'VCTR', words: 2, t: 8, dx: 512, dy: -512, z: 7});
  check('dvg decode SVEC 24,0 Z=13 (VECMAC x8 form)', DVG.decode(0xF0DB), {op: 'SVEC', words: 1, t: 4, dx: 768, dy: 0, z: 13});
  check('dvg decode SVEC 0,4 Z=0 (x4 form)', DVG.decode(0xF900), {op: 'SVEC', words: 1, t: 3, dx: 0, dy: 256, z: 0});
  check('dvg decode SVEC -24,-16 (ship, x8 form)', DVG.decode(0xF60F), {op: 'SVEC', words: 1, t: 4, dx: -768, dy: -512, z: 0});
  check('dvg decode SVEC 0,32 Z=12 (x16 form)', DVG.decode(0xFAC8), {op: 'SVEC', words: 1, t: 5, dx: 0, dy: 512, z: 12});
  check('dvg decode HALT, RTSL', [DVG.decode(0xB000).op, DVG.decode(0xD000).op], ['HALT', 'RTSL']);
  check('dvg decode JSRL, JMPL word addresses', [DVG.decode(0xC8F3), DVG.decode(0xE201)], [{op: 'JSRL', words: 1, address: 0x8F3}, {op: 'JMPL', words: 1, address: 0x201}]);

  // the rate multipliers: the closed form against the 7497 pair as MAME steps it (avgdvg.cpp handler_2)
  const brm = (mag, s) => {
    if (s >= 10) return 0;
    const mx = (mag << 2) & 0xFFF;
    let c = 0, n = 0;
    for (let k = 0; k < (1 << (s+1)); k++) {
      let count = 0;
      for (let bit = 0; bit < 12; bit++) {
        if ((c & ((1 << (bit+1))-1)) == ((1 << bit)-1) && (mx & (1 << (11-bit)))) count = 1;
      }
      c = (c+1) & 0xFFF;
      n += count;
    }
    return n;
  };
  let brmDiffs = 0;
  for (let s = 0; s <= 10; s++) {
    for (let mag = 0; mag < 1024; mag += (s < 7 ? 1 : 7)) {
      if (brm(mag, s) != DVG.pulses(mag, s)) brmDiffs++;
    }
  }
  check('dvg pulses = the 7497 pair (all scales, sampled magnitudes)', brmDiffs, 0);
  check('dvg pulses: T=9 is 1:1, S=F halves rounding half up, S=E quarters', [DVG.pulses(1023, 9), DVG.pulses(3, 8), DVG.pulses(2, 8), DVG.pulses(768, 7), DVG.pulses(3, 7)], [1023, 2, 1, 192, 1]);
  check('dvg pulses: nothing from scale 10 on', DVG.pulses(1023, 10), 0);

  // a program: LABS, a vector off the right edge (clipped at 1023), a dot, a subroutine at scale F, HALT
  const words = [];
  const w = (v) => words.push(v & 0xFF, (v >> 8) & 0xFF);
  const vctr = (dx, dy, t, z) => { w((t << 12) | (dy < 0 ? 0x400 : 0) | Math.abs(dy)); w((z << 12) | (dx < 0 ? 0x400 : 0) | Math.abs(dx)); };
  w(0xA000 | 500); w(0x0000 | 1000);          // LABS 1000,500 scale 0
  w(0x7000); w(0x0000);                        // WAIT 7
  vctr(100, 0, 9, 7);                          // 1000 -> 1100: drawn to 1023
  vctr(0, 0, 7, 15);                           // a dot at (1100, 500): outside, nothing
  w(0xA000 | 600); w(0xF000 | 100);            // LABS 100,600 scale F (x1/2)
  vctr(0, 0, 7, 15);                           // a dot
  w(0xC000 | 0x40);                            // JSRL word $40
  vctr(3, 0, 9, 1);                            // at S=F: 3/2 -> 2
  w(0xB000);                                   // HALT
  while (words.length < 0x80) words.push(0);
  w(0xF000 | (12 << 4) | 2);                   // SVEC dx=2 (x2), dy=0, Z=12: 4 units, halved by S=F -> 2
  w(0xD000);                                   // RTSL
  const mem = new Uint8Array(0x2000);
  mem.set(words);
  const d = new DVG(mem);
  d.run(0);
  check('dvg halts', d.halted, true);
  check('dvg segments', d.segments.map((s) => [s.x1, s.y1, s.x2, s.y2, s.intensity]), [
    [1000, 500, 1023, 500, 7],                 // clipped at the edge
    [100, 600, 100, 600, 15],                  // the dot
    [100, 600, 102, 600, 12],                  // the SVEC in the subroutine, halved
    [102, 600, 104, 600, 1]                    // 3 at S=F rounds up to 2
  ]);
  check('dvg beam after the run: the clipped vector still moved it', [d.x, d.y, d.scale], [104, 600, 0xF]);
  check('dvg stack empty', d.stack.length, 0);
  const sub = new DVG(mem);
  sub.run(0x80);
  check('dvg subroutine on its own ends at RTSL', [sub.halted, sub.segments.length, sub.steps], [false, 1, 2]);

  // draw(): a shape as data at a place and a scale, and mirrored (the ship of Asteroids)
  const ship = [{op: 'SVEC', t: 4, dx: -768, dy: -512, z: 0}, {op: 'SVEC', t: 5, dx: 0, dy: 512, z: 12}, {op: 'VCTR', t: 6, dx: 768, dy: -256, z: 12}, {op: 'RTSL'}];
  const e = new DVG();
  e.labs(512, 512, 0xE);
  e.draw(ship);
  check('dvg draw at x1/4', e.segments.map((s) => [s.x1, s.y1, s.x2, s.y2, s.intensity]), [[506, 508, 506, 516, 12], [506, 516, 530, 508, 12]]);
  const m = new DVG();
  m.labs(512, 512, 0xE);
  m.draw(ship.map((i) => i.op == 'SVEC' || i.op == 'VCTR' ? Object.assign({}, i, {dx: -i.dx}) : i));
  check('dvg draw mirrored in x', m.segments.map((s) => [s.x1, s.x2]), [[518, 518], [518, 494]]);
  check('dvg draw stops at RTSL', e.draw([{op: 'RTSL'}, {op: 'VCTR', t: 9, dx: 10, dy: 0, z: 7}]).segments.length, 2);

  const list = new VectorDisplayList();
  DVG.appendTo(list, [{x1: 0, y1: 895, x2: 1023, y2: 128, intensity: 7}], 895, {strokeWidth: 1.5});
  check('dvg appendTo flips y around the top', [list.items[0].x1, list.items[0].y1, list.items[0].x2, list.items[0].y2, list.items[0].intensity], [0, 0, 1023, 767, 7]);
}

// ------------------------------------------------------------ math box

{
  // the semantics of mathbox.cpp: a 1.15 cosine of 1 gives half the value, the divide of N = 10 is 1024·hi/divisor
  const m = new MathBox();
  m.setDivideSteps(10);
  check('mathbox int16', [MathBox.int16(0x8000), MathBox.int16(0x7FFF), MathBox.int16(-0x8001)], [-32768, 32767, 32767]);
  m.setView(0x7FFF, 0, 0, 0);
  check('mathbox $0B: cos 1 halves', m.rotatePoint(16384, 0), {z: 8191, x: 0});
  check('mathbox $0B/$12 45 degrees', m.rotatePoint(8192, 8192), {z: 4095, x: 4095});
  m.setView(0x5A82, -0x5A82, 0, 0);                  // heading 45 degrees to the left: an object 45 left is straight ahead
  check('mathbox rotate 45', m.rotatePoint(8192, 8192), {z: 5792, x: 0});
  m.setView(0x7FFF, 0, 1000, -500);                  // the viewer's position is subtracted first
  check('mathbox $0B subtracts the viewer', m.rotatePoint(3000, 500), {z: 999, x: 499});
  check('mathbox ratio 1024*1000/4000', m.ratio(1000, 0, 4000), 256);
  check('mathbox ratio negative (the microcode truncates towards zero minus one)', m.ratio(-1000, 0, 4000), -255);
  check('mathbox distance octagonal 4000,3000', m.distance(0, 0, 4000, 3000), 4000+1125);
  check('mathbox distance |dx| = $8000 stays negative (the 2901 too)', m.distance(0, 0, 100, -32768) < 0, true);
  check('mathbox length 5845,1617', m.length(5845, 1617), 6451);
  m.setModel(-0x7FFF, 0, 4096, 0);                   // theta = 0: the object faces the viewer (-cos = -1, sin = 0), at Z 4096 straight ahead
  const v = m.projectVertex(0, 1024, 320);           // the object's own left (512, stored doubled), 320 up: on our right
  check('mathbox project X = 1024*512/4096, mirrored', v.x, 128);
  check('mathbox project Y = 1024*320/4096', v.y, 80);
  check('mathbox project vertex view Z', v.z, 4096);
  const w = m.projectVertex(2048, 0, 0);             // a vertex 1024 ahead of the object with -cos: nearer by 1024
  check('mathbox project rotated Z', w.z, 4096-1024);
  const b = m.radarBlip(0x7FFF, 0, 0, 316, 100);     // the enemy 90 degrees left at distance 100: the blip 49 right? no: x = sin*d >> 16
  check('mathbox radar blip', b, {x: 49, y: 316});
  const raw = new MathBox();
  raw.go(0x0C, 10);
  raw.go(0x15, 0xE8); raw.go(0x16, 0x03);            // R7 = 1000
  raw.go(0x0D, 0); raw.go(0x0E, 0);
  raw.go(0x0F, 0x00); raw.go(0x10, 0x01);            // RB = 256
  raw.go(0x14, 0);
  check('mathbox raw port writes', raw.result, Math.floor(256*65536/1000) >> 6);
}

console.log(`checkvector: ${checks} checks, ${differences} differences`);
process.exit(differences);
