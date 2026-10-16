const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Layout of the vector platform. The application element holds one `<svg>`
 * whose `viewBox` is the model (desktop plus border) in model units; the
 * browser scales it to the element with `preserveAspectRatio` — there is no
 * integer ratio and no native resolution, a vector monitor had none either.
 *
 * Drawing is retained, not immediate: the entity tree still "paints" every
 * time the model draws, but a paint call claims the next node of a pool
 * (`<rect>` for a background, `<g>` for a display list) and only touches
 * attributes that changed. `clearCanvas()` starts a frame; the nodes the
 * previous frame did not reach are dropped there. Order of the calls is the
 * z-order, as on the canvas.
 *
 * Phase 0 has no drawing caches: a {@link RasterEntity} (TextEntity included)
 * cannot be placed on this layout yet — it throws a clear error instead of
 * failing quietly. Text is a primitive of the display list.
 */
export class VectorLayout extends AbstractLayout {

  /**
   * @param {Object} app - The owning application.
   */
  constructor(app) {
    super(app);
    this.id = 'VectorLayout';
    this.ratio = 1;          // CSS pixels per model unit, for coordinate conversion only
    this.offsetX = 0;        // where the viewBox starts inside the element (meet letterboxing)
    this.offsetY = 0;
    this.pool = [];          // retained nodes in z-order
    this.cursor = 0;         // next pool slot this frame
    this.viewBox = {width: 0, height: 0};
  } // constructor

  /**
   * The `<svg>` root the platform created.
   * @returns {SVGSVGElement}
   */
  svg() {
    return this.app.stack.svg;
  } // svg

  /**
   * The element the retained nodes go into: the content group under the
   * overlay, or the root itself.
   * @returns {Element}
   */
  content() {
    return this.app.stack.svgContent || this.app.stack.svg;
  } // content

  /**
   * The element for a layer: 'top' is the group above the overlay (the
   * content group when the platform has none), anything else the content.
   * @param {string} layer
   * @returns {Element}
   */
  layerElement(layer) {
    if (layer == 'top' && this.app.stack.svgTop) {
      return this.app.stack.svgTop;
    }
    return this.content();
  } // layerElement

  /**
   * Fits the desktop into the element: the border grows on the axis with room
   * to spare (the same rule as the canvas 2D layout), the viewBox becomes the
   * whole model and the ratio is remembered for the pointer.
   * @param {AbstractModel} model
   */
  resizeModel(model) {
    var box = this.app.element.getBoundingClientRect();
    this.fitModel(model, Math.max(1, box.width), Math.max(1, box.height));
    this.svg().setAttribute('viewBox', '0 0 '+this.viewBox.width+' '+this.viewBox.height);
    if (this.app.stack.svgOverlay) {
      this.placeOverlay(model);
    }
  } // resizeModel

  /**
   * The fit itself, without the DOM: the border, the viewBox, the ratio and
   * the offsets for a given element size, and the border and desktop
   * entities placed. A headless layout calls this with the size it pretends
   * to have.
   * @param {AbstractModel} model
   * @param {number} clientWidth - The element's width in CSS pixels.
   * @param {number} clientHeight - The element's height in CSS pixels.
   */
  fitModel(model, clientWidth, clientHeight) {
    super.resizeModel(model);

    var xRatio = clientWidth/(model.desktopWidth+2*model.minimalBorder);
    var yRatio = clientHeight/(model.desktopHeight+2*model.minimalBorder);

    if (yRatio < xRatio) {
      model.borderHeight = model.minimalBorder;
      model.borderWidth = Math.round((clientWidth/yRatio-model.desktopWidth)/2);
    } else {
      model.borderWidth = model.minimalBorder;
      model.borderHeight = Math.round((clientHeight/xRatio-model.desktopHeight)/2);
    }

    this.viewBox.width = model.desktopWidth+2*model.borderWidth;
    this.viewBox.height = model.desktopHeight+2*model.borderHeight;
    this.ratio = Math.min(clientWidth/this.viewBox.width, clientHeight/this.viewBox.height);
    this.offsetX = (clientWidth-this.viewBox.width*this.ratio)/2;
    this.offsetY = (clientHeight-this.viewBox.height*this.ratio)/2;

    if (model.borderEntity != null) {
      model.borderEntity.x = 0;
      model.borderEntity.y = 0;
      model.borderEntity.width = this.viewBox.width;
      model.borderEntity.height = this.viewBox.height;
      model.borderEntity.parentWidth = this.viewBox.width;
      model.borderEntity.parentHeight = this.viewBox.height;
    }
    model.desktopEntity.x = model.borderWidth;
    model.desktopEntity.y = model.borderHeight;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = this.viewBox.width;
    model.desktopEntity.parentHeight = this.viewBox.height;
  } // fitModel

  /**
   * Places the overlay bands: they are given in desktop units and move
   * with the desktop; a band that touches an edge of the desktop is
   * stretched over the border on that side, so a stroke that overhangs the
   * screen (an entity with `clipsList` false) stays under the cellophane.
   * @param {AbstractModel} model
   */
  placeOverlay(model) {
    var overlay = this.app.stack.svgOverlay;
    var bands = this.app.platform.options.overlay.bands;
    overlay.setAttribute('transform', 'translate('+model.borderWidth+' '+model.borderHeight+')');
    var rects = overlay.children;
    for (var i = 0; i < bands.length && i < rects.length; i++) {
      var b = bands[i];
      var x = b.x, y = b.y, w = b.width, h = b.height;
      if (b.x <= 0) {
        x = -model.borderWidth;
        w += b.x+model.borderWidth;
      }
      if (b.x+b.width >= model.desktopWidth) {
        w = this.viewBox.width-model.borderWidth-x;
      }
      if (b.y <= 0) {
        y = -model.borderHeight;
        h += b.y+model.borderHeight;
      }
      if (b.y+b.height >= model.desktopHeight) {
        h = this.viewBox.height-model.borderHeight-y;
      }
      rects[i].setAttribute('x', x);
      rects[i].setAttribute('y', y);
      rects[i].setAttribute('width', w);
      rects[i].setAttribute('height', h);
    }
  } // placeOverlay

  /**
   * Starts a frame: forgets the nodes the previous frame did not claim.
   */
  clearCanvas() {
    for (var i = this.cursor; i < this.pool.length; i++) {
      this.pool[i].node.remove();
      if (this.pool[i].clip) {
        this.pool[i].clip.remove();
      }
    }
    this.pool.length = this.cursor;
    this.cursor = 0;
  } // clearCanvas

  /**
   * Claims the next pool node for `owner`, creating or replacing it when the
   * slot holds a node of another kind, owner or layer. Keeps the z-order of
   * calls within a layer.
   * @param {string} tag - 'rect' or 'g'
   * @param {*} owner - The entity (or a token) the node belongs to.
   * @param {string} [layer] - The entity's layer ('content' unless given).
   * @returns {{node: Element, attrs: Object, owner: *, tag: string, layer: string}}
   */
  claim(tag, owner, layer) {
    layer = layer || 'content';
    var slot = this.pool[this.cursor];
    if (!slot || slot.tag != tag || slot.owner !== owner || slot.layer != layer) {
      var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      var parent = this.layerElement(layer);
      if (slot && slot.node.parentNode === parent) {
        parent.replaceChild(node, slot.node);
      } else {
        if (slot) {
          slot.node.remove();
        }
        parent.appendChild(node);
      }
      slot = {node: node, attrs: {}, owner: owner, tag: tag, layer: layer};
      this.pool[this.cursor] = slot;
    }
    this.cursor++;
    return slot;
  } // claim

  /**
   * Sets an attribute only when its value changed since the last frame.
   * @param {Object} slot
   * @param {string} name
   * @param {string|number} value
   */
  attr(slot, name, value) {
    if (slot.attrs[name] !== value) {
      slot.attrs[name] = value;
      slot.node.setAttribute(name, value);
    }
  } // attr

  /**
   * Paints a filled rectangle relative to an entity (its background, hover or
   * click colour) — the same contract as `Canvas2DLayout.paint`.
   * @param {AbstractEntity} entity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {string} color
   */
  paint(entity, x, y, width, height, color) {
    var slot = this.claim('rect', entity, entity.layer);
    this.attr(slot, 'x', entity.parentX+entity.x+x);
    this.attr(slot, 'y', entity.parentY+entity.y+y);
    this.attr(slot, 'width', width);
    this.attr(slot, 'height', height);
    this.attr(slot, 'fill', color);
  } // paint

  /**
   * Same as `paint` — the retained rectangle is clipped by the caller already.
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
   * Places an entity's display list: a `<g>` translated to the entity, whose
   * children are re-emitted only when the list's version moved. When the
   * entity clips, the group is clipped to the entity's visible rectangle.
   * @param {AbstractEntity} entity
   * @param {VectorDisplayList} list
   */
  paintDisplayList(entity, list) {
    var slot = this.claim('g', list, entity.layer);
    this.attr(slot, 'transform', 'translate('+(entity.parentX+entity.x)+' '+(entity.parentY+entity.y)+')');
    if (slot.attrs.version !== list.version) {
      slot.attrs.version = list.version;
      slot.node.innerHTML = list.markup();
    }
    if (entity.clipsList) {
      var clip = this.claimClip(slot, entity);
      this.attr(slot, 'clip-path', 'url(#'+clip.id+')');
    } else if (slot.attrs['clip-path']) {
      slot.attrs['clip-path'] = '';
      slot.node.removeAttribute('clip-path');
    }
  } // paintDisplayList

  /**
   * Keeps one `<clipPath>` per display-list group, in the entity's visible
   * rectangle (the part of it inside the parent).
   * @param {Object} slot - The group's pool slot.
   * @param {AbstractEntity} entity
   * @returns {SVGClipPathElement}
   */
  claimClip(slot, entity) {
    if (!slot.clip) {
      var defs = this.svg().querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        this.svg().insertBefore(defs, this.svg().firstChild);
      }
      var clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
      clip.id = 'vclip'+(VectorLayout.clipCounter++);
      clip.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'rect'));
      defs.appendChild(clip);
      slot.clip = clip;
    }
    var r = slot.clip.firstChild;
    var x = Math.max(0, entity.parentCoverX-entity.x);
    var y = Math.max(0, entity.parentCoverY-entity.y);
    var w = Math.min(entity.width, entity.parentWidth-entity.x)-x;
    var h = Math.min(entity.height, entity.parentHeight-entity.y)-y;
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', Math.max(0, w));
    r.setAttribute('height', Math.max(0, h));
    return slot.clip;
  } // claimClip

  /**
   * Drawing caches belong to the raster layouts; a RasterEntity on this
   * layout is a mistake worth a loud message.
   * @param {AbstractEntity} entity - The entity that asked for a cache.
   * @param {number} index - The cache slot index.
   * @throws {Error} Always: the vector platform has no drawing caches.
   */
  newDrawingCache(entity, index) {
    throw new Error('VectorLayout: '+entity.id+' is a RasterEntity; the vector platform has no drawing caches (phase 0) — use VectorEntity and its text primitive');
  } // newDrawingCache

  /**
   * See newDrawingCache.
   * @param {AbstractEntity} entity - The entity that asked for a crop cache.
   * @throws {Error} Always, through newDrawingCache.
   */
  newDrawingCropCache(entity) {
    this.newDrawingCache(entity, 0);
  } // newDrawingCropCache

  /**
   * Converts a client X coordinate into model units, undoing the meet fit.
   * @param {number} clientX
   * @returns {number}
   */
  convertClientCoordinateX(clientX) {
    var box = this.app.element.getBoundingClientRect();
    return Math.round((clientX-box.left-this.offsetX)/this.ratio);
  } // convertClientCoordinateX

  /**
   * Converts a client Y coordinate into model units, undoing the meet fit.
   * @param {number} clientY
   * @returns {number}
   */
  convertClientCoordinateY(clientY) {
    var box = this.app.element.getBoundingClientRect();
    return Math.round((clientY-box.top-this.offsetY)/this.ratio);
  } // convertClientCoordinateY

} // VectorLayout

VectorLayout.clipCounter = 0;
