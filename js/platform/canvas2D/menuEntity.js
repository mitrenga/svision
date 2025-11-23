/**/
const { AbstractEntity } = await import('../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('./textEntity.js?ver='+window.srcVersion);
/*/
import AbstractEntity from '../../abstractEntity.js';
import TextEntity from './textEntity.js';
/**/
// begin code

export class MenuEntity  extends AbstractEntity {

  constructor(parentEntity, x, y, width, height, bkColor, dataSender, onGetData) {
    super(parentEntity, x, y, width, height, false, bkColor);
    this.id = 'MenuEntity';

    this.dataSender = dataSender;
    this.onGetData = onGetData;
    this.selection = 0;
    this.hoverColor = '#a9a9a9ff';
    this.selectionHoverColor = this.app.platform.colorByName('blue');
    this.selectionEntity = null;
    this.itemPenColor = this.app.platform.colorByName('blue');
    this.selectionItemPenColor = this.app.platform.colorByName('brightWhite');
    this.menuEntities = [];
  } // constructor

  init() {
    super.init();

    this.selectionEntity = new AbstractEntity(this, 9, 8+this.selection*16, 210, 12, false, this.app.platform.colorByName('brightBlue'));
    this.addEntity(this.selectionEntity);

    for (var y = 0; y < this.onGetData(this.dataSender, 'numberOfItems', 0); y++) {
      var penColor = this.itemPenColor;
      if (y == this.selection) {
        penColor = this.selectionItemPenColor;
      }
      this.menuEntities[y] = [];
      this.menuEntities[y][0] = new TextEntity(this, this.app.fonts.zxFonts8x8, 9, 8+y*16, 210, 12, this.onGetData(this.dataSender, 't1', y), penColor, false, {topMargin: 2, leftMargin: 3});
      if (y != this.selection) {
        this.menuEntities[y][0].hoverColor = this.hoverColor;
      } else {
        this.menuEntities[y][0].hoverColor = this.selectionHoverColor;
      }
      this.addEntity(this.menuEntities[y][0]);
      this.menuEntities[y][1] = new TextEntity(this, this.app.fonts.zxFonts8x8, 105, 8+y*16, 114, 12, this.onGetData(this.dataSender, 't2', y), penColor, false, {topMargin: 2, rightMargin: 3, align: 'right'});
      this.addEntity(this.menuEntities[y][1]);
    }
  } // init

  refreshMenu() {
    for (var y = 0; y < this.menuEntities.length; y++) {
      this.menuEntities[y][0].setText(this.menuItems[y].label);
      this.menuEntities[y][1].setText(this.menuParamValue(this.menuItems[y].event));
    }
  } // refreshMenu

  changeMenuItem(newSelection) {
    if (newSelection < 0 || newSelection >= this.menuEntities.length) {
      return;
    }
    this.menuEntities[this.selection][0].hoverColor = this.hoverColor;
    this.menuEntities[this.selection][0].setPenColor(this.itemPenColor);
    this.menuEntities[this.selection][1].setPenColor(this.itemPenColor);
    this.selection = newSelection;
    this.menuEntities[this.selection][0].hoverColor = this.selectionHoverColor;
    this.menuEntities[this.selection][0].setPenColor(this.selectionItemPenColor);
    this.menuEntities[this.selection][1].setPenColor(this.selectionItemPenColor);
    this.selectionEntity.y = 8+this.selection*16;
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
