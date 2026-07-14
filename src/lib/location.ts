import { Lunar } from 'lunar-javascript';
import tzLookup from 'tz-lookup';
import type { BirthInput } from './bazi';

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const PLACE_TYPES = new Set([
  'administrative',
  'city',
  'county',
  'municipality',
  'neighbourhood',
  'state',
  'state_district',
  'suburb',
  'town',
  'village',
]);

interface NominatimAddress {
  city?: string;
  city_district?: string;
  country?: string;
  country_code?: string;
  county?: string;
  municipality?: string;
  neighbourhood?: string;
  state?: string;
  state_district?: string;
  suburb?: string;
  town?: string;
  village?: string;
}

interface NominatimResult {
  place_id: number;
  osm_id?: number;
  osm_type?: string;
  lat: string;
  lon: string;
  category?: string;
  type?: string;
  addresstype?: string;
  display_name: string;
  name?: string;
  address?: NominatimAddress;
}

export interface BirthplaceResult {
  id: string;
  shortName: string;
  displayName: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  type: string;
}

export interface TimeZoneProfile {
  timeZone: string;
  utcOffset: number;
  dstMinutes: number;
  actualUtcOffset: number;
}

function unique(parts: Array<string | undefined>): string[] {
  return [...new Set(parts.filter((part): part is string => Boolean(part?.trim())))];
}

function concisePlaceName(item: NominatimResult): string {
  const address = item.address ?? {};
  const local = address.county
    ?? address.city_district
    ?? address.city
    ?? address.town
    ?? address.municipality
    ?? address.village
    ?? address.suburb
    ?? address.neighbourhood
    ?? item.name
    ?? item.display_name.split(',')[0];
  return unique([
    local,
    address.city !== local ? address.city : undefined,
    address.state,
    address.country,
  ]).slice(0, 4).join(' · ');
}

function resultPriority(item: NominatimResult): number {
  const type = item.addresstype ?? item.type ?? '';
  if (type === 'city' || type === 'county' || type === 'town' || type === 'municipality') return 0;
  if (item.category === 'boundary' || item.category === 'place' || PLACE_TYPES.has(type)) return 1;
  return 2;
}

export async function searchBirthplaces(query: string): Promise<BirthplaceResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) throw new Error('至少输入两个字，例如“济宁兖州”或“Baltimore”。');

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '10',
    dedupe: '1',
    layer: 'address',
    'accept-language': 'zh-CN,zh,en',
  });
  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`地点服务暂时不可用（${response.status}），请稍后重试。`);

  const data = await response.json() as NominatimResult[];
  return data
    .sort((left, right) => resultPriority(left) - resultPriority(right))
    .slice(0, 8)
    .map((item) => ({
      id: `${item.osm_type ?? 'P'}${item.osm_id ?? item.place_id}`,
      shortName: concisePlaceName(item),
      displayName: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      countryCode: item.address?.country_code?.toUpperCase() ?? '',
      type: item.addresstype ?? item.type ?? 'place',
    }));
}

function dateFields(input: BirthInput): Pick<BirthInput, 'year' | 'month' | 'day' | 'hour' | 'minute'> {
  if (input.calendarType === 'solar') return input;
  const lunarMonth = input.leapMonth ? -input.month : input.month;
  const solar = Lunar.fromYmdHms(
    input.year,
    lunarMonth,
    input.day,
    input.hour,
    input.minute,
    input.second ?? 0,
  ).getSolar();
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour: solar.getHour(),
    minute: solar.getMinute(),
  };
}

function offsetAtInstant(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return Math.round((localAsUtc - timestamp) / 60_000);
}

function offsetForLocalWallTime(fields: ReturnType<typeof dateFields>, timeZone: string): number {
  const targetAsUtc = Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute, 0);
  let instant = targetAsUtc;
  for (let index = 0; index < 4; index += 1) {
    instant = targetAsUtc - offsetAtInstant(instant, timeZone) * 60_000;
  }
  return offsetAtInstant(instant, timeZone);
}

function standardOffsetForYear(year: number, timeZone: string, actualOffset: number): number {
  const offsets = Array.from({ length: 12 }, (_, month) => offsetAtInstant(Date.UTC(year, month, 15, 12, 0, 0), timeZone));
  const uniqueOffsets = [...new Set(offsets)].sort((left, right) => left - right);
  if (uniqueOffsets.length < 2) return actualOffset;
  const range = uniqueOffsets[uniqueOffsets.length - 1] - uniqueOffsets[0];
  return range > 0 && range <= 120 ? uniqueOffsets[0] : actualOffset;
}

export function deriveTimeZoneProfile(input: BirthInput, latitude = input.latitude, longitude = input.longitude): TimeZoneProfile {
  const timeZone = tzLookup(latitude, longitude);
  const fields = dateFields(input);
  const actualOffsetMinutes = offsetForLocalWallTime(fields, timeZone);
  const standardOffsetMinutes = standardOffsetForYear(fields.year, timeZone, actualOffsetMinutes);
  return {
    timeZone,
    utcOffset: standardOffsetMinutes / 60,
    dstMinutes: actualOffsetMinutes - standardOffsetMinutes,
    actualUtcOffset: actualOffsetMinutes / 60,
  };
}

export function normalizeAutomaticTime(input: BirthInput): BirthInput {
  const profile = deriveTimeZoneProfile(input);
  return {
    ...input,
    timeBasis: 'true-solar',
    utcOffset: profile.utcOffset,
    dstMinutes: profile.dstMinutes,
  };
}

export function formatUtcOffset(hours: number): string {
  const sign = hours >= 0 ? '+' : '−';
  const absolute = Math.abs(hours);
  const whole = Math.floor(absolute);
  const minutes = Math.round((absolute - whole) * 60);
  return `UTC${sign}${String(whole).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
