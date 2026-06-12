/**/

/*/

/**/
// begin code

/**
 * Base class for a visual entity in the entity tree. Holds geometry, colors,
 * hover/click/hide/modal state and child entities, and provides event
 * dispatching, data fetching and clipped drawing of itself and its children.
 */
export class AbstractEntity {

  /**
   * Creates an entity, linking it to its parent (and inheriting that parent's
   * model and app) and initializing geometry, colors and state.
   * @param {AbstractEntity|null} parentEntity - The parent entity, or null for a root entity.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string|false} penColor - The pen/foreground color, or false for none.
   * @param {string|false} bkColor - The background color, or false for none.
   */
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
  
  /**
   * Initializes the entity after construction. The base implementation does nothing.
   */
  init() {
  } // init

  /**
   * Adds a child entity, sharing the app stack, applying any platform-provided
   * objects, initializing it and appending it to the children list.
   * @param {AbstractEntity} entity - The child entity to add.
   */
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

  /**
   * Adds a child entity and marks it as the current modal entity.
   * @param {AbstractEntity} entity - The entity to add and treat as modal.
   */
  addModalEntity(entity) {
    this.addEntity(entity);
    entity.modal = true;
    this.modalEntity = entity;
  } // addModalEntity

  /**
   * Requests destruction of this entity by sending a 'destroy' event so its
   * parent can remove and shut it down.
   */
  destroy() {
    this.sendEvent(0, 1, {id: 'destroy', entity: this});
  } // destroy

  /**
   * Recursively shuts down and removes all child entities.
   */
  shutdown() {
    for (var v = 0; v < this.entities.length; v++) {
      this.entities[v].shutdown();
      this.entities[v] = null;
      this.entities.splice(v, 1);
      v--;
    }
  } // shutdown

  /**
   * Dispatches an event in a given direction within the entity tree, or
   * schedules it via the model when timing is non-zero.
   * @param {number} direction - Routing for immediate events: -1 to the parent (and its children), 0 to the model, 1 to this entity's children.
   * @param {number} timing - Delay in milliseconds; 0 dispatches now, otherwise it is scheduled on the model.
   * @param {Object} event - The event object to dispatch.
   */
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

  /**
   * Sets the entity text, invalidating the draw cache when it changes.
   * @param {string} text - The new text value.
   */
  setText(text) {
    if (this.text != text) {
      this.text = text;
      this.cleanCache();
    }
  } // setText

  /**
   * Sets the pen/foreground color, invalidating the draw cache when it changes.
   * @param {string|false} color - The new pen color.
   */
  setPenColor(color) {
    if (color != this.penColor) {
      this.penColor = color;
      this.cleanCache();
    }
  } // setPenColor

  /**
   * Sets the background color, invalidating the draw cache when it changes.
   * @param {string|false} color - The new background color.
   */
  setBkColor(color) {
    if (color != this.bkColor) {
      this.bkColor = color;
      this.cleanCache();
    }
  } // setBkColor

  /**
   * Cancels scheduled events with the given id via the model.
   * @param {string} id - The event id to cancel.
   */
  cancelEvent(id) {
    this.model.cancelEvent(id);
  } // cancelEvent

  /**
   * Handles an event for this entity. While a modal entity is active, input
   * events are routed to it; otherwise 'updateEntity' applies matching
   * property changes and 'destroy' removes a child, falling back to
   * propagating the event to children.
   * @param {Object} event - The event object, identified by its `id`.
   * @returns {boolean} True if the event was handled, false otherwise.
   */
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
  
  /**
   * Per-frame entity update hook. The base implementation does nothing.
   * @param {number} timestamp - The current frame timestamp.
   */
  loopEntity(timestamp) {
  } // loopEntity

  /**
   * Requests data from a URL via the application, recording the fetch id so
   * results can be matched back to this entity.
   * @param {string} url - The endpoint to fetch data from.
   * @param {Object|false} storage - Storage policy passed through to the app, or false.
   * @param {*} data - The payload to send.
   */
  fetchData(url, storage, data) {
    this.fetchDataId = this.app.fetchData(url, storage, data, this);
  } // fetchData

  /**
   * Distributes fetched data to all child entities.
   * @param {Object} data - The received data payload.
   */
  setData(data) {
    for (var v = 0; v < this.entities.length; v++) {
      this.entities[v].setData(data);
    }
  } // setData

  /**
   * Handles a data-fetch error by showing an error message via the app.
   * @param {Error} error - The error that occurred during fetching.
   */
  errorData(error) {
    this.app.showErrorMessage(error.message, 'restart');
  } // errorData

  /**
   * Draws the entity unless hidden: selects the effective color based on
   * hover/click state, clips its rectangle to the parent's visible area,
   * paints the background and then draws its child entities.
   */
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

  /**
   * Computes a child entity's absolute parent offset and clipped parent
   * cover/size, then draws it.
   * @param {AbstractEntity} entity - The child entity to position and draw.
   */
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

  /**
   * Draws all non-hidden child entities.
   */
  drawSubEntities() {
    this.entities.forEach ((entity) => {
      if (entity.hide == false) {
        this.drawSubEntity(entity);
      }
    });
  } // drawSubEntities
  
  /**
   * Tests whether a point lies within the entity's absolute bounds.
   * @param {Object} event - An object with `x` and `y` coordinates.
   * @returns {boolean} True if the point is inside the entity, false otherwise.
   */
  pointOnEntity(event) {
    if ((this.parentX+this.x <= event.x) && (this.parentY+this.y <= event.y) && (this.parentX+this.x+this.width >= event.x) && (this.parentY+this.y+this.height >= event.y)) {
      return true;
    }
    return false;
  }

  /**
   * Sets the pen/foreground color and invalidates the draw cache.
   * @param {string|false} color - The new pen color.
   */
  setPenColor(color) {
    this.penColor = color;
    this.cleanCache();
  } // setPenColor

  /**
   * Sets the background color and invalidates the draw cache.
   * @param {string|false} color - The new background color.
   */
  setBkColor(color) {
    this.bkColor = color;
    this.cleanCache();
  } // setBkColor

  /**
   * Invalidates the entity's draw cache. The base implementation does nothing.
   */
  cleanCache() {
  } // cleanCache

  /**
   * Walks the modal chain to return the topmost active modal entity.
   * @returns {AbstractEntity} The topmost modal entity, or this entity if none is modal.
   */
  topModalEntity() {
    if (this.modalEntity == null) {
      return this;
    }
    return this.modalEntity.topModalEntity();
  } // topModalEntity

  /**
   * Computes the entity's absolute x position by summing parent offsets.
   * @returns {number} The absolute x coordinate.
   */
  absoluteX() {
    if (this.parentEntity == null) {
      return 0;
    }    
    return this.parentEntity.absoluteX()+this.x;
  } // absolutePosX

  /**
   * Computes the entity's absolute y position by summing parent offsets.
   * @returns {number} The absolute y coordinate.
   */
  absoluteY() {
    if (this.parentEntity == null) {
      return 0;
    }    
    return this.parentEntity.absoluteY()+this.y;
  } // absolutePosY
  
} // AbstractEntity

export default AbstractEntity;
