import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type {
  GeneratedOpaqueToken,
  OpaqueToken,
} from '../../application/ports/opaque-token.port';

@Injectable()
export class CryptoOpaqueToken implements OpaqueToken {
  public generate(): GeneratedOpaqueToken {
    const raw = randomBytes(32).toString('base64url');
    return { raw, hash: this.hash(raw) };
  }

  public hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
