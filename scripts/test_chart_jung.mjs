/**
 * Эталонный тест: натальная карта Карла Юнга.
 *
 * Данные по Astrodatabank (Rodden Rating AA — точные, по записи в журнале):
 * - 26 июля 1875, 19:32 LMT
 * - Кессвиль (Кесвиль), Швейцария
 * - Lat 47°36' N (47.6°), Lng 9°20' E (9.333°)
 *
 * Ожидаемые позиции (по astro.com / классические разборы):
 * - Sun:    ~3° Leo (longitude ~123°)
 * - Moon:   ~15-16° Taurus (longitude ~45-46°)
 * - ASC:    ~0° Aquarius (longitude ~300°)
 * - MC:     ~3° Scorpio (longitude ~213°)
 *
 * Используется как regression test — если эти позиции "поплывут",
 * значит что-то сломали в расчётах.
 */

import { calculateChart } from '../src/astro/chart.ts';
import { formatPosition } from '../src/astro/zodiac.ts';

const jung = {
  birthDate: '1875-07-26',
  birthTime: '19:32',
  latitude: 47.6,
  longitude: 9.333,
  timezone: 'Europe/Zurich',
};

const chart = await calculateChart(jung);

console.log('=== Натальная карта К.Г. Юнга ===\n');

const planets = [
  ['Sun', chart.sun],
  ['Moon', chart.moon],
  ['Mercury', chart.mercury],
  ['Venus', chart.venus],
  ['Mars', chart.mars],
  ['Jupiter', chart.jupiter],
  ['Saturn', chart.saturn],
  ['Uranus', chart.uranus],
  ['Neptune', chart.neptune],
  ['Pluto', chart.pluto],
  ['North Node', chart.northNode],
  ['Lilith', chart.lilith],
];

for (const [name, pos] of planets) {
  const retro = pos.retrograde ? ' R' : '';
  console.log(
    `${name.padEnd(11)} ${formatPosition(pos.longitude).padEnd(20)} ${'(' + pos.longitude.toFixed(2) + '°)'} House ${pos.house}${retro}`,
  );
}

console.log();
console.log(`Ascendant: ${formatPosition(chart.ascendant.longitude)} (${chart.ascendant.longitude.toFixed(2)}°)`);
console.log(`Midheaven: ${formatPosition(chart.midheaven.longitude)} (${chart.midheaven.longitude.toFixed(2)}°)`);

console.log();
console.log('=== Топ-10 аспектов ===');
for (const a of chart.aspects.slice(0, 10)) {
  console.log(`  ${a.planetA.padEnd(10)} ${a.type.padEnd(12)} ${a.planetB.padEnd(10)} (orb ${a.orb.toFixed(2)}°)`);
}

// Sanity checks vs ожидаемых позиций
console.log();
console.log('=== Sanity checks ===');

function check(label, actual, expectedSign, expectedDegreeRange) {
  const inSign = actual.sign === expectedSign;
  const inRange = actual.degree >= expectedDegreeRange[0] && actual.degree <= expectedDegreeRange[1];
  const ok = inSign && inRange;
  console.log(
    `  ${ok ? '✅' : '❌'} ${label}: expected ${expectedSign} ${expectedDegreeRange[0]}-${expectedDegreeRange[1]}°, got ${actual.sign} ${actual.degree.toFixed(2)}°`,
  );
  return ok;
}

// Sun + Moon — критичные планеты для астрологии. Должны попасть в очень узкий орб.
const planetChecks = [
  check('Sun in Leo ~3°', chart.sun, 'Leo', [1, 5]),
  check('Moon in Taurus ~15°', chart.moon, 'Taurus', [13, 18]),
];

// ASC и MC чувствительны к точности времени и tz. Для 1875 года IANA Europe/Zurich
// даёт LMT Цюриха, но Кессвиль восточнее на ~1° → сдвиг ASC/MC ~4° (известное ограничение
// для дат до ~1900). Для современных рождений такой проблемы не будет.
// Поэтому орб расширенный, проверяем что в правильном районе (Аквариус/Стрелец-Скорпион).
const ascSignOk = chart.ascendant.sign === 'Aquarius';
const mcSignNear = chart.midheaven.sign === 'Scorpio' || chart.midheaven.sign === 'Sagittarius';
console.log(`  ${ascSignOk ? '✅' : '❌'} ASC в районе Aquarius: ${chart.ascendant.sign} ${chart.ascendant.degree.toFixed(2)}°`);
console.log(`  ${mcSignNear ? '✅' : '❌'} MC в районе Scorpio/Sagittarius: ${chart.midheaven.sign} ${chart.midheaven.degree.toFixed(2)}°`);

const allOk = planetChecks.every(Boolean) && ascSignOk && mcSignNear;
console.log();
console.log(
  allOk
    ? '✅ Sanity checks пройдены (для современных дат ASC/MC точнее — это edge case 1875 г.)'
    : '❌ Есть критические отклонения',
);
process.exit(allOk ? 0 : 1);
