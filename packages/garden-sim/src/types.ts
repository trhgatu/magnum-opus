/** Trạng thái tuần, cùng ngôn ngữ với GET /garden (@repo/contracts). */
export type WeekStatus = 'CARED' | 'PENDING' | 'RESTED' | 'SKIPPED';

export interface WeekInput {
  status: WeekStatus;
  scarred: boolean;
}

/** Giống cây: cách một cây mọc thành hình, không phụ thuộc module nguồn. */
export type Species = 'tree' | 'thorn-bush';

export interface GrowInput {
  /** Hạt giống ổn định của cây (vd id chủ thể): cùng hạt, cùng dáng. */
  seed: string;
  species: Species;
  weeks: readonly WeekInput[];
}

export interface GrownNode {
  x: number;
  y: number;
  z: number;
  /** Chỉ số node cha; -1 với gốc. */
  parent: number;
  /** Bán kính cành tại node, theo pipe model (cành gom nhiều lá thì to). */
  radius: number;
  /** Node không có con: chỗ mọc lá. */
  tip: boolean;
}

export interface GrownTree {
  species: Species;
  nodes: GrownNode[];
  /** Node có mắt gỗ: chỗ cây quay lại mọc sau một quãng nghỉ. */
  knots: number[];
  /** Node có sẹo: tuần có tái phạm. */
  scars: number[];
  /** Hệ số thu nhỏ khi vẽ, theo giống cây. */
  scale: number;
}
