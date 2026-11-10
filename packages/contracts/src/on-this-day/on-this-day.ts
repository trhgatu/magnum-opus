export const ON_THIS_DAY_KINDS = ['MEMORY', 'JOURNAL'] as const;
export type OnThisDayKind = (typeof ON_THIS_DAY_KINDS)[number];

export interface OnThisDayItemResponse {
  kind: OnThisDayKind;
  id: string;
  title: string | null;
  excerpt: string | null;
  day: string;
  yearsAgo: number;
}

export interface OnThisDayResponse {
  date: string;
  items: OnThisDayItemResponse[];
}
