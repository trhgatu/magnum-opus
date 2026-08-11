import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const requiredDocuments = [
  'README.md',
  'product/README.md',
  'product/vision.md',
  'product/journey.md',
  'product/features/README.md',
  'docs/README.md',
  'docs/01-architecture.md',
  'docs/02-runtime-flows.md',
  'docs/modules/backend.md',
  'docs/modules/client.md',
  'docs/modules/admin.md',
  'docs/modules/shared-infrastructure.md',
  'docs/modules/packages.md',
  'docs/08-testing-cicd.md',
  'docs/walkthroughs/end-to-end.md',
  'docs/10-file-map.md',
  'docs/11-building-a-module.md',
];
const excludedDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
]);

const collectMarkdown = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) return [];
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdown(absolutePath);
    return entry.isFile() && entry.name.endsWith('.md') ? [absolutePath] : [];
  });

const errors = [];
const markdownFiles = collectMarkdown(repositoryRoot);

for (const requiredDocument of requiredDocuments) {
  if (!existsSync(path.join(repositoryRoot, requiredDocument))) {
    errors.push(`${requiredDocument}: required document is missing`);
  }
}

for (const absoluteFile of markdownFiles) {
  const relativeFile = path
    .relative(repositoryRoot, absoluteFile)
    .split(path.sep)
    .join('/');
  const content = readFileSync(absoluteFile, 'utf8');

  if (!content.startsWith('# ')) {
    errors.push(`${relativeFile}: document must start with one H1 heading`);
  }

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    if (/^(https?:\/\/|mailto:|#)/.test(rawTarget)) continue;
    const fileTarget = rawTarget.split('#')[0];
    if (!fileTarget) continue;
    const resolvedTarget = path.resolve(path.dirname(absoluteFile), fileTarget);
    if (!existsSync(resolvedTarget)) {
      errors.push(`${relativeFile}: broken link "${rawTarget}"`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Documentation verification failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Documentation verified: ${requiredDocuments.length} required files, ${markdownFiles.length} Markdown files, no broken local links.`,
);
