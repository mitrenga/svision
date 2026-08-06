# Zadání: DrawingCache v nativním rozlišení (ratio = 1)

Pracovní dokument k připomínkování, 2026-08-04. Po schválení bude sloužit jako plán implementace.

## Cíl

Grafické cache (`DrawingCache`) se budou vytvářet a plnit vždy v logickém rozlišení
(ratio = 1) a na obrazovku se budou vykreslovat zvětšené aktuálním ratio přes
`drawImage` s potlačeným vyhlazováním. Tím se:

- zmenší paměť cache o faktor ratio² (při ratio 4 je cache 16× menší),
- úplně odstraní překreslování všech cache při změně ratio (resize okna) —
  zůstane jediný škálovaný `drawImage` na snímek,
- odstraní rozpracovaná master-canvas vrstva ve `SpriteEntity` (řeší tentýž
  problém, ale přidáním druhé cache místo odstraněním příčiny).

## Předpoklady

1. Ratio je pro vykreslování vždy celočíselné a vždy bude (ověřeno:
   AdaptiveLayout konstrukčně, ZXSpectrumLayout floorem na řádku 47; desetinné
   hodnoty existují jen přechodně uvnitř `resizeModel` pro výpočet borderů).
2. `DrawingCache` uvažuje ratio = 1 — velikost canvasu = logická velikost,
   kreslí se do ní bez škálování.
3. `cleanCache` se přestane používat jako reakce na resize/změnu ratio —
   zůstane jen pro skutečnou změnu obsahu.
4. Na sprite (a každou entitu) zůstane jediná cache, vykreslovaná se zvětšením
   aktuálního ratio s potlačeným vyhlazováním.
5. Všechny logické souřadnice a rozměry kreslené do cache jsou celočíselné —
   jen tehdy je škálovaný výstup pixelově identický s dnešním. (V ZX hrách
   platí; v EU ověřit scrollbary/kurzory.)

## Plán

### Krok 1 — zrušit stávající změny ve SpriteEntity

`git checkout -- js/platform/canvas2D/spriteEntity.js` (masterCanvas/masterDirty,
renderMaster, renderCacheDirect, větvení v drawEntity). Výchozí stav = čistý main.

### Krok 2 — upravit DrawingCache a vykreslovací cestu

- `drawingCache.js`:
  - `init(width, height)`: canvas = width × height (bez násobení ratio),
    položka `this.ratio` zaniká.
  - `needToRefresh()`: zaniká kontrola ratio; zůstává kontrola rozměrů
    (pokrývá i změny logické velikosti entity, např. re-wrap textu) a `clean` flag.
    Při implementaci přejmenováno na `preparePaint(width, height)` (bez
    nepoužívaného parametru `entity`) — název přiznává vedlejší efekt
    (reinicializace canvasu, konzumace flagu) a páruje se s `paint()`.
  - `paint()`: čistý `fillRect` bez ratio — stane se jediným správným způsobem,
    jak do cache kreslit.
- `canvas2DLayout.js`:
  - `paintCache`: `drawImage` s cílovými rozměry × ratio (dosud 1:1 blit).
  - `paintCropCache` + `drawingCropCache`: crop cache také 1:1; kopie
    drawingCache → cropCache beze změny měřítka, škáluje se až finální blit.
  - Potlačení vyhlazování: `imageSmoothingEnabled = false` (+ prefix
    `webkitImageSmoothingEnabled` pro staré WebKity) na cílovém kontextu.
    POZOR: je to stav kontextu a resetuje se při každé změně rozměrů canvasu —
    nastavovat po resize elementu (resizeModel / resizeApp), ne jednorázově.

### Krok 3 — postupně opravit všechny konzumenty a testovat

Big-bang: po kroku 2 bude vše kreslící do cache přes `layout.paintRect`
(který násobí ratio) viditelně rozbité — opravuje se ihned, entita po entitě.
Každé místo přejde na `cache.paint(...)` (nebo přímý `fillRect`).

Konzumenti v svision:

- `spriteEntity.js` — drawEntity (pixely, bkColor)
- `textEntity.js` — glyphy, pozadí; dědí ButtonEntity, InputEntity
  (InputEntity jen invaliduje, kreslení má TextEntity)
- `slidingTextEntity.js` — render běžícího textu do cache šířky animationWidth
- `canvas2DLayout.js` — crop cache (krok 2)

Konzumenti ve hrách (ruční DrawingCache instance):

- MM `gameAreaEntity.js` — `graphicCache` (per attr), vrstvy `drawingCache[0..3]`,
  kreslení přes `layout.paintRect(cache.ctx, ...)`
- JSW `gameAreaEntity.js` — totéž
- EU — používá jen standardní entity (SpriteEntity/TextEntity/ScrollView),
  vlastní cache nemá; ověřit
- prohledat i menuModel/caveMapEntity/roomMapEntity apod., zda nekreslí do
  cizích cache

### Krok 4 — úklid: co lze zrušit

- kontrola ratio v `needToRefresh` a položka `DrawingCache.ratio` (krok 2),
- všechna volání `cleanCache` v aplikacích/hrách vyvolávaná jen kvůli resize /
  změně ratio (pozor: invalidace kvůli změně *logické* velikosti musí zůstat —
  ale tu pokrývá rozměrová kontrola v `needToRefresh` automaticky, takže
  kandidátů na smazání může být víc, ověřovat po jednom),
- vestigiální pole `drawCache`, `drawCacheRatio`, `drawCacheCtx` ve
  SpriteEntity (prověřit, zda je něco vůbec čte),
- projít dokumentaci (JSDoc DrawingCache, README) — popis cache se mění.

## Testovací oracle

- testFlighty MM a JSW — pixelová identita animací (guardiáni, drolící se
  podlahy, dopravníky, portály, itemy, Willy),
- EU intro (scroll Earthrise) a console menu (statický obrázek) + resize okna,
- resize/orientace na mobilu (AdaptiveLayout),
- stará Samsung TV — kritické kvůli prefixu vyhlazování; kde vyhlazování
  nejde vypnout vůbec, bude obraz rozmazaný → zvážit sondu do /config.

## Rizika

1. **Vyhlazování na starých prohlížečích** — bez funkčního
   `imageSmoothingEnabled` bude obraz rozmazaný (degradace kvality, ne rozbití).
2. **Per-frame náklad** — blit každého snímku bude nově škálovaný `drawImage`
   místo 1:1 kopie; na desktopu zanedbatelné, na nejslabších zařízeních změřit.
3. **Neceločíselné souřadnice** (předpoklad 5) — místa s desetinnými logickými
   souřadnicemi se vykreslí jinak než dnes (zaokrouhlení na logický pixel místo
   sub-pixelu na device rozlišení).
