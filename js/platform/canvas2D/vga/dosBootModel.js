const { AbstractModel } = await import('../../../abstractModel.js?ver='+window.srcVersion);
const { VGATextModeEntity } = await import('./vgaTextModeEntity.js?ver='+window.srcVersion);
// begin code

/**
 * Boot model of a PC: the power-on self test, the memory count, the screen
 * clearing as MS-DOS starts, the prompt and the game's name typed at it — and
 * then the switch to mode 13h, a black screen, and the game's first model.
 * The VGA counterpart of {@link ZXResetModel}, which does the same for the
 * Spectrum's reset and copyright line.
 *
 * It grew out of the console intro of Endless Universe (`IntroModel`): a
 * script of lines with a delay each, a flattened schedule in milliseconds
 * driven from `loopModel`, a skip that flushes what is left. Here the script
 * is generated from a few facts about the machine and the game — how much
 * memory, which drivers, which directory, which command — and the console is
 * a real 80x25 text screen ({@link VGATextModeEntity}) rather than a text
 * entity, so the picture is the one the monitor showed.
 *
 * ## What a game passes
 *
 * ```js
 * this.model = new DOSBootModel(this, {
 *   nextModel: 'MenuModel',
 *   dos: {
 *     autoexec: ['Microsoft (R) Mouse Driver Version 8.20', ''],
 *     commands: [
 *       {command: 'CD PRINCE', prompt: 'C:\\PRINCE>'},
 *       {command: 'PRINCE'}
 *     ]
 *   }
 * });
 * ```
 *
 * Every key of {@link DOSBootModel.DEFAULTS} can be overridden; the last
 * command is the game, after which the screen goes black and the model hands
 * over. The BIOS text is generic on purpose — no manufacturer's name and no
 * copyright line of a real BIOS belong here.
 *
 * Any of Escape, Enter, Space, a mouse button or a touch skips to the end.
 * There is no sound: the beep of the POST would need the audio context, which
 * the browser only unlocks on a gesture that has not happened yet at boot.
 */
export class DOSBootModel extends AbstractModel {

  /**
   * The facts the boot script is generated from, with their defaults.
   * @returns {Object} The defaults; every key can be overridden.
   */
  static get DEFAULTS() {
    return {
      /** the 8x16 font; `app.fonts.vgaFonts8x16Mono` when not given */
      font: null,
      /** the model to switch to when the boot is over — a name for
          `app.setModel()`, or a function of the app */
      nextModel: 'MenuModel',
      /** conventional memory, counted first */
      memoryKB: 640,
      /** extended memory, counted after it */
      extendedKB: 3072,
      bios: {
        title: 'ROM BIOS  Version 1.02',
        subtitle: 'System Configuration',
        cpu: '80386DX CPU at 33 MHz',
        memoryLabel: 'Memory Test : ',
        memoryOK: 'K OK',
        devices: [
          'Floppy Disk(s) : 1.44 MB',
          'Fixed Disk 0   : 42 MB',
          'Display        : VGA/EGA',
          'Keyboard       : Detected'
        ],
        booting: 'Booting from Fixed Disk...'
      },
      dos: {
        starting: 'Starting MS-DOS...',
        /** lines the CONFIG.SYS drivers print */
        config: ['HIMEM is testing extended memory...done.'],
        /** lines AUTOEXEC.BAT prints */
        autoexec: [],
        prompt: 'C:\\>',
        /** typed one after another; the last one is the game */
        commands: [{command: 'GAME'}]
      },
      timing: {
        memoryStepKB: 64,
        memoryStepMs: 18,
        postPauseMs: 900,
        bootPauseMs: 1400,
        dosPauseMs: 700,
        promptPauseMs: 600,
        typingMs: 110,
        enterMs: 350,
        launchMs: 900,
        blackMs: 600
      },
      /** the keys that skip the boot; the string 'any' makes every reported
          key skip it — keyboard, mouse buttons, touch and gamepad buttons all
          arrive as `keyPress` */
      skipKeys: ['Escape', 'Enter', ' ', 'Mouse1', 'Mouse2', 'Touch']
    };
  } // DEFAULTS

  /**
   * @param {Object} app - The application instance.
   * @param {Object} [properties] - Overrides of {@link DOSBootModel.DEFAULTS},
   *        merged one level deep (`bios`, `dos`, `timing` are objects).
   */
  constructor(app, properties) {
    super(app);
    this.id = 'DOSBootModel';

    this.properties = DOSBootModel.merge(properties || {});
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
    var merged = DOSBootModel.DEFAULTS;
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
   * Builds the text screen over a black desktop and compiles the boot script.
   */
  init() {
    super.init();

    var font = this.properties.font || (this.app.fonts && this.app.fonts.vgaFonts8x16Mono);
    if (!font) {
      throw new Error('DOSBootModel: an 8x16 font is needed (properties.font or app.fonts.vgaFonts8x16Mono)');
    }
    if (this.borderEntity != null) {
      this.borderEntity.bkColor = '#000000';
    }
    this.desktopEntity.bkColor = '#000000';
    this.screen = new VGATextModeEntity(this.desktopEntity, 0, 0, this.desktopWidth, this.desktopHeight, font);
    this.desktopEntity.addEntity(this.screen);
    this.screen.textRAM.clear();
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

    // the power-on self test
    add(0, () => {
      text.clear();
      text.print(p.bios.title+'\n');
      text.print(p.bios.subtitle+'\n\n');
      text.print(p.bios.cpu+'\n\n');
      text.print(p.bios.memoryLabel);
    });
    var countCol = text.cursor.col;   // filled in when the first step runs, see below
    var countRow = 0;
    var total = p.memoryKB+p.extendedKB;
    var counted = 0;
    var firstCount = true;
    while (counted < total) {
      counted = Math.min(total, counted+t.memoryStepKB);
      let kb = counted;   // let: one value per closure, a var would share the last
      add(t.memoryStepMs, () => {
        if (firstCount) {
          countCol = text.cursor.col;
          countRow = text.cursor.row;
          firstCount = false;
        }
        text.printAt(countCol, countRow, String(kb).padStart(5, ' ')+p.bios.memoryOK, text.attribute);
        text.setCursor(countCol+5+p.bios.memoryOK.length, countRow);
      });
    }
    add(t.postPauseMs, () => {
      text.print('\n\n');
      p.bios.devices.forEach((line) => text.print(line+'\n'));
      text.print('\n'+p.bios.booting+'\n');
    });

    // MS-DOS
    add(t.bootPauseMs, () => {
      text.clear();
      text.print(p.dos.starting+'\n\n');
    });
    add(t.dosPauseMs, () => {
      p.dos.config.forEach((line) => text.print(line+'\n'));
      if (p.dos.autoexec.length) {
        text.print('\n');
        p.dos.autoexec.forEach((line) => text.print(line+'\n'));
      }
      text.print('\n');
    });

    // the prompt and the commands typed at it
    var prompt = p.dos.prompt;
    p.dos.commands.forEach((entry, index) => {
      var isLast = index === p.dos.commands.length-1;
      var typed = entry.command;
      var currentPrompt = prompt;
      add(t.promptPauseMs, () => text.print(currentPrompt));
      for (var c = 0; c < typed.length; c++) {
        let ch = typed.charAt(c);   // let, as above
        add(t.typingMs, () => text.print(ch));
      }
      add(t.enterMs, () => {
        text.print('\n');
        (entry.output || []).forEach((line) => text.print(line+'\n'));
      });
      if (entry.prompt) {
        prompt = entry.prompt;
      }
      if (isLast) {
        // the game switches to mode 13h: the text screen is gone, the
        // picture is black until the game paints it
        add(t.launchMs, () => {
          this.screen.hide = true;
        });
        add(t.blackMs, () => {
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
   * Skips to the end: runs what is left at once and hands over shortly after.
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
    // hand over right away: the skip is the player's "get on with it"
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

} // DOSBootModel
