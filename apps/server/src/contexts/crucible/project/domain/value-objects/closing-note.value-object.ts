import { InvalidClosingNoteException } from '../exceptions';

const MAX_LENGTH = 2000;

export class ClosingNote {
  private constructor(public readonly value: string) {}

  /** Trim; rỗng → không có note (null); quá 2000 ký tự → lỗi. */
  public static fromInput(raw: string | null | undefined): ClosingNote | null {
    const trimed = raw?.trim() ?? '';
    if (!trimed) return null;

    if ([...trimed].length > MAX_LENGTH) {
      throw new InvalidClosingNoteException('too_long');
    }

    return new ClosingNote(trimed);
  }

  public static rehydrate(value: string): ClosingNote {
    return new ClosingNote(value);
  }
}
