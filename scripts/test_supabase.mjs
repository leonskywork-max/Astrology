import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.from('users').select('id').limit(1);

if (error) {
  if (
    error.code === 'PGRST205' ||
    error.message.includes('does not exist') ||
    error.message.includes('schema cache') ||
    error.message.includes('Could not find')
  ) {
    console.log('✅ Supabase connection OK — таблица "users" не существует (нужна миграция)');
    console.log('   Error:', error.message);
  } else {
    console.log('⚠️ Supabase error:', error.code, error.message);
  }
} else {
  console.log('✅ Supabase OK — таблица "users" существует, rows:', data?.length || 0);
}
