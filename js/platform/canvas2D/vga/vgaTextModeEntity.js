const { RasterEntity } = await import('../rasterEntity.js?ver='+window.srcVersion);
const { VGATextRAM } = await import('./vgaTextRAM.js?ver='+window.srcVersion);
// begin code

/**
 * An entity showing the 80x25 text screen of a VGA card — {@link VGATextRAM}
 * painted with an 8x16 font into a 640x400 frame and blitted fitted to the
 * entity. On the 320x200 desktop of {@link VGAPlatform} that is a downscale
 * by two, and with the layout's ratio the glyphs get a fractional scale
 * (ratio/2) that leaves some columns a device pixel wider than others — the
 * text mode is a little rough for now; a desktop of 640x400 (`pixelScale: 2`)
 * fixes it at the cost of coarser scaling steps for the game, and something
 * better is still to be found (2026-09-14).
 *
 * ## Blinking
 *
 * The cursor blinks every 16 frames of the 70 Hz mode, blinking text every 32.
 * The entity keeps both phases from the timestamps the model hands to
 * {@link VGATextModeEntity#loopEntity}; a model that shows text mode calls it
 * once per frame, the way {@link DOSBootModel} does. Without the call nothing
 * blinks and the cursor stands still, which is fine for a static screen.
 *
 * ```js
 * this.screen = new VGATextModeEntity(this.desktopEntity, 0, 0,
 *   this.desktopWidth, this.desktopHeight, this.app.fonts.vgaFonts8x16Mono);
 * this.screen.textRAM.print('C:\\>');
 * ```
 */
export class VGATextModeEntity extends RasterEntity {

  /** the cursor toggles every 16 frames at 70 Hz */
  static get CURSOR_BLINK_MS() { return 16*1000/70; }
  /** blinking text toggles every 32 frames */
  static get TEXT_BLINK_MS() { return 32*1000/70; }

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Logical width the 640 pixels are fitted to; the desktop's.
   * @param {number} height - Logical height for the 400 lines; the desktop's.
   * @param {Object} font - Anything with `glyphBytes(codePoint)`: {@link VGAFonts8x16}.
   * @param {VGATextRAM} [textRAM] - Memory to show; the entity makes its own without it.
   */
  constructor(parentEntity, x, y, width, height, font, textRAM) {
    super(parentEntity, x, y, width, height);
    this.id = 'VGATextModeEntity';

    /** the memory itself */
    this.textRAM = textRAM || new VGATextRAM();
    /** where the glyphs come from */
    this.font = font;
    /** the memory version the cache was painted with */
    this.paintedVersion = -1;
    /** the phases the cache was painted in */
    this.cursorPhase = true;
    this.blinkPhase = true;
    /** whether the cursor and blinking text follow the clock at all */
    this.blinking = true;
  } // constructor

  /**
   * Advances the blink phases from the clock and repaints when one turned
   * over. Called by the model once per frame.
   * @param {number} timestamp - The current frame timestamp in milliseconds.
   */
  loopEntity(timestamp) {
    if (!this.blinking) {
      return;
    }
    var cursorPhase = Math.floor(timestamp/VGATextModeEntity.CURSOR_BLINK_MS)%2 === 0;
    var blinkPhase = Math.floor(timestamp/VGATextModeEntity.TEXT_BLINK_MS)%2 === 0;
    if (cursorPhase !== this.cursorPhase || blinkPhase !== this.blinkPhase) {
      this.cursorPhase = cursorPhase;
      this.blinkPhase = blinkPhase;
      this.cleanCache();
    }
  } // loopEntity

  /**
   * Paints the 640x400 frame into the cache when the memory or a blink phase
   * changed, and blits it fitted to the entity's logical size — 1:1 when the
   * entity is 640x400, scaled down when the desktop is the 320x200 of mode
   * 13h (see {@link VGAPlatform}: `pixelScale`).
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    this.paintBackground();
    if (this.textRAM.version !== this.paintedVersion) {
      this.cleanCache();
    }
    var cache = this.drawingCache[0];
    if (cache.preparePaint(VGATextRAM.WIDTH, VGATextRAM.HEIGHT)) {
      var frame = this.frameBytes(cache, VGATextRAM.WIDTH, VGATextRAM.HEIGHT);
      this.paintedVersion = this.textRAM.version;
      this.textRAM.paint32(this.pixels, this.font, RasterEntity.littleEndian,
        {blinkPhase: this.blinkPhase, cursorPhase: this.cursorPhase});
      cache.ctx.putImageData(frame, 0, 0);
    }
    this.app.layout.paintImage(this, cache.canvas, 0, 0, this.width, this.height);
    this.drawSubEntities();
  } // drawEntity

} // VGATextModeEntity
