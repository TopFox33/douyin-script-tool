// Cloudflare Pages Function — /api/generate
export async function onRequest(context) {
  const { request, env } = context;

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

  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "服务端未配置 API Key", detail: "请在 Cloudflare Pages 设置环境变量 DEEPSEEK_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { industry, sellingPoint, targetAudience, duration, formula } = body;
  if (!industry || !sellingPoint) {
    return new Response(JSON.stringify({ error: "请填写行业和产品卖点" }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
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

    const data = await dsResp.json();
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
