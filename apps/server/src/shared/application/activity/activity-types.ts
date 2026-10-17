/** Kiểu trung lập: integrations và activity cùng dùng mà không import lẫn nhau. */
export const ACTIVITY_KINDS = [
  'COMMIT_AUTHORED',
  'PR_OPENED',
  'PR_MERGED',
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
