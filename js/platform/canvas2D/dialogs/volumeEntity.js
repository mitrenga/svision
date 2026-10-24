const { AbstractEntity } = await import('../../../abstractEntity.js?ver='+window.srcVersion);
const { TextEntity } = await import('../textEntity.js?ver='+window.srcVersion);
const { SliderEntity } = await import('../sliderEntity.js?ver='+window.srcVersion);
const { ButtonEntity } = await import('../buttonEntity.js?ver='+window.srcVersion);
const { WaitForAudioEventEntity } = await import('./waitForAudioEventEntity.js?ver='+window.srcVersion);
const { DialogEntity } = await import('./dialogEntity.js?ver='+window.srcVersion);
const { DialogProperties } = await import('./dialogProperties.js?ver='+window.srcVersion);
const { DialogTheme } = await import('./dialogTheme.js?ver='+window.srcVersion);
const { VolumeControl } = await import('./volumeControl.js?ver='+window.srcVersion);
// begin code

/**
 * Dialog entity for adjusting the audio volume of a given bus, the canvas 2D
 * one (R-056; the vector platform has VectorVolumeEntity, both on
 * VolumeControl). It renders a slider with buttons, persists the volume to a
 * cookie, can play a sample sound and reports the active audio driver state.
 *
 * Contents only, no frame and no title (the title used to be the bus name):
 * a game puts it into a window (DialogEntity) or onto its screen and colours
 * it through the `theme` of its dialog properties (DialogProperties). The
 * layout is **computed from the entity's size and the theme's fonts**
 * (`labelFont`, `buttonFont`, `stepFont`): the rows — title, presets,
 * slider, steps, PLAY SAMPLE, CLOSE with the driver note — take their
 * heights from the fonts, the free height goes into the gaps in fixed
 * proportions, the buttons are as wide as their text, the side buttons keep
 * a gap from the edge, the rest is centred, and the slider (SliderEntity)
 * takes the width with a whole pitch. In 200 x 124 with the 5x5 fonts it is
 * the ZX Spectrum dialog as it was; a platform wrapper (ZXVolumeEntity,
 * C64VolumeEntity, Atari8VolumeEntity) only sets the fonts and the window.
 * PLAY SAMPLE without the browser's gesture for audio opens
 * WaitForAudioEventEntity in a window placed and coloured by the
 * `waitForAudioEvent` part of the same properties. CLOSE sends a
 * 'contentClosed' event to the parent so a window can close with it.
 */
export class VolumeEntity extends AbstractEntity {

  /** the gaps between the rows as shares of the free height — above the title, between the five rows, before the bottom row — the ZX Spectrum dialog's own, so 200 x 124 with the 5x5 fonts comes out as it was */
  static get GAP_WEIGHTS() { return [13, 5, 2, 2, 9, 15]; }

  /**
   * Creates the volume dialog entity for a specific audio bus.
   * @param {AbstractEntity} parentEntity - The parent entity in the entity tree.
   * @param {number} x - The x position relative to the parent.
   * @param {number} y - The y position relative to the parent.
   * @param {number} width - The entity width.
   * @param {number} height - The entity height.
   * @param {string} bus - The audio bus identifier this dialog controls.
   * @param {string} cookie - The cookie name used to persist the volume.
   * @param {*} sampleSound - The sample sound played when previewing the volume.
   * @param {Object} [properties] - The dialog properties, see DialogProperties; the panel uses `theme` and `waitForAudioEvent`.
   */
  constructor(parentEntity, x, y, width, height, bus, cookie, sampleSound, properties = {}) {
    properties = DialogProperties.merge(properties);
    var theme = properties.theme;
    super(parentEntity, x, y, width, height, false, theme.bkColor);
    this.id = 'VolumeEntity';

    this.properties = properties;
    this.theme = theme;
    // whether the nested dialogs (WaitForAudioEventEntity) are clipped to the
    // contents; a game that puts one over the title bar of the window
    // (negative coordinates) sets `clipsChildren: false`
    this.clipsChildren = properties.clipsChildren;
    this.control = new VolumeControl(this, bus, cookie, sampleSound);
    this.bus = bus;
    this.sliderEntity = null;
    this.driverEntity = null;
    /** whether PLAY SAMPLE opened the bus: from then on the driver note follows the level */
    this.samplePlayed = false;
    /** the gap of the side buttons and the note from the edge */
    this.sideMargin = 2;
  } // constructor

  /**
   * The rows of the layout for the fonts and the size: `y` and `height` of
   * the title, the presets, the slider, the steps, PLAY SAMPLE and the bottom
   * row, and the heights of a button and the slider.
   * @param {Object} fonts - `{label, button, step}` font instances.
   * @returns {Object} The layout.
   */
  layout(fonts) {
    var buttonHeight = fonts.button.charsHeight+8;
    var sliderHeight = buttonHeight+2;
    var titleHeight = fonts.label.charsHeight+4;
    var bottomHeight = buttonHeight+2;
    var heights = [titleHeight, buttonHeight, sliderHeight, buttonHeight, buttonHeight, bottomHeight];
    var fixed = heights.reduce((a, b) => a+b, 0);
    var free = Math.max(0, this.height-fixed);
    var weights = VolumeEntity.GAP_WEIGHTS;
    var total = weights.reduce((a, b) => a+b, 0);
    var rows = [];
    var y = 0, used = 0, sum = 0;
    for (var i = 0; i < heights.length; i++) {
      sum += weights[i];
      var gap = Math.round(free*sum/total)-used;
      used += gap;
      y += gap;
      rows.push({y: y, height: heights[i]});
      y += heights[i];
    }
    return {rows: rows, buttonHeight: buttonHeight, sliderHeight: sliderHeight};
  } // layout

  /**
   * A button as wide as its text plus the padding, centred vertically in a
   * row of the layout.
   * @param {Object} fonts - The button's font.
   * @param {number} x - Where it goes; false centres it.
   * @param {Object} row - `{y, height}` of the layout.
   * @param {string} text - The caption.
   * @param {Object} event - The event sent.
   * @param {Array<string>} hotKeys - The keys that press it.
   * @param {string|false} bkColor - Its colour.
   * @param {number} [padding] - Pixels left and right of the text (2).
   * @param {string|false} [penColor] - The text's colour; false is the theme's `buttonPenColor`.
   * @returns {ButtonEntity} Added to the entity.
   */
  button(fonts, x, row, text, event, hotKeys, bkColor, padding = 2, penColor = false) {
    var width = DialogTheme.textWidth(fonts, text)+2*padding;
    var height = row.height;
    if (x === false) {
      x = Math.floor((this.width-width)/2);
    } else if (x < 0) {
      x = this.width+x-width;
    }
    var topMargin = Math.floor((height-fonts.charsHeight)/2);
    var button = new ButtonEntity(this, fonts, x, row.y, width, height, text, event, hotKeys, penColor || this.theme.buttonPenColor, bkColor, {align: 'center', topMargin: topMargin});
    this.addEntity(button);
    return button;
  } // button

  /**
   * Builds the dialog: the title, the presets, the slider, the step buttons,
   * PLAY SAMPLE, CLOSE and the driver note, laid out for the size and the
   * fonts of the theme.
   */
  init() {
    super.init();
    var fonts = {
      label: DialogTheme.font(this.app, this.theme.labelFont),
      button: DialogTheme.font(this.app, this.theme.buttonFont),
      step: DialogTheme.font(this.app, this.theme.stepFont)
    };
    var l = this.layout(fonts);
    var r = l.rows;
    var right = -this.sideMargin;   // a negative x places a button by its right edge

    this.addEntity(new TextEntity(this, fonts.label, 0, r[0].y, this.width, r[0].height, 'CHANGE VOLUME FOR GAME '+String(this.bus).toUpperCase(), this.theme.penColor, false, {align: 'center'}));

    var t = this.theme;
    this.button(fonts.button, this.sideMargin, r[1], 'OFF', {id: 'setVolume0'}, [], t.okButtonColor, 2, t.okButtonPenColor);
    this.button(fonts.button, false, r[1], '50%', {id: 'setVolume5'}, [], t.okButtonColor, 2, t.okButtonPenColor);
    this.button(fonts.button, right, r[1], 'MAX', {id: 'setVolume10'}, [], t.okButtonColor, 2, t.okButtonPenColor);

    // the slider: the widest track with a whole pitch inside a 9 px margin, centred
    var trackWidth = SliderEntity.trackWidthFor(this.width-18, 11);
    this.sliderEntity = new SliderEntity(this, Math.floor((this.width-trackWidth)/2), r[2].y, trackWidth, l.sliderHeight,
      {positions: 11, value: this.control.level(), color: this.theme.sliderColor, cursorColor: this.theme.cursorColor, event: {id: 'sliderVolume'}});
    this.addEntity(this.sliderEntity);

    var stepColor = t.stepButtonColor || t.closeButtonColor;
    this.button(fonts.step, this.sideMargin, r[3], '-', {id: 'changeVolumeDown'}, ['ArrowLeft', '-', 'GamepadLeft'], stepColor, 7, t.stepButtonPenColor);
    this.button(fonts.step, right, r[3], '+', {id: 'changeVolumeUp'}, ['ArrowRight', '+', 'GamepadRight'], stepColor, 7, t.stepButtonPenColor);

    this.button(fonts.button, false, r[4], 'PLAY SAMPLE', {id: 'playSample'}, ['Enter', 'GamepadOK'], this.theme.buttonColor, 4);

    // the bottom row: CLOSE 2 px above the edge, the driver note under its left
    this.button(fonts.button, right, {y: this.height-2-l.buttonHeight, height: l.buttonHeight}, 'CLOSE', {id: 'closeVolume'}, ['Escape', 'GamepadExit'], this.theme.closeButtonColor, 5);

    var noteHeight = fonts.label.charsHeight;
    this.driverEntity = new TextEntity(this, fonts.label, this.sideMargin, this.height-noteHeight-2, this.width-2*this.sideMargin, noteHeight, '', this.theme.warningColor, false, {});
    this.addEntity(this.driverEntity);
  } // init

  /**
   * The level as a menu row shows it (the same words as the dialog's
   * buttons): OFF, 10%..90%, MAX. VolumeControl.levelText, kept here for the
   * menus that read it off the entity class.
   * @param {number} level - 0..10
   * @returns {string}
   */
  static levelText(level) {
    return VolumeControl.levelText(level);
  } // levelText

  /**
   * Sets the bus volume, clamping it to the range 0-10, persists it to the
   * cookie and moves the slider's cursor.
   * @param {number} volume - The requested volume level (clamped to 0-10).
   */
  changeVolume(volume) {
    this.sliderEntity.setValue(this.control.set(volume));
    // the driver note follows the level once a sample has been played: NOTE: AUDIO DRIVER IS OFF goes when the
    // level leaves 0 — the game would get the silent handler at 0 — and comes back at 0
    if (this.samplePlayed) {
      this.driverEntity.setText(this.control.driverNote());
    }
  } // changeVolume

  /**
   * Handles the volume dialog events: setting/changing the volume, playing the
   * sample sound (prompting for a user gesture when required), reporting audio
   * errors and closing the dialog.
   * @param {Object} event - The event object, identified by its id property.
   * @returns {boolean} True if the event was handled, otherwise false.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }
    if (event.id.substring(0, 9) == 'setVolume') {
      this.changeVolume(Number(event.id.substring(9)));
      return true;
    }
    switch (event.id) {
      case 'sliderVolume':
        this.changeVolume(event.value);
        return true;
      case 'changeVolumeUp':
        this.changeVolume(this.control.level()+1);
        return true;
      case 'changeVolumeDown':
        this.changeVolume(this.control.level()-1);
        return true;
      case 'playSample':
        if (this.app.inputEventsManager.needEventForAudio()) {
          var p = this.properties.waitForAudioEvent;
          this.addModalEntity(new DialogEntity(this, p.x, p.y, p.width, p.height, false, p, (dialog) => new WaitForAudioEventEntity(dialog, dialog.innerX, dialog.innerY, dialog.innerWidth, dialog.innerHeight, 'playSample2', p)));
          return true;
        }
      case 'playSample2':
        this.sendEvent(0, 0, {id: 'openAudioBus', bus: this.bus, options: {audioSilentHandler: 'disable'}});
        this.samplePlayed = true;
        this.driverEntity.setText(this.control.driverNote());
        this.sendEvent(1, 0, {id: 'closePressAnyKey'});
        this.sendEvent(0, 0, {id: 'playSound', sound: this.control.sampleSound, bus: this.bus, options: false});
        return true;
      case 'errorAudioBus':
        this.driverEntity.setText(event.error);
        this.app.showErrorMessage(event.error, 'reopen');
        return true;
      case 'closeVolume':
        this.control.close();
        this.destroy();
        this.sendEvent(-1, 0, {id: 'contentClosed', entity: this});
        return true;
    }
    return false;
  } // handleEvent

} // VolumeEntity
