const { RasterEntity } = await import('../rasterEntity.js?ver='+window.srcVersion);
const { VGAVideoRAM } = await import('./vgaVideoRAM.js?ver='+window.srcVersion);
const { VGAPalette } = await import('./vgaPalette.js?ver='+window.srcVersion);
// begin code

/**
 * An entity showing VGA mode 13h video memory through its palette.
 *
 * It owns a {@link VGAVideoRAM} and a {@link VGAPalette} and, through
 * {@link RasterEntity}, the frame it paints into: the memory becomes pixels
 * **once per game frame**, and the result is blitted, scaled by the layout, on
 * every display frame.
 *
 * The frame is the videoram's size (320x200) and the entity is `pixelScale`
 * times that — the same, on the platform's default 320x200 desktop; twice, on
 * a 640x400 desktop (see {@link VGAPlatform}), where the frame is blitted at
 * 2x on the way. Because the frame may differ from the entity's size, it
 * draws itself instead of leaving that to {@link RasterEntity#drawEntity}. The palette is watched here too: a fade or a colour
 * cycle changes not one pixel of the memory, yet the picture has to be painted
 * again, and the entity notices by the palette's `version`.
 *
 * ## What a game supplies
 *
 * Fill the memory and call {@link VGAVideoRAMEntity#invalidate}, or override
 * {@link VGAVideoRAMEntity#compose} and fill it there — the hook runs only when
 * the cache is dirty, so composing a whole screen costs nothing on the frames
 * where nothing moved. Palette work belongs in `compose()` too when it is
 * driven by the frame (a fade stepping once per frame), or anywhere at all
 * when it is driven by an event.
 *
 * ```js
 * class RoomEntity extends VGAVideoRAMEntity {
 *   constructor(parent) { super(parent, 0, 0); }
 *   compose() { this.videoRAM.blit(this.background, 0, 0); this.drawSprites(); }
 * }
 * ```
 *
 * A game whose picture comes from a worker sets the memory when a frame
 * arrives ({@link VGAVideoRAMEntity#restore}) and until then paints nothing —
 * see the note on the first frame in {@link RasterEntity}.
 *
 * The pixel work itself is in {@link VGAVideoRAM} and {@link VGAPalette},
 * which know nothing about the DOM, so an offline tool renders with the very
 * same code (R-001).
 */
export class VGAVideoRAMEntity extends RasterEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {VGAVideoRAM} [videoRAM] - Memory to show; the entity makes its own
   *        320x200 without it. An off-screen buffer of another size gives an
   *        entity of that size — a panel, a window.
   * @param {VGAPalette} [palette] - The registers; the BIOS defaults without it.
   * @param {number} [pixelScale] - Logical pixels per raster pixel; the
   *        platform's `pixelScale` (1) without it.
   */
  constructor(parentEntity, x, y, videoRAM, palette, pixelScale) {
    var memory = videoRAM || new VGAVideoRAM();
    var scale = pixelScale || (parentEntity && parentEntity.app && parentEntity.app.platform
      && parentEntity.app.platform.pixelScale) || 1;
    super(parentEntity, x, y, memory.width*scale, memory.height*scale);
    this.id = 'VGAVideoRAMEntity';

    /** logical pixels per raster pixel */
    this.pixelScale = scale;
    /** the memory itself */
    this.videoRAM = memory;
    /** the registers its bytes point into */
    this.palette = palette || VGAPalette.defaultPalette();
    /** the palette version the cache was painted with */
    this.paintedPaletteVersion = -1;
  } // constructor

  /**
   * Swaps the palette for another — a game loading the palette of a level.
   * The picture repaints on its own.
   * @param {VGAPalette} palette - The new registers.
   * @returns {VGAVideoRAMEntity} This, so calls can be chained.
   */
  setPalette(palette) {
    this.palette = palette;
    this.invalidate();
    return this;
  } // setPalette

  // ------------------------------------ writing into it, and repainting after

  /**
   * Puts a whole picture into the memory at once — a title screen, a frame
   * from the worker.
   * @param {VGAVideoRAM|Uint8Array|string|Object} source - The bytes, or a
   *        parsed data file holding them in a `videoRAM` field (R-016).
   * @returns {VGAVideoRAMEntity} This.
   */
  restore(source) {
    this.videoRAM.restore(source);
    this.invalidate();
    return this;
  } // restore

  /**
   * Fills the memory with one index.
   * @param {number} [index] - The palette index, 0 by default.
   * @returns {VGAVideoRAMEntity} This.
   */
  clear(index) {
    this.videoRAM.fill(index);
    this.invalidate();
    return this;
  } // clear

  /**
   * Fills the memory for the frame about to be painted. The base version does
   * nothing, for a game that writes into `videoRAM` as it goes and calls
   * {@link VGAVideoRAMEntity#invalidate}; override it to compose the screen
   * lazily instead.
   */
  compose() {
  } // compose

  /**
   * The videoram position under a logical position relative to the entity —
   * what a point-and-click game asks of a `keyMove` or `keyPress` event.
   * @param {number} x - Logical x relative to the entity.
   * @param {number} y - Logical y relative to the entity.
   * @returns {Object} {x, y} in videoram pixels, not clipped.
   */
  rasterPosition(x, y) {
    return {x: Math.floor(x/this.pixelScale), y: Math.floor(y/this.pixelScale)};
  } // rasterPosition

  /**
   * Paints the 320x200 frame into the cache when the memory or the palette
   * changed, and blits it to the entity's logical size.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    this.paintBackground();
    if (this.palette.version !== this.paintedPaletteVersion) {
      this.cleanCache();
    }
    var cache = this.drawingCache[0];
    if (cache.preparePaint(this.videoRAM.width, this.videoRAM.height)) {
      var frame = this.frameBytes(cache, this.videoRAM.width, this.videoRAM.height);
      this.paintRaster(frame.data);
      cache.ctx.putImageData(frame, 0, 0);
    }
    this.app.layout.paintImage(this, cache.canvas, 0, 0, this.width, this.height);
    this.drawSubEntities();
  } // drawEntity

  /**
   * Composes the frame and turns the memory into pixels through the palette.
   * Called only when the cache is dirty. The pixels are written through
   * `this.pixels` (the 32-bit view of the frame, `videoRAM.width` by
   * `videoRAM.height` — an off-screen buffer need not be 320x200).
   * @param {Uint8ClampedArray} data - The RGBA bytes of the frame; unused
   *        here, kept for the {@link RasterEntity} signature.
   */
  paintRaster(data) {
    this.compose();
    this.paintedPaletteVersion = this.palette.version;
    this.videoRAM.paint32(this.pixels, this.palette.lookup(RasterEntity.littleEndian));
  } // paintRaster

} // VGAVideoRAMEntity
