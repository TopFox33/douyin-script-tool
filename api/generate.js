module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server API Key not configured. Please set DEEPSEEK_API_KEY in Vercel dashboard.' });
  }

  try {
    const { industry, sellingPoint, targetAudience, duration, formula } = req.body;

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

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: errData.error?.message || `DeepSeek API error: ${response.status}` 
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};