/**
 * Команда /tarot — карта Таро дня.
 *
 * Логика:
 * - Берём детерминированную карту дня по (userId, date)
 * - Проверяем кеш в БД: если уже было сегодня — отдаём сохранённую интерпретацию
 * - Иначе — генерируем через LLM, сохраняем, отправляем
 */

import type { Context } from 'telegraf';
import { dailyCardForUser, formatCardName } from '../astro/tarot.ts';
import { getTodayTarot, saveTodayTarot } from '../db/tarot.ts';
import { upsertUser } from '../db/users.ts';
import { generateTarotInterpretation } from '../llm/tarot.ts';
import { features } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';
import { escapeHtml } from './helpers.ts';

export async function handleTarot(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  if (!features.supabase) {
    await ctx.replyWithHTML(
      '<i>Бот в режиме демо: БД не подключена. Карта Таро дня заработает с настроенной БД.</i>',
    );
    return;
  }

  if (!features.llm) {
    await ctx.replyWithHTML(
      '<i>LLM пока не подключён, интерпретация Таро будет позже.</i>',
    );
    return;
  }

  await upsertUser({
    id: ctx.from.id,
    username: ctx.from.username,
    first_name: ctx.from.first_name,
    language_code: ctx.from.language_code,
  });

  // 1. Карта дня детерминированна по (userId, date)
  const draw = dailyCardForUser(ctx.from.id);

  // 2. Проверяем кеш
  try {
    const cached = await getTodayTarot(ctx.from.id);
    if (cached) {
      await ctx.replyWithHTML(
        `<b>${escapeHtml(formatCardName(draw))}</b>\n\n${escapeHtml(cached.interpretation)}`,
      );
      return;
    }
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : err, userId: ctx.from.id },
      'getTodayTarot failed, will regenerate',
    );
    // продолжаем генерацию
  }

  // 3. Генерируем
  await ctx.replyWithHTML(`<b>Тяну карту дня...</b>`);
  await ctx.sendChatAction('typing');

  let interpretation: string;
  try {
    interpretation = await generateTarotInterpretation({
      draw,
      userName: ctx.from.first_name ?? undefined,
      userGender: 'female', // TODO: спрашивать при онбординге
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : err, userId: ctx.from.id },
      'Tarot interpretation failed',
    );
    await ctx.replyWithHTML(
      'LLM сейчас не отвечает — попробуй через минуту, напиши /tarot снова.',
    );
    return;
  }

  // 4. Сохраняем
  try {
    await saveTodayTarot({
      userId: ctx.from.id,
      draw,
      interpretation,
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : err, userId: ctx.from.id },
      'saveTodayTarot failed (non-fatal)',
    );
    // не падаем — юзер получит карту, просто не сохранится
  }

  await ctx.replyWithHTML(
    `<b>${escapeHtml(formatCardName(draw))}</b>\n\n${escapeHtml(interpretation)}`,
  );
}
