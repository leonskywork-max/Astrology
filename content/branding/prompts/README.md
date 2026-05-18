# AI-промпты для брендинга Numen

Готовые промпты для генерации визуальных артефактов через Midjourney, DALL-E, Stable Diffusion, ChatGPT (image), Flux. Скопировать → прогнать → выбрать.

## Принципы перед использованием

1. **Прочитать [docs/BRAND.md](../../../docs/BRAND.md) перед генерацией** — там определены цвета, типографика, что можно, что нельзя.
2. **Промпты заточены под Midjourney v6 синтаксис.** Для DALL-E/Flux — описательный язык работает, технические параметры (`--v 6 --ar 1:1`) убрать.
3. **Сгенерировать минимум 4 варианта каждого**, выбрать лучшее. AI на одном проходе не попадает в концепт.
4. **Не использовать готовые wellness/spiritual/mystical промпт-стили.** Мы строим anti-эзо-эстетику.

## Базовые модификаторы (всегда добавлять)

В конец любого промпта:
```
minimalist, dark mode, off-black background #0A0A0A, warm off-white #F5F5F0, single muted gold accent #C9A961, editorial design, no mystical elements, no rainbow gradients, no glow effects, no purple, no pink, sharp clean lines, --v 6 --style raw
```

Для альтернативного акцента (Bloodletting Red), заменить золото на:
```
single living red accent #E63946
```

## 1. Аватар канала (1:1)

### Вариант A — монограмма N

```
Brand avatar for editorial astrology channel "Numen". 
Centered capital letter N in elegant Playfair Display Black serif typography. 
Letter color: warm off-white #F5F5F0. 
Background: deep matte black #0A0A0A circle. 
Tiny single dot accent above the N in muted gold #C9A961. 
Minimal, sharp, editorial, magazine-like. 
No mystical elements, no stars, no glow, no purple, no decoration. 
--ar 1:1 --v 6 --style raw
```

### Вариант B — абстрактная точка

```
Brand avatar for editorial astrology platform "Numen".
Single small dot in muted brass gold #C9A961, precisely centered on deep matte black #0A0A0A background.
Around the dot: subtle thin circle outline at 1px in off-white #F5F5F0 at 30% opacity.
Geometric, mathematical, restrained.
Reference: Cron Calendar app icon style, Pitchfork minimalism.
No glow, no shine, no mystical, no stars, no decoration.
--ar 1:1 --v 6 --style raw
```

### Вариант C — астрономический угол

```
Avatar icon: two thin lines forming a 90-degree angle inside a circle.
Lines in warm off-white #F5F5F0 on deep black #0A0A0A background.
At the vertex of the angle: single small dot in muted gold #C9A961.
Concept: an astrological aspect simplified to pure geometry.
Editorial, minimalist, scientific aesthetic.
No mystical, no decoration, no glow.
--ar 1:1 --v 6 --style raw
```

## 2. Обложка канала (Telegram cover, ~16:8)

```
Telegram channel cover banner for "Numen" — editorial astrology platform.
Wide horizontal format.
Left side: large wordmark "Numen" in elegant Playfair Display Bold serif, color warm off-white #F5F5F0.
Right side: single thin geometric line forming an astrological angle (90 degrees), ending in a small dot in muted gold #C9A961.
Background: deep matte black #0A0A0A with subtle texture, like a high-end magazine spread.
Vast empty space, breathing room around elements.
Style references: The Gentlewoman magazine layout, Pitchfork dark mode, Cron Calendar.
No stars, no moons, no zodiac symbols, no glow, no gradient, no purple, no pink, no mystical decoration.
--ar 16:8 --v 6 --style raw
```

## 3. Аватар бота (1:1)

```
Bot avatar for "Numen" astrology Telegram bot.
Same monogram N as channel avatar (Playfair Display Black, off-white #F5F5F0 on matte black #0A0A0A circle).
Small additional marker: tiny bullet point in muted gold #C9A961 at the lower right of the circle, indicating it's a bot, not a channel.
Minimalist, editorial.
No mystical elements, no decoration, no glow.
--ar 1:1 --v 6 --style raw
```

## 4. Шаблоны для постов канала

### 4.1 Шаблон "цитата дня" (квадрат 1080×1080)

```
Square Instagram-style post template, "Numen" editorial astrology channel.
Deep matte black #0A0A0A background.
Center: short pull quote in large italic Playfair Display, color warm off-white #F5F5F0, left-aligned, generous margins (1/4 of width).
Bottom right small: text "Numen" in tiny semibold Inter, color muted gold #C9A961.
Vast negative space.
Reference: New Yorker pull quote, Pitchfork album review opener.
No stars, no decoration, no border, no quote marks decoration.
--ar 1:1 --v 6 --style raw
```

### 4.2 Шаблон "разбор аспекта" (вертикаль 1080×1350)

```
Vertical magazine-style post for "Numen" astrology channel.
Top quarter: thin geometric diagram of an astrological aspect — two dots connected by a line at an angle, color muted gold #C9A961.
Middle: bold serif headline in Playfair Display, color warm off-white #F5F5F0, left-aligned.
Bottom: 3-4 lines of body text in clean Inter sans-serif, color #F5F5F0.
Background: deep matte black #0A0A0A.
Editorial, minimalist, like a magazine page about astronomy.
No glow, no decoration, no mystical, no purple, no pink.
--ar 4:5 --v 6 --style raw
```

### 4.3 Шаблон "мем/ироничная заметка" (квадрат)

```
Square text-only meme template for "Numen" Telegram channel.
Deep matte black #0A0A0A background.
Center: one or two lines of dry ironic text in large Inter Medium, color warm off-white #F5F5F0, left-aligned.
The text should feel like a Co-Star push notification screenshot — sharp, brief, direct.
Bottom right: small "Numen" wordmark in Inter Semibold, color muted gold #C9A961.
No decoration, no border, no emoji, no mystical elements.
Reference: Co-Star screenshot aesthetic.
--ar 1:1 --v 6 --style raw
```

### 4.4 Шаблон "карта Таро" (вертикаль)

```
Vertical Tarot card daily post for "Numen" astrology channel.
Top half: minimalist line illustration of one Tarot card (e.g. The Tower, Death, The Star), drawn in thin lines, off-white #F5F5F0 on matte black #0A0A0A. No color fill, just outline. Geometric, restrained, not medieval or mystical.
Bottom half: card name in Playfair Display Bold, then 2-3 lines of interpretation in Inter Regular. Color off-white.
Tiny gold accent #C9A961 next to card name.
Reference: editorial art prints, not traditional Tarot decks.
No watercolor, no rainbow, no mystical glow, no decoration.
--ar 4:5 --v 6 --style raw
```

## 5. Иконография

### Astrological symbols set (для разделов бота)

```
Minimal icon set for astrology app: 10 planetary symbols (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto).
Each symbol on its own dark matte black #0A0A0A square background.
Symbols drawn as thin 1.5px lines in warm off-white #F5F5F0.
Geometric, precise, no decoration.
Reference: SF Symbols, Phosphor Icons.
Output: 10 separate icons, consistent style.
--ar 1:1 --v 6 --style raw
```

### Zodiac symbols set

```
Minimal icon set for 12 zodiac signs.
Each symbol on dark matte black #0A0A0A square.
Lines thin 1.5px, color warm off-white #F5F5F0.
Tiny accent dot in muted gold #C9A961 in the corner of each.
Geometric, restrained, not ornamental.
Reference: editorial design, not folk-style zodiac.
--ar 1:1 --v 6 --style raw
```

## 6. Hero для лендинга (фаза 3, task-301)

```
Web landing page hero illustration for "Numen" AI astrology product.
Wide horizontal composition.
Center-left: large abstract diagram — minimalist natal chart with thin lines, circles, and small dots in muted gold #C9A961 on matte black #0A0A0A.
Right: empty space for headline text overlay (will be added separately).
Style: editorial, magazine-like, like a New York Times graphic.
No stars, no rainbow, no mystical, no shiny effects.
Reference: NYT Opinion graphics, FiveThirtyEight visualizations.
--ar 16:9 --v 6 --style raw
```

## 7. Что не использовать в промптах

Чёрный список слов, которые сразу делают AI-картинку wellness/mystical:
- `mystical`, `magical`, `spiritual`, `ethereal`, `celestial`
- `cosmic`, `dreamy`, `enchanting`, `whimsical`
- `goddess`, `witch`, `wizard`, `crystal`
- `aura`, `chakra`, `energy`, `vibration`
- `glowing`, `shimmering`, `sparkling`, `radiant`
- `pastel`, `iridescent`, `holographic`
- `bohemian`, `cottagecore`, `wiccan`, `tarot-style`

Если AI выдал картинку с любым из этих признаков — переделать с явным запретом.

## 8. Финальная проверка после генерации

Перед использованием прогнать через 4 вопроса:
1. Это можно поставить как обложку **Pitchfork**? Если "слишком эзо/wellness" — отбраковать.
2. Здесь есть **больше двух цветов**? Если да — отбраковать.
3. Если убрать имя бренда, **похоже ли это на 10 других астро-приложений**? Если да — отбраковать.
4. Сделано ли это **типографикой и геометрией, не иллюстрацией**? Если иллюстрация — отбраковать.

## 9. Дополнительные сервисы

- **Midjourney**: `discord.gg/midjourney` или midjourney.com/imagine — best quality
- **Flux (Krea/Replicate)**: альтернатива MJ, бесплатные тиры
- **DALL-E 3 в ChatGPT Plus**: говорит словами, понимает русский
- **Ideogram**: лучший для текста на картинке (для шаблонов с заголовками)
- **SVG-логотипы**: после генерации в раст — конвертация через [vectorizer.io](https://vectorizer.io) или вручную в Figma
