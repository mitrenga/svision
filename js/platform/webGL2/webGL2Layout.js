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

    this.app.element.width = this.app.layout.canvas()['width'];
    this.app.element.height = this.app.layout.canvas()['height'];

    model.desktopEntity.x = 0;
    model.desktopEntity.y = 0;
    model.desktopEntity.width = model.desktopWidth;
    model.desktopEntity.height = model.desktopHeight;
    model.desktopEntity.parentWidth = model.desktopWidth;
    model.desktopEntity.parentHeight = model.desktopHeight;
  } // resizeModel

  drawEntity(entity) {
    const vsSource =
    '#version 300 es\n' +
    'in vec3 inPeak;' +
    'in vec3 inColor;' +
    'out vec3 outColor;' +
    'void main() {' +
    '  outColor = inColor;' +
    '  gl_Position = vec4(inPeak.x, inPeak.y, inPeak.z, 1.0f);' +
    '}';
    const fsSource = 
    '#version 300 es\n' +
    'precision mediump float;' +
    'in vec3 outColor;' +
    'out vec4 outFragment;' +
    'void main() {' +
    '  outFragment = vec4(outColor, 1.0f);' +
    '}';

    var peaks = [
      -0.5, -0.5, 0.0, 1.0, 0.0, 0.0,
      0.5, -0.5, 0.0, 1.0, 1.0, 0.0,
      0.5, 0.5, 0.0, 1.0, 0.0, 1.0,
      -0.5, 0.5, 0.0, 1.0, 0.0, 1.0
    ]; // x, y, z, R, G, B

    var indexes = [0, 1, 2, 2, 3, 0];

    var ctx = this.app.stack['ctx'];
    ctx.viewport(entity.x, entity.y, entity.width, entity.height);

    var vertexShader = this.createShader(ctx, ctx.VERTEX_SHADER, vsSource);
    var fragmentShader = this.createShader(ctx, ctx.FRAGMENT_SHADER, fsSource);
    var program = this.createProgram(ctx, [vertexShader, fragmentShader]);;

    var vertexArray = ctx.createVertexArray();
    ctx.bindVertexArray(vertexArray);

    var vertexBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, vertexBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(peaks), ctx.STATIC_DRAW);

    var elementBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, elementBuffer);
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexes), ctx.STATIC_DRAW);

    var peakLocation = ctx.getAttribLocation(program, 'inPeak');
    ctx.enableVertexAttribArray(peakLocation);
    var colorLocation = ctx.getAttribLocation(program, 'inColor');
    ctx.enableVertexAttribArray(colorLocation);

    ctx.vertexAttribPointer(peakLocation, 3, ctx.FLOAT, ctx.FALSE, 6*this.sizeOfType(ctx, ctx.FLOAT), 0*this.sizeOfType(ctx, ctx.FLOAT));
    ctx.vertexAttribPointer(colorLocation, 3, ctx.FLOAT, ctx.FALSE, 6*this.sizeOfType(ctx, ctx.FLOAT), 3*this.sizeOfType(ctx, ctx.FLOAT));

    ctx.useProgram(program);

    ctx.clearColor(1.0, 1.0, 1.0, 1.0);
    ctx.clear(ctx.COLOR_BUFFER_BIT);

    var start = 0;
    var count = 6;
    ctx.drawElements(ctx.TRIANGLES, count, ctx.UNSIGNED_SHORT, start);
  } // drawEntity

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
    for(var idx in shaders){
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

} // class WebGL2Layout

export default WebGL2Layout;
