const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
const { VectorDisplayList } = await import('../vector/vectorDisplayList.js?ver='+window.srcVersion);
// begin code

/**
 * The layout of the WebGL2 platform without a DOM and without GL: what the
 * browser layout would draw, recorded instead. A tool under Node draws a
 * model through it and reads `markup()` — the backgrounds the entities
 * paint on the 2D overlay, the rasters (a text entity's text, not its
 * pixels) and, for every {@link SceneEntity}, the scene's own markup — so
 * a frame has a fingerprint (`regress*`) that never depends on a GPU, and
 * `toSVG()` makes a picture of it through {@link Scene3D#project}.
 *
 * The element size is pretended (`clientWidth`, `clientHeight`); the fit —
 * the ratio and the border — is the static `fitModel` here, which
 * `WebGL2Layout.resizeModel` calls too, so the numbers of a frame under
 * Node are the numbers of the same window in the browser.
 */
export class Scene3DHeadlessLayout extends AbstractLayout {

  /**
   * @param {Object} app - A stand-in application (`platform`, `stack`; see tools/headlessApp.mjs).
   * @param {number} clientWidth - The pretended element width in CSS pixels.
   * @param {number} clientHeight - The pretended element height in CSS pixels.
   */
  constructor(app, clientWidth, clientHeight) {
    super(app);
    this.id = 'Scene3DHeadlessLayout';
    this.clientWidth = clientWidth;
    this.clientHeight = clientHeight;
    this.ratio = 1;
    this.pixelRatio = 1;
    this.records = [];   // the frame: {kind: 'rect'|'raster'|'scene', ...}
  } // constructor

  /**
   * Fits the model into the pretended element.
   * @param {AbstractModel} model
   */
  resizeModel(model) {
    var options = this.app.platform.options || {};
    Scene3DHeadlessLayout.fitModel(this, model, this.clientWidth, this.clientHeight, options.fit);
  } // resizeModel

  /**
   * The fit of a logical desktop into an element. The ratio is the rule of
   * the ZX and arcade layouts: the smaller of the two, a whole number from
   * 2× up (pixel-art HUD stays sharp), never below 1. Then either
   * `'contain'` — the desktop keeps its size and the border takes the rest
   * (bands on a window of another aspect) — or `'cover'`: the desktop grows
   * to the whole element (`client / ratio`, rounded up), the border is
   * zero, and the model lays its HUD out by `desktopWidth`/`desktopHeight`
   * as they come — a 3D picture has no native size, only the HUD's grid
   * matters. Sets `layout.ratio`, the desktop size and places the border
   * and desktop entities. `WebGL2Layout.resizeModel` calls this before
   * touching the DOM.
   * @param {AbstractLayout} layout
   * @param {AbstractModel} model
   * @param {number} clientWidth
   * @param {number} clientHeight
   * @param {string} [fit] - 'contain' (default) or 'cover'.
   */
  static fitModel(layout, model, clientWidth, clientHeight, fit) {
    var ratio = clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yRatio = clientHeight/(model.desktopHeight+2*model.minimalBorder);
    if (yRatio < ratio) {
      ratio = yRatio;
    }
    if (ratio >= 2) {
      ratio = Math.floor(ratio);
    }
    if (ratio < 1) {
      ratio = 1;
    }
    layout.ratio = ratio;

    if (fit == 'cover') {
      model.desktopWidth = Math.ceil(clientWidth/ratio);
      model.desktopHeight = Math.ceil(clientHeight/ratio);
      model.borderWidth = 0;
      model.borderHeight = 0;
    } else {
      model.borderWidth = Math.ceil((clientWidth-model.desktopWidth*ratio)/2/ratio);
      model.borderHeight = Math.ceil((clientHeight-model.desktopHeight*ratio)/2/ratio);
      if (model.borderWidth < 0) model.borderWidth = 0;
      if (model.borderHeight < 0) model.borderHeight = 0;
    }

    var width = model.desktopWidth+2*model.borderWidth;
    var height = model.desktopHeight+2*model.borderHeight;
    if (model.borderEntity != null) {
      model.borderEntity.x = 0;
      model.borderEntity.y = 0;
      model.borderEntity.width = width;
      model.borderEntity.height = height;
      model.borderEntity.parentWidth = width;
      model.borderEntity.parentHeight = height;
    }
    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = width;
    model.desktopEntity.parentHeight = height;
  } // fitModel

  /**
   * Starts a frame: forgets the previous one.
   */
  clearCanvas() {
    this.records = [];
  } // clearCanvas

  /**
   * The four strips of the border around the desktop (left, right, top,
   * bottom; empty ones left out), in layout units. The border entity of
   * the 3D platform paints these and not its whole rectangle: the desktop
   * does not repaint the middle (its background is false so the 3D picture
   * shows through), so a full border would cover the GL canvas.
   * @param {AbstractModel} model
   * @returns {Array.<{x: number, y: number, width: number, height: number}>}
   */
  static borderStrips(model) {
    var d = model.desktopEntity;
    var w = d.parentWidth, h = d.parentHeight;
    var strips = [
      {x: 0, y: 0, width: d.x, height: h},
      {x: d.x+d.width, y: 0, width: w-d.x-d.width, height: h},
      {x: d.x, y: 0, width: d.width, height: d.y},
      {x: d.x, y: d.y+d.height, width: d.width, height: h-d.y-d.height}
    ];
    return strips.filter((r) => r.width > 0 && r.height > 0);
  } // borderStrips

  /**
   * A filled rectangle of an entity (its background) on the 2D overlay;
   * the border entity paints only its strips (see borderStrips).
   * @param {AbstractEntity} entity - The entity providing the coordinate origin.
   * @param {number} x - X offset relative to the entity.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paint(entity, x, y, width, height, color) {
    var model = this.app.model;
    if (model && entity === model.borderEntity && model.desktopEntity) {
      Scene3DHeadlessLayout.borderStrips(model).forEach((r) => this.records.push({kind: 'rect', x: r.x, y: r.y, width: r.width, height: r.height, color: color}));
      return;
    }
    this.records.push({kind: 'rect', x: entity.parentX+entity.x+x, y: entity.parentY+entity.y+y, width: width, height: height, color: color});
  } // paint

  /**
   * Same as `paint` — the caller clipped the rectangle already.
   * @param {AbstractEntity} entity - The entity providing the coordinate origin and bounds.
   * @param {number} x - X offset relative to the entity.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Rectangle width.
   * @param {number} height - Rectangle height.
   * @param {string} color - Fill color.
   */
  paintWithVisibility(entity, x, y, width, height, color) {
    this.paint(entity, x, y, width, height, color);
  } // paintWithVisibility

  /**
   * An entity's scene: recorded with the entity's rectangle, its markup
   * comes out line by line after it.
   * @param {AbstractEntity} entity
   * @param {Scene3D} scene
   */
  paintScene(entity, scene) {
    this.records.push({kind: 'scene', id: entity.id, x: entity.parentX+entity.x, y: entity.parentY+entity.y, width: entity.width, height: entity.height, scene: scene});
  } // paintScene

  /**
   * A display list of an entity (a VectorEntity on the overlay), translated
   * to the entity.
   * @param {AbstractEntity} entity
   * @param {VectorDisplayList} list
   */
  paintDisplayList(entity, list) {
    this.records.push({kind: 'list', id: entity.id, x: entity.parentX+entity.x, y: entity.parentY+entity.y, list: list});
  } // paintDisplayList

  /**
   * A drawing cache without a canvas: a RasterEntity (TextEntity included)
   * paints its frame into plain bytes it never blits — `paintCache` records
   * the entity instead. Hex colours only (`RasterEntity.colorValue` asks a
   * canvas for the others).
   * @param {AbstractEntity} entity
   * @param {number} index
   */
  newDrawingCache(entity, index) {
    entity.drawingCache[index] = Scene3DHeadlessLayout.standInCache();
  } // newDrawingCache

  /**
   * See newDrawingCache.
   */
  newDrawingCropCache(entity) {
    entity.drawingCropCache = Scene3DHeadlessLayout.standInCache();
  } // newDrawingCropCache

  /**
   * The stand-in for a DrawingCache: the same `preparePaint`/`cleanCache`
   * contract, a `ctx` that makes ImageData-shaped objects and swallows the
   * rest.
   * @returns {Object}
   */
  static standInCache() {
    var cache = {
      id: 'HeadlessDrawingCache',
      canvas: {width: 0, height: 0},
      clean: false,
      ctx: {
        createImageData(w, h) { return {width: w, height: h, data: new Uint8ClampedArray(w*h*4)}; },
        putImageData() {},
        clearRect() {},
        drawImage() {},
        fillRect() {}
      },
      init(width, height) { this.canvas.width = width; this.canvas.height = height; },
      cleanCache() { this.clean = true; },
      preparePaint(width, height) {
        if (this.canvas.width != width || this.canvas.height != height) {
          this.init(width, height);
          return true;
        }
        if (this.clean) {
          this.clean = false;
          return true;
        }
        return false;
      }
    };
    return cache;
  } // standInCache

  /**
   * A raster blitted whole: recorded as the entity, its text and rectangle.
   * @param {AbstractEntity} entity - The entity whose cache is drawn.
   * @param {number} index - The cache slot index to draw.
   */
  paintCache(entity, index) {
    this.records.push({kind: 'raster', id: entity.id, text: entity.text, x: entity.parentX+entity.x, y: entity.parentY+entity.y, width: entity.width, height: entity.height});
  } // paintCache

  /**
   * A raster blitted cropped: recorded like a whole one, with the offset.
   * @param {AbstractEntity} entity - The entity whose cache is drawn.
   * @param {number} index - The cache slot index to draw.
   * @param {number} posX - X offset into the source cache image.
   * @param {number} posY - Y offset into the source cache image.
   * @param {number} moveX - Additional X offset applied to the destination position.
   * @param {number} moveY - Additional Y offset applied to the destination position.
   */
  paintCropCache(entity, index, posX, posY, moveX, moveY) {
    this.records.push({kind: 'raster', id: entity.id, text: entity.text, x: entity.parentX+entity.x+moveX, y: entity.parentY+entity.y+moveY, width: entity.width, height: entity.height});
  } // paintCropCache

  /**
   * A tinted part of a raster: recorded with the colour.
   * @param {AbstractEntity} entity - The entity whose cache is drawn.
   * @param {number} index - The cache slot index.
   * @param {Object} rect - {x, y, width, height} of the part, relative to the entity, in logical pixels.
   * @param {string} color - The colour every opaque pixel of the part is painted in.
   */
  paintCacheTinted(entity, index, rect, color) {
    this.records.push({kind: 'raster', id: entity.id, text: entity.text, x: entity.parentX+entity.x+rect.x, y: entity.parentY+entity.y+rect.y, width: rect.width, height: rect.height, color: color});
  } // paintCacheTinted

  /**
   * An image: recorded by its rectangle.
   * @param {AbstractEntity} entity - The entity the position is relative to.
   * @param {HTMLImageElement} image - A loaded image (unused beyond its place).
   * @param {number} x - X offset relative to the entity, in logical pixels.
   * @param {number} y - Y offset relative to the entity.
   * @param {number} width - Width in logical pixels.
   * @param {number} height - Height in logical pixels.
   */
  paintImage(entity, image, x, y, width, height) {
    this.records.push({kind: 'image', x: entity.parentX+entity.x+x, y: entity.parentY+entity.y+y, width: width, height: height});
  } // paintImage

  /**
   * The frame as text: one line per record, a scene's markup after its line.
   * @returns {string}
   */
  markup() {
    var lines = [];
    this.records.forEach((r) => {
      var head = Object.assign({}, r);
      delete head.scene;
      delete head.list;
      lines.push(JSON.stringify(head));
      if (r.kind == 'scene') {
        lines.push(r.scene.markup());
      }
      if (r.kind == 'list') {
        lines.push(r.list.markup());
      }
    });
    return lines.join('\n');
  } // markup

  /**
   * The frame as a display list: the rectangles, the scenes projected into
   * their viewports, the rasters as outlined boxes with their text.
   * @returns {VectorDisplayList}
   */
  toDisplayList() {
    var list = new VectorDisplayList();
    this.records.forEach((r) => {
      switch (r.kind) {
        case 'rect':
          list.rect(r.x, r.y, r.width, r.height, {color: 'none', fill: r.color, strokeWidth: 0});
          break;
        case 'scene':
          list.rect(r.x, r.y, r.width, r.height, {color: 'none', fill: r.scene.background, strokeWidth: 0});
          list.append(r.scene.project(r.width, r.height), r.x, r.y);
          break;
        case 'list':
          list.append(r.list, r.x, r.y);
          break;
        case 'raster':
          list.rect(r.x, r.y, r.width, r.height, {color: '#808080', strokeWidth: 0.5});
          if (r.text) {
            // one text run per line, sized so the lines fit the raster's height
            var rows = String(r.text).split('\n');
            var size = Math.max(4, Math.floor(r.height/rows.length)-1);
            rows.forEach((row, i) => list.text(r.x+1, r.y+size*(i+1), row, {size: size, color: r.color || '#ffffff'}));
          }
          break;
        case 'image':
          list.rect(r.x, r.y, r.width, r.height, {color: '#808080', strokeWidth: 0.5});
          break;
      }
    });
    return list;
  } // toDisplayList

  /**
   * The frame as a stand-alone SVG document of the model's size.
   * @param {string|false} [background] - Fill behind everything, default the platform's.
   * @returns {string}
   */
  toSVG(background) {
    if (background === undefined) {
      background = this.app.platform.options ? this.app.platform.options.background : false;
    }
    var model = this.app.model;
    var width = model ? model.desktopWidth+2*model.borderWidth : this.clientWidth;
    var height = model ? model.desktopHeight+2*model.borderHeight : this.clientHeight;
    return this.toDisplayList().toSVG({width: width, height: height, background: background});
  } // toSVG

  /**
   * Model units from pretended client coordinates.
   * @param {number} clientX - The client X coordinate.
   * @returns {number} The corresponding model X coordinate.
   */
  convertClientCoordinateX(clientX) {
    return Math.round(clientX/this.ratio);
  } // convertClientCoordinateX

  /**
   * Model units from pretended client coordinates.
   * @param {number} clientY - The client Y coordinate.
   * @returns {number} The corresponding model Y coordinate.
   */
  convertClientCoordinateY(clientY) {
    return Math.round(clientY/this.ratio);
  } // convertClientCoordinateY

} // Scene3DHeadlessLayout
