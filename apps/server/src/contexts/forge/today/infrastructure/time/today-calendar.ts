export interface TodayCalendarDate {
  date: string;
  persistenceDate: Date;
  isoWeekday: number;
}

export function resolveTodayCalendarDate(
  instant: Date,
  timeZone: string,
): TodayCalendarDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  const date = `${part('year')}-${part('month')}-${part('day')}`;

  const persistenceDate = new Date(`${date}T00:00:00.000Z`);

  const utcWeekday = persistenceDate.getUTCDay();

  return {
    date,
    persistenceDate,
    isoWeekday: utcWeekday === 0 ? 7 : utcWeekday,
  };
}
