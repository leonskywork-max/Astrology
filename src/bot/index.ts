import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from '../utils/config.ts';
import { logger } from '../utils/logger.ts';
import {
  handleChart,
  handleOnboardingText,
  handlePortrait,
  handleReset,
  handleStart,
} from './onboarding.ts';
import { handleTarot } from './tarot.ts';
import { handleToday } from './horoscope.ts';

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegram.botToken);

  bot.start(handleStart);
  bot.command('chart', handleChart);
  bot.command('portrait', handlePortrait);
  bot.command('tarot', handleTarot);
  bot.command('today', handleToday);
  bot.command('resetchart', handleReset);

  bot.command('help', async (ctx) => {
    await ctx.replyWithHTML(
      `<b>Команды Numen:</b>\n\n` +
        `/start — приветствие\n` +
        `/chart — собрать натальную карту\n` +
        `/portrait — полный портрет по твоей карте\n` +
        `/tarot — карта Таро дня\n` +
        `/today — гороскоп дня по твоему знаку\n` +
        `/resetchart — сбросить и собрать карту заново\n` +
        `/help — это сообщение\n\n` +
        `<i>Скоро: синастрия с партнёром (виральная функция).</i>`,
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
