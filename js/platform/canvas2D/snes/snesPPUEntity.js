const { RasterEntity } = await import('../rasterEntity.js?ver='+window.srcVersion);
const { SNESPPU } = await import('./snesPPU.js?ver='+window.srcVersion);
// begin code

/**
 * An entity showing the picture of {@link SNESPPU} — the 256×224 frame the
 * chip makes of VRAM, CGRAM, OAM and the registers, painted into the cache
 * when the PPU's `version` moved and blitted to the entity, 1:1 on the
 * desktop of {@link SNESPlatform}.
 *
 * There is no border to follow: outside the picture a Super Nintendo shows
 * black, whatever the backdrop colour inside is (the console has no border
 * register; the platform's border stays black).
 *
 * ```js
 * this.screenEntity = new SNESPPUEntity(this.desktopEntity, 0, 0,
 *   this.desktopWidth, this.desktopHeight);
 * this.desktopEntity.addEntity(this.screenEntity);
 * var ppu = this.screenEntity.ppu;
 * ```
 *
 * A model that writes into the memory arrays directly calls `ppu.touch()`
 * after it, or {@link SNESPPUEntity#invalidate}; the register writes touch
 * by themselves.
 */
export class SNESPPUEntity extends RasterEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Logical width the 256 pixels are fitted to; the desktop's.
   * @param {number} height - Logical height for the 224 lines; the desktop's.
   * @param {SNESPPU} [ppu] - The chip to show; the entity makes its own without it.
   */
  constructor(parentEntity, x, y, width, height, ppu) {
    super(parentEntity, x, y, width, height);
    this.id = 'SNESPPUEntity';

    /** the memory and the registers */
    this.ppu = ppu || new SNESPPU();
    /** the version the cache was painted with */
    this.paintedVersion = -1;
  } // constructor

  /**
   * Paints the frame into the cache when the chip changed and blits it.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    this.paintBackground();
    if (this.ppu.version !== this.paintedVersion) {
      this.cleanCache();
    }
    var cache = this.drawingCache[0];
    if (cache.preparePaint(SNESPPU.WIDTH, SNESPPU.HEIGHT)) {
      var frame = this.frameBytes(cache, SNESPPU.WIDTH, SNESPPU.HEIGHT);
      this.paintedVersion = this.ppu.version;
      this.ppu.paint32(this.pixels, RasterEntity.littleEndian);
      cache.ctx.putImageData(frame, 0, 0);
    }
    this.app.layout.paintImagePart(this, cache.canvas, 0, 0, SNESPPU.WIDTH, SNESPPU.HEIGHT,
      0, 0, this.width, this.height);
    this.drawSubEntities();
  } // drawEntity

} // SNESPPUEntity
