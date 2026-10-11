import type { MoodLabel } from "@repo/contracts";

export interface MoodOption {
  value: MoodLabel;
  label: string;
  symbol: string;
}

export const MOOD_OPTIONS: readonly MoodOption[] = [
  { value: "JOYFUL", label: "Vui", symbol: "✦" },
  { value: "CALM", label: "Bình yên", symbol: "◌" },
  { value: "HOPEFUL", label: "Hy vọng", symbol: "↗" },
  { value: "ENERGETIC", label: "Tràn năng lượng", symbol: "ϟ" },
  { value: "NEUTRAL", label: "Trung tính", symbol: "—" },
  { value: "TIRED", label: "Mệt", symbol: "◒" },
  { value: "ANXIOUS", label: "Lo âu", symbol: "≈" },
  { value: "SAD", label: "Buồn", symbol: "◇" },
  { value: "ANGRY", label: "Tức giận", symbol: "△" },
  { value: "OVERWHELMED", label: "Quá tải", symbol: "※" },
];

export const moodOption = (label: MoodLabel): MoodOption =>
  MOOD_OPTIONS.find((option) => option.value === label) ?? MOOD_OPTIONS[4];
