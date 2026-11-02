export const THEME_CHOICES = ["light", "dark", "system"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

export const THEME_STORAGE_KEY = "magnum-opus-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const isThemeChoice = (value: unknown): value is ThemeChoice =>
  THEME_CHOICES.includes(value as ThemeChoice);

/** Lựa chọn lưu ở trình duyệt; storage bị chặn hoặc giá trị lạ thì theo hệ thống. */
export function readThemeChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyThemeChoice(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

const THEME_CHANGE_EVENT = "magnum-opus-theme-change";

export function saveThemeChoice(choice: ThemeChoice) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Không lưu được thì vẫn đổi cho phiên này.
  }
  applyThemeChoice(choice);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** Báo khi lựa chọn đổi ở tab này hoặc ở tab khác (sự kiện storage). */
export function subscribeToThemeChoice(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Chạy chặn trong <head>, trước khi vẽ trang, để không nháy sai màu; và theo
 * dõi đổi sáng/tối của máy khi đang chọn "Theo hệ thống" cùng lựa chọn
 * đổi ở tab khác. Viết bằng chuỗi vì
 * nó chạy trước khi bundle được tải.
 */
export const THEME_BOOT_SCRIPT = `(function(){var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)},q=window.matchMedia(${JSON.stringify(DARK_QUERY)});function c(){try{var v=localStorage.getItem(k);return v==="light"||v==="dark"?v:"system"}catch(e){return"system"}}function a(){var v=c();document.documentElement.classList.toggle("dark",v==="dark"||(v==="system"&&q.matches))}a();q.addEventListener("change",a);window.addEventListener("storage",function(e){if(e.key===k||e.key===null)a()})})();`;
