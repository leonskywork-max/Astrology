/**
 * Команда /today — гороскоп дня по солнечному знаку пользователя.
 *
 * Берёт солнечный знак из сохранённой натальной карты юзера.
 * Если карты нет — отправляет в /chart.
 *
 * MVP: генерирует каждый раз (нет кеша по знаку). В фазе 2 — task-107
 * добавит cron-задачу в 7:30 которая генерирует 12 гороскопов сразу,
 * /today отдаёт из кеша.
 */

import type { Context } from 'telegraf';
import { getChart } from '../db/charts.ts';
import { upsertUser } from '../db/users.ts';
import { getCurrentSky } from '../astro/transits.ts';
import { generateDailyHoroscope } from '../llm/horoscope.ts';
import { features } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';
import { escapeHtml } from './helpers.ts';

export async function handleToday(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  if (!features.supabase) {
    await ctx.replyWithHTML(
      '<i>Бот в режиме демо: БД не подключена.</i>',
    );
    return;
  }
  if (!features.llm) {
    await ctx.replyWithHTML(
      '<i>LLM пока не подключён, гороскоп дня заработает позже.</i>',
    );
    return;
  }

  await upsertUser({
    id: ctx.from.id,
    username: ctx.from.username,
    first_name: ctx.from.first_name,
    language_code: ctx.from.language_code,
  });

  const chart = await getChart(ctx.from.id);
  if (!chart) {
    await ctx.replyWithHTML(
      'Чтобы дать тебе гороскоп дня, нужен твой знак. Напиши /chart — это две минуты.',
    );
    return;
  }

  const sunSign = chart.chart_data.sun.sign;
  const sky = getCurrentSky();

  await ctx.sendChatAction('typing');

  let horoscope: string;
  try {
    horoscope = await generateDailyHoroscope({
      sunSign,
      sky,
      userName: ctx.from.first_name ?? undefined,
      userGender: 'female', // TODO: спрашивать при онбординге
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : err, userId: ctx.from.id },
      'Horoscope generation failed',
    );
    await ctx.replyWithHTML(
      'LLM сейчас не отвечает — попробуй через минуту, /today снова.',
    );
    return;
  }

  await ctx.replyWithHTML(escapeHtml(horoscope));
}
