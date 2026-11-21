import { describe, expect, it } from 'vitest';

import { grow, LATEST_SIM_VERSION, stepsOf } from './index.js';
import type { WeekInput } from './types.js';

const cared = (n: number, scarred = false): WeekInput[] =>
  Array.from({ length: n }, () => ({ status: 'CARED' as const, scarred }));
const rested = (n: number): WeekInput[] =>
  Array.from({ length: n }, () => ({
    status: 'RESTED' as const,
    scarred: false,
  }));

describe('stepsOf', () => {
  it('grows on cared weeks, rests on neglected ones, and skips the rest', () => {
    expect(
      stepsOf([
        { status: 'CARED', scarred: false },
        { status: 'CARED', scarred: true },
        { status: 'RESTED', scarred: false },
        { status: 'SKIPPED', scarred: false },
        { status: 'PENDING', scarred: false },
      ]),
    ).toEqual(['grow', 'scar', 'rest']);
  });
});

describe('grow v1', () => {
  it('grows the same tree from the same seed and history', () => {
    const input = {
      seed: 'habit-1',
      species: 'tree' as const,
      weeks: cared(12),
    };

    expect(grow(1, input)).toEqual(grow(1, input));
  });

  // Dáng cây phải giữ nguyên mãi: đổi v1 là đổi mọi cây đã gieo.
  it('keeps the v1 shape of a known tree', () => {
    const tree = grow(1, { seed: 'run', species: 'tree', weeks: cared(8) });

    expect(tree.nodes).toHaveLength(FINGERPRINT.nodes);
    expect(round(tree.nodes.at(-1)!)).toEqual(FINGERPRINT.last);
  });

  it('places scars like the sketch did for a bush that relapsed and rested', () => {
    const tree = grow(1, {
      seed: 'q',
      species: 'thorn-bush',
      weeks: [
        ...cared(4),
        ...cared(1, true),
        ...cared(1),
        ...rested(2),
        ...cared(1),
        ...cared(1, true),
      ],
    });

    expect(tree.nodes).toHaveLength(576);
    expect(tree.scars).toEqual([11, 26]);
  });

  it('stands still while resting', () => {
    const before = grow(1, { seed: 's', species: 'tree', weeks: cared(5) });
    const after = grow(1, {
      seed: 's',
      species: 'tree',
      weeks: [...cared(5), ...rested(6)],
    });

    expect(after.nodes).toEqual(before.nodes);
    expect(after.knots).toEqual([]);
  });

  it('leaves a knot where it grows again after a rest', () => {
    const tree = grow(1, {
      seed: 's',
      species: 'tree',
      weeks: [...cared(5), ...rested(2), ...cared(3)],
    });

    expect(tree.knots.length).toBeGreaterThan(0);
    expect(tree.knots.every((i) => i >= 0 && i < tree.nodes.length)).toBe(true);
  });

  it('leaves one scar on the trunk per scarred week', () => {
    const tree = grow(1, {
      seed: 'q',
      species: 'thorn-bush',
      weeks: [...cared(4), ...cared(1, true), ...cared(4), ...cared(1, true)],
    });

    expect(tree.scars).toHaveLength(2);
  });

  it('only grows, never shrinks, as weeks are added', () => {
    const young = grow(1, { seed: 'g', species: 'tree', weeks: cared(6) });
    const older = grow(1, { seed: 'g', species: 'tree', weeks: cared(9) });

    expect(older.nodes.slice(0, young.nodes.length).map(round)).toEqual(
      young.nodes.map(round),
    );
    expect(older.nodes.length).toBeGreaterThan(young.nodes.length);
  });

  it('keeps a thorn bush lower and wider than a tree', () => {
    const weeks = cared(20);
    const height = (species: 'tree' | 'thorn-bush') =>
      Math.max(...grow(1, { seed: 'h', species, weeks }).nodes.map((n) => n.y));

    const width = (species: 'tree' | 'thorn-bush') =>
      Math.max(
        ...grow(1, { seed: 'h', species, weeks }).nodes.map((n) =>
          Math.hypot(n.x, n.z),
        ),
      );

    expect(height('thorn-bush')).toBeLessThan(height('tree'));
    expect(width('thorn-bush')).toBeGreaterThan(width('tree'));
  });

  // Lưu trữ rồi khôi phục là mọc tiếp từ chỗ cũ, không để dấu (BR-GDN-005).
  it('grows on after an archive without a knot', () => {
    const skipped = (n: number): WeekInput[] =>
      Array.from({ length: n }, () => ({
        status: 'SKIPPED' as const,
        scarred: false,
      }));
    const archived = grow(1, {
      seed: 's',
      species: 'tree',
      weeks: [...cared(5), ...skipped(3), ...cared(3)],
    });

    expect(archived.knots).toEqual([]);
    expect(archived).toEqual(
      grow(1, { seed: 's', species: 'tree', weeks: cared(8) }),
    );
  });

  it('marks tips and thickens branches that carry more leaves', () => {
    const tree = grow(1, { seed: 'p', species: 'tree', weeks: cared(10) });

    expect(tree.nodes[0]!.tip).toBe(false);
    expect(tree.nodes.some((node) => node.tip)).toBe(true);
    // Pipe model: cành cha không bao giờ mảnh hơn cành con nó nuôi.
    for (const node of tree.nodes.slice(1)) {
      expect(tree.nodes[node.parent]!.radius).toBeGreaterThanOrEqual(
        node.radius,
      );
    }
    expect(tree.nodes[0]!.radius).toBeGreaterThan(
      Math.min(...tree.nodes.map((node) => node.radius)),
    );
  });

  it('tells emoji seeds apart', () => {
    const weeks = cared(4);

    expect(grow(1, { seed: '🌱 run', species: 'tree', weeks })).not.toEqual(
      grow(1, { seed: '🌳 run', species: 'tree', weeks }),
    );
  });

  it('falls back to the latest version for an unknown one', () => {
    const input = { seed: 'v', species: 'tree' as const, weeks: cared(3) };

    expect(grow(99, input)).toEqual(grow(LATEST_SIM_VERSION, input));
  });
});

const round = ({ x, y, z }: { x: number; y: number; z: number }) => ({
  x: Math.round(x * 1000) / 1000,
  y: Math.round(y * 1000) / 1000,
  z: Math.round(z * 1000) / 1000,
});

// Lấy từ hàm simulate của bản phác "Khu vườn của Tú 3D": v1 phải mọc y hệt.
const FINGERPRINT = {
  nodes: 154,
  last: { x: -20.675, y: 226.064, z: -35.023 },
};
