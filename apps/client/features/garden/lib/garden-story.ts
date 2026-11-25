import type {
  GardenLanternResponse,
  GardenTreeResponse,
} from "@repo/contracts";

/**
 * Lời kể của một cây (BR-GDN-009): vài câu bằng chữ, không điểm số hay đếm
 * tuần (KD-GDN-002). Cũng là bản thay thế cho trình đọc màn hình.
 */
export function gardenStory(tree: GardenTreeResponse): string {
  const lines = [plantedLine(tree)];
  // Tên lúc gieo thuộc về câu chuyện của cây; tên hiện tại theo Habit (Q-GDN-10).
  if (tree.nameAtPlanting !== tree.name) {
    lines.push(`Lúc gieo, nó mang tên ${tree.nameAtPlanting}.`);
  }
  const settled = tree.weeks.filter((week) => week.status !== "PENDING");
  const statuses = settled.map((week) => week.status);

  if (settled.length === 0) {
    lines.push("Vừa gieo, cây đang chờ tuần đầu tiên.");
    return lines.join(" ");
  }

  if (statuses.at(-1) === "SKIPPED") {
    lines.push("Đang ngủ đông. Khi quay lại, cây mọc tiếp từ chỗ cũ.");
  } else if (tree.weeds > 0) {
    lines.push(
      "Cỏ đang mọc quanh gốc. Cây không chết; chăm lại thì cỏ gọn dần.",
    );
  } else if (statuses.at(-1) === "RESTED") {
    lines.push("Lâu rồi chưa được chăm; cây đứng yên chờ.");
  } else if (!statuses.includes("RESTED")) {
    lines.push("Được chăm đều từ ngày gieo.");
  }

  // Mắt gỗ: một tuần RESTED rồi có tuần CARED sau đó.
  const firstRest = statuses.indexOf("RESTED");
  if (firstRest >= 0 && statuses.slice(firstRest).includes("CARED")) {
    lines.push("Đã có lúc dừng lại, rồi quay lại chăm; mắt gỗ còn ở đó.");
  }

  if (settled.some((week) => week.scarred)) {
    lines.push("Có vết sẹo đã liền, và cây vẫn lớn lên mỗi tuần.");
  }

  return lines.join(" ");
}

function plantedLine(tree: GardenTreeResponse): string {
  const [year, month] = tree.plantedOn.split("-");
  const kind = tree.variant === "QUIT" ? "Bụi gai" : "Cây";
  return `${kind} ${tree.name}, gieo tháng ${Number(month)}/${year}.`;
}

/** Ngày của một ký ức, đúng độ chính xác người dùng đã ghi. */
export function lanternDate(lantern: GardenLanternResponse): string {
  if (!lantern.occurredOn) return "Chưa rõ ngày";
  const [year, month, day] = lantern.occurredOn.split("-").map(Number);
  if (lantern.precision === "YEAR") return `Năm ${year}`;
  if (lantern.precision === "MONTH") return `Tháng ${month}/${year}`;
  return `${day}/${month}/${year}`;
}

/** Lời kể của một đèn lồng (BA §7.5). */
export function lanternStory(lantern: GardenLanternResponse): string {
  if (!lantern.occurredOn) {
    return "Một ký ức chưa rõ ngày, treo cùng chùm đèn ở đầu lối. Điền ngày thì đèn về đúng chỗ.";
  }
  const date = lanternDate(lantern);
  return lantern.precision === "DAY"
    ? `Một ký ức ngày ${date}, treo bên lối đá.`
    : `Một ký ức ${date.toLowerCase()}, treo bên lối đá.`;
}

/**
 * Nhãn của từng đèn trong danh sách: ngày, kèm số thứ tự khi nhiều ký ức
 * trùng ngày (hay cùng chưa rõ ngày), để mỗi nút chỉ đúng một ký ức. Garden
 * không giữ tiêu đề ký ức (KD-GDN-012).
 */
export function lanternLabels(
  lanterns: readonly GardenLanternResponse[],
): Map<string, string> {
  const dates = lanterns.map(lanternDate);
  const totals = new Map<string, number>();
  for (const date of dates) totals.set(date, (totals.get(date) ?? 0) + 1);
  const seen = new Map<string, number>();
  return new Map(
    lanterns.map((lantern, i) => {
      const date = dates[i]!;
      if (totals.get(date) === 1) return [lantern.id, date];
      const n = (seen.get(date) ?? 0) + 1;
      seen.set(date, n);
      return [lantern.id, `${date} · ${n}`];
    }),
  );
}

/** Số ngày đèn nhạt dần sau khi được thắp, bằng ánh sáng của vườn (BR-GDN-LT-004). */
export const LANTERN_FADE_DAYS = 28;

/**
 * Đèn sáng tới đâu, 0..1 (BR-GDN-LN-007): 1 trong ngày ký ức được mở lại từ
 * "Ngày này năm xưa", nhạt đều về 0 sau 28 ngày.
 */
export function lanternLit(
  lantern: GardenLanternResponse,
  today: string,
): number {
  if (!lantern.litOn) return 0;
  const days = Math.max(
    0,
    (Date.parse(today) - Date.parse(lantern.litOn)) / 86_400_000,
  );
  return Math.max(0, 1 - days / LANTERN_FADE_DAYS);
}
