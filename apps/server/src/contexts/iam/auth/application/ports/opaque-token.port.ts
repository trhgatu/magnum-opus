export const OPAQUE_TOKEN = Symbol('OPAQUE_TOKEN');

export interface GeneratedOpaqueToken {
  raw: string;
  hash: string;
}

export interface OpaqueToken {
  generate(): GeneratedOpaqueToken;
  hash(rawToken: string): string;
}
