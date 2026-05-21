/**
 * Расчёт текущих транзитов — позиции планет в небе на конкретный момент.
 *
 * Используется для:
 * - Гороскопа дня по солнечному знаку (текущие быстрые планеты vs знак)
 * - Daily push (транзиты к натальной карте юзера)
 *
 * Расчёты через тот же sweph что и для натальных карт.
 */

import { DateTime } from 'luxon';
import sweph from 'sweph';
import { getPlanetPosition, type PlanetId } from './ephemeris.ts';
import { longitudeToSign, ZODIAC_SIGNS, type ZodiacSign } from './zodiac.ts';

export interface CurrentPlanet {
  planet: PlanetId;
  sign: ZodiacSign;
  degree: number;
  longitude: number;
  retrograde: boolean;
}

export interface CurrentSky {
  /** ISO timestamp на который посчитано */
  timestamp: string;
  sun: CurrentPlanet;
  moon: CurrentPlanet;
  mercury: CurrentPlanet;
  venus: CurrentPlanet;
  mars: CurrentPlanet;
  jupiter: CurrentPlanet;
  saturn: CurrentPlanet;
  /** Список планет, идущих ретроградно сейчас */
  retrogrades: PlanetId[];
}

const PLANETS_TO_TRACK: PlanetId[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
];

function toJulianDay(date: Date): number {
  const dt = DateTime.fromJSDate(date).toUTC();
  const hour = dt.hour + dt.minute / 60 + dt.second / 3600;
  return sweph.julday(dt.year, dt.month, dt.day, hour, sweph.constants.SE_GREG_CAL);
}

/**
 * Возвращает текущие позиции основных планет.
 */
export function getCurrentSky(date: Date = new Date()): CurrentSky {
  const jd = toJulianDay(date);

  const positions: Partial<Record<PlanetId, CurrentPlanet>> = {};
  const retrogrades: PlanetId[] = [];

  for (const planet of PLANETS_TO_TRACK) {
    const raw = getPlanetPosition(jd, planet);
    const { sign, degree } = longitudeToSign(raw.longitude);
    positions[planet] = {
      planet,
      sign,
      degree,
      longitude: raw.longitude,
      retrograde: raw.retrograde,
    };
    if (raw.retrograde && planet !== 'sun' && planet !== 'moon') {
      retrogrades.push(planet);
    }
  }

  return {
    timestamp: date.toISOString(),
    sun: positions.sun!,
    moon: positions.moon!,
    mercury: positions.mercury!,
    venus: positions.venus!,
    mars: positions.mars!,
    jupiter: positions.jupiter!,
    saturn: positions.saturn!,
    retrogrades,
  };
}

/**
 * Парсит "Aries"/"Taurus"/etc или русское "Овен"/"Телец"/etc в ZodiacSign.
 * Регистронезависимый.
 */
const RU_TO_EN: Record<string, ZodiacSign> = {
  овен: 'Aries',
  телец: 'Taurus',
  близнецы: 'Gemini',
  рак: 'Cancer',
  лев: 'Leo',
  дева: 'Virgo',
  весы: 'Libra',
  скорпион: 'Scorpio',
  стрелец: 'Sagittarius',
  козерог: 'Capricorn',
  водолей: 'Aquarius',
  рыбы: 'Pisces',
};

export function parseZodiacSign(s: string): ZodiacSign | null {
  const norm = s.trim().toLowerCase();

  const ru = RU_TO_EN[norm];
  if (ru) return ru;

  const en = ZODIAC_SIGNS.find((z) => z.toLowerCase() === norm);
  return en ?? null;
}
