const { RasterEntity } = await import('../rasterEntity.js?ver='+window.srcVersion);
const { ZXVideoRAM } = await import('./zxVideoRAM.js?ver='+window.srcVersion);
// begin code

/**
 * An entity showing a rectangle of ZX Spectrum video memory.
 *
 * It owns a {@link ZXVideoRAM} and, through {@link RasterEntity}, the frame it
 * paints into: the memory becomes pixels **once per game frame**, and the
 * result is blitted, scaled by the layout ratio, on every display frame. The
 * FLASH phase of the machine is watched here too, so a screen with flashing
 * cells repaints itself without the game asking.
 *
 * ## What a game supplies
 *
 * Fill the memory and call {@link ZXVideoRAMEntity#invalidate}, or override
 * {@link ZXVideoRAMEntity#compose} and fill it there — the hook runs only when
 * the cache is dirty, so composing a whole screen costs nothing on the frames
 * where nothing moved.
 *
 * The three ways of filling it that no game has to write for itself are here
 * already, each of them invalidating the cache on its own: a whole picture at
 * once ({@link ZXVideoRAMEntity#restore}), an empty screen
 * ({@link ZXVideoRAMEntity#clear}) and a single byte at its offset from $4000
 * ({@link ZXVideoRAMEntity#pokeOffset}), which is what a tape block delivers.
 * Anything else goes through `videoRAM` and `invalidate()`.
 *
 * ```js
 * class RoomEntity extends ZXVideoRAMEntity {
 *   constructor(parent, x, y) { super(parent, x, y, {row: 2, rows: 22}); }
 *   compose() { this.render.composeInto(this.videoRAM, this.frameState); }
 * }
 * ```
 *
 * ## The area
 *
 * The rectangle is given in **character cells**, not pixels, because an
 * attribute covers a whole cell and a screen cannot be cut anywhere else. A
 * game whose panel and play area are separate entities gives each of them its
 * own rows of the same screen.
 *
 * The pixel work itself is in {@link ZXVideoRAM}, which knows nothing about the
 * DOM, so an offline tool renders with the very same code (R-001).
 */
export class ZXVideoRAMEntity extends RasterEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {Object} [area] - {col, row, cols, rows} in character cells; the
   *        whole 32x24 screen by default.
   * @param {ZXVideoRAM} [videoRAM] - Memory to show. A game whose screen is
   *        split between several entities passes the same instance to each of
   *        them; without it the entity makes its own.
   */
  constructor(parentEntity, x, y, area, videoRAM) {
    var box = ZXVideoRAM.area(area);
    super(parentEntity, x, y, box.cols*ZXVideoRAM.CELL, box.rows*ZXVideoRAM.CELL);
    this.id = 'ZXVideoRAMEntity';

    /** the rectangle of the screen this entity shows, in character cells */
    this.area = box;
    /** the memory itself */
    this.videoRAM = videoRAM || new ZXVideoRAM();
    /** applied to every attribute before it is painted; see ZXVideoRAM.paint */
    this.attrMask = 0xFF;
    // a Spectrum screen can have flashing cells, so the phase is watched
    this.watchFlash = true;
  } // constructor

  /**
   * Sets the attribute mask and repaints if it changed. Games that keep
   * something of their own in a spare bit of the attribute mask it off here.
   * @param {number} mask - Applied to every attribute before it is painted.
   */
  setAttrMask(mask) {
    if (this.attrMask !== mask) {
      this.attrMask = mask;
      this.cleanCache();
    }
  } // setAttrMask

  // ------------------------------------ writing into it, and repainting after

  /**
   * Puts a whole picture into the memory at once — a loading or title screen
   * off the tape, or a prepared background a game starts its frame from.
   * @param {ZXVideoRAM|Uint8Array|string|Object} source - The bytes, or a
   *        parsed data file holding them in a `videoRAM` field (R-016), which
   *        is what {@link AbstractModel#loadDataFile} hands back.
   * @returns {ZXVideoRAMEntity} This, so calls can be chained.
   */
  restore(source) {
    this.videoRAM.restore(source && source.videoRAM !== undefined ? source.videoRAM : source);
    this.invalidate();
    return this;
  } // restore

  /**
   * Empties the memory, or fills it with a byte.
   * @param {number} [bitmap] - The byte to put in the bitmap, 0 by default.
   * @param {number} [attribute] - And in the attributes, 0 by default;
   *        {@link ZXVideoRAM.BLANK_ATTRIBUTE} is the state after CLS.
   * @returns {ZXVideoRAMEntity} This.
   */
  clear(bitmap, attribute) {
    this.videoRAM.clear(bitmap, attribute);
    this.invalidate();
    return this;
  } // clear

  /**
   * Writes one byte at its offset from $4000 — which is what a tape block
   * delivers and nothing more.
   * @param {number} offset - 0 to 6911.
   * @param {number} value - The byte to write.
   * @param {string} [extraOperation] - 'none' (default), 'xor', 'and' or 'or'.
   * @returns {boolean} True when the byte was inside the video memory.
   */
  pokeOffset(offset, value, extraOperation) {
    var written = this.videoRAM.pokeOffset(offset, value, extraOperation);
    this.invalidate();
    return written;
  } // pokeOffset

  /**
   * Fills the memory for the frame about to be painted. The base version does
   * nothing, for a game that writes into `videoRAM` as it goes and calls
   * {@link ZXVideoRAMEntity#invalidate}; override it to compose the screen
   * lazily instead, which costs nothing on the frames where nothing changed.
   */
  compose() {
  } // compose

  /**
   * Composes the frame and turns the memory into pixels. RasterEntity calls it
   * only when the cache is dirty.
   * @param {Uint8ClampedArray} data - The RGBA bytes of the frame.
   */
  paintRaster(data) {
    this.compose();
    this.videoRAM.paint(data, this.flashState, this.area, this.attrMask);
  } // paintRaster

} // ZXVideoRAMEntity
