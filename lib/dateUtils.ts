const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})/;

export function toDateOnly(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getLocalTodayDateOnly() {
  const today = new Date();

  return toDateOnly(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
}

export function normalizeDateOnly(value: string) {
  const match = value.match(dateOnlyPattern);

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return getLocalTodayDateOnly();
  }

  return toDateOnly(
    parsedDate.getFullYear(),
    parsedDate.getMonth() + 1,
    parsedDate.getDate(),
  );
}

export function getDateOnlyParts(value: string) {
  const [year, month, day] = normalizeDateOnly(value).split("-");

  return {
    day: Number(day),
    dayLabel: day,
    month: Number(month),
    monthLabel: month,
    year: Number(year),
    yearLabel: year,
  };
}

export function formatDateOnlyBR(value: string) {
  const { dayLabel, monthLabel, yearLabel } = getDateOnlyParts(value);

  return `${dayLabel}/${monthLabel}/${yearLabel}`;
}
