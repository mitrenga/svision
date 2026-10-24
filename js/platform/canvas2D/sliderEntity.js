const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
// begin code

/**
 * A slider of a few positions, drawn in the entity's size (R-056): a track
 * across the middle, a tick at every position — the first, the last and the
 * middle one long, the others short — and the cursor as two triangles above
 * and below the track at the value. The pitch of the positions is whole
 * pixels, so the ticks are crisp at any width the caller picks:
 * `pitch = floor((width-1)/(positions-1))`, the track is `pitch*(positions-1)+1`
 * wide and starts at 0 (the caller centres the entity). In 181 x 15 with
 * eleven positions it is pixel for pixel the volume slider of the ZX Spectrum
 * dialogs it replaces.
 *
 * A click or a touch on the entity sets the value to the nearest position
 * and dragging follows the pointer; every change goes to the parent as the
 * `event` of the options with `value` added. Keys are the caller's business
 * (the volume dialog has - and + as buttons).
 */
export class SliderEntity extends AbstractEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position in the parent.
   * @param {number} y - Y position in the parent.
   * @param {number} width - The width; the track is the largest whole-pitch width that fits.
   * @param {number} height - The height; the track is in the middle row, the cursor fills it.
   * @param {Object} [options] - `positions` (11), `value` (0), `color` of the track and ticks, `cursorColor`, `event` (`{id: 'sliderChanged'}`) sent with `value`.
   */
  constructor(parentEntity, x, y, width, height, options) {
    var o = Object.assign({positions: 11, value: 0, color: '#000000ff', cursorColor: '#ff0000ff', event: {id: 'sliderChanged'}}, options || {});
    super(parentEntity, x, y, width, height, o.color, false);
    this.id = 'SliderEntity';
    this.options = o;
    this.positions = Math.max(2, Math.round(o.positions));
    this.value = this.clamp(o.value);
    /** whole pixels between two positions */
    this.pitch = Math.max(1, Math.floor((width-1)/(this.positions-1)));
    /** the width of the track, the ticks included */
    this.trackWidth = this.pitch*(this.positions-1)+1;
  } // constructor

  /**
   * The width a track of `positions` with a whole pitch takes in a width.
   * @param {number} width - The width available.
   * @param {number} [positions] - 11 by default.
   * @returns {number} The track width, `pitch*(positions-1)+1`.
   */
  static trackWidthFor(width, positions = 11) {
    return Math.max(1, Math.floor((width-1)/(positions-1)))*(positions-1)+1;
  } // trackWidthFor

  /**
   * @param {number} value
   * @returns {number} The value within 0..positions-1, whole.
   */
  clamp(value) {
    return Math.min(this.positions-1, Math.max(0, Math.round(Number(value) || 0)));
  } // clamp

  /**
   * Sets the value; the next draw shows it.
   * @param {number} value
   */
  setValue(value) {
    this.value = this.clamp(value);
  } // setValue

  /**
   * The x of a position's tick.
   * @param {number} position
   * @returns {number}
   */
  positionX(position) {
    return position*this.pitch;
  } // positionX

  /**
   * The nearest position to a pointer event.
   * @param {Object} event - With `x` in the layout's units, as the pointer events come.
   * @returns {number}
   */
  valueAt(event) {
    return this.clamp((event.x-(this.parentX+this.x))/this.pitch);
  } // valueAt

  /**
   * Sets the value from a pointer and tells the parent when it changed.
   * @param {Object} event - A pointer event.
   */
  pointerValue(event) {
    var value = this.valueAt(event);
    if (value !== this.value) {
      this.value = value;
      this.sendEvent(-1, 0, Object.assign({}, this.options.event, {value: value}));
    }
  } // pointerValue

  /**
   * The track, the ticks and the cursor.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    var paint = (x, y, w, h, color) => this.app.layout.paint(this, x, y, w, h, color);
    var h = this.height;
    var mid = Math.floor(h/2);
    var longTick = Math.max(3, Math.round(h*7/15));
    var shortTick = Math.max(1, Math.round(h*3/15));
    var last = this.positions-1;
    paint(0, mid, this.trackWidth, 1, this.penColor);
    for (var i = 0; i <= last; i++) {
      var len = (i == 0 || i == last || i*2 == last) ? longTick : shortTick;
      paint(this.positionX(i), mid-Math.floor(len/2), 1, len, this.penColor);
    }
    // the cursor: a triangle pointing down above the track, one pointing up below it
    var th = Math.max(2, Math.round(h*3/15));
    var cx = this.positionX(this.value);
    for (var r = 0; r < th; r++) {
      var half = th-1-r;
      paint(cx-half, r, 2*half+1, 1, this.options.cursorColor);
      paint(cx-half, h-1-r, 2*half+1, 1, this.options.cursorColor);
    }
  } // drawEntity

  /**
   * A click or a touch sets the value, dragging follows the pointer.
   * @param {Object} event
   * @returns {boolean} True when consumed.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }
    if (this.hide) {
      return false;
    }
    var im = this.app.inputEventsManager;
    switch (event.id) {
      case 'keyPress':
        if (event.key == 'Mouse1' && this.pointOnEntity(event)) {
          im.keysMap.Mouse1 = this;
          this.pointerValue(event);
          return true;
        }
        if (event.key == 'Touch' && this.pointOnEntity(event)) {
          im.touchesMap[event.identifier] = this;
          this.pointerValue(event);
          return true;
        }
        break;
      case 'keyMove':
        if ((event.key == 'Mouse1' && im.keysMap.Mouse1 === this) || (event.key == 'Touch' && im.touchesMap[event.identifier] === this)) {
          this.pointerValue(event);
          return true;
        }
        break;
      case 'keyRelease':
        if ((event.key == 'Mouse1' && im.keysMap.Mouse1 === this) || (event.key == 'Touch' && im.touchesMap[event.identifier] === this)) {
          return true;
        }
        break;
    }
    return false;
  } // handleEvent

} // SliderEntity
