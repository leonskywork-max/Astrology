/**
 * CRUD-операции с таблицей users.
 *
 * Состояние онбординга хранится в поле `state` как JSON-строка.
 * Это позволяет переживать рестарты бота без потери прогресса юзера.
 */

import { getSupabase } from './client.ts';

export interface UserRow {
  id: number;
  username: string | null;
  first_name: string | null;
  language_code: string | null;
  timezone: string | null;
  created_at: string;
  last_active: string;
  state: string | null;
  source: string | null;
}

export interface UpsertUserInput {
  id: number;
  username?: string | null;
  first_name?: string | null;
  language_code?: string | null;
}

/**
 * Создаёт юзера или обновляет last_active + базовые поля при повторном заходе.
 */
export async function upsertUser(input: UpsertUserInput): Promise<UserRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: input.id,
        username: input.username ?? null,
        first_name: input.first_name ?? null,
        language_code: input.language_code ?? null,
        last_active: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: false },
    )
    .select()
    .single();

  if (error) throw new Error(`upsertUser failed: ${error.message}`);
  return data as UserRow;
}

export async function getUser(id: number): Promise<UserRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getUser failed: ${error.message}`);
  return data as UserRow | null;
}

/** Сохраняет произвольный JSON-объект состояния онбординга */
export async function setState(userId: number, state: unknown): Promise<void> {
  const supabase = getSupabase();
  const value = state === null ? null : JSON.stringify(state);
  const { error } = await supabase.from('users').update({ state: value }).eq('id', userId);
  if (error) throw new Error(`setState failed: ${error.message}`);
}

export async function getState<T = unknown>(userId: number): Promise<T | null> {
  const user = await getUser(userId);
  if (!user || !user.state) return null;
  try {
    return JSON.parse(user.state) as T;
  } catch {
    return null;
  }
}

export async function clearState(userId: number): Promise<void> {
  await setState(userId, null);
}
