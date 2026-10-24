const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
const { SlidingTextEntity } = await import('./slidingTextEntity.js?ver='+window.srcVersion);
// begin code

/**
 * A selectable list menu entity. It builds one row per item from a data source
 * callback — a label (TextEntity) and a value column (SlidingTextEntity) —
 * highlights the current selection with a selection bar, and supports
 * keyboard, gamepad, mouse, and touch navigation and activation.
 *
 * A value that fits its column sits right aligned; one too long for it (a
 * player's name) ping-pongs instead of being cut, and only in the space the
 * label leaves free, never across it (placeValue()). The ping-pong is not
 * ticked on its own: the model must call loopEntity() every frame, or the
 * values stay put.
 *
 * Besides the item count and texts, the data source may give every row a
 * `penColor` of its own; itemColor(), barColor() and selectedColor() then
 * colour the menu in groups (Sabre Wulf: yellow, cyan, white) and the
 * selection bar and selected text follow it when `selectionBarColor` /
 * `selectionTextColor` are false.
 *
 * The items may stand in `columns` side by side, laid out **by rows**: item
 * `i` is in row `floor(i/columns)` and column `i%columns`, the columns
 * `columnGap` apart. `itemWidth` is then the width of one column (by default
 * the width minus the margins and the gaps, shared evenly). Up and down move
 * by a row and stop at the edge — down from a row above a shorter last row
 * that has no item under the selection goes to the last item; left and right
 * move within the row. A menu of one column (the default) does not take the
 * left and right keys at all, so the model gets them as it always has.
 *
 * `t1Align` puts the label 'left' (the default, after `t1LeftMargin`) or
 * 'center' of its item; the value still starts after the label's text.
 */
export class MenuEntity extends AbstractEntity {

  /** pixels kept free between a label and its value */
  static get VALUE_GAP() { return 7; }

  /**
   * Creates a menu entity.
   * @param {AbstractEntity} parentEntity - The parent entity this menu is attached to.
   * @param {number} x - X position relative to the parent.
   * @param {number} y - Y position relative to the parent.
   * @param {number} width - Menu width.
   * @param {number} height - Menu height.
   * @param {string|false} bkColor - Background color.
   * @param {Object} options - Layout, margin, and color options for the menu.
   * @param {*} dataSender - The object passed back to onGetData as the data source.
   * @param {Function} onGetData - Callback `(dataSender, what, row)` asked for `'numberOfItems'` (the item count), `'t1'` (the label of a row), `'t2'` (its value), `'penColor'` (the row's own colour, or a falsy value for the menu's `textColor`) and the events of a row.
   */
  constructor(parentEntity, x, y, width, height, bkColor, options, dataSender, onGetData) {
    super(parentEntity, x, y, width, height, false, bkColor);
    this.id = 'MenuEntity';

    this.dataSender = dataSender;
    this.onGetData = onGetData;
    this.selection = 0;
    this.selectionEntity = null;
    this.menuEntities = [];

    this.options = {
      fonts: false,
      leftMargin: 0,
      rightMargin: 0,
      topMargin: 0,
      itemWidth: 0,
      itemHeight: 0,
      // vertical distance between the tops of two items; 16 has been the
      // pitch of every menu so far, a menu with many items on a small screen
      // packs them tighter
      itemPitch: 16,
      // items side by side, laid out by rows (itemX(), itemY())
      columns: 1,
      columnGap: 0,
      t1LeftMargin: 0,
      t1Align: 'left',
      t1TopMargin: 0, 
      t2Width: 0,
      t2RightMargin: 0,
      t2TopMargin: 0, 
      t2Speed: 30,            // ms per pixel when a value ping-pongs
      t2Freezing: 1500,       // ms it rests at either end
      textColor: false,
      selectionTextColor: false,
      selectionBarColor: false,
      hoverColor: false,
      selectionHoverColor: false,
      clickColor: false,
      selectionClickColor: false
    };
    Object.keys(options).forEach(key => {
      if (key in this.options) {
        this.options[key] = options[key];
      }
    });
    if (this.options.itemWidth == 0) {
      var c = this.options.columns;
      this.options.itemWidth = Math.floor((this.width-this.options.leftMargin-this.options.rightMargin-(c-1)*this.options.columnGap)/c);
    }
    if ('selection' in options) {
      this.selection = options.selection;
    }
  } // constructor

  /**
   * Builds the selection bar entity and, for every menu item reported by the
   * data source, the label (TextEntity) and the value column (a right aligned,
   * ping-ponging SlidingTextEntity placed after the label by placeValue()),
   * applying the per-row and selection colours and the hover/click colors.
   */
  init() {
    super.init();

    this.selectionEntity = new AbstractEntity(this, this.itemX(this.selection), this.itemY(this.selection), this.options.itemWidth, this.options.itemHeight, false, this.barColor(this.selection));
    this.addEntity(this.selectionEntity);

    for (var y = 0; y < this.onGetData(this.dataSender, 'numberOfItems', 0); y++) {
      var penColor = this.itemColor(y);
      if (y == this.selection) {
        penColor = this.selectedColor(y);
      }
      this.menuEntities[y] = [];
      this.menuEntities[y][0] = new TextEntity(this, this.options.fonts, this.itemX(y), this.itemY(y), this.options.itemWidth, this.options.itemHeight, this.onGetData(this.dataSender, 't1', y), penColor, false, {topMargin: this.options.t1TopMargin, leftMargin: this.options.t1LeftMargin, align: this.options.t1Align});
      if (y != this.selection) {
        this.menuEntities[y][0].hoverColor = this.options.hoverColor;
        this.menuEntities[y][0].clickColor = this.options.clickColor;
      } else {
        this.menuEntities[y][0].hoverColor = this.options.selectionHoverColor;
        this.menuEntities[y][0].clickColor = this.options.selectionClickColor;
      }
      this.addEntity(this.menuEntities[y][0]);
      // the value column is a SlidingTextEntity: a value that fits sits right
      // aligned like plain text, one too long for the column (a player's name)
      // ping-pongs instead of being cut
      this.menuEntities[y][1] = new SlidingTextEntity(this, this.options.fonts, this.itemX(y)+this.options.itemWidth-this.options.t2Width, this.itemY(y), this.options.t2Width, this.options.itemHeight, this.onGetData(this.dataSender, 't2', y), penColor, false, {topMargin: this.options.t2TopMargin, rightMargin: this.options.t2RightMargin, align: 'right', animation: 'pingPong', speed: this.options.t2Speed, freezing: this.options.t2Freezing});
      this.addEntity(this.menuEntities[y][1]);
      this.placeValue(y);
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
  itemY(i) {
    return this.options.topMargin+Math.floor(i/this.options.columns)*this.options.itemPitch;
  } // itemY

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
   * Advances the ping-pong of the value column. Entities are not ticked on
   * their own, so the model calls this from its loopModel() — the same way it
   * ticks a modal entity — or the values stay put, cut at the column's edge.
   * @param {number} timestamp - The animation timestamp in milliseconds.
   */
  loopEntity(timestamp) {
    for (var y = 0; y < this.menuEntities.length; y++) {
      this.menuEntities[y][1].loopEntity(timestamp);
    }
  } // loopEntity

  /**
   * The colour of an item's text when it is not selected: the item's own
   * `penColor`, when the data source gives it one, else the menu's `textColor`.
   * A menu can so colour its items in groups, the way the original's game
   * selection screen does (Sabre Wulf: yellow, cyan, white).
   * @param {number} y - The row.
   * @returns {string} A colour.
   */
  itemColor(y) {
    var own = this.onGetData(this.dataSender, 'penColor', y);
    return own ? own : this.options.textColor;
  } // itemColor

  /**
   * The colour of the selection bar: `selectionBarColor`, or — when that is
   * `false` — the colour of the selected item's own text, so the bar takes the
   * colour of the group the item belongs to.
   * @param {number} y - The row.
   * @returns {string} A colour.
   */
  barColor(y) {
    return this.options.selectionBarColor === false
      ? this.itemColor(y) : this.options.selectionBarColor;
  } // barColor

  /**
   * The colour of the selected item's text: `selectionTextColor`, or — when
   * that is `false` — the item's own colour, so a menu coloured in groups keeps
   * its colours under the selection bar.
   * @param {number} y - The row.
   * @returns {string} A colour.
   */
  selectedColor(y) {
    return this.options.selectionTextColor === false
      ? this.itemColor(y) : this.options.selectionTextColor;
  } // selectedColor

  /**
   * Re-reads the primary and secondary text of every menu item from the data source
   * and updates the corresponding text entities — and their colour, so a row whose
   * `penColor` changed with its text (a label turned into a warning) takes it too.
   */
  refreshMenu() {
    for (var y = 0; y < this.menuEntities.length; y++) {
      this.menuEntities[y][0].setText(this.onGetData(this.dataSender, 't1', y));
      this.placeValue(y);
      this.menuEntities[y][1].setText(this.onGetData(this.dataSender, 't2', y));
      var penColor = y === this.selection ? this.selectedColor(y) : this.itemColor(y);
      this.menuEntities[y][0].setPenColor(penColor);
      this.menuEntities[y][1].setPenColor(penColor);
    }
    if (this.selectionEntity) { this.selectionEntity.bkColor = this.barColor(this.selection); }
  } // refreshMenu

  /**
   * Puts the value column of a row **after the label**: it is `t2Width` wide
   * and right aligned, but never reaches back over the label's text, so a
   * value that scrolls (a long player's name) scrolls in the space the label
   * leaves free and not across it. Called whenever the label may have changed.
   * @param {number} y - The row.
   */
  placeValue(y) {
    var label = this.menuEntities[y][0], value = this.menuEntities[y][1];
    var right = this.itemX(y)+this.options.itemWidth;
    var textWidth = label.lineWidth(label.text);
    // where the label's text ends, as TextEntity places it
    var end = this.options.t1Align === 'center' && textWidth < this.options.itemWidth
      ? this.itemX(y)+Math.floor(this.options.itemWidth/2)-Math.floor(textWidth/2)+textWidth
      : this.itemX(y)+this.options.t1LeftMargin+textWidth;
    var after = end+MenuEntity.VALUE_GAP;
    // the column starts 3 px in from where t2Width would put it, and is that
    // much narrower; its right hand edge stays
    var x = Math.max(right-this.options.t2Width+3, after);
    if (x !== value.x || right-x !== value.width) {
      value.x = x;
      value.width = Math.max(0, right-x);
      value.setText(value.text);                    // the scroll width follows
    }
  } // placeValue

  /**
   * Moves the selection to a new item, restoring colors on the previously selected
   * row, applying selection colors to the new row, and repositioning the selection bar.
   * @param {number} newSelection - The index of the item to select.
   */
  changeMenuItem(newSelection) {
    if (newSelection < 0 || newSelection >= this.menuEntities.length) {
      return;
    }
    this.menuEntities[this.selection][0].hoverColor = this.options.hoverColor;
    this.menuEntities[this.selection][0].clickColor = this.options.clickColor;
    this.menuEntities[this.selection][0].setPenColor(this.itemColor(this.selection));
    this.menuEntities[this.selection][1].setPenColor(this.itemColor(this.selection));
    this.selection = newSelection;
    this.menuEntities[this.selection][0].hoverColor = this.options.selectionHoverColor;
    this.menuEntities[this.selection][0].clickColor = this.options.selectionClickColor;
    this.menuEntities[this.selection][0].setPenColor(this.selectedColor(this.selection));
    this.menuEntities[this.selection][1].setPenColor(this.selectedColor(this.selection));
    this.selectionEntity.x = this.itemX(this.selection);
    this.selectionEntity.y = this.itemY(this.selection);
    this.selectionEntity.bkColor = this.barColor(this.selection);
  } // changeMenuItem
  
  /**
   * Handles menu events: refreshes item texts, moves the selection with arrow/gamepad
   * keys, activates the selected item on Enter/OK, and arms/activates items via mouse
   * and touch presses and releases.
   * @param {Object} event - The input event to process.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }

    switch (event.id) {

      case 'refreshMenu':
        this.refreshMenu();
        return true;
        
      case 'keyPress':
        switch (event.key) {
          case 'Enter':
          case 'GamepadOK':
            this.sendEvent(0, 0, this.onGetData(this.dataSender, 'event', this.selection));
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
            for (var i = 0; i < this.menuEntities.length; i++) {
              if (this.menuEntities[i][0].pointOnEntity(event)) {
                this.app.inputEventsManager.keysMap.Mouse1 = this.menuEntities[i][0];
                this.menuEntities[i][0].clickState = true;
                return true;
              }
            }
            break;
          case 'Touch':
            for (var i = 0; i < this.menuEntities.length; i++) {
              if (this.menuEntities[i][0].pointOnEntity(event)) {
                this.app.inputEventsManager.touchesMap[event.identifier] = this.menuEntities[i][0];
                this.menuEntities[i][0].clickState = true;
                return true;
              }
            }
            break;
        }
        break;

      case 'keyRelease':
        switch (event.key) {
          case 'Mouse1':
            for (var i = 0; i < this.menuEntities.length; i++) {
              if (this.menuEntities[i][0].pointOnEntity(event)) {
                if (this.app.inputEventsManager.keysMap.Mouse1 === this.menuEntities[i][0]) {
                  this.changeMenuItem(i);
                  this.sendEvent(0, 0, this.onGetData(this.dataSender, 'event', this.selection));
                  return true;
                }
              }
            }
            break;
          case 'Touch':
            for (var i = 0; i < this.menuEntities.length; i++) {
              if (this.menuEntities[i][0].pointOnEntity(event)) {
                if (this.app.inputEventsManager.touchesMap[event.identifier] === this.menuEntities[i][0]) {
                  this.changeMenuItem(i);
                  this.sendEvent(0, 0, this.onGetData(this.dataSender, 'event', this.selection));
                  return true;
                }
              }
            }
            break;
        }
        break;
        
    }
    
    return false;
  } // handleEvent

} // MenuEntity
