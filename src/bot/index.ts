import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';
import {
  handleChart,
  handleOnboardingText,
  handleReset,
  handleStart,
} from './onboarding.ts';

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegram.botToken);

  bot.start(handleStart);
  bot.command('chart', handleChart);
  bot.command('resetchart', handleReset);

  bot.command('help', async (ctx) => {
    await ctx.replyWithHTML(
      `<b>Команды Numen:</b>\n\n` +
        `/start — приветствие\n` +
        `/chart — собрать натальную карту\n` +
        `/resetchart — сбросить состояние онбординга\n` +
        `/help — это сообщение\n\n` +
        `<i>Больше команд появится по мере разработки.</i>`,
    );
  });

  // Text handler: сначала проверяем, не в онбординге ли юзер
  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text;

    // Команды (начинаются с /) обрабатываются выше — сюда попадает только обычный текст
    const handled = await handleOnboardingText(ctx, text);
    if (handled) return;

    logger.debug({ text, from: ctx.from?.username }, 'Unhandled text');
    await ctx.replyWithHTML(
      'Я пока умею мало. Напиши /chart, чтобы собрать твою натальную карту, или /help для списка команд.',
    );
  });

  bot.catch((err, ctx) => {
    logger.error(
      { err, updateType: ctx.updateType, userId: ctx.from?.id },
      'Bot error',
    );
  });

  return bot;
}
