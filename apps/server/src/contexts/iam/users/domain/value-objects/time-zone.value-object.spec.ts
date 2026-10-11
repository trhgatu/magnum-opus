import { InvalidTimeZoneException } from '../exceptions/invalid-time-zone.exception';
import { TimeZone } from './time-zone.value-object';

describe('TimeZone', () => {
  it.each(['UTC', 'Asia/Ho_Chi_Minh', 'Europe/London', 'America/New_York'])(
    'accepts the IANA time zone "%s"',
    (value) => {
      expect(new TimeZone(value).value).toBe(value);
    },
  );

  it('trims surrounding spaces', () => {
    expect(new TimeZone('  Asia/Ho_Chi_Minh ').value).toBe('Asia/Ho_Chi_Minh');
  });

  it('keeps the chosen name instead of the ICU legacy alias', () => {
    // Node's resolvedOptions() would turn these into Asia/Saigon and
    // Asia/Calcutta; the stored value must stay what the user picked.
    expect(new TimeZone('Asia/Ho_Chi_Minh').value).toBe('Asia/Ho_Chi_Minh');
    expect(new TimeZone('Asia/Kolkata').value).toBe('Asia/Kolkata');
  });

  it.each([
    '',
    '   ',
    'Mars/Olympus_Mons',
    'Not a zone',
    '+07:00',
    'GMT+7',
    `Asia/${'x'.repeat(70)}`,
  ])('rejects "%s"', (value) => {
    expect(() => new TimeZone(value)).toThrow(InvalidTimeZoneException);
  });

  it('reports validity without throwing', () => {
    expect(TimeZone.isValid('Asia/Ho_Chi_Minh')).toBe(true);
    expect(TimeZone.isValid('Mars/Base')).toBe(false);
    expect(TimeZone.isValid('+07:00')).toBe(false);
    expect(TimeZone.isValid(undefined)).toBe(false);
  });

  it('defaults to UTC', () => {
    expect(TimeZone.DEFAULT).toBe('UTC');
  });
});
