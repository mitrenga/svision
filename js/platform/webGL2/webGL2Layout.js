const { Canvas2DLayout } = await import('../canvas2D/canvas2DLayout.js?ver='+window.srcVersion);
const { Scene3DHeadlessLayout } = await import('../scene3D/scene3DHeadlessLayout.js?ver='+window.srcVersion);
const { Scene3D } = await import('../scene3D/scene3D.js?ver='+window.srcVersion);
const { Mat4 } = await import('../scene3D/mat4.js?ver='+window.srcVersion);
const { GLPrograms } = await import('./glPrograms.js?ver='+window.srcVersion);
// begin code

/**
 * The layout of the WebGL2 platform: a {@link Canvas2DLayout} for the 2D
 * overlay (`stack.ctx` — the ratio, the caches, the display style, the
 * pointer conversion, everything a HUD, a menu or a dialog needs) plus the
 * renderer of {@link Scene3D}s on the GL canvas under it (`stack.gl`).
 *
 * The one drawing primitive is `render(scene, view, projection, viewport)`
 * — a window calls it once per {@link SceneEntity}, an XR session (phase 2)
 * twice, once per eye. `paintScene` is what an entity calls: the viewport
 * is the entity's rectangle, the matrices come from the scene's camera.
 *
 * Without a WebGL2 context (`stack.gl` null) the scenes are drawn as
 * wireframes on the overlay through {@link Scene3D#project} — the same
 * bridge a SceneEntity uses on the raster layouts.
 */
export class WebGL2Layout extends Canvas2DLayout {

  /**
   * @param {AbstractApp} app
   */
  constructor(app) {
    super(app);
    this.id = 'WebGL2Layout';
    this.pixelRatio = 1;
    this.programs = null;   // made on the first frame with a context
  } // constructor

  /**
   * The GL canvas the platform made.
   * @returns {HTMLCanvasElement}
   */
  glCanvas() {
    return this.app.stack.glCanvas;
  } // glCanvas

  /**
   * The overlay canvas the platform made (the one `stack.ctx` draws on).
   * @returns {HTMLCanvasElement}
   */
  overlayCanvas() {
    return this.app.stack.overlayCanvas;
  } // overlayCanvas

  /**
   * Fits the desktop into the element (the rule of
   * {@link Scene3DHeadlessLayout.fitModel} — `'contain'` with a border or
   * `'cover'` over the whole window — shared so a frame under Node has
   * the browser's numbers), sizes the overlay in CSS pixels × ratio like a
   * raster canvas and the GL canvas in device pixels (`pixelRatio`), so
   * the 3D picture is as sharp as the screen.
   * @param {AbstractModel} model
   */
  resizeModel(model) {
    var element = this.app.element;
    var clientWidth = element.clientWidth;
    var clientHeight = element.clientHeight;
    var options = this.app.platform.options || {};
    Scene3DHeadlessLayout.fitModel(this, model, clientWidth, clientHeight, options.fit);

    this.pixelRatio = options.pixelRatio || window.devicePixelRatio || 1;

    var width = Math.round((model.desktopWidth+2*model.borderWidth)*this.ratio);
    var height = Math.round((model.desktopHeight+2*model.borderHeight)*this.ratio);
    var overlay = this.overlayCanvas();
    overlay.width = width;
    overlay.height = height;
    overlay.style.width = width+'px';
    overlay.style.height = height+'px';
    var glCanvas = this.glCanvas();
    glCanvas.width = Math.round(width*this.pixelRatio);
    glCanvas.height = Math.round(height*this.pixelRatio);
    glCanvas.style.width = width+'px';
    glCanvas.style.height = height+'px';
    // the CRT overlay of the display style measures `element.width` against the ratio
    element.width = width;
    element.height = height;
    this.applyDisplayStyle();
  } // resizeModel

  /**
   * Starts a frame: clears the overlay and the GL canvas (the platform's
   * background colour, the depth buffer).
   */
  clearCanvas() {
    var overlay = this.overlayCanvas();
    this.app.stack.ctx.clearRect(0, 0, overlay.width, overlay.height);
    var gl = this.app.stack.gl;
    if (gl) {
      var options = this.app.platform.options || {};
      var c = GLPrograms.rgb(options.background || '#000000');
      gl.disable(gl.SCISSOR_TEST);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(c[0], c[1], c[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
  } // clearCanvas

  /**
   * Paints an entity's background on the overlay — except that the border
   * entity paints only the four strips around the desktop: on a raster
   * platform the desktop repaints the middle, here it does not (its
   * background is false so the 3D picture shows through), and a border
   * painted over the whole overlay would hide the GL canvas.
   * @param {AbstractEntity} entity - The entity whose background is painted.
   * @param {number} x - Left edge of its rectangle, in model units on the desktop.
   * @param {number} y - Top edge of its rectangle.
   * @param {number} width - Width of the rectangle.
   * @param {number} height - Height of the rectangle.
   * @param {string} color - The background colour (a CSS colour).
   */
  paint(entity, x, y, width, height, color) {
    var model = this.app.model;
    if (model && entity === model.borderEntity && model.desktopEntity) {
      Scene3DHeadlessLayout.borderStrips(model).forEach((r) => this.paintRect(this.app.stack.ctx, r.x, r.y, r.width, r.height, color));
      return;
    }
    super.paint(entity, x, y, width, height, color);
  } // paint

  /**
   * The GL viewport of an entity: its rectangle in device pixels of the GL
   * canvas (origin bottom-left), and the visible part of it as the scissor
   * when the entity clips.
   * @param {AbstractEntity} entity
   * @returns {{x: number, y: number, width: number, height: number, scissor: Object}}
   */
  entityViewport(entity) {
    var s = this.ratio*this.pixelRatio;
    var canvasHeight = this.glCanvas().height;
    var x = entity.parentX+entity.x;
    var y = entity.parentY+entity.y;
    var viewport = {
      x: Math.round(x*s),
      y: Math.round(canvasHeight-(y+entity.height)*s),
      width: Math.round(entity.width*s),
      height: Math.round(entity.height*s)
    };
    var cx = 0, cy = 0, cw = entity.width, ch = entity.height;
    if (entity.clipsScene) {
      cx = Math.max(0, entity.parentCoverX-entity.x);
      cy = Math.max(0, entity.parentCoverY-entity.y);
      cw = Math.max(0, Math.min(entity.width, entity.parentWidth-entity.x)-cx);
      ch = Math.max(0, Math.min(entity.height, entity.parentHeight-entity.y)-cy);
    }
    viewport.scissor = {
      x: Math.round((x+cx)*s),
      y: Math.round(canvasHeight-(y+cy+ch)*s),
      width: Math.round(cw*s),
      height: Math.round(ch*s)
    };
    return viewport;
  } // entityViewport

  /**
   * Draws an entity's scene into the entity's rectangle through the scene's
   * camera — or, without a GL context, its wireframe on the overlay.
   * @param {AbstractEntity} entity
   * @param {Scene3D} scene
   */
  paintScene(entity, scene) {
    if (!this.app.stack.gl) {
      entity.clipsList = entity.clipsScene;
      this.paintDisplayList(entity, entity.projectedList ? entity.projectedList() : scene.project(entity.width, entity.height));
      return;
    }
    var viewport = this.entityViewport(entity);
    if (viewport.width <= 0 || viewport.height <= 0) {
      return;
    }
    this.render(scene, scene.viewMatrix(), scene.projectionMatrix(viewport.width/viewport.height), viewport);
  } // paintScene

  /**
   * The one drawing primitive: a scene through given view and projection
   * matrices into a viewport of the GL canvas. Clears the viewport with the
   * scene's background and depth, then draws the items in order — meshes
   * with the mesh program (depth test, back faces culled), wireframes and
   * lines with the line program; both fade into the scene's fog, if it has
   * one, by their view depth.
   * @param {Scene3D} scene
   * @param {number[]} view - Column-major 4×4.
   * @param {number[]} projection - Column-major 4×4.
   * @param {{x: number, y: number, width: number, height: number, scissor: Object}} viewport - Device pixels, origin bottom-left; `scissor` optional.
   */
  render(scene, view, projection, viewport) {
    var gl = this.app.stack.gl;
    if (!this.programs) {
      this.programs = new GLPrograms(gl);
    }
    var programs = this.programs;
    var scissor = viewport.scissor || viewport;

    gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(scissor.x, scissor.y, scissor.width, scissor.height);
    var bg = GLPrograms.rgb(scene.background);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // the lights: one directional (the first), one ambient (the sum of the ambient ones)
    var lightDirection = [0, -1, 0], lightColor = [0, 0, 0], ambient = [0, 0, 0];
    var directionalSeen = false;
    scene.lights.forEach((light) => {
      var c = GLPrograms.rgb(light.color);
      var k = (light.intensity === undefined ? 15 : light.intensity)/15;
      if (light.type == 'ambient') {
        ambient = [ambient[0]+c[0]*k, ambient[1]+c[1]*k, ambient[2]+c[2]*k];
      } else if (!directionalSeen) {
        directionalSeen = true;
        var d = light.direction || [0, -1, 0];
        var l = Math.sqrt(d[0]*d[0]+d[1]*d[1]+d[2]*d[2]) || 1;
        lightDirection = [d[0]/l, d[1]/l, d[2]/l];
        lightColor = [c[0]*k, c[1]*k, c[2]*k];
      }
    });

    var viewProjection = Mat4.multiply(projection, view);
    var viewF = new Float32Array(view);
    var projectionF = new Float32Array(projection);

    // the fog (Scene3D.fog, linear by view depth): off as uFog 0
    var fog = scene.fogSettings ? scene.fogSettings() : null;
    var fogColor = fog ? GLPrograms.rgb(fog.color) : [0, 0, 0];
    var setFog = (p) => {
      gl.uniform1f(p.uniforms.uFog, fog ? 1 : 0);
      gl.uniform3f(p.uniforms.uFogColor, fogColor[0], fogColor[1], fogColor[2]);
      gl.uniform1f(p.uniforms.uFogStart, fog ? fog.start : 0);
      gl.uniform1f(p.uniforms.uFogEnd, fog ? fog.end : 1);
    };

    scene.items.forEach((item) => {
      var model = Scene3D.transformMatrix(item.transform);
      var brightness = (item.intensity === undefined ? 15 : item.intensity)/15;
      var opacity = item.opacity === undefined ? 1 : item.opacity;
      if (item.type == 'mesh' && !item.wireframe) {
        var e = programs.entry(item.mesh);
        var p = programs.mesh;
        gl.useProgram(p.program);
        gl.enable(gl.CULL_FACE);
        gl.uniformMatrix4fv(p.uniforms.uModel, false, new Float32Array(model));
        gl.uniformMatrix4fv(p.uniforms.uView, false, viewF);
        gl.uniformMatrix4fv(p.uniforms.uProjection, false, projectionF);
        var useVertexColor = e.hasColors && item.fill == 'none';
        var base = GLPrograms.rgb(item.fill != 'none' ? item.fill : item.color);
        gl.uniform3f(p.uniforms.uColor, base[0], base[1], base[2]);
        gl.uniform1f(p.uniforms.uBrightness, brightness);
        gl.uniform1f(p.uniforms.uUseVertexColor, useVertexColor ? 1 : 0);
        gl.uniform1f(p.uniforms.uShading, item.shading == 'none' ? 0 : 1);
        gl.uniform3f(p.uniforms.uLightDirection, lightDirection[0], lightDirection[1], lightDirection[2]);
        gl.uniform3f(p.uniforms.uLightColor, lightColor[0], lightColor[1], lightColor[2]);
        gl.uniform3f(p.uniforms.uAmbient, ambient[0], ambient[1], ambient[2]);
        gl.uniform1f(p.uniforms.uOpacity, opacity);
        // the checker pattern of the item (Scene3D style `pattern: {checker, size}`), off otherwise
        var pattern = item.pattern && item.pattern.checker ? item.pattern : null;
        var pc = pattern ? GLPrograms.rgb(pattern.checker) : [0, 0, 0];
        gl.uniform1f(p.uniforms.uPattern, pattern ? 1 : 0);
        gl.uniform1f(p.uniforms.uPatternSize, pattern ? (pattern.size || 1) : 1);
        gl.uniform3f(p.uniforms.uPatternColor, pc[0]*brightness, pc[1]*brightness, pc[2]*brightness);
        setFog(p);
        // an additive item (Scene3D style `blend: 'add'`) adds its light and leaves no depth behind
        var additive = item.blend == 'add';
        gl.uniform1f(p.uniforms.uAdditive, additive ? 1 : 0);
        if (additive) {
          gl.blendFunc(gl.ONE, gl.ONE);
          gl.depthMask(false);
        }
        gl.bindVertexArray(e.vao);
        gl.drawElements(gl.TRIANGLES, e.count, e.indexType, 0);
        gl.bindVertexArray(null);
        if (additive) {
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(true);
        }
        return;
      }
      // wireframes, lines and polylines
      var lp = programs.line;
      gl.useProgram(lp.program);
      gl.disable(gl.CULL_FACE);
      gl.uniformMatrix4fv(lp.uniforms.uMatrix, false, new Float32Array(Mat4.multiply(viewProjection, model)));
      gl.uniformMatrix4fv(lp.uniforms.uModelView, false, new Float32Array(Mat4.multiply(view, model)));
      var c = GLPrograms.rgb(item.color);
      gl.uniform4f(lp.uniforms.uColor, c[0]*brightness, c[1]*brightness, c[2]*brightness, opacity);
      setFog(lp);
      if (item.type == 'mesh') {
        var entry = programs.entry(item.mesh);
        gl.bindVertexArray(entry.edgeVao);
        gl.drawArrays(gl.LINES, 0, entry.edgeCount);
        gl.bindVertexArray(null);
        return;
      }
      var points;
      if (item.type == 'line') {
        points = new Float32Array([item.x1, item.y1, item.z1, item.x2, item.y2, item.z2]);
      } else {
        points = new Float32Array(item.points);
      }
      gl.bindVertexArray(programs.lineVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, programs.lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, points, gl.STREAM_DRAW);
      gl.drawArrays(item.type == 'line' ? gl.LINES : (item.close ? gl.LINE_LOOP : gl.LINE_STRIP), 0, points.length/3);
      gl.bindVertexArray(null);
    });
    gl.disable(gl.SCISSOR_TEST);
  } // render

  /**
   * Converts a client X coordinate into model units: the overlay's bitmap
   * is the element's CSS size × ratio, so the base rule holds with the
   * overlay in place of the element.
   * @param {number} clientX
   * @returns {number}
   */
  convertClientCoordinateX(clientX) {
    var box = this.app.element.getBoundingClientRect();
    return Math.round((clientX-box.left)/this.ratio);
  } // convertClientCoordinateX

  /**
   * See convertClientCoordinateX.
   * @param {number} clientY
   * @returns {number}
   */
  convertClientCoordinateY(clientY) {
    var box = this.app.element.getBoundingClientRect();
    return Math.round((clientY-box.top)/this.ratio);
  } // convertClientCoordinateY

} // WebGL2Layout
