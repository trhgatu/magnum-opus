import type { GrowInput, GrownTree } from './types.js';
import { growV1 } from './versions/v1.js';

export type * from './types.js';
export { stepsOf } from './versions/v1.js';

/** Phiên bản mới nhất; cây gieo từ giờ mang số này (CURRENT_SIM_VERSION ở server). */
export const LATEST_SIM_VERSION = 1;

const VERSIONS: Record<number, (input: GrowInput) => GrownTree> = {
  1: growV1,
};

/**
 * Mọc một cây theo đúng phiên bản thuật toán lúc nó được gieo, để cây giữ dáng
 * mãi. Phiên bản lạ (server mới hơn client) thì dùng bản mới nhất client có.
 */
export function grow(simVersion: number, input: GrowInput): GrownTree {
  const version = VERSIONS[simVersion] ?? VERSIONS[LATEST_SIM_VERSION]!;
  return version(input);
}
