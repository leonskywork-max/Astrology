/**
 * Тест геокодинга на нескольких местах.
 * Между запросами — пауза 1.1 секунды (Nominatim rate limit).
 */

import { geocode } from '../src/astro/geocode.ts';

const cases = [
  { input: 'Москва', expectedTz: 'Europe/Moscow' },
  { input: 'Ковров', expectedTz: 'Europe/Moscow' },
  { input: 'Санкт-Петербург', expectedTz: 'Europe/Moscow' },
  { input: 'Владивосток', expectedTz: 'Asia/Vladivostok' },
  { input: 'Тбилиси', expectedTz: 'Asia/Tbilisi' },
  { input: 'Нью-Йорк', expectedTz: 'America/New_York' },
  { input: 'Kesswil, Switzerland', expectedTz: 'Europe/Zurich' },
  { input: 'абракадабра-несуществующее-место-зззз', expectedTz: null },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;

for (const c of cases) {
  try {
    const result = await geocode(c.input);
    if (c.expectedTz === null) {
      if (result === null) {
        console.log(`✅ "${c.input}" → not found (как и ожидалось)`);
        pass++;
      } else {
        console.log(`❌ "${c.input}" → нашёл ${result.displayName}, а должен был не найти`);
        fail++;
      }
    } else {
      if (!result) {
        console.log(`❌ "${c.input}" → не найдено, ожидался ${c.expectedTz}`);
        fail++;
      } else if (result.timezone !== c.expectedTz) {
        console.log(
          `❌ "${c.input}" → ${result.timezone} (ожидалось ${c.expectedTz})  [${result.displayName}]`,
        );
        fail++;
      } else {
        console.log(
          `✅ "${c.input}" → ${result.timezone}  lat=${result.latitude.toFixed(3)} lng=${result.longitude.toFixed(3)}`,
        );
        pass++;
      }
    }
  } catch (err) {
    console.log(`❌ "${c.input}" → ошибка:`, err.message);
    fail++;
  }
  await sleep(1100);
}

console.log();
console.log(`Итого: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
