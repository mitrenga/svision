const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { VectorDisplayList } = await import('./vectorDisplayList.js?ver='+window.srcVersion);
// begin code

/**
 * An entity that shows a {@link VectorDisplayList}. The list is drawn in the
 * entity's coordinates (0,0 is the entity's top-left corner) between the
 * background and the children, on any layout that implements
 * `paintDisplayList` — the vector layout as retained SVG elements, the canvas
 * 2D layout as stroked paths, so a vector object can sit over a raster game.
 *
 * The entity does not redraw by itself: a model draws the tree when it wants
 * to (`drawModel`), and the vector layout re-emits this entity's markup only
 * when `list.version` moved since the last frame.
 */
export class VectorEntity extends AbstractEntity {

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {string|false} penColor - Default stroke colour of the list.
   * @param {string|false} bkColor - Background, or false for none.
   */
  constructor(parentEntity, x, y, width, height, penColor, bkColor) {
    super(parentEntity, x, y, width, height, penColor, bkColor);
    this.id = 'VectorEntity';
    this.list = new VectorDisplayList();
    if (penColor) {
      this.list.defaults.color = penColor;
    }
    // false lets the list draw outside the entity's rectangle
    this.clipsList = true;
    // 'content' is the monitor's picture under the cabinet's overlay; 'top'
    // is above the overlay, off the glass (dev-mode indicators keep their colour)
    this.layer = 'content';
  } // constructor

  /**
   * Paints the display list, then the children over it.
   */
  drawSubEntities() {
    this.app.layout.paintDisplayList(this, this.list);
    super.drawSubEntities();
  } // drawSubEntities

} // VectorEntity
