import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Download, Rocket, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PFile { path: string; content: string; language?: string }
interface Step { label: string; state: 'active' | 'done' | 'error'; detail?: string }

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('build-app', { body });
  if (error) throw new Error(error.message);
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

  const push = (s: Step) => setSteps((p) => [...p.filter((x) => x.label !== s.label), s]);

  const run = async () => {
    setBusy(true); setSteps([]); setPlan(null); setFiles([]); setIssues([]); setSelected(null);
    let label = 'Planning';
    try {
      push({ label, state: 'active' });
      const { plan } = await call({ stage: 'plan', prompt, stack });
      setPlan(plan);
      push({ label, state: 'done', detail: `${plan.files.length} files planned` });

      const byPath = new Map<string, PFile>();
      const targets = plan.files.map((f: any) => ({ path: f.path, purpose: f.purpose ?? '' }));
      for (let i = 0; i < targets.length; i += 2) {
        const batch = targets.slice(i, i + 2);
        label = `Writing ${batch.map((b: any) => b.path).join(', ')}`;
        push({ label, state: 'active' });
        const { files: out } = await call({ stage: 'files', prompt, plan, targets: batch });
        (out as PFile[]).forEach((f) => byPath.set(f.path, f));
        setFiles([...byPath.values()]);
        push({ label, state: 'done', detail: `${out.length} written` });
      }
      let all = [...byPath.values()];
      if (!all.length) throw new Error('No files were generated. Try again.');
      setSelected(all[0].path);

      label = 'Reviewing for defects';
      push({ label, state: 'active' });
      const review = await call({ stage: 'validate', files: all });
      const found = Array.isArray(review?.issues) ? review.issues : [];
      setIssues(found);
      push({ label, state: 'done', detail: found.length ? `${found.length} issue(s) found` : 'No material defects found on review' });

      if (found.length) {
        label = 'Fixing issues';
        push({ label, state: 'active' });
        const { files: fixed } = await call({ stage: 'fix', files: all, issues: found });
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
        <aside className="border-r border-border p-4 space-y-3 overflow-y-auto">
          <Textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the app: e.g. A booking API for a Kigali salon with customers, services and appointments" />
          <Input value={stack} onChange={(e) => setStack(e.target.value)} placeholder="Preferred stack (optional)" />
          <Button className="w-full" disabled={busy || prompt.trim().length < 8} onClick={run}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Rocket className="w-4 h-4 mr-2" />}Build
          </Button>
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.label} className="flex gap-2 text-xs">
                {s.state === 'active' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                  : s.state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                <div><p className="font-medium break-all">{s.label}</p>{s.detail && <p className="text-muted-foreground">{s.detail}</p>}</div>
              </div>
            ))}
          </div>
          {plan && <div className="text-xs space-y-1 border-t border-border pt-3"><p className="font-semibold">{plan.name}</p><p className="text-muted-foreground">{plan.summary}</p></div>}
          {issues.length > 0 && (
            <div className="text-xs space-y-1 border-t border-border pt-3">
              <p className="font-semibold">Review report</p>
              {issues.map((i, n) => <p key={n} className="text-muted-foreground"><span className="text-foreground">{i.path}</span> [{i.severity}] {i.problem}</p>)}
            </div>
          )}
        </aside>
        <main className="flex overflow-hidden min-h-[400px]">
          <div className="w-56 border-r border-border overflow-y-auto p-2 space-y-0.5">
            {files.map((f) => (
              <button key={f.path} onClick={() => setSelected(f.path)}
                className={cn('w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-1.5 break-all', selected === f.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
                <FileCode className="w-3 h-3 shrink-0" />{f.path}
              </button>
            ))}
            {!files.length && <p className="text-xs text-muted-foreground p-2">Files appear here as they are written.</p>}
          </div>
          <pre className="flex-1 overflow-auto p-4 text-xs font-mono bg-muted/30 whitespace-pre">{current?.content ?? ''}</pre>
        </main>
      </div>
    </div>
  );
}
