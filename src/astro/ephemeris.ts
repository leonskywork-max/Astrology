/**
 * Обёртка над Swiss Ephemeris (через npm-пакет sweph).
 *
 * MVP использует встроенный Moshier ephemeris (без внешних файлов) —
 * точность ±10 arcsec на интервале 3000 BC ... 3000 AD, более чем достаточно
 * для астрологических интерпретаций. Если в будущем понадобится максимальная
 * точность — скачать sepl_*.se1 и semo_*.se1 файлы с www.astro.com/ftp/swisseph/ephe/
 * и положить в src/astro/ephe/, затем переключиться на SEFLG_SWIEPH.
 */

import sweph from 'sweph';
import { DateTime } from 'luxon';

const FLAGS = sweph.constants.SEFLG_SPEED | sweph.constants.SEFLG_MOSEPH;

export type PlanetId =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'mean_node'
  | 'true_node'
  | 'mean_lilith';

const PLANET_IDS: Record<PlanetId, number> = {
  sun: sweph.constants.SE_SUN,
  moon: sweph.constants.SE_MOON,
  mercury: sweph.constants.SE_MERCURY,
  venus: sweph.constants.SE_VENUS,
  mars: sweph.constants.SE_MARS,
  jupiter: sweph.constants.SE_JUPITER,
  saturn: sweph.constants.SE_SATURN,
  uranus: sweph.constants.SE_URANUS,
  neptune: sweph.constants.SE_NEPTUNE,
  pluto: sweph.constants.SE_PLUTO,
  mean_node: sweph.constants.SE_MEAN_NODE,
  true_node: sweph.constants.SE_TRUE_NODE,
  mean_lilith: sweph.constants.SE_MEAN_APOG, // Black Moon Lilith (mean)
};

export interface RawPlanetPosition {
  /** Эклиптическая долгота (0..360) */
  longitude: number;
  /** Эклиптическая широта */
  latitude: number;
  /** Расстояние в AU */
  distance: number;
  /** Скорость по долготе (deg/day). Отрицательная = ретроградная */
  longitudeSpeed: number;
  /** true если планета ретроградная (скорость < 0) */
  retrograde: boolean;
}

/**
 * Конвертация момента времени (с учётом таймзоны рождения) в Julian Day UT.
 *
 * birthTime может быть null, если пользователь не знает точное время —
 * тогда используем 12:00 как nominal "noon chart" (известная астрологическая
 * практика для неизвестного времени).
 */
export function toJulianDay(
  birthDate: string,
  birthTime: string | null,
  timezone: string,
): number {
  const time = birthTime ?? '12:00';
  const local = DateTime.fromISO(`${birthDate}T${time}`, { zone: timezone });

  if (!local.isValid) {
    throw new Error(
      `Invalid date/time/timezone: ${birthDate} ${time} ${timezone} — ${local.invalidExplanation}`,
    );
  }

  const utc = local.toUTC();
  const hour = utc.hour + utc.minute / 60 + utc.second / 3600;

  return sweph.julday(utc.year, utc.month, utc.day, hour, sweph.constants.SE_GREG_CAL);
}

export function getPlanetPosition(jd: number, planet: PlanetId): RawPlanetPosition {
  const planetId = PLANET_IDS[planet];
  const result = sweph.calc_ut(jd, planetId, FLAGS);

  if (result.flag < 0) {
    throw new Error(`Swiss Ephemeris error for ${planet}: ${result.error}`);
  }

  const [longitude, latitude, distance, longitudeSpeed] = result.data;

  return {
    longitude,
    latitude,
    distance,
    longitudeSpeed,
    retrograde: longitudeSpeed < 0,
  };
}

export interface HousesResult {
  /**
   * Куспиды 12 домов. Длина массива = 12, индексация 0..11
   * (куспид дома N — это cusps[N-1]).
   */
  cusps: number[];
  ascendant: number;
  midheaven: number;
}

export type HouseSystem = 'P' | 'K' | 'E' | 'W'; // Placidus, Koch, Equal, Whole-Sign

/**
 * Расчёт куспидов домов.
 *
 * Дефолтная система — Placidus (самая распространённая на Западе).
 * Для высоких широт (>66°) Placidus может выдавать странные результаты —
 * для таких случаев лучше Whole-Sign ('W').
 */
export function getHouses(
  jd: number,
  latitude: number,
  longitude: number,
  system: HouseSystem = 'P',
): HousesResult {
  const result = sweph.houses(jd, latitude, longitude, system);

  if (result.flag < 0) {
    throw new Error('Swiss Ephemeris houses calculation failed');
  }

  return {
    cusps: result.data.houses,
    ascendant: result.data.points[0]!, // ASC
    midheaven: result.data.points[1]!, // MC
  };
}

/**
 * Определить, в каком из 12 домов находится точка с заданной эклиптической
 * долготой. Дома задаются массивом куспидов длиной 12 (индексы 0..11,
 * где cusps[N-1] — куспид дома N).
 */
export function houseOf(longitude: number, cusps: number[]): number {
  const norm = ((longitude % 360) + 360) % 360;

  for (let i = 0; i < 12; i++) {
    const cusp = cusps[i]!;
    const nextCusp = cusps[(i + 1) % 12]!;

    if (cusp < nextCusp) {
      if (norm >= cusp && norm < nextCusp) return i + 1;
    } else {
      // Пересекает 0° (например, cusps[11] = 350°, cusps[0] = 20°)
      if (norm >= cusp || norm < nextCusp) return i + 1;
    }
  }
  return 1;
}
