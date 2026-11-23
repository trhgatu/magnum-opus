import type { GardenTreeResponse } from "@repo/contracts";

/** Khoảng cách giữa hai cây trong cùng luống (đơn vị của cảnh 3D). */
export const BED_SPACING = 110;

export interface GardenSlot {
  /** Vị trí dọc lối đá, 0 là đầu lối, 1 là cuối lối. */
  t: number;
  /** Bên nào của lối: -1 trái, 1 phải. */
  side: -1 | 1;
  /** Luống của chỗ này; null là một cây đứng riêng dọc lối đá. */
  bed: { id: string; name: string } | null;
  /** Cây trong chỗ này, kèm độ lệch so với tâm chỗ. */
  trees: { tree: GardenTreeResponse; dx: number; dz: number }[];
}

/**
 * Xếp vườn (BR-GDN-008): cây cùng luống đứng chung một cụm; cây chưa vào
 * Routine nào đứng riêng dọc lối đá. Các chỗ trải đều dọc lối theo ngày gieo
 * sớm nhất của chúng, so le hai bên.
 */
export function gardenLayout(
  trees: readonly GardenTreeResponse[],
): GardenSlot[] {
  const groups = new Map<string, GardenTreeResponse[]>();
  for (const tree of trees) {
    const key = tree.bed ? `bed:${tree.bed.id}` : `tree:${tree.id}`;
    groups.set(key, [...(groups.get(key) ?? []), tree]);
  }

  const units = [...groups.values()].sort((a, b) =>
    earliest(a).localeCompare(earliest(b)),
  );

  return units.map((members, index) => ({
    t: units.length === 1 ? 0.5 : index / (units.length - 1),
    side: index % 2 ? 1 : -1,
    bed: members[0]!.bed,
    trees: gridOffsets(members),
  }));
}

function earliest(members: readonly GardenTreeResponse[]): string {
  return members.reduce(
    (first, tree) => (tree.plantedOn < first ? tree.plantedOn : first),
    members[0]!.plantedOn,
  );
}

/** Cây trong luống xếp thành lưới gần vuông quanh tâm luống. */
function gridOffsets(
  members: readonly GardenTreeResponse[],
): GardenSlot["trees"] {
  const columns = Math.ceil(Math.sqrt(members.length));
  const rows = Math.ceil(members.length / columns);
  return members.map((tree, i) => ({
    tree,
    dx: ((i % columns) - (columns - 1) / 2) * BED_SPACING,
    dz: (Math.floor(i / columns) - (rows - 1) / 2) * BED_SPACING,
  }));
}
