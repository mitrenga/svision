# Sources

Registry of all third-party material used in **svision**. Every ported or
converted asset must be recorded here with its origin, author and licence, so
that credits and licence summaries for end products (About screens etc.) can be
assembled from this file.

Format: one entry per asset, fields *Used in*, *Origin*, *Author*, *Source*,
*Licence*.

## Fonts

### ZX Spectrum 8x8 fonts (`ZXFonts8x8`)

All `.ch8` fonts in `fonts/` were downloaded from the **ZX Spectrum font
vault**, which extracted them from original ZX Spectrum software with
[PixelWorld](https://github.com/damieng/pixelworld):

- **Source:** https://github.com/ZXSpectrumVault/zx-fonts

The vault's README argues that plain bitmap fonts are generally not
copyrightable in the UK/USA (explicitly not legal advice). svision claims no
licence over them and credits each font by its original source:

#### `zx-rom`
- **Used in:** `js/platform/canvas2D/zx/zxFonts8x8.js` (default glyph
  table), `fonts/zx-rom.*`
- **Origin:** ZX Spectrum ROM character set (1982)
- **Author:** Sinclair Research; ROM copyright now held by Amstrad, which
  permits redistribution of the ZX Spectrum ROMs while retaining copyright
- **Source:** vault `zx-fonts`, file *ZX Spectrum ROM*

#### `light-the-conk`
- **Used in:** `fonts/light-the-conk.*`
- **Origin:** *Light the Conk* (1991)
- **Author:** Dominic Morris
- **Source:** vault `zx-fonts` (also listed there as *Y.A.S.G*)

#### `caves-of-doom`
- **Used in:** `fonts/caves-of-doom.*` (plus adapted copy
  `caves-of-doom.svision.*` — `©` redrawn)
- **Origin:** *The Caves of Doom* (1985)
- **Author:** Mastertronic
- **Source:** vault `zx-fonts` (also listed there as *Odyssee*)

#### `alcatraz-harry-2`
- **Used in:** `fonts/alcatraz-harry-2.*` (plus adapted copy
  `alcatraz-harry-2.svision.*` — `{ | } ~ ©` redrawn)
- **Origin:** *Alcatraz Harry 2 - The Doomsday Mission* (1984); appears under
  three more vault titles, likely a publisher house font
- **Author:** Scorpio Gamesworld
- **Source:** vault `zx-fonts`

#### `cimmerjan`
- **Used in:** `fonts/cimmerjan.*`
- **Origin:** *Cimmerjan* (1993)
- **Author:** Sindicato del Software
- **Source:** vault `zx-fonts`, file *Cimmerjan (1993)(Sindicato del
  Software)(es)#37966*

### Commodore 64 character ROM (`C64Fonts8x8`)

- **Used in:** `js/platform/canvas2D/c64/c64Fonts8x8.js` (`fontsData`, the
  whole 4 KB as hex), `fonts/c64-chargen.bin` and `fonts/c64-chargen.bin.hex.txt`
- **Origin:** Commodore 64 character generator ROM, part number 901225-01
  (1982); two sets of 256 glyphs 8x8, uppercase/graphics and lowercase/uppercase
- **Author:** Commodore Business Machines; the rights to the Commodore ROMs
  are held by Cloanto (Amiga Forever / C64 Forever) and the ROM is **not
  freely licensed** — it is here for study of the machine, as decided on
  2026-09-18 (R-038)
- **Source:** http://www.zimmers.net/anonftp/pub/cbm/firmware/computers/c64/characters.901225-01.bin
  (md5 `12a4202f5331d45af846af6c58fba946`)

### Atari XL/XE OS character sets (`Atari8Fonts8x8`)

- **Used in:** `js/platform/canvas2D/atari8/atari8Fonts8x8.js` (`fontsData`,
  both sets as hex), `fonts/atari-xl-charset.bin` and
  `fonts/atari-xl-charset.bin.hex.txt` ($E000, standard),
  `fonts/atari-xl-charset-intl.bin` and `fonts/atari-xl-charset-intl.bin.hex.txt`
  ($CC00, international). They were cut from the whole 16 KB XL OS ROM,
  which **since R-041 (2026-09-19) lives in `sources/rom/atari-xl-os.rom`**,
  a directory `.gitignore` covers and that is never committed: a whole
  machine ROM is more than the library carries, and the 2 KB of glyphs it
  needs are already here as hex. `tools/retro/fetchroms.py atari8 --import
  PATH` puts it back. An emulator's ROM belongs to the project that traces
  with it (`boulderdash/sources/rom/`), not here
- **Origin:** Atari XL/XE operating system rev. 2 (10 May 1983, part
  CO61598B), the ROM of the Atari 800XL; two sets of 128 glyphs 8x8 in
  internal code order
- **Author:** Atari, Inc.; the rights are held by Atari Interactive and the
  ROM is **not freely licensed** — it is here for study of the machine, as
  decided on 2026-09-18 (R-039)
- **Source:** http://ftp.pigwa.net/stuff/collections/RK-DVD/ (`System Roms/Atari OS XL.rom`),
  CRC-32 `1f9cd270` as listed for rev. 2 in the archive's `OSROMS.TXT`

### PAL GTIA colour model (`Atari8Color`)

- **Used in:** `js/platform/canvas2D/atari8/atari8Color.js` — the palette is
  generated, not copied
- **Origin:** *Altirra Hardware Reference Manual*, Avery Lee — chapter 6
  (table 14, PAL GTIA color encodings) and appendix D (PAL color encoding)
- **Source:** https://www.virtualdub.org/downloads/Altirra%20Hardware%20Reference%20Manual.pdf

### SNES colour and brightness conversion (`SNESColor`)

- **Used in:** `js/platform/canvas2D/snes/snesColor.js` — BGR555 and the
  master brightness of INIDISP to RGB888
- **Origin:** the conversion of **MesenCE 2.2.1** (the continuation of
  Mesen2, GPL-3.0), the emulator the first SNES game is measured against:
  `Core/SNES/SnesPpu.cpp` `ApplyBrightness` (`c * brightness / 15` on the
  5-bit components, in integers) and `Core/Shared/ColorUtilities.h`
  `Convert5BitTo8Bit` (`(c << 3) + (c >> 2)`). The console has no palette
  to measure; the analogue output of a real one is an open point of R-050.
  The sprite evaluation rules of `SNESPPU` (32 sprites / 34 tiles a line,
  tiles fetched from the last sprite back) follow the same file's
  `EvaluateNextLineSprites` / `FetchSpriteData` and agree with anomie's
  and Fullsnes' descriptions.
- **Source:** https://github.com/SourMesen/Mesen2 (`Core/SNES/SnesPpu.cpp`,
  `Core/Shared/ColorUtilities.h`), read 2026-10-18

### C64 VIC-II palette (`C64Color`)

- **Used in:** `js/platform/canvas2D/c64/c64Color.js` (the 16 hex colours)
- **Origin:** **Colodore**, Pepto's 2017 revision of his measured PAL palette
  of the VIC-II (*Calculating the colour palette of the VIC II*), the one
  VICE ships as `colodore.vpl` and most recordings show. Until 2026-10-18 the
  library carried the 2001 values (`pepto-pal`); swapped by R-051 because
  multicolour text in the old, dark blue (R-Type's panel) was hard to read.
  Both are palettes, not data of any game: `match*` tools compare indices.
- **Author:** Philip "Pepto" Timmermann
- **Source:** https://colodore.com/ , https://www.pepto.de/projects/colorvic/ ;
  values as in VICE 3.7 `C64/colodore.vpl`
- **Status:** sixteen colour values, used as numbers

### Uni-VGA 8x16 font (`VGAFonts8x16`)

- **Used in:** `js/platform/canvas2D/vga/vgaFonts8x16.js`
  (`charsRanges`/`fontsData` tables, converted from `u_vga16.bdf`)
- **Origin:** **UNI-VGA** Unicode console/X11 font (2001)
- **Author:** Dmitry Yu. Bolkhovityanov
- **Source:** https://github.com/illnyang/univga-ttf (Illyan Garte's 2022 TTF
  port, bundling the original `uni_vga` source package with `u_vga16.bdf`)
- **Licence:** X11 — may be distributed and modified freely

## Audio references

The sound chips and drivers in `js/audio/` are **written from documentation,
not ported**: no code of another emulator is in them (R-029 rules out the GPL
and LGPL ones as sources). What the code was written from is listed here, so
that the origin of every model can be checked.

### YM3812 (OPL2) datasheet and the AdLib register set (`OPL2`)

- **Used in:** `js/audio/chip/opl2.js`
- **Origin:** the description of the chip in its datasheet (Yamaha YM3812)
  and the public documents of the AdLib register set
- **Author:** Yamaha; AdLib, Inc. and the authors of the public register
  documentation
- **Source:** as cited in `opl2.js` (no URL given in the header)
- **Status:** read as documentation of the chip; the model is an own
  implementation. DOSBox (GPL) and Nuked OPL3 (LGPL) were deliberately not
  used

### SDLPoP `midi.c` disassembly notes (`AdlibMidi`)

- **Used in:** `js/audio/chip/adlibMidi.js`
- **Origin:** the disassembly notes in SDLPoP's `midi.c`, which describe the
  original `seg009` AdLib driver of Prince of Persia
- **Author:** the SDLPoP project
- **Source:** as cited in `adlibMidi.js` (no URL given in the header)
- **Status:** GPLv3 — read as documentation of the driver's behaviour only,
  no code copied

### MAME discrete sound library and netlists (`discrete.js`)

- **Used in:** `js/audio/chip/discrete.js` (`LFSRNoise`, `GatedRC`,
  `SwitchedGainLowpass`, `LadderDAC`, `CC555`, `TriangleWave`, `SquareWave`,
  `FixedSquare`, `SampleHold`, `Ramp`, `RCDischarge`, `Filter1`, `Filter2` …)
  and the engine of the boards, `js/audio/instrument/engineInstrument.js`
- **Origin:** the MAME `discrete` library and the netlists that name the
  parts of the boards — `bzone_a.cpp` (Battlezone; `bzone_custom_filter`)
  and the modules of Asteroids' board (`DISCRETE_DAC_R1`, `DISCRETE_555_CC`,
  `DISCRETE_TRIANGLEWAVE`, `DISCRETE_SQUAREWFIX`, `DISCRETE_SAMPLHOLD`,
  `DISCRETE_RAMP`, `DISCRETE_RCDISC`, `DISCRETE_FILTER1`, `DISCRETE_FILTER2`)
- **Author:** the MAME team
- **Source:** as cited in `discrete.js` (module names, no URL given)
- **Status:** read as documentation of the circuits' behaviour; the blocks
  are written from the circuits themselves

### id Software / Apogee `AUDIOT`, MUSE and IMF formats (`AdlibSound`, `AdlibIMF`)

- **Used in:** `js/audio/chip/adlibSound.js`, `js/audio/chip/adlibIMF.js`
- **Origin:** the AdLib sound effect driver of the id/Apogee games (an
  instrument of sixteen bytes into voice 0, one byte of note every 1/140 s,
  feedback register written as zero) and the IMF music format (a recording of
  register writes, type 0 and type 1 files, 700/560/280 ticks a second) as
  the `AUDIOT` container written by the MUSE editor holds them
- **Author:** id Software; Apogee Software
- **Source:** as cited in the headers of `adlibSound.js` and `adlibIMF.js`
  (no URL given)
- **Status:** format notes read as documentation; the drivers are an own
  implementation

### POKEY (C012294) hardware reference (`POKEY`)

- **Used in:** `js/audio/chip/pokey.js`
- **Origin:** the register description of the Atari POKEY sound half —
  `AUDF1..4`, `AUDC1..4`, `AUDCTL`, the base clocks `clock/28` and
  `clock/114`, the 4-, 5-, 9- and 17-bit polys, the DAC weights — as summarised
  in the class header; the divider formulas of the chip-clock and joined
  16-bit modes (`AUDF + 4`, `AUDF16 + 7`, from the same reference, proved
  write by write against Boulder Dash's title tune in
  `boulderdash/tools/matchsound.mjs`)
- **Author:** Atari, Inc.
- **Source:** as cited in `pokey.js` (no external document named in the
  header)
- **Status:** documentation of the chip; the model is an own implementation
  and says which parts of `AUDCTL` it does not model

### Code page 437 (`VGATextRAM`)

- **Used in:** `js/platform/canvas2D/vga/vgaTextRAM.js` (`CP437` table,
  `encode`/`decode`)
- **Origin:** the character set of the IBM PC, code page 437, as a table of
  256 Unicode code points
- **Author:** IBM
- **Source:** as cited in `vgaTextRAM.js` (no URL given in the header)
- **Status:** a public character mapping

### Standard MIDI file format (`MidiFile`)

- **Used in:** `js/audio/midiFile.js` (`tools/mid2score` parses the same
  specification with a parser of its own)
- **Origin:** the Standard MIDI File specification (format 0/1/2, tracks,
  division, running status, meta and sysex events, the tempo map)
- **Author:** the MIDI Manufacturers Association
- **Source:** as cited in `midiFile.js` (no URL given in the header)
- **Status:** a public specification; the parser is an own implementation

### Chocolate Doom `i_oplmusic.c` — the DMX MUS driver (`AdlibMUS`)

- **Used in:** `js/audio/chip/adlibMUS.js`
- **Origin:** the reconstruction of the never released DMX library's OPL
  music driver of DOOM v1.9; the behaviour is followed, the code is not
  copied (R-029). **Two tables are taken as numbers**, as facts about the
  original driver: the frequency curve (the F-number of every 32nd of a
  semitone, 668 entries) and the volume map (MIDI volume to the chip's
  0..127)
- **Author:** the Chocolate Doom project (Simon Howard et al.)
- **Source:** `i_oplmusic.c` of Chocolate Doom, https://github.com/chocolate-doom/chocolate-doom
- **Licence:** GPLv2 — read as documentation of the driver's behaviour; the
  two tables are data of the original driver, not code

### GENMIDI instrument bank format (`GenMidi`)

- **Used in:** `js/audio/chip/genmidi.js`
- **Origin:** the description of the `GENMIDI` lump of the DMX sound library
  (DOOM, Heretic, Hexen, Strife): 175 OPL2 voice records of 36 bytes and
  their names; checked against DOOM's lump (`#OPL_II#`, 11 908 bytes)
- **Author:** id Software / Digital Expressions (DMX); the format
  descriptions by the wiki authors
- **Source:** https://doomwiki.org/wiki/GENMIDI and
  https://moddingwiki.shikadi.net/wiki/OP2_Bank_Format (collected in
  `doom/sources/reference/README.md`)
- **Status:** format notes read as documentation; the parser is an own
  implementation. The bank itself is game data and stays with the game

### DOOM `i_sound.c` mixer volume law (`PCMMixer`)

- **Used in:** `js/audio/pcmMixer.js` (`PCMMixer.gainsOf`)
- **Origin:** the volume and stereo separation law of `addsfx` in the
  released DOOM source, `i_sound.c`
- **Author:** id Software
- **Source:** the DOOM source release (linuxdoom-1.10), https://github.com/id-Software/DOOM
- **Licence:** GPLv2 — the law is followed, the code is not copied

### MOS 6581 SID (`SID`)

- **Used in:** `js/audio/chip/sid.js`
- **Origin:** the register description of the 6581 (`$D400`-`$D418`), its
  waveforms, the ADSR rate counter with the measured rate table and the
  exponential decay steps, and a two-pole state variable filter with the
  6581 cutoff curve as a documented approximation
- **Author:** MOS Technology (Bob Yannes); the clock-exact envelope periods
  and the decay slowdowns as measured by Dag Lem for reSID
- **Source:** the attack times of the 6581 datasheet (2 ms … 8 s, the same
  table for decay and release ×3), http://www.zimmers.net/anonftp/pub/cbm/documents/chipdata/ ;
  the periods in chip clocks (`9, 32, 63 … 31251`) and the thresholds of the
  exponential decay (`0x5d, 0x36, 0x1a, 0x0e, 0x06`) are the values reSID's
  `envelope.cc` (GPL) publishes — taken as numbers about the chip, the code
  not copied (R-029)
- **Status:** documentation of the chip; the model is an own implementation
  and says what it does not model (the read-only registers, a measured
  filter curve)

## Hardware references

### Atari vector generators and math box (`AVG`, `DVG`, `MathBox`)

- **Used in:** `js/platform/vector/atari/avg.js`, `dvg.js`, `mathbox.js`
- **Origin:** Atari's own documents — `VGMC.MAC` (the AVG macros),
  `VECMAC.XX` (the DVG macros), `MBUDOC` (the math box registers) — and
  MAME's `avgdvg.cpp` (`dvg_device`: the rate multipliers and the clipping)
  and `mathbox.cpp` (the integer semantics of the math box, followed
  exactly)
- **Author:** Atari, Inc.; the MAME team
- **Source:** as cited in the headers; the projects' notes in
  `battlezone/sources/docs/disasm_notes.md` and
  `asteroids/sources/docs/disasm_notes.md`
- **Status:** read as documentation of the hardware; the interpreters are an
  own implementation

### ZX Spectrum 48K ROM routines (`ZXRomPrint`, `ZXRomDraw`)

- **Used in:** `js/platform/canvas2D/zx/zxRomPrint.js` (`RST $10`
  printing to the upper screen) and `zxRomDraw.js` (PIXEL-ADD `$22AA`,
  PLOT-SUB `$22E5`, PO-ATTR `$0BDB`, DRAW-LINE `$24BA`)
- **Origin:** the routines of the 48K ROM, reimplemented instruction for
  instruction; checked by `tools/checkzx.mjs` against the real ROM run in
  SkoolKit's simulator (`tools/retro/romdrawref.py`)
- **Author:** Sinclair Research (Steve Vickers, John Grant); the ROM's
  rights are held by Amstrad, which allows it to be distributed with
  emulators
- **Source:** the 48K ROM as shipped with SkoolKit (`sources/skoolkit/`)
- **Status:** behaviour reimplemented; no ROM bytes are carried

## Out of git: `sources/`

`sources/` holds what the library's offline tools need but the library does
not carry: whole machine ROMs and third-party tools. The directory is in
`.gitignore` and is **never committed** (R-041) — these are foreign binaries
with live rights, and svision is the one public repository of all the
projects. The library does not need them to run: what it draws in the
browser it carries in its JS.

The rule: **what the library carries in JS may also sit next to it as a
binary; whatever is more than that belongs in `sources/`, out of git.** The
Atari OS ROM is 16 KB and the character sets cut from it take 2 KB — the
other 14 KB are operating system code the library never uses.

ROMs an emulator traces with (KERNAL, BASIC, a whole OS for `atari800` or
VICE) do not belong here either: they are material of the game that is
traced and live in `<project>/sources/rom/` (R-041). The library holds the
tool (`tools/retro/fetchroms.py`), not the data.

In a fresh clone `tools/retro/fetchsources.py` fills `sources/`: it fetches
what can be fetched and says how to get the rest (`--list` shows the state,
`--verify` only checks).

### `sources/rom/atari-xl-os.rom`
- **What:** Atari XL/XE OS rev. 2 (10 May 1983, CO61598B), 16 384 bytes,
  CRC-32 `1f9cd270` — the ROM `fonts/atari-xl-charset*.bin`
  (`Atari8Fonts8x8`) were cut from
- **Source:** the RK-DVD collection, `System Roms/Atari OS XL.rom`
  (http://ftp.pigwa.net/stuff/collections/RK-DVD/); there is **no direct
  URL**, so it is put back with
  `tools/retro/fetchroms.py atari8 --import PATH --dest sources/rom`
- **Licence:** not freely licensed (Atari Interactive), for study of the
  machine (R-039)

### `sources/skoolkit/`
- **What:** SkoolKit 10.1 — the Z80 simulator, snapshots, `tap2sna` and the
  disassembler; the official wheel for Python 3.12 / manylinux x86_64,
  unpacked, with the wheel next to it
- **Used by:** `tools/retro/romdrawref.py` and the tools of `jetpac`,
  `lunarjetman`, `aticatac`, `thunderbirds` and `booty` through
  `app/svision/sources/skoolkit` (shared, R-008)
- **Author:** Richard Dymond — https://skoolkit.ca
- **Source:** PyPI; `fetchsources.py` fetches it and checks its sha256
  against PyPI's
- **Licence:** GPLv3 (a tool, not part of the library); it ships the
  Spectrum ROMs Amstrad allows to be distributed with emulators
