# Миграции БД

Numen использует Supabase (PostgreSQL).

## Как применять

На этапе MVP — вручную через Supabase Dashboard → SQL Editor:

1. Скопируй содержимое нужного `.sql` файла
2. Вставь в SQL Editor в дашборде Supabase
3. Нажми Run

Когда количество миграций перевалит за 5 — переходим на инструмент (например, `dbmate` или `node-pg-migrate`). Это будет в task-113 (аналитика).

## Файлы

- `0001_initial_schema.sql` — базовые таблицы (users, charts, subscriptions, push_history, matches, tarot_readings, events). Соответствует `docs/STACK.md`.

## Принципы

- **Никогда не дропать колонки в production** — добавлять новые, помечать старые deprecated
- **Каждая миграция = новый файл** с номером по порядку
- **Все foreign keys с ON DELETE CASCADE** — пользователь может удалиться, его данные не должны висеть orphans
- **Индексы под реальные запросы** — не "на всякий случай"
