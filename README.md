# svision

[![API documentation](https://img.shields.io/badge/docs-API%20reference-blue)](https://mitrenga.github.io/svision/)
[![License: GPL v3](https://img.shields.io/badge/license-GPL--3.0-green)](LICENSE)

**svision** is a library and toolkit for building web-based graphics
applications, especially retro games. It gives you a small, dependency-free
runtime for drawing sprites and text, playing audio, handling unified input, and
shipping the result as an installable, offline-capable progressive web app — all
the way down from a single `index.php` entry point.

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

## Architecture in a nutshell

An application is an `AbstractApp` that owns an `AbstractModel`. The model holds
a tree of entities (`AbstractEntity` and its subclasses). A **platform**
(`AbstractPlatform`) provides the rendering backend and creates a **layout**
(`AbstractLayout`) that maps the logical model grid onto the real device pixels.
Input and lifecycle events flow through the entity tree via a small
send-up / send-down / send-to-model event system.

## Platforms

| Platform | Status | Description |
|---|---|---|
| **canvas2D** | stable | The main 2D renderer. Draws entities onto an HTML `<canvas>`. |
| **canvas2D / zxSpectrum** | stable | ZX Spectrum themed platform on top of canvas2D: authentic colours, 8×8 fonts and Spectrum-style helper entities. |
| **canvas2D / adaptive** | stable | Layout that adapts the model grid to the available element size. |
| **canvas2D / ibm** | stable | IBM 8×16 font set. |
| **html** | ⚠️ experimental | Renders entities as positioned DOM elements. Early, testing-only — not for deployment. |
| **webGL2** | ⚠️ experimental | Renders through a WebGL2 context. Early, testing-only — not for deployment. |

> The **html** and **webGL2** platforms are very early work in progress, kept for
> experimentation only. They are not usable for normal deployment and will be
> moved to a separate branch in the future.

## Building blocks

### Sprites
- **`SpriteTool`** — encodes/decodes sprite data in several compression formats
  (`hR2`, `lP1`, `lT2` for monochrome; `b90`, `braille` for colored), handles
  palette serialization and grid transforms, and computes the per-frame "blank
  margins" used for pixel-perfect collision detection.
- **`SpriteEntity`** — draws a sprite with frames/directions, mono (`penChar`)
  or palette-based colours, with caching.

### Text & fonts
- **`TextEntity`** and **`SlidingTextEntity`** (scrolling text).
- **`AbstractFonts`** plus built-in bitmap fonts: `Fonts3x3`, `Fonts5x5`,
  the ZX `ZXFonts8x8` and `IBMFonts8x16`.

### Audio
- **`AbstractAudioManager`** owns a single shared `AudioContext` and organises
  playback into named **buses** (e.g. `music`, `sounds`, `extra`) that mix
  together on that one context. It dispatches each bus to the best
  available handler: **`AudioWorkletHandler`** (modern),
  **`AudioScriptProcessorHandler`** (fallback), **`AudioOscillatorHandler`**,
  and **`AudioSilentHandler`**.
- Handlers **borrow** the shared context from the manager to build their nodes;
  the manager alone creates and discards the context.
- **`AudioSilentHandler`** needs no context: it produces no sound but still
  walks the sound data to fire timed events, so game logic keeps running on
  devices with no audio support or when everything is muted.
- **`audioProcessor`** is the AudioWorklet processor that generates the samples.

### Input
**`InputEventsManager`** unifies every input source into a single event stream
delivered to the model:

- **Keyboard** — key capture with autorepeat awareness.
- **Mouse** — full support for up to 8 buttons, hover tracking, wheel scrolling
  and drag-and-drop. Mouse buttons are bindable keys, so they can be mapped to
  extra actions.
- **Gamepad** — compatible gamepads with button and axis support, including a
  configuration mode for remapping the controls.
- **Touch** — multi-touch press handling and gestures, plus the groundwork for
  an on-screen software joystick for controlling games on touch displays.

### UI entities
- **`ButtonEntity`**, **`MenuEntity`**, **`InputEntity`**, **`KeyboardEntity`**
  for simple in-canvas interfaces.

### Utilities
- **`Tool`** — number-base conversions (hex / base-36 / base-90 / Braille),
  cookies and small helpers.
- **`RichString`** — string helper used by the sprite encoders.

### Server side (PHP)
A tiny PHP front controller (`php/`) serves the app shell, generates the PWA
manifest and the service worker (with an auto-collected asset list for offline
caching), provides `*.data` / `*.db` JSON endpoints, and auto-detects which ES
module import method the browser supports.

## Runtime, compatibility & dev mode

- **Progressive Web App.** Every app is installable: the server generates the
  web app manifest and a service worker whose pre-cache asset list is collected
  automatically, so you get an app icon and full-screen launch.
- **Offline mode (production).** Service worker support is built in and active in
  the **production** build: the generated service worker pre-caches the app
  assets and serves them from cache with a network fallback, so released
  versions keep working offline. (Dev mode serves the unbundled sources instead
  and does not cache.)
- **Broad browser compatibility.** The runtime targets **ECMAScript 2018
  (ES9)** as its baseline, so it runs on a wide range of older browsers and
  devices, not just the latest ones.
- **Two module import methods.** svision can load its ES modules either via the
  modern dynamic `await import(...)` or via the older static `import ... from`
  syntax, so it works whether or not the browser supports the newer mechanism.
- **Dev mode for full debugging.** A development mode serves the unbundled
  sources for full step-through debugging, and works with **both** import
  methods above (production serves a single minified bundle instead).
- **The `/config` page.** All of the above — the detected ECMAScript version,
  class-syntax and import-method support, a live platform/canvas probe, the
  active import method and the current cookies — can be inspected and switched
  from the built-in diagnostics page at `https://<project-name>/config`.

## Command-line tooling (`svtool`)

`tools/svtool` is a PHP command-line utility for the manual build, deploy and
verification operations on an svision app. It is run from the application root
(the same place the PHP pages run from):

| Command | What it does |
|---|---|
| `svtool version` | Print the current application version (from `app/version.js`). |
| `svtool info [count]` | Show the state of the `js/` directory (bundle and import-from files) and, if configured, the most recent database records (default 10). |
| `svtool build [target]` | Build a deploy variant from `config/compile.json`. `target` is **`bundle`** (a minified `js/bundle.<version>.min.js`) or **`import-from`** (source mirrors copied into `js/` with the header marker rewritten). In dev mode the target is required; in production it defaults to `bundle`. |
| `svtool verify` | Check `js/`: the bundle exists and matches the current sources, the import-from files are present and valid, there are no unexpected files, and the served JavaScript stays within **ES2018** (via `es-check` if installed, otherwise a heuristic scan). |
| `svtool clean` | Remove every generated file from the `js/` directory. |
| `svtool help` | Show usage. |

A bash completion script is provided in `tools/svtool-completion.bash`.

## Examples

Full, working projects built with svision:

| Project | What it is | Repository |
|---|---|---|
| **Hello World** | The smallest possible svision app — start here. | https://github.com/mitrenga/helloworld |
| **Manic Miner** | A complete remake of the classic ZX Spectrum game. | https://github.com/mitrenga/manicminer |
| **Jet Set Willy** | A complete remake of the classic ZX Spectrum game. | https://github.com/mitrenga/jetsetwilly |

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

svision is released under the [GNU General Public License v3.0](LICENSE).
