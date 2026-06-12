/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
import TextEntity from './textEntity.js';
/**/
// begin code

/**
 * A selectable list menu entity. It builds two-column text rows from a data source
 * callback, highlights the current selection with a selection bar, and supports
 * keyboard, gamepad, mouse, and touch navigation and activation.
 */
export class MenuEntity  extends AbstractEntity {

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
   * @param {Function} onGetData - Callback used to retrieve item count, texts, and events.
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
      t1LeftMargin: 0,
      t1TopMargin: 0, 
      t2Width: 0,
      t2RightMargin: 0,
      t2TopMargin: 0, 
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
      this.options.itemWidth = this.width-this.options.leftMargin-this.options.rightMargin;
    }
    if ('selection' in options) {
      this.selection = options.selection;
    }
  } // constructor

  /**
   * Builds the selection bar entity and the two text columns (primary and secondary)
   * for every menu item reported by the data source, applying selection and
   * hover/click colors.
   */
  init() {
    super.init();

    this.selectionEntity = new AbstractEntity(this, this.options.leftMargin, this.options.topMargin+this.selection*16, this.options.itemWidth, this.options.itemHeight, false, this.options.selectionBarColor);
    this.addEntity(this.selectionEntity);

    for (var y = 0; y < this.onGetData(this.dataSender, 'numberOfItems', 0); y++) {
      var penColor = this.options.textColor;
      if (y == this.selection) {
        penColor = this.options.selectionTextColor;
      }
      this.menuEntities[y] = [];
      this.menuEntities[y][0] = new TextEntity(this, this.options.fonts, this.options.leftMargin, this.options.topMargin+y*16, this.options.itemWidth, this.options.itemHeight, this.onGetData(this.dataSender, 't1', y), penColor, false, {topMargin: this.options.t1TopMargin, leftMargin: this.options.t1LeftMargin});
      if (y != this.selection) {
        this.menuEntities[y][0].hoverColor = this.options.hoverColor;
        this.menuEntities[y][0].clickColor = this.options.clickColor;
      } else {
        this.menuEntities[y][0].hoverColor = this.options.selectionHoverColor;
        this.menuEntities[y][0].clickColor = this.options.selectionClickColor;
      }
      this.addEntity(this.menuEntities[y][0]);
      this.menuEntities[y][1] = new TextEntity(this, this.options.fonts, this.options.leftMargin+this.options.itemWidth-this.options.t2Width, this.options.topMargin+y*16, this.options.t2Width, this.options.itemHeight, this.onGetData(this.dataSender, 't2', y), penColor, false, {topMargin: this.options.t2TopMargin, rightMargin: this.options.t2RightMargin, align: 'right'});
      this.addEntity(this.menuEntities[y][1]);
    }
  } // init

  /**
   * Re-reads the primary and secondary text of every menu item from the data source
   * and updates the corresponding text entities.
   */
  refreshMenu() {
    for (var y = 0; y < this.menuEntities.length; y++) {
      this.menuEntities[y][0].setText(this.onGetData(this.dataSender, 't1', y));
      this.menuEntities[y][1].setText(this.onGetData(this.dataSender, 't2', y));
    }
  } // refreshMenu

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
    this.menuEntities[this.selection][0].setPenColor(this.options.textColor);
    this.menuEntities[this.selection][1].setPenColor(this.options.textColor);
    this.selection = newSelection;
    this.menuEntities[this.selection][0].hoverColor = this.options.selectionHoverColor;
    this.menuEntities[this.selection][0].clickColor = this.options.selectionClickColor;
    this.menuEntities[this.selection][0].setPenColor(this.options.selectionTextColor);
    this.menuEntities[this.selection][1].setPenColor(this.options.selectionTextColor);
    this.selectionEntity.y = this.options.topMargin+this.selection*16;
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
            this.changeMenuItem(this.selection+1);
            return true;
          case 'ArrowUp':
          case 'GamepadUp':
            this.changeMenuItem(this.selection-1);
            return true;
          case 'Mouse1':
            for (var i = 0; i < this.menuEntities.length; i++) {
              if (this.menuEntities[i][0].pointOnEntity(event)) {
                this.app.inputEventsManager.keysMap.Mouse1 = this.menuEntities[i][0];
                this.menuEntities[i][0].clickState = true;
                return true;
              }
            }
          case 'Touch':
            for (var i = 0; i < this.menuEntities.length; i++) {
              if (this.menuEntities[i][0].pointOnEntity(event)) {
                this.app.inputEventsManager.touchesMap[event.identifier] = this.menuEntities[i][0];
                this.menuEntities[i][0].clickState = true;
                return true;
              }
            }
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
        }
        break;
        
    }
    
    return false;
  } // handleEvent

} // MenuEntity

export default MenuEntity;
