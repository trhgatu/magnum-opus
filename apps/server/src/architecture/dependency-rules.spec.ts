import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

const sourceRoot = join(__dirname, '..');

const collectTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    return statSync(absolutePath).isDirectory()
      ? collectTypeScriptFiles(absolutePath)
      : absolutePath.endsWith('.ts') && !absolutePath.endsWith('.spec.ts')
        ? [absolutePath]
        : [];
  });

describe('architecture dependency rules', () => {
  it('keeps bounded-context domain code independent from outer layers', () => {
    const domainFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.includes(`${join('', 'domain')}`));
    const violations = domainFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const forbiddenImport =
        /from ['"][^'"]*(application|infrastructure|presentation)[^'"]*['"]/g;
      return [...source.matchAll(forbiddenImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('keeps shared domain free of delivery technology contracts', () => {
    const sharedDomain = collectTypeScriptFiles(
      join(sourceRoot, 'shared', 'domain'),
    )
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');

    expect(sharedDomain).not.toMatch(/BullMQ|Redis|Socket|WebSocket|Prisma/);
  });

  it('keeps application code independent from infrastructure and presentation', () => {
    const applicationFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.includes(`${join('', 'application')}`));
    const violations = applicationFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const forbiddenImport =
        /from ['"][^'"]*(infrastructure|presentation)[^'"]*['"]/g;
      return [...source.matchAll(forbiddenImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('keeps Auth application independent from framework configuration and token implementations', () => {
    const applicationFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts', 'iam', 'auth', 'application'),
    );
    const violations = applicationFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const forbiddenImport =
        /from ['"](@nestjs\/(config|jwt)|(?:node:)?crypto)['"]/g;

      return [...source.matchAll(forbiddenImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('keeps application jobs independent from BullMQ processors and transport types', () => {
    const applicationFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.includes(`${join('', 'application')}`));
    const violations = applicationFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const forbiddenImport = /from ['"](@nestjs\/bullmq|bullmq)['"]/g;
      const processorDecorator = /@Processor\s*\(/g;

      return [
        ...[...source.matchAll(forbiddenImport)].map(
          (match) => `${file}: ${match[0]}`,
        ),
        ...[...source.matchAll(processorDecorator)].map(
          (match) => `${file}: ${match[0]}`,
        ),
      ];
    });

    expect(violations).toEqual([]);
  });

  it('places queue processors in infrastructure only', () => {
    const processorFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => basename(file).endsWith('.processor.ts'));
    const misplaced = processorFiles.filter(
      (file) => !file.includes(join('infrastructure', 'processors')),
    );

    expect(misplaced).toEqual([]);
  });

  it('keeps application code independent from realtime transport SDKs', () => {
    const applicationFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.includes(`${join('', 'application')}`));
    const violations = applicationFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const forbiddenImport =
        /from ['"](@nestjs\/websockets|socket\.io|@socket\.io\/redis-adapter)['"]/g;

      return [...source.matchAll(forbiddenImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('exposes realtime delivery only through the shared port', () => {
    const serverFiles = collectTypeScriptFiles(sourceRoot).filter(
      (file) => !file.includes(join('infrastructure', 'realtime')),
    );
    const violations = serverFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const directGatewayImport =
        /from ['"][^'"]*infrastructure\/realtime\/realtime\.gateway['"]/g;

      return [...source.matchAll(directGatewayImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('keeps infrastructure independent from presentation', () => {
    const infrastructureFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.includes(`${join('', 'infrastructure')}`));
    const violations = infrastructureFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const forbiddenImport = /from ['"][^'"]*presentation[^'"]*['"]/g;

      return [...source.matchAll(forbiddenImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('keeps Reflection consumers behind their Journal reader ports', () => {
    const journalConsumerFiles = ['memory', 'mood'].flatMap((moduleName) =>
      collectTypeScriptFiles(
        join(sourceRoot, 'contexts', 'reflection', moduleName, 'application'),
      ),
    );
    const violations = journalConsumerFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const directJournalDomainImport =
        /from ['"][^'"]*reflection\/journal\/domain[^'"]*['"]/g;

      return [...source.matchAll(directJournalDomainImport)].map(
        (match) => `${file}: ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it('uses one unambiguous placement and suffix for outbound ports', () => {
    const contextFiles = collectTypeScriptFiles(join(sourceRoot, 'contexts'));
    const invalidDomainPorts = contextFiles
      .filter((file) => file.includes(join('domain', 'ports')))
      .filter((file) => !basename(file).endsWith('.repository.ts'));
    const invalidApplicationPorts = contextFiles
      .filter((file) => file.includes(join('application', 'ports')))
      .filter((file) => !basename(file).endsWith('.port.ts'));

    expect(invalidDomainPorts).toEqual([]);
    expect(invalidApplicationPorts).toEqual([]);
  });

  it('keeps shared domain abstractions on one canonical import path', () => {
    const sharedDomainFiles = collectTypeScriptFiles(
      join(sourceRoot, 'shared', 'domain'),
    );

    expect(
      sharedDomainFiles.filter((file) => file.includes(join('domain', 'base'))),
    ).toEqual([]);
  });

  describe('integration events', () => {
    const importsOf = (file: string): string[] =>
      [...readFileSync(file, 'utf8').matchAll(/from ['"]([^'"]+)['"]/g)].map(
        (match) => match[1],
      );
    const contextFiles = collectTypeScriptFiles(join(sourceRoot, 'contexts'));
    const contractFiles = contextFiles.filter((file) =>
      file.includes(`${join('', 'contracts')}`),
    );
    const outboxAdapterFiles = contextFiles.filter((file) =>
      file.includes(join('infrastructure', 'outbox')),
    );

    // Các nhóm có nhiều bounded context con: iam/users, forge/habit, ...
    const contextGroups = [
      'iam',
      'reflection',
      'crucible',
      'forge',
      'integrations',
    ];
    const aliases: Array<[string, string]> = [
      ['@iam/', 'contexts/iam/'],
      ['@reflection/', 'contexts/reflection/'],
      ['@integrations/', 'contexts/integrations/'],
      ['@activity/', 'contexts/activity/'],
      ['@/', ''],
    ];
    const toSourcePath = (file: string, specifier: string): string | null => {
      if (specifier.startsWith('.')) {
        return relative(sourceRoot, resolve(dirname(file), specifier))
          .split(sep)
          .join('/');
      }
      const alias = aliases.find(([prefix]) => specifier.startsWith(prefix));
      return alias ? alias[1] + specifier.slice(alias[0].length) : null;
    };
    const contextOf = (sourcePath: string): string | null => {
      const [root, group, child] = sourcePath.split('/');
      if (root !== 'contexts') return null;
      return contextGroups.includes(group) ? `${group}/${child}` : group;
    };

    it('keeps published contracts free of domain, application and infrastructure code', () => {
      // Hợp đồng công khai chỉ được dựa vào @shared và chính thư mục contracts.
      const violations = contractFiles.flatMap((file) =>
        importsOf(file)
          .filter(
            (specifier) =>
              !specifier.startsWith('@shared/') && !specifier.startsWith('./'),
          )
          .map((specifier) => `${file}: ${specifier}`),
      );

      expect(violations).toEqual([]);
    });

    it('keeps the outbox core unaware of every bounded context', () => {
      const outboxCoreFiles = collectTypeScriptFiles(
        join(sourceRoot, 'infrastructure', 'event-bus'),
      );
      const violations = outboxCoreFiles.flatMap((file) =>
        importsOf(file)
          .filter((specifier) => contextOf(toSourcePath(file, specifier) ?? ''))
          .map((specifier) => `${file}: ${specifier}`),
      );

      expect(violations).toEqual([]);
    });

    it('lets outbox adapters reach other contexts only through their contracts', () => {
      const violations = outboxAdapterFiles.flatMap((file) => {
        const own = contextOf(relative(sourceRoot, file).split(sep).join('/'));
        return importsOf(file)
          .map((specifier) => ({
            specifier,
            target: toSourcePath(file, specifier) ?? '',
          }))
          .filter(({ target }) => {
            const other = contextOf(target);
            return (
              other !== null &&
              other !== own &&
              !target.startsWith(`contexts/${other}/contracts/`)
            );
          })
          .map(({ specifier }) => `${file}: ${specifier}`);
      });

      expect(violations).toEqual([]);
    });
  });

  it('names each bounded-context composition root after its directory', () => {
    const moduleFiles = collectTypeScriptFiles(
      join(sourceRoot, 'contexts'),
    ).filter((file) => file.endsWith('.module.ts'));
    const violations = moduleFiles.filter((file) => {
      const contextName = basename(dirname(file));
      return basename(file) !== `${contextName}.module.ts`;
    });

    expect(violations).toEqual([]);
  });
});
