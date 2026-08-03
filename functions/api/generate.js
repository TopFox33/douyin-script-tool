// Cloudflare Pages Function — /api/generate
// Vercel → Cloudflare Pages 迁移版
export async function onRequest(context) {
  const { request, env } = context;

  // CORS
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Cloudflare Pages 用 context.env，不是 process.env
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Server API Key not configured",
        detail: "请在 Cloudflare Pages 控制台 → 设置 → 环境变量 中添加 DEEPSEEK_API_KEY",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求格式错误，需要 JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { industry, sellingPoint, targetAudience, duration, formula } = body;
  if (!industry || !sellingPoint) {
    return new Response(JSON.stringify({ error: "请填写行业和产品卖点" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const prompt = `你是一位抖音顶级文案策划，擅长写高转化口播脚本。请根据以下信息，生成5条口播脚本：

【行业】：${industry || ''}
【产品/卖点】：${sellingPoint || ''}
【目标人群】：${targetAudience || '泛人群'}
【视频时长】：${duration || '30秒'}
【爆款公式】：${formula || '智能匹配'}

【输出要求】
每条脚本必须包含以下结构：
1. 【3秒钩子】：前3秒必须抛出悬念/冲突/反认知
2. 【痛点共鸣】：描述目标人群的具体困扰
3. 【解决方案】：自然植入产品卖点，不硬广
4. 【信任背书】：用数据、对比、案例建立可信度
5. 【行动指令】：明确告诉用户点赞/关注/评论/购买
6. 【拍摄建议】：语气、表情、画面、BGM建议

【风格要求】
- 口语化，像朋友聊天，不要用书面语
- 每句话控制在15字以内，适合口播
- 情绪递进：从好奇→共鸣→信任→行动
- 避免"家人们""绝绝子"等过度网络用语

请直接输出5条完整脚本，每条之间用"---SCRIPT_SPLIT---"分隔。`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const dsResp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!dsResp.ok) {
      const errData = await dsResp.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: errData.error?.message || `DeepSeek API 返回错误（HTTP ${dsResp.status}）`,
          detail: JSON.stringify(errData).slice(0, 300),
        }),
        { status: dsResp.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await dsResp.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return new Response(JSON.stringify({ error: "请求超时（20秒），DeepSeek API 响应过慢" }), {
        status: 504,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    console.error("API Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error", type: err.name }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
}
