export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { code, fingerprint } = body;
  if (!code || !fingerprint) {
    return new Response(JSON.stringify({ error: "缺少参数" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Normalize code: uppercase, strip spaces/dashes
  const normalized = code.toUpperCase().replace(/\s/g, "");

  // Get code data
  const codeData = await env.SCRIPT_TOOL_KV.get(`code:${normalized}`, "json");
  if (!codeData || !codeData.active) {
    return new Response(JSON.stringify({ error: "激活码无效" }), {
      status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Check expiry
  if (codeData.expiresAt) {
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of current day is ok
    if (new Date(codeData.expiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: "激活码已过期" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  // Check device binding
  if (codeData.deviceFingerprint && codeData.deviceFingerprint !== fingerprint) {
    return new Response(JSON.stringify({ error: "激活码已被其他设备使用" }), {
      status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Check remaining uses
  if (codeData.type === "standard" && codeData.used >= codeData.maxUses) {
    return new Response(JSON.stringify({ error: "激活码次数已用完" }), {
      status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Bind device on first use
  let updated = false;
  if (!codeData.deviceFingerprint) {
    codeData.deviceFingerprint = fingerprint;
    updated = true;
  }
  if (!codeData.firstActivatedAt) {
    codeData.firstActivatedAt = new Date().toISOString();
    updated = true;
  }
  if (updated) {
    await env.SCRIPT_TOOL_KV.put(`code:${normalized}`, JSON.stringify(codeData));
  }

  // Create session token
  const token = crypto.randomUUID();
  await env.SCRIPT_TOOL_KV.put(`token:${token}`, JSON.stringify({
    code: normalized,
    fingerprint,
    createdAt: new Date().toISOString(),
  }), { expirationTtl: 86400 * 30 }); // 30-day session

  const remaining = codeData.type === "unlimited" ? "无限次" : (codeData.maxUses - codeData.used);

  return new Response(JSON.stringify({
    success: true,
    token,
    type: codeData.type,
    remaining,
    maxUses: codeData.maxUses,
    used: codeData.used,
    expiresAt: codeData.expiresAt,
  }), {
    status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
