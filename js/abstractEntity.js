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
    this.hide = false;
    this.modal = false;
    this.modalEntity = null;

    this.parentX = 0;
    this.parentY = 0;
    this.parentWidth = width;
    this.parentHeight = height;

    this.drawingCache = [];
    this.drawingCropCache = null;
    this.stack = {};
    this.entities = [];
  } // constructor
  
  init() {
  } // init

  addEntity(entity) {
    entity.init();
    var entityObjects = this.app.platform.initEntity(entity);
    if (entityObjects !== false) {
      entity.stack = {...entity.stack, ...entityObjects};
    }
    this.entities.push(entity);
  } // addEntity

  addModalEntity(entity) {
    this.addEntity(entity);
    entity.modal = true;
    this.modalEntity = entity;
  } // addModalEntity

  destroy() {
    this.sendEvent(0, 1, {'id': 'destroy', 'entity': this});
  } // destroy

  shutdown() {
    for (var v = 0; v < this.entities.length; v++) {
      this.entities[v].shutdown();
      this.entities[v] = null;
      this.entities.splice(v, 1);
      v--;
    }
  } // shutdown

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
    if ((this.modalEntity != null) && (['keyPress', 'mouseClick'].indexOf(event.id) >= 0)) {
      this.modalEntity.handleEvent(event);
      return true;
    }
    
    if (event.id == 'destroy') {
      if (this.modalEntity == event.entity) {
        this.modalEntity = null;
      }
      for (var v = 0; v < this.entities.length; v++) {
        if (this.entities[v] == event.entity) {
          this.entities[v].shutdown();
          this.entities[v] = null;
          this.entities.splice(v, 1);
          return true;
        }
      }
    }

    for (var v = 0; v < this.entities.length; v++) {
      if (this.entities[v].handleEvent(event) == true) {
        return true;
      }
    }
    if ((this.modal == true) && (['keyPress', 'mouseClick'].indexOf(event.id) >= 0)) {
      return true;
    }
    return false;
  } // handleEvent
  
  setData(data) {
    for (var v = 0; v < this.entities.length; v++) {
      this.entities[v].setData(data);
    }
  } // setData

  drawEntity() {
    if (this.hide == true) {
      return;
    }

    if (this.bkColor != false) {
      this.app.layout.paint(this, 0, 0, this.width, this.height, this.bkColor);
    }
    this.drawSubEntities();
  } // drawEntity

  drawSubEntities() {
    this.entities.forEach ((entity) => {
      if (entity.hide == false) {
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
      }
    });
  } // drawSubEntities
  
  pointOnEntity(data) {
    if ((this.parentX+this.x <= data.x) && (this.parentY+this.y <= data.y) && (this.parentX+this.x+this.width >= data.x) && (this.parentY+this.y+this.height >= data.y)) {
      return true;
    }
    return false;
  }

  setPenColor(color) {
    this.penColor = color;
    this.cleanCache();
  } // setPenColor

  setBkColor(color) {
    this.bkColor = color;
    this.cleanCache();
  } // setBkColor

  cleanCache() {
    
  } // cleanCache

} // class AbstractEntity

export default AbstractEntity;
