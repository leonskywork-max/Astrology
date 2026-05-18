/**
 * Онбординг пользователя.
 *
 * Сценарий: /start → приветствие → дата → время → место → расчёт → портрет.
 * Реализация — в task-104. Сейчас здесь только функция приветствия для /start.
 */

import type { Context } from 'telegraf';
import { logger } from '../utils/logger.ts';

const WELCOME_MESSAGE = `<b>Numen.</b>

Не астролог. Не гадалка. Скорее наблюдатель с хорошим прицелом.

Чтобы что-то полезное про тебя сказать — нужна твоя натальная карта. Это про дату, время и место рождения. Без них всё, что я могу — это общие гороскопы про знаки, а они мало что про тебя говорят.

Готова? Напиши /chart, и пойдём по шагам.`;

export async function handleStart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  logger.info({ userId, username: ctx.from?.username }, 'User started bot');
  await ctx.replyWithHTML(WELCOME_MESSAGE);
}

export async function handleChart(ctx: Context): Promise<void> {
  // task-104 — здесь будет полный сценарий с состоянием
  await ctx.replyWithHTML(
    'Сценарий онбординга — в разработке (task-104).\n\n' +
      '<i>Пока что бот умеет только здороваться.</i>',
  );
}
