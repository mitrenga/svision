svision draws all of its text from bitmap fonts it owns — no web fonts, no
`ctx.fillText()`. A font is a plain JavaScript class deriving from
{@link AbstractFonts}: it holds a glyph table, a few spacing metrics, and it
answers one question for the renderer — *give me the pixels for this character
at this scale*.

This tutorial covers the built-in fonts, the glyph data formats, how an
application extends a font, and how to turn a raw ZX Spectrum `.ch8` font dump
into a glyph table you can use.

## The built-in fonts

| Font | Size | Glyph format | Proportional | Character set |
|---|---|---|---|---|
| {@link Fonts3x3} | 3x3 | rectangle table | always | digits and a few symbols |
| {@link Fonts5x5} | 5x5 | rectangle table | always | printable ASCII |
| {@link ZXFonts8x8} | 8x8 | hex bitmap | optional | ASCII 32–126 with `£` in place of the backtick, plus `©` (96 glyphs) |
| {@link VGAFonts8x16} | 8x16 | hex bitmap | optional | Uni-VGA, ~2900 Unicode code points |
| {@link C64Fonts8x8} | 8x8 | hex bitmap | optional | C64 character ROM 901225-01: 2x256 glyphs by screen code, set 0 uppercase/graphics, set 1 lowercase/uppercase |
| {@link Atari8Fonts8x8} | 8x8 | hex bitmap | optional | Atari XL OS ROM: 2x128 glyphs by internal code, set 0 standard, set 1 international |

`Fonts3x3` and `Fonts5x5` are platform-neutral canvas2D fonts. `ZXFonts8x8`
lives under the **ZX Spectrum** platform and is an authentic 8x8 Spectrum
character set; `VGAFonts8x16` lives under the **VGA** platform;
`C64Fonts8x8` under the **C64** platform and `Atari8Fonts8x8` under the
**Atari 8-bit** platform, each the character ROM of its machine (two sets
each; the set a `TextEntity` prints in is chosen in the constructor).

Core fonts deliberately ship printable ASCII plus **one** normal, breaking
space — nothing application-specific. Games add their own graphic glyphs and
their own kinds of space; see [Extending a font](#extending-a-font).

## Two glyph formats

**Rectangle-table fonts** (`Fonts3x3`, `Fonts5x5`) store each glyph as an
already-decoded list of filled rectangles, keyed by character:

```js
'7': {width: 3, data: [[0,0,2,1], [2,0,1,3]]}   // [x, y, w, h] per rectangle
```

This suits tiny glyphs, where a handful of rectangles beats a per-pixel scan
and the glyph widths differ anyway.

**Hex bitmap fonts** (`ZXFonts8x8`, `VGAFonts8x16`) store their glyphs as hex,
two hex digits per pixel row, most significant bit leftmost — the ZX font as
one long string, the VGA font as rows of glyphs:

- `ZXFonts8x8` — **16 hex digits per glyph** (8 rows x 1 byte), indexed by the
  character's *position in `fontsChars`*.
- `VGAFonts8x16` — **32 hex digits per glyph** (16 rows x 1 byte), looked up by
  *Unicode code point*: `charsRanges` lists the covered ranges and `fontsChars`
  maps each code point to its `[row, offset]` position in `fontsData`.

`C64Fonts8x8` and `Atari8Fonts8x8` keep their ROM dumps the same way —
`fontsData` is a list of rows of 512 hex digits, 32 glyphs of 16 digits a
row — so a glyph is found by its screen code or internal code alone, with
no `fontsChars` mapping in between.

`getCharData()` decodes a glyph on demand into the same `[x, y, w, h]`
rectangle list the renderer wants, one rectangle per set pixel, scaled.

## `glyphBytes()` — the raw glyph for a text memory

A text entity wants rectangles; the models of a machine's text memory want
the bytes a character generator reads out of its ROM. That is `glyphBytes()`,
which every bitmap font that feeds a text memory provides — an object with
that one method is all `VGATextRAM` and `C64TextRAM` require of a font, so a
game with a character set of its own hands them its own object. The method
ignores the `proportional` setting, because a cell of a text mode is always
eight pixels wide:

| Method | Returns | Used by |
|---|---|---|
| `ZXFonts8x8.glyphBytes(char)` | 8 bytes, top row first, the ROM order at `$3D00`; a character the font lacks gives the glyph of `?` | `ZXVideoRAM.pokeCell()` — writing a character straight into the video memory |
| `VGAFonts8x16.glyphBytes(codePoint)` | 16 row masks, bit 7 the leftmost pixel; a missing code point gives `?` | `VGATextRAM` painting an 80x25 screen |
| `C64Fonts8x8.glyphBytes(code, set)` | 8 bytes of a **screen code** in set 0 or 1; reverse video codes 128–255 come out inverted, as in the ROM | `C64TextRAM`, and a game copying the ROM into a custom set |
| `Atari8Fonts8x8.glyphBytes(code, set)` | 8 bytes of an **internal code**; codes 128–255 inverted the way ANTIC does it (the ROM has no inverse glyphs) | a caller wanting one glyph; `Atari8Screen` takes a whole set through `setBytes(set)` instead |

## Metrics

Set by the subclass constructor, consumed by the text entities:

| Property | Meaning |
|---|---|
| `charsHeight` | glyph height in pixels |
| `charsSpacing` | gap inserted between characters |
| `lineSpacing` | extra gap between lines |
| `paragraphSpacing` | gap between paragraphs |
| `monospaceWidth` | glyph advance when rendering fixed-width |
| `proportional` | when true, blank left/right columns are trimmed per glyph |

`ZXFonts8x8`, `VGAFonts8x16`, `C64Fonts8x8` and `Atari8Fonts8x8` take
`proportional` as a constructor argument (the C64 and Atari fonts take the set
after it),
so the same font can be instantiated twice — once monospaced for tabular
displays such as scores, once proportional for prose:

```js
this.fonts = {
  zxFonts8x8Mono: new ZXFonts8x8(this, false),
  zxFonts8x8:     new ZXFonts8x8(this, true)
};
```

## Spaces

Spaces are data, not a hard-coded character. Each font holds a table of
space-like characters that are never drawn:

```js
this.spaces = {
  ' ': {width: 5, breaking: true, stretch: true}
};
```

- `width` — advance in pixels (proportional mode; monospaced uses `monospaceWidth`)
- `breaking` — line wrapping may break here
- `stretch` — justified alignment may widen it

Which character acts as a space is font-specific: the very same character can
be a blank space in one font and a real printable glyph in another. A font that
renders `▒` as a shade block must *not* list it as a space.

One deliberate quirk: under reverse video (`bitMask === '0'`) a space inverts
into a solid block, so flashing reverse-colour text keeps blinking through its
spaces. See {@link AbstractFonts#spaceCharData}.

## Extending a font

Applications register their own glyphs and spaces at start-up — the library
font stays generic.

Rectangle-table fonts take a map:

```js
this.fonts.fonts5x5.addGlyphs({
  '↑': {width: 5, data: [[2,0,1,5], [1,1,3,1], [0,2,5,1]]},
  '█': {width: 4, data: [[0,0,4,5]]}
});
this.fonts.fonts5x5.addSpace('␣', {width: 2, breaking: false, stretch: true});
```

`ZXFonts8x8` takes the characters and their concatenated hex bitmaps, appending
both to `fontsChars` and `fontsData` — so the two arguments must be in the same
order:

```js
this.fonts.zxFonts8x8.addGlyphs('‗⋅', '000000000000F8F8' + '0000003030000000');
```

The marker characters are the application's choice. Pick ones the font does not
already print (`␣`, `‗`, `⋅` are the convention in the example games).

> `setFontsData()` **replaces** the whole base table, so call it *before*
> `addGlyphs()` — otherwise the extra glyphs are discarded while `fontsChars`
> keeps claiming they exist.

## ZX Spectrum 8x8 fonts

### Where to find more

The fonts in [fonts/](https://github.com/mitrenga/svision/tree/main/fonts) come
from the **ZX Spectrum font vault**:

**https://github.com/ZXSpectrumVault/zx-fonts**

It holds ~1000 raw 768-byte `.ch8` fonts extracted from ZX Spectrum games and
utilities with [PixelWorld](https://github.com/damieng/pixelworld), each with a
PNG preview. Any of them drops straight into `ZXFonts8x8` via the pipeline
below.

A 768-byte `.ch8` file is exactly **96 glyphs x 8 rows x 1 byte**, in ZX
Spectrum character order (code 32 `space` to code 127 `©`) — which is precisely
the order of `fontsChars`. That is why the conversion is a plain hex dump with
no reordering.

> Note on rights: the vault's README argues that bitmap fonts carry no
> executable component and are generally not copyrightable in the UK/USA, while
> explicitly stating that this is not legal advice. svision therefore credits
> every font by its original source rather than claiming any licence over it.
> All font sources are registered in
> [SOURCES.md](https://github.com/mitrenga/svision/blob/main/SOURCES.md).

### The bundled examples

All five are 8x8 ZX Spectrum fonts. Previews are `Abc 123 {|}~`:

**`zx-rom`** — the standard ZX Spectrum ROM font, the default glyph table of
`ZXFonts8x8`.

```
................................................................................................
..####....#........................##.....####....####..............###.....#....###.......#.#..
.#....#...#........###............#.#....#....#..#....#.............#.......#......#......#.#...
.#....#...####....#.................#.........#.....##............##........#.......##..........
.######...#...#...#.................#.....####........#.............#.......#......#............
.#....#...#...#...#.................#....#.......#....#.............#.......#......#............
.#....#...####.....###............#####..######...####..............###.....#....###............
................................................................................................
```

**`light-the-conk`** — bold, chunky; from *Light the Conk* (1991, Dominic
Morris). The same set appears in the vault as `Y.A.S.G.ch8`.

```
................................................................................................
.#####..###........................###....####....####.............####...###....####.....#..#..
###.###.###.......####............####...##.###..##.###............##.....###......##....#..#...
###.###.######...###.............#####......###....###.............##.....###......##....##.##..
#######.###.###..###...............###....####......###...........##......###.......##...##.##..
###.###.###.###..###...............###...###.....##.###............##.....###......##...........
###.###.######....####............#####..######...####.............##.....###......##...........
...................................................................####..........####...........
```

**`caves-of-doom`** — squarish, slightly condensed; from *The Caves of Doom*
(1985, Mastertronic). Also in the vault as *Odyssee*.

```
................................................................................................
..####...#.........................##....######..######.............###.....#....###.......#.#..
..#..#...#........#####............##....#...##......##.............#.......#......#......#.#...
..#####..#####....#...#............##........##......##...........##........#.......##..........
.##...#..#...#....#.................#....######..######.............#.......#......#............
.##...#..##..#....##..#.............#....#............#.............#.......#......#............
.##...#..#####....#####.............#....######..######.............###.....#....###............
................................................................................................
```

**`alcatraz-harry-2`** — light, with descenders; from *Alcatraz Harry 2 - The
Doomsday Mission* (1984, Scorpio Gamesworld). Appears in the vault under three
more titles, one of them from the same publisher, so it is likely a house font.

```
........##.......................................................###.......#.......#.......###..
..####...#.........................##....#####...#####.............#.......#.......#.......#....
.#....#..#####...#####............#.#....#...#...#...#.............#.......#.......#.......#....
.#....#..#...#...#...#..............#........#.....##..............#.......#.......#.......#....
.######..#...#...#..................#.....###........#.............#.......#.......#.......#....
.#....#..#...#...#..................#....#.......#...#.............#.......#.......#.......#....
###..###.#####...#####............#####..#####...#####.............#.......###...###.......#....
....................................................................##...................##.....
```

Note the last four glyphs in the alcatraz-harry-2 preview: the original has decorative bars
where `{ | } ~` belong. Fonts extracted from games often trail off like this —
the game never printed those characters, so the author reused the slots. Where
svision needs them, the repository keeps an adapted copy alongside the
untouched original:

| File | What it is |
|---|---|
| `<name>.ch8` | the original dump, exactly as extracted — never edited |
| `<name>.ch8.hex.txt` | the same bytes as an uppercase hex string, ready to paste |
| `<name>.svision.ch8` | an adapted copy with missing/unsuitable glyphs redrawn |
| `<name>.svision.ch8.hex.txt` | hex string of the adapted copy |

Two adapted copies exist today: `caves-of-doom.svision` (redraws `©`) and
`alcatraz-harry-2.svision` (redraws `{ | } ~ ©`). The latter is the font the
example games use for their on-screen keyboard.

**`cimmerjan`** — hand-drawn, irregular, with descenders; from *Cimmerjan*
(1993, Sindicato del Software). The `{ | } ~` slots hold block graphics, not
punctuation. Sabre Wulf sets the name of the game in it.

```
.#.###............................................................##......#####..##..##.........
.###.##..##.###...#####............##.....####....####..........#..#####.#.###..................
.##..##..###.##..##...#...........###....##..##..##..##...........######.###.##..##..##.........
.##..##..##..#...##................##.......###.....##..........########.##...#...#..##.........
.######..#####...##................##.....####.......##..................##...#..#...##.........
.##..##..##..##..##...#............##....###.....##..##.........########.##..#...##.###.........
.###.##..#####....#####...........####...######...####..........########.##.###...##.##.........
................................................................########........................
```

### ROM dumps: `.bin` and `.bin.hex.txt`

The character ROMs of the C64 and the Atari are kept in `fonts/` next to the
`.ch8` fonts, in a pair that must not be confused with the `.bin.txt` ASCII
grid below:

| File | What it is |
|---|---|
| `<name>.bin` | the ROM dump, exactly as taken — `c64-chargen.bin` (4 KB, both sets), `atari-xl-charset.bin` ($E000, standard) and `atari-xl-charset-intl.bin` ($CC00, international) |
| `<name>.bin.hex.txt` | the same bytes as uppercase hex, 128 hex digits (8 glyphs) per line — joined into the rows of 512 hex digits (32 glyphs) that `fontsData` of `C64Fonts8x8`/`Atari8Fonts8x8` holds |
| `sources/rom/atari-xl-os.rom` | the whole 16 KB XL OS ROM the two Atari sets were cut from. It is **not** in `fonts/` and **not** in git: raw dumps live in `sources/`, which `.gitignore` covers (R-041). `tools/retro/fetchroms.py atari8 --import PATH --dest sources/rom` (run from the svision root) puts it back |

The `.bin` is binary, eight bytes a glyph, bit 7 the leftmost pixel — the
form the VIC-II or ANTIC reads; the `.bin.txt` of the ZX pipeline is a
text drawing of `0`/`1` characters that `convert-bin-txt` turns *into* a
binary. Origins and licences of the ROMs are in
[SOURCES.md](https://github.com/mitrenga/svision/blob/main/SOURCES.md).

### From .ch8 to a glyph table

The `.hex.txt` files are pre-generated, so using a bundled font is a copy and
paste. For a font freshly downloaded from the vault, one command:

```bash
tools/make-data-fonts fonts/my-font.ch8      # -> fonts/my-font.ch8.hex.txt
```

Then hand the string to the font instance:

```js
this.fonts.zxFonts8x8Keys = new ZXFonts8x8(this, false);
this.fonts.zxFonts8x8Keys.setFontsData('0000000000000000001010101000...');
```

If the font is missing glyphs you need — the `{ | } ~ ©` tail is the usual
suspect — draw them as an ASCII grid, convert, and keep the result as a
`.svision.ch8` copy so the original stays pristine:

```bash
tools/convert-bin-txt fonts/my-font.bin.txt  # -> fonts/my-font.bin.txt.ch8
tools/make-data-fonts fonts/my-font.svision.ch8
```

`.bin.txt` is a plain text file of `0`/`1` characters, 8 per row, 8 rows per
glyph, 96 glyphs in `fontsChars` order — the format
`fonts/zx-rom.bin.txt` is written in. See the [Tools](https://mitrenga.github.io/svision/tutorial-tools.html)
tutorial for both scripts and their prerequisites.

Alternatively, if you only need a few characters added on top of an otherwise
fine font, skip the round trip and use `addGlyphs()`.

## VGA 8x16 fonts

`VGAFonts8x16` renders from **Uni-VGA** (Dmitry Bolkhovityanov, `iso10646-1`),
converted from `u_vga16.bdf` — 2899 glyphs covering a broad slice of Unicode,
which is why this font is keyed by code point rather than by a fixed character
string. The data lives directly in the class: `charsRanges` lists the covered
code-point ranges and `fontsData` holds the packed bitmaps (8 glyphs per hex
string). Unlike the ZX fonts it also has real printable shade blocks
(`░ ▒ ▓ █`), which are therefore *not* registered as spaces.

The `charsRanges`/`fontsData` tables are generated from the BDF and must not be
hand-edited.

**Source & licence:** Uni-VGA was created by Dmitry Yu. Bolkhovityanov (2001);
the data used here comes from the original `u_vga16.bdf` as bundled in the
[univga-ttf](https://github.com/illnyang/univga-ttf) repository (Illyan Garte's
2022 TTF port, which includes the original `uni_vga` source package). The font
may be distributed and modified freely under the X11 licence.

> One open item: the BDF-to-JavaScript converter is not in `tools/`, so there
> is currently nothing to run to regenerate the tables.
