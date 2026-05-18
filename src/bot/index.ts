import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';
import { handleStart, handleChart } from './onboarding.ts';

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegram.botToken);

  bot.start(handleStart);
  bot.command('chart', handleChart);

  bot.command('help', async (ctx) => {
    await ctx.replyWithHTML(
      `<b>Команды Numen:</b>\n\n` +
        `/start — приветствие\n` +
        `/chart — натальная карта (в разработке)\n` +
        `/help — это сообщение\n\n` +
        `<i>Больше команд появится по мере разработки.</i>`,
    );
  });

  // Catch-all для любого текста до завершения онбординга
  bot.on(message('text'), async (ctx) => {
    logger.debug({ text: ctx.message.text, from: ctx.from?.username }, 'Unhandled text');
    await ctx.replyWithHTML(
      'Я пока умею мало. Напиши /start или /help.',
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
