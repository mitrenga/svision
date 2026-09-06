const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { ZXVideoRAM } = await import('./zxVideoRAM.js?ver='+window.srcVersion);
// begin code

/**
 * An entity showing a rectangle of ZX Spectrum video memory.
 *
 * It owns a {@link ZXVideoRAM} and an off-screen cache, and does the one thing
 * every game with a Spectrum screen was doing for itself: paint the memory into
 * an `ImageData` **once per game frame**, then blit that, scaled by the layout
 * ratio, on every display frame. The FLASH phase of the machine is watched here
 * too, so a screen with flashing cells repaints itself without the game asking.
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
export class ZXVideoRAMEntity extends AbstractEntity {

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
    super(parentEntity, x, y, box.cols*ZXVideoRAM.CELL, box.rows*ZXVideoRAM.CELL,
          false, false);
    this.id = 'ZXVideoRAMEntity';

    /** the rectangle of the screen this entity shows, in character cells */
    this.area = box;
    /** the memory itself */
    this.videoRAM = videoRAM || new ZXVideoRAM();
    /** applied to every attribute before it is painted; see ZXVideoRAM.paint */
    this.attrMask = 0xFF;
    /** the FLASH phase the cache was painted in */
    this.flashState = false;
    this.imageData = null;
  } // constructor

  init() {
    super.init();
    this.app.layout.newDrawingCache(this, 0);
  } // init

  /**
   * Marks the picture as out of date, so that the next draw paints it again.
   * Call it after writing into the memory.
   */
  invalidate() {
    this.cleanCache();
  } // invalidate

  cleanCache() {
    if (this.drawingCache[0]) {
      this.drawingCache[0].cleanCache();
    }
  } // cleanCache

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
   * Paints the memory into the cache when it is dirty — that is once per game
   * frame, not once per display frame — and blits the cache.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    if (this.stack.flashState !== this.flashState) {
      this.flashState = this.stack.flashState;
      this.cleanCache();
    }
    var cache = this.drawingCache[0];
    if (cache.preparePaint(this.width, this.height)) {
      if (this.imageData === null || this.imageData.width != this.width) {
        this.imageData = cache.ctx.createImageData(this.width, this.height);
      }
      this.compose();
      this.videoRAM.paint(this.imageData.data, this.flashState, this.area, this.attrMask);
      cache.ctx.putImageData(this.imageData, 0, 0);
    }
    this.app.layout.paintCache(this, 0);
    this.drawSubEntities();
  } // drawEntity

} // ZXVideoRAMEntity
