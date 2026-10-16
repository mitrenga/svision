const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { Scene3D } = await import('./scene3D.js?ver='+window.srcVersion);
// begin code

/**
 * An entity that shows a {@link Scene3D}: a viewport into the world. Like
 * a {@link VectorEntity} with its `list`, it is one rectangle of the desktop
 * (the GL viewport and scissor on the WebGL2 layout), between the background
 * and the children in z-order, and the objects of the world are the items
 * of its `scene`, not entities.
 *
 * On a layout with `paintScene` (WebGL2) the scene is rendered; on any other
 * (canvas 2D, vector) it is drawn as a wireframe through
 * {@link Scene3D#project} and `paintDisplayList` — the bridge, so a 3D
 * object can sit over a raster game and a tool can picture a fingerprint.
 *
 * Keep `bkColor` false: the scene's `background` clears the viewport, and a
 * background painted on the 2D overlay would cover the 3D picture.
 */
export class SceneEntity extends AbstractEntity {

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {string|false} penColor - Default edge and line colour of the scene.
   * @param {string|false} bkColor - Background on the 2D overlay, or false (recommended).
   */
  constructor(parentEntity, x, y, width, height, penColor, bkColor) {
    super(parentEntity, x, y, width, height, penColor, bkColor);
    this.id = 'SceneEntity';
    this.scene = new Scene3D();
    if (penColor) {
      this.scene.defaults.color = penColor;
    }
    // false lets the picture spill outside the entity's rectangle
    this.clipsScene = true;
    this.layer = 'content';
    /** the projected list of the bridge, kept while the scene and the size stand still */
    this.projected = null;
  } // constructor

  /**
   * Paints the scene, then the children over it.
   */
  drawSubEntities() {
    var layout = this.app.layout;
    if (typeof layout.paintScene == 'function') {
      layout.paintScene(this, this.scene);
    } else {
      this.clipsList = this.clipsScene;
      layout.paintDisplayList(this, this.projectedList());
    }
    super.drawSubEntities();
  } // drawSubEntities

  /**
   * The scene projected into the entity's rectangle, made again only when
   * the scene's version or the size moved.
   * @returns {VectorDisplayList}
   */
  projectedList() {
    var p = this.projected;
    if (p === null || p.version !== this.scene.version || p.width !== this.width || p.height !== this.height) {
      this.projected = {version: this.scene.version, width: this.width, height: this.height, list: this.scene.project(this.width, this.height)};
    }
    return this.projected.list;
  } // projectedList

} // SceneEntity
