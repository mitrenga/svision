const { AbstractModel } = await import('../../../abstractModel.js?ver='+window.srcVersion);
const { C64TextModeEntity } = await import('./c64TextModeEntity.js?ver='+window.srcVersion);
const { C64Color } = await import('./c64Color.js?ver='+window.srcVersion);
// begin code

/**
 * Power-on of a Commodore 64: the light blue border, the blue screen, the
 * BASIC banner with its 38911 bytes free, `READY.` and the blinking cursor —
 * then `LOAD"*",8,1` typed at it, `SEARCHING FOR *`, `LOADING`, `READY.`,
 * `RUN`, and the game's first model. The C64 counterpart of
 * {@link ZXResetModel} and {@link DOSBootModel}; the script and its schedule
 * have the shape of the DOS one — a list of steps in milliseconds, driven
 * from `loopModel`, a skip that flushes what is left.
 *
 * The banner is what the ROM printed; there is no memory count, the machine
 * was ready at once. A real 1541 took a minute to load a game — the timing
 * here is a few seconds and every number can be changed.
 *
 * ## What a game passes
 *
 * ```js
 * this.model = new C64BootModel(this, {
 *   nextModel: 'MenuModel',
 *   commands: [
 *     {command: 'LOAD"JETPAC",8,1', output: ['SEARCHING FOR JETPAC', 'LOADING'], ready: true},
 *     {command: 'RUN'}
 *   ]
 * });
 * ```
 *
 * Every key of {@link C64BootModel.DEFAULTS} can be overridden; the last
 * command is the game, after which the model hands over — the screen stays
 * as it is until the game's model paints its own, as on the machine.
 *
 * Any of Escape, Enter, Space, the left or middle mouse button or a touch
 * skips to the end (`skipKeys`).
 */
export class C64BootModel extends AbstractModel {

  /**
   * The facts the boot script is generated from, with their defaults.
   * @returns {Object} The defaults; every key can be overridden.
   */
  static get DEFAULTS() {
    return {
      /** the character set; `app.fonts.c64Fonts8x8` when not given */
      font: null,
      /** the model to switch to when the boot is over — a name for
          `app.setModel()`, or a function of the app */
      nextModel: 'MenuModel',
      /** the registers at power-on */
      borderColor: 14,
      backgroundColor: 6,
      textColor: 14,
      /** what the KERNAL and BASIC print, row by row from the top */
      banner: [
        '',
        '    **** COMMODORE 64 BASIC V2 ****',
        '',
        ' 64K RAM SYSTEM  38911 BASIC BYTES FREE',
        '',
        'READY.'
      ],
      /** typed one after another; `output` lines follow the Return, `ready`
          prints READY. after them; the last command is the game */
      commands: [
        {command: 'LOAD"*",8,1', output: ['', 'SEARCHING FOR *', 'LOADING'], ready: true},
        {command: 'RUN'}
      ],
      timing: {
        promptPauseMs: 1200,
        typingMs: 120,
        enterMs: 400,
        outputMs: 900,
        readyMs: 2500,
        launchMs: 700
      },
      /** the keys that skip the boot; the string 'any' makes every reported
          key skip it */
      skipKeys: ['Escape', 'Enter', ' ', 'Mouse1', 'Mouse2', 'Touch']
    };
  } // DEFAULTS

  /**
   * @param {Object} app - The application instance.
   * @param {Object} [properties] - Overrides of {@link C64BootModel.DEFAULTS},
   *        merged one level deep (`timing` is an object).
   */
  constructor(app, properties) {
    super(app);
    this.id = 'C64BootModel';

    this.properties = C64BootModel.merge(properties || {});
    this.screen = null;
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
    var merged = C64BootModel.DEFAULTS;
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
   * Sets the registers, builds the text screen and compiles the boot script.
   */
  init() {
    super.init();

    var p = this.properties;
    var font = p.font || (this.app.fonts && this.app.fonts.c64Fonts8x8);
    if (!font) {
      throw new Error('C64BootModel: a character set is needed (properties.font or app.fonts.c64Fonts8x8)');
    }
    if (this.borderEntity != null) {
      this.borderEntity.bkColor = C64Color.color(p.borderColor);
    }
    this.desktopEntity.bkColor = C64Color.color(p.backgroundColor);
    this.screen = new C64TextModeEntity(this.desktopEntity, 0, 0, this.desktopWidth, this.desktopHeight, font);
    this.desktopEntity.addEntity(this.screen);
    this.screen.textRAM.setBackground(p.backgroundColor).clear(p.textColor);
    this.buildSteps();
  } // init

  // ---------------------------------------------------------------- the script

  /**
   * Compiles the boot into a schedule: a list of {at, run} in milliseconds
   * from the start, in order.
   */
  buildSteps() {
    var p = this.properties;
    var t = p.timing;
    var text = this.screen.textRAM;
    var steps = [];
    var now = 0;
    var add = function(delay, run) {
      now += delay;
      steps.push({at: now, run: run});
    };

    // power-on: the banner is there at once
    add(0, () => {
      text.clear(p.textColor);
      p.banner.forEach((line) => text.print(line+'\n'));
    });

    // the commands typed at the cursor
    p.commands.forEach((entry, index) => {
      var isLast = index === p.commands.length-1;
      var typed = entry.command;
      add(t.promptPauseMs, () => {});
      for (var c = 0; c < typed.length; c++) {
        let ch = typed.charAt(c);   // let: one value per closure
        add(t.typingMs, () => text.print(ch));
      }
      add(t.enterMs, () => {
        text.print('\n');
      });
      if (entry.output && entry.output.length) {
        add(t.outputMs, () => {
          entry.output.forEach((line) => text.print(line+'\n'));
        });
      }
      if (entry.ready) {
        add(t.readyMs, () => {
          text.print('READY.\n');
        });
      }
      if (isLast) {
        add(t.launchMs, () => {
          text.showCursor(false);
          this.finished = true;
        });
      }
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
   * Drives the schedule, blinks the cursor, draws, and hands over when the
   * boot is over.
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
    this.screen.loopEntity(timestamp);
    this.drawModel();

    if (this.finished && this.handoverAt !== false && timestamp >= this.handoverAt) {
      this.handoverAt = false;
      this.handOver();
    }
  } // loopModel

} // C64BootModel
