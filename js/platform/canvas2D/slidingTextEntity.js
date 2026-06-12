/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
/**/
// begin code

/**
 * A scrolling text entity that renders a single line of text wider than its viewport
 * and animates it horizontally (ping-pong, scroll-to-left, looping, or custom). The
 * full text is cached once and a cropped window of it is drawn each frame.
 */
export class SlidingTextEntity extends AbstractEntity {

  /**
   * Creates a sliding text entity.
   * @param {AbstractEntity} parentEntity - The parent entity this text is attached to.
   * @param {Object} fonts - The font set used to render the text.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Visible width of the text window.
   * @param {number} height - Entity height.
   * @param {string} text - The text to scroll.
   * @param {string|false} penColor - Foreground (text) color.
   * @param {string|false} bkColor - Background color.
   * @param {Object} options - Margin, scale, animation, speed, and freezing options.
   */
  constructor(parentEntity, fonts, x, y, width, height, text, penColor, bkColor, options) {
    super(parentEntity, x, y, width, height, penColor, bkColor);
    this.id = 'SlidingTextEntity';

    this.fonts = fonts;
    this.text = text;

    this.options = {
      margin: 0,              // global margins -> sets leftMargin, rightMargin, topMargin, bottomMargin
      leftMargin: 0,          // left margin
      rightMargin: 0,         // right margin
      topMargin: 0,           // vertical margin
      bottomMargin: 0,        // bottom margin
      scale: 1,               // 1, 2, 3 ...
      animation: 'pingPong',  // pingPong, moveLeft, custom
      speed: 30,              // one pixel movement speed in miliseconds
      freezing: 1500          // freezing on change direction in miliseconds
    };
    Object.keys(options).forEach(key => {
      if (key in this.options) {
        this.options[key] = options[key];
      }
    });
    if (this.options.margin != 0) {
      this.options.leftMargin = this.options.margin;
      this.options.rightMargin = this.options.margin;
      this.options.topMargin = this.options.margin;
      this.options.bottomMargin = this.options.margin;
    }

    if ('group' in options) {
      this.group = options.group;
    }
    if ('hide' in options) {
      this.hide = options.hide;
    }
    if ('hoverColor' in options) {
      this.hoverColor = options.hoverColor;
    }
    if ('clickColor' in options) {
      this.clickColor = options.clickColor;
    }

    this.animationWidth = this.textWidth();
    if (this.animationWidth < this.width) {
      this.animationWidth = this.width;
    }
    this.animationPosition = 0;
    this.animationProgress = 0;
    this.animationDirection = 1;
    this.animationFreezing = true;
    this.animationTimestamp = false;

    this.app.layout.newDrawingCache(this, 0);
    this.app.layout.newDrawingCropCache(this);
  } // constructor
  
  /**
   * Initializes the entity and resolves default hover and click colors from the
   * stack configuration when they were not explicitly provided.
   */
  init() {
    super.init();

    if (this.hoverColor === false) {
      if (this.id in this.stack) {
        if ('hoverColor' in this.stack[this.id]) {
          if (this.bkColor in this.stack[this.id].hoverColor) {
            this.hoverColor = this.stack[this.id].hoverColor[this.bkColor];
          }
        }
      }
    }

    if (this.clickColor === false) {
      if (this.id in this.stack) {
        if ('clickColor' in this.stack[this.id]) {
          if (this.bkColor in this.stack[this.id].clickColor) {
            this.clickColor = this.stack[this.id].clickColor[this.bkColor];
          }
        }
      }
    }
  } // init

  /**
   * Computes the total pixel width of the current text including margins and
   * inter-character spacing.
   * @returns {number} The total text width in pixels.
   */
  textWidth() {
    var w = this.options.leftMargin+this.options.rightMargin;
    for (var ch = 0; ch < this.text.length; ch++) {
      if (ch > 0) {
        w += this.fonts.charsSpacing;
      }
      w += this.fonts.getCharData(this.text[ch], '1', this.options.scale).width;
    }
    return w;
  } // textWidth

  /**
   * Replaces the displayed text, recomputes the animation width, clears the cache,
   * and resets the animation state.
   * @param {string} text - The new text to display.
   */
  setText(text) {
    this.text = text;
    this.animationWidth = this.textWidth();
    if (this.animationWidth < this.width) {
      this.animationWidth = this.width;
    }
    this.cleanCache();
    this.resetAnimation();
  } // setText

  /**
   * Resets the scrolling animation to its starting position, direction, and frozen state.
   */
  resetAnimation() {
    this.animationPosition = 0;
    this.animationProgress = 0;
    this.animationDirection = 1;
    this.animationFreezing = true;
    this.animationTimestamp = false;
  } // resetAnimation

  /**
   * Renders the full text into the cache when needed and draws the currently
   * visible window of it at the animation position.
   */
  drawEntity() {
    super.drawEntity();

    if (this.drawingCache[0].needToRefresh(this, this.animationWidth, this.height)) {
      this.cursorX = this.options.leftMargin;
      for (var ch = 0; ch < this.text.length; ch++) {
        var charData = this.fonts.getCharData(this.text[ch], '1', 1);
        for (var x = 0; x < charData.data.length; x++) {
          this.app.layout.paintRect(this.drawingCache[0].ctx, this.cursorX+charData.data[x][0], this.options.topMargin+charData.data[x][1], charData.data[x][2], charData.data[x][3], this.penColor);
        }
        this.cursorX += charData.width+this.fonts.charsSpacing;
      }
    }
    this.app.layout.paintCropCache(this, 0, this.animationPosition, 0, 0, 0);
  } // drawEntity

  /**
   * Handles the mouseHover event, marking the entity as hovered when the pointer is
   * over it and a hover color is defined.
   * @param {Object} event - The input event to process.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {
      case 'mouseHover':
        if (!this.hide && this.hoverColor !== false) {
          if (this.pointOnEntity(event)) {
            this.app.inputEventsManager.mouseHover = this;
            this.hoverState = true;
            return true;
          }
        }
        break;
    }
    return false;
  } // handleEvent

  /**
   * Marks the text drawing cache as dirty so it is re-rendered on the next draw.
   */
  cleanCache() {
    this.drawingCache[0].cleanCache();
  } // cleanCache

  /**
   * Advances the scrolling animation based on the elapsed time and the configured
   * animation mode (pingPong, toLeft, loopLeft, or custom).
   * @param {number} timestamp - The current animation timestamp in milliseconds.
   */
  loopEntity(timestamp) {
    if (this.animationTimestamp === false) {
      this.animationTimestamp = timestamp;
    }

    switch (this.options.animation) {

      case 'pingPong':
        if (this.animationWidth > this.width) {
          if (this.animationFreezing) {
            if (timestamp-this.animationTimestamp > this.options.freezing) {
              this.animationFreezing = false;
            }
          } else {
            if (timestamp-this.animationTimestamp > this.options.speed) {
              this.animationPosition += this.animationDirection;
              this.animationProgress = this.animationPosition/(this.animationWidth-this.width);
              if (this.animationPosition == this.animationWidth-this.width || this.animationPosition == 0) {
                this.animationDirection *= -1;
                this.animationFreezing = true;
              }
              this.animationTimestamp = timestamp;
            }
          }
        }
        break;

      case 'toLeft':
          if (timestamp-this.animationTimestamp > this.options.speed) {
            this.animationPosition += Math.round((timestamp-this.animationTimestamp)/this.options.speed);
            if (this.animationPosition > this.animationWidth-this.width) {
              this.animationPosition = this.animationWidth-this.width;
              this.animationProgress = 1;
            }
            this.animationProgress = this.animationPosition/(this.animationWidth-this.width);
            this.animationTimestamp = timestamp;
          }
        break;

      case 'loopLeft':
          if (timestamp-this.animationTimestamp > this.options.speed) {
            this.animationPosition += Math.round((timestamp-this.animationTimestamp)/this.options.speed);
            if (this.animationPosition > this.animationWidth-this.width) {
              this.animationPosition = 0;
              this.animationProgress = 0;
            }
            this.animationProgress = this.animationPosition/(this.animationWidth-this.width);
            this.animationTimestamp = timestamp;
          }
        break;

      case 'custom':
        break;
    }
  } // loopEntity

} // SlidingTextEntity

export default SlidingTextEntity;
