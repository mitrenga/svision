# svision

[![API documentation](https://img.shields.io/badge/docs-API%20reference-blue)](https://mitrenga.github.io/svision/)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey)](LICENSE)

**svision** is a library and toolkit for building web-based graphics
applications, especially retro games. It gives you a small, dependency-free
runtime for drawing sprites and text, playing audio, handling unified input, and
shipping the result as an installable, offline-capable progressive web app — all
the way down from a single `index.php` entry point.

> References such as **R-029** point to the author's internal register of
> design decisions. They record why something is the way it is; nothing in
> them is needed to use the library.

## What you can build with it

- **Retro games and graphical apps** rendered on an HTML canvas, organised as a
  tree of entities driven by a simple model/event loop.
- **Pixel-perfect 2D sprites** with multiple frames and directions, mono or
  colored palettes, compact compression, and per-pixel collision detection.
- **Bitmap text** in several built-in fonts, including scrolling text.
- **Sound** through the Web Audio API, with automatic fallback across browser
  capabilities.
- **Unified input** from keyboard, mouse, gamepad and touch.
- **Installable PWAs**: a generated web app manifest and service worker give you
  an app icon, full-screen launch and offline caching out of the box.
- **A ZX Spectrum flavoured platform** with the authentic palette, fonts and
  helper screens (volume, controls, key remapping, reset, …).
- **Models of other machines** as platforms: VGA / MS-DOS, Commodore 64,
  Atari 8-bit, Super Nintendo, a text terminal on a serial line, the XY monitor of the vector arcades and a 3D scene rendered
  through WebGL2 — plus their sound chips (OPL2, POKEY, SID, discrete arcade
  boards) and DOM-free halves that run unchanged under Node.

## Architecture in a nutshell

An application is an `AbstractApp` that owns an `AbstractModel`. The model holds
a tree of entities (`AbstractEntity` and its subclasses). A **platform**
(`AbstractPlatform`) provides the rendering backend and creates a **layout**
(`AbstractLayout`) that maps the logical model grid onto the real device pixels.
Input and lifecycle events flow through the entity tree via a small
send-up / send-down / send-to-model event system.

A project's `app/main.js` only constructs its app and hands it to
**`bootstrapApp(app, options)`** (`js/appBootstrap.js`, R-002), which hooks
every window event up to the `InputEventsManager`, runs the
`requestAnimationFrame` loop, detects gamepads and touchscreens, blocks the
Safari gesture events, guards against accidental back navigation (the model
gets a `browserBack` event first; only an unhandled back asks about leaving)
and registers the service worker. `options.listeners` replaces a default
window listener (a game that needs `preventDefault()` on its own keys) and
`options.leaveConfirm` is the question asked before leaving.

## Platforms

| Platform | Status | Description |
|---|---|---|
| **canvas2D** | stable | The main 2D renderer. Draws entities onto an HTML `<canvas>`. |
| **canvas2D / dialogs** | stable | The dialogs of the canvas 2D games as generic classes (R-056): `DialogTheme` (neutral hex defaults; the fonts `labelFont`, `buttonFont`, `stepFont` by name in `app.fonts`), `DialogProperties` (window geometry, colours, nested dialogs; `platformDefaults` for a platform wrapper), `DialogEntity` (the window), `WaitForAudioEventEntity`, `VolumeEntity` and `VolumeControl` (the volume logic without drawing, shared with `VectorVolumeEntity`), `SettingsEntity` with its nested `RemapKeysEntity` and `SelectingGamepadEntity`, `PlayerNameEntity` with a plain on-screen keyboard that a wrapper replaces with its machine's. The contents lay themselves out from the entity's size and the fonts — nothing scales — with the slider as a `SliderEntity` (`canvas2D/sliderEntity.js`, drawn at any width, click and drag). The platform wrappers are thin: `zx/ZX*` (Manic Miner colours, 5×5 labels, `zxFonts8x8` steps, the Spectrum's keyboard, the 202×134 window as it was), `c64/C64DialogProperties` + `C64VolumeEntity` + `C64SettingsEntity` + `C64PlayerNameEntity` (the C64's own keyboard) and `atari8/Atari8DialogProperties` + `Atari8VolumeEntity` + `Atari8SettingsEntity` + `Atari8PlayerNameEntity` (the machine's 8×8 font, 3×3 key labels, a 288×176 window the game may override). |
| **canvas2D / zx** | stable | ZX Spectrum themed platform on top of canvas2D: authentic colours, 8×8 fonts and Spectrum-style helper entities. The ZX dialogs are **contents only** — no frame, no title of their own: `ZXDialogProperties`/`ZXDialogTheme`, `ZXDialogEntity`, `ZXVolumeEntity`, `ZXSettingsEntity`, `ZXRemapKeysEntity`, `ZXSelectingGamepadEntity`, `ZXPlayerNameEntity` (the Spectrum's keyboard) and `ZXWaitForAudioEventEntity` are thin wrappers over `canvas2D/dialogs` (R-056) that put the Manic Miner colours and `zxFonts8x8` over the neutral defaults. The contents send `'contentClosed'` up when they close (R-027/R-028). |
| **canvas2D / arcade** | stable | Fixed-size raster arcade monitor (e.g. 224×256 portrait) with integer pixel-perfect scaling, bezel and optional colour overlay; configured per game (`new ArcadePlatform({width, height, overlay, …})`). Used by the arcade remakes. |
| **canvas2D / adaptive** | stable | Layout that adapts the model grid to the available element size. |
| **canvas2D / vga** | in progress | VGA / MS-DOS platform (R-029): 256-colour palette, mode 13h video RAM, 80×25 text mode, DOS boot model, the 8×16 Uni-VGA font set, `VGAControls` (the control tables of the era's games built from one action list) and `VGALayout` — the 4:3 monitor with a 1.2 pixel aspect. `VGALayout`, `C64Layout`, `Atari8Layout`, `SNESLayout` and `TerminalLayout` all extend `AspectLayout` (`canvas2D/aspectLayout.js`): a whole horizontal ratio from 2x up and a fractional one between 1x and 2x (`fitRatio()`, which `TerminalLayout` overrides to whole numbers only), the rows stretched by `pixelAspect`. |
| **canvas2D / c64** | in progress | Commodore 64 platform (R-038): 40×25 text mode with screen codes and the character ROM, colour RAM plus one background register, a recolourable border, hardware sprites (hires/multicolour/expanded) on `SpriteEntity`, power-on/LOAD boot model. |
| **canvas2D / atari8** | in progress | Atari 8-bit platform (400/800/XL/XE, R-039): ANTIC display list over 64 KB of memory, GTIA colour registers with a computed PAL palette, text mode 2 and tile mode 4, players and missiles, the OS character sets, power-on/READY boot model. |
| **canvas2D / snes** | in progress | Super Nintendo platform (R-050): the PPU over its own VRAM, CGRAM and OAM (`SNESPPU`, no DOM, `paint32` line by line) in mode 1 with the sprites' limits per line (32 / 34, STAT77) and the master brightness changed inside the frame as data (`setLineWrites`), `SNESColor` (BGR555 and brightness converted as MesenCE does), `SNESTiles` (planar 2/4/8 bpp), `SNESPPUEntity`, `SNESPlatform` 256×224 in a black surround, `SNESLayout` (`AspectLayout`, 8:7), `SNESJoypad`; no boot model (the console has no BIOS). What the first game does not use — HDMA, windows, colour math, mode 7 — is counted, not drawn. Demo: `snesdemo`, check: `tools/checksnes.mjs`; measured against the emulator by `super-r-type/tools/matchscreen.mjs`. |
| **canvas2D / terminal** | in progress | Text terminal on a serial line (R-061): the game sends bytes and the terminal's firmware draws them. `TerminalFont` (glyph data, glyph and cell size from the application; also a library font for `TextEntity` and dialogs; `fromGlyphSource()` builds one from `VGAFonts8x16`), `TerminalCharset` (byte + shift, e.g. SO/SI, -> glyph, and Unicode <-> bytes), `TerminalScreen` (grid of glyphs, cursor, optional status line, no DOM, `snapshot()` and `paint32`), `TerminalVT52` (the firmware as a state machine with the application's profile of sequences; what the profile lacks is counted, not drawn; BEL is the `onBell` event, the platform has no sound), `TerminalLine` (the speed of the line, optional), `TerminalScreenEntity`, `TerminalPlatform` and `TerminalLayout` (`AspectLayout`), `TerminalKeyboard` (keys -> bytes for the host). Columns, rows, font and charset all come from the application; first consumer `tetris` (15IE-00-013). Check: `tools/checkterminal.mjs`. |
| **vector** | in progress | The XY monitor as a platform (R-031), `js/platform/vector/`: `VectorPlatform` (a `<div>` with one `<svg>`, desktop in model units, an optional cabinet `overlay`), `VectorLayout` (retained SVG nodes, `viewBox` fit), `VectorDisplayList` (the DOM-free list of primitives with `markup()`, `toSVG()`, `differences()`), `VectorEntity`, `VectorFont` and `VectorTextEntity` (glyphs as polylines), `VectorMenuEntity`, the dialogs `VectorNoticeEntity`, `VectorNameEntity`, `VectorHallOfFameEntity`, `VectorVolumeEntity` and the `VectorDevModeEntity` banner, `VectorHeadlessLayout` for tools, and in `vector/atari/` the interpreters of the Atari vector generators `AVG` and `DVG` plus the `MathBox`. Demo: `vectordemo`, check: `tools/checkvector.mjs`. |
| **scene3D** | in progress | The 3D scene as data, DOM- and GL-free (R-032): `Mat4`, `Vec3`, `Quat` (quaternions: Euler orders, `lerp`/`slerp`, `lookRotation`), `Mesh` (generators, JSON), `Scene3D` (items, camera, lights, fog through `setFog()`/`fogSettings()`, `markup()`, `differences()`, `project()` into a display list), `SceneEntity`, `Scene3DHeadlessLayout` — the headless layout of the WebGL2 platform, for tools. Item styles include `pattern: {checker, size}` (a checker over the fill, a texture without an image) and `blend: 'add'` (additive, drawn without writing depth). |
| **webGL2** | in progress | The renderer of `scene3D` (R-032): a WebGL2 canvas with a canvas 2D overlay as `stack.ctx`, so text, sprites, menus and dialogs of canvas2D work unchanged over the 3D picture. One primitive, `render(scene, view, projection, viewport)`. `GLPrograms` owns the GPU buffers, the two shader programs (`mesh`, `line`) and the cache of a vertex array per mesh (`entry(mesh)`, remade when the mesh's `version` moves). Demo: `webgl2demo`, check: `tools/checkscene.mjs`. |

> The **scene3D** + **webGL2** pair is phase 0 of the 3D platform: flat
> shading, one directional and one ambient light, no textures yet. WebXR and
> WebGPU are planned as a session layer and a second renderer over the same
> scene.

## Building blocks

### Sprites
- **`SpriteTool`** — encodes/decodes sprite data in several compression formats
  (`hR2`, `lP1`, `lT2` for monochrome; `b90`, `braille` for colored), handles
  palette serialization and grid transforms, and computes the per-frame "blank
  margins" used for pixel-perfect collision detection.
- **`RasterEntity`** (canvas2D) — an entity whose picture is **pixels, not
  shapes**: it owns an `ImageData` in its own logical resolution, the game
  fills it in `paintRaster(data)` and calls `invalidate()` when it changes,
  and the entity blits it scaled by the layout ratio. It is the base of
  `SpriteEntity`, `TextEntity` and `SlidingTextEntity`.
- **`SpriteEntity`** — draws a sprite with frames/directions, mono (`penChar`)
  or palette-based colours, with caching; `setTints()` lights parts of it in
  another colour for one frame.

### ZX Spectrum video memory
- **`ZXVideoRAM`** (canvas2D / zx) is the **model of the machine's
  screen**, not of any game: the 6912 bytes of `$4000-$5AFF`, the ULA's
  interleaved line addressing (`lineOffset`, `addressOf`,
  `attributeAddressOf`), `peek`/`poke` with the write operation the original
  used (`'none'`, `'xor'`, `'and'`, `'or'`), and the turning of bytes plus
  attributes into RGBA — all of it, or a rectangle of character cells
  (`paint`), with an optional attribute mask for games that keep something of
  their own in a spare attribute bit. `setLinear()`/`toLinear()` convert to and
  from the flat bitmap/attribute pair some games pass around, and
  `paintLinear()` paints such a pair directly. It touches no DOM, so the same
  code renders in the browser and in an offline `match*` tool under Node.
  Optionally it also keeps an **ink plane** (`enableInkPlane`, `setPen`): a
  byte per pixel saying which ink lit it, filled by the very same writes that
  fill the bitmap, so a remake can paint **without attribute clash** while its
  video memory stays byte for byte the original's. Off by default and free
  when off — see the [ink plane tutorial](https://mitrenga.github.io/svision/tutorial-inkplane.html).
- **`ZXVideoRAMEntity`** puts that memory on the screen: it owns the drawing
  cache, watches the FLASH phase and paints once per game frame rather than
  once per display frame. A game either writes into `videoRAM` and calls
  `invalidate()`, or overrides `compose()` to build the screen lazily.
  Sabre Wulf's play area is one of these.

### Text & fonts
- **`TextEntity`** and **`SlidingTextEntity`** (scrolling text).
- **`AbstractFonts`** plus built-in bitmap fonts: `Fonts3x3`, `Fonts5x5`,
  the ZX `ZXFonts8x8`, `VGAFonts8x16`, `C64Fonts8x8` (the character ROM
  901225-01, two sets of 256 glyphs by screen code) and `Atari8Fonts8x8`
  (the XL OS ROM's standard and international sets by internal code).
- A font handed to a text memory — `VGATextRAM` (`glyphBytes(codePoint)`),
  `C64TextRAM` (`glyphBytes(code, set)`) — must provide `glyphBytes()`: the
  raw row bytes of a glyph, the way a character generator reads its ROM;
  `ZXFonts8x8.glyphBytes(char)` feeds `ZXVideoRAM.pokeCell()` the same way.
  `Atari8Screen` takes a whole 1 KB set instead (`Atari8Fonts8x8.setBytes()`),
  as ANTIC reads it from CHBASE; `C64Fonts8x8.setBytes(set)` gives a whole
  2 KB C64 set the same way, and `C64Charset` is a game's own character set
  for `C64TextRAM`. See the [fonts tutorial](https://mitrenga.github.io/svision/tutorial-fonts.html).
- Core fonts ship printable ASCII plus one normal (breaking) space — no
  application-specific graphics. Spaces are data-driven: each font holds a
  `spaces` table of `{width, breaking, stretch}` entries that drive word
  wrapping and justified fill. An app registers any extra graphic glyphs and
  hard/short spaces it needs with `addGlyphs()` and `addSpace()`, choosing the
  marker characters itself (the same character can be a blank space in one font
  and a real glyph in another).
- **Localization** — `AbstractApp` holds a per-language string dictionary
  installed with `setTexts({en: {...}, cs: {...}})`. `text(key, params)`
  resolves a dotted-path key (`'mainMenu.startGame'`) in the current
  `language`, falls back to `fallbackLanguage` (default `en`), substitutes
  optional `{placeholder}` tokens from `params`, and renders missing strings
  as a visible `⟨key⟩` marker.

### Audio
- **`AbstractAudioManager`** owns a single shared `AudioContext` and organises
  playback into named **buses** (e.g. `music`, `sounds`, `extra`) that mix
  together on that one context. It dispatches each bus to the best
  available handler: **`AudioWorkletHandler`** (modern),
  **`AudioScriptProcessorHandler`** (fallback), **`AudioOscillatorHandler`**,
  **`AudioSampleHandler`** (a PCM bus), **`AudioChipHandler`** (a sound chip
  driven by register writes, see below) and **`AudioSilentHandler`**.
- Manager calls added for the sample and instrument buses:
  `loadSample(url, done)` fetches and decodes a sound file into a
  `PCMSample` (`done(sample|null)`); `rateBus(bus, rate)` sets the playback
  rate of a sample bus (1 = the sample's own speed); `fadeBus(bus, seconds)`
  fades a bus out and stops it (a bus that cannot fade stops at once);
  `controlSound(bus, instrument, control, value)` is a live control of an
  instrument playing on a bus, straight to the handler without an event;
  `busIsPlaying(bus)` tells whether a bus is playing something. On the
  handler side `AbstractAudioHandler.controlInstrument(name, control, value)`
  and `isPlaying()` back them (no-ops in the base class); an
  `AbstractInstrument` answers `control('volume', value)` by moving its own
  gain, whose starting value is the descriptor's `level` field (1 by default).
- **`AudioSampleHandler`** plays **`PCMSample`**s the way a Sound Blaster
  played them: one sound at a time out of a DAC (`overlap` lets them mix),
  with `repeat`, `nextSound`, `volume`, `rate` and timed `events`; pausing
  holds the sounds at a playback rate of 0, `setRate()` moves everything
  playing. `PCMSample` is DOM-free: unsigned/signed 8-bit, 16-bit and WAV
  in and out, or a decoded `AudioBuffer` from `loadSample()`.
- **`PCMMixer`** is a DOM-free software mixer of `PCMSample`s — so many
  channels, each at its own rate with a left and right volume, summed into
  stereo, the way DMX mixed DOOM's effects; `PCMMixer.gainsOf()` is DOOM's
  volume and separation law turned into two gains.
- **`MidiFile`** parses a standard MIDI file into a list of events with
  absolute ticks (no player); the drivers in **`audio/chip/`** turn such
  data into samples with no DOM at all: **`OPL2`** (the YM3812 of the AdLib
  card, written through its registers) with the drivers **`AdlibMidi`**
  (a MIDI file over an instrument bank), **`AdlibSound`** (the id/Apogee
  `AUDIOT` sound effects), **`AdlibIMF`** (IMF register recordings) and
  **`AdlibMUS`** (DOOM's MUS music the way the DMX driver played it) over a
  **`GenMidi`** bank (the `GENMIDI` lump of the DMX games);
  **`POKEY`** (the four channels of the Atari chip, with the joined 16-bit
  dividers and the 1.79 MHz clocking of `AUDCTL`); **`SID`** (the MOS 6581
  of the Commodore 64: three voices, ADSR, the filter and the master volume
  that digitised speech is written to); and the **discrete**
  building blocks of the arcade sound boards (`LFSRNoise`, `Clock`,
  `Lowpass`, `Highpass`, `GatedRC`, `SwitchedGainLowpass`, `LadderDAC`,
  `CC555`, `TriangleWave`, `SquareWave`, `FixedSquare`, `SampleHold`, `Ramp`,
  `RCDischarge`, `Filter1`, `Filter2`).
- **`EngineInstrument`** is the live instrument of the discrete boards — a
  555 clocking two counters, the rumble of a tank — driven from the game
  with `control('rev', 0|1)`.
- Handlers **borrow** the shared context from the manager to build their nodes;
  the manager alone creates and discards the context.
- **`AudioOscillatorHandler`** plays a score (tempo, volume, instruments,
  bars) through a look-ahead scheduler. `playSound` options: `repeat` (true
  loops forever, a number is the total play count) and `preroll`, the
  seconds from now to the first bar (0.1 by default; a short one for a sound
  retriggered faster than that, such as a key click or a terminal's bell).
- **`AudioSilentHandler`** needs no context: it produces no sound but still
  walks the sound data to fire timed events, so game logic keeps running on
  devices with no audio support or when everything is muted.
- **Stereo**: a bus can be opened with several output **channels** (`channelCount`,
  capped to the hardware maximum, mono fallback). Each played sound may carry
  per-channel volume multipliers (`channelVolumes`, e.g. `[1, 0]` for left-only)
  to place it in the stereo field — used in JSW to pan arrow shots left/right.
- **`audioProcessor`** is the AudioWorklet processor that generates the samples.
- **`ChipStream`** (`audio/chip/`) is a chip driven by **timed register
  writes**: a game's worker reports, frame by frame, what the original wrote
  into the chip and on which scanline (`[[line, register, value], …]`), the
  stream places every write on its own sample clock and hands it to the chip
  while rendering, re-anchoring only when the frames fall behind or run away.
  **`ChipProcessor`** (`audio/worker/`) is the AudioWorklet around it and
  **`AudioChipHandler`** the bus handler that composes the worklet from the
  chip's file, `chipStream.js` and `chipProcessor.js` (the bundle
  transformation, so the chip stays single-sourced for the browser and
  Node), forwards the frames (`AbstractAudioManager.writeChip(bus, {frame,
  writes})`) and plays a script of frames as a `playSound` (the sample of a
  volume dialog; `repeat` true or a count makes the script go round without
  a gap — R-Type's title tune — and a new script replaces the one playing).
  The bus closes with a short `fadeOut` of its gain (the manager keeps the
  AudioContext open that long), and the SID model swallows the step of the
  first volume write after a silence, so the chip's DC neither thumps on nor
  clicks off. POKEY (Boulder Dash) and SID (Impossible Mission, R-Type) run
  on it.
- **`ZXMachineSounds`** (canvas2D / zx) holds the sounds of the
  **machine** rather than of any game: the pulse format of the tape
  (`tapePilotTone`, `tapeRndData`, `tapeData`) and the ROM's key click and
  rising scale (`keyClick`, `basicBeeps`). Every ZX remake shares them, so
  none of them writes its own. `tapeBlock` plays a whole tape block in its
  own timing — pilot pulse count, sync, bit lengths — with events at the
  end of the pilot, after every byte and at the end of the block, for tapes
  with turbo blocks (Booty).
- **`ZXRomPrint`** (canvas2D / zx) is the ROM's printing to the
  upper screen (`RST $10`) into a `ZXVideoRAM`: characters 32-127 of the
  ROM font and the control codes INK, PAPER, FLASH, BRIGHT, INVERSE, OVER,
  AT and CR, a stream ending at `$FF` the way games end theirs. What it
  does not do (INK 8/9, TAB, block graphics, UDGs, scrolling) it refuses
  rather than prints differently; checked by `tools/checkzx.mjs`.
- **`ZXRomDraw`** (canvas2D / zx) is the ROM's plotting and line
  drawing — PIXEL-ADD `$22AA`, PLOT-SUB `$22E5`, PO-ATTR `$0BDB` and
  DRAW-LINE `$24BA` — instruction for instruction on a game's memory
  (`{rd, wr}`), with COORDS, ATTR-T, MASK-T and P-FLAG (OVER, INVERSE,
  INK 9, PAPER 9) where the ROM keeps them (Thunderbirds draws its spiders'
  threads with it). A **classic script** (R-048), because the game logic that
  calls it runs in the worker; it declares nothing at the top level but the
  class (the system variables are `ZXRomDraw.ATTR_T` …), since a worker's
  classic scripts share one global scope. Checked by `tools/checkzx.mjs`
  against the real ROM run in SkoolKit (`tools/retro/romdrawref.py`).

### Input
**`InputEventsManager`** unifies every input source into a single event stream
delivered to the model:

- **Keyboard** — key capture with autorepeat awareness.
- **Mouse** — full support for up to 8 buttons, hover tracking, wheel scrolling
  and drag-and-drop. Mouse buttons are bindable keys, so they can be mapped to
  extra actions.
- **Gamepad** — compatible gamepads with button and axis support, including a
  configuration mode for remapping the controls. The app's `controls`
  object carries `gamepads` (formerly `gamepad`): `gamepads.supported`
  says whether the browser exposes the Gamepad API and `gamepads.devices`
  is a map of the configured pads keyed by gamepad id; `touchscreen.type`
  is the chosen layout of the touch controls (a key of the game's
  `touchscreen.types`, kept in a cookie).
- **Touch** — multi-touch press handling and gestures, plus the groundwork for
  an on-screen software joystick for controlling games on touch displays.
  The page has `touch-action: none` (`css/main.css`), so the browser makes no
  gestures of its own (edge swipe back, pinch zoom); the app handles every
  touch, including scrolling in `ScrollViewEntity`.

### UI entities
- **`ButtonEntity`**, **`MenuEntity`**, **`InputEntity`**, **`KeyboardEntity`**
  for simple in-canvas interfaces.
- **`ScrollViewEntity`** — a clipping, pixel-scrolling viewport for any entity
  type. Panning via mouse wheel, mouse/touch drag and keyboard, with thin
  overlay scrollbars and an optional `followBottom` tail-follow mode; nested
  buttons and links stay clickable while scrolled.

### Display styles
The canvas2D layout offers three looks. The default **sharp** style renders
sharp, integer-scaled pixel edges (image smoothing off). The experimental
**crt** style imitates an old CRT monitor: image smoothing stays on for soft
edges, and a non-interactive overlay adds scanlines aligned to the logical
pixel grid (plus a vertical grid at high scale ratios), a vignette, rounded
corners and a slight contrast/saturation boost. **grid** is `crt` without
the color boost, for devices whose browsers cannot composite a CSS filter over
the canvas (some smart TVs render the whole layer black). The style is read
from the `displayStyle` cookie (`sharp` / `grid` / `crt` / `retro`); a missing
or invalid cookie falls back to **sharp**. The **retro** value resolves to
`crt`, or to `grid` on smart-TV browsers; `crt` and `grid` are honored as-is.
Tuning constants live in the `crtStyle` field of `Canvas2DLayout`.

### Utilities
- **`Tool`** — number-base conversions (hex / base-36 / base-90 / Braille),
  cookies and small helpers. `Tool.loadDataFile(key, prefix)` reads a
  `data/` file the PHP side put into `localStorage` as `<appPrefix>.<key>`
  and parses it (null when missing); `AbstractModel.loadDataFile(key)` is
  the same call from a model, the way models read their rooms, sprites and
  sounds synchronously in `init()`.
- **`ModuleWorker`** (`js/moduleWorker.js`) builds a web worker at run time
  out of ES modules of the application: `ModuleWorker.create(app, sources)`
  fetches the listed files, strips their import headers and `export`
  keywords the way `svtool build` does, glues them into one classic script
  and starts a worker from a blob of it; the last source is the worker
  program. The sources must be reachable by URL, so they belong in the
  `standalone` list of `config/compile.json`.

### Server side (PHP)
A tiny PHP front controller (`php/`) serves the app shell, generates the PWA
manifest and the service worker (with an auto-collected asset list for offline
caching), provides `*.data` / `*.db` JSON endpoints, and auto-detects which ES
module import method the browser supports.

## Runtime, compatibility & dev mode

- **Progressive Web App.** Every app is installable: the server generates the
  web app manifest and a service worker whose pre-cache asset list is collected
  automatically (the scripts on the active import path, the CSS, the
  `images/`, and the `assets/` a game fetches on demand — `.json`, `.m4a`,
  `.ogg`, `.mp3`), so you get an app icon and full-screen launch.
- **Offline mode (production).** Service worker support is built in and active in
  the **production** build: the generated service worker pre-caches the app
  assets and serves them from cache with a network fallback, so released
  versions keep working offline. Plain dev mode serves the unbundled sources and
  does not cache, but you can opt the service worker into dev mode to test
  offline on the dev server — see [Dev mode and the service worker](#dev-mode-and-the-service-worker).
- **Broad browser compatibility.** The runtime targets **ECMAScript 2018
  (ES9)** as its baseline, so it runs on a wide range of older browsers and
  devices, not just the latest ones.
- **Sources in development, one bundle in production.** Every source declares
  its dependencies in a short header of `await import(...)` lines, so in
  development the modules load one by one and can be stepped through in the
  debugger, file by file and line by line. Production serves a single minified
  bundle built from the same sources — and because the bundle carries no
  `import` at all, it also runs on engines with no support for dynamic import
  (older smart TVs), which is what `svtool build debug-bundle` is for when such
  a device has to be debugged without a console.
- **The `/config` page.** All of the above — the detected ECMAScript version,
  class-syntax and dynamic-import support, which runtime is being served, the
  service worker status (with buttons to unregister it, clear its cache, or
  disable/enable it) and the current cookies — can be inspected from the
  built-in diagnostics page at `https://<project-name>/config`.

### Dev mode and the service worker

Two settings in your project's `config/config.php` drive development behaviour:

- **`$devMode`** selects how the app runs and whether the service worker is on:
  - `$devMode = false;` (or unset) — **production**: the app loads the single
    minified bundle and the service worker is **active** (offline caching on).
  - `$devMode = true;` — **development**: the app loads the unbundled sources for
    step-through debugging, asset URLs are cache-busted on every request, and the
    service worker is **disabled**.
  - `$devMode = ['serviceWorker' => true];` — **development with the service
    worker enabled**, so you can test offline behaviour on the dev server. The
    app still behaves as dev mode in every other respect, but the worker is
    registered and asset versions become **stable** (read from `app/version.js`)
    so the cache holds until you bump the version. Using an array also keeps the
    door open for further per-feature dev switches in the future.
  - **Developer parameters** (`Tool.devParam(name, default)`): a knob the
    game reads from the address, `?devLevel=2`, or from the array,
    `$devMode = ['level' => 2]`; the address wins. The name must start with
    `dev`, and outside dev mode the address is never read, so a player on a
    production server cannot reach the knob. The games use `devLevel`,
    `devSeed` (a pinned seed makes a run repeatable) and `devImmortal`.
- **`$devModeName`** is an optional dev-mode banner text. The server
  (`php/appPage.php`, `devModeName()`) now composes the banner itself and
  exposes it to the client as `window.devModeName`:
  - no `$devMode` → no banner (`false`);
  - a configured `$devModeName` → used verbatim;
  - otherwise, when the `app/` sources are served, a yellow
    `◢◤ ◢◤ ◢◤ ◢◤  DEVELOPER MODE ◢◤ ◢◤ ◢◤ ◢◤` block, and when a
    `js/bundle.<version>` is served, a red `>>>>  bundle.<version>.js  <<<<`
    banner naming the bundle.

  The emitted text starts with an escaped JSON style block
  `{penColor, bkColor}` (the inner quotes are escaped because the value ends
  up embedded into a JavaScript string). **What to do with it is up to the
  application**: the ZX games draw it in the border, the vector platform's
  `VectorDevModeEntity` at the bottom of the screen. A configured value in
  the same shape:

  ```php
  $devModeName = '.{\"penColor\":\"#000000\",\"bkColor\":\"#fefe00\",\"width\":185} DEVELOPER MODE ';
  ```

**How the service worker works.** The server generates the worker from the
`serviceWorker.js` template, injecting the application version (used as the cache
name) and an auto-collected asset list. The pre-cache list follows the active
import path, so it caches the `js/` files when a bundle is served and the `app/`
sources when the app runs from its sources — the cache always matches what the
app actually loads. Besides the scripts it lists the CSS, the `images/` and
the static `assets/` (`.json`, `.m4a`, `.ogg`, `.mp3` — the meshes, tracks
and music a game fetches on demand; `data/` stays dynamic). On **install** it pre-caches every listed asset; on
**activate** it deletes stale version caches; on **fetch** it serves same-origin
GET requests cache-first, adding any successful network response to the cache
(runtime caching), while passing dynamic data endpoints (`*.data` / `*.db` /
`*.post`, and anything under `/data/`) straight through. Because the cache name carries the version, a new app version creates a
fresh cache and old ones are pruned, so updates roll over cleanly.

**Inspecting and disabling the service worker.** The `/config` page lists the
registered service workers and whether one controls the page, with a button to
unregister them and clear the cache. A **Disable** button sets a
`disableServiceWorker` cookie (and clears the current worker); while that cookie
is set the app never registers a service worker — handy on a browser where a
stale or misbehaving worker has to be turned off without dev tools. **Enable**
removes the cookie.

**Testing offline on the dev server.**

1. Set `$devMode = ['serviceWorker' => true];` in `config/config.php`.
2. Build a bundle (`svtool build bundle`) if you want the deploy layout
   production actually uses; without one the sources under `app/` are served.
3. Reload once so the worker installs and takes control (it becomes the
   controller from the *second* load on).
4. Switch your browser DevTools to **Offline** and reload again.

> Firefox tip: test with **Offline** alone. Combining it with *Disable cache*
> transiently empties the Cache Storage view in the inspector — that is a
> DevTools artefact, not a caching problem; the entries reappear once *Disable
> cache* is turned off.

## Command-line tooling (`svtool`)

`tools/svtool` is a PHP command-line utility for the manual build, deploy and
verification operations on an svision app. It is run from the application root
(the same place the PHP pages run from):

| Command | What it does |
|---|---|
| `svtool version` | Print the current application version (from `app/version.js`). |
| `svtool info [count]` | Show the state of the `js/` directory (the bundle and the standalone files) and, if configured, the most recent database records (default 10). |
| `svtool build [target]` | Build a deploy variant from `config/compile.json`. `target` is **`bundle`** (a minified `js/bundle.<version>.min.js`, the default) or **`debug-bundle`** (the same concatenation left unminified, as `js/bundle.<version>.js`, for debugging on a device whose console cannot be opened). |
| `svtool verify` | Check `js/`: the bundle exists and matches the current sources, the standalone files are present and valid, there are no unexpected files, and the served JavaScript stays within **ES2018** (via `es-check` if installed, otherwise a heuristic scan). It also reports the source lists themselves and fails on a missing source or an import cycle. |
| `svtool clean` | Remove every generated file from the `js/` directory. |
| `svtool help` | Show usage. |

A bash completion script is provided in `tools/svtool-completion.bash`.

### Checks and harness

Next to `svtool` the `tools/` directory holds the Node self-checks of the
DOM-free halves of the platforms: `tools/checkvector.mjs`,
`checkscene.mjs`, `checkzx.mjs`, `checkvga.mjs`, `checkc64.mjs`,
`checkatari8.mjs`, `checksnes.mjs`, `checkterminal.mjs` and `checkaudio.mjs`. Usage is `node tools/checkX.mjs [-v]`;
every check is one line (what was expected, what came out), the report has
the shape of the `match*` tools — the number of checks and the number of
differences — and the **exit code is the number of differences**. They stand
on `tools/nodeEnv.mjs` (the browser globals the import headers need, imported
first) and `tools/headlessApp.mjs` (`headlessVectorApp()` and
`headlessSceneApp()`, a stand-in application that draws a model through the
headless layouts and reads `markup()`); `tools/classicScript.cjs` loads a
worker's classic script (no `import`/`export`) into Node. `tools/retro/`
keeps what the offline tools of several projects share: `png.mjs` (indexed
and RGBA PNG encoder and decoder on `node:zlib`), `scr2png.py` (ZX Spectrum
`.scr` to PNG), `pngread.py` (a minimal PNG reader for comparing maps by
machine), `dis6502.py` (a tracing 6502 disassembler over a memory image,
with Atari 8-bit and C64 symbols), `disPDP11.py` (a tracing PDP-11
disassembler over an RT-11 `.SAV` image, octal MACRO-11 listing with RT-11
programmed requests, inline call arguments and jump tables from hints, and a
cross-check of every instruction against SIMH), `romdrawref.py` (the reference values of
`ZXRomDraw` from the real ROM), `fetchroms.py` (machine ROMs for the tracing
emulators, into a project's `sources/rom/`) and `fetchsources.py`.
What those tools need but the library does not carry — whole machine ROMs,
SkoolKit — lives in `sources/`, which is out of git (R-041);
`tools/retro/fetchsources.py` fills it in a fresh clone.

### What goes into the bundle

Nothing lists it. Every source declares its dependencies in its header, as
`await import('./x.js?ver='+window.srcVersion)` lines above the
`// begin code` marker, so `svtool` walks that graph from **`app/main.js`** and
gets both the file set and a dependency-first order — a class is only ever
concatenated behind the class it extends. Adding a module to an application
means importing it; there is no list to keep in step.

That is also why the entry point is fixed: in development the app shell loads
`app/main.js` and nothing else, and every other module arrives through those
headers. A file the entry point cannot reach would exist in the bundle and not
in development, so it simply does not go in.

The one thing the sources cannot say is which files are fetched by their own
URL — a worker, a script it pulls in with `importScripts`, an audio worklet.
Nothing imports those, so they are named by hand and copied into `js/`
verbatim, never inlined:

```json
{
    "standalone": [
        "gameWorker.js",
        "svision/js/audio/worker/audioProcessor.js"
    ]
}
```

That is the whole of `config/compile.json`.

### Prerequisites

`svtool` itself runs under **PHP** (CLI) — that alone is enough for `version`,
`info`, `clean` and `help`. Some commands need extra tools:

- **`build`** requires **terser** — the bundle is minified through it.
- **`verify`** uses **es-check** for the authoritative ES2018 check; without it
  it falls back to a heuristic source scan.
- **`info`**'s database listing needs the PHP **`mysqli`** extension (optional —
  skipped with a notice when it is absent).

`terser` and `es-check` are declared as dev dependencies, so a one-time
`npm install` (which also needs **Node.js**) makes them available to `svtool`
under `node_modules/.bin`. Alternatively install them globally with
`npm i -g terser es-check`.

## Examples

Full, working projects built with svision:

| Project | What it is | Repository |
|---|---|---|
| **Hello World** | The smallest possible svision app — start here. | https://github.com/mitrenga/helloworld |
| **Manic Miner** | A complete remake of the classic ZX Spectrum game. | https://github.com/mitrenga/manicminer |
| **Jet Set Willy** | A complete remake of the classic ZX Spectrum game. | https://github.com/mitrenga/jetsetwilly |
| **Booty** | A remake of the ZX Spectrum game, its rules measured against the original. | https://github.com/mitrenga/booty |
| **R-Type** | A remake of the Commodore 64 conversion, on the C64 platform with the SID. | https://github.com/mitrenga/r-type |

## Documentation

The full API reference is generated from the JSDoc comments in the source and
published via GitHub Pages:

**https://mitrenga.github.io/svision/**

It is rebuilt automatically by a GitHub Actions workflow on every push to `main`.

### Building the docs locally

```bash
npm install
npm run docs   # generates the HTML reference into ./docs
```

## License

svision is released under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](LICENSE) license.
