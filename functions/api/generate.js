// Cloudflare Pages Function — /api/generate
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

  // --- Token validation ---
  const authHeader = request.headers.get("Authorization") || "";
  let token = authHeader.replace("Bearer ", "");
  let codeData = null;
  let code = null;

  if (token) {
    const tokenData = await env.SCRIPT_TOOL_KV.get(`token:${token}`, "json");
    if (tokenData) {
      code = tokenData.code;
      codeData = await env.SCRIPT_TOOL_KV.get(`code:${code}`, "json");
    }
  }

  // If no valid token, check if user passed activation code directly
  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "请求格式错误", needActivation: true }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { industry, sellingPoint, targetAudience, duration, formula, activationCode } = body;

  // Direct activation code in generate request (fallback)
  if (!codeData && activationCode) {
    const normalized = activationCode.toUpperCase().replace(/\s/g, "");
    codeData = await env.SCRIPT_TOOL_KV.get(`code:${normalized}`, "json");
    code = normalized;
  }

  // No valid code at all
  if (!codeData || !codeData.active) {
    return new Response(JSON.stringify({ error: "请先激活使用权限", needActivation: true }), {
      status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Check expiry
  if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
    return new Response(JSON.stringify({ error: "激活码已过期" }), {
      status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Check quota
  if (codeData.type === "standard" && codeData.used >= codeData.maxUses) {
    return new Response(JSON.stringify({ error: "使用次数已用完", needActivation: true }), {
      status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Validate input
  if (!industry || !sellingPoint) {
    return new Response(JSON.stringify({ error: "请填写行业和产品卖点" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Call DeepSeek
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "服务端未配置 API Key" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const prompt = `你是抖音口播脚本专家。生成5条口播脚本，每条不超过120字。

行业：${industry}
产品：${sellingPoint || ''}
人群：${targetAudience || '泛人群'}
时长：${duration || '30秒'}
公式：${formula || '智能匹配'}

每条包含这6个标签（内容紧跟标签后，不换行）：
【3秒钩子】一句话抓注意力
【痛点共鸣】描述困扰
【解决方案】植入卖点
【信任背书】数据对比
【行动指令】引导互动
【拍摄建议】语气BGM

5条脚本之间用 --- 分隔，不要编号。`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const dsResp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: prompt }], temperature: 0.85, max_tokens: 3000 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!dsResp.ok) {
      const errData = await dsResp.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: errData.error?.message || `DeepSeek ${dsResp.status}` }), {
        status: dsResp.status, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Deduct from quota if standard
    if (codeData.type === "standard") {
      codeData.used = (codeData.used || 0) + 1;
      await env.SCRIPT_TOOL_KV.put(`code:${code}`, JSON.stringify(codeData));
    }

    const data = await dsResp.json();

    // Inject remaining info
    const remaining = codeData.type === "unlimited" ? -1 : (codeData.maxUses - codeData.used);
    data.remaining = remaining;
    data.codeType = codeData.type;

    return new Response(JSON.stringify(data), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return new Response(JSON.stringify({ error: "请求超时，请重试" }), { status: 504, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
}
