const { SpriteEntity } = await import('../spriteEntity.js?ver='+window.srcVersion);
const { C64SpriteData } = await import('./c64SpriteData.js?ver='+window.srcVersion);
// begin code

/**
 * One hardware sprite of the VIC-II as an entity: a {@link SpriteEntity}
 * fed from the 63-byte blocks of the machine and coloured from its
 * registers. The entity keeps what the chip keeps — the shape data, the
 * multicolour flag, the two expansions, the three colour registers and the
 * position in sprite coordinates — and the library does the drawing.
 *
 * ```js
 * var ship = new C64SpriteEntity(this.desktopEntity, {multicolor: true});
 * ship.setShapes(blocks, 4);            // four frames, one 64-byte block each
 * ship.setColors(1, 11, 15);            // $D027 white, $D025 dark grey, $D026 light grey
 * ship.setSpritePosition(160, 140);     // as the registers count: picture at 24,50
 * ship.frame = 2;
 * ```
 *
 * The shared registers $D025 and $D026 are on the chip once for all eight
 * sprites; here every sprite holds its own copy in its palette, so a game
 * that changes them calls `setColors()` on each sprite it shows — or keeps
 * one palette object and hands it to every sprite with `setSharedPalette()`.
 *
 * ★ **The border cuts a sprite off**, as it does on the machine: the VIC's
 * border unit overrides everything the graphics and sprite sequencers put
 * out, so a sprite walking off the side of the picture disappears into the
 * edge instead of being drawn over the frame. The entity therefore renders
 * through the crop cache (`enablePaintWithVisibility`), which costs nothing
 * while the sprite is fully inside. A demo that wants a sprite over the
 * border — which the machine only does with raster tricks — turns it off
 * with `disablePaintWithVisibility()`.
 *
 * The sprite-to-sprite collision register $D01E is **not** on the entity —
 * it is in {@link C64Collision}, which computes it from the shape bytes and
 * the positions. That is where a game's model needs it: collisions decide
 * what happens in the world, so they must come out the same with no browser
 * in the room. The same border rule applies there as here.
 *
 * What is not here: the sprite-to-background register $D01F and the
 * priority bit ($D01B) that puts a sprite behind the text. A game that
 * needs them gets them when it comes (R-038).
 */
export class C64SpriteEntity extends SpriteEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity, the desktop as a rule.
   * @param {Object} [options] - `multicolor` (false), `expandX` (false), `expandY` (false).
   */
  constructor(parentEntity, options) {
    super(parentEntity, 0, 0, false, false, 0, 0);
    this.id = 'C64SpriteEntity';

    var opts = options || {};
    /** how the shape bytes are read */
    this.multicolor = !!opts.multicolor;
    this.expandX = !!opts.expandX;
    this.expandY = !!opts.expandY;
    /** the shape blocks, kept to decode again when the mode changes */
    this.blocks = [];
    /** the colour registers, 0-15 */
    this.registers = {color: 1, multicolor1: 0, multicolor2: 0};
    /** the position as the registers hold it */
    this.spriteX = C64SpriteData.ORIGIN_X;
    this.spriteY = C64SpriteData.ORIGIN_Y;
    this.setSharedPalette(C64SpriteData.palette(1, 0, 0));
    // the border of the VIC-II is drawn over the sprites, so the desktop is
    // where a sprite stops; see the note above
    this.enablePaintWithVisibility();
  } // constructor

  /**
   * Loads the shapes: one or more 64-byte blocks, one frame each.
   * @param {Uint8Array} bytes - The memory the blocks are in.
   * @param {number} [count] - How many blocks from the start; 1 by default.
   * @param {number} [offset] - Where the first one starts; 0 by default.
   * @returns {C64SpriteEntity} This.
   */
  setShapes(bytes, count, offset) {
    var n = count || 1;
    var at = offset || 0;
    this.blocks = [];
    for (var i = 0; i < n; i++) {
      this.blocks.push(bytes.slice(at+i*C64SpriteData.BLOCK, at+i*C64SpriteData.BLOCK+C64SpriteData.BYTES));
    }
    this.decodeShapes();
    return this;
  } // setShapes

  /**
   * Decodes the kept blocks in the current mode into the sprite's frames.
   * The grid is always the chip's 24 x 21; the expansions are the sprite's
   * scale (SpriteEntity#setScale), so a pixel of an expanded sprite is
   * painted as a block of 2 x 1, 1 x 2 or 2 x 2.
   */
  decodeShapes() {
    if (this.blocks.length == 0) {
      return;
    }
    var options = {multicolor: this.multicolor};
    var grids = this.blocks.map((block) => C64SpriteData.decode(block, options));
    this.frames = 0;
    this.setScale(this.expandX ? 2 : 1, this.expandY ? 2 : 1);
    this.setFixSize(C64SpriteData.WIDTH, C64SpriteData.HEIGHT);
    if (grids.length == 1) {
      this.setGraphicsData({sprite: grids[0], colors: this.sharedPalette});
    } else {
      this.setGraphicsData({frames: grids.length, directions: 1, sprite: grids, colors: this.sharedPalette});
    }
    if (this.frame >= this.frames) {
      this.frame = 0;
    }
  } // decodeShapes

  /**
   * Switches between hires and multicolour, as bit n of $D01C does.
   * @param {boolean} on - Whether the shapes are multicolour.
   * @returns {C64SpriteEntity} This.
   */
  setMulticolor(on) {
    this.multicolor = !!on;
    this.decodeShapes();
    return this;
  } // setMulticolor

  /**
   * Doubles the sprite in width and/or height, as $D01D and $D017 do: the
   * pixels get bigger, the shape stays as it is decoded, only the scale and
   * the cache change.
   * @param {boolean} x - Twice as wide.
   * @param {boolean} y - Twice as tall.
   * @returns {C64SpriteEntity} This.
   */
  setExpand(x, y) {
    this.expandX = !!x;
    this.expandY = !!y;
    this.setScale(this.expandX ? 2 : 1, this.expandY ? 2 : 1);
    this.setSpritePosition(this.spriteX, this.spriteY);
    return this;
  } // setExpand

  /**
   * Sets the colour registers.
   * @param {number} color - The sprite's own colour ($D027+n), 0-15.
   * @param {number} [multicolor1] - $D025; kept when not given.
   * @param {number} [multicolor2] - $D026; kept when not given.
   * @returns {C64SpriteEntity} This.
   */
  setColors(color, multicolor1, multicolor2) {
    this.registers.color = color & 15;
    if (multicolor1 !== undefined) {
      this.registers.multicolor1 = multicolor1 & 15;
    }
    if (multicolor2 !== undefined) {
      this.registers.multicolor2 = multicolor2 & 15;
    }
    this.setSharedPalette(C64SpriteData.palette(this.registers.color, this.registers.multicolor1, this.registers.multicolor2));
    return this;
  } // setColors

  /**
   * Places the sprite as the position registers do: X 24, Y 50 is the top
   * left of the picture. The entity's x/y follow on the desktop.
   * @param {number} x - 0-511.
   * @param {number} y - 0-255.
   * @returns {C64SpriteEntity} This.
   */
  setSpritePosition(x, y) {
    this.spriteX = x;
    this.spriteY = y;
    var at = C64SpriteData.toDesktop(x, y);
    this.x = at.x;
    this.y = at.y;
    return this;
  } // setSpritePosition

} // C64SpriteEntity
