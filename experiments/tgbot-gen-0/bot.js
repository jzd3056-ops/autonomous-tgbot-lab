const { Bot } = require("grammy");
const fs = require("fs");
const path = require("path");

const TOKEN = "8509775146:AAGwiRySe3Vx86EFtvvZtjWGWvZb6Gv3MQU";
const bot = new Bot(TOKEN);
const METRICS_FILE = path.join(__dirname, "logs", "metrics.json");

// Load/save metrics
function loadMetrics() {
  try { return JSON.parse(fs.readFileSync(METRICS_FILE, "utf8")); }
  catch { return { totalMessages: 0, totalSummaries: 0, users: {}, dailyStats: {} }; }
}
function saveMetrics(m) { fs.writeFileSync(METRICS_FILE, JSON.stringify(m, null, 2)); }

const metrics = loadMetrics();

// Usage tracking (in-memory per day, persisted in metrics)
const FREE_LIMIT = 5;
function todayKey() { return new Date().toISOString().slice(0, 10); }
function getUsage(userId) {
  const day = todayKey();
  return (metrics.dailyStats[day]?.userSummaries?.[userId]) || 0;
}
function addUsage(userId) {
  const day = todayKey();
  if (!metrics.dailyStats[day]) metrics.dailyStats[day] = { messages: 0, summaries: 0, userSummaries: {} };
  metrics.dailyStats[day].userSummaries[userId] = (metrics.dailyStats[day].userSummaries[userId] || 0) + 1;
  metrics.dailyStats[day].summaries++;
  metrics.totalSummaries++;
  saveMetrics(metrics);
}
function trackUser(ctx) {
  const u = ctx.from;
  if (!u) return;
  metrics.users[u.id] = { name: u.first_name, username: u.username, lastSeen: new Date().toISOString() };
  metrics.totalMessages++;
  const day = todayKey();
  if (!metrics.dailyStats[day]) metrics.dailyStats[day] = { messages: 0, summaries: 0, userSummaries: {} };
  metrics.dailyStats[day].messages++;
  saveMetrics(metrics);
}

async function fetchSummary(url) {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SummaryBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await resp.text();
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    text = text.slice(0, 3000);
    if (text.length < 50) return null;
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.slice(0, 5).join(" ").trim().slice(0, 800);
  } catch (e) {
    console.error("Fetch error:", e.message);
    return null;
  }
}

bot.command("start", (ctx) => {
  trackUser(ctx);
  ctx.reply(
    "👋 Hi! I'm **SummaryBot** — send me any URL and I'll summarize it!\n\n" +
    `📊 Free: ${FREE_LIMIT} summaries/day\n` +
    "💡 Just paste a link to get started!\n\n" +
    "Commands:\n/help — How to use\n/usage — Check daily usage\n/stats — Bot stats",
    { parse_mode: "Markdown" }
  );
});

bot.command("help", (ctx) => {
  trackUser(ctx);
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
  trackUser(ctx);
  const used = getUsage(ctx.from.id);
  ctx.reply(`📊 Today's usage: ${used}/${FREE_LIMIT} summaries`);
});

bot.command("stats", (ctx) => {
  trackUser(ctx);
  const userCount = Object.keys(metrics.users).length;
  ctx.reply(
    `📈 **Bot Stats:**\n` +
    `Users: ${userCount}\n` +
    `Total messages: ${metrics.totalMessages}\n` +
    `Total summaries: ${metrics.totalSummaries}`,
    { parse_mode: "Markdown" }
  );
});

const urlRegex = /https?:\/\/[^\s]+/;

bot.on("message:text", async (ctx) => {
  trackUser(ctx);
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
  console.error("Bot error:", err.message || err);
});

// Start with retry logic for 409 conflicts
async function startWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxRetries} to start bot...`);
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      await new Promise(r => setTimeout(r, 2000 * (i + 1))); // increasing delay
      await bot.start({ drop_pending_updates: true, onStart: () => console.log("🤖 SummaryBot is running!") });
      return;
    } catch (e) {
      console.error(`Start attempt ${i + 1} failed: ${e.message}`);
      if (i === maxRetries - 1) {
        console.error("All retries exhausted. Exiting.");
        process.exit(1);
      }
    }
  }
}

startWithRetry();
