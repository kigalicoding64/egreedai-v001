// Public GitHub repositories as App Builder references.
// Works without any AI key: the browser reads public repos via GitHub's free API.

export interface RepoFile { path: string; content: string; language?: string }
export interface RepoRef { owner: string; repo: string; branch?: string; subdir?: string }

/** Free, open-source starters that work as complete platform bases. */
export const FREE_STARTERS: { label: string; url: string; note: string }[] = [
  { label: 'React + Vite + TypeScript', url: 'https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts', note: 'Official Vite React starter' },
  { label: 'FastAPI full-stack', url: 'https://github.com/fastapi/full-stack-fastapi-template', note: 'Python API + React dashboard' },
  { label: 'shadcn/ui Taxonomy', url: 'https://github.com/shadcn-ui/taxonomy', note: 'Modern app with auth & dashboard' },
  { label: 'Express API starter', url: 'https://github.com/w3tecch/express-typescript-boilerplate', note: 'Node.js REST API' },
];

const TEXT_EXT = /\.(tsx?|jsx?|mjs|cjs|json|md|css|scss|html|py|toml|txt|ya?ml|sql|env\.example|sh|svg|prisma|vue|svelte|cfg|ini)$/i;
const TEXT_NAMES = /(^|\/)(Dockerfile|Makefile|\.gitignore|\.prettierrc|\.eslintrc|LICENSE|Procfile)$/;
const SKIP = /(^|\/)(node_modules|dist|build|\.git|\.next|coverage|__pycache__|vendor)\//;
const MAX_FILES = 80;
const MAX_FILE_BYTES = 120_000;

export function parseGithubUrl(input: string): RepoRef | null {
  const m = input.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^/]+)(?:\/(.+?))?)?\/?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2], branch: m[3], subdir: m[4]?.replace(/\/$/, '') };
}

export function isImportable(path: string, size = 0) {
  return !SKIP.test(path) && (TEXT_EXT.test(path) || TEXT_NAMES.test(path)) && size <= MAX_FILE_BYTES && !/package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock/.test(path);
}

async function gh(url: string) {
  const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (r.status === 403 || r.status === 429) throw new Error('GitHub is limiting free requests right now. Please wait a few minutes.');
  if (r.status === 404) throw new Error('That repository was not found or is not public.');
  if (!r.ok) throw new Error(`GitHub could not be reached (${r.status}).`);
  return r.json();
}

/** Download a public repository (or one folder of it) as project files. */
export async function fetchRepo(url: string, onProgress?: (done: number, total: number) => void): Promise<{ name: string; files: RepoFile[]; truncated: boolean }> {
  const ref = parseGithubUrl(url);
  if (!ref) throw new Error('Paste a public GitHub link like https://github.com/owner/repo');
  const branch = ref.branch || (await gh(`https://api.github.com/repos/${ref.owner}/${ref.repo}`)).default_branch;
  const tree = await gh(`https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const prefix = ref.subdir ? `${ref.subdir}/` : '';
  const all = (tree.tree as { path: string; type: string; size?: number }[])
    .filter((n) => n.type === 'blob' && n.path.startsWith(prefix) && isImportable(n.path, n.size));
  const picked = all.slice(0, MAX_FILES);
  const files: RepoFile[] = [];
  let done = 0;
  for (let i = 0; i < picked.length; i += 8) {
    const batch = await Promise.all(picked.slice(i, i + 8).map(async (n) => {
      const r = await fetch(`https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}/${n.path}`);
      done += 1; onProgress?.(done, picked.length);
      return r.ok ? { path: n.path.slice(prefix.length), content: await r.text(), language: n.path.split('.').pop() } : null;
    }));
    batch.forEach((f) => f && files.push(f));
  }
  if (!files.length) throw new Error('No readable source files were found in that repository.');
  const name = (ref.subdir?.split('/').pop() || ref.repo).toLowerCase();
  return { name, files, truncated: all.length > picked.length || !!tree.truncated };
}

/** Compact reference sent to the AI planner so it follows the repo's structure. */
export function summarizeRepo(files: RepoFile[], max = 9000): string {
  const tree = files.map((f) => f.path).join('\n');
  const key = files.filter((f) => /(^|\/)(package\.json|pyproject\.toml|requirements\.txt|README\.md|vite\.config\.\w+|tailwind\.config\.\w+|main\.(tsx?|py)|App\.tsx)$/i.test(f.path));
  let out = `FILE TREE:\n${tree}\n\nKEY FILES:\n`;
  for (const f of key) { const chunk = `--- ${f.path} ---\n${f.content.slice(0, 1500)}\n`; if (out.length + chunk.length > max) break; out += chunk; }
  return out.slice(0, max);
}

/** Offline blueprint: rename and brand the repo for the request without any AI. */
export function adaptRepo(files: RepoFile[], projectName: string, prompt: string, sourceUrl: string): RepoFile[] {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'egreed-app';
  const out = files.map((f) => {
    if (/(^|\/)package\.json$/.test(f.path) && !f.path.includes('/')) {
      try { const pkg = JSON.parse(f.content); pkg.name = slug; return { ...f, content: JSON.stringify(pkg, null, 2) + '\n' }; } catch { return f; }
    }
    if (f.path === 'pyproject.toml') return { ...f, content: f.content.replace(/^name\s*=\s*".*"/m, `name = "${slug}"`) };
    return f;
  }).filter((f) => f.path !== 'README.md');
  const readme = files.find((f) => f.path === 'README.md');
  out.unshift({ path: 'README.md', language: 'md', content: `# ${projectName}\n\n${prompt}\n\nBuilt by EgreedAI from the open-source base: ${sourceUrl}\nKeep the original license terms of that project.\n\n## Getting started\nSee the original guide below.\n\n---\n\n${readme?.content ?? ''}` });
  return out;
}
