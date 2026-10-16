const { VectorEntity } = await import('./vectorEntity.js?ver='+window.srcVersion);
const { VectorTextEntity } = await import('./vectorTextEntity.js?ver='+window.srcVersion);
const { VectorFont } = await import('./vectorFont.js?ver='+window.srcVersion);
const { Tool } = await import('../../tool.js?ver='+window.srcVersion);
// begin code

/**
 * The volume dialog of the vector platform — what `ZXVolumeEntity` is to the
 * canvas 2D games: a modal box with a slider of eleven steps for the user
 * level of an audio bus, kept in `app.audioManager.volume[bus]` and in a
 * cookie, with a sample sound to judge it by. Drawn as lines: the frame
 * twice like a vector menu's brackets, the slider with its ticks, a
 * triangle for the cursor, the level as text; no filled area but the
 * opaque background of the box (`bkColor`, black unless told otherwise —
 * the menu screens may have one, a game never).
 *
 * Keys: left/right (also `-`/`+`, the gamepad's cross) move the level,
 * Enter (OK) plays the sample, Escape (Exit) closes. A click or a tap on
 * the slider sets the level, on the PLAY SAMPLE line plays, on the CLOSE
 * line closes. Playing the sample opens the sample's bus (`options.
 * sampleBus`, the volume's bus unless told otherwise) and the manager's
 * `refreshVolume(bus)`, when it has one, follows every change while the
 * bus is open; closing closes the bus again (R-024: the menu is silent) and
 * sends `refreshMenu` to the model, so a menu showing the level updates.
 *
 * The layout is made for 640 x 300 and scales with the width; a height
 * under 260 crowds it.
 */
export class VectorVolumeEntity extends VectorEntity {

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {string} bus - The volume key in `audioManager.volume` (and the bus, unless `options.sampleBus`).
   * @param {string} cookie - The cookie the level is kept in.
   * @param {string} sampleSound - The sound played as the sample.
   * @param {Object} [options] - `title` (BUS VOLUME by default), `color`, `bkColor` (black; false for none), `font` (the app's `fonts.vector`), `sampleBus`.
   */
  constructor(parentEntity, x, y, width, height, bus, cookie, sampleSound, options) {
    var o = Object.assign({title: false, color: '#ffffff', bkColor: '#000000', font: false, sampleBus: bus}, options || {});
    super(parentEntity, x, y, width, height, o.color, o.bkColor);
    this.id = 'VectorVolumeEntity';
    this.options = o;
    this.bus = bus;
    this.cookie = cookie;
    this.sampleSound = sampleSound;
    this.title = o.title === false ? bus.toUpperCase()+' VOLUME' : o.title;
    this.clipsList = false;
    this.levelEntity = null;
    // the slider: eleven positions across the middle of the box
    this.slider = {x: Math.round(width*0.125), width: Math.round(width*0.75), y: 150, band: [120, 200]};
    this.sampleBand = [204, 244];
    this.closeBand = [height-60, height];
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
   * The level as it stands, 0..10.
   * @returns {number}
   */
  level() {
    var v = this.app.audioManager ? this.app.audioManager.volume[this.bus] : 0;
    return Math.min(10, Math.max(0, Math.round(Number(v) || 0)));
  } // level

  /**
   * Builds the box, the title, the level text, the sample prompt and the hint.
   */
  init() {
    super.init();
    var w = this.width, h = this.height, font = this.font(), c = this.penColor;
    this.drawBox();
    this.addEntity(new VectorTextEntity(this, 0, 14, w, 30, c, false, this.title, {font: font, size: 30, align: 'center'}));
    this.levelEntity = new VectorTextEntity(this, 0, 78, w, 26, c, false, VectorVolumeEntity.levelText(this.level()), {font: font, size: 26, align: 'center', intensity: 12});
    this.addEntity(this.levelEntity);
    this.addEntity(new VectorTextEntity(this, 0, this.sampleBand[0]+8, w, 22, c, false, 'ENTER = PLAY SAMPLE', {font: font, size: 22, align: 'center', intensity: 12}));
    this.addEntity(new VectorTextEntity(this, 0, h-44, w, 18, c, false, 'LEFT RIGHT = LEVEL   ESC = CLOSE', {font: font, size: 18, align: 'center', intensity: 9}));
  } // init

  /**
   * The level as the menu shows it.
   * @param {number} level - 0..10
   * @returns {string}
   */
  static levelText(level) {
    if (level <= 0) {
      return 'OFF';
    }
    if (level >= 10) {
      return 'MAX';
    }
    return (level*10)+'%';
  } // levelText

  /**
   * The frame, the slider with its ticks and the cursor at the level.
   */
  drawBox() {
    var l = this.list, w = this.width, h = this.height, s = this.slider;
    l.clear();
    l.rect(0, 0, w, h, {strokeWidth: 3});
    l.rect(6, 6, w-12, h-12, {strokeWidth: 1.5, intensity: 8});
    l.line(6, 56, w-6, 56, {strokeWidth: 1.5, intensity: 8});
    l.line(s.x, s.y, s.x+s.width, s.y, {strokeWidth: 2, intensity: 12});
    var pitch = s.width/10;
    for (var i = 0; i <= 10; i++) {
      var x = s.x+i*pitch;
      var tick = (i % 5 == 0) ? 12 : 7;
      l.line(x, s.y-tick, x, s.y+tick, {strokeWidth: 1.5, intensity: 10});
    }
    var cx = s.x+this.level()*pitch;
    l.polygon([cx, s.y-6, cx-12, s.y-28, cx+12, s.y-28], {strokeWidth: 2, intensity: 15});
    l.polygon([cx, s.y+6, cx-12, s.y+28, cx+12, s.y+28], {strokeWidth: 2, intensity: 15});
  } // drawBox

  /**
   * Sets the level: clamped, kept in the manager and the cookie, drawn, and
   * applied to the sample's bus when it is open.
   * @param {number} level - 0..10
   */
  changeVolume(level) {
    level = Math.min(10, Math.max(0, Math.round(level)));
    var manager = this.app.audioManager;
    if (!manager) {
      return;
    }
    manager.volume[this.bus] = level;
    Tool.writeCookie(this.cookie, level);
    this.levelEntity.setText(VectorVolumeEntity.levelText(level));
    this.drawBox();
    if (typeof manager.refreshVolume === 'function') {
      manager.refreshVolume(this.options.sampleBus);
    }
  } // changeVolume

  /**
   * Plays the sample: opens its bus and sends the sound.
   */
  playSample() {
    this.sendEvent(0, 0, {id: 'openAudioBus', bus: this.options.sampleBus, options: {}});
    this.sendEvent(0, 0, {id: 'playSound', bus: this.options.sampleBus, sound: this.sampleSound, options: false});
  } // playSample

  /**
   * Closes the dialog: the sample's bus goes with it, the menu is told.
   */
  close() {
    this.sendEvent(0, 0, {id: 'closeAudioBus', bus: this.options.sampleBus});
    this.sendEvent(0, 0, {id: 'refreshMenu'});
    this.destroy();
    this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
  } // close

  /**
   * Which band of the box a pointer event falls into.
   * @param {Object} event - With x, y in the layout's units (the border included), as the pointer events come.
   * @returns {string|false} 'slider', 'sample', 'close' or false.
   */
  bandAt(event) {
    // parentY + y is the box's top in the same units (pointOnEntity's rule); absoluteY() would leave the border out
    var y = event.y-(this.parentY+this.y);
    if (y >= this.slider.band[0] && y < this.slider.band[1]) {
      return 'slider';
    }
    if (y >= this.sampleBand[0] && y < this.sampleBand[1]) {
      return 'sample';
    }
    if (y >= this.closeBand[0] && y < this.closeBand[1]) {
      return 'close';
    }
    return false;
  } // bandAt

  /**
   * A pointer on the slider: the nearest position.
   * @param {Object} event - With x in the layout's units, as the pointer events come.
   */
  pointerLevel(event) {
    var x = event.x-(this.parentX+this.x)-this.slider.x;
    this.changeVolume(x/(this.slider.width/10));
  } // pointerLevel

  /**
   * Handles the keys (Left/Right or -/+ change the level, Enter plays the
   * sample, Escape closes), gamepad, mouse and touch on the slider; the
   * dialog is modal.
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
          case 'ArrowLeft':
          case '-':
          case 'GamepadLeft':
            this.changeVolume(this.level()-1);
            return true;
          case 'ArrowRight':
          case '+':
          case 'GamepadRight':
            this.changeVolume(this.level()+1);
            return true;
          case 'Enter':
          case 'GamepadOK':
            this.playSample();
            return true;
          case 'Escape':
          case 'GamepadExit':
            this.close();
            return true;
          case 'Mouse1':
          case 'Touch':
            switch (this.bandAt(event)) {
              case 'slider':
                this.pointerLevel(event);
                if (event.key == 'Touch') {
                  this.app.inputEventsManager.touchesMap[event.identifier] = this;
                }
                return true;
              case 'sample':
                this.playSample();
                return true;
              case 'close':
                this.close();
                return true;
            }
            return true;
        }
        // any other key is swallowed: the dialog is modal
        return true;
      case 'keyMove':
        if (event.key == 'Touch' && this.app.inputEventsManager.touchesMap[event.identifier] === this) {
          this.pointerLevel(event);
        }
        return true;
      case 'keyRelease':
      case 'mouseHover':
        return true;
      case 'errorAudioBus':
        this.levelEntity.setText(String(event.error).toUpperCase().substring(0, 40));
        return true;
    }
    return false;
  } // handleEvent

} // VectorVolumeEntity
