/**
 * Расчёт аспектов между планетами.
 *
 * MVP: только мажорные аспекты (5 штук) с орбами по умолчанию.
 * Минорные — в task-105+ если понадобятся.
 */

import type { Aspect } from './chart.ts';

interface AspectDefinition {
  type: Aspect['type'];
  angle: number;
  orb: number;
  /** Орб с участием Солнца или Луны (расширенный) */
  luminaryOrb: number;
}

const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { type: 'conjunction', angle: 0, orb: 6, luminaryOrb: 8 },
  { type: 'sextile', angle: 60, orb: 4, luminaryOrb: 6 },
  { type: 'square', angle: 90, orb: 6, luminaryOrb: 8 },
  { type: 'trine', angle: 120, orb: 6, luminaryOrb: 8 },
  { type: 'opposition', angle: 180, orb: 6, luminaryOrb: 8 },
];

const LUMINARIES = new Set(['Sun', 'Moon']);

/**
 * Угловое расстояние между двумя точками на круге [0, 180].
 */
function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

interface PlanetForAspects {
  name: string;
  longitude: number;
}

export function findAspects(planets: PlanetForAspects[]): Aspect[] {
  const aspects: Aspect[] = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i]!;
      const b = planets[j]!;
      const distance = angularDistance(a.longitude, b.longitude);
      const isLuminaryPair = LUMINARIES.has(a.name) || LUMINARIES.has(b.name);

      for (const def of ASPECT_DEFINITIONS) {
        const orb = isLuminaryPair ? def.luminaryOrb : def.orb;
        const deviation = Math.abs(distance - def.angle);
        if (deviation <= orb) {
          aspects.push({
            planetA: a.name,
            planetB: b.name,
            type: def.type,
            orb: deviation,
          });
          break; // одна пара — один аспект (не приписываем несколько)
        }
      }
    }
  }

  // Сортируем по плотности: точные аспекты в начале
  aspects.sort((x, y) => x.orb - y.orb);
  return aspects;
}
