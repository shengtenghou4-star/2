import { describe, expect, it } from 'vitest';
import type { BirthInput } from './bazi';
import { deriveTimeZoneProfile, normalizeAutomaticTime } from './location';

const BASE: BirthInput = {
  calendarType: 'solar',
  leapMonth: false,
  year: 2003,
  month: 7,
  day: 1,
  hour: 4,
  minute: 0,
  gender: 'male',
  dayBoundary: 'midnight',
  timeBasis: 'civil',
  locationName: '测试地点',
  longitude: 0,
  latitude: 0,
  utcOffset: 0,
  dstMinutes: 0,
};

describe('automatic birthplace time handling', () => {
  it('derives China standard time without asking the user', () => {
    const profile = deriveTimeZoneProfile({ ...BASE, year: 2003, month: 1 }, 35.4149, 116.5872);
    expect(profile.timeZone).toBe('Asia/Shanghai');
    expect(profile.utcOffset).toBe(8);
    expect(profile.dstMinutes).toBe(0);
  });

  it('separates historical daylight saving time from the standard meridian', () => {
    const profile = deriveTimeZoneProfile(BASE, 39.2904, -76.6122);
    expect(profile.timeZone).toBe('America/New_York');
    expect(profile.utcOffset).toBe(-5);
    expect(profile.dstMinutes).toBe(60);
    expect(profile.actualUtcOffset).toBe(-4);
  });

  it('always normalizes the public chart to true solar time', () => {
    const normalized = normalizeAutomaticTime({
      ...BASE,
      latitude: 35.4149,
      longitude: 116.5872,
    });
    expect(normalized.timeBasis).toBe('true-solar');
    expect(normalized.utcOffset).toBe(8);
    expect(normalized.dstMinutes).toBe(0);
  });
});
