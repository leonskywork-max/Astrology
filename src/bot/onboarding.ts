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
import { calculateChart, type NatalChart } from '../astro/chart.ts';
import { geocode, type GeocodingResult } from '../astro/geocode.ts';
import { saveChart, getChart, savePortrait } from '../db/charts.ts';
import { clearState, getState, setState, upsertUser } from '../db/users.ts';
import { logger } from '../utils/logger.ts';
import { features } from '../utils/config.ts';
import { generateNatalPortrait } from '../llm/portrait.ts';
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

const WELCOME = `<b>Numen.</b> Это про натальную карту.

Натальная карта — не гадание и не Таро. Это расчёт того, как стояли планеты в момент твоего рождения. Из этой картинки видно особенности характера, как ты строишь отношения, что даётся легко, что — через сопротивление.

Чтобы её посчитать, нужно три вещи: <b>дата рождения</b>, <b>точное время</b> (или хотя бы примерное) и <b>город</b>, где это было.

Готов(а)? Напиши /chart — пойдём по шагам.`;

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
      `Твоя карта уже у меня: <b>${existing.birth_date}</b>, ${existing.birth_place}.\n\n` +
        `Если что-то перепутала и хочешь пересчитать — напиши /resetchart, потом /chart снова.`,
    );
    return;
  }

  await setState(ctx.from.id, { step: 'awaiting_date' } satisfies OnboardingState);
  await ctx.replyWithHTML(
    `<b>Шаг 1 из 3 — дата рождения.</b>\n\n` +
      `Пришли в любом удобном формате — я разберу:\n` +
      `<code>15.03.1990</code>  или  <code>1990-03-15</code>  или  <code>15/03/1990</code>`,
  );
}

export async function handleReset(ctx: Context): Promise<void> {
  if (!features.supabase || !ctx.from) return;
  await clearState(ctx.from.id);
  await ctx.replyWithHTML('Сбросила. Напиши /chart и пройдём заново.');
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
      `Не получилось разобрать дату. Попробуй так: <code>15.03.1990</code>`,
    );
    return true;
  }
  await setState(ctx.from!.id, {
    step: 'awaiting_time',
    birthDate: date,
  } satisfies OnboardingState);
  await ctx.replyWithHTML(
    `<b>Шаг 2 из 3 — время рождения.</b>\n\n` +
      `Если знаешь точно — пришли в формате <code>12:30</code>. ` +
      `Если нет — напиши <code>не знаю</code>, посчитаю что смогу (Восход и дома без точного времени не получаются, но Солнце и Луна — да).`,
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
      `Не получилось разобрать время. Попробуй <code>12:30</code>, или напиши <code>не знаю</code>.`,
    );
    return true;
  }
  await setState(ctx.from!.id, {
    step: 'awaiting_place',
    birthDate,
    birthTime: time,
  } satisfies OnboardingState);
  await ctx.replyWithHTML(
    `<b>Шаг 3 из 3 — место рождения.</b>\n\n` +
      `Напиши город. Если городов с таким названием несколько (привет, Владимир и Ростов) — добавь страну для точности:\n` +
      `<code>Москва</code>  или  <code>Владимир, Россия</code>  или  <code>Casablanca, Morocco</code>`,
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
    await ctx.replyWithHTML('Название слишком короткое — попробуй ещё раз.');
    return true;
  }

  let geocoded: GeocodingResult | null;
  try {
    geocoded = await geocode(place, 'ru');
  } catch (err) {
    logger.error({ err, place }, 'Geocoding failed');
    await ctx.replyWithHTML(
      `Сервис, который ищет координаты, сейчас не отвечает. Попробуй через минуту — обычно отпускает быстро.`,
    );
    return true;
  }

  if (!geocoded) {
    await ctx.replyWithHTML(
      `Не нашла такое место. Попробуй уточнить — добавь страну или регион.\n\n` +
        `Например: <code>Владимир, Россия</code> или <code>Ростов-на-Дону</code>`,
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
    `Нашла: <b>${geocoded.displayName}</b>\n` +
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
    await ctx.replyWithHTML('Не поняла ответ. Напиши просто <code>да</code> или <code>нет</code>.');
    return true;
  }

  if (answer === 'no') {
    await setState(ctx.from!.id, {
      step: 'awaiting_place',
      birthDate: state.birthDate,
      birthTime: state.birthTime,
    } satisfies OnboardingState);
    await ctx.replyWithHTML(
      'Поняла. Напиши место ещё раз — лучше с уточнением страны или региона.',
    );
    return true;
  }

  // answer === 'yes' → calculate
  const { geocoded, birthDate, birthTime } = state;

  await ctx.sendChatAction('typing');

  let chart: NatalChart;
  try {
    chart = await calculateChart({
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
      `Что-то сломалось при расчёте — это редко, но бывает. Напиши /chart и пройдём заново.`,
    );
    await clearState(ctx.from!.id);
    return true;
  }

  // Полный портрет через LLM — асинхронно. Сначала юзер видит краткий (выше),
  // потом через 10-30 сек прилетает полноценный разбор. Если LLM упадёт —
  // не страшно, у юзера всё равно есть краткий.
  if (features.llm) {
    generateAndSendPortrait(ctx, chart).catch((err) => {
      logger.error(
        { err: err instanceof Error ? err.message : err, userId: ctx.from?.id },
        'LLM portrait generation failed (non-fatal)',
      );
    });
  }

  return true;
}

/**
 * Асинхронная генерация полного портрета через LLM и отправка юзеру.
 * Запускается после краткого портрета. Ошибки не критичны — у юзера уже есть базовый ответ.
 */
async function generateAndSendPortrait(ctx: Context, chart: NatalChart): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  await ctx.sendChatAction('typing');

  const userName = ctx.from?.first_name ?? undefined;

  const portraitText = await generateNatalPortrait({
    chart,
    userName,
    // TODO: спрашивать пол при онбординге. Пока default 'female' (главная ЦА)
    userGender: 'female',
  });

  await savePortrait(userId, portraitText);

  await ctx.replyWithHTML(
    `<b>Полный портрет</b>\n\n${escapeHtml(portraitText)}`,
  );
}

/** Минимальный HTML-escape для текста от LLM перед replyWithHTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
