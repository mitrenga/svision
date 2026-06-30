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
- **Stereo**: a bus can be opened with several output **channels** (`channelCount`,
  capped to the hardware maximum, mono fallback). Each played sound may carry
  per-channel volume multipliers (`channelVolumes`, e.g. `[1, 0]` for left-only)
  to place it in the stereo field — used in JSW to pan arrow shots left/right.
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
  versions keep working offline. Plain dev mode serves the unbundled sources and
  does not cache, but you can opt the service worker into dev mode to test
  offline on the dev server — see [Dev mode and the service worker](#dev-mode-and-the-service-worker).
- **Broad browser compatibility.** The runtime targets **ECMAScript 2018
  (ES9)** as its baseline, so it runs on a wide range of older browsers and
  devices, not just the latest ones.
- **Two module import methods.** svision can load its ES modules either via the
  modern dynamic `await import(...)` or via the older static `import ... from`
  syntax, so it works whether or not the browser supports the newer mechanism.
- **Dev mode for full debugging.** A development mode serves the unbundled
  sources for full step-through debugging, and works with **both** import
  methods above (production serves a single minified bundle instead). It can
  optionally enable the service worker so offline behaviour can be tested
  without a production build — see [below](#dev-mode-and-the-service-worker).
- **The `/config` page.** All of the above — the detected ECMAScript version,
  class-syntax and import-method support, a live platform/canvas probe, the
  service worker status (with buttons to unregister it, clear its cache, or
  disable/enable it), the active import method and the current cookies — can be
  inspected and switched from the built-in diagnostics page at
  `https://<project-name>/config`.

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
- **`$devModeName`** is an optional dev-mode label. svision only exposes its
  value to the client as `window.devModeName`; **what to do with it is entirely
  up to the application** — render it on screen, log it to the console, or ignore
  it. The example games (Manic Miner, Jet Set Willy) draw it in the ZX Spectrum
  border and, by their own convention, read an optional leading JSON style block
  `{penColor, bkColor, width}` from the value; that convention lives in the app,
  not in the framework. A value as used by those games (the inner quotes are
  escaped because it ends up embedded into a JavaScript string):

  ```php
  $devModeName = '.{\"penColor\":\"#000000\",\"bkColor\":\"#fefe00\",\"width\":185} DEVELOPER MODE ';
  ```

**How the service worker works.** The server generates the worker from the
`serviceWorker.js` template, injecting the application version (used as the cache
name) and an auto-collected asset list. The pre-cache list follows the active
import path, so it caches the `js/` files for the bundle / *import-from* methods
and the `app/` sources for the *await-import* method — the cache always matches
what the app actually loads. On **install** it pre-caches every listed asset; on
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
2. Pick an import method from the `/config` page (the *import-from* method
   mirrors the production layout most closely).
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
| `svtool info [count]` | Show the state of the `js/` directory (bundle and import-from files) and, if configured, the most recent database records (default 10). |
| `svtool build [target]` | Build a deploy variant from `config/compile.json`. `target` is **`bundle`** (a minified `js/bundle.<version>.min.js`) or **`import-from`** (source mirrors copied into `js/` with the header marker rewritten). In dev mode the target is required; in production it defaults to `bundle`. |
| `svtool verify` | Check `js/`: the bundle exists and matches the current sources, the import-from files are present and valid, there are no unexpected files, and the served JavaScript stays within **ES2018** (via `es-check` if installed, otherwise a heuristic scan). |
| `svtool clean` | Remove every generated file from the `js/` directory. |
| `svtool help` | Show usage. |

A bash completion script is provided in `tools/svtool-completion.bash`.

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
