const { VectorDisplayList } = await import('./vectorDisplayList.js?ver='+window.srcVersion);
// begin code

/**
 * The base class of a vector font: glyphs drawn as strokes on a small grid,
 * the way the vector generator of an XY machine drew its letters — no
 * bitmap, no browser font. It holds the metrics and the table and knows how
 * to measure and draw; the glyphs come from a subclass — AtariVectorFont
 * (the glyphs of Atari's vector ROMs, 8x12) or VectorFont4x6 (the
 * library's own small font) — the way AbstractFonts and ZXFonts8x8 do it on
 * the raster. There is no default font: an application that writes text on
 * the vector platform sets `app.fonts.vector`, and the text entities and
 * the dialogs take it from there (or a `font` option).
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
export class AbstractVectorFont {

  /**
   * @param {Object} glyphs - The glyph table, keyed by character (a subclass passes its own).
   * @param {Object} [metrics] - `width`, `height` (the grid of a glyph), `advance` (cell width incl. the gap), `descent` (grid units below the baseline); 8x12 when omitted
   */
  constructor(glyphs, metrics) {
    this.glyphs = glyphs || {};
    this.metrics = Object.assign({width: 8, height: 12, advance: 12, descent: 2}, metrics || {});
  } // constructor

  /**
   * Adds or replaces glyphs.
   * @param {Object} glyphs - Glyphs keyed by character.
   * @returns {AbstractVectorFont} this
   */
  addGlyphs(glyphs) {
    Object.keys(glyphs).forEach((ch) => { this.glyphs[ch] = glyphs[ch]; });
    return this;
  } // addGlyphs

  /**
   * Resolves a character to a glyph: the character itself, else its upper
   * case (the fonts of the vector ROMs have capitals only), else `false`.
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
        // a character the font does not have: a box, so the gap is visible — hairline and
        // dim, so it is not taken for the 0 of the Atari ROM, which is the same rectangle
        var w = this.metrics.width*scale, h = this.metrics.height*scale;
        var boxStyle = Object.assign({}, primitiveStyle, {strokeWidth: primitiveStyle.strokeWidth/4, intensity: 6});
        list.polygon([n(cx), n(y), n(cx+w), n(y), n(cx+w), n(y+h), n(cx), n(y+h)].map(Number), boxStyle);
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
   * The vector font of an application (`app.fonts.vector`); throws when the
   * application has none, as a text without a font is a mistake, not a
   * fallback.
   * @param {Object} app
   * @returns {AbstractVectorFont}
   */
  static ofApp(app) {
    if (app && app.fonts && app.fonts.vector) {
      return app.fonts.vector;
    }
    throw new Error('AbstractVectorFont: the application has no fonts.vector (R-063)');
  } // ofApp

} // AbstractVectorFont

