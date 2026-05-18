/**
 * Расчёт натальной карты через Swiss Ephemeris.
 *
 * Реализация — в task-102. Сейчас это заглушка с контрактом типов,
 * чтобы остальной код мог импортировать функции.
 */

export interface NatalChartInput {
  birthDate: string; // ISO 8601 date (YYYY-MM-DD)
  birthTime: string | null; // HH:mm в локальном времени рождения, null если неизвестно
  latitude: number;
  longitude: number;
  timezone: string; // IANA timezone (e.g. "Europe/Moscow")
}

export interface PlanetPosition {
  sign: string; // "Aries" | "Taurus" | ... | "Pisces"
  degree: number; // 0..29.99
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
  ascendant: Omit<PlanetPosition, 'house' | 'retrograde'>;
  midheaven: Omit<PlanetPosition, 'house' | 'retrograde'>;
  aspects: Aspect[];
}

export async function calculateChart(_input: NatalChartInput): Promise<NatalChart> {
  throw new Error('not implemented — task-102');
}
