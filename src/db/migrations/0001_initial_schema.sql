-- Numen — initial DB schema
-- Соответствует docs/STACK.md "Схема БД"
-- Применять через Supabase SQL Editor или через миграционный инструмент (фаза 1, task-113)

-- =============== Пользователи ===============
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,                    -- Telegram user_id
  username TEXT,
  first_name TEXT,
  language_code TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  state TEXT,                                -- состояние онбординга (idle, awaiting_date, ...)
  source TEXT                                -- utm-источник
);

CREATE INDEX IF NOT EXISTS users_last_active_idx ON users(last_active);

-- =============== Натальные карты ===============
CREATE TABLE IF NOT EXISTS charts (
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  birth_date DATE NOT NULL,
  birth_time TIME,                           -- NULL если пользователь не знает время
  birth_place TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  birth_timezone TEXT NOT NULL,              -- IANA tz (Europe/Moscow)
  chart_data JSONB NOT NULL,                 -- расчёты swisseph: позиции планет, дома, аспекты
  portrait_text TEXT,                        -- сгенерированный портрет (см. prompts/natal_portrait.md)
  portrait_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============== Подписки ===============
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,                      -- trial, active, cancelled, expired
  plan TEXT NOT NULL,                        -- monthly, yearly
  started_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  payment_provider TEXT,                     -- stars, yookassa
  payment_id TEXT,
  amount NUMERIC,
  currency TEXT
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS subscriptions_expires_idx ON subscriptions(expires_at) WHERE status = 'active';

-- =============== История push-уведомлений ===============
CREATE TABLE IF NOT EXISTS push_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                        -- daily, transit, weekly
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS push_history_user_idx ON push_history(user_id, sent_at DESC);

-- =============== Совместимости (для виральных метрик) ===============
CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  user_a BIGINT REFERENCES users(id) ON DELETE CASCADE,
  user_b BIGINT REFERENCES users(id) ON DELETE CASCADE,
  invitation_token TEXT UNIQUE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reading_text TEXT
);

CREATE INDEX IF NOT EXISTS matches_user_a_idx ON matches(user_a);
CREATE INDEX IF NOT EXISTS matches_user_b_idx ON matches(user_b);
CREATE INDEX IF NOT EXISTS matches_token_idx ON matches(invitation_token);

-- =============== Расклады Таро ===============
CREATE TABLE IF NOT EXISTS tarot_readings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  cards JSONB NOT NULL,                      -- [{name, reversed}, ...]
  interpretation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tarot_user_date_idx ON tarot_readings(user_id, reading_date DESC);

-- =============== События для аналитики ===============
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_user_idx ON events(user_id, created_at);
CREATE INDEX IF NOT EXISTS events_name_idx ON events(event_name, created_at);
