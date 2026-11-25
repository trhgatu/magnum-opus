import type {
  GardenLanternResponse,
  GardenTreeResponse,
} from "@repo/contracts";

/**
 * Khoảng cách giữa hai cây trong cùng luống (đơn vị của cảnh 3D): rộng hơn
 * đường kính vùng chạm của một cây (HIT_RADIUS) để chạm đúng cây.
 */
export const BED_SPACING = 160;
/** Bán kính vùng chạm quanh gốc một cây đã mọc. */
export const HIT_RADIUS = 70;
/** Khoảng cách giữa hai đèn trong chùm đèn chưa rõ ngày. */
export const LANTERN_SPACING = 46;

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

export interface LanternSpot {
  t: number;
  side: -1 | 1;
  /** Đèn ở chỗ này: một đèn có ngày, hoặc cả chùm đèn chưa rõ ngày. */
  lanterns: { lantern: GardenLanternResponse; dx: number; dz: number }[];
}

type Unit =
  | { kind: "trees"; day: string; trees: GardenTreeResponse[] }
  | { kind: "lanterns"; day: string; lanterns: GardenLanternResponse[] };

/**
 * Xếp lối đá theo thứ tự ngày, không theo tỉ lệ thời gian (BR-GDN-LN-002).
 * Cây cùng luống đứng chung một cụm (BR-GDN-008); mỗi đèn có ngày là một chỗ
 * theo `placedOn`; đèn chưa rõ ngày gom thành một chùm ở đầu lối
 * (BR-GDN-LN-003). Các chỗ trải đều dọc lối, so le hai bên.
 */
export function gardenPath(
  trees: readonly GardenTreeResponse[],
  lanterns: readonly GardenLanternResponse[],
): { slots: GardenSlot[]; lanterns: LanternSpot[] } {
  const groups = new Map<string, GardenTreeResponse[]>();
  for (const tree of trees) {
    const key = tree.bed ? `bed:${tree.bed.id}` : `tree:${tree.id}`;
    const members = groups.get(key);
    if (members) members.push(tree);
    else groups.set(key, [tree]);
  }

  const units: Unit[] = [...groups.values()].map((members) => ({
    kind: "trees",
    day: earliest(members),
    trees: members,
  }));
  const undated = lanterns.filter((lantern) => lantern.placedOn === null);
  // Chuỗi rỗng đứng trước mọi ngày: chùm chưa rõ ngày luôn ở đầu lối.
  if (undated.length)
    units.push({ kind: "lanterns", day: "", lanterns: undated });
  for (const lantern of lanterns) {
    if (lantern.placedOn !== null) {
      units.push({
        kind: "lanterns",
        day: lantern.placedOn,
        lanterns: [lantern],
      });
    }
  }
  // Cùng ngày thì đèn đứng trước cây: ký ức là chuyện đã xảy ra ngày đó.
  units.sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (a.kind === b.kind ? 0 : a.kind === "lanterns" ? -1 : 1),
  );

  const slots: GardenSlot[] = [];
  const spots: LanternSpot[] = [];
  units.forEach((unit, index) => {
    const t = units.length === 1 ? 0.5 : index / (units.length - 1);
    const side = index % 2 ? 1 : -1;
    if (unit.kind === "trees") {
      slots.push({
        t,
        side,
        bed: unit.trees[0]!.bed,
        trees: grid(unit.trees, BED_SPACING).map(({ item, dx, dz }) => ({
          tree: item,
          dx,
          dz,
        })),
      });
    } else {
      spots.push({
        t,
        side,
        lanterns: grid(unit.lanterns, LANTERN_SPACING).map(
          ({ item, dx, dz }) => ({ lantern: item, dx, dz }),
        ),
      });
    }
  });
  return { slots, lanterns: spots };
}

/** Chỉ phần cây của lối đá. */
export function gardenLayout(
  trees: readonly GardenTreeResponse[],
): GardenSlot[] {
  return gardenPath(trees, []).slots;
}

function earliest(members: readonly GardenTreeResponse[]): string {
  return members.reduce(
    (first, tree) => (tree.plantedOn < first ? tree.plantedOn : first),
    members[0]!.plantedOn,
  );
}

/** Xếp thành lưới gần vuông quanh tâm, không chồng lên nhau. */
function grid<T>(
  items: readonly T[],
  spacing: number,
): { item: T; dx: number; dz: number }[] {
  const columns = Math.ceil(Math.sqrt(items.length));
  const rows = Math.ceil(items.length / columns);
  return items.map((item, i) => ({
    item,
    dx: ((i % columns) - (columns - 1) / 2) * spacing,
    dz: (Math.floor(i / columns) - (rows - 1) / 2) * spacing,
  }));
}
