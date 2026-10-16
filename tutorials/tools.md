[tools/](https://github.com/mitrenga/svision/tree/main/tools) holds the
command-line utilities that surround svision. They fall into four groups: the
build/deploy tool, the asset converters that turn source material —
artwork, MIDI, font dumps — into files an svision application can consume,
the Node self-checks with the harness the offline tools of the games
stand on, and the shared offline tools in `tools/retro/`.

| Tool | Turns | Into | Needs |
|---|---|---|---|
| `svtool` | sources | bundle (and debug bundle) in `js/` | PHP, terser, es-check |
| `make-app-icons` | `app-icon.svg` | PNG icon set | `rsvg-convert` |
| `make-favicon` | `app-icon.svg` | `favicon.ico` | ImageMagick |
| `mid2score` | `.mid` | score module for the oscillator handler | PHP |
| `xml2score` | MusicXML | score module for the oscillator handler | PHP |
| `convert-bin-txt` | `0`/`1` text grid | `.ch8` font dump | `bc`, `xxd` |
| `make-data-fonts` | `.ch8` font dump | hex string for a font class | `basenc` (coreutils) |

All of them are run from the shell; the asset converters take file paths, so
they can be run from anywhere. `svtool` is the exception — it must be run from
the application root.

The third group runs under **Node** with no browser:

| Tool | What it checks or provides |
|---|---|
| `checkvector.mjs` | the vector platform: display list, markup, font, text and menu entities, the dialogs, the headless layout, the AVG/DVG interpreters and the math box |
| `checkscene.mjs` | the 3D platform: `Mat4`/`Vec3`/`Quat`, mesh generators, scene markup and projection, the headless layout |
| `checkzx.mjs` | the ZX Spectrum video memory and its ink plane, colours, the ROM font's glyph bytes, `ZXRomPrint` and `ZXRomDraw` (against the values of `retro/romdrawref.py`), the machine's sounds |
| `checkvga.mjs` | the VGA palette, video and text memory, PCM samples, the DOS boot model |
| `checkc64.mjs` | the C64 colours, screen codes, character ROM, `C64Charset`, text screen, sprite data, sprite collisions (`C64Collision`), the boot model |
| `checkatari8.mjs` | the Atari 8-bit colours, alphabets, OS character set, display list, ANTIC/GTIA, the boot model |
| `checkaudio.mjs` | the DOM-free audio models: POKEY, the SID 6581, the discrete building blocks, the engine's waveforms, the AdLib sound and IMF drivers, the GENMIDI bank, the MUS player and the PCM mixer's gains |
| `headlessApp.mjs` | `headlessVectorApp()` / `headlessSceneApp()` — a stand-in application to draw a model through the headless layouts and read `markup()` |
| `nodeEnv.mjs` | the browser globals the import headers need; imported first by every tool |
| `classicScript.cjs` | loads a worker's classic script (no `import`/`export`) into Node |
| `retro/png.mjs` | PNG encoder (indexed and RGBA) and decoder on `node:zlib`, shared by the projects' offline tools |
| `retro/scr2png.py` | ZX Spectrum `.scr` (6912 B) to PNG, no dependencies |
| `retro/pngread.py` | a minimal PNG reader, the counterpart of `scr2png` for comparing maps by machine |

The fourth group, `tools/retro/`, are the offline tools several projects
share (R-008). Besides the three above:

| Tool | What it does |
|---|---|
| `retro/dis6502.py` | a tracing 6502 disassembler over a 64 KB memory image, with the symbols of the Atari 8-bit or the C64 (`--machine`) |
| `retro/romdrawref.py` | runs the 48K ROM's PLOT and DRAW-LINE in SkoolKit's simulator and prints the values `checkzx.mjs` compares `ZXRomDraw` with |
| `retro/fetchroms.py` | machine ROMs for the tracing emulators, into a project's `sources/rom/`; downloads only with `--confirm` (R-041) |
| `retro/fetchsources.py` | fills svision's `sources/` (out of git) in a fresh clone: SkoolKit from PyPI, and says how to put back what has no URL |

```bash
node tools/checkvector.mjs        # one summary line
node tools/checkzx.mjs -v         # every check: what was expected, what came out
```

Every check is one line, the report has the shape of the `match*` tools —
the number of checks and the number of differences — and the **exit code is
the number of differences**, so a script can chain them.

## svtool

The build, deploy and verification tool. It is documented in the
[README](https://github.com/mitrenga/svision#command-line-tooling-svtool),
which lists every command and its prerequisites, plus the
`svtool-completion.bash` completion script.

## Application icons

Both icon scripts read **`app-icon.svg` in the current working directory** and
write next to it, so run them from the application's icon directory:

```bash
tools/make-app-icons    # app-icon-{192,256,512,1024,1980}x*.png
tools/make-favicon      # favicon.ico with 128/64/48/32/16 sub-images
```

`make-app-icons` uses `rsvg-convert` (librsvg); `make-favicon` uses ImageMagick's
`convert`. In `make-favicon` the `-background none -density 256x256` options
deliberately precede the input SVG — they are read settings, and moving them
after the input gives an opaque white background instead of transparency.

> Neither script takes arguments; both accept `-h`/`--help`, and both refuse to
> run with a usage note when there is no `app-icon.svg` in the current
> directory. Neither checks that the converter is installed — a missing
> `rsvg-convert` or `convert` surfaces only as the shell's own error message.

## Music: mid2score and xml2score

Both produce the same thing: a JavaScript **score module** for
{@link AudioOscillatorHandler}, with one score track per input track/part, each
playing a default piano descriptor meant to be tuned by hand afterwards. The
`ScoreName` argument is PascalCase and becomes the exported factory —
`GravityFalls` yields `createGravityFallsScore()`. Without an output path the
module goes to stdout; conversion statistics always go to stderr.

```bash
tools/mid2score <input.mid> <ScoreName> [output.js] [--snap] [--min-vol=0.3] [--min-dur=0.08]
tools/xml2score <input.musicxml> <ScoreName> [output.js]
```

**`mid2score`** parses Standard MIDI files (format 0/1, metrical division),
pairs note-on/off events into notes and converts MIDI ticks onto the score's
bar/tick grid (16 ticks per 4/4 bar, fractional ticks preserved so nothing is
quantized away). Its options clean up automatic audio transcriptions:

- `--snap` — round (MIDI note + pitch bend) to the nearest true semitone
  instead of emitting fractional hertz. Use when the recording is known to be
  at standard A440 and the bends are transcription artefacts.
- `--min-vol=X` — drop ghost notes quieter than X (0..1 velocity).
- `--min-dur=X` — drop ghost notes shorter than X beats.

**`xml2score`** consumes the cleaner notation-level format instead: quantized
pitches (step/alter/octave, no pitch-bend guesswork), explicit rests and tied
notes merged into one long note. Prefer it whenever MusicXML is available; fall
back to `mid2score` for MIDI-only or transcribed sources.

Whichever you use, record where the source composition came from — svision
projects credit every ported piece.

## Fonts: convert-bin-txt and make-data-fonts

Two halves of the ZX Spectrum 8x8 font pipeline. Both write their output next
to the input file, not into the current directory:

```bash
tools/convert-bin-txt fonts/my-font.bin.txt   # -> fonts/my-font.bin.txt.ch8
tools/make-data-fonts fonts/my-font.ch8       # -> fonts/my-font.ch8.hex.txt
```

`convert-bin-txt` assembles a binary font dump from a human-editable text grid
of `0`/`1` characters — this is how you draw a glyph by hand. `make-data-fonts`
dumps a `.ch8` binary as one uppercase hex string, which is the form a font
class wants.

See the [Fonts](https://mitrenga.github.io/svision/tutorial-fonts.html) tutorial for the file formats, the bundled
font catalogue and how the hex string reaches a font instance.
