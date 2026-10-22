import { useEffect, useState } from "react";
import { Loader2, Plus, Plug, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Server = { id: string; label: string; url: string; active: boolean; tools: { name: string }[]; last_error: string | null; last_checked_at: string | null };

export function McpServersPanel() {
  const [servers, setServers] = useState<Server[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => supabase.from("mcp_servers").select("id,label,url,active,tools,last_error,last_checked_at").order("created_at")
    .then(({ data }) => setServers((data as unknown as Server[]) ?? []));
  useEffect(() => { load(); }, []);

  const test = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("mcp-admin", { body: { id } });
    setBusy(null);
    if (error || !data?.ok) toast.error(`Couldn't connect: ${data?.error || error?.message}`);
    else toast.success(`Connected — ${data.tools.length} tools found`);
    load();
  };

  const add = async () => {
    if (!label.trim() || !/^https:\/\//.test(url.trim())) return toast.error("Add a name and a link starting with https://");
    setBusy("new");
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("mcp_servers").insert({ label: label.trim().slice(0, 60), url: url.trim(), auth_header: token.trim() || null, created_by: user?.id }).select("id").single();
    setBusy(null);
    if (error) return toast.error(error.message);
    setLabel(""); setUrl(""); setToken("");
    await test(data.id);
  };

  const toggle = async (s: Server) => { await supabase.from("mcp_servers").update({ active: !s.active }).eq("id", s.id); load(); };
  const remove = async (s: Server) => { if (!confirm(`Remove "${s.label}"?`)) return; await supabase.from("mcp_servers").delete().eq("id", s.id); load(); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connect a tool (MCP)</CardTitle>
          <CardDescription>Paste the tool's MCP link. When it's switched on, EgreedAI can use its tools while answering chats. Saved keys can't be viewed again.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr_auto]">
          <Input placeholder="Name" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input placeholder="https://…/mcp" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input type="password" placeholder="Access key (optional)" value={token} onChange={(e) => setToken(e.target.value)} />
          <Button onClick={add} disabled={!!busy}>{busy === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}Connect</Button>
        </CardContent>
      </Card>
      {servers.map((s) => (
        <Card key={s.id}><CardContent className="p-4 flex items-center gap-3">
          <Plug className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="font-medium">{s.label}</div>
            <div className="text-xs text-muted-foreground truncate">{s.url}</div>
            <div className={`text-xs ${s.last_error ? "text-destructive" : "text-muted-foreground"}`}>
              {s.last_error ? `Not connected: ${s.last_error}` : s.tools?.length ? `${s.tools.length} tools: ${s.tools.slice(0, 5).map((t) => t.name).join(", ")}${s.tools.length > 5 ? "…" : ""}` : "Not checked yet"}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => test(s.id)} disabled={!!busy}>{busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}</Button>
          <Switch checked={s.active} onCheckedChange={() => toggle(s)} aria-label="Active" />
          <Button variant="ghost" size="icon" onClick={() => remove(s)} aria-label="Remove"><Trash2 className="w-4 h-4" /></Button>
        </CardContent></Card>
      ))}
      {!servers.length && <p className="text-sm text-muted-foreground">No tools connected yet.</p>}
    </div>
  );
}
