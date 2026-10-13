// Minimal MCP client over Streamable HTTP (JSON-RPC 2.0).
export type McpTool = { name: string; description?: string; inputSchema?: unknown };

async function readRpc(res: Response, id: number): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!res.ok) throw new Error(`MCP ${res.status}: ${text.slice(0, 200)}`);
  const candidates: any[] = [];
  if (ct.includes("text/event-stream")) {
    for (const line of text.split("\n")) {
      if (line.startsWith("data:")) { try { candidates.push(JSON.parse(line.slice(5).trim())); } catch { /* skip */ } }
    }
  } else if (text.trim()) {
    const j = JSON.parse(text);
    Array.isArray(j) ? candidates.push(...j) : candidates.push(j);
  }
  const msg = candidates.find((m) => m?.id === id) ?? candidates[0];
  if (!msg) throw new Error("MCP: empty response");
  if (msg.error) throw new Error(`MCP error: ${msg.error.message || JSON.stringify(msg.error)}`);
  return msg.result;
}

export class McpSession {
  private sessionId: string | null = null;
  private nextId = 1;
  constructor(private url: string, private authHeader?: string | null) {}

  private headers() {
    const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
    if (this.authHeader) h.Authorization = this.authHeader.startsWith("Bearer ") || this.authHeader.includes(" ") ? this.authHeader : `Bearer ${this.authHeader}`;
    if (this.sessionId) h["Mcp-Session-Id"] = this.sessionId;
    return h;
  }

  async rpc(method: string, params?: unknown, timeoutMs = 15000) {
    const id = this.nextId++;
    const res = await fetch(this.url, {
      method: "POST", headers: this.headers(), redirect: "error",
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params: params ?? {} }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) this.sessionId = sid;
    return readRpc(res, id);
  }

  async init() {
    await this.rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "egreed-ai", version: "1.0" } });
    await fetch(this.url, {
      method: "POST", headers: this.headers(), redirect: "error",
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      signal: AbortSignal.timeout(8000),
    }).then((r) => r.body?.cancel()).catch(() => {});
  }

  async listTools(): Promise<McpTool[]> {
    const r = await this.rpc("tools/list");
    return (r?.tools ?? []).map((t: any) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
  }

  async callTool(name: string, args: unknown): Promise<string> {
    const r = await this.rpc("tools/call", { name, arguments: args ?? {} }, 25000);
    const parts = (r?.content ?? []).map((c: any) => c?.type === "text" ? c.text : JSON.stringify(c)).join("\n");
    return (parts || JSON.stringify(r?.structuredContent ?? r ?? "")).slice(0, 8000);
  }
}

export function validMcpUrl(u: string) {
  try { const x = new URL(u); return x.protocol === "https:"; } catch { return false; }
}
