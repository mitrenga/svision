/**/

/*/

/**/
// begin code

export class DrawingCache {
  
  constructor(app) {
    this.app = app;
    this.id = 'DrawingCache';

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ratio = 0;
    this.clean = false;
  } // constructor
  
  init(width, height) {
    this.ratio = this.app.layout.ratio;
    this.canvas.width = width*this.ratio;
    this.canvas.height = height*this.ratio;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  } // init

  cleanCache() {
    this.clean = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  } // cleanCache

  needToRefresh(entity, width, height) {
    if (this.ratio != this.app.layout.ratio || this.canvas.width != width*this.ratio || this.canvas.height != height*this.ratio) {
      this.init(width, height);
      return true;
    }
    if (this.clean) {
      this.clean = false;
      return true;
    }
    return false;
  } // needRefresh

  paint(x, y, width, height, color) {
    this.app.layout.paintRect(this.ctx, x, y, width, height, color);
  } // paint

} // DrawingCache

export default DrawingCache;
