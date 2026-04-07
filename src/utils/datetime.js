function parseMysqlDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = value.trim();
  const mysqlMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (mysqlMatch) {
    const [, y, m, d, hh = "00", mm = "00", ss = "00"] = mysqlMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTimeBR(value) {
  const date = parseMysqlDateTime(value);
  if (!date) return "-";
  return date.toLocaleString("pt-BR");
}

export function formatDateBR(value) {
  const date = parseMysqlDateTime(value);
  if (!date) return "-";
  return date.toLocaleDateString("pt-BR");
}

export function parseDateTimeValue(value) {
  return parseMysqlDateTime(value);
}
