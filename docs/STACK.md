# Технический стек astro-bot

## Стек

### Backend
- **Runtime**: Node.js 20 (для Telegraf — лучшая Telegram-библиотека) или Python 3.11 (если предпочитаешь aiogram). По умолчанию — Node.js, всё ниже под него.
- **Bot framework**: Telegraf 4.x
- **HTTP**: Express для webhook от платёжных систем
- **Database**: PostgreSQL (через Supabase — уже есть в SERVICES)
- **Cache**: Redis (через Upstash — есть бесплатный тир)
- **Queue**: BullMQ для отложенных задач (push, генерации)

### Астрологические расчёты
- **swisseph** через `swisseph-v2` (Node) или `pyswisseph` (Python)
- Эфемериды Swiss Ephemeris (open source, на базе данных JPL/NASA)
- **Геокодинг**: OpenStreetMap Nominatim (бесплатно, лимиты приемлемы) с fallback на Google Maps API
- **Таймзоны**: `tz-lookup` или `geo-tz` (определение таймзоны по координатам)

### LLM
- **Anthropic Claude API** через официальный SDK
- **Sonnet 4** — для качественных задач (натальный портрет, синастрия, лонгриды для канала)
- **Haiku 4.5** — для массовых задач (ежедневные push, короткие тексты)
- Промпт-кеширование Claude API для системного промпта с базой знаний — экономия 90% затрат

### Платежи
- **Telegram Stars** — для всех (нативно в Telegram, без KYC)
- **ЮKassa** или **CloudPayments** — для РФ-карт с автосписанием подписки

### Деплой и инфра
- **Railway** — для бота (уже настроен в workspace, есть RAILWAY_PROJECT_ID)
- **Supabase** — БД + auth + storage (логотипы, аватары пары для синастрии)
- **GitHub Actions** — CI/CD: push в main → деплой
- **Vercel** — для лендинга и Mini App (фаза 4)

### Аналитика
- **Mixpanel** или **Amplitude** (бесплатный тир) — продуктовая аналитика
- **PostgreSQL events table** — сырые события для построения когорт
- **Metabase** (на Railway) — дашборды

### Мониторинг
- **Sentry** — ошибки
- **Better Stack** — uptime + логи
- **Bot Father bot stats** — базовая статистика Telegram

## Структура src/

```
src/
├── bot/
│   ├── index.js              — точка входа
│   ├── onboarding.js         — сценарий первого входа
│   ├── compatibility.js      — функция совместимости
│   ├── tarot.js              — карта Таро дня
│   ├── horoscope.js          — гороскоп дня по знаку
│   ├── premium.js            — премиум-разделы
│   ├── settings.js           — настройки пользователя
│   └── middleware.js         — auth, subscription check, rate limit
├── astro/
│   ├── chart.js              — расчёт натальной карты (swisseph)
│   ├── transits.js           — расчёт текущих транзитов
│   ├── synastry.js           — расчёт синастрии двух карт
│   ├── geocode.js            — место → координаты + таймзона
│   └── tarot_deck.js         — колода Таро в коде
├── llm/
│   ├── claude.js             — клиент Anthropic с retry/fallback
│   ├── context_builder.js    — сборщик контекста из knowledge/
│   ├── prompts.js            — загрузка промптов из prompts/
│   └── cache.js              — кеширование частых запросов
├── db/
│   ├── client.js             — подключение к Supabase
│   ├── users.js              — операции с users
│   ├── charts.js             — натальные карты в БД
│   ├── subscriptions.js      — подписки и платежи
│   └── events.js             — аналитические события
├── payments/
│   ├── stars.js              — Telegram Stars
│   ├── yookassa.js           — ЮKassa
│   └── subscription.js       — управление подпиской
├── jobs/
│   ├── daily_push.js         — утренний персональный push (cron 8:00 локального времени)
│   ├── daily_horoscope.js    — генерация гороскопов знаков (cron 7:30)
│   ├── channel_publisher.js  — публикация в канал (cron 8:00)
│   └── transit_alerts.js     — пуш при точных аспектах (каждый час)
├── analytics/
│   ├── events.js             — обёртка для трекинга
│   └── retention.js          — расчёт retention-метрик
└── utils/
    ├── logger.js
    ├── errors.js
    └── time.js               — работа с таймзонами
```

## Схема БД

```sql
-- Пользователи
CREATE TABLE users (
  id BIGINT PRIMARY KEY,                    -- Telegram user_id
  username TEXT,
  first_name TEXT,
  language_code TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  state TEXT,                                -- состояние онбординга
  source TEXT                                -- источник трафика (utm)
);

-- Натальные карты
CREATE TABLE charts (
  user_id BIGINT REFERENCES users(id) PRIMARY KEY,
  birth_date DATE NOT NULL,
  birth_time TIME,                           -- может быть NULL
  birth_place TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  birth_timezone TEXT NOT NULL,
  chart_data JSONB NOT NULL,                 -- расчёты swisseph
  portrait_text TEXT,                        -- сгенерированный портрет
  portrait_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Подписки
CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  status TEXT NOT NULL,                      -- trial, active, cancelled, expired
  plan TEXT NOT NULL,                        -- monthly, yearly
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  payment_provider TEXT,                     -- stars, yookassa
  payment_id TEXT,
  amount NUMERIC,
  currency TEXT
);

-- История push-уведомлений
CREATE TABLE push_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  type TEXT NOT NULL,                        -- daily, transit, weekly
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened BOOLEAN DEFAULT FALSE
);

-- Совместимости (для виральных метрик)
CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  user_a BIGINT REFERENCES users(id),
  user_b BIGINT REFERENCES users(id),
  invitation_token TEXT UNIQUE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reading_text TEXT
);

-- Расклады Таро
CREATE TABLE tarot_readings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  reading_date DATE NOT NULL,
  cards JSONB NOT NULL,
  interpretation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- События для аналитики
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX events_user_idx ON events(user_id, created_at);
CREATE INDEX events_name_idx ON events(event_name, created_at);
```

## Env-переменные

```
# Telegram
BOT_TOKEN=

# Anthropic
ANTHROPIC_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# Payments
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=

# Geocoding
GOOGLE_MAPS_API_KEY=        # опционально, для fallback

# Monitoring
SENTRY_DSN=

# Channel
CHANNEL_ID=                  # ID канала для автопостинга
ADMIN_CHAT_ID=               # ID админ-чата для алертов

# Misc
NODE_ENV=production
LOG_LEVEL=info
```

## Команды для бота (BotFather)

```
start - Начать
help - Помощь
chart - Моя натальная карта
today - Что сегодня
tarot - Карта дня Таро
match - Совместимость с человеком
diary - Дневник состояний (Premium)
settings - Настройки
premium - О подписке Premium
```

## Что не делать

- Не использовать SQLite в production — Postgres сразу
- Не хранить промпты в коде — только в prompts/, чтобы редактировать без деплоя
- Не вызывать LLM из onTextMessage — всегда через очередь BullMQ, иначе таймаут Telegram
- Не делать ежедневные push через one-shot cron на 8:00 UTC — у каждого пользователя своя таймзона
- Не кешировать дольше 24h результаты для свежих транзитов
- Не присылать push без проверки last_active — если человек не заходил месяц, начать с reactivation сообщения, не с обычного push
