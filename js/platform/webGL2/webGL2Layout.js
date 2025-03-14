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
    '#version 300 es\n'+
    'void main(){'+
    '  gl_Position=vec4(0.0f,0.0f,0.0f,1.0f);'+
    '  gl_PointSize=50.0f;'+
    '}';
    const fsSource = 
    '#version 300 es\n'+
    'precision mediump float;'+
    'out vec4 color;'+
    'void main(){'+
    '  color=vec4(0.0f,0.0f,0.0f,1.0f);'+
    '}';

    var ctx = this.app.stack['ctx'];
    ctx.setPixelRatio = this.app.element.devicePixelRatio;
    var vertexShader = this.createShader(ctx, ctx.VERTEX_SHADER, vsSource);
    var fragmentShader = this.createShader(ctx, ctx.FRAGMENT_SHADER, fsSource);

    ctx.viewport(entity.x, entity.y, entity.width, entity.height);

    var program = this.createProgram(ctx, [vertexShader, fragmentShader]);;

    ctx.useProgram(program);

    ctx.clearColor(0.0, 0.0, 0.0, 0.0);
    ctx.clear(ctx.COLOR_BUFFER_BIT);

    var start = 0;
    var count = 1;
    ctx.drawArrays(ctx.POINTSS, start, count);
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

} // class WebGL2Layout

export default WebGL2Layout;
