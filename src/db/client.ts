import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, features } from '../utils/config.ts';

let cached: SupabaseClient | null = null;

/**
 * Возвращает Supabase client. Создаётся лениво, чтобы при отсутствии env
 * импорт этого модуля не падал — это даёт возможность тестировать
 * не-БД-зависимые сценарии (например, /start) без настроенной Supabase.
 */
export function getSupabase(): SupabaseClient {
  if (!features.supabase) {
    throw new Error(
      'Supabase не настроен. Заполни SUPABASE_URL и SUPABASE_SERVICE_KEY в .env',
    );
  }
  if (!cached) {
    cached = createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: { persistSession: false },
    });
  }
  return cached;
}
