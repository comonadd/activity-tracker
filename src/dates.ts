export const toDuration = (dur: Date | null) =>
  dur !== null ? dur.toISOString().substr(11, 8) : "N/A";

// unix ms
export type Duration = number;

export const dateDiff = (d1: Date, d2: Date): Duration => {
  return d1.getTime() - d2.getTime();
};

export const durAdd = (d1: Duration, d2: Duration): Duration => {
  return d1 + d2;
};

export const durationHours = (n: number): Duration => {
  return n * 60 * 60 * 1000;
};

export const durationMinutes = (n: number): Duration => {
  return n * 60 * 1000;
};

export const dateAddDays = (d: Date, nDays: number) =>
  new Date(d.getTime() + nDays * 24 * 60 * 60 * 1000);

export const dateAddHours = (d: Date, nHours: number) =>
  new Date(d.getTime() + nHours * 60 * 60 * 1000);

export const dateFormatHMS = (d: Date) =>
  d.toLocaleString(navigator.language, {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  } as any);

export const unixDuration = (n: number) => {
  let seconds = n / 1000;
  let minutes = Math.round(seconds / 60);
  seconds = Math.round(seconds % 60);
  const hours = Math.round(minutes / 60);
  minutes = Math.round(minutes % 60);
  return `${hours} HRS, ${minutes} MINUTES`;
};

export const dateToString = (date: Date) =>
  date.toLocaleString(navigator.language, {
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "numeric",
  } as any);

export const monthName = (date: Date) =>
  date.toLocaleString(navigator.language, {
    month: "long",
  } as any);

export const monthAndYear = (date: Date) =>
  date.toLocaleString(navigator.language, {
    year: "numeric",
    month: "long",
  } as any);

export const addDurationToDate = (date: Date, dur: Duration): Date =>
  new Date(date.getTime() + dur);

export const durToHours = (dur: Duration) => dur / 1000 / 60 / 60;
