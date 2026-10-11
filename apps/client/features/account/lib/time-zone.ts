/**
 * Múi giờ của trình duyệt, hoặc null nếu môi trường không cho biết.
 * Lưu ý: trình duyệt có thể trả tên cũ của ICU (Asia/Saigon thay cho
 * Asia/Ho_Chi_Minh) — vẫn hợp lệ, server lưu đúng như được gửi.
 */

export function getBrowserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
/** Tên mà engine Intl hiện tại coi là chuẩn, null nếu không tồn tại. */
function canonicalTineZone(timeZone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions()
      .timeZone;
  } catch {
    return null;
  }
}

/** So hai múi giờ sau khi chuẩn hóa, để Asia/Saigon == Asia/Ho_Chi_Minh. */
export function sameTimeZone(a: string, b: string): boolean {
  const left = canonicalTineZone(a);
  return left !== null && left === canonicalTineZone(b);
}

/**
 * Danh sách cho ô chọn: mọi múi giờ trình duyệt biết, thêm UTC (không có
 * trong supportedValuesOf). Giá trị đang lưu được giữ nguyên tên — nếu danh
 * sách chỉ có tên cũ tương đương (Asia/Saigon) thì thay bằng tên đang lưu,
 * để ô chọn hiện đúng giá trị của tài khoản.
 */
export function timeZoneOptions(current: string): string[] {
  const zones = new Set([...Intl.supportedValuesOf("timeZone"), "UTC"]);

  for (const zone of zones) {
    if (zone !== current && sameTimeZone(zone, current)) {
      zones.delete(zone);
    }
  }
  zones.add(current);
  return [...zones].sort();
}

/** "GMT+07:00" của múi giờ tại một thời điểm (có tính giờ mùa hè). */
export function formatUtcOffset(timeZone: string, at = new Date()): string {
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value;
  // Một số trình duyệt in "GMT" trơn cho độ lệch 0.
  return !offset || offset === "GMT" ? "GMT+00:00" : offset;
}

/**
 * Tên mới / tên nước cho các múi giờ mà trình duyệt chỉ biết tên cũ, để
 * người dùng gõ "ho chi minh" hay "viet nam" vẫn tìm ra Asia/Saigon.
 */
const SEARCH_ALIASES: Record<string, string> = {
  "Asia/Saigon": "ho chi minh viet nam vietnam",
  "Asia/Ho_Chi_Minh": "saigon viet nam vietnam",
  "Asia/Calcutta": "kolkata india",
  "Asia/Kolkata": "calcutta india",
  "Europe/Kiev": "kyiv ukraine",
  "Europe/Kyiv": "kiev ukraine",
  "Asia/Rangoon": "yangon myanmar",
  "Asia/Katmandu": "kathmandu nepal",
};

/** Chữ thường, bỏ dấu tiếng Việt, "_" thành khoảng trắng. */
function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
}

/** Lọc theo tên, tên phụ (SEARCH_ALIASES) và độ lệch "GMT+07:00". */
export function filterTimeZones(
  zones: string[],
  query: string,
  at = new Date(),
): string[] {
  const needle = normalizeSearch(query);
  if (!needle) return zones;

  return zones.filter((zone) =>
    normalizeSearch(
      `${zone} ${SEARCH_ALIASES[zone] ?? ""} ${formatUtcOffset(zone, at)}`,
    ).includes(needle),
  );
}
