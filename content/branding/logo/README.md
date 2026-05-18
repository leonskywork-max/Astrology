# Логотипы — Numen

SVG-прототипы. Это **отправные точки для дизайнера**, не финальные ассеты. SVG используют веб-шрифт Playfair Display через @import — для production нужно сконвертировать текст в path (через Figma, Illustrator, inkscape).

## Файлы

| Файл | Размер | Назначение |
|---|---|---|
| [avatar_monogram.svg](avatar_monogram.svg) | 640×640 | Аватар канала/бота — монограмма N с золотой точкой |
| [avatar_dot.svg](avatar_dot.svg) | 640×640 | Альтернативный аватар — чистая золотая точка |
| [avatar_aspect.svg](avatar_aspect.svg) | 640×640 | Альтернативный аватар — астрологический угол |
| [wordmark.svg](wordmark.svg) | 800×200 | Текстовый логотип "Numen" |
| [channel_cover.svg](channel_cover.svg) | 1280×640 | Обложка канала Telegram |

## Как открыть

Любой браузер:
```
open avatar_monogram.svg
```

Или в Figma — File → Import.

## Что доработать

1. **Сконвертировать текст в path** — иначе на устройствах без Playfair Display будет fallback на Georgia.
2. **Аватар бота** — взять `avatar_monogram.svg` и добавить маленький bullet `#C9A961` в правом нижнем углу как маркер "это бот" (см. `docs/BRAND.md` → "Аватар бота").
3. **Растровые PNG** — для Telegram нужны PNG (Telegram не принимает SVG как аватар канала). Экспортировать в Figma или через `rsvg-convert`:
   ```bash
   rsvg-convert -w 640 -h 640 avatar_monogram.svg > avatar_monogram.png
   rsvg-convert -w 1280 -h 640 channel_cover.svg > channel_cover.png
   ```
4. **Финальный логотип через Midjourney/Figma** — SVG это прототипы; реальный логотип лучше нарисовать в Figma (точные пропорции буквы N в Playfair).

## Связано

- [docs/BRAND.md](../../../docs/BRAND.md) — полный фирменный гайд (цвета, типографика, принципы)
- [content/branding/prompts/README.md](../prompts/README.md) — промпты для генерации в Midjourney/DALL-E
- [content/branding/templates/](../templates/) — шаблоны постов канала
