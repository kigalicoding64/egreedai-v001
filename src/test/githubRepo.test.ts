import { describe, it, expect } from 'vitest';
import { parseGithubUrl, isImportable, adaptRepo } from '@/lib/githubRepo';

describe('github reference', () => {
  it('parses repo and folder links', () => {
    expect(parseGithubUrl('https://github.com/fastapi/full-stack-fastapi-template')).toEqual({ owner: 'fastapi', repo: 'full-stack-fastapi-template', branch: undefined, subdir: undefined });
    expect(parseGithubUrl('github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts')?.subdir).toBe('packages/create-vite/template-react-ts');
    expect(parseGithubUrl('https://gitlab.com/a/b')).toBeNull();
  });
  it('skips dependencies and lock files', () => {
    expect(isImportable('node_modules/x/index.js')).toBe(false);
    expect(isImportable('package-lock.json')).toBe(false);
    expect(isImportable('src/App.tsx')).toBe(true);
  });
  it('renames the project without AI', () => {
    const out = adaptRepo([{ path: 'package.json', content: '{"name":"old"}' }], 'Kigali Tasks', 'A task app', 'https://github.com/a/b');
    expect(JSON.parse(out.find((f) => f.path === 'package.json')!.content).name).toBe('kigali-tasks');
  });
});
