import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../utils/config.ts';

export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: { persistSession: false },
  },
);
