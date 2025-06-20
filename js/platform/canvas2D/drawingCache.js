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
  } // constructor
  
  init(width, height) {
    this.ratio = this.app.layout.ratio;
    this.canvas.width = width*this.ratio;
    this.canvas.height = height*this.ratio;
    this.ctx.clearRect(0, 0, width*this.ratio, height*this.ratio);
  } // init

  needRefresh(entity) {
    if (this.ratio != this.app.layout.ratio) {
      this.init(entity.width, entity.height);
      return true;
    }
    return false;
  } // needRefresh

  paint(x, y, width, height, color) {
    this.app.layout.paintRect(this.ctx, x, y, width, height, color);
  } // paint

} // class DrawingCache

export default DrawingCache;
