// Admin-only: test an MCP server connection and cache its tool list.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { McpSession, validMcpUrl } from "../_shared/mcp.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const auth = req.headers.get("Authorization") || "";
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Please sign in." }, 401);
  const { data: ok } = await userClient.rpc("is_creator", { _user_id: user.id });
  if (!ok) return json({ error: "Admins only." }, 403);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { id } = await req.json().catch(() => ({}));
  const { data: srv } = await admin.from("mcp_servers").select("id,url,auth_header").eq("id", id).maybeSingle();
  if (!srv) return json({ error: "Server not found." }, 404);
  if (!validMcpUrl(srv.url)) return json({ error: "The link must start with https://" }, 400);

  try {
    const s = new McpSession(srv.url, srv.auth_header);
    await s.init();
    const tools = await s.listTools();
    await admin.from("mcp_servers").update({ tools, last_error: null, last_checked_at: new Date().toISOString() }).eq("id", id);
    return json({ ok: true, tools: tools.map((t) => t.name) });
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    await admin.from("mcp_servers").update({ last_error: msg, last_checked_at: new Date().toISOString() }).eq("id", id);
    return json({ ok: false, error: msg });
  }
});
