const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { VectorEntity } = await import('./vectorEntity.js?ver='+window.srcVersion);
const { VectorTextEntity } = await import('./vectorTextEntity.js?ver='+window.srcVersion);
// begin code

/**
 * A selectable list menu on the vector platform — the counterpart of the
 * canvas 2D `MenuEntity` with the same data source contract: `onGetData(
 * dataSender, key, row)` answers `numberOfItems`, `t1` (label), `t2`
 * (value), `event` (sent when the row is chosen) and optionally `penColor`.
 * Keyboard, gamepad, mouse and touch move and choose the way they do there.
 *
 * Rows are two {@link VectorTextEntity} columns (label left, value right).
 * The selection is not a bar — a vector monitor has no filled areas — but
 * the row drawn at full intensity between two brackets, the other rows
 * dimmer.
 *
 * Options: `font`, `size` (capital height), `spacing`, `leftMargin`,
 * `rightMargin`, `topMargin`, `itemWidth` (default the width minus the margins),
 * `itemHeight` (default the size), `itemPitch` (row to row), `t2Width`,
 * `textColor`, `selectionColor`, `intensity` (rows), `selectionIntensity`,
 * `bracketWidth`, `selection`, `columns`, `columnGap`, `t1Align` (the
 * label 'left', the default, or 'center' of its item).
 *
 * The items may stand in `columns` side by side, laid out **by rows** as in
 * `MenuEntity`: item `i` is in row `floor(i/columns)` and column
 * `i%columns`, the columns `columnGap` apart, `itemWidth` the width of one
 * column. Up and down move by a row (down to a shorter last row lands on its
 * last item), left and right within the row; a menu of one column leaves the
 * left and right keys to the model.
 */
export class VectorMenuEntity extends AbstractEntity {

  /**
   * @param {AbstractEntity} parentEntity
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {string|false} bkColor
   * @param {Object} options
   * @param {*} dataSender - Passed back to `onGetData`.
   * @param {Function} onGetData
   */
  constructor(parentEntity, x, y, width, height, bkColor, options, dataSender, onGetData) {
    super(parentEntity, x, y, width, height, false, bkColor);
    this.id = 'VectorMenuEntity';

    this.dataSender = dataSender;
    this.onGetData = onGetData;
    this.selection = 0;
    this.cursorEntity = null;
    this.menuEntities = [];

    this.options = {
      font: false,
      size: 24,
      spacing: 0,
      leftMargin: 0,
      rightMargin: 0,
      topMargin: 0,
      itemWidth: 0,
      itemHeight: 0,
      itemPitch: 40,
      columns: 1,
      columnGap: 0,
      t2Width: 0,
      t1Align: 'left',
      textColor: '#ffffff',
      selectionColor: false,
      intensity: 9,
      selectionIntensity: 15,
      bracketWidth: 12
    };
    Object.keys(options).forEach((key) => {
      if (key in this.options) {
        this.options[key] = options[key];
      }
    });
    if (this.options.itemWidth == 0) {
      var c = this.options.columns;
      this.options.itemWidth = Math.floor((this.width-this.options.leftMargin-this.options.rightMargin-(c-1)*this.options.columnGap)/c);
    }
    if (this.options.itemHeight == 0) {
      this.options.itemHeight = this.options.size;
    }
    if (this.options.t2Width == 0) {
      this.options.t2Width = Math.floor(this.options.itemWidth/2);
    }
    if (this.options.selectionColor === false) {
      this.options.selectionColor = this.options.textColor;
    }
    if ('selection' in options) {
      this.selection = options.selection;
    }
  } // constructor

  /**
   * Builds the brackets and the two columns of every row.
   */
  init() {
    super.init();
    var o = this.options;

    this.cursorEntity = new VectorEntity(this, this.itemX(this.selection), this.rowY(this.selection), o.itemWidth, o.itemHeight, o.selectionColor, false);
    this.cursorEntity.clipsList = false;
    this.addEntity(this.cursorEntity);
    this.drawCursor();

    var count = this.onGetData(this.dataSender, 'numberOfItems', 0);
    for (var y = 0; y < count; y++) {
      var color = this.itemColor(y);
      var intensity = y == this.selection ? o.selectionIntensity : o.intensity;
      this.menuEntities[y] = [];
      this.menuEntities[y][0] = new VectorTextEntity(this, this.itemX(y)+o.bracketWidth, this.rowY(y), o.itemWidth-2*o.bracketWidth, o.itemHeight, color, false,
        this.onGetData(this.dataSender, 't1', y), {font: o.font, size: o.size, spacing: o.spacing, intensity: intensity, align: o.t1Align});
      this.addEntity(this.menuEntities[y][0]);
      this.menuEntities[y][1] = new VectorTextEntity(this, this.itemX(y)+o.itemWidth-o.bracketWidth-o.t2Width, this.rowY(y), o.t2Width, o.itemHeight, color, false,
        this.onGetData(this.dataSender, 't2', y), {font: o.font, size: o.size, spacing: o.spacing, intensity: intensity, align: 'right'});
      this.addEntity(this.menuEntities[y][1]);
    }
  } // init

  /**
   * The x of an item inside the menu: the left margin and its column.
   * @param {number} i - The item.
   * @returns {number}
   */
  itemX(i) {
    return this.options.leftMargin+(i%this.options.columns)*(this.options.itemWidth+this.options.columnGap);
  } // itemX

  /**
   * The y of an item inside the menu: the top margin and its row.
   * @param {number} i - The item.
   * @returns {number}
   */
  rowY(i) {
    return this.options.topMargin+Math.floor(i/this.options.columns)*this.options.itemPitch;
  } // rowY

  /**
   * The item a key moves the selection to, by rows (see the class): up and
   * down by a row, left and right within the row; the selection itself when
   * the key leads nowhere.
   * @param {number} dx - -1 left, 1 right, 0 neither.
   * @param {number} dy - -1 up, 1 down, 0 neither.
   * @returns {number} The item.
   */
  movedSelection(dx, dy) {
    var c = this.options.columns, n = this.menuEntities.length, i = this.selection;
    if (dy < 0) {
      return i-c >= 0 ? i-c : i;
    }
    if (dy > 0) {
      if (i+c < n) {
        return i+c;
      }
      // no item under it: the shorter last row's last one, if there is a row below
      return Math.floor(i/c) < Math.floor((n-1)/c) ? n-1 : i;
    }
    if (dx < 0) {
      return i%c > 0 ? i-1 : i;
    }
    if (dx > 0) {
      return i%c < c-1 && i+1 < n ? i+1 : i;
    }
    return i;
  } // movedSelection

  /**
   * The colour of a row's text: its own `penColor` from the data source,
   * else the menu's `textColor`.
   * @param {number} y - The row.
   * @returns {string}
   */
  itemColor(y) {
    var own = this.onGetData(this.dataSender, 'penColor', y);
    return own ? own : this.options.textColor;
  } // itemColor

  /**
   * Draws the two brackets of the cursor around the selected row.
   */
  drawCursor() {
    var o = this.options;
    var w = o.itemWidth, h = o.itemHeight, b = o.bracketWidth*0.6;
    var l = this.cursorEntity.list;
    l.clear();
    l.polyline([b, 0, 0, 0, 0, h, b, h], {intensity: o.selectionIntensity, strokeWidth: o.size/10});
    l.polyline([w-b, 0, w, 0, w, h, w-b, h], {intensity: o.selectionIntensity, strokeWidth: o.size/10});
  } // drawCursor

  /**
   * Re-reads the label and the value of every row from the data source.
   */
  refreshMenu() {
    for (var y = 0; y < this.menuEntities.length; y++) {
      this.menuEntities[y][0].setText(this.onGetData(this.dataSender, 't1', y));
      this.menuEntities[y][1].setText(this.onGetData(this.dataSender, 't2', y));
    }
  } // refreshMenu

  /**
   * Moves the selection: the old row dims, the new one brightens and the
   * brackets move to it.
   * @param {number} newSelection - The row to select.
   */
  changeMenuItem(newSelection) {
    if (newSelection < 0 || newSelection >= this.menuEntities.length) {
      return;
    }
    var o = this.options;
    this.menuEntities[this.selection][0].setIntensity(o.intensity);
    this.menuEntities[this.selection][1].setIntensity(o.intensity);
    this.selection = newSelection;
    this.menuEntities[this.selection][0].setIntensity(o.selectionIntensity);
    this.menuEntities[this.selection][1].setIntensity(o.selectionIntensity);
    this.cursorEntity.x = this.itemX(this.selection);
    this.cursorEntity.y = this.rowY(this.selection);
    this.cursorEntity.setPenColor(this.itemColor(this.selection));
  } // changeMenuItem

  /**
   * The item under a pointer event, or -1.
   * @param {Object} event - An event with `x` and `y` in model units.
   * @returns {number}
   */
  rowAt(event) {
    for (var i = 0; i < this.menuEntities.length; i++) {
      var row = this.menuEntities[i][0];
      var x = this.parentX+this.x+this.itemX(i);
      if (x <= event.x && event.x <= x+this.options.itemWidth
          && row.parentY+row.y <= event.y && event.y <= row.parentY+row.y+row.height) {
        return i;
      }
    }
    return -1;
  } // rowAt

  /**
   * Chooses the selected row: sends its event to the model.
   */
  choose() {
    this.sendEvent(0, 0, this.onGetData(this.dataSender, 'event', this.selection));
  } // choose

  /**
   * Menu events: `refreshMenu`, arrows and gamepad to move, Enter/OK to
   * choose, a press and release of the mouse or a touch on a row to select
   * and choose it.
   * @param {Object} event
   * @returns {boolean}
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    var row;
    switch (event.id) {

      case 'refreshMenu':
        this.refreshMenu();
        return true;

      case 'keyPress':
        switch (event.key) {
          case 'Enter':
          case 'GamepadOK':
            this.choose();
            return true;
          case 'ArrowDown':
          case 'GamepadDown':
            this.changeMenuItem(this.movedSelection(0, 1));
            return true;
          case 'ArrowUp':
          case 'GamepadUp':
            this.changeMenuItem(this.movedSelection(0, -1));
            return true;
          case 'ArrowLeft':
          case 'GamepadLeft':
            // one column: the key stays the model's
            if (this.options.columns > 1) {
              this.changeMenuItem(this.movedSelection(-1, 0));
              return true;
            }
            break;
          case 'ArrowRight':
          case 'GamepadRight':
            if (this.options.columns > 1) {
              this.changeMenuItem(this.movedSelection(1, 0));
              return true;
            }
            break;
          case 'Mouse1':
            row = this.rowAt(event);
            if (row >= 0) {
              this.app.inputEventsManager.keysMap.Mouse1 = this.menuEntities[row][0];
              return true;
            }
            break;
          case 'Touch':
            row = this.rowAt(event);
            if (row >= 0) {
              this.app.inputEventsManager.touchesMap[event.identifier] = this.menuEntities[row][0];
              return true;
            }
            break;
        }
        break;

      case 'keyRelease':
        switch (event.key) {
          case 'Mouse1':
            row = this.rowAt(event);
            if (row >= 0 && this.app.inputEventsManager.keysMap.Mouse1 === this.menuEntities[row][0]) {
              this.changeMenuItem(row);
              this.choose();
              return true;
            }
            break;
          case 'Touch':
            row = this.rowAt(event);
            if (row >= 0 && this.app.inputEventsManager.touchesMap[event.identifier] === this.menuEntities[row][0]) {
              this.changeMenuItem(row);
              this.choose();
              return true;
            }
            break;
        }
        break;

    }
    return false;
  } // handleEvent

} // VectorMenuEntity
