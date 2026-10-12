import { InvalidClosingNoteException } from '../exceptions';
import { ClosingNote } from './closing-note.value-object';

describe('ClosingNote', () => {
  it('trims the note', () => {
    expect(ClosingNote.fromInput('  Đổi hướng sang bài khác  ')?.value).toBe(
      'Đổi hướng sang bài khác',
    );
  });

  it.each([undefined, null, '', '   \n  '])('treats %p as no note', (input) => {
    expect(ClosingNote.fromInput(input)).toBeNull();
  });

  it('accepts exactly 2000 characters, counting Vietnamese letters as one', () => {
    const note = 'ệ'.repeat(2000);

    expect(ClosingNote.fromInput(note)?.value).toBe(note);
  });

  it('counts code points, not UTF-16 units, at the 2000 boundary', () => {
    // 😀 is two UTF-16 units: a `.length` check would reject this note.
    const note = '😀'.repeat(2000);

    expect(ClosingNote.fromInput(note)?.value).toBe(note);
    expect(() => ClosingNote.fromInput(`${note}😀`)).toThrow(
      InvalidClosingNoteException,
    );
  });

  it('rejects a note longer than 2000 characters after trimming', () => {
    expect(() => ClosingNote.fromInput('a'.repeat(2001))).toThrow(
      InvalidClosingNoteException,
    );
    expect(ClosingNote.fromInput(` ${'a'.repeat(2000)} `)).not.toBeNull();
  });
});
