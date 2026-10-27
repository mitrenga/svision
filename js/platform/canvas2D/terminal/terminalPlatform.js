const { Canvas2DPlatform } = await import('../canvas2DPlatform.js?ver='+window.srcVersion);
const { TerminalLayout } = await import('./terminalLayout.js?ver='+window.srcVersion);
// begin code

/**
 * Canvas 2D platform for a **text terminal on a serial line** — the way a
 * minicomputer of the 1970s and 80s showed anything at all. The computer had
 * no video memory; a program sent bytes to the terminal and the terminal's
 * firmware drew them (R-061). The first terminal here is the Soviet
 * 15IE-00-013 that Tetris ran on in 1984; nothing of it is in this class.
 *
 * The pieces, all in this directory:
 *
 * - {@link TerminalFont} — the character generator, from the application;
 * - {@link TerminalCharset} — byte + shift -> glyph, from the application;
 * - {@link TerminalScreen} — the grid of glyphs and the cursor, free of DOM;
 * - {@link TerminalVT52} — the firmware: bytes in, screen changes out, with
 *   the application's profile of sequences, free of DOM;
 * - {@link TerminalLine} — the speed of the line, optional;
 * - {@link TerminalScreenEntity} — the screen on the canvas;
 * - {@link TerminalKeyboard} — keys of the browser -> bytes for the host.
 *
 * A game in a worker sends the bytes the original sent down the line, and the
 * model feeds them to {@link TerminalVT52}; so the game never sees the screen
 * and the terminal never sees the game, and each half is checked on its own.
 * The platform has no sound: BEL is an event of the terminal and the
 * application plays it through the audio handler of its hardware.
 *
 * The desktop is the frame of the screen: `cols × cellWidth` by
 * `(rows + status line) × cellHeight`. Around it is the black of a switched-on
 * tube.
 *
 * Configured per game from the project's appPlatform.js:
 *
 *   {
 *     cols, rows,              the text grid (required)
 *     statusLine,              false, 'top' or 'bottom'
 *     font,                    a TerminalFont (required) — the cell is in it
 *     foreground, background,  '#rrggbb'; white on black by default
 *     cursor,                  {lines: [first, last], x, width,
 *                              blinkOnMs, blinkOffMs}, or null for none
 *     pixelAspect,             how much taller than wide a pixel is shown, 1
 *     minimalBorder,           in logical pixels, 0 by default
 *     borderColor              '#000000'
 *   }
 *
 * The charset, the profile of sequences and the speed of the line are the
 * application's too, but they are not about pixels, so they go straight to
 * {@link TerminalVT52} and {@link TerminalLine}.
 */
export class TerminalPlatform extends Canvas2DPlatform {

  /**
   * @param {Object} config - The settings above; `cols`, `rows` and `font` are required.
   */
  constructor(config) {
    super();
    this.config = Object.assign({
      statusLine: false,
      foreground: '#ffffff',
      background: '#000000',
      cursor: {},
      pixelAspect: 1,
      minimalBorder: 0,
      borderColor: '#000000'
    }, config);
    if (!(this.config.cols > 0 && this.config.rows > 0 && this.config.font)) {
      throw new Error('TerminalPlatform: cols, rows and font come from the application');
    }
  } // constructor

  /**
   * Returns the human-readable name of this platform.
   * @returns {string} The platform name.
   */
  platformName() {
    return 'terminal '+this.config.cols+'x'+this.config.rows+' [HTML canvas 2D]';
  } // platformName

  /**
   * Creates the layout instance used by this platform.
   * @param {Object} app - The application instance.
   * @returns {TerminalLayout} A new terminal layout.
   */
  newLayout(app) {
    return new TerminalLayout(app, this.config);
  } // newLayout

  /**
   * Returns the desktop: the frame of the screen in the configured font.
   * @param {Object} app - The application instance.
   * @returns {Object} The desktop descriptor with width, height and defaultColor.
   */
  desktop(app) {
    var font = this.config.font;
    return {
      width: this.config.cols*font.cellWidth,
      height: (this.config.rows+(this.config.statusLine ? 1 : 0))*font.cellHeight,
      defaultColor: this.config.background
    };
  } // desktop

  /**
   * Returns the border: black, of the configured minimal size.
   * @param {Object} app - The application instance.
   * @returns {Object} The border descriptor with minimal size and defaultColor.
   */
  border(app) {
    return {minimal: this.config.minimalBorder, defaultColor: this.config.borderColor};
  } // border

} // TerminalPlatform
