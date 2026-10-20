const { C64TextRAM } = await import('./c64TextRAM.js?ver='+window.srcVersion);
const { C64SpriteData } = await import('./c64SpriteData.js?ver='+window.srcVersion);
// begin code

/**
 * The eight hardware sprites of the VIC-II as the chip draws them: registers,
 * the shapes in the memory the chip sees, and the **changes a raster
 * interrupt makes while the beam runs** — painted line by line into the same
 * 320x200 picture {@link C64TextRAM} paints. Free of DOM, so a tool under
 * Node composes the frame the browser shows (R-001).
 *
 * This is what a game needs when it shows more objects than there are
 * sprites. A **multiplexer** reuses a sprite lower on the screen by writing
 * its position, pointer and colour again once the upper use is drawn; on the
 * chip that works because a sprite **starts when the raster line matches its
 * Y register** and then shows its 21 rows with whatever X, pointer and
 * colours the registers hold on each line. The class does the same, from
 * data: {@link C64Sprites#setWrites} takes the stores as `{line, register,
 * value}` or `{line, pointer, value}`, so a game's model hands over what its
 * interrupts wrote and no interrupt is emulated (`ROADMAP.md` §2.3f).
 *
 * ```js
 * var sprites = new C64Sprites(bank);          // the 16 KB the VIC-II sees
 * sprites.setRegisters(vic);                   // $D000-$D02E at the top of the frame
 * sprites.setPointers(bank.subarray(0x0FF8, 0x1000));
 * sprites.setWrites([
 *   {line: 30, register: 0xD007, value: 0x99},   // sprite 3 lower down
 *   {line: 30, pointer: 3, value: 0xC4}
 * ]);
 * sprites.paint32(pixels, littleEndian);       // over the text, under the border
 * ```
 *
 * Lines are picture lines (0 is raster 51, the top of the 25-row window); a
 * sprite with Y register 50 starts on line 0. A store takes effect from the
 * start of its line — the tool that measures the original turns a raster
 * line and cycle into that line (`r-type/tools/matchscreen.mjs`).
 *
 * Sprite 0 is in front of sprite 7. What is not here: the priority bit
 * $D01B (a sprite behind the text) and the collision registers, which are
 * {@link C64Collision}.
 */
export class C64Sprites {

  /** the raster line of picture line 0 */
  static get FIRST_RASTER() { return 51; }

  /**
   * @param {Uint8Array} [memory] - The 16 KB bank the VIC-II sees; shapes are
   *        read at pointer*64.
   */
  constructor(memory) {
    this.id = 'C64Sprites';
    /** the bank */
    this.memory = memory || new Uint8Array(16384);
    /** $D000-$D02E at the top of the frame */
    this.registers = new Uint8Array(0x2F);
    /** the eight sprite pointers at the top of the frame */
    this.pointers = new Uint8Array(8);
    /** stores during the frame, sorted by line */
    this.writes = [];
    /** bumped by every change; a painter compares it with the one it painted */
    this.version = 0;
  } // constructor

  /**
   * Sets the memory the shapes are read from.
   * @param {Uint8Array} memory - The 16 KB bank.
   * @returns {C64Sprites} This.
   */
  setMemory(memory) {
    this.memory = memory;
    this.version++;
    return this;
  } // setMemory

  /**
   * Sets the registers at the top of the frame.
   * @param {Uint8Array|Array<number>} bytes - $D000 onwards, up to $D02E.
   * @returns {C64Sprites} This.
   */
  setRegisters(bytes) {
    this.registers.fill(0);
    for (var i = 0; i < Math.min(bytes.length, 0x2F); i++) {
      this.registers[i] = bytes[i] & 255;
    }
    this.version++;
    return this;
  } // setRegisters

  /**
   * Sets one register at the top of the frame.
   * @param {number} address - $D000-$D02E (or 0-$2E).
   * @param {number} value - 0-255.
   * @returns {C64Sprites} This.
   */
  setRegister(address, value) {
    this.registers[address & 0x3F] = value & 255;
    this.version++;
    return this;
  } // setRegister

  /**
   * Sets the sprite pointers at the top of the frame.
   * @param {Uint8Array|Array<number>} bytes - Eight blocks numbers.
   * @returns {C64Sprites} This.
   */
  setPointers(bytes) {
    for (var i = 0; i < 8; i++) {
      this.pointers[i] = bytes[i] & 255;
    }
    this.version++;
    return this;
  } // setPointers

  /**
   * The stores the game makes while the frame is drawn.
   * @param {Array<Object>|null} writes - `{line, register, value}` with a
   *        register $D000-$D02E, or `{line, pointer: 0-7, value}`; lines may
   *        be negative (above the picture).
   * @returns {C64Sprites} This.
   */
  setWrites(writes) {
    this.writes = (writes || []).slice().sort(function (a, b) { return a.line-b.line; });
    this.version++;
    return this;
  } // setWrites

  /**
   * Paints the sprites over a picture, line by line, sprite 7 first.
   * @param {Uint32Array} pixels - The picture, 320*200, text already in it.
   * @param {boolean} littleEndian - Byte order of the target.
   * @returns {C64Sprites} This.
   */
  paint32(pixels, littleEndian) {
    var colors = C64TextRAM.lookup(littleEndian);
    var width = C64TextRAM.WIDTH;
    var height = C64TextRAM.HEIGHT;
    var reg = Uint8Array.from(this.registers);
    var ptr = Uint8Array.from(this.pointers);
    var active = new Array(8).fill(false);
    var row = new Array(8).fill(0);
    var half = new Array(8).fill(0);
    var w = 0;
    // a sprite may start as high as Y 0, which is 50 lines above the picture
    for (var line = -C64SpriteData.ORIGIN_Y; line < height; line++) {
      while (w < this.writes.length && this.writes[w].line <= line) {
        var store = this.writes[w++];
        if (store.pointer !== undefined) {
          ptr[store.pointer & 7] = store.value & 255;
        } else {
          reg[store.register & 0x3F] = store.value & 255;
        }
      }
      for (var n = 7; n >= 0; n--) {
        var bit = 1 << n;
        if (!active[n] && (reg[0x15] & bit) && reg[2*n+1]-C64SpriteData.ORIGIN_Y === line) {
          active[n] = true;
          row[n] = 0;
          half[n] = 0;
        }
        if (!active[n]) {
          continue;
        }
        if (line >= 0) {
          this.paintRow(pixels, colors, reg, ptr, n, row[n], line*width);
        }
        if ((reg[0x17] & bit) && half[n] === 0) {
          half[n] = 1;
        } else {
          half[n] = 0;
          row[n]++;
          if (row[n] >= C64SpriteData.HEIGHT) {
            active[n] = false;
          }
        }
      }
    }
    return this;
  } // paint32

  /**
   * One row of one sprite on one line of the picture.
   * @private
   */
  paintRow(pixels, colors, reg, ptr, n, r, offset) {
    var bit = 1 << n;
    var x0 = (reg[2*n] | ((reg[0x10] & bit) ? 256 : 0))-C64SpriteData.ORIGIN_X;
    var at = (ptr[n]*C64SpriteData.BLOCK+r*3) & (this.memory.length-1);
    var bits = (this.memory[at] << 16) | (this.memory[at+1] << 8) | this.memory[at+2];
    var wide = (reg[0x1D] & bit) ? 2 : 1;
    var width = C64TextRAM.WIDTH;
    if (reg[0x1C] & bit) {
      var shared = [0, colors[reg[0x25] & 15], colors[reg[0x27+n] & 15], colors[reg[0x26] & 15]];
      for (var pair = 0; pair < 12; pair++) {
        var key = (bits >> (22-pair*2)) & 3;
        if (key === 0) continue;
        for (var p = 0; p < 2*wide; p++) {
          var x = x0+pair*2*wide+p;
          if (x >= 0 && x < width) pixels[offset+x] = shared[key];
        }
      }
    } else {
      var own = colors[reg[0x27+n] & 15];
      for (var i = 0; i < 24; i++) {
        if (!((bits >> (23-i)) & 1)) continue;
        for (var q = 0; q < wide; q++) {
          var xx = x0+i*wide+q;
          if (xx >= 0 && xx < width) pixels[offset+xx] = own;
        }
      }
    }
  } // paintRow

} // C64Sprites
