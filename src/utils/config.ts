import 'dotenv/config';

// Bootstrap-модуль: не импортирует logger, чтобы избежать circular dep.
// Pre-логгер для warnings до инициализации pino — простой console.warn.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}. See .env.example.`);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

/**
 * Опциональный секрет: можно быть пустым на dev-машине, но предупреждаем,
 * чтобы зависимый код знал, что соответствующий сервис не настроен.
 */
function optionalSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    // eslint-disable-next-line no-console
    console.warn(`[config] env ${name} не задан — сервис будет недоступен`);
    return '';
  }
  return value;
}

export const config = {
  env: optional('NODE_ENV', 'development') as 'development' | 'production',
  logLevel: optional('LOG_LEVEL', 'info'),

  telegram: {
    botToken: required('BOT_TOKEN'),
    webhookDomain: optional('BOT_WEBHOOK_DOMAIN'),
    webhookSecret: optional('BOT_WEBHOOK_SECRET'),
    channelId: optional('CHANNEL_ID'),
    adminChatId: optional('ADMIN_CHAT_ID'),
  },

  anthropic: {
    apiKey: optionalSecret('ANTHROPIC_API_KEY'),
  },

  supabase: {
    url: optionalSecret('SUPABASE_URL'),
    serviceKey: optionalSecret('SUPABASE_SERVICE_KEY'),
  },

  payments: {
    yookassaShopId: optional('YOOKASSA_SHOP_ID'),
    yookassaSecretKey: optional('YOOKASSA_SECRET_KEY'),
  },

  geo: {
    googleMapsApiKey: optional('GOOGLE_MAPS_API_KEY'),
  },

  monitoring: {
    sentryDsn: optional('SENTRY_DSN'),
  },
} as const;

export const isProduction = config.env === 'production';
export const isDevelopment = config.env === 'development';

export const features = {
  anthropic: Boolean(config.anthropic.apiKey),
  supabase: Boolean(config.supabase.url && config.supabase.serviceKey),
  payments: Boolean(config.payments.yookassaShopId && config.payments.yookassaSecretKey),
} as const;
