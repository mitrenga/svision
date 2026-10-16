const { VectorTextEntity } = await import('./vectorTextEntity.js?ver='+window.srcVersion);
// begin code

/**
 * The dev-mode banner at the bottom of a screen, centred, shown by the
 * menu and the game when the application runs in dev mode — the vector
 * counterpart of the banner the ZX games draw in their border (`borderEntity.js` of each). Its text and colours
 * are `app.devModeName` as `appPage.php` composes it: a style prefix
 * `.{"penColor", "bkColor"}` and the text — `◢◤ ◢◤ DEVELOPER MODE ◢◤ ◢◤`
 * on yellow when the sources are served, `>>>> bundle <<<<` on red with a
 * debug bundle. On the XY monitor there is no background, so `bkColor`
 * becomes the colour of the strokes; `◢◤` the font has not, they become
 * `/` and a row of them one ornament (`//////// DEVELOPER MODE ////////`).
 * The ornaments (`/`, `>`, `<`) are drawn with a heavy stroke
 * (5 x size/10), the words with a light one (2 x size/10), the whole
 * centred as one run. It sits on the layer above the cabinet's cellophane
 * (`layer = 'top'`), so the colour stays as it is. The same yellow serves
 * the FPS indicator of the game.
 */
export class VectorDevModeEntity extends VectorTextEntity {

  /** the yellow of the dev-mode indicators (the banner's own colour when the name has none) */
  static get COLOR() { return '#ffff40'; }
  /**
   * The stroke width of the ornaments in units of size/10.
   * @returns {number}
   */
  static get HEAVY() { return 5; }

  /**
   * The stroke width of the words in units of size/10.
   * @returns {number}
   */
  static get LIGHT() { return 2; }

  /**
   * The banner's colour and text out of `devModeName`.
   * @param {string|false} devModeName
   * @returns {{color: string, text: string}}
   */
  static parse(devModeName) {
    var color = VectorDevModeEntity.COLOR;
    var text = String(devModeName || 'DEVELOPER MODE');
    if (text[0] == '.' && text[1] == '{') {
      var end = text.indexOf('}');
      try {
        var cfg = JSON.parse(text.substring(1, end+1));
        if (cfg.bkColor) {
          color = cfg.bkColor;
        }
      } catch (error) {
        console.error(error.message);
      }
      text = text.substring(end+1);
    }
    // each ◢◤ is a stroke, a row of them one ornament without gaps
    text = text.replace(/[◢◤]/g, '/').replace(/\/(\s+\/)+/g, (m) => m.replace(/\s+/g, '')).replace(/\s+/g, ' ').trim().toUpperCase();
    return {color: color, text: text};
  } // parse

  /**
   * The runs of a text: ornaments and words by turns, each with its stroke
   * width factor.
   * @param {string} text
   * @returns {Array} `[[text, factor], ...]`
   */
  static runs(text) {
    var out = [];
    (text.match(/[\/<>]+|[^\/<>]+/g) || []).forEach((part) => {
      out.push([part, /^[\/<>]/.test(part) ? VectorDevModeEntity.HEAVY : VectorDevModeEntity.LIGHT]);
    });
    return out;
  } // runs

  /**
   * @param {AbstractEntity} parentEntity - The desktop.
   */
  constructor(parentEntity) {
    var model = parentEntity.model;
    var banner = VectorDevModeEntity.parse(model.app.devModeName);
    super(parentEntity, 0, model.desktopHeight-30, model.desktopWidth, 18, banner.color, false, banner.text, {size: 18, align: 'center', intensity: 8});
    this.id = 'VectorDevModeEntity';
    this.layer = 'top';
  } // constructor

  /**
   * The runs one after another, each with its own stroke width.
   */
  cleanCache() {
    var o = this.options, font = o.font;
    var x = this.width/2-font.textWidth(this.text, o.size, o.spacing)/2;
    var y = Math.max(0, (this.height-o.size)/2);
    this.list.clear();
    VectorDevModeEntity.runs(this.text).forEach((run) => {
      x = font.draw(this.list, x, y, run[0], {size: o.size, spacing: o.spacing, intensity: o.intensity, color: this.penColor, strokeWidth: run[1]*o.size/10});
    });
  } // cleanCache

} // VectorDevModeEntity
