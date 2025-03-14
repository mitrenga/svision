/**/
const { AbstractView } = await import('./abstractView.js?ver='+window.srcVersion);
/*/
import AbstractView from './abstractView.js';
/**/
// begin code

export class DesktopView  extends AbstractView {

  constructor(parentView, x, y, width, height) {
    super(parentView, x, y, width, height, false, false);
    this.id = 'DesktopView';
  } // constructor

} // class DesktopView

export default DesktopView;
