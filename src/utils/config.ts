import 'dotenv/config';

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
    apiKey: required('ANTHROPIC_API_KEY'),
  },

  supabase: {
    url: required('SUPABASE_URL'),
    serviceKey: required('SUPABASE_SERVICE_KEY'),
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
