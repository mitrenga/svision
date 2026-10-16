const { VectorDisplayList } = await import('./vectorDisplayList.js?ver='+window.srcVersion);
// begin code

/**
 * A vector font: glyphs drawn as strokes on a small grid, the way the vector
 * generator of an XY machine drew its letters — no bitmap, no browser font.
 * The font is a table, so a game replaces the built-in glyphs with the ones
 * converted from its ROM (Battlezone: `rom2vectors`) and the text entities
 * do not change.
 *
 * A glyph is `{strokes: [[x, y, x, y, ...], ...], circles: [[cx, cy, r], ...]}`
 * in grid units: `x` from 0 to `metrics.width`, `y` from 0 (top) to
 * `metrics.height` (baseline of a capital). Every glyph occupies one cell
 * `metrics.advance` wide — the fonts of the vector machines were monospace.
 *
 * `draw()` appends the strokes of a text run to a {@link VectorDisplayList}
 * as polylines (and circles), scaled so that `size` model units are the
 * height of a capital. The markup is therefore the same under Node and in
 * the browser, which is what the fingerprint of a screen stands on.
 */
export class VectorFont {

  /**
   * @param {Object} glyphs - The glyph table, keyed by character.
   * @param {Object} [metrics] - `width`, `height` (the grid of a glyph), `advance` (cell width incl. the gap), `descent` (grid units below the baseline)
   */
  constructor(glyphs, metrics) {
    this.glyphs = glyphs;
    this.metrics = Object.assign({width: 4, height: 6, advance: 6, descent: 1}, metrics || {});
    // a font that lends the glyphs this one lacks (the ROM font of a game
    // has no punctuation; the built-in one draws it, scaled to this cell)
    this.fallback = null;
  } // constructor

  /**
   * A font from the JSON a `rom2*` tool wrote: `{metrics, glyphs}`.
   * @param {Object} json
   * @param {VectorFont} [fallback] - Lends the glyphs the JSON lacks.
   * @returns {VectorFont}
   */
  static fromJSON(json, fallback) {
    var font = new VectorFont(json.glyphs, json.metrics);
    font.fallback = fallback || null;
    return font;
  } // fromJSON

  /**
   * Adds or replaces glyphs.
   * @param {Object} glyphs - Glyphs keyed by character.
   * @returns {VectorFont} this
   */
  addGlyphs(glyphs) {
    Object.keys(glyphs).forEach((ch) => { this.glyphs[ch] = glyphs[ch]; });
    return this;
  } // addGlyphs

  /**
   * Resolves a character to a glyph: the character itself, else its upper
   * case (the built-in font has capitals only), else the fallback font's
   * glyph, else `false`.
   * @param {string} ch
   * @returns {Object|false}
   */
  glyph(ch) {
    if (ch in this.glyphs) {
      return this.glyphs[ch];
    }
    var upper = ch.toUpperCase();
    if (upper in this.glyphs) {
      return this.glyphs[upper];
    }
    if (this.fallback) {
      var g = this.fallback.glyph(ch);
      if (g !== false) {
        // scaled into this font's cell: same capital height, same width
        var sx = this.metrics.width/this.fallback.metrics.width;
        var sy = this.metrics.height/this.fallback.metrics.height;
        return {
          strokes: (g.strokes || []).map((st) => st.map((v, i) => v*(i%2 == 0 ? sx : sy))),
          circles: (g.circles || []).map((c) => [c[0]*sx, c[1]*sy, c[2]*sy])
        };
      }
    }
    return false;
  } // glyph

  /**
   * The width of a text run in model units.
   * @param {string} text
   * @param {number} size - Height of a capital in model units.
   * @param {number} [spacing] - Extra gap between cells, in grid units.
   * @returns {number}
   */
  textWidth(text, size, spacing) {
    var n = String(text).length;
    if (n == 0) {
      return 0;
    }
    var scale = size/this.metrics.height;
    var advance = (this.metrics.advance+(spacing || 0))*scale;
    // the last cell counts its glyph only, not the gap behind it
    return (n-1)*advance+this.metrics.width*scale;
  } // textWidth

  /**
   * Appends a text run to a display list.
   * @param {VectorDisplayList} list
   * @param {number} x - Left edge of the run (`anchor` 'start'), its middle ('middle') or its right edge ('end').
   * @param {number} y - Top of the capitals.
   * @param {string} text
   * @param {Object} [style] - `size` (default 16), `spacing`, `anchor`, `intensity`, `color`, `strokeWidth` (default size/10), `opacity`, `className`
   * @returns {number} The x where the next run would start.
   */
  draw(list, x, y, text, style) {
    style = style || {};
    text = String(text);
    var size = 'size' in style ? style.size : 16;
    var spacing = style.spacing || 0;
    var scale = size/this.metrics.height;
    var advance = (this.metrics.advance+spacing)*scale;
    var width = this.textWidth(text, size, spacing);
    if (style.anchor == 'middle') {
      x -= width/2;
    } else if (style.anchor == 'end') {
      x -= width;
    }
    var primitiveStyle = {strokeWidth: 'strokeWidth' in style ? style.strokeWidth : size/10};
    ['intensity', 'color', 'opacity', 'className'].forEach((key) => {
      if (key in style) {
        primitiveStyle[key] = style[key];
      }
    });

    var n = VectorDisplayList.num;
    for (var i = 0; i < text.length; i++) {
      var glyph = this.glyph(text[i]);
      var cx = x+i*advance;
      if (glyph === false) {
        // a character the font does not have: a box, so the gap is visible
        var w = this.metrics.width*scale, h = this.metrics.height*scale;
        list.polygon([n(cx), n(y), n(cx+w), n(y), n(cx+w), n(y+h), n(cx), n(y+h)].map(Number), primitiveStyle);
        continue;
      }
      (glyph.strokes || []).forEach((stroke) => {
        var points = [];
        for (var p = 0; p+1 < stroke.length; p += 2) {
          points.push(Number(n(cx+stroke[p]*scale)), Number(n(y+stroke[p+1]*scale)));
        }
        list.polyline(points, primitiveStyle);
      });
      (glyph.circles || []).forEach((c) => {
        list.circle(Number(n(cx+c[0]*scale)), Number(n(y+c[1]*scale)), Number(n(c[2]*scale)), primitiveStyle);
      });
    }
    return x+text.length*advance;
  } // draw

  /**
   * The built-in font: capitals, digits and the punctuation a menu needs,
   * on a 4x6 grid with a 2 unit gap (cell 6 wide). One instance, shared.
   * @returns {VectorFont}
   */
  static simple() {
    if (!VectorFont.simpleFont) {
      VectorFont.simpleFont = new VectorFont(VectorFont.simpleGlyphs());
    }
    return VectorFont.simpleFont;
  } // simple

  /**
   * The glyph table of the built-in font. Strokes are flat point lists on the
   * 4x6 grid (x 0-4, y 0-6, y down); a descender goes to y 7.
   * @returns {Object}
   */
  static simpleGlyphs() {
    var s = (strokes) => ({strokes: strokes});
    var O = [1,0, 3,0, 4,1, 4,5, 3,6, 1,6, 0,5, 0,1, 1,0];
    var P = [0,6, 0,0, 3,0, 4,1, 4,2, 3,3, 0,3];
    return {
      ' ': s([]),
      'A': s([[0,6, 0,2, 2,0, 4,2, 4,6], [0,4, 4,4]]),
      'B': s([[0,6, 0,0, 3,0, 4,1, 4,2, 3,3, 0,3], [3,3, 4,4, 4,5, 3,6, 0,6]]),
      'C': s([[4,1, 3,0, 1,0, 0,1, 0,5, 1,6, 3,6, 4,5]]),
      'D': s([[0,6, 0,0, 3,0, 4,1, 4,5, 3,6, 0,6]]),
      'E': s([[4,0, 0,0, 0,6, 4,6], [0,3, 3,3]]),
      'F': s([[4,0, 0,0, 0,6], [0,3, 3,3]]),
      'G': s([[4,1, 3,0, 1,0, 0,1, 0,5, 1,6, 3,6, 4,5, 4,3, 2,3]]),
      'H': s([[0,0, 0,6], [4,0, 4,6], [0,3, 4,3]]),
      'I': s([[1,0, 3,0], [2,0, 2,6], [1,6, 3,6]]),
      'J': s([[4,0, 4,5, 3,6, 1,6, 0,5]]),
      'K': s([[0,0, 0,6], [4,0, 0,4], [1,3, 4,6]]),
      'L': s([[0,0, 0,6, 4,6]]),
      'M': s([[0,6, 0,0, 2,3, 4,0, 4,6]]),
      'N': s([[0,6, 0,0, 4,6, 4,0]]),
      'O': s([O]),
      'P': s([P]),
      'Q': s([O, [2,4, 4,6]]),
      'R': s([P, [2,3, 4,6]]),
      'S': s([[4,1, 3,0, 1,0, 0,1, 0,2, 1,3, 3,3, 4,4, 4,5, 3,6, 1,6, 0,5]]),
      'T': s([[0,0, 4,0], [2,0, 2,6]]),
      'U': s([[0,0, 0,5, 1,6, 3,6, 4,5, 4,0]]),
      'V': s([[0,0, 2,6, 4,0]]),
      'W': s([[0,0, 1,6, 2,2, 3,6, 4,0]]),
      'X': s([[0,0, 4,6], [4,0, 0,6]]),
      'Y': s([[0,0, 2,3, 4,0], [2,3, 2,6]]),
      'Z': s([[0,0, 4,0, 0,6, 4,6]]),
      '0': s([O, [0,5, 4,1]]),
      '1': s([[1,1, 2,0, 2,6], [1,6, 3,6]]),
      '2': s([[0,1, 1,0, 3,0, 4,1, 4,2, 0,6, 4,6]]),
      '3': s([[0,0, 4,0, 2,3, 3,3, 4,4, 4,5, 3,6, 1,6, 0,5]]),
      '4': s([[3,6, 3,0, 0,4, 4,4]]),
      '5': s([[4,0, 0,0, 0,3, 3,3, 4,4, 4,5, 3,6, 0,6]]),
      '6': s([[4,0, 1,0, 0,1, 0,5, 1,6, 3,6, 4,5, 4,4, 3,3, 0,3]]),
      '7': s([[0,0, 4,0, 1,6]]),
      '8': s([[1,3, 0,2, 0,1, 1,0, 3,0, 4,1, 4,2, 3,3, 1,3, 0,4, 0,5, 1,6, 3,6, 4,5, 4,4, 3,3]]),
      '9': s([[0,6, 3,6, 4,5, 4,1, 3,0, 1,0, 0,1, 0,2, 1,3, 4,3]]),
      '.': s([[1.5,6, 2.5,6]]),
      ',': s([[2,5.5, 1,7]]),
      ':': s([[2,1.5, 2,2.5], [2,4.5, 2,5.5]]),
      ';': s([[2,1.5, 2,2.5], [2,5, 1,6.5]]),
      '!': s([[2,0, 2,4], [1.5,6, 2.5,6]]),
      '?': s([[0,1, 1,0, 3,0, 4,1, 4,2, 2,3, 2,4], [1.5,6, 2.5,6]]),
      '-': s([[1,3, 3,3]]),
      '+': s([[2,1, 2,5], [0,3, 4,3]]),
      '=': s([[0,2, 4,2], [0,4, 4,4]]),
      '/': s([[0,6, 4,0]]),
      '\\': s([[0,0, 4,6]]),
      '(': s([[3,0, 2,1, 2,5, 3,6]]),
      ')': s([[1,0, 2,1, 2,5, 1,6]]),
      '[': s([[3,0, 1,0, 1,6, 3,6]]),
      ']': s([[1,0, 3,0, 3,6, 1,6]]),
      '<': s([[4,0, 0,3, 4,6]]),
      '>': s([[0,0, 4,3, 0,6]]),
      '\'': s([[2,0, 2,2]]),
      '"': s([[1,0, 1,2], [3,0, 3,2]]),
      '*': s([[2,1, 2,5], [0,2, 4,4], [4,2, 0,4]]),
      '_': s([[0,6, 4,6]]),
      '#': s([[1,0, 1,6], [3,0, 3,6], [0,2, 4,2], [0,4, 4,4]]),
      '%': s([[0,6, 4,0], [0,0, 1,0, 1,1, 0,1, 0,0], [3,5, 4,5, 4,6, 3,6, 3,5]]),
      '&': s([[4,6, 0,2, 0,1, 1,0, 2,0, 3,1, 3,2, 0,4, 0,5, 1,6, 2,6, 4,3]]),
      '©': {strokes: [[3,2, 2,1.5, 1,2.5, 1,3.5, 2,4.5, 3,4]], circles: [[2,3, 3]]}
    };
  } // simpleGlyphs

} // VectorFont

VectorFont.simpleFont = null;
