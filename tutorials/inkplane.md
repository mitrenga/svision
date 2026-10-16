The ZX Spectrum gives a character cell **one ink and one paper**. Two things
of different colours in the same 8x8 cell cannot both keep theirs — the one
drawn later takes the cell and repaints whatever was already there. That is
*attribute clash*, and it is not a bug in the games: it is the machine.

A remake that measures itself against an original must **reproduce** it. The
6912 bytes are the evidence, and a `match*` tool that compares them byte for
byte is the only thing that says a port is faithful. Removing clash by
changing what a game writes would throw that away.

The **ink plane** is how {@link ZXVideoRAM} lets a remake have both: the video
memory stays exactly what the original's was, and the picture on the glass has
colour at pixel resolution.

## The idea

The plane is one byte per pixel, 256x192 of them, held **beside** the 6912 and
never counted among them. Each byte says which ink lit that pixel, or nothing
at all.

Nothing draws into it. It is filled by the **same writes** that fill the
bitmap, through a pen the caller sets beforehand:

- what a write **lights up** takes the current pen,
- what a write **puts out** loses its owner,
- what a write does not touch keeps whatever it had.

That is the whole rule, and it is why the plane cannot drift out of step with
the bitmap: it is a function of the same byte operations. The masking the 8 bit
games do falls out of it for free — Ultimate's blitters rub a sprite out by
writing the **complement** of its silhouette with `AND`, so exactly the pixels
that go dark are the ones that lose their owner.

{@link ZXVideoRAM#paint} then colours a lit pixel with its owner's ink if it
has one, and out of the cell attribute if it has not. A screen with no owners
paints exactly as it did before.

## Using it

```js
var vram = new ZXVideoRAM();
vram.enableInkPlane(true);          // off by default, and free when off

vram.setPen(0x45);                  // bright cyan: what is drawn next is its
var at = ZXVideoRAM.addressOf(x, y);
vram.poke(at.h, at.l, bits, 'or');  // these pixels are now the pen's

vram.setPen(null);                  // and what is drawn next belongs to no one
```

| call | what it does |
|---|---|
| {@link ZXVideoRAM#enableInkPlane} | allocates or drops the plane |
| {@link ZXVideoRAM#setPen} | the attribute following writes mark their pixels with; `null` draws **unowned** |
| {@link ZXVideoRAM#clearInk} | forgets the owners of a rectangle of cells |
| {@link ZXVideoRAM.encodeInk} | packs an attribute byte into a plane byte |

`clear()`, `clearArea()` and `restore()` forget owners on their own, because a
picture arriving whole carries no notion of who drew what. `copy()` takes the
plane with it.

A plane byte is not an attribute — it only has to carry an ink:

```
  bit 7     owned; a byte of 0 means "no owner, use the cell"
  bit 4     FLASH
  bit 3     BRIGHT
  bits 0-2  ink
```

Paper is always the cell's. Ink is per pixel; paper cannot be, because the
pixels that would show it are by definition the ones nothing drew.

## Finding the pen

The pen is **the colour of the thing being drawn**, and most of the time a
game hands it to you: the sprite record carries an attribute, the blitter
paints its cells with it, and that same byte is the pen.

The interesting cases are where a game **computes** the colour instead of
storing it. Jetpac's rocket is the one worth knowing: its cells are a fuel
gauge — magenta up to the level, white above it, bright every other round —
and
nothing in its record says so; the routine works it out from the rocket's own
state and writes it straight to the attributes.

It is tempting to call that "a colour belonging to the cell" and draw the
rocket unowned. **Don't.** That leaves the rocket at the mercy of anything
that flies through its cells, which is exactly the clash you turned the plane
on to be rid of. The gauge is the rocket's colour; it just isn't in the
rocket's record. Work it out and hand it over — a pen that varies down the
sprite's height is a pen like any other:

```js
// jetpac/app/screenComposer.js
var ink = (y) => this.rocketInkAt(entity, pass, y);
this.blit(videoRAM, at, sprite, 'or', ink);
```

The same routine that lays the attributes down answers the pen, so the two
cannot say different things.

**When is a pixel genuinely unowned?** When its colour is a property of
*where it is* rather than of *what it is* — text deliberately printed in
whatever colour its row happens to be, for instance. Then the fallback to the
cell attribute is the right answer and not a surrender. If you find yourself
reaching for `setPen(null)` for anything that moves, look again: it usually
means the colour is computed somewhere and you have not found it yet.

## Testing what the recordings cannot reach

A remake's `match*` recordings are flights of a real machine, and they only
prove what actually happens in them. Jetpac's do not contain a single fuelled
rocket — the gauge never appears — so no amount of replaying them says
anything about whether the pen is right.

That is where a plane goes wrong quietly. Build the case by hand instead: put
the object on a screen in the state the recordings never reach, let something
else repaint its cells, and check the pixels still come out its own colour.
`jetpac/tools/runink.js` does that for the gauge, alongside the replay.

## What it costs

Off, nothing: the plane is not allocated, `pokeOffset` does not look at it, and
`paint` is the ULA's own.

On, one `Uint8Array(49152)`, a loop over eight bits on writes that actually
change something, and one array read per lit pixel while painting. No second
drawing pass and no second model of the picture.

## What it does not do

It is a **deliberate departure from the machine**, not a correction of it, and
the library takes no view on whether a given remake should want one. Switch it
off and the picture is the Spectrum's again, clash and all.

What it must never become is a reason to change what a game writes. The way to
know it has not is to run the remake's own comparison with the plane switched
on and check that the bytes are still the original's. Jetpac does exactly that
in `tools/runink.js`: the whole incremental flight of its `matchtrail.js`,
12 413 952 bytes compared against the real machine's video memory, **no
difference** — while 0.68 % of the lit pixels come out a different colour.
