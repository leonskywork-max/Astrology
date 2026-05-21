/**
 * CRUD для tarot_readings — кеш карт Таро дня.
 *
 * Логика: один юзер видит одну и ту же карту в течение дня.
 * Карта детерминированна (date+userId как seed), интерпретация
 * сохраняется при первом вызове, при повторном — отдаётся из кеша.
 */

import { getSupabase } from './client.ts';
import type { TarotDraw } from '../astro/tarot.ts';

export interface TarotReadingRow {
  id: number;
  user_id: number;
  reading_date: string; // YYYY-MM-DD
  cards: { id: string; nameRu: string; nameEn: string; reversed: boolean }[];
  interpretation: string;
  created_at: string;
}

/**
 * Возвращает сегодняшнее чтение Таро для юзера, если уже есть.
 */
export async function getTodayTarot(
  userId: number,
  date: Date = new Date(),
): Promise<TarotReadingRow | null> {
  const supabase = getSupabase();
  const dateStr = date.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('tarot_readings')
    .select('*')
    .eq('user_id', userId)
    .eq('reading_date', dateStr)
    .maybeSingle();

  if (error) throw new Error(`getTodayTarot failed: ${error.message}`);
  return data as TarotReadingRow | null;
}

/**
 * Сохраняет сегодняшнее чтение Таро для юзера.
 */
export async function saveTodayTarot(opts: {
  userId: number;
  draw: TarotDraw;
  interpretation: string;
  date?: Date;
}): Promise<void> {
  const supabase = getSupabase();
  const date = opts.date ?? new Date();
  const dateStr = date.toISOString().slice(0, 10);

  const { error } = await supabase.from('tarot_readings').insert({
    user_id: opts.userId,
    reading_date: dateStr,
    cards: [
      {
        id: opts.draw.card.id,
        nameRu: opts.draw.card.nameRu,
        nameEn: opts.draw.card.nameEn,
        reversed: opts.draw.reversed,
      },
    ],
    interpretation: opts.interpretation,
  });

  if (error) throw new Error(`saveTodayTarot failed: ${error.message}`);
}
