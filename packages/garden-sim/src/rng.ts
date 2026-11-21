/**
 * FNV-1a trên từng đơn vị UTF-16: chuỗi → hạt giống 32 bit. Cùng chuỗi luôn
 * ra cùng hạt; ký tự ngoài BMP (emoji) góp cả hai nửa của nó.
 */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32: dãy số [0, 1) xác định theo hạt giống. */
export function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
