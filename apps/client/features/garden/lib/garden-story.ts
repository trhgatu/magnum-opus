import type { GardenTreeResponse } from "@repo/contracts";

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
