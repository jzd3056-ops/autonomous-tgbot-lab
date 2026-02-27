# 平台能力清单

## ✅ 可用
- **Node.js**: 写 bot 代码，npm install 任何包
- **Telegram Bot API**: 通过 BotFather 创建 bot，获取 token
- **文件系统**: 读写代码和配置
- **Git**: commit & push
- **web_fetch**: 抓取网页
- **搜索**: DuckDuckGo via web_fetch
- **Playwright**: 浏览器自动化（如需要）

## Bot 开发
- 推荐框架: telegraf, grammy, node-telegram-bot-api
- Bot 可以在当前服务器上长期运行（用 exec background）
- 需要 BotFather 创建 bot 获取 token

## 关键问题：BotFather
Agent 需要通过 Telegram 与 @BotFather 对话来创建 bot。
方案：
1. 用 Telegram Bot API 的 MTProto 协议（复杂）
2. 用已有的 Telegram 渠道（OpenClaw 已连接 Telegram）
3. Agent 在日志中请求 Romi 协助创建 bot token

❌ 不要用 OpenClaw browser tool
