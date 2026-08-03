/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
/**/
// begin code

/**
 * A clipping, pixel-scrolling viewport. Content added via addEntity() lives on a
 * single inner layer positioned at (-offsetX, -offsetY); panning just moves that
 * layer, so the layout is never re-flowed and scrolling is smooth and
 * resolution-independent. Because the offset is a persistent position (not a
 * draw-time shift), the engine's normal parent-offset propagation resolves clicks
 * and hover correctly for any nested entity — buttons, links and menus work even
 * while scrolled. The viewport is clipped with a native canvas clip, so any entity
 * type can be scrolled.
 *
 * Panning is driven by the mouse wheel, mouse drag, touch drag (one finger) and
 * the keyboard (arrows, PageUp/PageDown, Home/End — only consumed on an axis that
 * can scroll, so menus elsewhere still get the arrows); thin scrollbars are drawn
 * when an axis overflows. The owner sets the content
 * size via setContentSize() so the scroll range can be clamped; set
 * followBottom = true to keep the bottom in view as the content grows (a
 * terminal/typing "tail-follow").
 */
export class ScrollViewEntity extends AbstractEntity {

  /**
   * @param {AbstractEntity} parentEntity - The parent entity.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Viewport width in pixels.
   * @param {number} height - Viewport height in pixels.
   * @param {string|false} bkColor - Background color, or false for transparent.
   * @param {Object} options - scrollX, scrollY, scrollbar, scrollbarSize,
   *   scrollbarColor, scrollbarTrackColor, dragThreshold, followBottom.
   */
  constructor(parentEntity, x, y, width, height, bkColor, options) {
    super(parentEntity, x, y, width, height, false, bkColor);
    this.id = 'ScrollViewEntity';
    options = options || {};

    this.scrollX = ('scrollX' in options) ? options.scrollX : false;
    this.scrollY = ('scrollY' in options) ? options.scrollY : true;
    this.followBottom = ('followBottom' in options) ? options.followBottom : false;
    this.dragThreshold = ('dragThreshold' in options) ? options.dragThreshold : 8;

    this.lineStep = ('lineStep' in options) ? options.lineStep : 24;   // px per arrow key
    this.scrollbar = ('scrollbar' in options) ? options.scrollbar : true;
    this.scrollbarSize = ('scrollbarSize' in options) ? options.scrollbarSize : 3;
    this.scrollbarColor = ('scrollbarColor' in options) ? options.scrollbarColor : '#ffffff';
    this.scrollbarTrackColor = ('scrollbarTrackColor' in options) ? options.scrollbarTrackColor : false;
    this.scrollbarMinThumb = ('scrollbarMinThumb' in options) ? options.scrollbarMinThumb : 8;

    this.offsetX = 0;
    this.offsetY = 0;
    this.contentWidth = 0;
    this.contentHeight = 0;

    this.mouseDown = null;        // {downX, downY, x, y, active} while the mouse is held
    this.touchDown = {};          // identifier -> same shape, while a finger is down

    // Content lives on one inner layer positioned at (-offsetX, -offsetY). The
    // offset is persistent (not a draw-time hack), so the standard parent-offset
    // propagation resolves clicks correctly for any nested entity, even scrolled.
    this.content = null;
  } // constructor

  /**
   * Adds a content entity to the (lazily created) inner content layer, so it
   * scrolls with the viewport and is hit-tested at its scrolled position.
   * @param {AbstractEntity} entity - The content entity to add.
   */
  addEntity(entity) {
    if (this.content === null) {
      // Sized to the content (viewport until setContentSize) so children inherit
      // a real parentWidth/parentHeight and background crop logic works for them.
      this.content = new AbstractEntity(this, 0, 0, Math.max(this.contentWidth, this.width), Math.max(this.contentHeight, this.height), false, false);
      super.addEntity(this.content);
    }
    this.content.addEntity(entity);
  } // addEntity

  /**
   * Declares the full content size used to clamp the scroll range. When
   * followBottom is set, snaps the vertical offset to the bottom so growing
   * content stays in view.
   * @param {number} width - Content width in pixels.
   * @param {number} height - Content height in pixels.
   */
  setContentSize(width, height) {
    this.contentWidth = width;
    this.contentHeight = height;
    if (this.content !== null) {
      // Keep the inner layer at least viewport-sized so children always get a
      // real parentWidth/parentHeight (background crop logic needs it).
      this.content.width = Math.max(width, this.width);
      this.content.height = Math.max(height, this.height);
    }
    if (this.followBottom) {
      this.offsetY = this.maxOffsetY();
    }
    this.scrollTo(this.offsetX, this.offsetY);
  } // setContentSize

  /**
   * @returns {number} Maximum horizontal scroll offset.
   */
  maxOffsetX() {
    return Math.max(0, this.contentWidth-this.width);
  } // maxOffsetX

  /**
   * @returns {number} Maximum vertical scroll offset.
   */
  maxOffsetY() {
    return Math.max(0, this.contentHeight-this.height);
  } // maxOffsetY

  /**
   * @returns {boolean} Whether the content overflows horizontally and X scrolling is enabled.
   */
  canScrollX() {
    return this.scrollX && this.maxOffsetX() > 0;
  } // canScrollX

  /**
   * @returns {boolean} Whether the content overflows vertically and Y scrolling is enabled.
   */
  canScrollY() {
    return this.scrollY && this.maxOffsetY() > 0;
  } // canScrollY

  /**
   * Sets the scroll offset, clamped to the content bounds (and to 0 on disabled axes).
   * @param {number} x - Target horizontal offset.
   * @param {number} y - Target vertical offset.
   */
  scrollTo(x, y) {
    this.offsetX = this.scrollX ? Math.max(0, Math.min(x, this.maxOffsetX())) : 0;
    this.offsetY = this.scrollY ? Math.max(0, Math.min(y, this.maxOffsetY())) : 0;
    if (this.content !== null) {
      this.content.x = -this.offsetX;
      this.content.y = -this.offsetY;
    }
  } // scrollTo

  /**
   * Adjusts the scroll offset by a pixel delta.
   * @param {number} dx - Horizontal delta.
   * @param {number} dy - Vertical delta.
   */
  scrollBy(dx, dy) {
    this.scrollTo(this.offsetX+dx, this.offsetY+dy);
  } // scrollBy

  /**
   * Snaps the vertical offset to the bottom of the content.
   */
  scrollToBottom() {
    this.scrollTo(this.offsetX, this.maxOffsetY());
  } // scrollToBottom

  /**
   * @returns {boolean} True while a pointer drag is actively panning (past the threshold).
   */
  isDragging() {
    if (this.mouseDown !== null && this.mouseDown.active) {
      return true;
    }
    for (var id in this.touchDown) {
      if (this.touchDown[id].active) {
        return true;
      }
    }
    return false;
  } // isDragging

  /**
   * Applies one drag move: once the pointer has travelled past the drag
   * threshold the content pans opposite to the pointer.
   * @param {Object} event - The keyMove event (carries x, y).
   * @param {Object} state - The press state for this pointer.
   */
  dragMove(event, state) {
    if (!state.active && Math.abs(event.x-state.downX) <= this.dragThreshold && Math.abs(event.y-state.downY) <= this.dragThreshold) {
      return;
    }
    state.active = true;
    this.scrollBy(state.x-event.x, state.y-event.y);
    state.x = event.x;
    state.y = event.y;
  } // dragMove

  /**
   * Scrolls in response to a navigation key (arrows = one lineStep, PageUp/Down =
   * one viewport, Home/End = top/bottom). Only consumes the key on an axis that
   * can actually scroll, so it bubbles to menus etc. otherwise.
   * @param {string} key - The pressed key.
   * @returns {boolean} True if the key scrolled (and should be consumed).
   */
  keyScroll(key) {
    switch (key) {
      case 'ArrowUp':    if (this.canScrollY()) { this.scrollBy(0, -this.lineStep); return true; } break;
      case 'ArrowDown':  if (this.canScrollY()) { this.scrollBy(0, this.lineStep); return true; } break;
      case 'ArrowLeft':  if (this.canScrollX()) { this.scrollBy(-this.lineStep, 0); return true; } break;
      case 'ArrowRight': if (this.canScrollX()) { this.scrollBy(this.lineStep, 0); return true; } break;
      case 'PageUp':     if (this.canScrollY()) { this.scrollBy(0, -this.pageStep()); return true; } break;
      case 'PageDown':   if (this.canScrollY()) { this.scrollBy(0, this.pageStep()); return true; } break;
      case 'Home':       if (this.canScrollY()) { this.scrollTo(this.offsetX, 0); return true; } break;
      case 'End':        if (this.canScrollY()) { this.scrollToBottom(); return true; } break;
    }
    return false;
  } // keyScroll

  /**
   * @returns {number} PageUp/PageDown scroll step: one viewport height minus a
   *   lineStep of overlap for reading continuity.
   */
  pageStep() {
    return Math.max(this.lineStep, this.height-this.lineStep);
  } // pageStep

  handleEvent(event) {
    switch (event.id) {
      case 'mouseWheel':
        if (this.pointOnEntity(event) && (this.canScrollX() || this.canScrollY())) {
          this.scrollBy(this.scrollX ? event.deltaX : 0, this.scrollY ? event.deltaY : 0);
          return true;
        }
        break;

      case 'keyMove':
        if (event.key == 'Mouse1' && this.mouseDown !== null) {
          this.dragMove(event, this.mouseDown);
          return true;
        }
        if (event.key == 'Touch' && (event.identifier in this.touchDown)) {
          this.dragMove(event, this.touchDown[event.identifier]);
          return true;
        }
        break;

      case 'keyPress':
        // Record the press so a drag can start, but still let children (buttons,
        // links) receive it via super.handleEvent below.
        if (event.key == 'Mouse1' && this.pointOnEntity(event)) {
          this.mouseDown = {downX: event.x, downY: event.y, x: event.x, y: event.y, active: false};
        } else if (event.key == 'Touch' && this.pointOnEntity(event)) {
          this.touchDown[event.identifier] = {downX: event.x, downY: event.y, x: event.x, y: event.y, active: false};
          // Claim the touch so the input manager emits keyMove for it (a touch
          // only generates moves once an entity owns it). A child (button/link)
          // touched directly re-claims it after this via super.handleEvent.
          this.app.inputEventsManager.touchesMap[event.identifier] = this;
        } else if (this.keyScroll(event.key)) {
          return true;
        }
        break;

      case 'keyRelease':
        // Swallow the release that ends a drag so it does not also click a child.
        if (event.key == 'Mouse1' && this.mouseDown !== null) {
          var mouseDragged = this.mouseDown.active;
          this.mouseDown = null;
          if (mouseDragged) {
            return true;
          }
        } else if (event.key == 'Touch' && (event.identifier in this.touchDown)) {
          var touchDragged = this.touchDown[event.identifier].active;
          delete this.touchDown[event.identifier];
          if (touchDragged) {
            return true;
          }
        }
        break;
    }

    return super.handleEvent(event);
  } // handleEvent

  /**
   * Draws the background and content clipped to the viewport (native canvas
   * clip), then the scrollbars on top.
   */
  drawEntity() {
    if (this.hide) {
      return;
    }
    var ctx = this.app.stack.ctx;
    var ratio = this.app.layout.ratio;
    ctx.save();
    ctx.beginPath();
    ctx.rect((this.parentX+this.x)*ratio, (this.parentY+this.y)*ratio, this.width*ratio, this.height*ratio);
    ctx.clip();
    super.drawEntity();
    ctx.restore();
    this.drawScrollbars();
  } // drawEntity

  /**
   * Draws the vertical/horizontal scrollbar thumbs (and optional tracks) for any
   * axis that overflows.
   */
  drawScrollbars() {
    if (this.hide || !this.scrollbar) {
      return;
    }
    if (this.canScrollY()) {
      var trackH = this.height;
      var thumbH = Math.max(this.scrollbarMinThumb, Math.round(this.height/this.contentHeight*trackH));
      var thumbY = Math.round(this.offsetY/this.maxOffsetY()*(trackH-thumbH));
      var barX = this.width-this.scrollbarSize;
      if (this.scrollbarTrackColor !== false) {
        this.app.layout.paint(this, barX, 0, this.scrollbarSize, trackH, this.scrollbarTrackColor);
      }
      this.app.layout.paint(this, barX, thumbY, this.scrollbarSize, thumbH, this.scrollbarColor);
    }
    if (this.canScrollX()) {
      var trackW = this.width;
      var thumbW = Math.max(this.scrollbarMinThumb, Math.round(this.width/this.contentWidth*trackW));
      var thumbX = Math.round(this.offsetX/this.maxOffsetX()*(trackW-thumbW));
      var barY = this.height-this.scrollbarSize;
      if (this.scrollbarTrackColor !== false) {
        this.app.layout.paint(this, 0, barY, trackW, this.scrollbarSize, this.scrollbarTrackColor);
      }
      this.app.layout.paint(this, thumbX, barY, thumbW, this.scrollbarSize, this.scrollbarColor);
    }
  } // drawScrollbars

} // ScrollViewEntity

export default ScrollViewEntity;
