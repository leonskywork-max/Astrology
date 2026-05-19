/**
 * CRUD-операции с таблицей charts (натальные карты пользователей).
 *
 * chart_data хранится как JSONB — полный результат calculateChart() для
 * последующих транзитов / синастрий / дневных push без перерасчёта.
 */

import { getSupabase } from './client.ts';
import type { NatalChart } from '../astro/chart.ts';

export interface ChartRow {
  user_id: number;
  birth_date: string;
  birth_time: string | null;
  birth_place: string;
  latitude: number;
  longitude: number;
  birth_timezone: string;
  chart_data: NatalChart;
  portrait_text: string | null;
  portrait_generated_at: string | null;
  created_at: string;
}

export interface SaveChartInput {
  userId: number;
  birthDate: string;
  birthTime: string | null;
  birthPlace: string;
  latitude: number;
  longitude: number;
  birthTimezone: string;
  chartData: NatalChart;
}

export async function saveChart(input: SaveChartInput): Promise<ChartRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('charts')
    .upsert(
      {
        user_id: input.userId,
        birth_date: input.birthDate,
        birth_time: input.birthTime,
        birth_place: input.birthPlace,
        latitude: input.latitude,
        longitude: input.longitude,
        birth_timezone: input.birthTimezone,
        chart_data: input.chartData,
      },
      { onConflict: 'user_id', ignoreDuplicates: false },
    )
    .select()
    .single();

  if (error) throw new Error(`saveChart failed: ${error.message}`);
  return data as ChartRow;
}

export async function getChart(userId: number): Promise<ChartRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('charts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`getChart failed: ${error.message}`);
  return data as ChartRow | null;
}

export async function savePortrait(
  userId: number,
  portraitText: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('charts')
    .update({
      portrait_text: portraitText,
      portrait_generated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw new Error(`savePortrait failed: ${error.message}`);
}
