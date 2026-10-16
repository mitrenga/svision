const { RasterEntity } = await import('../rasterEntity.js?ver='+window.srcVersion);
const { Atari8Screen } = await import('./atari8Screen.js?ver='+window.srcVersion);
const { Atari8Color } = await import('./atari8Color.js?ver='+window.srcVersion);
// begin code

/**
 * An entity showing the picture of {@link Atari8Screen} — the 320x240 frame
 * ANTIC and GTIA make of the memory and the registers, painted into the
 * cache when the screen's `version` moved and blitted to the entity, 1:1
 * on the desktop of {@link Atari8Platform}.
 *
 * ## The window
 *
 * The frame is always the machine's 240 scan lines, because that is what
 * ANTIC makes and what the display list, the players and every tool are
 * counted in. What the desktop shows can be less: a game whose list covers
 * 200 of those lines wants the other 40 as border, not as a band inside the
 * picture — a television hid them under overscan anyway. The platform says
 * so with `firstLine` and `height` and the entity blits that window
 * ({@link Atari8ScreenEntity#setView}); the default is the whole frame.
 *
 * Whatever of the frame the desktop does not show is **border**, and the
 * border is COLBK — one register for both, as on the machine — so the
 * entity keeps `borderEntity.bkColor` on COLBK by itself (`followsBorder`,
 * on by default). A model may still set it: the entity only follows a
 * register a model has already written, one frame behind, and a model that
 * wants a border of its own switches the flag off.
 *
 * ```js
 * this.screen = new Atari8ScreenEntity(this.desktopEntity, 0, 0,
 *   this.desktopWidth, this.desktopHeight);
 * this.screen.screen.powerOn(this.app.fonts.atari8Fonts8x8.setBytes(0));
 * this.screen.screen.print(0, 0, 'READY');
 * ```
 *
 * A model that writes into the memory directly calls `screen.touch()` after
 * it, or {@link Atari8ScreenEntity#invalidate}; the register setters touch
 * by themselves.
 */
export class Atari8ScreenEntity extends RasterEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Logical width the 320 pixels are fitted to; the desktop's.
   * @param {number} height - Logical height for the 240 lines; the desktop's.
   * @param {Atari8Screen} [screen] - The machine to show; the entity makes its own without it.
   */
  constructor(parentEntity, x, y, width, height, screen) {
    super(parentEntity, x, y, width, height);
    this.id = 'Atari8ScreenEntity';

    /** the memory and the registers */
    this.screen = screen || new Atari8Screen();
    /** the version the cache was painted with */
    this.paintedVersion = -1;
    /** the first scan line of the frame the entity shows */
    this.firstLine = 0;
    /** how many scan lines of the frame the entity shows */
    this.lines = Atari8Screen.HEIGHT;
    /** keeps the model's border on COLBK, the register of the frame's own background */
    this.followsBorder = true;

    var platform = this.app != null ? this.app.platform : false;
    if (platform && typeof platform.frameWindow === 'function') {
      var view = platform.frameWindow();
      this.setView(view.firstLine, view.lines);
    }
  } // constructor

  /**
   * Which window of the frame the entity shows; the whole frame by default.
   * The window is clamped to the frame, so a game cannot ask for lines ANTIC
   * does not make.
   * @param {number} firstLine - The first scan line of the frame, 0-239.
   * @param {number} lines - How many lines, 1-240.
   * @returns {Atari8ScreenEntity} This.
   */
  setView(firstLine, lines) {
    this.firstLine = Math.max(0, Math.min(Atari8Screen.HEIGHT-1, firstLine || 0));
    this.lines = Math.max(1, Math.min(Atari8Screen.HEIGHT-this.firstLine, lines || Atari8Screen.HEIGHT));
    return this;
  } // setView

  /**
   * Paints the frame into the cache when the screen changed and blits it.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    this.paintBackground();
    if (this.screen.version !== this.paintedVersion) {
      this.cleanCache();
    }
    var cache = this.drawingCache[0];
    if (cache.preparePaint(Atari8Screen.WIDTH, Atari8Screen.HEIGHT)) {
      var frame = this.frameBytes(cache, Atari8Screen.WIDTH, Atari8Screen.HEIGHT);
      this.paintedVersion = this.screen.version;
      this.screen.paint32(this.pixels, RasterEntity.littleEndian);
      cache.ctx.putImageData(frame, 0, 0);
    }
    this.app.layout.paintImagePart(this, cache.canvas, 0, this.firstLine, Atari8Screen.WIDTH, this.lines,
      0, 0, this.width, this.height);
    this.followBorder();
    this.drawSubEntities();
  } // drawEntity

  /**
   * Puts COLBK on the model's border, which is the part of the frame the
   * desktop does not show. The border is painted before this entity, so a
   * change lands on the next frame — which at 50 Hz is what the register
   * would have done anyway.
   */
  followBorder() {
    if (!this.followsBorder || this.model == null || this.model.borderEntity == null) {
      return;
    }
    var color = Atari8Color.color(this.screen.colbk);
    if (this.model.borderEntity.bkColor !== color) {
      this.model.borderEntity.bkColor = color;
    }
  } // followBorder

} // Atari8ScreenEntity
