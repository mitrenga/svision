// classic script (importScripts): no import, no export — R-001
// begin code

/**
 * The sprite-to-sprite collision register of the VIC-II, $D01E, as data.
 *
 * The chip does not compare rectangles. It compares **what it actually
 * puts out**: while a raster line is drawn, every sprite pixel that is not
 * transparent goes through the sprite sequencer, and whenever two of them
 * land on the same dot the chip sets a bit for each of the two sprites in
 * $D01E. So the test is **pixel-exact**, it ignores the priority bit
 * ($D01B) — a sprite hidden behind the text collides all the same — and it
 * is blind to colour: in multicolour a pixel pair counts as set whenever it
 * is not `00`, whichever of the three colours it is.
 *
 * Three properties of the register decide how a game reads it, and all
 * three are reproduced here by the caller, not by this class:
 *
 * - **it is a latch**: bits pile up while the picture is drawn and stay
 *   set until someone reads the register;
 * - **reading clears it**, which is why a game that wants a clean slate
 *   reads it and throws the value away;
 * - **it fills as the raster sweeps**, so two reads in one frame split the
 *   frame between them.
 *
 * {@link C64Collision.latch} is the latch with those semantics;
 * {@link C64Collision.spriteSprite} is the one-shot comparison that feeds
 * it.
 *
 * ★ **The border does not cut the collision off**, although it does cut
 * the picture off — and that is worth saying plainly, because the opposite
 * is the natural guess and it is wrong. The border unit overrides what the
 * sprite sequencer has already put out; the sequencer itself runs over the
 * whole raster, and the comparison that sets $D01E happens there. So two
 * sprites that touch behind the frame, where nobody can see them, collide
 * all the same.
 *
 * ★ It is **measured**, not read: in Impossible Mission the agent walks to
 * the right-hand edge of a room, his three sprites slide to X 334 where all
 * but two columns are behind the border — and the original goes on
 * reporting $0E for them, frame after frame
 * (`impossiblemission/tools/matchcollision.mjs`, record `collroom42`). A
 * clipped model reports nothing there, which is how the difference was
 * found.
 *
 * The comparison therefore runs over the whole raster by default.
 * `options.window` narrows it for a caller who wants the picture only —
 * and note that {@link C64SpriteEntity} **does** cut at the border
 * (`enablePaintWithVisibility`), because drawing and colliding are two
 * different units of the chip.
 *
 * What is not here: the sprite-to-background register $D01F. It works the
 * same way over the graphics sequencer's foreground pixels; nothing has
 * needed it yet (R-038).
 *
 * ```js
 * var latch = C64Collision.latch();
 * latch.add(C64Collision.spriteSprite(sprites));   // once a frame, as drawn
 * var d01e = latch.read();                         // and reading clears it
 * ```
 *
 * ★ **This one file is a classic script**, not a module like the rest of
 * the platform, and on purpose: collisions decide what happens in the
 * world, so they belong to a game's **model**, and a model runs in a worker
 * that `importScripts()` cannot feed an ES module (R-001). The same file is
 * therefore read by `tools/checkc64.mjs` under Node, by a game's `match*`
 * tool and by its worker. {@link C64SpriteEntity} draws; this decides.
 *
 * The price is the four numbers of the sprite box, which {@link C64SpriteData}
 * also holds and which cannot be imported from here. They are checked
 * against it in `tools/checkc64.mjs`, so the two cannot drift apart
 * quietly.
 *
 * Nothing here touches the DOM (R-001).
 */
class C64Collision {

  /** the sprite box, as {@link C64SpriteData} counts it (checked against it) */
  static get WIDTH() { return 24; }
  static get HEIGHT() { return 21; }
  /** where the picture starts in sprite coordinates */
  static get ORIGIN_X() { return 24; }
  static get ORIGIN_Y() { return 50; }

  /** ★ where the sequencer runs: the whole raster, border and all */
  static get RASTER() { return {x: 0, y: 0, width: 512, height: 312}; }

  /** the picture the border leaves — for a caller who asks for it by name */
  static get PICTURE() {
    return {x: C64Collision.ORIGIN_X, y: C64Collision.ORIGIN_Y, width: 320, height: 200};
  }

  /**
   * The pixels a sprite puts out, as one byte per pixel of its own box.
   *
   * Transparent is 0 and anything else is 1: in hires a set bit, in
   * multicolour a pair that is not `00`. The box is 24x21, doubled by
   * `expandX` and `expandY` — the pixels get bigger, the data does not.
   *
   * @param {Uint8Array|number[]} bytes - At least 63 bytes of shape.
   * @param {Object} [options] - `multicolor` (false), `expandX` (false), `expandY` (false).
   * @returns {Object} {width, height, pixels} with `pixels` a Uint8Array of width*height.
   */
  static shapeMask(bytes, options) {
    var opts = options || {};
    var wide = opts.expandX ? 2 : 1, tall = opts.expandY ? 2 : 1;
    var width = C64Collision.WIDTH*wide, height = C64Collision.HEIGHT*tall;
    var pixels = new Uint8Array(width*height);
    for (var row = 0; row < C64Collision.HEIGHT; row++) {
      var bits = ((bytes[row*3] || 0) << 16) | ((bytes[row*3+1] || 0) << 8)
               | (bytes[row*3+2] || 0);
      for (var col = 0; col < C64Collision.WIDTH; col++) {
        var set;
        if (opts.multicolor) {
          // a pair counts whenever it is not `00`, whichever colour it is
          set = (bits >> ((11-(col >> 1))*2)) & 3;
        } else {
          set = (bits >> (23-col)) & 1;
        }
        if (!set) { continue; }
        for (var dy = 0; dy < tall; dy++) {
          for (var dx = 0; dx < wide; dx++) {
            pixels[(row*tall+dy)*width+col*wide+dx] = 1;
          }
        }
      }
    }
    return {width: width, height: height, pixels: pixels};
  } // shapeMask

  /**
   * One sprite as the chip would put it out: its mask placed at its
   * position and cut off by the border.
   * @param {Object} sprite - `{x, y, bytes, multicolor, expandX, expandY}` in sprite coordinates.
   * @param {Object} [window] - {@link C64Collision.RASTER} by default; pass
   *   {@link C64Collision.PICTURE} to leave the border out.
   * @returns {Object|null} {x, y, width, height, pixels} clipped, or null when nothing shows.
   */
  static spriteMask(sprite, window) {
    var view = window || C64Collision.RASTER;
    var mask = C64Collision.shapeMask(sprite.bytes, sprite);
    var left = Math.max(sprite.x, view.x), right = Math.min(sprite.x+mask.width, view.x+view.width);
    var top = Math.max(sprite.y, view.y), bottom = Math.min(sprite.y+mask.height, view.y+view.height);
    if (left >= right || top >= bottom) { return null; }
    return {x: left, y: top, width: right-left, height: bottom-top,
            pixels: mask.pixels, originX: sprite.x, originY: sprite.y, stride: mask.width};
  } // spriteMask

  /**
   * Do two put-out sprites share a dot?
   * @param {Object} a - From {@link C64Collision.spriteMask}.
   * @param {Object} b - The other one.
   * @returns {boolean} True when at least one dot is set in both.
   */
  static touch(a, b) {
    var left = Math.max(a.x, b.x), right = Math.min(a.x+a.width, b.x+b.width);
    var top = Math.max(a.y, b.y), bottom = Math.min(a.y+a.height, b.y+b.height);
    for (var y = top; y < bottom; y++) {
      var rowA = (y-a.originY)*a.stride, rowB = (y-b.originY)*b.stride;
      for (var x = left; x < right; x++) {
        if (a.pixels[rowA+x-a.originX] && b.pixels[rowB+x-b.originX]) { return true; }
      }
    }
    return false;
  } // touch

  /**
   * The byte $D01E would gain from one sweep of the raster.
   *
   * ★ A sprite that is switched off in $D015 never reaches the sequencer
   * and so never collides — pass it as `null` or with `enabled: false`.
   * A sprite collides with itself as little as the chip lets it: the bit
   * is set for **both** partners of every pair that touches, and for
   * nothing else, so a single sprite alone always gives 0.
   *
   * @param {Array} sprites - Eight entries, index 0-7; each `{x, y, bytes,
   *   enabled, multicolor, expandX, expandY}` or null.
   * @param {Object} [window] - {@link C64Collision.RASTER} by default.
   * @returns {number} The bits, sprite 0 in bit 0.
   */
  static spriteSprite(sprites, window) {
    var masks = [];
    for (var i = 0; i < 8; i++) {
      var s = sprites[i];
      masks.push(s && s.enabled !== false && s.bytes
        ? C64Collision.spriteMask(s, window) : null);
    }
    var bits = 0;
    for (var a = 0; a < 8; a++) {
      if (!masks[a]) { continue; }
      for (var b = a+1; b < 8; b++) {
        if (!masks[b]) { continue; }
        if (C64Collision.touch(masks[a], masks[b])) { bits |= (1 << a) | (1 << b); }
      }
    }
    return bits;
  } // spriteSprite

  /**
   * The register itself: a latch that fills while the picture is drawn and
   * empties when it is read.
   * @returns {Object} `{value, add(bits), read(), peek()}`.
   */
  static latch() {
    return {
      /** what is in the register right now */
      value: 0,
      /** one sweep of the raster, or a part of one, has found these */
      add: function (bits) { this.value |= bits & 0xFF; return this.value; },
      /** ★ what the machine does on `LDA $D01E`: give it out **and clear it** */
      read: function () { var was = this.value; this.value = 0; return was; },
      /** for a check or a debugger — the monitor of VICE peeks the same way */
      peek: function () { return this.value; },
    };
  } // latch

} // C64Collision

// published the way every classic script is (`svision/tools/classicScript.cjs`)
if (typeof self !== 'undefined') { self.C64Collision = C64Collision; }
if (typeof module !== 'undefined' && module.exports) { module.exports = C64Collision; }
