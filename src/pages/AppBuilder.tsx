import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Github, Loader2, CheckCircle2, AlertTriangle, Download, Rocket, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FREE_STARTERS, fetchRepo, summarizeRepo, adaptRepo, type RepoFile } from '@/lib/githubRepo';

interface PFile { path: string; content: string; language?: string }
interface Step { label: string; state: 'active' | 'done' | 'error'; detail?: string }

const MIN_STAGE_GAP_MS = 12_000;

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('build-app', { body });
  if (error) {
    const response = (error as { context?: Response }).context;
    const payload = response ? await response.clone().json().catch(() => null) : null;
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'The build request could not finish. Please check your connection.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AppBuilder() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [stack, setStack] = useState('');
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [files, setFiles] = useState<PFile[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const repoCache = useRef<{ url: string; files: RepoFile[]; name: string } | null>(null);

  const loadRepo = async () => {
    if (repoCache.current?.url === repoUrl.trim()) return repoCache.current;
    const label = 'Reading GitHub reference';
    push({ label, state: 'active' });
    const r = await fetchRepo(repoUrl, (d, t) => push({ label, state: 'active', detail: `${d}/${t} files` }));
    push({ label, state: 'done', detail: `${r.files.length} files${r.truncated ? ' (large repo, main files only)' : ''}` });
    repoCache.current = { url: repoUrl.trim(), ...r };
    return repoCache.current;
  };

  // No AI needed: turn the public repository into the project directly.
  const buildFromRepo = async () => {
    setBusy(true); setSteps([]); setIssues([]); setSelected(null); setFiles([]);
    try {
      const r = await loadRepo();
      const name = prompt.trim().split(/[.\n]/)[0].slice(0, 40) || r.name;
      const out = adaptRepo(r.files, name, prompt.trim(), repoUrl.trim());
      setPlan({ name: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), summary: `Ready-to-run project from ${repoUrl.trim()} — built without AI.`, files: out });
      setFiles(out);
      push({ label: 'Project ready (no AI used)', state: 'done', detail: 'Download it and run the original setup steps in README' });
    } catch (e) {
      push({ label: 'Reading GitHub reference', state: 'error', detail: (e as Error).message });
    } finally { setBusy(false); }
  };

  const push = (s: Step) => setSteps((p) => [...p.filter((x) => x.label !== s.label), s]);

  const run = async () => {
    setBusy(true); setSteps([]); setPlan(null); setFiles([]); setIssues([]); setSelected(null);
    let label = 'Planning';
    let lastRequestAt = 0;
    // Pace new stage requests to stay within the configured provider's rate
    // limit. This never repeats a request: a failed stage remains terminal.
    const request = async (body: Record<string, unknown>) => {
      const waitMs = Math.max(0, lastRequestAt + MIN_STAGE_GAP_MS - Date.now());
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastRequestAt = Date.now();
      return call(body);
    };
    try {
      const reference = repoUrl.trim() ? summarizeRepo((await loadRepo()).files) : '';
      push({ label, state: 'active' });
      const { plan } = await request({ stage: 'plan', prompt, stack, reference });
      setPlan(plan);
      push({ label, state: 'done', detail: `${plan.files.length} files planned` });

      const byPath = new Map<string, PFile>();
      const targets = plan.files.map((f: any) => ({ path: f.path, purpose: f.purpose ?? '' }));
      for (let i = 0; i < targets.length; i += 1) {
        const batch = targets.slice(i, i + 1);
        label = `Writing ${batch.map((b: any) => b.path).join(', ')}`;
        push({ label, state: 'active' });
        const { files: out } = await request({ stage: 'files', prompt, plan, targets: batch, reference });
        (out as PFile[]).forEach((f) => byPath.set(f.path, f));
        setFiles([...byPath.values()]);
        push({ label, state: 'done', detail: `${out.length} written` });
      }
      let all = [...byPath.values()];
      if (!all.length) throw new Error('No files were generated. Try again.');


      label = 'Reviewing for defects';
      push({ label, state: 'active' });
      const review = await request({ stage: 'validate', files: all });
      const found = Array.isArray(review?.issues) ? review.issues : [];
      setIssues(found);
      push({ label, state: 'done', detail: found.length ? `${found.length} issue(s) found` : 'No material defects found on review' });

      if (found.length) {
        label = 'Fixing issues';
        push({ label, state: 'active' });
        const { files: fixed } = await request({ stage: 'fix', files: all, issues: found });
        (fixed as PFile[]).forEach((f) => byPath.set(f.path, f));
        all = [...byPath.values()];
        setFiles(all);
        push({ label, state: 'done', detail: `${fixed.length} file(s) repaired` });
      }
    } catch (e) {
      push({ label, state: 'error', detail: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.path, f.content));
    saveAs(await zip.generateAsync({ type: 'blob' }), `${plan?.name || 'egreed-app'}.zip`);
  };

  const current = files.find((f) => f.path === selected);

  // Typewriter queue: each newly written file is revealed line by line.
  const [streamingPath, setStreamingPath] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const queueRef = useRef<string[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!busy && !files.length) { seenRef.current.clear(); queueRef.current = []; setRevealed({}); setStreamingPath(null); }
    files.forEach((f) => { if (!seenRef.current.has(f.path)) { seenRef.current.add(f.path); queueRef.current.push(f.path); } });
  }, [files, busy]);

  useEffect(() => {
    const t = setInterval(() => {
      setStreamingPath((cur) => {
        const path = cur ?? queueRef.current.shift() ?? null;
        if (!path) return null;
        const f = files.find((x) => x.path === path);
        if (!f) return path;
        if (!cur) setSelected(path);
        const total = f.content.split('\n').length;
        let done = false;
        setRevealed((r) => {
          const n = Math.min(total, (r[path] ?? 0) + Math.max(1, Math.ceil(total / 120)));
          done = n >= total;
          return { ...r, [path]: n };
        });
        return done ? null : path;
      });
    }, 30);
    return () => clearInterval(t);
  }, [files]);

  const allLines = current?.content.split('\n') ?? [];
  const shownLines = current && current.path in revealed ? allLines.slice(0, revealed[current.path]) : (current && !queueRef.current.includes(current.path) && streamingPath !== current.path ? allLines : []);

  useEffect(() => {
    if (streamingPath && streamingPath === current?.path) viewRef.current?.scrollTo?.({ top: viewRef.current.scrollHeight });
  }, [shownLines.length, streamingPath, current?.path]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-12 border-b border-border flex items-center gap-2 px-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <Rocket className="w-4 h-4 text-primary" />
        <h1 className="font-semibold text-sm">App Builder</h1>
        <div className="flex-1" />
        {files.length > 0 && !busy && (
          <Button size="sm" onClick={download}><Download className="w-3.5 h-3.5 mr-1" />Download project</Button>
        )}
      </header>
      <div className="flex-1 grid md:grid-cols-[340px_1fr] overflow-hidden">
        <aside className="border-r border-border p-4 space-y-3 overflow-y-auto flex flex-col">
          <Textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the app: e.g. A booking API for a Kigali salon with customers, services and appointments" />
          <Input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="Preferred stack (optional)" />
          <div className="space-y-1.5">
            <Input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="Public GitHub repo to use as reference (optional)" aria-label="GitHub reference" />
            <div className="flex flex-wrap gap-1">
              {FREE_STARTERS.map((s) => (
                <button key={s.url} type="button" title={s.note} onClick={() => setRepoUrl(s.url)}
                  className={cn('text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted', repoUrl === s.url && 'bg-primary/15 border-primary text-primary')}>{s.label}</button>
              ))}
            </div>
          </div>
          <Button className="w-full" disabled={busy || prompt.trim().length < 8} onClick={run}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}Build with AI
          </Button>
          <Button variant="outline" className="w-full" disabled={busy || !repoUrl.trim()} onClick={buildFromRepo}>
            <Github className="w-4 h-4 mr-2" />Build from repo (no AI needed)
          </Button>
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.label} role={s.state === 'error' ? 'alert' : undefined} className="flex gap-2 text-xs">
                {s.state === 'active' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                  : s.state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                <div><p className="font-medium break-all">{s.label}</p>{s.detail && <p className="text-muted-foreground">{s.detail}</p>}</div>
              </div>
            ))}
          </div>
          {plan && <div className="mt-auto text-xs space-y-1 border-t border-border pt-3"><p className="font-semibold">{plan.name}</p><p className="text-muted-foreground">{plan.summary}</p></div>}
          {issues.length > 0 && (
            <div className="text-xs space-y-1 border-t border-border pt-3">
              <p className="font-semibold">Review report</p>
              {issues.map((i, n) => <p key={n} className="text-muted-foreground"><span className="text-foreground">{i.path}</span> [{i.severity}] {i.problem}</p>)}
            </div>
          )}
        </aside>
        <main className="flex overflow-hidden min-h-[400px] bg-code-bg text-code-fg">
          <div className="w-56 border-r border-code-muted/30 overflow-y-auto p-2 space-y-0.5 hidden sm:block">
            {files.map((f) => (
              <button key={f.path} onClick={() => setSelected(f.path)}
                className={cn('w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-1.5 break-all', selected === f.path ? 'bg-primary/20 text-primary' : 'hover:bg-code-muted/20')}>
                <FileCode className="w-3 h-3 shrink-0" />{f.path}
                {streamingPath === f.path && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
              </button>
            ))}
            {!files.length && <p className="text-xs text-code-muted p-2">Files appear here as they are written.</p>}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-9 border-b border-code-muted/30 flex items-center gap-2 px-3 text-xs font-mono">
              {current ? <>
                <FileCode className="w-3.5 h-3.5 text-primary" /><span>{current.path}</span>
                {streamingPath === current.path && <span className="flex items-center gap-1 text-primary"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />writing…</span>}
              </> : <span className="text-code-muted">{busy ? 'Waiting for first file…' : 'No file open'}</span>}
            </div>
            <div ref={viewRef} className="flex-1 overflow-auto py-3 text-xs font-mono leading-5">
              {shownLines.map((l, i) => (
                <div key={i} className="flex px-3"><span className="w-10 shrink-0 text-right pr-4 text-code-muted select-none">{i + 1}</span><span className="whitespace-pre">{l || ' '}</span></div>
              ))}
              {streamingPath === current?.path && <span className="ml-[3.25rem] inline-block w-2 h-4 bg-primary animate-pulse align-middle" />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
