/**/
const { AbstractView } = await import('./abstractView.js?ver='+window.srcVersion);
/*/
import AbstractView from './abstractView.js';
/**/
// begin code

export class BorderView  extends AbstractView {

  constructor(parentView, x, y, width, height) {
    super(parentView, x, y, width, height);
    this.id = 'BorderView';
  } // constructor

} // class BorderView

export default BorderView;
