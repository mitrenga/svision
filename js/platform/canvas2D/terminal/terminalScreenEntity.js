const { RasterEntity } = await import('../rasterEntity.js?ver='+window.srcVersion);
// begin code

/**
 * An entity showing a {@link TerminalScreen}: the screen painted with a
 * {@link TerminalFont} into a frame of `cols × cellWidth` by
 * `(rows + status line) × cellHeight` pixels, blitted fitted to the entity.
 * On the desktop of {@link TerminalPlatform} the entity is the desktop and the
 * frame is drawn 1:1.
 *
 * ## The cursor blinks by the model's clock
 *
 * A blinking cursor follows the timestamps the model hands to
 * {@link TerminalScreenEntity#loopEntity}, once a frame (as
 * {@link VGATextModeEntity} does). `cursor.blinkOnMs` and `blinkOffMs` of the
 * platform config say how long it is lit and dark; without them it does not
 * blink.
 *
 * ```js
 * this.terminal = new TerminalScreenEntity(this.desktopEntity, 0, 0,
 *   this.desktopWidth, this.desktopHeight, screen, font, this.app.platform.config);
 * ```
 */
export class TerminalScreenEntity extends RasterEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Logical width the frame is fitted to.
   * @param {number} height - Logical height the frame is fitted to.
   * @param {TerminalScreen} screen - The memory to show.
   * @param {TerminalFont} font - The glyphs.
   * @param {Object} config - `foreground`, `background` ('#rrggbb') and
   *        `cursor` (`blinkOnMs`, `blinkOffMs`) — the platform config.
   */
  constructor(parentEntity, x, y, width, height, screen, font, config) {
    super(parentEntity, x, y, width, height);
    this.id = 'TerminalScreenEntity';

    this.screen = screen;
    this.font = font;
    this.foreground = config.foreground || '#ffffff';
    this.background = config.background || '#000000';
    this.blinkOnMs = (config.cursor && config.cursor.blinkOnMs) || 0;
    this.blinkOffMs = (config.cursor && config.cursor.blinkOffMs) || 0;
    /** the memory version the cache was painted with */
    this.paintedVersion = -1;
    /** whether a blinking cursor is lit in the cached frame */
    this.cursorPhase = true;
  } // constructor

  /**
   * Advances the blink phase of the cursor and repaints when it turned over.
   * Called by the model once a frame.
   * @param {number} timestamp - The frame timestamp in milliseconds.
   */
  loopEntity(timestamp) {
    if (this.blinkOnMs <= 0 || this.blinkOffMs <= 0) {
      return;
    }
    var phase = timestamp%(this.blinkOnMs+this.blinkOffMs) < this.blinkOnMs;
    if (phase !== this.cursorPhase) {
      this.cursorPhase = phase;
      this.cleanCache();
    }
  } // loopEntity

  /**
   * Paints the frame into the cache when the memory or the blink phase
   * changed, and blits it fitted to the entity.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    this.paintBackground();
    if (this.screen.version !== this.paintedVersion) {
      this.cleanCache();
    }
    var width = this.screen.frameWidth(this.font);
    var height = this.screen.frameHeight(this.font);
    var cache = this.drawingCache[0];
    if (cache.preparePaint(width, height)) {
      var frame = this.frameBytes(cache, width, height);
      this.paintedVersion = this.screen.version;
      this.screen.paint32(this.pixels, this.font, {
        foreground: RasterEntity.colorValue(this.foreground),
        background: RasterEntity.colorValue(this.background),
        cursorPhase: this.cursorPhase
      });
      cache.ctx.putImageData(frame, 0, 0);
    }
    this.app.layout.paintImage(this, cache.canvas, 0, 0, this.width, this.height);
    this.drawSubEntities();
  } // drawEntity

} // TerminalScreenEntity
