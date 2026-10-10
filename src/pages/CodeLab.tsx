import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { ArrowLeft, Play, Bug, Loader2, TerminalSquare } from 'lucide-react';

const LANGS = ['javascript', 'typescript', 'python', 'html', 'sql', 'java', 'go', 'rust', 'php', 'csharp', 'cpp'];
const RUNNABLE = new Set(['javascript', 'html']);

/** Runs JavaScript in an isolated, sandboxed iframe (no access to this page or your session). */
function runSandboxed(code: string, lang: string): Promise<{ output: string; error: string }> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    const id = Math.random().toString(36).slice(2);
    const out: string[] = []; let err = '';
    const done = () => { window.removeEventListener('message', onMsg); iframe.remove(); resolve({ output: out.join('\n'), error: err }); };
    const timer = setTimeout(() => { err = err || 'Stopped after 5 seconds (possible infinite loop).'; done(); }, 5000);
    function onMsg(e: MessageEvent) {
      if (e.source !== iframe.contentWindow || e.data?.id !== id) return;
      if (e.data.type === 'log') out.push(e.data.text);
      if (e.data.type === 'error') err = e.data.text;
      if (e.data.type === 'end') { clearTimeout(timer); done(); }
    }
    window.addEventListener('message', onMsg);
    const harness = `<script>
      const s=(t,x)=>parent.postMessage({id:${JSON.stringify(id)},type:t,text:x},'*');
      const f=a=>a.map(v=>{try{return typeof v==='string'?v:JSON.stringify(v)}catch{return String(v)}}).join(' ');
      console.log=(...a)=>s('log',f(a));console.error=(...a)=>s('log','[error] '+f(a));console.warn=(...a)=>s('log','[warn] '+f(a));
      window.onerror=(m,_,l)=>{s('error',m+(l?' (line '+l+')':''));s('end');};
    <\/script>`;
    const body = lang === 'html'
      ? `${harness}${code}<script>setTimeout(()=>s('end'),300)<\/script>`
      : `${harness}<script>(async()=>{try{${code}\n}catch(e){s('error',String(e&&e.stack||e))}s('end')})()<\/script>`;
    iframe.srcdoc = body;
    document.body.appendChild(iframe);
  });
}

export default function CodeLab() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState('function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');

  const run = async () => {
    setRunning(true); setOutput(''); setError('');
    const r = await runSandboxed(code, lang);
    setOutput(r.output); setError(r.error); setRunning(false);
  };

  const assist = async (action: string) => {
    setBusy(action); setAnswer('');
    const { data, error: e } = await supabase.functions.invoke('code-assist', { body: { action, code, language: lang, error, output } });
    setAnswer(e || data?.error ? `Something went wrong: ${data?.error || e?.message}` : data.answer);
    setBusy(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-12 border-b border-border flex items-center gap-2 px-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <TerminalSquare className="w-4 h-4 text-primary" />
        <h1 className="font-semibold text-sm">Code Lab</h1>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="ml-3 bg-muted text-xs rounded px-2 py-1 border border-border">
          {LANGS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <div className="flex-1" />
        <Button size="sm" disabled={!RUNNABLE.has(lang) || running} onClick={run} title={RUNNABLE.has(lang) ? 'Run' : 'Running works for JavaScript and HTML'}>
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}Run
        </Button>
      </header>
      <div className="flex-1 grid lg:grid-cols-2 overflow-hidden">
        <div className="flex flex-col border-r border-border">
          <Textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
            onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget; const s = t.selectionStart; setCode(code.slice(0, s) + '  ' + code.slice(t.selectionEnd)); requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2)); } }}
            className="flex-1 min-h-[320px] font-mono text-xs rounded-none border-0 resize-none focus-visible:ring-0" />
          <div className="border-t border-border p-3 h-44 overflow-auto bg-muted/30">
            <p className="text-xs font-semibold mb-1">Output</p>
            <pre className="text-xs font-mono whitespace-pre-wrap">{output || (RUNNABLE.has(lang) ? 'Press Run to execute.' : 'Running in the browser works for JavaScript and HTML. Use the AI tools for other languages.')}</pre>
            {error && <pre className="text-xs font-mono text-destructive whitespace-pre-wrap mt-1">{error}</pre>}
          </div>
        </div>
        <div className="flex flex-col overflow-hidden">
          <div className="flex flex-wrap gap-1.5 p-3 border-b border-border">
            {[['fix', 'Debug & fix'], ['explain', 'Explain'], ['review', 'Review'], ['test', 'Write tests'], ['optimize', 'Optimize'], ['document', 'Document']].map(([a, l]) => (
              <Button key={a} size="sm" variant={a === 'fix' ? 'default' : 'outline'} disabled={!!busy} onClick={() => assist(a)}>
                {busy === a ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : a === 'fix' ? <Bug className="w-3.5 h-3.5 mr-1" /> : null}{l}
              </Button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-4 text-sm">
            {answer ? <MarkdownRenderer content={answer} /> : <p className="text-muted-foreground text-sm">Run your code, then ask EgreedAI to debug, explain, review or test it.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
