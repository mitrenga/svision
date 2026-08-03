[tools/](https://github.com/mitrenga/svision/tree/main/tools) holds the
command-line utilities that surround svision. They fall into two groups: the
build/deploy tool, and the asset converters that turn source material —
artwork, MIDI, font dumps — into files an svision application can consume.

| Tool | Turns | Into | Needs |
|---|---|---|---|
| `svtool` | sources | bundle / import-from deploy in `js/` | PHP, terser, es-check |
| `make-app-icons` | `app-icon.svg` | PNG icon set | `rsvg-convert` |
| `make-favicon` | `app-icon.svg` | `favicon.ico` | ImageMagick |
| `mid2score` | `.mid` | score module for the oscillator handler | PHP |
| `xml2score` | MusicXML | score module for the oscillator handler | PHP |
| `convert-bin-txt` | `0`/`1` text grid | `.ch8` font dump | `bc`, `xxd` |
| `make-data-fonts` | `.ch8` font dump | hex string for a font class | `basenc` (coreutils) |

All of them are run from the shell; the asset converters take file paths, so
they can be run from anywhere. `svtool` is the exception — it must be run from
the application root.

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

> Neither script takes arguments or prints usage, and neither checks that
> `app-icon.svg` exists or that the converter is installed — a missing input
> surfaces only as the converter's own error message.

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

See the [Fonts](tutorial-fonts.html) tutorial for the file formats, the bundled
font catalogue and how the hex string reaches a font instance.
