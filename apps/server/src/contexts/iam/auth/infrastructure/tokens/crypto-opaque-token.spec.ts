import { CryptoOpaqueToken } from './crypto-opaque-token';

describe('CryptoOpaqueToken', () => {
  const token = new CryptoOpaqueToken();

  it('generates a high-entropy raw token and stores its SHA-256 hash separately', () => {
    const generated = token.generate();

    expect(generated.raw).toHaveLength(43);
    expect(generated.hash).toHaveLength(64);
    expect(generated.hash).toBe(token.hash(generated.raw));
    expect(generated.hash).not.toContain(generated.raw);
  });

  it('hashes the same raw token deterministically', () => {
    expect(token.hash('raw-token')).toBe(
      '34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943',
    );
  });
});
