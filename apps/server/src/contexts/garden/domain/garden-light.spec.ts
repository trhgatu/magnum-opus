import { gardenLight, LIGHT_FADE_DAYS } from './garden-light';

describe('gardenLight (BA §7.4)', () => {
  it('is clearest on the day of a reflection', () => {
    expect(gardenLight('2026-11-23', '2026-11-23')).toBe(1);
  });

  it('fades evenly with the days since the latest reflection', () => {
    expect(gardenLight('2026-11-16', '2026-11-23')).toBe(0.75);
    expect(gardenLight('2026-11-09', '2026-11-23')).toBe(0.5);
  });

  it('settles at the softest mist after the fade, never below', () => {
    expect(gardenLight('2026-10-01', '2026-11-23')).toBe(0);
    expect(LIGHT_FADE_DAYS).toBe(28);
  });

  // Chưa từng nhìn lại là sương nhẹ, không phải u ám (BR-GDN-LT-002).
  it('starts at the softest mist for someone who never reflected', () => {
    expect(gardenLight(null, '2026-11-23')).toBe(0);
  });

  it('never goes above full light', () => {
    expect(gardenLight('2026-11-24', '2026-11-23')).toBe(1);
  });
});
