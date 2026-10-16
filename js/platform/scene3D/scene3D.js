const { Mat4 } = await import('./mat4.js?ver='+window.srcVersion);
const { Vec3 } = await import('./vec3.js?ver='+window.srcVersion);
const { VectorDisplayList } = await import('../vector/vectorDisplayList.js?ver='+window.srcVersion);
// begin code

/**
 * A scene: what is in the world, as data — the 3D counterpart of a video
 * memory (R-017) and of a {@link VectorDisplayList} (R-031). It keeps the
 * `items`, the `camera`, the `lights`, the `background` and the `fog`,
 * without any DOM or GL, so a model builds it every frame from the state the worker
 * sent, a renderer draws it, and a tool under Node builds, compares and
 * serialises the same object.
 *
 * Every item is a plain object `{type, ...geometry, ...style}`. The style
 * keys are those of the display list — `color` (edges and lines), `fill`
 * (the surface of a mesh: a colour, or `'none'` for the mesh's own vertex
 * colours, falling back to `color`), `strokeWidth`, `intensity` (0–15,
 * 15 is full brightness), `opacity` — plus `transform` (a column-major
 * matrix of 16 numbers, or `{position, rotation, scale}` as
 * {@link Mat4.compose} takes them), `shading` (`'flat'` | `'none'`),
 * `wireframe` (true draws the edges instead of the surface) and `pattern`
 * (`{checker: colour, size}`: a checker of cells `size` world units across
 * in the object's own frame, every other cell in the given colour over the
 * fill — a texture without an image; the renderers that have no shader
 * ignore it) and `blend` (`'normal'`, the default, or `'add'`: the item's
 * light adds to what is behind it without hiding it — a glow; drawn
 * without writing depth, so put such items after the solid ones).
 * Missing keys are filled from `defaults` on `push`.
 *
 * Every change bumps `version`. `markup()` is one line per item —
 * canonical JSON, numbers to three decimals — the same string in the
 * browser and under Node; `differences()` counts the lines that differ.
 * `project()` flattens the scene into a display list of edges, the bridge
 * to the raster and vector layouts and the picture of a fingerprint.
 */
export class Scene3D {

  /**
   * Creates an empty scene with a perspective camera at (0, 0, 10) looking
   * at the origin, one directional and one ambient light, a black background,
   * no fog.
   */
  constructor() {
    this.items = [];
    this.version = 0;
    this.defaults = {color: '#ffffff', fill: 'none', strokeWidth: 1, intensity: 15, opacity: 1};
    this.camera = {type: 'perspective', fov: 60, near: 0.1, far: 100, position: [0, 0, 10], target: [0, 0, 0], up: [0, 1, 0]};
    this.lights = [
      {type: 'directional', direction: [-0.5, -1, -0.7], color: '#ffffff', intensity: 12},
      {type: 'ambient', color: '#ffffff', intensity: 4}
    ];
    this.background = '#000000';
    this.fog = null;
  } // constructor

  /**
   * Removes every item.
   * @returns {Scene3D} this
   */
  clear() {
    if (this.items.length > 0) {
      this.items = [];
      this.version++;
    }
    return this;
  } // clear

  /**
   * Appends an item. Missing style keys are filled from `defaults`.
   * @param {Object} item
   * @returns {Scene3D} this
   */
  push(item) {
    this.items.push(Object.assign({}, this.defaults, item));
    this.version++;
    return this;
  } // push

  /**
   * Appends a straight line in world coordinates.
   * @param {number} x1
   * @param {number} y1
   * @param {number} z1
   * @param {number} x2
   * @param {number} y2
   * @param {number} z2
   * @param {Object} [style] - color, strokeWidth, intensity, opacity, transform
   * @returns {Scene3D} This
   */
  line(x1, y1, z1, x2, y2, z2, style) {
    return this.push(Object.assign({type: 'line', x1: x1, y1: y1, z1: z1, x2: x2, y2: y2, z2: z2}, style));
  } // line

  /**
   * Appends an open polyline. Points are a flat array `[x, y, z, x, y, z, ...]`.
   * @param {number[]} points
   * @param {Object} [style] - color, strokeWidth, intensity, opacity, transform, close
   * @returns {Scene3D} This
   */
  polyline(points, style) {
    return this.push(Object.assign({type: 'polyline', points: points.slice()}, style));
  } // polyline

  /**
   * Appends a mesh.
   * @param {Mesh} mesh
   * @param {Object} [style] - transform, fill, color, shading ('flat'), wireframe (false), intensity, opacity
   * @returns {Scene3D} This
   */
  mesh(mesh, style) {
    return this.push(Object.assign({type: 'mesh', mesh: mesh, shading: 'flat', wireframe: false}, style));
  } // mesh

  /**
   * Replaces the camera (any subset of its keys) and bumps the version.
   * @param {Object} camera - type ('perspective' | 'orthographic'), fov (degrees, perspective), height (world units seen, orthographic), near, far, position, target, up
   * @returns {Scene3D} this
   */
  setCamera(camera) {
    this.camera = Object.assign({}, this.camera, camera);
    this.version++;
    return this;
  } // setCamera

  /**
   * Replaces the lights and bumps the version.
   * @param {Object[]} lights - [{type: 'directional', direction, color, intensity}, {type: 'ambient', color, intensity}]
   * @returns {Scene3D} this
   */
  setLights(lights) {
    this.lights = lights.map((l) => Object.assign({}, l));
    this.version++;
    return this;
  } // setLights

  /**
   * Replaces the clear colour and bumps the version.
   * @param {string} color
   * @returns {Scene3D} this
   */
  setBackground(color) {
    this.background = color;
    this.version++;
    return this;
  } // setBackground

  /**
   * Sets the linear fog — the colour a surface fades to with its distance
   * from the camera (the view depth): none of it nearer than `start`, all
   * of it from `end` on — or removes it (`null`). Without `color` the fog
   * takes the background's colour, so the far end melts into the sky (the
   * skybox-and-fog look of Geometry Race, R-032 phase 1). Bumps the version.
   * @param {{start: number, end: number, color?: string}|null} fog
   * @returns {Scene3D} this
   */
  setFog(fog) {
    this.fog = fog ? {start: fog.start, end: fog.end, color: fog.color} : null;
    this.version++;
    return this;
  } // setFog

  /**
   * The fog as the renderers use it: `{start, end, color}` with the colour
   * resolved (the background's without one), or null.
   * @returns {{start: number, end: number, color: string}|null}
   */
  fogSettings() {
    if (!this.fog) {
      return null;
    }
    return {start: this.fog.start, end: this.fog.end, color: this.fog.color || this.background};
  } // fogSettings

  /**
   * Appends every item of another scene, moved by (dx, dy, dz). The camera,
   * lights and background of the other scene are left alone.
   * @param {Scene3D} other
   * @param {number} [dx]
   * @param {number} [dy]
   * @param {number} [dz]
   * @returns {Scene3D} This
   */
  append(other, dx, dy, dz) {
    dx = dx || 0;
    dy = dy || 0;
    dz = dz || 0;
    other.items.forEach((item) => this.push(Scene3D.translate(item, dx, dy, dz)));
    return this;
  } // append

  /**
   * Returns a copy of an item moved by (dx, dy, dz) — a line by its points,
   * a mesh by its transform.
   * @param {Object} item
   * @param {number} dx
   * @param {number} dy
   * @param {number} dz
   * @returns {Object}
   */
  static translate(item, dx, dy, dz) {
    var t = Object.assign({}, item);
    switch (item.type) {
      case 'line':
        t.x1 += dx; t.y1 += dy; t.z1 += dz; t.x2 += dx; t.y2 += dy; t.z2 += dz;
        break;
      case 'polyline':
        t.points = item.points.map((v, i) => v+[dx, dy, dz][i%3]);
        break;
      case 'mesh':
        if (item.transform && !Array.isArray(item.transform) && !(item.transform instanceof Float32Array)) {
          var p = item.transform.position || [0, 0, 0];
          t.transform = Object.assign({}, item.transform, {position: [p[0]+dx, p[1]+dy, p[2]+dz]});
        } else {
          t.transform = Mat4.multiply(Mat4.translation(dx, dy, dz), Scene3D.transformMatrix(item.transform));
        }
        break;
    }
    return t;
  } // translate

  /**
   * The model matrix of an item's `transform`: a matrix as it is, an object
   * through {@link Mat4.compose}, nothing as the identity.
   * @param {number[]|Object|undefined} transform
   * @returns {number[]}
   */
  static transformMatrix(transform) {
    if (!transform) {
      return Mat4.identity();
    }
    if (Array.isArray(transform) || transform instanceof Float32Array) {
      return Array.prototype.slice.call(transform);
    }
    return Mat4.compose(transform.position, transform.rotation, transform.scale);
  } // transformMatrix

  /**
   * The view matrix of the camera (world → camera).
   * @returns {number[]}
   */
  viewMatrix() {
    var c = this.camera;
    return Mat4.invert(Mat4.lookAt(c.position, c.target, c.up || [0, 1, 0]));
  } // viewMatrix

  /**
   * The projection matrix of the camera for a viewport aspect.
   * @param {number} aspect - width / height.
   * @returns {number[]}
   */
  projectionMatrix(aspect) {
    var c = this.camera;
    if (c.type == 'orthographic') {
      var h = (c.height || 10)/2;
      var w = h*aspect;
      return Mat4.orthographic(-w, w, -h, h, c.near, c.far);
    }
    return Mat4.perspective(c.fov*Math.PI/180, aspect, c.near, c.far);
  } // projectionMatrix

  /**
   * The world-space points an item is made of: the ends of a line, the
   * points of a polyline, the transformed vertices of a mesh.
   * @param {Object} item
   * @returns {number[]} Flat x, y, z.
   */
  static worldPoints(item) {
    var out = [];
    var m, i;
    switch (item.type) {
      case 'line':
        out = [item.x1, item.y1, item.z1, item.x2, item.y2, item.z2];
        break;
      case 'polyline':
        out = item.points.slice();
        break;
      case 'mesh':
        m = Scene3D.transformMatrix(item.transform);
        var p = item.mesh.positions;
        for (i = 0; i+2 < p.length; i += 3) {
          var q = Mat4.transformPoint(m, [p[i], p[i+1], p[i+2]]);
          out.push(q[0], q[1], q[2]);
        }
        return out;
    }
    if (item.transform) {
      m = Scene3D.transformMatrix(item.transform);
      var t = [];
      for (i = 0; i+2 < out.length; i += 3) {
        var r = Mat4.transformPoint(m, [out[i], out[i+1], out[i+2]]);
        t.push(r[0], r[1], r[2]);
      }
      return t;
    }
    return out;
  } // worldPoints

  /**
   * The axis-aligned box around everything, or false for an empty scene.
   * @returns {{x: number, y: number, z: number, width: number, height: number, depth: number}|false}
   */
  bounds() {
    var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    this.items.forEach((item) => {
      var pts = Scene3D.worldPoints(item);
      for (var i = 0; i+2 < pts.length; i += 3) {
        for (var k = 0; k < 3; k++) {
          if (pts[i+k] < min[k]) min[k] = pts[i+k];
          if (pts[i+k] > max[k]) max[k] = pts[i+k];
        }
      }
    });
    if (min[0] === Infinity) {
      return false;
    }
    return {x: min[0], y: min[1], z: min[2], width: max[0]-min[0], height: max[1]-min[1], depth: max[2]-min[2]};
  } // bounds

  /**
   * Formats a number for markup: at most three decimals, no trailing zeros.
   * @param {number} v
   * @returns {string}
   */
  static num(v) {
    return String(Math.round(v*1000)/1000);
  } // num

  /**
   * A value as it goes into a markup line: numbers rounded, typed arrays as
   * arrays, objects with their keys in the given order (or as they are).
   * @param {*} v
   * @param {string[]} [keys] - The key order for an object.
   * @returns {*}
   */
  static canonical(v, keys) {
    if (typeof v == 'number') {
      return Math.round(v*1000)/1000;
    }
    if (Array.isArray(v) || ArrayBuffer.isView(v)) {
      return Array.prototype.map.call(v, (e) => Scene3D.canonical(e));
    }
    if (v && typeof v == 'object') {
      var out = {};
      (keys || Object.keys(v)).forEach((k) => {
        if (v[k] !== undefined) {
          out[k] = Scene3D.canonical(v[k]);
        }
      });
      return out;
    }
    return v;
  } // canonical

  /**
   * One item as a canonical JSON line. A mesh is named by its `id` and
   * measured by its vertex and triangle counts; its arrays are not repeated
   * (`toJSON()` has them).
   * @param {Object} item
   * @returns {string}
   */
  static element(item) {
    var out = {type: item.type};
    switch (item.type) {
      case 'line':
        ['x1', 'y1', 'z1', 'x2', 'y2', 'z2'].forEach((k) => out[k] = Scene3D.canonical(item[k]));
        break;
      case 'polyline':
        out.points = Scene3D.canonical(item.points);
        if (item.close) out.close = true;
        break;
      case 'mesh':
        out.mesh = item.mesh.id;
        out.vertices = item.mesh.vertexCount;
        out.triangles = item.mesh.triangleCount;
        out.shading = item.shading;
        out.wireframe = !!item.wireframe;
        break;
    }
    if (item.transform) {
      out.transform = Array.isArray(item.transform) || ArrayBuffer.isView(item.transform)
        ? Scene3D.canonical(item.transform)
        : Scene3D.canonical(item.transform, ['position', 'rotation', 'scale']);
    }
    ['color', 'fill', 'strokeWidth', 'intensity', 'opacity'].forEach((k) => {
      if (item[k] !== undefined) out[k] = Scene3D.canonical(item[k]);
    });
    if (item.pattern) {
      out.pattern = Scene3D.canonical(item.pattern, ['checker', 'size']);
    }
    if (item.blend && item.blend != 'normal') {
      out.blend = item.blend;
    }
    return JSON.stringify(out);
  } // element

  /**
   * The lines of the markup: the camera, the lights, the background, the
   * fog (only when there is one — a scene without fog reads as before),
   * then one line per item.
   * @returns {string[]}
   */
  lines() {
    var lines = [];
    lines.push(JSON.stringify({camera: Scene3D.canonical(this.camera, ['type', 'fov', 'height', 'near', 'far', 'position', 'target', 'up'])}));
    this.lights.forEach((l) => lines.push(JSON.stringify({light: Scene3D.canonical(l, ['type', 'direction', 'color', 'intensity'])})));
    lines.push(JSON.stringify({background: this.background}));
    if (this.fog) {
      lines.push(JSON.stringify({fog: Scene3D.canonical(this.fogSettings(), ['start', 'end', 'color'])}));
    }
    this.items.forEach((item) => lines.push(Scene3D.element(item)));
    return lines;
  } // lines

  /**
   * The scene as text, one line per item after the camera, the lights and
   * the background — the fingerprint of a frame.
   * @returns {string}
   */
  markup() {
    return this.lines().join('\n');
  } // markup

  /**
   * Counts the lines of markup that differ between this scene and another —
   * by position, so a swapped pair counts as two. The report of a `match*`
   * tool stands on this number.
   * @param {Scene3D} other
   * @returns {number}
   */
  differences(other) {
    var a = this.lines(), b = other.lines();
    var count = Math.abs(a.length-b.length);
    var n = Math.min(a.length, b.length);
    for (var i = 0; i < n; i++) {
      if (a[i] !== b[i]) {
        count++;
      }
    }
    return count;
  } // differences

  /**
   * The whole scene as plain JSON: camera, lights, background, fog, the
   * meshes by id, and the items with their meshes named.
   * @returns {Object}
   */
  toJSON() {
    var meshes = {};
    var items = this.items.map((item) => {
      var out = Object.assign({}, item);
      if (item.type == 'mesh') {
        meshes[item.mesh.id] = item.mesh.toJSON();
        out.mesh = item.mesh.id;
      }
      if (item.transform && ArrayBuffer.isView(item.transform)) {
        out.transform = Array.prototype.slice.call(item.transform);
      }
      return out;
    });
    return {
      camera: Object.assign({}, this.camera),
      lights: this.lights.map((l) => Object.assign({}, l)),
      background: this.background,
      fog: this.fog ? Object.assign({}, this.fog) : null,
      defaults: Object.assign({}, this.defaults),
      meshes: meshes,
      items: items
    };
  } // toJSON

  /**
   * Projects the scene into a {@link VectorDisplayList} of edges in
   * viewport coordinates (0,0 top-left, y down) — the wireframe of every
   * mesh, every line and polyline — through the camera. An edge with an end
   * behind the near plane is left out. The nearer an edge, the brighter:
   * the intensity of the item at the nearest depth of the frame, half of it
   * at the farthest (the beam of an XY monitor, as in `vectordemo`).
   *
   * This is the bridge: a `SceneEntity` on a raster or vector layout draws
   * this list through `paintDisplayList`, and a fingerprint becomes a
   * picture through `toSVG()`.
   * @param {number} width - Viewport width.
   * @param {number} height - Viewport height.
   * @param {Object} [options] - `depthRange` [near, far] for the brightness ramp instead of the frame's own; `view`, `projection` matrices instead of the camera's.
   * @returns {VectorDisplayList}
   */
  project(width, height, options) {
    options = options || {};
    var view = options.view || this.viewMatrix();
    var projection = options.projection || this.projectionMatrix(width/height);
    var vp = Mat4.multiply(projection, view);
    var edges = [];   // {item, a: [x, y, depth], b: [...]}
    var minDepth = Infinity, maxDepth = -Infinity;

    var toScreen = (mvp, p) => {
      var c = Mat4.transformVec4(mvp, p);
      if (c[3] <= 0 || c[2] < -c[3]) {
        return false;   // behind the camera or the near plane
      }
      var depth = c[3];   // for a perspective camera w is the view depth; for an orthographic one it is 1
      return [(c[0]/c[3]+1)/2*width, (1-c[1]/c[3])/2*height, depth];
    };
    var take = (item, mvp, ax, ay, az, bx, by, bz) => {
      var a = toScreen(mvp, [ax, ay, az]);
      var b = toScreen(mvp, [bx, by, bz]);
      if (!a || !b) {
        return;
      }
      if (this.camera.type == 'orthographic') {
        // depth from the view matrix, so the ramp still works
        var m = Mat4.multiply(view, Scene3D.transformMatrix(item.transform));
        a[2] = -Mat4.transformPoint(m, [ax, ay, az])[2];
        b[2] = -Mat4.transformPoint(m, [bx, by, bz])[2];
      }
      var d = (a[2]+b[2])/2;
      if (d < minDepth) minDepth = d;
      if (d > maxDepth) maxDepth = d;
      edges.push({item: item, a: a, b: b, depth: d});
    };

    this.items.forEach((item) => {
      var mvp = Mat4.multiply(vp, Scene3D.transformMatrix(item.transform));
      var i;
      switch (item.type) {
        case 'line':
          take(item, mvp, item.x1, item.y1, item.z1, item.x2, item.y2, item.z2);
          break;
        case 'polyline':
          var p = item.points;
          for (i = 0; i+5 < p.length; i += 3) {
            take(item, mvp, p[i], p[i+1], p[i+2], p[i+3], p[i+4], p[i+5]);
          }
          if (item.close && p.length >= 6) {
            take(item, mvp, p[p.length-3], p[p.length-2], p[p.length-1], p[0], p[1], p[2]);
          }
          break;
        case 'mesh':
          var e = item.mesh.wireframeEdges();
          for (i = 0; i+5 < e.length; i += 6) {
            take(item, mvp, e[i], e[i+1], e[i+2], e[i+3], e[i+4], e[i+5]);
          }
          break;
      }
    });

    if (options.depthRange) {
      minDepth = options.depthRange[0];
      maxDepth = options.depthRange[1];
    }
    var range = maxDepth-minDepth;
    var list = new VectorDisplayList();
    list.defaults = Object.assign({}, list.defaults, {color: this.defaults.color, strokeWidth: this.defaults.strokeWidth, opacity: this.defaults.opacity});
    edges.forEach((edge) => {
      var t = range > 0 ? Math.min(1, Math.max(0, (edge.depth-minDepth)/range)) : 0;
      var intensity = Math.round(edge.item.intensity-t*edge.item.intensity/2);
      list.line(edge.a[0], edge.a[1], edge.b[0], edge.b[1], {
        color: edge.item.color,
        strokeWidth: edge.item.strokeWidth,
        intensity: intensity,
        opacity: edge.item.opacity
      });
    });
    return list;
  } // project

} // Scene3D
