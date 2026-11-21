import { hash, rng } from '../rng.js';
import type { GrowInput, GrownTree, Species, WeekInput } from '../types.js';

/**
 * Phiên bản 1 của thuật toán mọc: space colonization từ lịch sử tuần, như bản
 * phác "Khu vườn của Tú 3D". KHÔNG BAO GIỜ sửa file này sau khi phát hành:
 * cây giữ dáng theo `sim_version` lúc gieo. Muốn đổi thì thêm v2.
 */

type Step = 'grow' | 'rest' | 'scar';

interface Shape {
  /** Bán kính ngang của đám điểm hút. */
  rx: number;
  /** Bán kính dọc. */
  ry: number;
  /** Độ cao tâm đám điểm hút. */
  cy: number;
  scale: number;
}

const SHAPES: Record<Species, Shape> = {
  tree: { rx: 125, ry: 115, cy: 245, scale: 0.62 },
  'thorn-bush': { rx: 150, ry: 55, cy: 85, scale: 0.75 },
};

const ATTRACTORS = 420;
const INFLUENCE = 85;
const KILL = 15;
const STEP = 8;
/** Một tuần chăm mọc bấy nhiêu nhịp. */
const ITERATIONS_PER_WEEK = 4;

interface Attractor {
  x: number;
  y: number;
  z: number;
  dead: boolean;
  best: number;
  bestDistance: number;
}

interface Node {
  x: number;
  y: number;
  z: number;
  parent: number;
  week: number;
}

type Vec = [number, number, number];

const normalize = ([x, y, z]: Vec): Vec => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};

/**
 * Tuần → bước mọc. Tuần hiện tại chưa chăm (PENDING) chưa làm gì: chưa mọc,
 * cũng chưa tính là nghỉ. Nghỉ có chủ đích và bỏ quên đều đứng yên; chỉ cỏ
 * (do server tính) phân biệt hai thứ đó.
 */
export function stepsOf(weeks: readonly WeekInput[]): Step[] {
  return weeks.flatMap((week): Step[] => {
    if (week.status === 'PENDING') return [];
    if (week.status !== 'CARED') return ['rest'];
    return [week.scarred ? 'scar' : 'grow'];
  });
}

export function growV1(input: GrowInput): GrownTree {
  const shape = SHAPES[input.species];
  const random = rng(hash(input.seed));

  const attractors: Attractor[] = [];
  while (attractors.length < ATTRACTORS) {
    const x = random() * 2 - 1;
    const y = random() * 2 - 1;
    const z = random() * 2 - 1;
    if (x * x + y * y + z * z > 1) continue;
    attractors.push({
      x: x * shape.rx,
      y: shape.cy + y * shape.ry,
      z: z * shape.rx,
      dead: false,
      best: -1,
      bestDistance: INFLUENCE * INFLUENCE,
    });
  }

  const nodes: Node[] = [{ x: 0, y: 0, z: 0, parent: -1, week: 0 }];
  const knotWeeks: number[] = [];
  const scars: number[] = [];

  const track = (from: number): void => {
    for (const attractor of attractors) {
      if (attractor.dead) continue;
      for (let i = from; i < nodes.length; i += 1) {
        const node = nodes[i]!;
        const dx = attractor.x - node.x;
        const dy = attractor.y - node.y;
        const dz = attractor.z - node.z;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance < KILL * KILL) {
          attractor.dead = true;
          break;
        }
        if (distance < attractor.bestDistance) {
          attractor.bestDistance = distance;
          attractor.best = i;
        }
      }
    }
  };
  const top = (): number => {
    let best = 0;
    for (let i = 1; i < nodes.length; i += 1) {
      if (nodes[i]!.y > nodes[best]!.y) best = i;
    }
    return best;
  };

  track(0);
  let bend: Vec = [0, 0, 0];
  let resting = false;

  stepsOf(input.weeks).forEach((step, index) => {
    const week = index + 1;
    if (step === 'rest') {
      resting = true;
      return;
    }
    // Quay lại sau nghỉ: cành mọc lệch hướng và để lại một mắt gỗ.
    if (resting) {
      const angle = random() * 6.28;
      const strength = 0.45 + random() * 0.4;
      bend = [Math.cos(angle) * strength, 0, Math.sin(angle) * strength];
      resting = false;
      knotWeeks.push(week);
    }

    for (let iteration = 0; iteration < ITERATIONS_PER_WEEK; iteration += 1) {
      const pull = new Map<number, Vec>();
      for (const attractor of attractors) {
        if (attractor.dead || attractor.best < 0) continue;
        const node = nodes[attractor.best]!;
        const [dx, dy, dz] = normalize([
          attractor.x - node.x,
          attractor.y - node.y,
          attractor.z - node.z,
        ]);
        const sum = pull.get(attractor.best) ?? [0, 0, 0];
        pull.set(attractor.best, [sum[0] + dx, sum[1] + dy, sum[2] + dz]);
      }

      const start = nodes.length;
      // shortcut: hết điểm hút thì ngọn cứ mọc thẳng lên; cây nhiều năm sẽ
      // cao mãi. Đổi trong v2 khi có cây sống đủ lâu để thấy.
      if (pull.size === 0) {
        pull.set(top(), [(random() - 0.5) * 0.2, 1, (random() - 0.5) * 0.2]);
      }
      for (const [i, sum] of pull) {
        const base = normalize(sum);
        const direction = normalize([
          base[0] + bend[0] + (random() - 0.5) * 0.15,
          base[1],
          base[2] + bend[2] + (random() - 0.5) * 0.15,
        ]);
        const parent = nodes[i]!;
        nodes.push({
          x: parent.x + direction[0] * STEP,
          y: parent.y + direction[1] * STEP,
          z: parent.z + direction[2] * STEP,
          parent: i,
          week,
        });
      }
      track(start);
      bend = [bend[0] * 0.6, bend[1] * 0.6, bend[2] * 0.6];
    }

    // Sẹo nằm trên thân, khoảng giữa gốc và ngọn lúc tái phạm.
    if (step === 'scar') {
      const trunk: number[] = [];
      for (let i = top(); i > 0; i = nodes[i]!.parent) trunk.push(i);
      const at = trunk[Math.floor(trunk.length * (0.4 + random() * 0.35))];
      if (at !== undefined) scars.push(at);
    }
  });

  // Pipe model: mỗi cành to theo số lá nó nuôi.
  const area = new Float64Array(nodes.length);
  const children = new Uint16Array(nodes.length);
  for (let i = nodes.length - 1; i > 0; i -= 1) {
    if (!area[i]) area[i] = 1;
    const parent = nodes[i]!.parent;
    area[parent]! += area[i]!;
    children[parent]! += 1;
  }

  // Mắt gỗ ở chỗ cành mới (của tuần quay lại) mọc ra từ gỗ cũ.
  const knots = new Set<number>();
  for (const week of knotWeeks) {
    for (let i = 1; i < nodes.length; i += 1) {
      const node = nodes[i]!;
      if (node.week === week && nodes[node.parent]!.week < week) {
        knots.add(node.parent);
      }
    }
  }

  return {
    species: input.species,
    nodes: nodes.map((node, i) => ({
      x: node.x,
      y: node.y,
      z: node.z,
      parent: node.parent,
      radius: Math.max(0.55, Math.sqrt(area[i]!) * 0.6),
      tip: i > 0 && children[i] === 0,
    })),
    knots: [...knots],
    scars,
    scale: shape.scale,
  };
}
