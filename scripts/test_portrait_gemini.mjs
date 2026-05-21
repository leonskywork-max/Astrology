/**
 * Live-тест: берём сохранённую карту Леона из БД, гоним через LLM,
 * печатаем полный портрет. Не трогает бот, не отправляет ничего юзеру.
 *
 * Запуск: npx tsx scripts/test_portrait_gemini.mjs [user_id]
 * Default user_id = Леон (359733022)
 */

import { getChart } from '../src/db/charts.ts';
import { generateNatalPortrait } from '../src/llm/portrait.ts';

const userId = Number(process.argv[2] ?? '359733022');

console.log(`\n=== Загружаю карту для user_id=${userId} ===\n`);

const chart = await getChart(userId);
if (!chart) {
  console.error(`❌ Карта для user_id=${userId} не найдена в БД`);
  process.exit(1);
}

console.log(`Дата: ${chart.birth_date}`);
console.log(`Время: ${chart.birth_time ?? 'не указано'}`);
console.log(`Место: ${chart.birth_place}`);
console.log(`Tz: ${chart.birth_timezone}`);
console.log(`Sun: ${chart.chart_data.sun.sign} ${chart.chart_data.sun.degree.toFixed(2)}°`);
console.log(`Moon: ${chart.chart_data.moon.sign} ${chart.chart_data.moon.degree.toFixed(2)}°`);
console.log(`Аспектов: ${chart.chart_data.aspects.length}`);

console.log(`\n=== Зову LLM (gemini-2.5-pro) ===\n`);

const startedAt = Date.now();

try {
  const portrait = await generateNatalPortrait({
    chart: chart.chart_data,
    userName: 'Леон',
    userGender: 'male',
  });

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`\n=== Готово за ${elapsedSec}s, длина ${portrait.length} знаков ===\n`);
  console.log('━'.repeat(60));
  console.log(portrait);
  console.log('━'.repeat(60));
} catch (err) {
  console.error('\n❌ Ошибка генерации:', err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
}
