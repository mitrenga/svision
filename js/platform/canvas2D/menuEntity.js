/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
import TextEntity from './textEntity.js';
/**/
// begin code

export class MenuEntity  extends AbstractEntity {

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
  } // constructor

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

  refreshMenu() {
    for (var y = 0; y < this.menuEntities.length; y++) {
      this.menuEntities[y][0].setText(this.onGetData(this.dataSender, 't1', y));
      this.menuEntities[y][1].setText(this.onGetData(this.dataSender, 't2', y));
    }
  } // refreshMenu

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
            this.sendEvent(0, 0, {id: this.onGetData(this.dataSender, 'event', this.selection)});
            return true;
          case 'ArrowDown':
            this.changeMenuItem(this.selection+1);
            return true;
          case 'ArrowUp':
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
        }
        break;

      case 'keyRelease':
        switch (event.key) {
          case 'Mouse1':
            for (var i = 0; i < this.menuEntities.length; i++) {
              if (this.menuEntities[i][0].pointOnEntity(event)) {
                if (this.app.inputEventsManager.keysMap.Mouse1 === this.menuEntities[i][0]) {
                  this.changeMenuItem(i);
                  this.sendEvent(0, 0, {id: this.onGetData(this.dataSender, 'event', this.selection)});
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
