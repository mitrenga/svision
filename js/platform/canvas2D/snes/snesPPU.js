const { SNESColor } = await import('./snesColor.js?ver='+window.srcVersion);
// begin code

/**
 * The picture processor of the Super Nintendo over its own memory: **64 KB
 * of VRAM** (tiles and tile maps, addressed in words), **512 B of CGRAM**
 * (256 colours BGR555) and **544 B of OAM** (128 sprites and their high
 * bits), plus the registers `$2100`-`$2133` a program writes. The CPU never
 * sees this memory directly — it goes through the ports (`$2118`/`$2119`,
 * `$2122`, `$2104`) or DMA — so a game's world lives in the CPU's memory
 * and *this* is what the screen shows of it (tvar H, R-050, `DESIGN-snes.md`).
 *
 * `paint32` draws the **256×224** picture of one frame **line by line**,
 * the way the chip does: for every line it first applies the register
 * writes recorded for that line (`setLineWrites` — a raster program as
 * data, the same idea as `C64TextRAM.setSplits()` and `Atari8Screen.setDLI()`),
 * then evaluates the sprites with the chip's limits, composes the
 * backgrounds of the mode by priority and converts the line through the
 * master brightness.
 *
 * ## What is modelled in this step
 *
 * **Step 1 = what the first game measured** (Super R-Type M0, 2026-10-18,
 * `super-r-type/sources/docs/hw_notes.md`):
 *
 * - **mode 1**: BG1 and BG2 at 4 bpp, BG3 at 2 bpp with the BG3-priority
 *   bit of BGMODE, tile maps 32×32 to 64×64, tiles 8×8, horizontal and
 *   vertical scroll per layer, flips and the priority bit of a map entry;
 *   the main screen TM says which layers are on;
 * - **sprites**: the whole OAM, the eight size pairs of OBSEL, the two
 *   name tables, flips, palettes 8-15, four priorities against the
 *   backgrounds — and **the limits of the chip per line: 32 sprites and 34
 *   tiles**, with the flags of STAT77 ({@link SNESPPU#status77}) the game
 *   reads. The rules are the ones MesenCE 2.2.1 implements (the emulator the
 *   game is measured against, `Core/SNES/SnesPpu.cpp`), which agree with
 *   anomie's and Fullsnes' descriptions: the first 32 in OAM order that
 *   touch the line are kept, their tiles are fetched **from the last one
 *   back to the first**, so when more than 34 tiles are wanted the sprites
 *   dropped are the **first ones — the ones with the highest priority**;
 *   a sprite's tiles hidden off the left edge are not fetched, the ones off
 *   the right edge end the sprite; a sprite at X = −256 counts for both
 *   limits and draws nothing; Y wraps after 256 lines;
 * - **master brightness** of INIDISP, **also changed inside the frame**
 *   through the line writes — a fade written by the main loop while the
 *   beam runs — and **forced blank**;
 * - **mosaic** of MOSAIC on the backgrounds (Super R-Type M4: a boss
 *   section comes on through a mosaic of 16 down to 1 while the brightness
 *   rises, `stage1_f2122`-`f2158`): a layer with its bit set shows, in
 *   every block of size × size counted from the top left of the picture,
 *   the pixel of the block's top-left position — the vertical blocks start
 *   on the first displayed line, the horizontal ones at X = 0 whatever the
 *   scroll;
 * - the ports: VRAM address and data with the increment modes of VMAIN,
 *   CGRAM address and data with the low-byte latch, OAM address and data
 *   with the word latch of the low table, the two-byte scroll writes with
 *   their shared latch — so that a program converted from the original
 *   writes the registers as it did, and so that a tool can feed a recorded
 *   state back in.
 *
 * **Not modelled, counted in `unsupported`** when a frame asks for them,
 * never drawn silently wrong: the other modes (0, 2-7), 16×16 tiles,
 * windows, colour math and the sub screen, hires,
 * interlace, overscan, the priority rotation of OAM, the VRAM address
 * remapping of VMAIN. Each is a branch to add with the game that needs it
 * (R-050).
 *
 * ## The lines of the picture
 *
 * Picture row 0 is the chip's scanline 1 (scanline 0 is not displayed). A
 * background on row `r` shows map line `r + 1 + vscroll`; a sprite with Y
 * = `y` has its top on row `y`. That one-line difference is the chip's, not
 * a bug: the sprites of a line are evaluated during the line before it.
 *
 * ## Deliberately free of DOM
 *
 * Nothing here touches `document` or a canvas: the picture goes into a
 * buffer of packed pixels, so a tool under Node paints what the browser
 * paints (R-001). The entity owning a canvas is {@link SNESPPUEntity}.
 * The memory arrays do not know when they were written; call
 * {@link SNESPPU#touch} after writing into them directly (a DMA), the
 * register writes touch by themselves.
 *
 * ```js
 * var ppu = new SNESPPU();
 * ppu.write(0x2105, 0x09);                // mode 1, BG3 priority
 * ppu.write(0x2107, 0x03);                // BG1 map at word 0, 64×64
 * ppu.vram.set(tileBytes, 0x4000*2);      // or through $2116-$2119
 * ppu.touch();
 * ppu.paint32(pixels, true);
 * ```
 */
export class SNESPPU {

  /** the picture in pixels */
  static get WIDTH() { return 256; }
  static get HEIGHT() { return 224; }
  /** the sizes of VRAM, CGRAM and OAM in bytes */
  static get VRAM_BYTES() { return 0x10000; }
  static get CGRAM_BYTES() { return 0x200; }
  static get OAM_BYTES() { return 0x220; }
  /** the limits of the chip per line */
  static get SPRITES_PER_LINE() { return 32; }
  static get TILES_PER_LINE() { return 34; }
  /** the sprite sizes of OBSEL bits 5-7: [small, large] as [width, height] */
  static get OBJ_SIZES() {
    return [[[8, 8], [16, 16]], [[8, 8], [32, 32]], [[8, 8], [64, 64]], [[16, 16], [32, 32]],
            [[16, 16], [64, 64]], [[32, 32], [64, 64]], [[16, 32], [32, 64]], [[16, 32], [32, 32]]];
  }
  /** mode 1: the priority of a sprite pixel by its OAM priority, against the layers below */
  static get MODE1_SPRITE_PRIORITY() { return [2, 4, 7, 10]; }
  /** mode 1: [low, high] priority of BG1, BG2, BG3 (BG3 high is 11 with the BGMODE bit) */
  static get MODE1_BG_PRIORITY() { return [[6, 9], [5, 8], [1, 3]]; }

  constructor() {
    this.id = 'SNESPPU';

    /** the memory the picture is made of */
    this.vram = new Uint8Array(SNESPPU.VRAM_BYTES);
    this.cgram = new Uint8Array(SNESPPU.CGRAM_BYTES);
    this.oam = new Uint8Array(SNESPPU.OAM_BYTES);

    /** INIDISP $2100 */
    this.forcedBlank = true;
    this.brightness = 0;
    /** OBSEL $2101: size pair, name base and the gap to the second table, in words */
    this.objSize = 0;
    this.objBase = 0;
    this.objGap = 0x1000;
    /** OAMADD $2102/$2103 and the data port's latch */
    this.oamAddress = 0;
    this.oamPriority = false;
    this.oamByteAddress = 0;
    this.oamLatch = 0;
    /** BGMODE $2105 */
    this.bgMode = 0;
    this.bg3Priority = false;
    /** MOSAIC $2106 */
    this.mosaic = 0;
    /** the four backgrounds: map and tile base in words, map size, 16×16 tiles, scroll */
    this.layers = [];
    for (var i = 0; i < 4; i++) {
      this.layers.push({tilemap: 0, wide: false, tall: false, largeTiles: false, chr: 0, hscroll: 0, vscroll: 0});
    }
    /** the shared latch of the two-byte scroll writes */
    this.scrollLatch = 0;
    /** VMAIN $2115 and the VRAM address, in words */
    this.vramIncrementOnHigh = true;
    this.vramStep = 1;
    this.vramRemap = 0;
    this.vramAddress = 0;
    /** CGADD $2121 and the latch of CGDATA */
    this.cgramAddress = 0;
    this.cgramLatched = false;
    this.cgramLatch = 0;
    /** TM $212C, TS $212D, the window masks TMW/TSW $212E/$212F */
    this.tm = 0;
    this.ts = 0;
    this.tmw = 0;
    this.tsw = 0;
    /** the window and colour math registers $2123-$2132, kept as written */
    this.windows = new Uint8Array(16);
    this.cgwsel = 0;
    this.cgadsub = 0;
    /** SETINI $2133 */
    this.setini = 0;
    /** register writes inside the frame, {line, x, register, value}, sorted */
    this.lineWrites = [];
    /** the flags of STAT77 after the last paint: more than 32 sprites / 34 tiles on a line */
    this.rangeOver = false;
    this.timeOver = false;
    /** bumped by every register write and by `touch()` */
    this.version = 0;
    /** what the last paint met that is not modelled, by name; a tool reads it */
    this.unsupported = {};

    this.spriteIndexes = new Uint8Array(SNESPPU.SPRITES_PER_LINE);
    this.lineColors = new Uint16Array(SNESPPU.WIDTH);
    this.linePriority = new Uint8Array(SNESPPU.WIDTH);
    /** one background's line before composition: the CGRAM index (0 = transparent) and the map entry's priority bit */
    this.layerColors = new Uint8Array(SNESPPU.WIDTH);
    this.layerHigh = new Uint8Array(SNESPPU.WIDTH);
    this.spriteColors = new Uint8Array(SNESPPU.WIDTH);
    this.spritePriority = new Uint8Array(SNESPPU.WIDTH);
    this.spritePalette = new Uint8Array(SNESPPU.WIDTH);
  } // constructor

  // ---------------------------------------------------------------- memory

  /**
   * Says the memory changed, so the entity repaints.
   * @returns {SNESPPU} This.
   */
  touch() {
    this.version++;
    return this;
  } // touch

  /**
   * A word of VRAM.
   * @param {number} word - The word address, wrapped to 32 K.
   * @returns {number} The 16-bit value.
   */
  vramWord(word) {
    var at = (word & 0x7FFF) << 1;
    return this.vram[at] | (this.vram[at+1] << 8);
  } // vramWord

  /**
   * A colour of CGRAM.
   * @param {number} index - 0-255.
   * @returns {number} The BGR555 word.
   */
  color(index) {
    var at = (index & 0xFF) << 1;
    return this.cgram[at] | ((this.cgram[at+1] & 0x7F) << 8);
  } // color

  /**
   * Writes bytes into VRAM, as a DMA does.
   * @param {number} byteAddress - Where, in bytes.
   * @param {Uint8Array|number[]} bytes - What.
   * @returns {SNESPPU} This.
   */
  writeVRAM(byteAddress, bytes) {
    this.vram.set(bytes, byteAddress & 0xFFFF);
    return this.touch();
  } // writeVRAM

  /**
   * Writes bytes into CGRAM, as a DMA does.
   * @param {number} byteAddress - Where, in bytes.
   * @param {Uint8Array|number[]} bytes - What.
   * @returns {SNESPPU} This.
   */
  writeCGRAM(byteAddress, bytes) {
    this.cgram.set(bytes, byteAddress & 0x1FF);
    return this.touch();
  } // writeCGRAM

  /**
   * Writes bytes into OAM, as a DMA does.
   * @param {number} byteAddress - Where, in bytes.
   * @param {Uint8Array|number[]} bytes - What.
   * @returns {SNESPPU} This.
   */
  writeOAM(byteAddress, bytes) {
    this.oam.set(bytes, byteAddress % SNESPPU.OAM_BYTES);
    return this.touch();
  } // writeOAM

  // ------------------------------------------------------------- registers

  /**
   * A write to a PPU register, as the program does it.
   * @param {number} address - `$2100`-`$2133`, or the low byte alone.
   * @param {number} value - The byte.
   * @returns {SNESPPU} This.
   */
  write(address, value) {
    this.applyWrite(address, value);
    return this.touch();
  } // write

  /**
   * The register write itself, without touching — used by {@link SNESPPU#write}
   * and by the line writes while painting.
   * @param {number} address - `$2100`-`$2133`, or the low byte alone.
   * @param {number} value - The byte.
   */
  applyWrite(address, value) {
    var reg = address & 0xFF;
    var v = value & 0xFF;
    var layer;
    switch (reg) {
      case 0x00:   // INIDISP
        this.forcedBlank = !!(v & 0x80);
        this.brightness = v & 0x0F;
        break;
      case 0x01:   // OBSEL
        this.objSize = v >> 5;
        this.objBase = (v & 0x07) << 13;
        this.objGap = (((v >> 3) & 0x03)+1) << 12;
        break;
      case 0x02:   // OAMADDL
        this.oamAddress = (this.oamAddress & 0x100) | v;
        this.oamByteAddress = (this.oamAddress << 1) & 0x3FF;
        break;
      case 0x03:   // OAMADDH
        this.oamAddress = (this.oamAddress & 0xFF) | ((v & 1) << 8);
        this.oamPriority = !!(v & 0x80);
        this.oamByteAddress = (this.oamAddress << 1) & 0x3FF;
        break;
      case 0x04:   // OAMDATA
        this.writeOAMData(v);
        break;
      case 0x05:   // BGMODE
        this.bgMode = v & 0x07;
        this.bg3Priority = !!(v & 0x08);
        for (var i = 0; i < 4; i++) {
          this.layers[i].largeTiles = !!(v & (0x10 << i));
        }
        break;
      case 0x06:   // MOSAIC
        this.mosaic = v;
        break;
      case 0x07: case 0x08: case 0x09: case 0x0A:   // BGnSC
        layer = this.layers[reg-0x07];
        layer.tilemap = (v & 0xFC) << 8;
        layer.wide = !!(v & 0x01);
        layer.tall = !!(v & 0x02);
        break;
      case 0x0B:   // BG12NBA
        this.layers[0].chr = (v & 0x0F) << 12;
        this.layers[1].chr = (v >> 4) << 12;
        break;
      case 0x0C:   // BG34NBA
        this.layers[2].chr = (v & 0x0F) << 12;
        this.layers[3].chr = (v >> 4) << 12;
        break;
      case 0x0D: case 0x0F: case 0x11: case 0x13:   // BGnHOFS: two writes, low then high
        layer = this.layers[(reg-0x0D) >> 1];
        // the register keeps all 16 bits: the next write reads three bits back out of its high byte
        layer.hscroll = ((v << 8) | (this.scrollLatch & ~7) | ((layer.hscroll >> 8) & 7)) & 0xFFFF;
        this.scrollLatch = v;
        break;
      case 0x0E: case 0x10: case 0x12: case 0x14:   // BGnVOFS
        layer = this.layers[(reg-0x0E) >> 1];
        layer.vscroll = ((v << 8) | this.scrollLatch) & 0xFFFF;
        this.scrollLatch = v;
        break;
      case 0x15:   // VMAIN
        this.vramIncrementOnHigh = !!(v & 0x80);
        this.vramStep = [1, 32, 128, 128][v & 0x03];
        this.vramRemap = (v >> 2) & 0x03;
        break;
      case 0x16:   // VMADDL
        this.vramAddress = (this.vramAddress & 0xFF00) | v;
        break;
      case 0x17:   // VMADDH
        this.vramAddress = (this.vramAddress & 0x00FF) | (v << 8);
        break;
      case 0x18:   // VMDATAL
        this.vram[(this.vramAddress & 0x7FFF) << 1] = v;
        if (!this.vramIncrementOnHigh) {
          this.vramAddress = (this.vramAddress+this.vramStep) & 0xFFFF;
        }
        break;
      case 0x19:   // VMDATAH
        this.vram[((this.vramAddress & 0x7FFF) << 1)+1] = v;
        if (this.vramIncrementOnHigh) {
          this.vramAddress = (this.vramAddress+this.vramStep) & 0xFFFF;
        }
        break;
      case 0x21:   // CGADD
        this.cgramAddress = v;
        this.cgramLatched = false;
        break;
      case 0x22:   // CGDATA: low byte latched, the word written with the high one
        if (!this.cgramLatched) {
          this.cgramLatch = v;
          this.cgramLatched = true;
        } else {
          this.cgram[this.cgramAddress << 1] = this.cgramLatch;
          this.cgram[(this.cgramAddress << 1)+1] = v & 0x7F;
          this.cgramAddress = (this.cgramAddress+1) & 0xFF;
          this.cgramLatched = false;
        }
        break;
      case 0x23: case 0x24: case 0x25: case 0x26: case 0x27: case 0x28: case 0x29: case 0x2A: case 0x2B:
        this.windows[reg-0x23] = v;
        break;
      case 0x2C:   // TM
        this.tm = v & 0x1F;
        break;
      case 0x2D:   // TS
        this.ts = v & 0x1F;
        break;
      case 0x2E:   // TMW
        this.tmw = v & 0x1F;
        break;
      case 0x2F:   // TSW
        this.tsw = v & 0x1F;
        break;
      case 0x30:   // CGWSEL
        this.cgwsel = v;
        break;
      case 0x31:   // CGADSUB
        this.cgadsub = v;
        break;
      case 0x32:   // COLDATA
        this.windows[12+(v >> 5)] = v;
        break;
      case 0x33:   // SETINI
        this.setini = v;
        break;
      default:
        // $211A-$2120 (mode 7), $211B-$211E (the multiplier), $2134-$213F (reads): nothing to keep
        break;
    }
  } // applyWrite

  /**
   * OAMDATA: the low table is written in words — the even byte waits in a
   * latch until the odd one comes — the high table byte by byte; the
   * address runs on after every byte and wraps at 544.
   * @param {number} value - The byte.
   */
  writeOAMData(value) {
    var at = this.oamByteAddress;
    if (at < 0x200) {
      if (at & 1) {
        this.oam[at-1] = this.oamLatch;
        this.oam[at] = value;
      } else {
        this.oamLatch = value;
      }
    } else {
      this.oam[0x200 | (at & 0x1F)] = value;
    }
    this.oamByteAddress = (at+1) & 0x3FF;
  } // writeOAMData

  /**
   * STAT77 as the program reads it after a frame: bit 7 time over (more
   * than 34 tiles on a line), bit 6 range over (more than 32 sprites), the
   * low bits the chip's version 1.
   * @returns {number} The byte.
   */
  status77() {
    return (this.timeOver ? 0x80 : 0) | (this.rangeOver ? 0x40 : 0) | 0x01;
  } // status77

  /**
   * The register writes made inside the frame, as data: `line` is the
   * picture row (0-223), `x` the pixel the write lands at (0 for the start
   * of the line), `register` `$2100`-`$2133` and `value` the byte. A
   * brightness or forced-blank write with an `x` splits its line there; any
   * other register applies from the start of its line. The registers come
   * back to what they were when the paint is done, as the program puts them
   * back in the vertical blank.
   * @param {Object[]} writes - The list; a copy is kept, sorted by line and x.
   * @returns {SNESPPU} This.
   */
  setLineWrites(writes) {
    this.lineWrites = (Array.isArray(writes) ? writes.slice() : []).map((w) => ({
      line: w.line | 0, x: w.x | 0, register: w.register, value: w.value
    })).sort((a, b) => a.line-b.line || a.x-b.x);
    return this.touch();
  } // setLineWrites

  /**
   * The registers a line write may change, as one object to put back.
   * @returns {Object} The snapshot.
   */
  saveRegisters() {
    return {
      forcedBlank: this.forcedBlank, brightness: this.brightness,
      objSize: this.objSize, objBase: this.objBase, objGap: this.objGap,
      bgMode: this.bgMode, bg3Priority: this.bg3Priority, mosaic: this.mosaic,
      layers: this.layers.map((l) => Object.assign({}, l)),
      scrollLatch: this.scrollLatch, tm: this.tm, ts: this.ts, tmw: this.tmw, tsw: this.tsw,
      cgwsel: this.cgwsel, cgadsub: this.cgadsub, setini: this.setini
    };
  } // saveRegisters

  /**
   * Puts a snapshot of {@link SNESPPU#saveRegisters} back.
   * @param {Object} saved - The snapshot.
   */
  loadRegisters(saved) {
    this.forcedBlank = saved.forcedBlank; this.brightness = saved.brightness;
    this.objSize = saved.objSize; this.objBase = saved.objBase; this.objGap = saved.objGap;
    this.bgMode = saved.bgMode; this.bg3Priority = saved.bg3Priority; this.mosaic = saved.mosaic;
    this.layers = saved.layers.map((l) => Object.assign({}, l));
    this.scrollLatch = saved.scrollLatch; this.tm = saved.tm; this.ts = saved.ts; this.tmw = saved.tmw; this.tsw = saved.tsw;
    this.cgwsel = saved.cgwsel; this.cgadsub = saved.cgadsub; this.setini = saved.setini;
  } // loadRegisters

  // ------------------------------------------------------------ to the screen

  /**
   * Counts something the frame asked for that is not modelled.
   * @param {string} what - The name.
   */
  count(what) {
    this.unsupported[what] = (this.unsupported[what] || 0)+1;
  } // count

  /**
   * Paints the picture into packed pixels, 256 × 224, line by line as the
   * chip does, and sets the flags of STAT77.
   * @param {Uint32Array} pixels - Target, 256*224 elements.
   * @param {boolean} littleEndian - Byte order of the target.
   * @returns {SNESPPU} This.
   */
  paint32(pixels, littleEndian) {
    var width = SNESPPU.WIDTH;
    var height = SNESPPU.HEIGHT;
    var saved = this.saveRegisters();
    var writes = this.lineWrites;
    var w = 0;
    this.rangeOver = false;
    this.timeOver = false;
    this.unsupported = {};
    var black = SNESColor.lookup(littleEndian, 15)[0];
    var splits = [];

    for (var row = 0; row <= height; row++) {
      // the writes of this line: brightness with an x splits the line, the rest applies now
      splits.length = 0;
      while (w < writes.length && writes[w].line === row) {
        var write = writes[w++];
        if (write.x > 0 && (write.register & 0xFF) === 0x00) {
          splits.push(write);
        } else {
          this.applyWrite(write.register, write.value);
        }
      }
      // sprites are evaluated for one more line than is shown (the chip's scanline 224) — it moves the flags
      if (row === height) {
        if (!this.forcedBlank) {
          this.evaluateSprites(row);
        }
        break;
      }
      var at = row*width;
      if (this.forcedBlank && splits.length === 0) {
        pixels.fill(black, at, at+width);
        continue;
      }
      if (!this.forcedBlank) {
        this.composeLine(row);
      }
      // the conversion through the brightness, split where a write landed inside the line
      var from = 0;
      for (var s = 0; s <= splits.length; s++) {
        var to = s < splits.length ? Math.min(width, splits[s].x) : width;
        if (to > from) {
          if (this.forcedBlank) {
            pixels.fill(black, at+from, at+to);
          } else {
            var lut = SNESColor.lookup(littleEndian, this.brightness);
            for (var x = from; x < to; x++) {
              pixels[at+x] = lut[this.lineColors[x]];
            }
          }
          from = to;
        }
        if (s < splits.length) {
          var wasBlank = this.forcedBlank;
          this.applyWrite(splits[s].register, splits[s].value);
          if (wasBlank && !this.forcedBlank) {
            this.composeLine(row);
          }
        }
      }
    }
    this.loadRegisters(saved);
    return this;
  } // paint32

  /**
   * One line of the picture as CGRAM words with their priorities, in
   * `lineColors`: the backdrop, the sprites of the line and the backgrounds
   * of the mode, each pixel taken by the highest priority.
   * @param {number} row - The picture row, 0-223.
   */
  composeLine(row) {
    var width = SNESPPU.WIDTH;
    var colors = this.lineColors;
    var priority = this.linePriority;
    colors.fill(this.color(0));
    priority.fill(0);
    if (this.tmw & this.tm) {
      this.count('windows');
    }
    if ((this.cgadsub & 0x3F) || (this.cgwsel & 0x01)) {
      this.count('colorMath');
    }
    if (this.setini & 0x0F) {
      this.count('setini');
    }
    if (this.oamPriority) {
      this.count('oamPriority');
    }
    if (this.bgMode !== 1) {
      this.count('mode'+this.bgMode);
      return;
    }
    // sprites first — the order does not matter, every layer tests the priority strictly
    this.evaluateSprites(row);
    if (this.tm & 0x10) {
      var sp = SNESPPU.MODE1_SPRITE_PRIORITY;
      for (var x = 0; x < width; x++) {
        var p = this.spritePriority[x];
        if (p <= 3 && priority[x] < sp[p]) {
          colors[x] = this.color(128+(this.spritePalette[x] << 4)+this.spriteColors[x]);
          priority[x] = sp[p];
        }
      }
    }
    var bg = SNESPPU.MODE1_BG_PRIORITY;
    if (this.tm & 0x01) {
      this.composeLayer(row, 0, 4, bg[0][0], bg[0][1]);
    }
    if (this.tm & 0x02) {
      this.composeLayer(row, 1, 4, bg[1][0], bg[1][1]);
    }
    if (this.tm & 0x04) {
      this.composeLayer(row, 2, 2, bg[2][0], this.bg3Priority ? 11 : bg[2][1]);
    }
  } // composeLine

  /**
   * One background on one line: the map entries along the row at the
   * layer's scroll, their tiles' pixels, into `lineColors` where the
   * priority wins. Row `r` of the picture shows map line `r + 1 + vscroll`.
   * With the layer's mosaic bit on and a size above 1, the line is the one
   * of the block's top row and every pixel repeats the block's first
   * ({@link SNESPPU#layerLine} draws the layer alone, this composes it).
   * @param {number} row - The picture row.
   * @param {number} index - 0-3.
   * @param {number} bpp - 2 or 4.
   * @param {number} lowPriority - Of a map entry without the priority bit.
   * @param {number} highPriority - Of one with it.
   */
  composeLayer(row, index, bpp, lowPriority, highPriority) {
    var size = (this.mosaic >> 4)+1;
    var mosaic = size > 1 && (this.mosaic & (1 << index)) !== 0;
    this.layerLine(mosaic ? row-(row % size) : row, index, bpp);
    var colors = this.lineColors;
    var priority = this.linePriority;
    var lc = this.layerColors;
    var lh = this.layerHigh;
    for (var x = 0; x < SNESPPU.WIDTH; x++) {
      var c = lc[mosaic ? x-(x % size) : x];
      if (!c) {
        continue;
      }
      var prio = lh[mosaic ? x-(x % size) : x] ? highPriority : lowPriority;
      if (priority[x] >= prio) {
        continue;
      }
      colors[x] = this.color(c);
      priority[x] = prio;
    }
  } // composeLayer

  /**
   * One background alone on one line into `layerColors` (the CGRAM index,
   * 0 where the tile is transparent) and `layerHigh` (the map entry's
   * priority bit).
   * @param {number} row - The picture row (0-223).
   * @param {number} index - 0-3.
   * @param {number} bpp - 2 or 4.
   */
  layerLine(row, index, bpp) {
    var layer = this.layers[index];
    var vram = this.vram;
    var lc = this.layerColors;
    var lh = this.layerHigh;
    if (layer.largeTiles) {
      this.count('largeTiles');
    }
    var y = row+1+(layer.vscroll & 0x3FF);
    var tileRow = y >> 3;
    var fineY = y & 7;
    var hs = layer.hscroll & 0x3FF;
    var rowBase = layer.tilemap+(layer.tall ? ((tileRow & 0x20) << (layer.wide ? 6 : 5)) : 0)+((tileRow & 0x1F) << 5);
    var lastColumn = -1;
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, palette = 0, high = 0, hflip = false;
    for (var x = 0; x < SNESPPU.WIDTH; x++) {
      var sx = x+hs;
      var column = sx >> 3;
      if (column !== lastColumn) {
        lastColumn = column;
        var addr = rowBase+(column & 0x1F)+(layer.wide ? ((column & 0x20) << 5) : 0);
        var entry = this.vramWord(addr);
        var tile = entry & 0x3FF;
        palette = (entry >> 10) & 7;
        high = (entry & 0x2000) ? 1 : 0;
        hflip = !!(entry & 0x4000);
        var yOff = (entry & 0x8000) ? 7-fineY : fineY;
        var at = (((layer.chr+tile*4*bpp) & 0x7FFF) << 1)+(yOff << 1);
        b0 = vram[at & 0xFFFF];
        b1 = vram[(at+1) & 0xFFFF];
        if (bpp === 4) {
          b2 = vram[(at+16) & 0xFFFF];
          b3 = vram[(at+17) & 0xFFFF];
        } else {
          b2 = 0;
          b3 = 0;
        }
      }
      var shift = hflip ? (sx & 7) : 7-(sx & 7);
      var color = ((b0 >> shift) & 1) | (((b1 >> shift) & 1) << 1) | (((b2 >> shift) & 1) << 2) | (((b3 >> shift) & 1) << 3);
      lc[x] = color ? palette*(1 << bpp)+color : 0;
      lh[x] = high;
    }
  } // layerLine

  /**
   * The sprites of one line, with the chip's limits, into `spriteColors`,
   * `spritePriority` (0xFF where no sprite) and `spritePalette`: the first
   * 32 of OAM that touch the line (the 33rd sets range over), their tiles
   * fetched from the last kept sprite back to the first, the 35th tile sets
   * time over and ends the fetching — so the sprites that vanish are the
   * first ones, and among overlapping sprites the lower OAM index is on top.
   * @param {number} row - The picture row, 0-224.
   */
  evaluateSprites(row) {
    var oam = this.oam;
    var vram = this.vram;
    var indexes = this.spriteIndexes;
    var sizes = SNESPPU.OBJ_SIZES[this.objSize];
    var count = 0;
    this.spritePriority.fill(0xFF);
    for (var i = 0; i < 128; i++) {
      var hi = oam[0x200+(i >> 2)] >> ((i & 3) << 1);
      var x = (hi & 1) ? oam[i << 2]-256 : oam[i << 2];
      var size = sizes[(hi & 2) ? 1 : 0];
      var width = size[0], height = size[1];
      if (x !== -256 && x+width <= 0) {
        continue;
      }
      var y = oam[(i << 2)+1];
      var endY = y+height;
      if ((row >= y && row < endY) || ((endY & 0xFF) < y && row < (endY & 0xFF))) {
        if (count < SNESPPU.SPRITES_PER_LINE) {
          indexes[count++] = i;
        } else {
          this.rangeOver = true;
        }
      }
    }
    var tiles = 0;
    for (var s = count-1; s >= 0; s--) {
      var n = indexes[s];
      var hiN = oam[0x200+(n >> 2)] >> ((n & 3) << 1);
      var sx = (hiN & 1) ? oam[n << 2]-256 : oam[n << 2];
      var sy = oam[(n << 2)+1];
      var tileNumber = oam[(n << 2)+2];
      var attr = oam[(n << 2)+3];
      var sizeN = sizes[(hiN & 2) ? 1 : 0];
      var w = sizeN[0];
      var columnCount = w >> 3;
      var columnOffset = columnCount;
      if (sx <= -8 && sx !== -256) {
        columnOffset += (sx/8) | 0;     // the tiles off the left edge are not fetched
      }
      var palette = (attr >> 1) & 7;
      var prio = (attr >> 4) & 3;
      var hflip = !!(attr & 0x40);
      var second = (attr & 1) ? this.objGap : 0;
      var yGap = (row-sy) & 0xFF;
      var pos = yGap;
      if (attr & 0x80) {
        pos = yGap < w ? w-1-yGap : w*3-1-yGap;
      }
      var yOff = pos & 7;
      var tileRow = ((tileNumber >> 4)+(pos >> 3)) & 0x0F;
      var tileColumn = tileNumber & 0x0F;
      while (true) {
        if (++tiles > SNESPPU.TILES_PER_LINE) {
          this.timeOver = true;
          return;
        }
        columnOffset--;
        var c = hflip ? columnOffset : columnCount-columnOffset-1;
        var tileIndex = (tileRow << 4) | ((tileColumn+c) & 0x0F);
        var fetch = (this.objBase+(tileIndex << 4)+second+yOff) & 0x7FFF;
        var at = fetch << 1;
        var at2 = ((fetch+8) & 0x7FFF) << 1;
        var p0 = vram[at], p1 = vram[at+1], p2 = vram[at2], p3 = vram[at2+1];
        var drawX = sx+((columnCount-columnOffset-1) << 3);
        var endTileX = (sx === -256 ? 0 : sx)+((columnCount-columnOffset-1) << 3)+8;
        for (var px = 0; px < 8; px++) {
          var xp = drawX+px;
          if (xp < 0 || xp > 255) {
            continue;
          }
          var shift = hflip ? px : 7-px;
          var color = ((p0 >> shift) & 1) | (((p1 >> shift) & 1) << 1) | (((p2 >> shift) & 1) << 2) | (((p3 >> shift) & 1) << 3);
          if (color) {
            this.spriteColors[xp] = color;
            this.spritePriority[xp] = prio;
            this.spritePalette[xp] = palette;
          }
        }
        if (columnOffset === 0 || endTileX >= 256) {
          break;
        }
      }
    }
  } // evaluateSprites

  /**
   * The same painting into RGBA bytes — for a tool under Node that wants a
   * PNG of the screen.
   * @param {Uint8ClampedArray|Uint8Array} rgba - Target, 256*224*4 bytes.
   * @returns {SNESPPU} This.
   */
  paint(rgba) {
    var littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    var view = new Uint32Array(rgba.buffer, rgba.byteOffset, SNESPPU.WIDTH*SNESPPU.HEIGHT);
    return this.paint32(view, littleEndian);
  } // paint

} // SNESPPU
