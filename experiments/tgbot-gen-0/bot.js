const { Bot } = require("grammy");

const TOKEN = "8509775146:AAGwiRySe3Vx86EFtvvZtjWGWvZb6Gv3MQU";
const bot = new Bot(TOKEN);

// Simple in-memory usage tracking
const usage = {};
const FREE_LIMIT = 5; // per day

function todayKey() { return new Date().toISOString().slice(0, 10); }
function getUsage(userId) {
  const key = `${userId}:${todayKey()}`;
  return usage[key] || 0;
}
function addUsage(userId) {
  const key = `${userId}:${todayKey()}`;
  usage[key] = (usage[key] || 0) + 1;
}

async function fetchSummary(url) {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await resp.text();
    // Extract text content roughly
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Take first ~2000 chars for summary
    text = text.slice(0, 2000);
    if (text.length < 50) return null;
    
    // Extract key sentences (simple extractive summary)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const summary = sentences.slice(0, 5).join(" ").trim();
    return summary.slice(0, 800);
  } catch (e) {
    console.error("Fetch error:", e.message);
    return null;
  }
}

bot.command("start", (ctx) => {
  ctx.reply(
    "👋 Hi! I'm **SummaryBot** — send me any URL and I'll summarize it for you!\n\n" +
    `📊 Free: ${FREE_LIMIT} summaries/day\n` +
    "💡 Just paste a link to get started!\n\n" +
    "Commands:\n/help — How to use\n/usage — Check daily usage",
    { parse_mode: "Markdown" }
  );
});

bot.command("help", (ctx) => {
  ctx.reply(
    "📖 **How to use SummaryBot:**\n\n" +
    "1. Send me any URL (article, blog, news)\n" +
    "2. I'll fetch and summarize it instantly\n" +
    "3. Save time reading long articles!\n\n" +
    `Free limit: ${FREE_LIMIT} summaries per day.`,
    { parse_mode: "Markdown" }
  );
});

bot.command("usage", (ctx) => {
  const used = getUsage(ctx.from.id);
  ctx.reply(`📊 Today's usage: ${used}/${FREE_LIMIT} summaries`);
});

// URL detection
const urlRegex = /https?:\/\/[^\s]+/;

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  const match = text.match(urlRegex);
  
  if (!match) {
    return ctx.reply("🔗 Send me a URL and I'll summarize it for you!");
  }

  const used = getUsage(ctx.from.id);
  if (used >= FREE_LIMIT) {
    return ctx.reply("⚠️ You've reached today's free limit. Come back tomorrow!");
  }

  const url = match[0];
  await ctx.reply("⏳ Fetching and summarizing...");
  
  const summary = await fetchSummary(url);
  if (!summary) {
    return ctx.reply("❌ Couldn't fetch that URL. Make sure it's a valid, public webpage.");
  }

  addUsage(ctx.from.id);
  const remaining = FREE_LIMIT - getUsage(ctx.from.id);
  
  await ctx.reply(
    `📝 **Summary:**\n\n${summary}\n\n` +
    `📊 ${remaining} summaries remaining today`,
    { parse_mode: "Markdown" }
  );
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start();
console.log("🤖 SummaryBot is running!");
