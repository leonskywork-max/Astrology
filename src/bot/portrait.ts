/**
 * Краткий шаблонный портрет на основе натальной карты — без LLM.
 *
 * Используется после онбординга, чтобы пользователь сразу увидел результат.
 * Полный психологический портрет в фирменном тоне (через LLM) — task-105 + task-109.
 */

import type { NatalChart } from '../astro/chart.ts';
import { formatPosition, ZODIAC_SIGNS_RU } from '../astro/zodiac.ts';

export function formatBriefPortrait(chart: NatalChart): string {
  const lines: string[] = [];

  lines.push('<b>Готово. Твоя карта собрана.</b>');
  lines.push('');

  lines.push(`<b>Солнце</b> — ${formatPosition(chart.sun.longitude)}`);
  lines.push(`<b>Луна</b> — ${formatPosition(chart.moon.longitude)}`);

  if (chart.timeAccurate) {
    lines.push(`<b>Восход</b> — ${formatPosition(chart.ascendant.longitude)}`);
  } else {
    lines.push('<i>Восход не рассчитан — без точного времени рождения его не определить.</i>');
  }

  lines.push('');

  const sunSignRu = ZODIAC_SIGNS_RU[chart.sun.sign];
  const moonSignRu = ZODIAC_SIGNS_RU[chart.moon.sign];

  lines.push(
    `Базовый каркас: <b>${sunSignRu}</b> по сути, <b>${moonSignRu}</b> по внутренней температуре.`,
  );

  if (chart.timeAccurate) {
    const ascSignRu = ZODIAC_SIGNS_RU[chart.ascendant.sign];
    lines.push(`На внешнем уровне ты <b>${ascSignRu}</b> — то, как тебя видят с первой минуты.`);
  }

  lines.push('');
  lines.push('<i>Полный психологический портрет на основе всех 10 планет и аспектов — премиум-функция. Пока в разработке.</i>');

  return lines.join('\n');
}
