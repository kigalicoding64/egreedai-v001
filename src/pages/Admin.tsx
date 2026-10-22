import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, KeyRound, Users, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsCreator } from "@/hooks/useIsCreator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { McpServersPanel } from "@/components/admin/McpServersPanel";

type Profile = { user_id: string; full_name: string | null; display_name: string | null; phone: string | null; location: string | null; website: string | null; avatar_url: string | null; created_at: string };
type Key = { id: string; label: string; active: boolean; position: number; last_used_at: string | null; last_error: string | null; created_at: string };

export default function Admin() {
  const navigate = useNavigate();
  const { loading, isCreator } = useIsCreator();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [keys, setKeys] = useState<Key[]>([]);
  const [q, setQ] = useState("");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [adding, setAdding] = useState(false);

  const loadKeys = () => supabase.from("gemini_api_keys").select("id,label,active,position,last_used_at,last_error,created_at").order("position").order("created_at")
    .then(({ data }) => setKeys((data as Key[]) ?? []));

  useEffect(() => {
    if (!isCreator) return;
    supabase.from("profiles").select("user_id,full_name,display_name,phone,location,website,avatar_url,created_at").order("created_at", { ascending: false })
      .then(({ data }) => setProfiles((data as Profile[]) ?? []));
    loadKeys();
  }, [isCreator]);

  const addKey = async () => {
    const k = apiKey.trim();
    if (!label.trim() || k.length < 20) return toast.error("Add a name and a valid Gemini key.");
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("gemini_api_keys").insert({ label: label.trim().slice(0, 60), api_key: k, position: keys.length, created_by: user?.id });
    setAdding(false);
    if (error) return toast.error(error.message);
    setLabel(""); setApiKey(""); toast.success("Key added"); loadKeys();
  };
  const toggle = async (k: Key) => { await supabase.from("gemini_api_keys").update({ active: !k.active }).eq("id", k.id); loadKeys(); };
  const remove = async (k: Key) => { if (!confirm(`Remove "${k.label}"?`)) return; await supabase.from("gemini_api_keys").delete().eq("id", k.id); loadKeys(); };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isCreator) return <div className="min-h-screen grid place-items-center text-muted-foreground">Admins only.</div>;

  const shown = profiles.filter((p) => [p.full_name, p.display_name, p.phone, p.location].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-semibold">Admin</h1>
      </header>
      <main className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users ({profiles.length})</TabsTrigger>
            <TabsTrigger value="keys"><KeyRound className="w-4 h-4 mr-2" />Gemini keys</TabsTrigger>
            <TabsTrigger value="mcp">MCP tools</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="space-y-3 mt-4">
            <Input placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} />
            {shown.map((p) => (
              <Card key={p.user_id}><CardContent className="p-4 flex items-center gap-4">
                <Avatar><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback>{(p.full_name || p.display_name || "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{p.full_name || p.display_name || "Unnamed user"}</div>
                  <div className="text-sm text-muted-foreground truncate">{[p.phone, p.location, p.website].filter(Boolean).join(" · ") || "No contact details yet"}</div>
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">Joined {new Date(p.created_at).toLocaleDateString()}</div>
              </CardContent></Card>
            ))}
            {!shown.length && <p className="text-sm text-muted-foreground">No users found.</p>}
          </TabsContent>
          <TabsContent value="keys" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Add a Gemini key</CardTitle>
                <CardDescription>Keys are used as backups in order: if one fails or hits its limit, the next one takes over. Saved keys can't be viewed again.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="Name (e.g. Team key 3)" value={label} onChange={(e) => setLabel(e.target.value)} className="sm:w-48" />
                <Input type="password" placeholder="Gemini API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                <Button onClick={addKey} disabled={adding}>{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}Add</Button>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">Your two built-in keys are always tried first, then these:</p>
            {keys.map((k, i) => (
              <Card key={k.id}><CardContent className="p-4 flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-6">#{i + 3}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{k.label}</div>
                  <div className="text-xs text-muted-foreground">Added {new Date(k.created_at).toLocaleDateString()}</div>
                </div>
                <Switch checked={k.active} onCheckedChange={() => toggle(k)} aria-label="Active" />
                <Button variant="ghost" size="icon" onClick={() => remove(k)} aria-label="Remove"><Trash2 className="w-4 h-4" /></Button>
              </CardContent></Card>
            ))}
            {!keys.length && <p className="text-sm text-muted-foreground">No extra keys yet.</p>}
          </TabsContent>
          <TabsContent value="mcp" className="mt-4"><McpServersPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
