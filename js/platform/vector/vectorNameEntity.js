const { VectorEntity } = await import('./vectorEntity.js?ver='+window.srcVersion);
const { VectorTextEntity } = await import('./vectorTextEntity.js?ver='+window.srcVersion);
const { VectorFont } = await import('./vectorFont.js?ver='+window.srcVersion);
const { Tool } = await import('../../tool.js?ver='+window.srcVersion);
// begin code

/**
 * The player's name dialog of the vector platform — what `ZXPlayerNameEntity`
 * is to the canvas 2D games, without the on-screen keyboard (the vector
 * games have no touch keyboard yet): a modal box with a title, a prompt,
 * the name as it is typed with a cursor after it, and a hint line. Drawn
 * as lines like the volume dialog; the box is opaque (`bkColor`, black
 * unless told otherwise, false for none).
 *
 * Keys: letters, digits, space and `-` are typed (upper case, up to
 * `maxLength`), Backspace deletes, Enter (OK, a click or a tap) keeps the
 * name — in `app[property]` and the cookie — and closes, Escape (Exit)
 * closes without a change. An empty name is kept as well: a game may treat
 * it as "no name" (Battlezone then asks for the initials the way the
 * machine does). Closing sends `refreshMenu` to the model, so a menu row
 * showing the name updates, and `continueEvent` when one is given and the
 * name was kept (a menu that asks for the name before the game starts).
 *
 * The layout is made for 640 x 300 and scales with the width.
 */
export class VectorNameEntity extends VectorEntity {

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {Object} [options] - `title` (PLAYER NAME), `prompt` (ENTER YOUR NAME), `property` (`playerName`
   *   on the app), `cookie` (the same name), `maxLength` (12), `color`, `bkColor`, `font`, `continueEvent`,
   *   `hint`.
   */
  constructor(parentEntity, x, y, width, height, options) {
    var o = Object.assign({
      title: 'PLAYER NAME', prompt: 'ENTER YOUR NAME', property: 'playerName', cookie: 'playerName', maxLength: 12,
      color: '#ffffff', bkColor: '#000000', font: false, continueEvent: false, hint: 'ENTER = OK   ESC = CANCEL'
    }, options || {});
    super(parentEntity, x, y, width, height, o.color, o.bkColor);
    this.id = 'VectorNameEntity';
    this.options = o;
    this.clipsList = false;
    this.name = String(this.app[o.property] || '').substring(0, o.maxLength);
    this.nameEntity = null;
    this.nameBand = {y: 130, size: 34};
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
   * Builds the title, the prompt, the name being typed, the hint and the box.
   */
  init() {
    super.init();
    var w = this.width, h = this.height, font = this.font(), c = this.penColor;
    this.addEntity(new VectorTextEntity(this, 0, 14, w, 30, c, false, this.options.title, {font: font, size: 30, align: 'center'}));
    this.addEntity(new VectorTextEntity(this, 0, 78, w, 22, c, false, this.options.prompt, {font: font, size: 22, align: 'center', intensity: 12}));
    this.nameEntity = new VectorTextEntity(this, 0, this.nameBand.y, w, this.nameBand.size, c, false, this.name, {font: font, size: this.nameBand.size, align: 'center', intensity: 15});
    this.addEntity(this.nameEntity);
    this.addEntity(new VectorTextEntity(this, 0, h-44, w, 18, c, false, this.options.hint, {font: font, size: 18, align: 'center', intensity: 9}));
    this.drawBox();
  } // init

  /**
   * The frame and the cursor: a short line under the cell after the name.
   */
  drawBox() {
    var l = this.list, w = this.width, h = this.height;
    l.clear();
    l.rect(0, 0, w, h, {strokeWidth: 3});
    l.rect(6, 6, w-12, h-12, {strokeWidth: 1.5, intensity: 8});
    l.line(6, 56, w-6, 56, {strokeWidth: 1.5, intensity: 8});
    var size = this.nameBand.size;
    var x = w/2+(this.nameEntity ? this.nameEntity.textWidth()/2 : 0)+size/6;
    var y = this.nameBand.y+size+3;
    l.line(x, y, x+size*2/3, y, {strokeWidth: 2, intensity: 12});
  } // drawBox

  /**
   * Sets the name as typed so far.
   * @param {string} name
   */
  setName(name) {
    this.name = name;
    this.nameEntity.setText(name);
    this.drawBox();
  } // setName

  /**
   * Keeps the name and closes.
   */
  ok() {
    this.app[this.options.property] = this.name;
    if (typeof document !== 'undefined') {
      Tool.writeCookie(this.options.cookie, this.name);       // not under Node (the tools)
    }
    this.sendEvent(0, 0, {id: 'refreshMenu'});
    if (this.options.continueEvent) {
      this.sendEvent(0, 0, this.options.continueEvent);
    }
    this.close();
  } // ok

  /**
   * Closes the dialog without a name and tells the parent (`contentClosed`).
   */
  close() {
    this.destroy();
    this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
  } // close

  /**
   * Handles the keys (letters, digits, space and dash typed into the name,
   * Backspace, Enter/OK, Escape), gamepad, mouse and touch; the dialog is
   * modal.
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
          case 'GamepadOK':
          case 'Mouse1':
          case 'Touch':
            this.ok();
            return true;
          case 'Escape':
          case 'GamepadExit':
            this.close();
            return true;
          case 'Backspace':
            if (this.name.length) {
              this.setName(this.name.substring(0, this.name.length-1));
            }
            return true;
        }
        if (event.key.length == 1) {
          var ch = event.key.toUpperCase();
          if (/[A-Z0-9 \-]/.test(ch) && this.name.length < this.options.maxLength && !(ch == ' ' && this.name.length == 0)) {
            this.setName(this.name+ch);
          }
        }
        // any other key is swallowed: the dialog is modal
        return true;
      case 'keyRelease':
      case 'mouseHover':
        return true;
    }
    return false;
  } // handleEvent

} // VectorNameEntity
