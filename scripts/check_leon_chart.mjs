import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const { data: users, error: uErr } = await supabase.from('users').select('*');
if (uErr) console.log('users error:', uErr.message);
else {
  console.log(`=== Users: ${users.length} ===`);
  for (const u of users) {
    console.log(`  id=${u.id} @${u.username || '?'} (${u.first_name || '?'})  state=${u.state ? 'in_onboarding' : 'idle'}`);
  }
}

console.log();
const { data: charts, error: cErr } = await supabase.from('charts').select('*');
if (cErr) console.log('charts error:', cErr.message);
else {
  console.log(`=== Charts: ${charts.length} ===`);
  for (const c of charts) {
    console.log(`  user_id=${c.user_id}`);
    console.log(`    birth: ${c.birth_date} ${c.birth_time || '(no time)'} ${c.birth_place}`);
    console.log(`    coords: ${c.latitude}, ${c.longitude} (${c.birth_timezone})`);
    const chartData = c.chart_data;
    console.log(`    sun: ${chartData.sun.sign} ${chartData.sun.degree.toFixed(2)}°  house ${chartData.sun.house}`);
    console.log(`    moon: ${chartData.moon.sign} ${chartData.moon.degree.toFixed(2)}°  house ${chartData.moon.house}`);
    console.log(`    asc: ${chartData.ascendant.sign} ${chartData.ascendant.degree.toFixed(2)}°`);
    console.log(`    aspects: ${chartData.aspects.length} total, top: ${chartData.aspects.slice(0, 3).map(a => `${a.planetA}-${a.type}-${a.planetB}`).join(', ')}`);
    console.log(`    created: ${c.created_at}`);
  }
}
