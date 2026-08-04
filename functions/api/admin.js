// DEPLOY_d0b991d7
export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const authHeader = request.headers.get("Authorization") || "";
  const adminKey = authHeader.replace("Bearer ", "");
  const storedKey = await env.SCRIPT_TOOL_KV.get("admin:password");

  if (!adminKey || adminKey !== storedKey) {
    return new Response(JSON.stringify({ error: "无权限" }), {
      status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";

  // POST ?action=generate
  if (request.method === "POST" && action === "generate") {
    let body;
    try { body = await request.json(); } catch {
      return new Response(JSON.stringify({ error: "请求格式错误" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const { count = 1, type = "standard", maxUses = 100, expiresAt } = body;
    if (count < 1 || count > 100) {
      return new Response(JSON.stringify({ error: "数量范围1-100" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const generated = [];
    for (let i = 0; i < count; i++) {
      let code;
      do {
        code = "FOX-" + genSeg() + "-" + genSeg() + "-" + genSeg();
      } while (await env.SCRIPT_TOOL_KV.get(`code:${code}`));
      const codeData = {
        type,
        maxUses: type === "unlimited" ? -1 : maxUses,
        used: 0,
        expiresAt: expiresAt || null,
        deviceFingerprint: null,
        active: true,
        createdAt: new Date().toISOString(),
      };
      await env.SCRIPT_TOOL_KV.put(`code:${code}`, JSON.stringify(codeData));
      generated.push({ code, ...codeData });
    }
    return new Response(JSON.stringify({ generated }), {
      status: 201, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // PUT ?action=toggle&code=FOX-XXX
  if (request.method === "PUT" && action === "toggle") {
    let body;
    try { body = await request.json(); } catch {
      return new Response(JSON.stringify({ error: "请求格式错误" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const { code, active } = body;
    if (!code) return new Response(JSON.stringify({ error: "缺少code" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    const codeData = await env.SCRIPT_TOOL_KV.get(`code:${code}`, "json");
    if (!codeData) return new Response(JSON.stringify({ error: "激活码不存在" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    codeData.active = typeof active !== "undefined" ? active : !codeData.active;
    await env.SCRIPT_TOOL_KV.put(`code:${code}`, JSON.stringify(codeData));
    return new Response(JSON.stringify({ code, ...codeData }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // DELETE ?action=delete&code=FOX-XXX
  if (request.method === "DELETE" && action === "delete") {
    const code = url.searchParams.get("code");
    if (!code) return new Response(JSON.stringify({ error: "缺少code" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    await env.SCRIPT_TOOL_KV.delete(`code:${code}`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // GET ?action=codes or ?action=stats (default: codes)
  if (request.method === "GET") {
    if (action === "stats") {
      const list = await env.SCRIPT_TOOL_KV.list({ prefix: "code:" });
      let totalCodes = 0, activeCodes = 0, totalUsed = 0, totalMax = 0;
      for (const key of list.keys) {
        const data = await env.SCRIPT_TOOL_KV.get(key.name, "json");
        if (!data) continue;
        totalCodes++;
        if (data.active) activeCodes++;
        totalUsed += data.used || 0;
        if (data.maxUses > 0) totalMax += data.maxUses;
      }
      return new Response(JSON.stringify({ totalCodes, activeCodes, totalUsed, totalMax }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // List codes
    const list = await env.SCRIPT_TOOL_KV.list({ prefix: "code:" });
    const codes = [];
    for (const key of list.keys) {
      const data = await env.SCRIPT_TOOL_KV.get(key.name, "json");
      if (data) codes.push({ code: key.name.replace("code:", ""), ...data });
    }
    return new Response(JSON.stringify({ codes }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function genSeg() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
