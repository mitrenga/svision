/**/

/*/

/**/
// begin code

export class AbstractEntity {

  constructor(parentEntity, x, y, width, height, penColor, bkColor) {
    this.id = 'AbstractEntity';

    this.app = null;
    this.parentEntity = parentEntity;
    
    if (this.parentEntity != null) {
      this.model = this.parentEntity.model;
      this.app = this.parentEntity.model.app;
    }

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.bkColor = bkColor;
    this.penColor = penColor;

    this.parentX = 0;
    this.parentY = 0;
    this.parentWidth = width;
    this.parentHeight = height;

    this.stack = {};
    this.entities = [];
  } // constructor
  
  addEntity(entity) {
    var entityObjects = this.app.platform.initEntity(entity);
    if (entityObjects !== false) {
      entity.stack = {...entity.stack, ...entityObjects};
    }
    this.entities.push(entity);
  } // addEntity
  
  sendEvent(direction, timing, event) {
    if (timing == 0) {
      switch (direction) {
        case -1:
          if (this.parentEntity != null) {
            if (this.parentEntity.handleEvent(event) == false) {
              for (var v = 0; v < this.parentEntity.entities.length; v++) {
                if (this.parentEntity.entities[v].handleEvent(event) == true) {
                  break;
                }
              }
            }
          }
          break;
        case 0:
          this.model.sendEvent(0, event);
          break;
        case 1:
          for (var v = 0; v < this.entities.length; v++) {
            if (this.entities[v].handleEvent(event) == true) {
              break;
            }
          }
          break;
      }
    } else {
      this.model.sendEvent(timing, event);
    }
  } // sendEvent

  cancelEvent(id) {
    this.model.cancelEvent(id);
  } // cancelEvent

  handleEvent(event) {
    for (var v = 0; v < this.entities.length; v++) {
      if (this.entities[v].handleEvent(event) == true) {
        return true;
      }
    }
    return false;
  } // handleEvent
  
  setData(data) {
    for (var v = 0; v < this.entities.length; v++) {
      this.entities[v].setData(data);
    }
  } // setData

  drawEntity() {
    this.app.layout.drawEntity(this);

    this.entities.forEach ((entity) => {
      entity.parentX = this.parentX+this.x;
      entity.parentY = this.parentY+this.y;
      
      var w = this.width;
      if (this.x+this.width > this.parentWidth) {
        w = this.parentWidth-this.x;
        if (w < 0) {
          w = 0;
        }
      }
      var h = this.height;
      if (this.y+this.height > this.parentHeight) {
        h = this.parentHeight-this.y;
        if (h < 0) {
          h = 0;
        }
      }
      entity.parentWidth = w;
      entity.parentHeight = h;
      entity.drawEntity();
    });
  } // drawEntity
  
} // class AbstractEntity

export default AbstractEntity;
