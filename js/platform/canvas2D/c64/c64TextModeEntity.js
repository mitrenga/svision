const { RasterEntity } = await import('../rasterEntity.js?ver='+window.srcVersion);
const { C64TextRAM } = await import('./c64TextRAM.js?ver='+window.srcVersion);
// begin code

/**
 * An entity showing the 40x25 text screen of the Commodore 64 —
 * {@link C64TextRAM} painted with an 8x8 character set into a 320x200 frame
 * and blitted to the entity, 1:1 on the desktop of {@link C64Platform}.
 *
 * ## Blinking
 *
 * The KERNAL's screen editor toggles the cursor every 20 frames — 0.4 s on a
 * PAL machine — by inverting the character under it. The entity keeps the
 * phase from the timestamps the model hands to
 * {@link C64TextModeEntity#loopEntity}; a model that shows text mode calls it
 * once per frame, the way {@link C64BootModel} does. Without the call the
 * cursor stands still, which is fine for a static screen.
 *
 * ```js
 * this.screen = new C64TextModeEntity(this.desktopEntity, 0, 0,
 *   this.desktopWidth, this.desktopHeight, this.app.fonts.c64Fonts8x8);
 * this.screen.textRAM.print('READY.\n');
 * ```
 *
 * ## Sprites in the same frame
 *
 * A game that multiplexes sprites hands over a {@link C64Sprites} with
 * {@link C64TextModeEntity#setSprites}: the frame is then composed the way
 * the chip composes it — the text, the sprites over it line by line, and the
 * border of the 38-column window over both. One picture, painted by the
 * DOM-free classes, so a tool under Node gets the same pixels.
 */
export class C64TextModeEntity extends RasterEntity {

  /** the cursor toggles every 20 frames at 50 Hz */
  static get CURSOR_BLINK_MS() { return 20*1000/50; }

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Logical width the 320 pixels are fitted to; the desktop's.
   * @param {number} height - Logical height for the 200 lines; the desktop's.
   * @param {Object} font - Anything with `glyphBytes(code, set)`: {@link C64Fonts8x8}.
   * @param {C64TextRAM} [textRAM] - Memory to show; the entity makes its own without it.
   */
  constructor(parentEntity, x, y, width, height, font, textRAM) {
    super(parentEntity, x, y, width, height);
    this.id = 'C64TextModeEntity';

    /** the memory itself */
    this.textRAM = textRAM || new C64TextRAM();
    /** where the glyphs come from */
    this.font = font;
    /** the memory version the cache was painted with */
    this.paintedVersion = -1;
    /** the phase the cache was painted in */
    this.cursorPhase = true;
    /** whether the cursor follows the clock at all */
    this.blinking = true;
    /** the hardware sprites painted into the frame, or null */
    this.sprites = null;
    /** the sprites' version the cache was painted with */
    this.paintedSpritesVersion = -1;
  } // constructor

  /**
   * Paints these sprites into the frame, between the text and the border.
   * @param {C64Sprites|null} sprites - The sprites, or null for none.
   */
  setSprites(sprites) {
    this.sprites = sprites;
    this.invalidate();
  } // setSprites

  /**
   * Swaps the character set the screen is painted with — a game's own set
   * in place of the ROM.
   * @param {Object} font - Anything with `glyphBytes(code, set)`.
   */
  setFont(font) {
    this.font = font;
    this.invalidate();
  } // setFont

  /**
   * Advances the cursor phase from the clock and repaints when it turned
   * over. Called by the model once per frame.
   * @param {number} timestamp - The current frame timestamp in milliseconds.
   */
  loopEntity(timestamp) {
    if (!this.blinking) {
      return;
    }
    var cursorPhase = Math.floor(timestamp/C64TextModeEntity.CURSOR_BLINK_MS)%2 === 0;
    if (cursorPhase !== this.cursorPhase) {
      this.cursorPhase = cursorPhase;
      this.cleanCache();
    }
  } // loopEntity

  /**
   * Paints the 320x200 frame into the cache when the memory or the cursor
   * phase changed, and blits it fitted to the entity's logical size.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    this.paintBackground();
    if (this.textRAM.version !== this.paintedVersion
        || (this.sprites && this.sprites.version !== this.paintedSpritesVersion)) {
      this.cleanCache();
    }
    var cache = this.drawingCache[0];
    if (cache.preparePaint(C64TextRAM.WIDTH, C64TextRAM.HEIGHT)) {
      var frame = this.frameBytes(cache, C64TextRAM.WIDTH, C64TextRAM.HEIGHT);
      this.paintedVersion = this.textRAM.version;
      if (this.sprites) {
        this.paintedSpritesVersion = this.sprites.version;
        this.textRAM.paint32(this.pixels, this.font, RasterEntity.littleEndian, {cursorPhase: this.cursorPhase, border: false});
        this.sprites.paint32(this.pixels, RasterEntity.littleEndian);
        this.textRAM.paintBorder32(this.pixels, RasterEntity.littleEndian);
      } else {
        this.textRAM.paint32(this.pixels, this.font, RasterEntity.littleEndian, {cursorPhase: this.cursorPhase});
      }
      cache.ctx.putImageData(frame, 0, 0);
    }
    this.app.layout.paintImage(this, cache.canvas, 0, 0, this.width, this.height);
    this.drawSubEntities();
  } // drawEntity

} // C64TextModeEntity
