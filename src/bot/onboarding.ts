/**
 * Онбординг пользователя — сценарий /chart с conversational flow.
 *
 * Состояние хранится в users.state как JSON. Это переживает рестарты бота
 * и позволяет юзеру вернуться к незаконченному онбордингу.
 *
 * Шаги:
 *   /chart       → step=awaiting_date, "пришли дату рождения"
 *   <дата>       → step=awaiting_time, "пришли время или 'не знаю'"
 *   <время>      → step=awaiting_place, "пришли место"
 *   <место>      → geocode, step=awaiting_place_confirmation, "это {место}? да/нет"
 *   да           → calculateChart, save, выдать портрет, step=idle
 *   нет          → step=awaiting_place заново
 */

import type { Context } from 'telegraf';
import { calculateChart } from '../astro/chart.ts';
import { geocode, type GeocodingResult } from '../astro/geocode.ts';
import { saveChart, getChart } from '../db/charts.ts';
import { clearState, getState, setState, upsertUser } from '../db/users.ts';
import { logger } from '../utils/logger.ts';
import { features } from '../utils/config.ts';
import { parseBirthDate, parseBirthTime, parseYesNo } from './parsers.ts';
import { formatBriefPortrait } from './portrait.ts';

type OnboardingState =
  | { step: 'awaiting_date' }
  | { step: 'awaiting_time'; birthDate: string }
  | { step: 'awaiting_place'; birthDate: string; birthTime: string | null }
  | {
      step: 'awaiting_place_confirmation';
      birthDate: string;
      birthTime: string | null;
      geocoded: GeocodingResult;
    };

const WELCOME = `<b>Numen.</b>

Не астролог. Не гадалка. Скорее наблюдатель с хорошим прицелом.

Чтобы что-то полезное про тебя сказать — нужна твоя натальная карта. Это про дату, время и место рождения. Без них всё, что я могу — это общие гороскопы про знаки, а они мало что про тебя говорят.

Готова? Напиши /chart, и пойдём по шагам.`;

const NO_DB_FALLBACK = `<i>Бот в режиме демо: БД не подключена.</i>

Полный сценарий онбординга с сохранением карты заработает, когда настроится Supabase.`;

export async function handleStart(ctx: Context): Promise<void> {
  logger.info({ userId: ctx.from?.id, username: ctx.from?.username }, 'User started bot');

  if (features.supabase && ctx.from) {
    await upsertUser({
      id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      language_code: ctx.from.language_code,
    });
  }

  await ctx.replyWithHTML(WELCOME);
}

export async function handleChart(ctx: Context): Promise<void> {
  if (!features.supabase) {
    await ctx.replyWithHTML(NO_DB_FALLBACK);
    return;
  }
  if (!ctx.from) return;

  await upsertUser({
    id: ctx.from.id,
    username: ctx.from.username,
    first_name: ctx.from.first_name,
    language_code: ctx.from.language_code,
  });

  const existing = await getChart(ctx.from.id);
  if (existing) {
    await ctx.replyWithHTML(
      `Твоя карта уже сохранена: <b>${existing.birth_date}</b>, ${existing.birth_place}.\n\n` +
        `Если хочешь её пересчитать — напиши /resetchart, потом /chart снова.`,
    );
    return;
  }

  await setState(ctx.from.id, { step: 'awaiting_date' } satisfies OnboardingState);
  await ctx.replyWithHTML(
    `<b>Шаг 1/3 — дата рождения.</b>\n\n` +
      `Пришли в любом формате:\n` +
      `<code>15.03.1990</code>  или  <code>1990-03-15</code>  или  <code>15/03/1990</code>`,
  );
}

export async function handleReset(ctx: Context): Promise<void> {
  if (!features.supabase || !ctx.from) return;
  await clearState(ctx.from.id);
  await ctx.replyWithHTML('Состояние сброшено. Напиши /chart, чтобы начать заново.');
}

/**
 * Обрабатывает любое текстовое сообщение в контексте онбординга.
 * Возвращает true, если сообщение было обработано (значит, не передавать дальше).
 */
export async function handleOnboardingText(ctx: Context, text: string): Promise<boolean> {
  if (!features.supabase || !ctx.from) return false;

  const state = await getState<OnboardingState>(ctx.from.id);
  if (!state) return false;

  switch (state.step) {
    case 'awaiting_date':
      return handleDateInput(ctx, text);
    case 'awaiting_time':
      return handleTimeInput(ctx, text, state.birthDate);
    case 'awaiting_place':
      return handlePlaceInput(ctx, text, state.birthDate, state.birthTime);
    case 'awaiting_place_confirmation':
      return handlePlaceConfirmation(ctx, text, state);
  }
}

async function handleDateInput(ctx: Context, text: string): Promise<boolean> {
  const date = parseBirthDate(text);
  if (!date) {
    await ctx.replyWithHTML(
      `Не разобрал дату. Пример: <code>15.03.1990</code>`,
    );
    return true;
  }
  await setState(ctx.from!.id, {
    step: 'awaiting_time',
    birthDate: date,
  } satisfies OnboardingState);
  await ctx.replyWithHTML(
    `<b>Шаг 2/3 — время рождения.</b>\n\n` +
      `Пришли в формате <code>12:30</code>. ` +
      `Если не знаешь — напиши <code>не знаю</code>, но тогда не смогу посчитать восход и дома.`,
  );
  return true;
}

async function handleTimeInput(
  ctx: Context,
  text: string,
  birthDate: string,
): Promise<boolean> {
  const time = parseBirthTime(text);
  if (time === 'invalid') {
    await ctx.replyWithHTML(
      `Не разобрал время. Пример: <code>12:30</code>. Или напиши <code>не знаю</code>.`,
    );
    return true;
  }
  await setState(ctx.from!.id, {
    step: 'awaiting_place',
    birthDate,
    birthTime: time,
  } satisfies OnboardingState);
  await ctx.replyWithHTML(
    `<b>Шаг 3/3 — место рождения.</b>\n\n` +
      `Напиши город. Можно с уточнением страны, если есть несколько городов с одним названием:\n` +
      `<code>Москва</code>  или  <code>Владимир</code>  или  <code>Casablanca, Marocco</code>`,
  );
  return true;
}

async function handlePlaceInput(
  ctx: Context,
  text: string,
  birthDate: string,
  birthTime: string | null,
): Promise<boolean> {
  const place = text.trim();
  if (place.length < 2) {
    await ctx.replyWithHTML('Название места слишком короткое. Попробуй ещё раз.');
    return true;
  }

  let geocoded: GeocodingResult | null;
  try {
    geocoded = await geocode(place, 'ru');
  } catch (err) {
    logger.error({ err, place }, 'Geocoding failed');
    await ctx.replyWithHTML(
      `Сервис геокодинга временно недоступен. Попробуй через минуту.`,
    );
    return true;
  }

  if (!geocoded) {
    await ctx.replyWithHTML(
      `Не нашёл такое место. Попробуй уточнить — добавь страну или название региона.\n\n` +
        `Например: <code>Владимир, Россия</code>`,
    );
    return true;
  }

  await setState(ctx.from!.id, {
    step: 'awaiting_place_confirmation',
    birthDate,
    birthTime,
    geocoded,
  } satisfies OnboardingState);

  await ctx.replyWithHTML(
    `Нашёл: <b>${geocoded.displayName}</b>\n` +
      `<i>Таймзона: ${geocoded.timezone}</i>\n\n` +
      `Это то место? Напиши <code>да</code> или <code>нет</code>.`,
  );
  return true;
}

async function handlePlaceConfirmation(
  ctx: Context,
  text: string,
  state: Extract<OnboardingState, { step: 'awaiting_place_confirmation' }>,
): Promise<boolean> {
  const answer = parseYesNo(text);
  if (answer === null) {
    await ctx.replyWithHTML('Не понял ответ. Напиши <code>да</code> или <code>нет</code>.');
    return true;
  }

  if (answer === 'no') {
    await setState(ctx.from!.id, {
      step: 'awaiting_place',
      birthDate: state.birthDate,
      birthTime: state.birthTime,
    } satisfies OnboardingState);
    await ctx.replyWithHTML(
      'Понял. Напиши место ещё раз — добавь страну или регион для точности.',
    );
    return true;
  }

  // answer === 'yes' → calculate
  const { geocoded, birthDate, birthTime } = state;

  await ctx.sendChatAction('typing');

  try {
    const chart = await calculateChart({
      birthDate,
      birthTime,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      timezone: geocoded.timezone,
    });

    await saveChart({
      userId: ctx.from!.id,
      birthDate,
      birthTime,
      birthPlace: geocoded.displayName,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      birthTimezone: geocoded.timezone,
      chartData: chart,
    });

    await clearState(ctx.from!.id);
    await ctx.replyWithHTML(formatBriefPortrait(chart));
  } catch (err) {
    logger.error({ err, userId: ctx.from?.id }, 'Chart calculation/save failed');
    await ctx.replyWithHTML(
      `Что-то пошло не так при расчёте карты. Попробуй ещё раз через /chart.`,
    );
    await clearState(ctx.from!.id);
  }

  return true;
}
