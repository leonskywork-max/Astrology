/**
 * Расчёт натальной карты — основной модуль астрорасчётов.
 *
 * Принимает дату/время/место рождения, возвращает позиции 10 планет +
 * Лилит + узлы, куспиды домов, асцендент, MC и топ-аспекты.
 *
 * Под капотом — Swiss Ephemeris (Moshier fallback, точность ±10 arcsec).
 * См. src/astro/ephemeris.ts для подробностей.
 */

import {
  getHouses,
  getPlanetPosition,
  houseOf,
  toJulianDay,
  type PlanetId,
} from './ephemeris.ts';
import { longitudeToSign, type ZodiacSign } from './zodiac.ts';
import { findAspects } from './aspects.ts';

export interface NatalChartInput {
  birthDate: string; // ISO 8601 date (YYYY-MM-DD)
  birthTime: string | null; // HH:mm в локальном времени рождения, null если неизвестно
  latitude: number;
  longitude: number;
  timezone: string; // IANA timezone (e.g. "Europe/Moscow")
}

export interface PlanetPosition {
  sign: ZodiacSign;
  degree: number; // 0..29.99 внутри знака
  longitude: number; // 0..360 эклиптическая долгота
  house: number; // 1..12
  retrograde: boolean;
}

export interface Aspect {
  planetA: string;
  planetB: string;
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number; // в градусах
}

export interface NatalChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  uranus: PlanetPosition;
  neptune: PlanetPosition;
  pluto: PlanetPosition;
  northNode: PlanetPosition;
  lilith: PlanetPosition;
  ascendant: { sign: ZodiacSign; degree: number; longitude: number };
  midheaven: { sign: ZodiacSign; degree: number; longitude: number };
  houses: number[]; // куспиды 12 домов, индексы 1..12
  aspects: Aspect[];
  /** Был ли указан точный birthTime. При false дома и асцендент условны (noon chart). */
  timeAccurate: boolean;
}

/** Маппинг наших ключей в NatalChart к ID в sweph */
const PLANET_MAP: Record<keyof Omit<NatalChart, 'ascendant' | 'midheaven' | 'houses' | 'aspects' | 'timeAccurate'>, PlanetId> = {
  sun: 'sun',
  moon: 'moon',
  mercury: 'mercury',
  venus: 'venus',
  mars: 'mars',
  jupiter: 'jupiter',
  saturn: 'saturn',
  uranus: 'uranus',
  neptune: 'neptune',
  pluto: 'pluto',
  northNode: 'true_node',
  lilith: 'mean_lilith',
};

/** Английские имена для функции аспектов (соответствуют zodiac.ZODIAC_SIGNS-style капитализация) */
const PLANET_NAMES_EN: Record<keyof typeof PLANET_MAP, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  northNode: 'NorthNode',
  lilith: 'Lilith',
};

export async function calculateChart(input: NatalChartInput): Promise<NatalChart> {
  const jd = toJulianDay(input.birthDate, input.birthTime, input.timezone);
  const houses = getHouses(jd, input.latitude, input.longitude, 'P');

  const planets = {} as Record<keyof typeof PLANET_MAP, PlanetPosition>;

  for (const [key, sweId] of Object.entries(PLANET_MAP) as [
    keyof typeof PLANET_MAP,
    PlanetId,
  ][]) {
    const raw = getPlanetPosition(jd, sweId);
    const { sign, degree } = longitudeToSign(raw.longitude);
    planets[key] = {
      sign,
      degree,
      longitude: raw.longitude,
      house: houseOf(raw.longitude, houses.cusps),
      retrograde: raw.retrograde,
    };
  }

  const ascSignDeg = longitudeToSign(houses.ascendant);
  const mcSignDeg = longitudeToSign(houses.midheaven);

  const aspects = findAspects(
    Object.entries(PLANET_NAMES_EN).map(([key, name]) => ({
      name,
      longitude: planets[key as keyof typeof PLANET_MAP].longitude,
    })),
  );

  return {
    ...planets,
    ascendant: {
      sign: ascSignDeg.sign,
      degree: ascSignDeg.degree,
      longitude: houses.ascendant,
    },
    midheaven: {
      sign: mcSignDeg.sign,
      degree: mcSignDeg.degree,
      longitude: houses.midheaven,
    },
    houses: houses.cusps,
    aspects,
    timeAccurate: input.birthTime !== null,
  };
}
