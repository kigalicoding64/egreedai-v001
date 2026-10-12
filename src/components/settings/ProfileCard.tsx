import { useEffect, useRef, useState } from "react";
import { UserRound, Loader2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type Form = { full_name: string; display_name: string; phone: string; location: string; website: string; avatar_url: string };
const empty: Form = { full_name: "", display_name: "", phone: "", location: "", website: "", avatar_url: "" };

export function ProfileCard({ userId }: { userId: string }) {
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("profiles").select("full_name,display_name,phone,location,website,avatar_url").eq("user_id", userId).maybeSingle()
      .then(({ data }) => {
        if (data) setForm({ ...empty, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])) } as Form);
        setLoading(false);
      });
  }, [userId]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image.");
    setUploading(true);
    const path = `${userId}/avatar-${Date.now()}.${file.name.split(".").pop() || "png"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast.error(error.message); }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    setUploading(false);
    if (data?.signedUrl) setForm((f) => ({ ...f, avatar_url: data.signedUrl }));
  };

  const save = async () => {
    if (form.website && !/^https?:\/\//i.test(form.website)) return toast.error("Website must start with http:// or https://");
    setSaving(true);
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim().slice(0, 300) || null]));
    const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    const { error } = existing
      ? await supabase.from("profiles").update(payload).eq("user_id", userId)
      : await supabase.from("profiles").insert({ ...payload, user_id: userId });
    setSaving(false);
    error ? toast.error(error.message) : toast.success("Profile saved");
  };

  const initials = (form.full_name || form.display_name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserRound className="w-5 h-5" />Profile</CardTitle>
        <CardDescription>How you appear across EgreedAI</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={form.avatar_url} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <button type="button" aria-label="Change photo" onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 rounded-full bg-primary text-primary-foreground p-1.5 shadow">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </div>
              <div className="text-sm text-muted-foreground">Square photo, up to 5 MB.</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Full name</Label><Input value={form.full_name} onChange={set("full_name")} maxLength={120} /></div>
              <div className="space-y-1.5"><Label>Display name</Label><Input value={form.display_name} onChange={set("display_name")} maxLength={60} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={set("phone")} maxLength={30} placeholder="+250 ..." /></div>
              <div className="space-y-1.5"><Label>Location</Label><Input value={form.location} onChange={set("location")} maxLength={100} placeholder="Kigali, Rwanda" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Website / link</Label><Input value={form.website} onChange={set("website")} maxLength={300} placeholder="https://" /></div>
            </div>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save profile</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
