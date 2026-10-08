import { ChronicleSectionReader } from '../ports';
import { CHRONICLE_MODULES, ChronicleModule } from '../section-data';

import { ChronicleSectionReaderRegistry } from './chronicle-section-reader-registry';

const fakeReader = (
  module: string,
  schemaVersion = 1,
): ChronicleSectionReader => ({
  module: module as ChronicleModule,
  schemaVersion,
  getSummary: jest.fn(),
});

const fullSet = (): ChronicleSectionReader[] =>
  CHRONICLE_MODULES.map((module) => fakeReader(module));

describe('ChronicleSectionReaderRegistry', () => {
  it('returns every reader in CHRONICLE_MODULES order regardless of registration order', () => {
    const registry = ChronicleSectionReaderRegistry.from(
      [...fullSet()].reverse(),
    );

    expect(registry.all().map((reader) => reader.module)).toEqual([
      ...CHRONICLE_MODULES,
    ]);
  });

  it('looks up a reader by module', () => {
    const readers = fullSet();
    const registry = ChronicleSectionReaderRegistry.from(readers);

    expect(registry.get('journal')).toBe(
      readers.find((reader) => reader.module === 'journal'),
    );
  });

  it('fails fast when a module has no reader', () => {
    const readers = fullSet().filter((reader) => reader.module !== 'mood');

    expect(() => ChronicleSectionReaderRegistry.from(readers)).toThrow(
      'Chronicle modules without a reader: mood',
    );
  });

  it('fails fast when a module has two readers', () => {
    const readers = [...fullSet(), fakeReader('habit')];

    expect(() => ChronicleSectionReaderRegistry.from(readers)).toThrow(
      'Chronicle module "habit" has more than one reader',
    );
  });

  it('fails fast on a reader for an unknown module', () => {
    const readers = [...fullSet(), fakeReader('task')];

    expect(() => ChronicleSectionReaderRegistry.from(readers)).toThrow(
      'Chronicle reader registered for unknown module "task"',
    );
  });

  it.each([0, -1, 1.5])(
    'fails fast on an invalid schemaVersion (%p)',
    (schemaVersion) => {
      const readers = fullSet().map((reader) =>
        reader.module === 'memory'
          ? fakeReader('memory', schemaVersion)
          : reader,
      );

      expect(() => ChronicleSectionReaderRegistry.from(readers)).toThrow(
        /invalid schemaVersion/,
      );
    },
  );
});
