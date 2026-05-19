/**
 * Геокодинг: строка с местом рождения → координаты + IANA таймзона.
 *
 * MVP использует:
 * - OpenStreetMap Nominatim (бесплатно, без API ключа, лимит 1 req/sec)
 * - tz-lookup для определения таймзоны по координатам (статичная карта, без API)
 *
 * Для production-масштабирования (>10K юзеров в день) — добавить кеширование
 * результатов в БД (по тексту места) и/или fallback на платный геокодер
 * (Google Maps, Stadia Maps) при сбоях Nominatim.
 */

import tzLookup from 'tz-lookup';
import { logger } from '../utils/logger.ts';

export interface GeocodingResult {
  /** Полное человекочитаемое название, как его понял Nominatim */
  displayName: string;
  latitude: number;
  longitude: number;
  /** IANA timezone, например "Europe/Moscow" */
  timezone: string;
  countryCode?: string;
}

/** Контактный User-Agent — требование Nominatim ToS */
const USER_AGENT = 'Numen/0.1 (Telegram bot; https://t.me/heynumen)';

/**
 * Геокодирует место рождения. Возвращает null, если место не найдено.
 */
export async function geocode(
  place: string,
  language: 'ru' | 'en' = 'ru',
): Promise<GeocodingResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', place);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', language);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.error({ err, place }, 'Nominatim request failed');
    throw new Error('Геокодер временно недоступен, попробуй через минуту');
  }

  if (!response.ok) {
    logger.error({ status: response.status, place }, 'Nominatim non-200');
    throw new Error(`Геокодер вернул ${response.status}`);
  }

  const results = (await response.json()) as NominatimResult[];

  if (!results.length) {
    return null;
  }

  const first = results[0]!;
  const latitude = parseFloat(first.lat);
  const longitude = parseFloat(first.lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error('Геокодер вернул некорректные координаты');
  }

  const timezone = tzLookup(latitude, longitude);

  return {
    displayName: first.display_name,
    latitude,
    longitude,
    timezone,
    countryCode: first.address?.country_code?.toUpperCase(),
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}
