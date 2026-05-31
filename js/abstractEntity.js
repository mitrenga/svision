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
    this.text = '';
    this.width = width;
    this.height = height;
    this.bkColor = bkColor;
    this.penColor = penColor;
    this.hoverColor = false;
    this.hoverState = false;
    this.clickColor = false;
    this.clickState = false;
    this.hide = false;
    this.member = '';
    this.group = '';
    this.modal = false;
    this.modalEntity = null;

    this.parentX = 0;
    this.parentY = 0;
    this.parentCoverX = 0;
    this.parentCoverY = 0;
    this.parentWidth = width;
    this.parentHeight = height;

    this.drawingCache = [];
    this.drawingCropCache = null;
    this.stack = false;
    this.entities = [];

    this.fetchDataId = '';
  } // constructor
  
  init() {
  } // init

  addEntity(entity) {
    entity.stack = this.app.stack;
    var entityObjects = this.app.platform.initEntity(entity);
    if (entityObjects !== false) {
      Object.keys(entityObjects).forEach((key) => {
        entity.stack[key] = entityObjects[key];
      });
    }
    entity.init();
    this.entities.push(entity);
  } // addEntity

  addModalEntity(entity) {
    this.addEntity(entity);
    entity.modal = true;
    this.modalEntity = entity;
  } // addModalEntity

  destroy() {
    this.sendEvent(0, 1, {id: 'destroy', entity: this});
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

  setText(text) {
    if (this.text != text) {
      this.text = text;
      this.cleanCache();
    }
  } // setText

  setPenColor(color) {
    if (color != this.penColor) {
      this.penColor = color;
      this.cleanCache();
    }
  } // setPenColor

  setBkColor(color) {
    if (color != this.bkColor) {
      this.bkColor = color;
      this.cleanCache();
    }
  } // setBkColor

  cancelEvent(id) {
    this.model.cancelEvent(id);
  } // cancelEvent

  handleEvent(event) {
    if (this.modalEntity != null && ['keyPress', 'mouseHover', 'blurWindow'].indexOf(event.id) >= 0) {
      this.modalEntity.handleEvent(event);
      return true;
    }

    switch (event.id) {
      case 'updateEntity':
        if ('member' in event && event.member == this.member.substring(0, event.member.length)) {
          if ('x' in event) {
            this.x = event.x;
          }
          if ('y' in event) {
            this.y = event.y;
          }
          if ('width' in event) {
            this.width = event.width;
          }
          if ('height' in event) {
            this.height = event.height;
          }
          if ('text' in event) {
            this.setText(event.text);
          }
          if ('penColor' in event) {
            this.setPenColor(event.penColor);
          }
          if ('bkColor' in event) {
            this.setBkColor(event.bkColor);
          }
          if ('hide' in event) {
            this.hide = event.hide;
          }
          if ('multiple' in event && event.multiple) {
            return false;
          } else {
            return true;
          }
        }
        break;
    
      case 'destroy':
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
        break;
    }

    for (var v = 0; v < this.entities.length; v++) {
      if (this.entities[v].handleEvent(event) == true) {
        return true;
      }
    }
    return false;
  } // handleEvent
  
  loopEntity(timestamp) {
  } // loopEntity

  fetchData(url, storage, data) {
    this.fetchDataId = this.app.fetchData(url, storage, data, this);
  } // fetchData

  setData(data) {
    for (var v = 0; v < this.entities.length; v++) {
      this.entities[v].setData(data);
    }
  } // setData

  errorData(error) {
    this.app.showErrorMessage(error.message, 'restart');
  } // errorData

  drawEntity() {
    if (this.hide == true) {
      return;
    }

    var color = this.bkColor;
    if (this.hoverColor !== false && this.hoverState) {
      color = this.hoverColor;
    }

    if (this.clickState) {
      if (this.clickColor !== false) {
        color = this.clickColor;
      } else if (this.hoverColor !== false) {
        color = this.hoverColor;
      }
    }
    if (color != false) {
      var cropX = 0;
      var cropY = 0;
      var cropWidth = this.width;
      var cropHeight = this.height;
      if (this.x-this.parentCoverX < 0) {
        cropX = this.parentCoverX-this.x;
        cropWidth -= cropX;
      }
      if (this.y-this.parentCoverY < 0) {
        cropY = this.parentCoverY-this.y;
        cropHeight -= cropY;
      }
      if (this.x+this.width > this.parentWidth) {
        cropWidth += this.parentWidth-this.x-this.width;
      }
      if (this.y+this.height > this.parentHeight) {
        cropHeight += this.parentHeight-this.y-this.height;
      }
      if (cropWidth > 0 && cropHeight > 0) {
        this.app.layout.paint(this, cropX, cropY, cropWidth, cropHeight, color);
      }
    }
    this.drawSubEntities();
  } // drawEntity

  drawSubEntity(entity) {
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
    entity.parentCoverX = this.parentCoverX-this.x;
    if (entity.parentCoverX < 0) {
      entity.parentCoverX = 0;
    }
    entity.parentCoverY = this.parentCoverY-this.y;
    if (entity.parentCoverY < 0) {
      entity.parentCoverY = 0;
    }
    entity.parentWidth = w;
    entity.parentHeight = h;
    entity.drawEntity();
  } // drawSubEntity

  drawSubEntities() {
    this.entities.forEach ((entity) => {
      if (entity.hide == false) {
        this.drawSubEntity(entity);
      }
    });
  } // drawSubEntities
  
  pointOnEntity(event) {
    if ((this.parentX+this.x <= event.x) && (this.parentY+this.y <= event.y) && (this.parentX+this.x+this.width >= event.x) && (this.parentY+this.y+this.height >= event.y)) {
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

  topModalEntity() {
    if (this.modalEntity == null) {
      return this;
    }
    return this.modalEntity.topModalEntity();
  } // topModalEntity

  absoluteX() {
    if (this.parentEntity == null) {
      return 0;
    }    
    return this.parentEntity.absoluteX()+this.x;
  } // absolutePosX

  absoluteY() {
    if (this.parentEntity == null) {
      return 0;
    }    
    return this.parentEntity.absoluteY()+this.y;
  } // absolutePosY
  
} // AbstractEntity

export default AbstractEntity;
