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
- **Used in:** `js/platform/canvas2D/zxSpectrum/zxFonts8x8.js` (default glyph
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

### Uni-VGA 8x16 font (`IBMFonts8x16`)

- **Used in:** `js/platform/canvas2D/ibm/ibmFonts8x16.js`
  (`charsRanges`/`fontsData` tables, converted from `u_vga16.bdf`)
- **Origin:** **UNI-VGA** Unicode console/X11 font (2001)
- **Author:** Dmitry Yu. Bolkhovityanov
- **Source:** https://github.com/illnyang/univga-ttf (Illyan Garte's 2022 TTF
  port, bundling the original `uni_vga` source package with `u_vga16.bdf`)
- **Licence:** X11 — may be distributed and modified freely
