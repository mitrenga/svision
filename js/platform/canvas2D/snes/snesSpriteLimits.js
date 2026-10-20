// classic worker script (importScripts): no import, no export — R-001
// begin code

/**
 * The sprite limits of the SNES PPU as a pure function over the OAM, for
 * a game's **worker**: STAT77's *range over* (more than 32 sprites on a
 * line) and *time over* (more than 34 sprite tiles on a line) of the frame
 * the chip would draw from this OAM. `SNESPPU.evaluateSprites` applies
 * the same rule while it paints (`snesPPU.js`, the authority); a worker
 * cannot import that module (`importScripts` takes no ES module, R-001),
 * and a game's logic reads these flags before the picture is painted —
 * Super R-Type reads STAT77 in its NMI and blinks its second sprite group
 * when the previous frame overflowed (`super-r-type`, `disasm_notes.md` §3).
 * `tools/checksnes.mjs` holds both against each other.
 *
 * The rule (★ the chip's, as `evaluateSprites` has it): for every picture
 * row 0-223 the sprites of OAM in order; one touches the row when the row
 * is within its height from its y (wrapping at 256); the first 32 are
 * kept, a 33rd sets range over. The kept ones are fetched from the last
 * to the first, `width / 8` tiles each less the tiles off the left edge
 * (x ≤ −8) and less those past the right edge (the tile that reaches
 * x 256 is the sprite's last); the 35th tile sets time over and ends the
 * row.
 *
 * @param {Uint8Array} oam - 544 bytes: 512 of entries and 32 of the high table.
 * @param {number} objSize - OBSEL bits 5-7 (0 = 8×8 and 16×16 … 5 = 32×32 and 64×64).
 * @returns {{rangeOver: boolean, timeOver: boolean}} The flags of STAT77.
 */
function snesSpriteLimits(oam, objSize) {
  var sizes = snesSpriteLimits.OBJ_SIZES[objSize || 0];
  var rangeOver = false, timeOver = false;
  var kept = new Int16Array(32);
  for (var row = 0; row < 224 && !(rangeOver && timeOver); row++) {
    var count = 0;
    for (var i = 0; i < 128; i++) {
      var hi = oam[0x200+(i >> 2)] >> ((i & 3) << 1);
      var x = (hi & 1) ? oam[i << 2]-256 : oam[i << 2];
      var size = sizes[(hi & 2) ? 1 : 0];
      if (x !== -256 && x+size[0] <= 0) {
        continue;
      }
      var y = oam[(i << 2)+1];
      var endY = y+size[1];
      if ((row >= y && row < endY) || ((endY & 0xFF) < y && row < (endY & 0xFF))) {
        if (count < 32) {
          kept[count++] = i;
        } else {
          rangeOver = true;
        }
      }
    }
    var tiles = 0;
    for (var s = count-1; s >= 0 && !timeOver; s--) {
      var n = kept[s];
      var hiN = oam[0x200+(n >> 2)] >> ((n & 3) << 1);
      var sx = (hiN & 1) ? oam[n << 2]-256 : oam[n << 2];
      var w = sizes[(hiN & 2) ? 1 : 0][0];
      var columns = w >> 3;
      var offset = columns;
      if (sx <= -8 && sx !== -256) {
        offset += (sx/8) | 0;
      }
      var left = sx === -256 ? 0 : sx;
      while (offset > 0) {
        if (++tiles > 34) {
          timeOver = true;
          break;
        }
        offset--;
        if (left+((columns-offset-1) << 3)+8 >= 256) {
          break;
        }
      }
    }
  }
  return {rangeOver: rangeOver, timeOver: timeOver};
} // snesSpriteLimits

/** OBSEL bits 5-7: [small, large] sprite sizes in pixels (`SNESPPU.OBJ_SIZES`) */
snesSpriteLimits.OBJ_SIZES = [
  [[8, 8], [16, 16]], [[8, 8], [32, 32]], [[8, 8], [64, 64]],
  [[16, 16], [32, 32]], [[16, 16], [64, 64]], [[32, 32], [64, 64]],
  [[16, 32], [32, 64]], [[16, 32], [32, 32]]
];

if (typeof globalThis !== 'undefined') { globalThis.snesSpriteLimits = snesSpriteLimits; }
if (typeof module !== 'undefined' && module.exports) { module.exports = snesSpriteLimits; }
