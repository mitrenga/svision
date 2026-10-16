// begin code

/**
 * A triangle mesh as data: typed arrays of `positions` (3 per vertex),
 * `normals` (3 per vertex), optional `colors` (3 per vertex, 0–1) and
 * `indices` (3 per triangle, counter-clockwise seen from outside). Nothing
 * here knows about GL: a renderer keeps its buffers keyed by `id` and
 * refreshes them when `version` moves, a tool under Node reads the same
 * arrays. `toJSON()`/`fromJSON()` is the mesh format of a game's `data/`
 * files; the generators (`box`, `plane`, `sphere`, `cylinder`) make the
 * primitives a geometric game is built from.
 *
 * Every mesh has an `id`, given or made (`mesh1`, `mesh2`, ... in order of
 * creation — the same in the browser and under Node for the same code), which
 * is what a scene's markup names it by.
 */
export class Mesh {

  /**
   * @param {ArrayLike<number>} positions - x, y, z per vertex.
   * @param {ArrayLike<number>} normals - Unit normals, 3 per vertex.
   * @param {ArrayLike<number>} indices - Vertex indices, 3 per triangle.
   * @param {Object} [options] - `id` (string), `colors` (r, g, b per vertex, 0–1).
   */
  constructor(positions, normals, indices, options) {
    options = options || {};
    this.id = options.id || ('mesh'+(++Mesh.counter));
    this.version = 0;
    this.positions = positions instanceof Float32Array ? positions : new Float32Array(positions);
    this.normals = normals instanceof Float32Array ? normals : new Float32Array(normals);
    this.colors = options.colors ? (options.colors instanceof Float32Array ? options.colors : new Float32Array(options.colors)) : null;
    this.indices = Mesh.indexArray(indices, this.positions.length/3);
    /** the wireframe edges, made on demand and kept until the version moves */
    this.edgeCache = null;
    this.edgeVersion = -1;
  } // constructor

  /**
   * The index array of the right width for a vertex count.
   * @param {ArrayLike<number>} indices
   * @param {number} vertexCount
   * @returns {Uint16Array|Uint32Array}
   */
  static indexArray(indices, vertexCount) {
    if (vertexCount > 65535) {
      return indices instanceof Uint32Array ? indices : new Uint32Array(indices);
    }
    return indices instanceof Uint16Array ? indices : new Uint16Array(indices);
  } // indexArray

  /**
   * @returns {number} The number of vertices.
   */
  get vertexCount() {
    return this.positions.length/3;
  } // vertexCount

  /**
   * @returns {number} The number of triangles.
   */
  get triangleCount() {
    return this.indices.length/3;
  } // triangleCount

  /**
   * Marks the arrays as changed: a renderer re-uploads them, the edges are
   * derived again. Call it after writing into `positions` and friends.
   * @returns {Mesh} this
   */
  touch() {
    this.version++;
    return this;
  } // touch

  /**
   * The axis-aligned box around the vertices, or false for an empty mesh.
   * @returns {{x: number, y: number, z: number, width: number, height: number, depth: number}|false}
   */
  bounds() {
    var p = this.positions;
    if (p.length == 0) {
      return false;
    }
    var minX = p[0], minY = p[1], minZ = p[2], maxX = p[0], maxY = p[1], maxZ = p[2];
    for (var i = 3; i < p.length; i += 3) {
      if (p[i] < minX) minX = p[i];
      if (p[i] > maxX) maxX = p[i];
      if (p[i+1] < minY) minY = p[i+1];
      if (p[i+1] > maxY) maxY = p[i+1];
      if (p[i+2] < minZ) minZ = p[i+2];
      if (p[i+2] > maxZ) maxZ = p[i+2];
    }
    return {x: minX, y: minY, z: minZ, width: maxX-minX, height: maxY-minY, depth: maxZ-minZ};
  } // bounds

  /**
   * The edges a wireframe of the mesh is drawn with: every edge of every
   * triangle, without duplicates (vertices at the same position count as
   * one) and without the diagonals of flat faces — an edge shared by two
   * triangles of the same face normal is not drawn, so a box has twelve
   * edges, not eighteen, and the caps of a cylinder are rims, not fans.
   * The result is kept until the version moves.
   * @returns {Float32Array} x1, y1, z1, x2, y2, z2 per edge.
   */
  wireframeEdges() {
    if (this.edgeCache !== null && this.edgeVersion == this.version) {
      return this.edgeCache;
    }
    var p = this.positions;
    var ix = this.indices;
    var key = (i) => Mesh.num(p[i*3])+','+Mesh.num(p[i*3+1])+','+Mesh.num(p[i*3+2]);
    var edges = new Map();     // 'a|b' (position keys, sorted) -> {a, b, normals: []}
    for (var t = 0; t+2 < ix.length; t += 3) {
      var n = Mesh.faceNormal(p, ix[t], ix[t+1], ix[t+2]);
      for (var e = 0; e < 3; e++) {
        var a = ix[t+e], b = ix[t+(e+1)%3];
        var ka = key(a), kb = key(b);
        if (ka == kb) {
          continue;
        }
        var k = ka < kb ? ka+'|'+kb : kb+'|'+ka;
        var entry = edges.get(k);
        if (!entry) {
          entry = {a: a, b: b, normals: []};
          edges.set(k, entry);
        }
        entry.normals.push(n);
      }
    }
    var out = [];
    edges.forEach((entry) => {
      var keep = entry.normals.length == 1;
      for (var i = 1; i < entry.normals.length && !keep; i++) {
        var n0 = entry.normals[0], n1 = entry.normals[i];
        if (n0[0]*n1[0]+n0[1]*n1[1]+n0[2]*n1[2] < 0.9999) {
          keep = true;
        }
      }
      if (keep) {
        out.push(p[entry.a*3], p[entry.a*3+1], p[entry.a*3+2], p[entry.b*3], p[entry.b*3+1], p[entry.b*3+2]);
      }
    });
    this.edgeCache = new Float32Array(out);
    this.edgeVersion = this.version;
    return this.edgeCache;
  } // wireframeEdges

  /**
   * The unit normal of a triangle by its winding.
   * @param {Float32Array} p - The positions.
   * @param {number} a
   * @param {number} b
   * @param {number} c
   * @returns {number[]}
   */
  static faceNormal(p, a, b, c) {
    var ux = p[b*3]-p[a*3], uy = p[b*3+1]-p[a*3+1], uz = p[b*3+2]-p[a*3+2];
    var vx = p[c*3]-p[a*3], vy = p[c*3+1]-p[a*3+1], vz = p[c*3+2]-p[a*3+2];
    var nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
    var l = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
    return [nx/l, ny/l, nz/l];
  } // faceNormal

  /**
   * A number as it goes into JSON and markup: at most four decimals — the
   * quantum vertices are compared by.
   * @param {number} v
   * @returns {number}
   */
  static num(v) {
    return Math.round(v*10000)/10000;
  } // num

  /**
   * The mesh as plain JSON (the format of a game's `data/*.json`).
   * @returns {Object} {id, positions, normals, colors, indices}
   */
  toJSON() {
    var round = (a) => Array.prototype.map.call(a, Mesh.num);
    return {
      id: this.id,
      positions: round(this.positions),
      normals: round(this.normals),
      colors: this.colors ? round(this.colors) : null,
      indices: Array.prototype.slice.call(this.indices)
    };
  } // toJSON

  /**
   * A mesh out of {@link Mesh#toJSON}'s output.
   * @param {Object} json
   * @returns {Mesh}
   */
  static fromJSON(json) {
    return new Mesh(json.positions, json.normals, json.indices, {id: json.id, colors: json.colors || null});
  } // fromJSON

  /**
   * A box centred on the origin, 24 vertices (4 per face, so every face has
   * its own normal), 12 triangles.
   * @param {number} width - Along X.
   * @param {number} height - Along Y.
   * @param {number} depth - Along Z.
   * @param {Object} [options] - `id`; `color` [r, g, b] for every vertex, or `faceColors` [6 × [r, g, b]] in the order +X, -X, +Y, -Y, +Z, -Z.
   * @returns {Mesh}
   */
  static box(width, height, depth, options) {
    options = options || {};
    var hx = width/2, hy = height/2, hz = depth/2;
    // per face: normal, then the four corners counter-clockwise seen from outside
    var faces = [
      [[1, 0, 0],  [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]]],
      [[-1, 0, 0], [[-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-hx, -hy, -hz]]],
      [[0, 1, 0],  [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz]]],
      [[0, -1, 0], [[-hx, -hy, hz], [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz]]],
      [[0, 0, 1],  [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]],
      [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]]
    ];
    var positions = [], normals = [], indices = [], colors = [];
    faces.forEach((face, f) => {
      var base = f*4;
      var color = options.faceColors ? options.faceColors[f] : options.color;
      face[1].forEach((corner) => {
        positions.push(corner[0], corner[1], corner[2]);
        normals.push(face[0][0], face[0][1], face[0][2]);
        if (color) colors.push(color[0], color[1], color[2]);
      });
      indices.push(base, base+1, base+2, base, base+2, base+3);
    });
    return new Mesh(positions, normals, indices, {id: options.id, colors: colors.length ? colors : null});
  } // box

  /**
   * A horizontal plane centred on the origin in the XZ plane, facing +Y,
   * split into segments (for a grid of vertex colours or later per-vertex
   * effects).
   * @param {number} width - Along X.
   * @param {number} depth - Along Z.
   * @param {Object} [options] - `id`, `color`, `segmentsX` (1), `segmentsZ` (1).
   * @returns {Mesh}
   */
  static plane(width, depth, options) {
    options = options || {};
    var sx = options.segmentsX || 1, sz = options.segmentsZ || 1;
    var positions = [], normals = [], indices = [], colors = [];
    for (var iz = 0; iz <= sz; iz++) {
      for (var ix = 0; ix <= sx; ix++) {
        positions.push(-width/2+width*ix/sx, 0, -depth/2+depth*iz/sz);
        normals.push(0, 1, 0);
        if (options.color) colors.push(options.color[0], options.color[1], options.color[2]);
      }
    }
    for (var z = 0; z < sz; z++) {
      for (var x = 0; x < sx; x++) {
        var a = z*(sx+1)+x, b = a+1, c = a+sx+1, d = c+1;
        // counter-clockwise seen from +Y: +Y looks down, so the winding is (a, c, b)
        indices.push(a, c, b, b, c, d);
      }
    }
    return new Mesh(positions, normals, indices, {id: options.id, colors: colors.length ? colors : null});
  } // plane

  /**
   * A UV sphere centred on the origin.
   * @param {number} radius
   * @param {Object} [options] - `id`, `color`, `segments` (around, 16), `rings` (top to bottom, 8).
   * @returns {Mesh}
   */
  static sphere(radius, options) {
    options = options || {};
    var segments = options.segments || 16, rings = options.rings || 8;
    var positions = [], normals = [], indices = [], colors = [];
    for (var r = 0; r <= rings; r++) {
      var phi = Math.PI*r/rings;
      var y = Math.cos(phi), s = Math.sin(phi);
      for (var q = 0; q <= segments; q++) {
        var theta = 2*Math.PI*q/segments;
        var x = s*Math.cos(theta), z = s*Math.sin(theta);
        positions.push(x*radius, y*radius, z*radius);
        normals.push(x, y, z);
        if (options.color) colors.push(options.color[0], options.color[1], options.color[2]);
      }
    }
    for (var ir = 0; ir < rings; ir++) {
      for (var iq = 0; iq < segments; iq++) {
        var a = ir*(segments+1)+iq, b = a+1, c = a+segments+1, d = c+1;
        // seen from outside, a is upper right, b upper left, c lower right, d lower left
        if (ir > 0) indices.push(a, b, c);
        if (ir < rings-1) indices.push(b, d, c);
      }
    }
    return new Mesh(positions, normals, indices, {id: options.id, colors: colors.length ? colors : null});
  } // sphere

  /**
   * A cylinder along Y centred on the origin, with caps.
   * @param {number} radius
   * @param {number} height
   * @param {Object} [options] - `id`, `color`, `segments` (16).
   * @returns {Mesh}
   */
  static cylinder(radius, height, options) {
    options = options || {};
    var segments = options.segments || 16;
    var h = height/2;
    var positions = [], normals = [], indices = [], colors = [];
    var push = (x, y, z, nx, ny, nz) => {
      positions.push(x, y, z);
      normals.push(nx, ny, nz);
      if (options.color) colors.push(options.color[0], options.color[1], options.color[2]);
      return positions.length/3-1;
    };
    // side: two rings of vertices with radial normals
    for (var q = 0; q <= segments; q++) {
      var theta = 2*Math.PI*q/segments;
      var x = Math.cos(theta), z = Math.sin(theta);
      push(x*radius, -h, z*radius, x, 0, z);
      push(x*radius, h, z*radius, x, 0, z);
    }
    for (var i = 0; i < segments; i++) {
      var a = i*2, b = a+1, c = a+2, d = a+3;
      // seen from outside (theta grows towards +Z from +X: clockwise seen from +Y), the outward winding is (a, b, c)
      indices.push(a, b, c, b, d, c);
    }
    // caps: a centre and a rim each
    var top = push(0, h, 0, 0, 1, 0), bottom = push(0, -h, 0, 0, -1, 0);
    var topRim = [], bottomRim = [];
    for (var k = 0; k <= segments; k++) {
      var t = 2*Math.PI*k/segments;
      topRim.push(push(Math.cos(t)*radius, h, Math.sin(t)*radius, 0, 1, 0));
      bottomRim.push(push(Math.cos(t)*radius, -h, Math.sin(t)*radius, 0, -1, 0));
    }
    for (var j = 0; j < segments; j++) {
      indices.push(top, topRim[j+1], topRim[j]);
      indices.push(bottom, bottomRim[j], bottomRim[j+1]);
    }
    return new Mesh(positions, normals, indices, {id: options.id, colors: colors.length ? colors : null});
  } // cylinder

} // Mesh

/** ids of meshes made without one: mesh1, mesh2, ... */
Mesh.counter = 0;
