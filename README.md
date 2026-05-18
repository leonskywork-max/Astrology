# Numen

Telegram-бот персональной астрологии в стиле Co-Star для русскоязычной аудитории.

- **Канал:** [@heynumen](https://t.me/heynumen)
- **Бот:** [@numenapp](https://t.me/numenapp)

## Что внутри репо

| Папка | Что там |
|---|---|
| [`docs/`](docs/) | Спека продукта, позиционирование, brand guide, roadmap, stack |
| [`prompts/`](prompts/) | Системные промпты для LLM (тон, дневной push, портрет, синастрия) |
| [`knowledge/`](knowledge/) | База знаний — астрология (planets, signs, houses, aspects, transits, synastry, retrogrades), Таро (major/minor arcana, spreads), анализ конкурентов |
| [`content/`](content/) | Контент-планы канала, шаблоны постов, брендинг (палитра, SVG-логотипы, AI-промпты) |
| [`src/`](src/) | Код бота (TypeScript + Telegraf + Supabase) |
| [`memory/`](memory/) | Дневные заметки по задачам |
| [`MEMORY.md`](MEMORY.md) | Индекс ключевых решений проекта |

## Стек

- **Node.js 20+** (тестировано на 22)
- **TypeScript** 5.7 (запуск через tsx, нативная strip-types в Node 22)
- **Telegraf** 4.x для Telegram
- **Supabase** (PostgreSQL + auth + storage)
- **Anthropic Claude** SDK (Sonnet 4.6 для качества, Haiku 4.5 для массовости)
- **Swiss Ephemeris** для астрорасчётов (task-102)

Полная спека — [docs/STACK.md](docs/STACK.md).

## Запуск локально

### 1. Установка зависимостей

```bash
npm install
```

### 2. Конфигурация

```bash
cp .env.example .env
# Заполнить BOT_TOKEN, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
```

**Где взять:**
- `BOT_TOKEN` — у @BotFather (бот уже создан как @numenapp)
- `ANTHROPIC_API_KEY` — на console.anthropic.com. **ВАЖНО:** на dev-машине Леона должна быть unset (см. auto-memory `feedback_anthropic_api_key_must_be_unset`). Использовать только на production-сервере или в изолированной dev-среде
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` — в Supabase Dashboard → Project Settings → API

### 3. Миграции БД

В Supabase Dashboard → SQL Editor вставить содержимое [`src/db/migrations/0001_initial_schema.sql`](src/db/migrations/0001_initial_schema.sql).

### 4. Запуск в dev-режиме

```bash
npm run dev
```

Бот стартует в long-polling режиме, перезапускается при изменениях.

### 5. Проверка типов

```bash
npm run typecheck
```

## Структура src/

```
src/
├── bot/                  — Telegraf, сценарии команд
│   ├── index.ts          — создание бота и регистрация хэндлеров
│   └── onboarding.ts     — сценарий /start и /chart (task-104)
├── astro/                — расчёты натальных карт, транзитов (task-102)
│   └── chart.ts
├── llm/                  — Anthropic Claude wrapper (task-109)
│   └── claude.ts
├── db/                   — Supabase client + миграции
│   ├── client.ts
│   └── migrations/
├── payments/             — Telegram Stars + ЮKassa (task-110)
├── jobs/                 — cron-задачи: daily push, channel publisher (task-112)
├── analytics/            — события и метрики (task-113)
├── utils/
│   ├── config.ts         — env-конфиг с валидацией
│   └── logger.ts         — pino
└── index.ts              — точка входа
```

## Roadmap

См. [docs/ROADMAP.md](docs/ROADMAP.md).

Фаза 0 (стратегия) — ✅ закрыта 2026-05-18 (конкурентный анализ, позиционирование, нейминг, айдентика).

Фаза 1 (MVP бота) — в работе:
- **task-101** ✅ скаффолдинг проекта
- task-102 — интеграция swisseph
- task-103 — геокодинг
- task-104 — онбординг
- ...
- task-114 — деплой на Railway

## Принципы кода

- **TypeScript strict.** Без `any`, с явными возвратами там, где не очевидно.
- **Промпты — только в [`prompts/`](prompts/), не в коде.** Чтобы редактировать без деплоя.
- **LLM-вызовы — через очередь (BullMQ).** Иначе таймаут Telegram. (task-109)
- **Push через cron — с учётом таймзоны пользователя**, не one-shot на 8:00 UTC. (task-112)
- **HTML, не MarkdownV2** в Telegram. См. [auto-memory](../../.claude/projects/-root/memory/feedback_telegram_html_not_markdownv2.md).
- **База знаний из `knowledge/` подгружается в системный промпт LLM** — это main asset проекта.

## Лицензия

Private. Внутренний проект, не для публичного использования.
