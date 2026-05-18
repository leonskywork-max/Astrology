/**
 * Numen — точка входа.
 *
 * Запуск в development: `npm run dev` (tsx watch).
 * Запуск в production: см. деплой в task-114.
 */

import { createBot } from './bot/index.ts';
import { config, isProduction } from './utils/config.ts';
import { logger } from './utils/logger.ts';

async function main(): Promise<void> {
  logger.info({ env: config.env, node: process.version }, 'Starting Numen');

  const bot = createBot();

  if (isProduction && config.telegram.webhookDomain) {
    const webhookUrl = `${config.telegram.webhookDomain}/webhook`;
    await bot.telegram.setWebhook(webhookUrl, {
      secret_token: config.telegram.webhookSecret || undefined,
    });
    logger.info({ webhookUrl }, 'Webhook registered');
    // HTTP-сервер для webhook будет в task-114 при деплое
  } else {
    await bot.launch();
    logger.info('Bot launched in long-polling mode');
  }

  // Graceful shutdown
  const stop = (signal: string) => {
    logger.info({ signal }, 'Stopping bot');
    bot.stop(signal);
    process.exit(0);
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Fatal error in main');
  process.exit(1);
});
