const { AbstractModel } = await import('../../../abstractModel.js?ver='+window.srcVersion);
const { Atari8ScreenEntity } = await import('./atari8ScreenEntity.js?ver='+window.srcVersion);
const { Atari8Screen } = await import('./atari8Screen.js?ver='+window.srcVersion);
const { Atari8Color } = await import('./atari8Color.js?ver='+window.srcVersion);
// begin code

/**
 * Power-on of an Atari 8-bit computer (the 800XL, with BASIC built in)
 * without a disk in the drive: the black border,
 * the blue Graphics 0 screen, `READY` from Atari BASIC and the inverse
 * cursor blinking under it — then, when a game asks for it, a command typed
 * at the cursor and the hand-over to the game's first model. The Atari
 * counterpart of {@link ZXResetModel}, {@link DOSBootModel} and
 * {@link C64BootModel}, with their shape: a script of steps in milliseconds
 * driven from `loopModel`, a skip that flushes what is left.
 *
 * A machine booting a game from disk never shows `READY` — it goes from the
 * power-on to the game — and one loading from cassette shows it with the
 * `CLOAD` typed and a long wait. The default is `READY` and the cursor for a
 * moment, then the hand-over; `commands` adds the typing.
 *
 * ```js
 * this.model = new Atari8BootModel(this, {
 *   nextModel: 'MenuModel',
 *   commands: [{command: 'RUN "D:BOULDER"'}]
 * });
 * ```
 *
 * Any of Escape, Enter, Space, the left or middle mouse button or a touch
 * skips to the end (`skipKeys`).
 */
export class Atari8BootModel extends AbstractModel {

  /** the cursor is the inverse of the cell under it — steady, the Atari cursor does not blink */
  static get CURSOR_CODE() { return 0x80; }

  /**
   * The facts the boot script is generated from, with their defaults.
   * @returns {Object} The defaults; every key can be overridden.
   */
  static get DEFAULTS() {
    return {
      /** the character set; `app.fonts.atari8Fonts8x8` when not given */
      font: null,
      /** the model to switch to when the boot is over — a name for
          `app.setModel()`, or a function of the app */
      nextModel: 'MenuModel',
      /** what BASIC prints at the top */
      banner: ['READY'],
      /** typed one after another at the cursor; `output` lines follow the
          Return, `ready` prints READY after them */
      commands: [],
      timing: {
        readyPauseMs: 1800,
        promptPauseMs: 900,
        typingMs: 120,
        enterMs: 400,
        outputMs: 700,
        readyMs: 900,
        launchMs: 600
      },
      /** the keys that skip the boot; the string 'any' makes every reported
          key skip it */
      skipKeys: ['Escape', 'Enter', ' ', 'Mouse1', 'Mouse2', 'Touch']
    };
  } // DEFAULTS

  /**
   * @param {Object} app - The application instance.
   * @param {Object} [properties] - Overrides of {@link Atari8BootModel.DEFAULTS},
   *        merged one level deep (`timing` is an object).
   */
  constructor(app, properties) {
    super(app);
    this.id = 'Atari8BootModel';

    this.properties = Atari8BootModel.merge(properties || {});
    this.screenEntity = null;
    this.screen = null;
    this.cursor = {col: 0, row: 0};
    this.steps = [];
    this.stepIndex = 0;
    this.startTime = false;
    this.finished = false;
    this.handoverAt = false;
  } // constructor

  /**
   * Merges overrides into the defaults, one level deep.
   * @param {Object} properties - The overrides.
   * @returns {Object} The merged properties.
   */
  static merge(properties) {
    var merged = Atari8BootModel.DEFAULTS;
    Object.keys(properties).forEach((key) => {
      var value = properties[key];
      if (value !== null && typeof value === 'object' && !Array.isArray(value)
          && merged[key] !== null && typeof merged[key] === 'object' && !Array.isArray(merged[key])) {
        merged[key] = Object.assign({}, merged[key], value);
      } else {
        merged[key] = value;
      }
    });
    return merged;
  } // merge

  /**
   * Switches the machine on: the OS screen, the border, and the script.
   */
  init() {
    super.init();

    var font = this.properties.font || (this.app.fonts && this.app.fonts.atari8Fonts8x8);
    if (!font) {
      throw new Error('Atari8BootModel: a character set is needed (properties.font or app.fonts.atari8Fonts8x8)');
    }
    this.screenEntity = new Atari8ScreenEntity(this.desktopEntity, 0, 0, this.desktopWidth, this.desktopHeight);
    this.desktopEntity.addEntity(this.screenEntity);
    this.screen = this.screenEntity.screen;
    this.screen.powerOn(font.setBytes(0));
    this.applyBackground();
    this.buildSteps();
  } // init

  /**
   * COLBK on the border and under the frame.
   */
  applyBackground() {
    var color = Atari8Color.color(this.screen.colbk);
    if (this.borderEntity != null) {
      this.borderEntity.bkColor = color;
    }
    this.desktopEntity.bkColor = color;
  } // applyBackground

  // ---------------------------------------------------- the screen editor

  /**
   * Prints a line at the cursor the way the editor does, scrolling at the
   * bottom, and moves the cursor to the next line.
   * @param {string} text - The line.
   */
  printLine(text) {
    this.screen.print(this.cursor.col, this.cursor.row, text);
    this.cursor.col = 0;
    this.newLine();
  } // printLine

  /**
   * Types one character at the cursor and advances it.
   * @param {string} ch - The character.
   */
  type(ch) {
    this.screen.print(this.cursor.col, this.cursor.row, ch);
    this.cursor.col++;
    if (this.cursor.col >= 40) {
      this.cursor.col = 0;
      this.newLine();
    }
  } // type

  /**
   * Moves the cursor down, scrolling the 24 rows when it is on the last.
   */
  newLine() {
    if (this.cursor.row >= 23) {
      var from = this.screen.cellAddress(0, 1);
      var to = this.screen.cellAddress(0, 0);
      this.screen.memory.copyWithin(to, from, from+23*40);
      this.screen.memory.fill(0, this.screen.cellAddress(0, 23), this.screen.cellAddress(0, 23)+40);
      this.screen.touch();
    } else {
      this.cursor.row++;
    }
  } // newLine

  /**
   * Shows or hides the cursor: the inverse of the cell under it.
   * @param {boolean} on - Whether the cursor is shown.
   */
  showCursor(on) {
    var at = this.screen.cellAddress(this.cursor.col, this.cursor.row);
    var code = this.screen.memory[at] & 0x7F;
    this.screen.memory[at] = on ? code | Atari8BootModel.CURSOR_CODE : code;
    this.screen.touch();
  } // showCursor

  // ---------------------------------------------------------------- the script

  /**
   * Compiles the boot into a schedule: a list of {at, run} in milliseconds
   * from the start, in order.
   */
  buildSteps() {
    var p = this.properties;
    var t = p.timing;
    var steps = [];
    var now = 0;
    var add = function(delay, run) {
      now += delay;
      steps.push({at: now, run: run});
    };

    // power-on: BASIC's READY is there at once, the cursor under it
    add(0, () => {
      this.cursor.col = 0;
      this.cursor.row = 0;
      p.banner.forEach((line) => this.printLine(line));
      this.showCursor(true);
    });

    p.commands.forEach((entry) => {
      var typed = entry.command;
      add(t.promptPauseMs, () => {});
      for (var c = 0; c < typed.length; c++) {
        let ch = typed.charAt(c);   // let: one value per closure
        add(t.typingMs, () => {
          this.showCursor(false);
          this.type(ch);
          this.showCursor(true);
        });
      }
      add(t.enterMs, () => {
        this.showCursor(false);
        this.cursor.col = 0;
        this.newLine();
        this.showCursor(true);
      });
      if (entry.output && entry.output.length) {
        add(t.outputMs, () => {
          this.showCursor(false);
          entry.output.forEach((line) => this.printLine(line));
          this.showCursor(true);
        });
      }
      if (entry.ready) {
        add(t.readyMs, () => {
          this.showCursor(false);
          this.printLine('READY');
          this.showCursor(true);
        });
      }
    });

    add(p.commands.length ? t.launchMs : t.readyPauseMs, () => {
      this.showCursor(false);
      this.finished = true;
    });

    this.steps = steps;
    this.stepIndex = 0;
  } // buildSteps

  /**
   * Runs every step whose time has come.
   * @param {number} elapsed - Milliseconds since the boot started.
   */
  driveSteps(elapsed) {
    while (this.stepIndex < this.steps.length && elapsed >= this.steps[this.stepIndex].at) {
      this.steps[this.stepIndex].run();
      this.stepIndex++;
    }
  } // driveSteps

  /**
   * Skips to the end: runs what is left at once and hands over right away.
   */
  skipBoot() {
    if (this.finished) {
      return;
    }
    while (this.stepIndex < this.steps.length) {
      this.steps[this.stepIndex].run();
      this.stepIndex++;
    }
    this.finished = true;
    this.handoverAt = this.app.now;
  } // skipBoot

  /**
   * Switches to the game's first model.
   */
  handOver() {
    var next = this.properties.nextModel;
    if (typeof next === 'function') {
      next(this.app);
    } else {
      this.app.setModel(next);
    }
  } // handOver

  // ---------------------------------------------------------------- the loop

  /**
   * Skips the boot on any of the skip keys.
   * @param {Object} event - The event object, identified by its id property.
   * @returns {boolean} True if the event was handled.
   */
  handleEvent(event) {
    if (super.handleEvent(event)) {
      return true;
    }
    if (event.id === 'keyPress' &&
        (this.properties.skipKeys === 'any' || this.properties.skipKeys.indexOf(event.key) >= 0)) {
      this.skipBoot();
      return true;
    }
    return false;
  } // handleEvent

  /**
   * Drives the schedule, draws, and hands over when the boot is over.
   * @param {number} timestamp - The current frame timestamp in milliseconds.
   */
  loopModel(timestamp) {
    super.loopModel(timestamp);

    if (this.startTime === false) {
      this.startTime = timestamp;
    }
    if (!this.finished) {
      this.driveSteps(timestamp-this.startTime);
      if (this.finished && this.handoverAt === false) {
        this.handoverAt = timestamp;
      }
    }
    this.drawModel();

    if (this.finished && this.handoverAt !== false && timestamp >= this.handoverAt) {
      this.handoverAt = false;
      this.handOver();
    }
  } // loopModel

} // Atari8BootModel
