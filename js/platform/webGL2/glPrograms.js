// begin code

/**
 * The shader programs of the WebGL2 renderer and its cache of GPU buffers —
 * the only place in the library a `WebGLBuffer` lives. Two programs,
 * compiled once: `mesh` (a colour per vertex or one for all, one
 * directional and one ambient light, flat shading through the `flat`
 * qualifier) and `line` (a plain colour). A mesh's vertex array is made
 * when the renderer first meets its `id` and remade when its `version`
 * moves; the scene never sees any of it (R-032).
 */
export class GLPrograms {

  /**
   * @param {WebGL2RenderingContext} gl
   */
  constructor(gl) {
    this.gl = gl;
    this.id = 'GLPrograms';
    this.meshes = new Map();     // mesh.id -> {version, vao, buffers, count, edgeVao, edgeBuffer, edgeCount}
    this.mesh = this.build(GLPrograms.MESH_VERTEX, GLPrograms.MESH_FRAGMENT,
      ['aPosition', 'aNormal', 'aColor'],
      ['uModel', 'uView', 'uProjection', 'uColor', 'uUseVertexColor', 'uShading', 'uLightDirection', 'uLightColor', 'uAmbient', 'uBrightness', 'uOpacity',
        'uFog', 'uFogColor', 'uFogStart', 'uFogEnd', 'uPattern', 'uPatternSize', 'uPatternColor', 'uAdditive']);
    this.line = this.build(GLPrograms.LINE_VERTEX, GLPrograms.LINE_FRAGMENT,
      ['aPosition'],
      ['uMatrix', 'uModelView', 'uColor', 'uFog', 'uFogColor', 'uFogStart', 'uFogEnd']);
    this.lineBuffer = gl.createBuffer();   // the points of a line or polyline item, streamed per draw
    this.lineVao = gl.createVertexArray();
    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.enableVertexAttribArray(this.line.attributes.aPosition);
    gl.vertexAttribPointer(this.line.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  } // constructor

  /**
   * Compiles and links a program and looks its attributes and uniforms up.
   * @param {string} vertexSource
   * @param {string} fragmentSource
   * @param {string[]} attributes
   * @param {string[]} uniforms
   * @returns {{program: WebGLProgram, attributes: Object, uniforms: Object}}
   */
  build(vertexSource, fragmentSource, attributes, uniforms) {
    var gl = this.gl;
    var program = gl.createProgram();
    gl.attachShader(program, this.compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, this.compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('GLPrograms: link failed: '+gl.getProgramInfoLog(program));
    }
    var out = {program: program, attributes: {}, uniforms: {}};
    attributes.forEach((name) => out.attributes[name] = gl.getAttribLocation(program, name));
    uniforms.forEach((name) => out.uniforms[name] = gl.getUniformLocation(program, name));
    return out;
  } // build

  /**
   * Compiles one shader; a failure is an error with the log, not a silent
   * black screen.
   * @param {number} type
   * @param {string} source
   * @returns {WebGLShader}
   */
  compile(type, source) {
    var gl = this.gl;
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('GLPrograms: compile failed: '+gl.getShaderInfoLog(shader));
    }
    return shader;
  } // compile

  /**
   * The GPU side of a mesh, made or refreshed as needed.
   * @param {Mesh} mesh
   * @returns {Object} {version, buffers, vao, count, indexType, hasColors, edgeVao, edgeCount}:
   *   the mesh version the entry was built from, the GL buffers to free on disposal,
   *   the VAO and index count of the faces (indexType UNSIGNED_INT or UNSIGNED_SHORT),
   *   whether the mesh has per-vertex colours, and the VAO and vertex count of the wireframe edges
   */
  entry(mesh) {
    var e = this.meshes.get(mesh.id);
    if (e && e.version === mesh.version) {
      return e;
    }
    if (e) {
      this.dispose(e);
    }
    var gl = this.gl;
    e = {version: mesh.version, buffers: []};

    e.vao = gl.createVertexArray();
    gl.bindVertexArray(e.vao);
    e.buffers.push(this.attribute(this.mesh.attributes.aPosition, mesh.positions));
    e.buffers.push(this.attribute(this.mesh.attributes.aNormal, mesh.normals));
    if (mesh.colors) {
      e.buffers.push(this.attribute(this.mesh.attributes.aColor, mesh.colors));
    } else {
      gl.disableVertexAttribArray(this.mesh.attributes.aColor);
      gl.vertexAttrib3f(this.mesh.attributes.aColor, 1, 1, 1);
    }
    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    e.buffers.push(ibo);
    e.count = mesh.indices.length;
    e.indexType = mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    e.hasColors = !!mesh.colors;
    gl.bindVertexArray(null);

    var edges = mesh.wireframeEdges();
    e.edgeVao = gl.createVertexArray();
    gl.bindVertexArray(e.edgeVao);
    e.buffers.push(this.attribute(this.line.attributes.aPosition, edges));
    e.edgeCount = edges.length/3;
    gl.bindVertexArray(null);

    this.meshes.set(mesh.id, e);
    return e;
  } // entry

  /**
   * Uploads a float attribute into a new buffer bound to the current VAO.
   * @param {number} location
   * @param {Float32Array} data
   * @returns {WebGLBuffer}
   */
  attribute(location, data) {
    var gl = this.gl;
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    return buffer;
  } // attribute

  /**
   * Frees the GPU side of an entry.
   * @param {Object} e
   */
  dispose(e) {
    var gl = this.gl;
    e.buffers.forEach((b) => gl.deleteBuffer(b));
    gl.deleteVertexArray(e.vao);
    gl.deleteVertexArray(e.edgeVao);
  } // dispose

  /**
   * Forgets every mesh (a context loss, a model switch that wants the memory back).
   */
  clear() {
    this.meshes.forEach((e) => this.dispose(e));
    this.meshes.clear();
  } // clear

  /**
   * A CSS hex colour as [r, g, b] in 0–1. `#rgb` and `#rrggbb`; anything
   * else is white (the scene is data a tool reads too, so it holds colours
   * a regexp can parse, as `RasterEntity.colorValue` does without a canvas).
   * @param {string} color
   * @returns {number[]}
   */
  static rgb(color) {
    var hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color || '');
    if (!hex) {
      return [1, 1, 1];
    }
    var d = hex[1];
    if (d.length == 3) {
      d = d.replace(/./g, '$&$&');
    }
    return [parseInt(d.substr(0, 2), 16)/255, parseInt(d.substr(2, 2), 16)/255, parseInt(d.substr(4, 2), 16)/255];
  } // rgb

} // GLPrograms

/**
 * The vertex shader of the mesh program: the colour per vertex (the
 * uniform or the attribute), flat directional lighting per triangle, the
 * view depth for the fog and the pattern coordinates in the object's own
 * frame.
 * @type {string}
 */
GLPrograms.MESH_VERTEX = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec3 aColor;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform vec3 uColor;
uniform float uUseVertexColor;
uniform float uShading;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform float uBrightness;
out vec3 vColor;
flat out vec3 vLight;
out float vDepth;
out vec3 vPattern;
void main() {
  // the colour interpolates across a face (a colour per corner blends as on
  // the old stub), the light is flat: one value per triangle
  vColor = mix(uColor, aColor, uUseVertexColor)*uBrightness;
  vec3 n = normalize(mat3(uModel)*aNormal);
  float diffuse = max(dot(n, -uLightDirection), 0.0);
  vLight = mix(vec3(1.0), uAmbient+uLightColor*diffuse, uShading);
  // the pattern's coordinates: the object's own frame in world units — the
  // model's scale (the lengths of its columns) applies, its rotation and
  // translation do not, so a checker turns and moves with a tumbling object
  vec3 scale = vec3(length(uModel[0].xyz), length(uModel[1].xyz), length(uModel[2].xyz));
  vPattern = aPosition*scale;
  vec4 eye = uView*uModel*vec4(aPosition, 1.0);
  vDepth = -eye.z;
  gl_Position = uProjection*eye;
}`;

/**
 * The fragment shader of the mesh program: the optional checker pattern,
 * the flat light and the linear fog by depth (skipped for additive items).
 * @type {string}
 */
GLPrograms.MESH_FRAGMENT = `#version 300 es
precision mediump float;
in vec3 vColor;
flat in vec3 vLight;
in float vDepth;
in vec3 vPattern;
uniform float uOpacity;
uniform float uFog;
uniform vec3 uFogColor;
uniform float uFogStart;
uniform float uFogEnd;
uniform float uPattern;
uniform float uPatternSize;
uniform vec3 uPatternColor;
uniform float uAdditive;
out vec4 outColor;
void main() {
  // a checker (Scene3D style pattern): cells of uPatternSize in the object's
  // frame, every other one in uPatternColor — a texture without an image
  vec3 cell = floor(vPattern/max(uPatternSize, 0.001));
  float odd = mod(cell.x+cell.y+cell.z, 2.0);
  vec3 color = mix(vColor, uPatternColor, uPattern*odd);
  // linear fog by the view depth (Scene3D.fog): none before uFogStart, all from uFogEnd.
  // an additive item keeps out of the fog — it adds its light to what is behind it, so fading it
  // to the fog's colour would brighten the distance instead of hiding the item in it (a glow the
  // fog swallowed would also be gone from far away, where it is exactly what one is meant to see)
  float fog = uFog*(1.0-uAdditive)*clamp((vDepth-uFogStart)/max(uFogEnd-uFogStart, 0.001), 0.0, 1.0);
  outColor = vec4(mix(color*vLight, uFogColor, fog), uOpacity);
}`;

/**
 * The vertex shader of the line program (wireframes and scene lines): the
 * position through one combined matrix, the view depth for the fog.
 * @type {string}
 */
GLPrograms.LINE_VERTEX = `#version 300 es
in vec3 aPosition;
uniform mat4 uMatrix;
uniform mat4 uModelView;
out float vDepth;
void main() {
  vDepth = -(uModelView*vec4(aPosition, 1.0)).z;
  gl_Position = uMatrix*vec4(aPosition, 1.0);
}`;

/**
 * The fragment shader of the line program: one RGBA colour, the linear fog
 * by depth.
 * @type {string}
 */
GLPrograms.LINE_FRAGMENT = `#version 300 es
precision mediump float;
in float vDepth;
uniform vec4 uColor;
uniform float uFog;
uniform vec3 uFogColor;
uniform float uFogStart;
uniform float uFogEnd;
out vec4 outColor;
void main() {
  float fog = uFog*clamp((vDepth-uFogStart)/max(uFogEnd-uFogStart, 0.001), 0.0, 1.0);
  outColor = vec4(mix(uColor.rgb, uFogColor, fog), uColor.a);
}`;
