const { VectorEntity } = await import('./vectorEntity.js?ver='+window.srcVersion);
const { VectorTextEntity } = await import('./vectorTextEntity.js?ver='+window.srcVersion);
const { VectorFont } = await import('./vectorFont.js?ver='+window.srcVersion);
// begin code

/**
 * The hall of fame of the vector platform — what `HallOfFameEntity` is to
 * the canvas 2D games: a modal box that asks the server (`url`, by default
 * `hallOfFame.db`, the same contract as Manic Miner's: an array of
 * `{name, score}` from best down) and lists the rows — the place, the name,
 * the score — as lines of the vector font; LOADING until the answer comes,
 * SYSTEM OFFLINE - SCORES UNAVAILABLE when there is none. The best score
 * is kept in `app.hiScore`. Enter, Escape (OK, Exit), a click or a tap
 * close it; closing sends `contentClosed` to the parent.
 *
 * The layout is made for 640 x 500: the rows from 72 down every 34.
 */
export class VectorHallOfFameEntity extends VectorEntity {

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {Object} [options] - `title` (HALL OF FAME), `url` (hallOfFame.db), `rows` (10), `color`, `bkColor`
   *   (black; false for none), `font`, `hint`.
   */
  constructor(parentEntity, x, y, width, height, options) {
    var o = Object.assign({
      title: 'HALL OF FAME', url: 'hallOfFame.db', rows: 10, color: '#ffffff', bkColor: '#000000', font: false, hint: 'PRESS ENTER'
    }, options || {});
    super(parentEntity, x, y, width, height, o.color, o.bkColor);
    this.id = 'VectorHallOfFameEntity';
    this.options = o;
    this.clipsList = false;
    this.rowEntities = [];
    this.statusEntity = null;               // the line in the middle: LOADING, or why there are no rows
    this.statusEntity2 = null;              // its second line
    this.rowBand = {y: 72, pitch: 34, size: 22};
  } // constructor

  /**
   * The font of the texts: the option, else the application's vector font,
   * else the built-in one.
   * @returns {VectorFont}
   */
  font() {
    if (this.options.font) {
      return this.options.font;
    }
    if (this.app.fonts && this.app.fonts.vector) {
      return this.app.fonts.vector;
    }
    return VectorFont.simple();
  } // font

  /**
   * Builds the frame, the title, the two status lines and the hint; the
   * rows come with `setData`.
   */
  init() {
    super.init();
    var w = this.width, h = this.height, font = this.font(), c = this.penColor;
    this.list.rect(0, 0, w, h, {strokeWidth: 3});
    this.list.rect(6, 6, w-12, h-12, {strokeWidth: 1.5, intensity: 8});
    this.list.line(6, 56, w-6, 56, {strokeWidth: 1.5, intensity: 8});
    this.addEntity(new VectorTextEntity(this, 0, 14, w, 30, c, false, this.options.title, {font: font, size: 30, align: 'center'}));
    this.statusEntity = new VectorTextEntity(this, 0, h/2-28, w, 22, c, false, 'LOADING', {font: font, size: 22, align: 'center', intensity: 9});
    this.addEntity(this.statusEntity);
    this.statusEntity2 = new VectorTextEntity(this, 0, h/2+6, w, 22, c, false, '', {font: font, size: 22, align: 'center', intensity: 9});
    this.addEntity(this.statusEntity2);
    this.addEntity(new VectorTextEntity(this, 0, h-44, w, 18, c, false, this.options.hint, {font: font, size: 18, align: 'center', intensity: 9}));

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.showOfflineNotice();
    } else {
      this.fetchData(this.options.url, false, {});
    }
  } // init

  /**
   * The rows from the server.
   * @param {Object} data - `{data: [{name, score}, ...]}`.
   */
  setData(data) {
    var rows = Array.isArray(data.data) ? data.data : Object.keys(data.data || {}).map((k) => data.data[k]);
    this.statusEntity.setText(rows.length ? '' : 'NO SCORES YET');
    var w = this.width, font = this.font(), c = this.penColor, b = this.rowBand;
    rows.slice(0, this.options.rows).forEach((row, i) => {
      var y = b.y+i*b.pitch;
      var place = new VectorTextEntity(this, 24, y, 64, b.size, c, false, (i+1)+'.', {font: font, size: b.size, align: 'right', intensity: 10});
      var name = new VectorTextEntity(this, 104, y, w-104-200, b.size, c, false, String(row.name || '').toUpperCase().substring(0, 16), {font: font, size: b.size, intensity: 13});
      var score = new VectorTextEntity(this, w-24-176, y, 176, b.size, c, false, String(row.score), {font: font, size: b.size, align: 'right', intensity: 13});
      this.addEntity(place);
      this.addEntity(name);
      this.addEntity(score);
      this.rowEntities.push(place, name, score);
    });
    if (rows.length && this.app) {
      this.app.hiScore = rows[0].score;
    }
  } // setData

  /**
   * The failure callback of `fetchData`: shows the offline notice.
   * @param {*} error - The failure, unused beyond triggering the notice.
   */
  errorData(error) {
    this.showOfflineNotice();
  } // errorData

  /**
   * Replaces the status lines with SYSTEM OFFLINE / SCORES UNAVAILABLE.
   */
  showOfflineNotice() {
    this.statusEntity.setText('SYSTEM OFFLINE');
    this.statusEntity2.setText('SCORES UNAVAILABLE');
  } // showOfflineNotice

  /**
   * Closes the table and tells the parent (`contentClosed`).
   */
  close() {
    this.destroy();
    this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
  } // close

  /**
   * Handles keys, gamepad, mouse and touch; the dialog is modal, so
   * any other key is swallowed.
   * @param {Object} event
   * @returns {boolean} True when the event was consumed.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }
    switch (event.id) {
      case 'keyPress':
        switch (event.key) {
          case 'Enter':
          case ' ':
          case 'Escape':
          case 'GamepadOK':
          case 'GamepadExit':
          case 'Mouse1':
          case 'Touch':
            this.close();
            return true;
        }
        // any other key is swallowed: the dialog is modal
        return true;
      case 'keyRelease':
      case 'mouseHover':
        return true;
    }
    return false;
  } // handleEvent

} // VectorHallOfFameEntity
