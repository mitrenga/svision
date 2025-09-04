/**/
const { AbstractLayout } = await import('../../abstractLayout.js?ver='+window.srcVersion);
/*/
import AbstractLayout from '../../abstractLayout.js';
/**/
// begin code

export class WebGL2Layout extends AbstractLayout {
  
  constructor(app) {
    super(app);
    this.id = 'WebGL2Layout';
} // constructor

  canvas() {
    return {'width': this.app.element.clientWidth, 'height': this.app.element.clientHeight};
  } // canvas

  resizeModel(model) {
    super.resizeModel(model);

    this.app.element.width = this.app.element.clientWidth;
    this.app.element.height = this.app.element.clientHeight;

    model.desktopEntity.x = 0;
    model.desktopEntity.y = 0;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth;
    model.desktopEntity.parentHeight = model.desktopHeight;
  } // resizeModel

  paint(entity, x, y, width, height, color) {
    var vertexShaderSource =
    '#version 300 es\n' +
    'in vec3 inPeak;' +
    'in vec3 inColor;' +
    'uniform mat4 inMatrix;' +
    'out vec3 outColor;' +
    'void main() {' +
    '  outColor = inColor;' +
    '  gl_Position = inMatrix*vec4(inPeak, 1.0f);' +
    '}';
    var fragmentShaderSource = 
    '#version 300 es\n' +
    'precision mediump float;' +
    'in vec3 outColor;' +
    'out vec4 outFragmentColor;' +
    'void main() {' +
    '  outFragmentColor = vec4(outColor, 1.0f);' +
    '}';

    var peaks = [
      -0.5, -0.5,  0.5,   1.0,  0.0,  0.0,
       0.5, -0.5,  0.5,   0.0,  1.0,  0.0,
       0.5,  0.5,  0.5,   0.0,  0.0,  1.0,
      -0.5,  0.5,  0.5,   1.0,  1.0,  0.0,

      -0.5, -0.5, -0.5,   1.0,  0.0,  0.0,
       0.5, -0.5, -0.5,   0.0,  1.0,  0.0,
       0.5,  0.5, -0.5,   0.0,  0.0,  1.0,
      -0.5,  0.5, -0.5,   1.0,  1.0,  0.0
    ]; //x   y    z       R     G     B

    var indexes = [
      0, 1, 2,    2, 3, 0,  // přední stěna
      1, 5, 6,    6, 2, 1,  // pravá stěna
      5, 4, 7,    7, 6, 5,  // zadní stěna
      4, 0, 3,    3, 7, 4,  // levá stěna
      3, 2, 6,    6, 7, 3,  // vrchní stěna
      4, 5, 1,    1, 0, 4   // spodní stěna
    ]; // první a druhý trojúhelník

    var ctx = this.app.stack.ctx;

    var vertexShader = this.createShader(ctx, ctx.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = this.createShader(ctx, ctx.FRAGMENT_SHADER, fragmentShaderSource);
    var program = this.createProgram(ctx, [vertexShader, fragmentShader]);

    var vertexArray = ctx.createVertexArray();
    ctx.bindVertexArray(vertexArray);

    var vertexBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, vertexBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(peaks), ctx.STATIC_DRAW);

    var elementBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, elementBuffer);
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexes), ctx.STATIC_DRAW);

    ctx.useProgram(program);

    var peakLocation = ctx.getAttribLocation(program, 'inPeak');
    ctx.enableVertexAttribArray(peakLocation);
    var colorLocation = ctx.getAttribLocation(program, 'inColor');
    ctx.enableVertexAttribArray(colorLocation);

    ctx.vertexAttribPointer(peakLocation, 3, ctx.FLOAT, ctx.FALSE, 6*this.sizeOfType(ctx, ctx.FLOAT), 0*this.sizeOfType(ctx, ctx.FLOAT));
    ctx.vertexAttribPointer(colorLocation, 3, ctx.FLOAT, ctx.FALSE, 6*this.sizeOfType(ctx, ctx.FLOAT), 3*this.sizeOfType(ctx, ctx.FLOAT));

    // update scene
    var rotation = 0.5;
    //var xAxis = [1.0, 0.0, 0.0];
    var yAxis = [0.0, 1.0, 0.0];
    var zAxis = [0.0, 0.0, 1.0];
    var unitMatrix = [
      1.0, 0.0, 0.0, 0.0,
      0.0, 1.0, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0, 1.0
    ];

    var modelMatrix = this.translateMatrix(unitMatrix, 0.0, 0.0, -3.0); // posun objektu dál od kamery (objekt umístěný v počátku souřadnic posouváme před kameru do záporného Z)
    modelMatrix = this.axisRotateMatrix(modelMatrix, yAxis, rotation); // rotace okolo osy Y
    modelMatrix = this.axisRotateMatrix(modelMatrix, zAxis, rotation); // rotace okolo osy Z

    var aspect = (entity.width-entity.x)/(entity.height-entity.y); // výpočet poměru stran pro správné provedení projekce
    var fov = 32.0; // úhel rozevření pohledového hranolu v RADIÁNECH (Field Of View)
    var near = 0.1; // vzdálenost 'near' roviny od kamery
    var far = 20; // vzdálenost 'far' roviny od kamery
    var projectionMatrix = this.perspectiveMatrix(fov*Math.PI/180, aspect, near, far); // výpočet projekční matice
    var sceneMatrix = this.multiplyMatrix(projectionMatrix, modelMatrix); // vypočítání výsledné matice scény

    var uniformLocation = ctx.getUniformLocation(program, 'inMatrix'); // index Uniform proměnné v aktivním shaderu
    ctx.uniformMatrix4fv(uniformLocation, false, new Float32Array(sceneMatrix)); // nastavení Uniform proměnné do shaderu

    // draw
    ctx.enable(ctx.DEPTH_TEST); // povolení testování hloubky fragmentů (zadní stěny pak nepřekrývají přední stěny)
    ctx.enable(ctx.CULL_FACE); // zahazování fragmentů na zadních stranách polygonů (šetří GPU prostředky)
    ctx.viewport(entity.x, entity.y, entity.width, entity.height); // nastavení rozměrů vykreslovaného okna

    ctx.clearColor(1.0, 1.0, 1.0, 1.0);
    ctx.clear(ctx.COLOR_BUFFER_BIT);

    var start = 0;
    var count = 36;
    ctx.drawElements(ctx.TRIANGLES, count, ctx.UNSIGNED_SHORT, start);
  } // paint

  createShader(ctx, type, src) {
    var shader = ctx.createShader(type);
    ctx.shaderSource(shader, src);
    ctx.compileShader(shader);
    this.checkShader(ctx, shader);
    return shader;
  } // createShader

  createProgram(ctx, shaders) {
    var program = ctx.createProgram();
    var shader;
    for(var idx in shaders) {
      shader = shaders[idx];
      ctx.attachShader(program, shader);
    }
    ctx.linkProgram(program);
    this.checkProgram(ctx, program);
    return program;
  } // createProgram

  checkShader(ctx, shader) {
    if (ctx.getShaderParameter(shader, ctx.COMPILE_STATUS) == false) {
      console.error(ctx.getShaderInfoLog(shader));
    }
  } // checkShader

  checkProgram(ctx, program) {
    if (ctx.getProgramParameter(program, ctx.LINK_STATUS) == false) {
      console.error(ctx.getProgramInfoLog(program));
    }
  } // checkProgram

  sizeOfType(ctx, type) {
    switch(type) {
      case ctx.BYTE:
      case ctx.UNSIGNED_BYTE:
        return 1;
      case ctx.SHORT:
      case ctx.UNSIGNED_SHORT:
        return 2;
      case ctx.FLOAT:
        return 4;
    }
  } // sizeOfType

  translateMatrix(m, tx, ty, tz, dst) {
    dst = dst || new Float32Array(16);
    var m00 = m[0];
    var m01 = m[1];
    var m02 = m[2];
    var m03 = m[3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    if (m !== dst) {
      dst[ 0] = m00;
      dst[ 1] = m01;
      dst[ 2] = m02;
      dst[ 3] = m03;
      dst[ 4] = m10;
      dst[ 5] = m11;
      dst[ 6] = m12;
      dst[ 7] = m13;
      dst[ 8] = m20;
      dst[ 9] = m21;
      dst[10] = m22;
      dst[11] = m23;
    }
    dst[12] = m00 * tx + m10 * ty + m20 * tz + m30;
    dst[13] = m01 * tx + m11 * ty + m21 * tz + m31;
    dst[14] = m02 * tx + m12 * ty + m22 * tz + m32;
    dst[15] = m03 * tx + m13 * ty + m23 * tz + m33;
    return dst;
  } // translateMatrix

  axisRotateMatrix(m, axis, angleInRadians, dst) {
    dst = dst || new Float32Array(16);
    var x = axis[0];
    var y = axis[1];
    var z = axis[2];
    var n = Math.sqrt(x * x + y * y + z * z);
    x /= n;
    y /= n;
    z /= n;
    var xx = x * x;
    var yy = y * y;
    var zz = z * z;
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    var oneMinusCosine = 1 - c;
    var r00 = xx + (1 - xx) * c;
    var r01 = x * y * oneMinusCosine + z * s;
    var r02 = x * z * oneMinusCosine - y * s;
    var r10 = x * y * oneMinusCosine - z * s;
    var r11 = yy + (1 - yy) * c;
    var r12 = y * z * oneMinusCosine + x * s;
    var r20 = x * z * oneMinusCosine + y * s;
    var r21 = y * z * oneMinusCosine - x * s;
    var r22 = zz + (1 - zz) * c;
    var m00 = m[0];
    var m01 = m[1];
    var m02 = m[2];
    var m03 = m[3];
    var m10 = m[4];
    var m11 = m[5];
    var m12 = m[6];
    var m13 = m[7];
    var m20 = m[8];
    var m21 = m[9];
    var m22 = m[10];
    var m23 = m[11];
    dst[ 0] = r00 * m00 + r01 * m10 + r02 * m20;
    dst[ 1] = r00 * m01 + r01 * m11 + r02 * m21;
    dst[ 2] = r00 * m02 + r01 * m12 + r02 * m22;
    dst[ 3] = r00 * m03 + r01 * m13 + r02 * m23;
    dst[ 4] = r10 * m00 + r11 * m10 + r12 * m20;
    dst[ 5] = r10 * m01 + r11 * m11 + r12 * m21;
    dst[ 6] = r10 * m02 + r11 * m12 + r12 * m22;
    dst[ 7] = r10 * m03 + r11 * m13 + r12 * m23;
    dst[ 8] = r20 * m00 + r21 * m10 + r22 * m20;
    dst[ 9] = r20 * m01 + r21 * m11 + r22 * m21;
    dst[10] = r20 * m02 + r21 * m12 + r22 * m22;
    dst[11] = r20 * m03 + r21 * m13 + r22 * m23;
    if (m !== dst) {
      dst[12] = m[12];
      dst[13] = m[13];
      dst[14] = m[14];
      dst[15] = m[15];
    }
    return dst;
  } // axisRotateMatrix

  perspectiveMatrix(fieldOfViewInRadians, aspect, near, far, dst) {
    dst = dst || new Float32Array(16);
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
    var rangeInv = 1.0 / (near - far);
    dst[ 0] = f / aspect;
    dst[ 1] = 0;
    dst[ 2] = 0;
    dst[ 3] = 0;
    dst[ 4] = 0;
    dst[ 5] = f;
    dst[ 6] = 0;
    dst[ 7] = 0;
    dst[ 8] = 0;
    dst[ 9] = 0;
    dst[10] = (near + far) * rangeInv;
    dst[11] = -1;
    dst[12] = 0;
    dst[13] = 0;
    dst[14] = near * far * rangeInv * 2;
    dst[15] = 0;
    return dst;
  } // perspectiveMatrix

  multiplyMatrix(a, b, dst) {
    dst = dst || new Float32Array(16);
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    dst[ 0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    dst[ 1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    dst[ 2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    dst[ 3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
    dst[ 4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
    dst[ 5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
    dst[ 6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
    dst[ 7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
    dst[ 8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
    dst[ 9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
    dst[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
    dst[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
    dst[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
    dst[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
    dst[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
    dst[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
    return dst;
  } // multiplyMatrix

} // class WebGL2Layout

export default WebGL2Layout;
