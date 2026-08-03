# 🎬 爆款口播脚本生成器

> 专为抖音运营人打造的 AI 脚本生成工具。输入行业和产品卖点，一键生成 5 条带钩子的结构化口播脚本。

## ✨ 功能特性

- 🤖 **AI 驱动**：接入 DeepSeek V4 Pro，生成质量高、口语化、带情绪递进
- 📱 **全端适配**：电脑、手机、平板完美适配，支持 PWA 安装到桌面
- 🎯 **6 大爆款公式**：揭秘型 / 反转型 / 省钱型 / 痛点型 / 对比型 / 故事型
- 📝 **结构化输出**：3秒钩子 → 痛点共鸣 → 解决方案 → 信任背书 → 行动指令 → 拍摄建议
- 💾 **本地历史**：生成记录自动保存，支持一键恢复
- 🔒 **隐私安全**：数据仅存储在本地浏览器，不上传服务器

## 🚀 一键部署（推荐）

### 方式一：Vercel 部署（免费，5分钟搞定）

1. **Fork 或下载本仓库**
   - 点击右上角 "Use this template" 或下载 ZIP 解压

2. **注册 Vercel**
   - 访问 [vercel.com](https://vercel.com)，用 GitHub 账号登录

3. **导入项目**
   - 点击 "Add New Project" → 选择你的仓库 → 点击 "Import"

4. **配置环境变量**
   - 在 Vercel 项目设置 → Environment Variables 中添加：
     - `Name`: `DEEPSEEK_API_KEY`
     - `Value`: 你的 DeepSeek API Key（从 [platform.deepseek.com](https://platform.deepseek.com) 获取）
   - 点击 Save

5. **重新部署**
   - 回到 Deployments 页面，点击 "Redeploy"
   - 等待 30 秒，获得你的专属网址（如 `https://your-app.vercel.app`）

6. **分享使用**
   - 把网址发给客户，他们打开就能直接用
   - 手机用户可点击"添加到主屏幕"，像 App 一样使用

### 方式二：本地预览（无需部署）

```bash
# 直接用浏览器打开 index.html 即可
# 未部署后端时，工具会以"演示模式"运行，生成示例脚本
```

## 📁 项目结构

```
.
├── index.html          # 前端页面（PWA + 响应式）
├── api/
│   └── generate.js     # Vercel Serverless Function（API 代理）
├── manifest.json       # PWA 配置
├── sw.js              # Service Worker（离线缓存）
├── vercel.json        # Vercel 部署配置
└── README.md          # 本文件
```

## 🔧 自定义配置

### 修改品牌信息
编辑 `index.html`：
- 第 8 行 `<title>`：修改页面标题
- Header 区域：修改主标题和副标题
- Footer 区域：修改底部版权信息

### 修改配色
在 `index.html` 的 `<style>` 标签中搜索：
- `#22c55e` → 替换为你的品牌绿色
- `#ec4899` → 替换为你的品牌粉色

### 修改演示模式文案
在 `index.html` 的 `generateDemoScripts` 函数中，按行业定制默认示例内容。

## 💰 商业化建议

| 阶段 | 策略 | 定价参考 |
|------|------|---------|
| **引流** | 工具免费使用，无门槛 | 免费 |
| **筛选** | 9.9 元《抖音钩子公式大全》PDF | ¥9.9 |
| **转化** | 199 元《AI+抖音运营实战课》 | ¥199 |
| **高价** | 代运营服务 / 企业定制 | ¥3000+/月 |

## ⚠️ 注意事项

1. **API 额度**：DeepSeek API 按量计费，建议设置每日上限防止超额
2. **国内访问**：Vercel 默认域名在国内部分地区访问较慢，建议绑定自定义域名（如阿里云/腾讯云）
3. **数据安全**：用户的历史记录仅保存在本地浏览器，换设备或清除缓存会丢失

## 📄 License

MIT License — 可自由商用、修改、分发。
