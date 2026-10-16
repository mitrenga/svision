// begin code

/**
 * A display list: the ordered list of vector primitives one entity shows.
 * It is the vector counterpart of a video memory (R-017) — the model of what
 * the vector generator of the machine was told to draw, kept without any DOM
 * so a tool can build it, compare it and serialise it under Node.
 *
 * Every primitive is a plain object `{type, ...geometry, ...style}`. Styles
 * are `color` (stroke), `fill`, `strokeWidth` (in model units),
 * `intensity` (0–15, the beam intensity of an XY monitor; 15 is full) and
 * `opacity`. Every change bumps `version`, so a layout re-emits the markup
 * only when something moved. `markup()` renders the primitives as SVG
 * elements and `toSVG()` wraps them into a stand-alone document — the same
 * string in the browser and under Node, so a `match*` tool can diff it.
 */
export class VectorDisplayList {

  /**
   * Creates an empty display list.
   */
  constructor() {
    this.items = [];
    this.version = 0;
    this.defaults = {color: '#ffffff', fill: 'none', strokeWidth: 1, intensity: 15, opacity: 1};
  } // constructor

  /**
   * Removes every primitive.
   * @returns {VectorDisplayList} this
   */
  clear() {
    if (this.items.length > 0) {
      this.items = [];
      this.version++;
    }
    return this;
  } // clear

  /**
   * Appends a primitive. Missing style keys are filled from `defaults`.
   * @param {Object} item - The primitive (`type` plus its geometry and style).
   * @returns {VectorDisplayList} this
   */
  push(item) {
    this.items.push(Object.assign({}, this.defaults, item));
    this.version++;
    return this;
  } // push

  /**
   * Appends a straight line.
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {Object} [style] - color, strokeWidth, intensity, opacity
   * @returns {VectorDisplayList} This
   */
  line(x1, y1, x2, y2, style) {
    return this.push(Object.assign({type: 'line', x1: x1, y1: y1, x2: x2, y2: y2}, style));
  } // line

  /**
   * Appends an open polyline. Points are a flat array `[x, y, x, y, ...]`.
   * @param {number[]} points
   * @param {Object} [style] - color, strokeWidth, intensity, opacity, close
   * @returns {VectorDisplayList} This
   */
  polyline(points, style) {
    return this.push(Object.assign({type: 'polyline', points: points.slice()}, style));
  } // polyline

  /**
   * Appends a closed polygon. Points are a flat array `[x, y, x, y, ...]`.
   * @param {number[]} points
   * @param {Object} [style] - color, fill, strokeWidth, intensity, opacity
   * @returns {VectorDisplayList} This
   */
  polygon(points, style) {
    return this.push(Object.assign({type: 'polygon', points: points.slice()}, style));
  } // polygon

  /**
   * Appends a rectangle.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {Object} [style] - color, fill, strokeWidth, intensity, opacity, radius
   * @returns {VectorDisplayList} This
   */
  rect(x, y, width, height, style) {
    return this.push(Object.assign({type: 'rect', x: x, y: y, width: width, height: height}, style));
  } // rect

  /**
   * Appends a circle.
   * @param {number} cx
   * @param {number} cy
   * @param {number} r
   * @param {Object} [style] - color, fill, strokeWidth, intensity, opacity
   * @returns {VectorDisplayList} This
   */
  circle(cx, cy, r, style) {
    return this.push(Object.assign({type: 'circle', cx: cx, cy: cy, r: r}, style));
  } // circle

  /**
   * Appends a text run drawn with the browser's font engine. A game with a
   * vector font of its own draws the glyphs as polylines instead.
   * @param {number} x
   * @param {number} y - The baseline.
   * @param {string} text
   * @param {Object} [style] - color (fill of the glyphs), size, font, anchor ('start'|'middle'|'end'), weight
   * @returns {VectorDisplayList} This
   */
  text(x, y, text, style) {
    return this.push(Object.assign({type: 'text', x: x, y: y, text: String(text), size: 12, font: 'monospace', anchor: 'start', weight: 'normal'}, style));
  } // text

  /**
   * Appends an SVG path (the `d` attribute syntax).
   * @param {string} d
   * @param {Object} [style] - color, fill, strokeWidth, intensity, opacity
   * @returns {VectorDisplayList} This
   */
  path(d, style) {
    return this.push(Object.assign({type: 'path', d: d}, style));
  } // path

  /**
   * Appends every primitive of another list, translated by (dx, dy).
   * @param {VectorDisplayList} other
   * @param {number} [dx]
   * @param {number} [dy]
   * @returns {VectorDisplayList} This
   */
  append(other, dx, dy) {
    dx = dx || 0;
    dy = dy || 0;
    other.items.forEach((item) => this.push(VectorDisplayList.translate(item, dx, dy)));
    return this;
  } // append

  /**
   * Returns a copy of a primitive moved by (dx, dy).
   * @param {Object} item
   * @param {number} dx
   * @param {number} dy
   * @returns {Object}
   */
  static translate(item, dx, dy) {
    var t = Object.assign({}, item);
    switch (item.type) {
      case 'line':
        t.x1 += dx; t.y1 += dy; t.x2 += dx; t.y2 += dy;
        break;
      case 'polyline':
      case 'polygon':
        t.points = item.points.map((v, i) => v+(i%2 == 0 ? dx : dy));
        break;
      case 'rect':
      case 'text':
        t.x += dx; t.y += dy;
        break;
      case 'circle':
        t.cx += dx; t.cy += dy;
        break;
      case 'path':
        // a path is moved by its transform, not by rewriting its data
        t.transform = 'translate('+VectorDisplayList.num(dx)+' '+VectorDisplayList.num(dy)+')'+(item.transform ? ' '+item.transform : '');
        break;
    }
    return t;
  } // translate

  /**
   * Returns the bounding box of the geometry (texts and paths count by their
   * anchor point only), or false for an empty list.
   * @returns {{x: number, y: number, width: number, height: number}|false}
   */
  bounds() {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var take = (x, y) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    this.items.forEach((item) => {
      switch (item.type) {
        case 'line': take(item.x1, item.y1); take(item.x2, item.y2); break;
        case 'polyline':
        case 'polygon': for (var i = 0; i+1 < item.points.length; i += 2) take(item.points[i], item.points[i+1]); break;
        case 'rect': take(item.x, item.y); take(item.x+item.width, item.y+item.height); break;
        case 'circle': take(item.cx-item.r, item.cy-item.r); take(item.cx+item.r, item.cy+item.r); break;
        case 'text': take(item.x, item.y); break;
        case 'path': break;
      }
    });
    if (minX === Infinity) {
      return false;
    }
    return {x: minX, y: minY, width: maxX-minX, height: maxY-minY};
  } // bounds

  /**
   * Counts the primitives that differ between this list and another one —
   * by position, so a swapped pair counts as two. The report of a `match*`
   * tool stands on this number.
   * @param {VectorDisplayList} other
   * @returns {number}
   */
  differences(other) {
    var count = Math.abs(this.items.length-other.items.length);
    var n = Math.min(this.items.length, other.items.length);
    for (var i = 0; i < n; i++) {
      if (VectorDisplayList.element(this.items[i]) !== VectorDisplayList.element(other.items[i])) {
        count++;
      }
    }
    return count;
  } // differences

  /**
   * Formats a number for markup: at most three decimals, no trailing zeros.
   * @param {number} v
   * @returns {string}
   */
  static num(v) {
    return String(Math.round(v*1000)/1000);
  } // num

  /**
   * Escapes text for an XML text node or attribute.
   * @param {string} s
   * @returns {string}
   */
  static escape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  } // escape

  /**
   * Renders the style keys of a primitive as SVG presentation attributes.
   * Intensity below 15 lowers the opacity, as a dimmer beam would.
   * @param {Object} item
   * @returns {string}
   */
  static styleAttributes(item) {
    var s = '';
    var opacity = item.opacity*(item.intensity/15);
    if (item.type == 'text') {
      s += ' fill="'+item.color+'"';
      s += ' font-family="'+VectorDisplayList.escape(item.font)+'" font-size="'+VectorDisplayList.num(item.size)+'"';
      if (item.anchor != 'start') s += ' text-anchor="'+item.anchor+'"';
      if (item.weight != 'normal') s += ' font-weight="'+item.weight+'"';
    } else {
      s += ' stroke="'+item.color+'" stroke-width="'+VectorDisplayList.num(item.strokeWidth)+'" fill="'+item.fill+'"';
      if (item.type == 'line' || item.type == 'polyline' || item.type == 'polygon' || item.type == 'path') {
        s += ' stroke-linecap="round" stroke-linejoin="round"';
      }
    }
    if (opacity < 1) s += ' opacity="'+VectorDisplayList.num(opacity)+'"';
    if (item.transform) s += ' transform="'+VectorDisplayList.escape(item.transform)+'"';
    if (item.className) s += ' class="'+VectorDisplayList.escape(item.className)+'"';
    return s;
  } // styleAttributes

  /**
   * Renders one primitive as an SVG element.
   * @param {Object} item
   * @returns {string}
   */
  static element(item) {
    var n = VectorDisplayList.num;
    var a = VectorDisplayList.styleAttributes(item);
    switch (item.type) {
      case 'line':
        return '<line x1="'+n(item.x1)+'" y1="'+n(item.y1)+'" x2="'+n(item.x2)+'" y2="'+n(item.y2)+'"'+a+'/>';
      case 'polyline':
      case 'polygon':
        var pts = [];
        for (var i = 0; i+1 < item.points.length; i += 2) {
          pts.push(n(item.points[i])+','+n(item.points[i+1]));
        }
        return '<'+item.type+' points="'+pts.join(' ')+'"'+a+'/>';
      case 'rect':
        return '<rect x="'+n(item.x)+'" y="'+n(item.y)+'" width="'+n(item.width)+'" height="'+n(item.height)+'"'+(item.radius ? ' rx="'+n(item.radius)+'"' : '')+a+'/>';
      case 'circle':
        return '<circle cx="'+n(item.cx)+'" cy="'+n(item.cy)+'" r="'+n(item.r)+'"'+a+'/>';
      case 'text':
        return '<text x="'+n(item.x)+'" y="'+n(item.y)+'"'+a+'>'+VectorDisplayList.escape(item.text)+'</text>';
      case 'path':
        return '<path d="'+VectorDisplayList.escape(item.d)+'"'+a+'/>';
    }
    return '';
  } // element

  /**
   * Renders the primitives as SVG elements, one per line, without a root.
   * @returns {string}
   */
  markup() {
    return this.items.map(VectorDisplayList.element).join('\n');
  } // markup

  /**
   * Renders a stand-alone SVG document.
   * @param {Object} [options] - width, height (the viewBox; defaults to the bounds), background (fill of the whole document, or false)
   * @returns {string}
   */
  toSVG(options) {
    options = options || {};
    var b = this.bounds() || {x: 0, y: 0, width: 0, height: 0};
    var width = 'width' in options ? options.width : b.x+b.width;
    var height = 'height' in options ? options.height : b.y+b.height;
    var n = VectorDisplayList.num;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+n(width)+' '+n(height)+'">\n';
    if (options.background) {
      s += '<rect width="100%" height="100%" fill="'+options.background+'"/>\n';
    }
    s += this.markup()+'\n</svg>\n';
    return s;
  } // toSVG

} // VectorDisplayList
