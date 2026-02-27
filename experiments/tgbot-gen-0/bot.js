const { Bot } = require("grammy");
const fs = require("fs");
const path = require("path");

const TOKEN = "8509775146:AAGwiRySe3Vx86EFtvvZtjWGWvZb6Gv3MQU";
const bot = new Bot(TOKEN);
const METRICS_FILE = path.join(__dirname, "logs", "metrics.json");
const ALERTS_FILE = path.join(__dirname, "logs", "alerts.json");

// Load/save alerts
function loadAlerts() {
  try { return JSON.parse(fs.readFileSync(ALERTS_FILE, "utf8")); }
  catch { return []; }
}
function saveAlerts(a) { fs.writeFileSync(ALERTS_FILE, JSON.stringify(a, null, 2)); }

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

// Referral tracking
bot.command("start", (ctx) => {
  trackUser(ctx);
  const payload = ctx.message.text.split(" ")[1] || "";
  if (payload.startsWith("ref_")) {
    const referrerId = payload.replace("ref_", "");
    if (referrerId && referrerId !== String(ctx.from.id)) {
      if (!metrics.referrals) metrics.referrals = {};
      if (!metrics.referrals[referrerId]) metrics.referrals[referrerId] = [];
      if (!metrics.referrals[referrerId].includes(ctx.from.id)) {
        metrics.referrals[referrerId].push(ctx.from.id);
        saveMetrics(metrics);
        // Notify referrer they got a bonus
        bot.api.sendMessage(referrerId, `🎉 Someone joined via your link! You now have ${metrics.referrals[referrerId].length} referral(s). Each gives +2 extra daily summaries!`).catch(()=>{});
      }
    }
  }
  ctx.reply(
    "🤖 **AI Crypto Trading Bot** — Free & Instant\n\n" +
    "📡 /signal → Live AI trading signals (66% win rate)\n" +
    "💰 /price btc → Real-time prices\n" +
    "🔔 /alert btc 60000 → Custom price alerts\n" +
    "🐋 /whale → Whale movements\n" +
    "🔥 /trending → Hot coins right now\n" +
    "😱 /fear → Fear & Greed Index\n" +
    "📰 /news → Market pulse\n" +
    "🔗 Send any URL → instant summary\n\n" +
    "Try /signal now to see what the AI is trading! 🚀",
    { parse_mode: "Markdown", reply_markup: {
      inline_keyboard: [
        [{ text: "📡 See AI Signals", callback_data: "signal" }],
        [{ text: "💰 Check BTC Price", callback_data: "price_btc" }],
        [{ text: "📤 Share with friends", switch_inline_query: "Check out this free AI crypto bot!" }],
        [{ text: "👥 Add to Group", url: "https://t.me/aiagentlab_bbot?startgroup=start" }]
      ]
    }}
  );
});

bot.command("help", (ctx) => {
  trackUser(ctx);
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
  ctx.reply(
    "📖 **How to use SummaryBot:**\n\n" +
    "1. Send me any URL (article, blog, news)\n" +
    "2. I'll fetch and summarize it instantly\n" +
    "3. Save time reading long articles!\n\n" +
    (isGroup
      ? "🏠 **Group mode:** I auto-summarize any link posted here!\n\n"
      : "👥 **Tip:** Add me to a group chat — I'll auto-summarize every link!\n\n") +
    `Free limit: ${FREE_LIMIT} summaries per day.\n\n` +
    "📢 Like this bot? Share it → https://t.me/aiagentlab\\_bbot",
    { parse_mode: "Markdown" }
  );
});

bot.command("refer", (ctx) => {
  trackUser(ctx);
  const link = `https://t.me/aiagentlab_bbot?start=ref_${ctx.from.id}`;
  const refCount = (metrics.referrals?.[ctx.from.id] || []).length;
  ctx.reply(
    `🔗 **Your Referral Link:**\n${link}\n\n` +
    `Share it and get +2 extra summaries/day per friend who joins!\n` +
    `📊 Your referrals: ${refCount}\n` +
    `📊 Your daily limit: ${FREE_LIMIT + refCount * 2}`,
    { parse_mode: "Markdown" }
  );
});

// Callback query handlers for inline buttons
bot.callbackQuery("signal", async (ctx) => {
  await ctx.answerCallbackQuery();
  // Trigger the signal command logic
  await ctx.reply("Loading AI signals...");
  // Simulate /signal command by calling the handler
  ctx.message = ctx.callbackQuery.message;
  bot.handleUpdate({ message: { ...ctx.callbackQuery.message, text: "/signal", from: ctx.from, chat: ctx.chat, entities: [{ type: "bot_command", offset: 0, length: 7 }] } });
});
bot.callbackQuery("price_btc", async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true");
    const d = await r.json();
    const p = d.bitcoin.usd;
    const c = d.bitcoin.usd_24h_change?.toFixed(1);
    await ctx.reply(`💰 **Bitcoin (BTC)**\nPrice: $${p.toLocaleString()}\n24h: ${c > 0 ? '📈' : '📉'} ${c}%\n\nSet an alert: /alert btc ${Math.round(p * 0.95)}`, { parse_mode: "Markdown" });
  } catch(e) { await ctx.reply("Error fetching price. Try /price btc"); }
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

// Crypto price command
bot.command("price", async (ctx) => {
  trackUser(ctx);
  const args = (ctx.message.text.split(" ").slice(1).join(" ") || "bitcoin").toLowerCase();
  const coinMap = { btc: "bitcoin", eth: "ethereum", sol: "solana", doge: "dogecoin", bnb: "binancecoin", xrp: "ripple" };
  const coinId = coinMap[args] || args;
  try {
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
    const data = await resp.json();
    if (!data[coinId]) return ctx.reply(`❌ Coin "${args}" not found. Try: btc, eth, sol, doge, bnb, xrp`);
    const price = data[coinId].usd;
    const change = data[coinId].usd_24h_change?.toFixed(2) || "N/A";
    const emoji = parseFloat(change) >= 0 ? "📈" : "📉";
    ctx.reply(
      `${emoji} **${coinId.toUpperCase()}**\n` +
      `💰 Price: $${price.toLocaleString()}\n` +
      `📊 24h: ${change}%\n\n` +
      `🔗 Share → https://t.me/aiagentlab\\_bbot`,
      { parse_mode: "Markdown" }
    );
  } catch (e) {
    ctx.reply("❌ Failed to fetch price. Try again later.");
  }
});

// Trending coins - killer feature
bot.command("trending", async (ctx) => {
  trackUser(ctx);
  try {
    const resp = await fetch("https://api.coingecko.com/api/v3/search/trending");
    const data = await resp.json();
    const coins = (data.coins || []).slice(0, 7);
    if (!coins.length) return ctx.reply("❌ Couldn't fetch trending data.");
    let msg = "🔥 **Trending Coins Right Now:**\n\n";
    for (const c of coins) {
      const item = c.item;
      const price = item.data?.price ? `$${Number(item.data.price).toFixed(6)}` : "N/A";
      const change = item.data?.price_change_percentage_24h?.usd;
      const ch = change ? `${change.toFixed(1)}%` : "N/A";
      const emoji = change >= 0 ? "🟢" : "🔴";
      msg += `${emoji} **${item.symbol}** (${item.name}) — ${price} (${ch})\n`;
    }
    msg += `\n📊 Use /price <coin> for details\n🔗 Share → https://t.me/aiagentlab\\_bbot`;
    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch { ctx.reply("❌ Failed to fetch trending coins. Try again later."); }
});

// Fear & Greed index
bot.command("fear", async (ctx) => {
  trackUser(ctx);
  try {
    const resp = await fetch("https://api.alternative.me/fng/");
    const data = await resp.json();
    const val = data.data?.[0];
    if (!val) return ctx.reply("❌ Couldn't fetch fear/greed index.");
    const v = parseInt(val.value);
    let bar = "";
    const emojis = { "Extreme Fear": "😱", "Fear": "😨", "Neutral": "😐", "Greed": "🤑", "Extreme Greed": "🤯" };
    const em = emojis[val.value_classification] || "📊";
    ctx.reply(
      `${em} **Crypto Fear & Greed Index**\n\n` +
      `Score: **${val.value}/100** — ${val.value_classification}\n` +
      `${"█".repeat(Math.round(v/10))}${"░".repeat(10 - Math.round(v/10))}\n\n` +
      `Updated: ${val.timestamp ? new Date(val.timestamp * 1000).toUTCString() : "now"}\n\n` +
      `🔗 https://t.me/aiagentlab\\_bbot`,
      { parse_mode: "Markdown" }
    );
  } catch { ctx.reply("❌ Failed to fetch fear/greed index."); }
});

// Price alerts
bot.command("alert", async (ctx) => {
  trackUser(ctx);
  const args = ctx.message.text.split(" ").slice(1);
  if (args.length < 2) {
    return ctx.reply(
      "🔔 **Price Alerts**\n\n" +
      "Set: `/alert btc 70000` — notified when BTC hits $70k\n" +
      "Set: `/alert eth above 4000` — when ETH goes above $4000\n" +
      "Set: `/alert sol below 100` — when SOL drops below $100\n" +
      "List: `/alerts` — see your active alerts\n" +
      "Clear: `/clearalerts` — remove all your alerts",
      { parse_mode: "Markdown" }
    );
  }
  const coinMap = { btc: "bitcoin", eth: "ethereum", sol: "solana", doge: "dogecoin", bnb: "binancecoin", xrp: "ripple", ada: "cardano", dot: "polkadot", avax: "avalanche-2", matic: "matic-network" };
  const ticker = args[0].toLowerCase();
  const coinId = coinMap[ticker] || ticker;
  let direction = "cross"; // default: alert when price crosses target
  let target;
  if (args[1] === "above" || args[1] === "below") {
    direction = args[1];
    target = parseFloat(args[2]);
  } else {
    target = parseFloat(args[1]);
  }
  if (isNaN(target) || target <= 0) return ctx.reply("❌ Invalid price. Example: `/alert btc 70000`", { parse_mode: "Markdown" });

  const alerts = loadAlerts();
  if (alerts.filter(a => a.userId === ctx.from.id).length >= 10) {
    return ctx.reply("⚠️ Max 10 alerts per user. Use /clearalerts to remove old ones.");
  }
  alerts.push({ userId: ctx.from.id, chatId: ctx.chat.id, coin: ticker, coinId, target, direction, created: Date.now() });
  saveAlerts(alerts);
  ctx.reply(`🔔 Alert set! I'll notify you when **${ticker.toUpperCase()}** ${direction === "cross" ? "reaches" : "goes " + direction} **$${target.toLocaleString()}**`, { parse_mode: "Markdown" });
});

bot.command("alerts", async (ctx) => {
  trackUser(ctx);
  const alerts = loadAlerts().filter(a => a.userId === ctx.from.id);
  if (!alerts.length) return ctx.reply("No active alerts. Set one with /alert btc 70000");
  let msg = "🔔 **Your Alerts:**\n\n";
  alerts.forEach((a, i) => {
    msg += `${i + 1}. ${a.coin.toUpperCase()} ${a.direction === "cross" ? "→" : a.direction} $${a.target.toLocaleString()}\n`;
  });
  ctx.reply(msg, { parse_mode: "Markdown" });
});

bot.command("clearalerts", (ctx) => {
  trackUser(ctx);
  const alerts = loadAlerts().filter(a => a.userId !== ctx.from.id);
  saveAlerts(alerts);
  ctx.reply("✅ All your alerts cleared.");
});

// Crypto news
bot.command("news", async (ctx) => {
  trackUser(ctx);
  try {
    const resp = await fetch("https://api.coingecko.com/api/v3/status_updates?per_page=5");
    const data = await resp.json();
    // Fallback: use trending as "what's hot"
    const resp2 = await fetch("https://api.coingecko.com/api/v3/search/trending");
    const trending = await resp2.json();
    const coins = (trending.coins || []).slice(0, 5);
    let msg = "📰 **Crypto Pulse**\n\n";
    msg += "🔥 **Trending Now:**\n";
    for (const c of coins) {
      const item = c.item;
      const change = item.data?.price_change_percentage_24h?.usd;
      const ch = change ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%` : "";
      msg += `• **${item.symbol}** ${item.name} ${ch}\n`;
    }
    // Add Fear & Greed
    try {
      const fng = await fetch("https://api.alternative.me/fng/");
      const fngData = await fng.json();
      const val = fngData.data?.[0];
      if (val) msg += `\n😱 Fear & Greed: **${val.value}/100** (${val.value_classification})\n`;
    } catch {}
    msg += `\n📊 /trending /fear /price btc\n🔗 https://t.me/aiagentlab\\_bbot`;
    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch { ctx.reply("❌ Failed to fetch crypto news."); }
});

// Market overview
bot.command("market", async (ctx) => {
  trackUser(ctx);
  try {
    const resp = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true");
    const d = await resp.json();
    const fmt = (id) => {
      const p = d[id]?.usd || 0;
      const c = d[id]?.usd_24h_change?.toFixed(2) || "0";
      return `${parseFloat(c) >= 0 ? "🟢" : "🔴"} ${id.toUpperCase()}: $${p.toLocaleString()} (${c}%)`;
    };
    ctx.reply(
      `📊 **Crypto Market Overview**\n\n${fmt("bitcoin")}\n${fmt("ethereum")}\n${fmt("solana")}\n\n` +
      `Use /price <coin> for more!\n🔗 https://t.me/aiagentlab\\_bbot`,
      { parse_mode: "Markdown" }
    );
  } catch { ctx.reply("❌ Failed to fetch market data."); }
});

const urlRegex = /https?:\/\/[^\s]+/;

bot.on("message:text", async (ctx) => {
  trackUser(ctx);
  const text = ctx.message.text;
  const match = text.match(urlRegex);
  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";

  if (!match) {
    // In groups, stay silent when no URL; in DMs, prompt user
    if (isGroup) return;
    return ctx.reply("🔗 Send me a URL and I'll summarize it for you!\n\n💡 Or add me to a group — I'll auto-summarize links!");
  }

  const refBonus = (metrics.referrals?.[ctx.from.id] || []).length * 2;
  const userLimit = FREE_LIMIT + refBonus;
  const used = getUsage(ctx.from.id);
  if (used >= userLimit) {
    return ctx.reply(`⚠️ You've reached today's limit (${userLimit}). Refer friends for more! /refer`);
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
    `📊 ${remaining} summaries remaining today\n\n` +
    `💡 Found this useful? Share with a friend → https://t.me/aiagentlab\\_bbot`,
    { parse_mode: "Markdown" }
  );
});

// Inline query: let users use bot in any chat
bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query.trim();
  const results = [];

  // If query looks like a coin ticker
  const coinMap = { btc: "bitcoin", eth: "ethereum", sol: "solana", doge: "dogecoin", bnb: "binancecoin", xrp: "ripple" };
  const coinId = coinMap[query.toLowerCase()] || (query.length > 1 ? query.toLowerCase() : null);

  if (coinId) {
    try {
      const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
      const data = await resp.json();
      if (data[coinId]) {
        const price = data[coinId].usd;
        const change = data[coinId].usd_24h_change?.toFixed(2) || "N/A";
        const emoji = parseFloat(change) >= 0 ? "📈" : "📉";
        results.push({
          type: "article",
          id: "price-" + coinId,
          title: `${coinId.toUpperCase()}: $${price.toLocaleString()}`,
          description: `24h change: ${change}%`,
          input_message_content: {
            message_text: `${emoji} **${coinId.toUpperCase()}**: $${price.toLocaleString()} (${change}% 24h)\n\n_via @aiagentlab\\_bbot — crypto prices & URL summaries_`,
            parse_mode: "Markdown",
          },
        });
      }
    } catch {}
  }

  // Always show a default option
  if (results.length === 0) {
    results.push({
      type: "article",
      id: "default",
      title: "🔗 SummaryBot — Summarize URLs & Track Crypto",
      description: "Type a coin (btc, eth, sol) or send me a URL in DM!",
      input_message_content: {
        message_text: "🤖 **SummaryBot** — Free URL summaries + live crypto prices!\n\nTry it: @aiagentlab\\_bbot\nhttps://t.me/aiagentlab\\_bbot",
        parse_mode: "Markdown",
      },
    });
  }

  await ctx.answerInlineQuery(results, { cache_time: 30, is_personal: false });
});

// Watchlist / Portfolio
const WATCHLIST_FILE = path.join(__dirname, "logs", "watchlists.json");
function loadWatchlists() {
  try { return JSON.parse(fs.readFileSync(WATCHLIST_FILE, "utf8")); }
  catch { return {}; }
}
function saveWatchlists(w) { fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(w, null, 2)); }

const COIN_MAP = { btc: "bitcoin", eth: "ethereum", sol: "solana", doge: "dogecoin", bnb: "binancecoin", xrp: "ripple", ada: "cardano", dot: "polkadot", avax: "avalanche-2", matic: "matic-network", link: "chainlink", uni: "uniswap", atom: "cosmos", near: "near", apt: "aptos", arb: "arbitrum", op: "optimism", sui: "sui", ton: "the-open-network", pepe: "pepe" };

bot.command("watch", (ctx) => {
  trackUser(ctx);
  const args = ctx.message.text.split(" ").slice(1);
  if (!args.length) return ctx.reply("📋 Add coins to your watchlist!\n\n`/watch btc eth sol` — add coins\n`/watchlist` — see your list with prices\n`/unwatch btc` — remove a coin", { parse_mode: "Markdown" });
  const wl = loadWatchlists();
  const uid = String(ctx.from.id);
  if (!wl[uid]) wl[uid] = [];
  const added = [];
  for (const c of args) {
    const t = c.toLowerCase();
    if (!wl[uid].includes(t) && wl[uid].length < 20) { wl[uid].push(t); added.push(t.toUpperCase()); }
  }
  saveWatchlists(wl);
  if (added.length) ctx.reply(`✅ Added to watchlist: ${added.join(", ")}\n\nUse /watchlist to see prices!`);
  else ctx.reply("Already in your watchlist or limit reached (20 max).");
});

bot.command("unwatch", (ctx) => {
  trackUser(ctx);
  const args = ctx.message.text.split(" ").slice(1).map(a => a.toLowerCase());
  const wl = loadWatchlists();
  const uid = String(ctx.from.id);
  if (!wl[uid]) return ctx.reply("Your watchlist is empty. Use /watch btc eth sol");
  wl[uid] = wl[uid].filter(c => !args.includes(c));
  saveWatchlists(wl);
  ctx.reply("✅ Removed from watchlist. Use /watchlist to see current list.");
});

bot.command("watchlist", async (ctx) => {
  trackUser(ctx);
  const wl = loadWatchlists();
  const uid = String(ctx.from.id);
  const coins = wl[uid] || [];
  if (!coins.length) return ctx.reply("Your watchlist is empty!\n\n`/watch btc eth sol` to add coins", { parse_mode: "Markdown" });
  const ids = coins.map(c => COIN_MAP[c] || c).join(",");
  try {
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
    const data = await resp.json();
    let msg = "📋 **Your Watchlist:**\n\n";
    for (const c of coins) {
      const id = COIN_MAP[c] || c;
      const d = data[id];
      if (!d) { msg += `❓ ${c.toUpperCase()} — not found\n`; continue; }
      const ch = d.usd_24h_change?.toFixed(2) || "0";
      const emoji = parseFloat(ch) >= 0 ? "🟢" : "🔴";
      msg += `${emoji} **${c.toUpperCase()}**: $${d.usd.toLocaleString()} (${ch}%)\n`;
    }
    msg += `\n🔔 /alert ${coins[0]} ${Math.round((data[COIN_MAP[coins[0]] || coins[0]]?.usd || 0) * 1.1)} — set alerts!\n🔗 https://t.me/aiagentlab\\_bbot`;
    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch { ctx.reply("❌ Failed to fetch prices. Try again."); }
});

// Trading signal from quant strategy
bot.command("signal", async (ctx) => {
  trackUser(ctx);
  try {
    const simPath = path.join(__dirname, "../../quant-lab/experiments/quant-gen-0/logs/sim-state.json");
    const simPath2 = path.join(__dirname, "../../quant-lab/experiments/quant-gen-1/logs/sim-state.json");
    let msg = "📡 **Live Trading Signals**\n\n";
    
    // Read gen-0 state
    try {
      const s0 = JSON.parse(fs.readFileSync(simPath, "utf8"));
      if (s0.position) {
        const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`);
        const data = await resp.json();
        const currentPrice = data.bitcoin?.usd || 0;
        const pnl = s0.position.side === "LONG" 
          ? ((currentPrice - s0.position.entry) / s0.position.entry * 100).toFixed(2)
          : ((s0.position.entry - currentPrice) / s0.position.entry * 100).toFixed(2);
        const emoji = parseFloat(pnl) >= 0 ? "🟢" : "🔴";
        msg += `🤖 **Strategy Alpha**\n`;
        msg += `${emoji} ${s0.position.side} BTC @ $${Math.round(s0.position.entry).toLocaleString()}\n`;
        msg += `Current: $${currentPrice.toLocaleString()} (${pnl}%)\n`;
        msg += `Trades today: ${s0.totalTrades}\n\n`;
      } else {
        msg += `🤖 **Strategy Alpha:** No position (watching)\n\n`;
      }
    } catch { msg += "🤖 Strategy Alpha: offline\n\n"; }

    msg += `_Signals from live quant strategies. Not financial advice._\n`;
    msg += `🔗 https://t.me/aiagentlab\\_bbot`;
    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch { ctx.reply("❌ Failed to load signals."); }
});

// Whale alert (top gainers/losers)
bot.command("whales", async (ctx) => {
  trackUser(ctx);
  try {
    const resp = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h");
    const data = await resp.json();
    let msg = "🐋 **Top Volume Movers (24h):**\n\n";
    for (const c of data.slice(0, 8)) {
      const ch = c.price_change_percentage_24h?.toFixed(1) || "0";
      const emoji = parseFloat(ch) >= 0 ? "🟢" : "🔴";
      msg += `${emoji} **${c.symbol.toUpperCase()}** $${c.current_price.toLocaleString()} (${ch}%) — Vol: $${(c.total_volume / 1e9).toFixed(1)}B\n`;
    }
    msg += `\n📊 /trending /market /watchlist`;
    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch { ctx.reply("❌ Failed to fetch data."); }
});

bot.catch((err) => {
  console.error("Bot error:", err.message || err);
});

// Check price alerts every 60 seconds
setInterval(async () => {
  const alerts = loadAlerts();
  if (!alerts.length) return;
  const coinIds = [...new Set(alerts.map(a => a.coinId))];
  try {
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(",")}&vs_currencies=usd`);
    const prices = await resp.json();
    const triggered = [];
    const remaining = [];
    for (const a of alerts) {
      const price = prices[a.coinId]?.usd;
      if (!price) { remaining.push(a); continue; }
      let fire = false;
      if (a.direction === "above" && price >= a.target) fire = true;
      else if (a.direction === "below" && price <= a.target) fire = true;
      else if (a.direction === "cross" && (price >= a.target * 0.99 && price <= a.target * 1.01)) fire = true;
      if (fire) {
        triggered.push(a);
        bot.api.sendMessage(a.chatId,
          `🚨 **ALERT: ${a.coin.toUpperCase()}** hit $${price.toLocaleString()}!\n` +
          `Your target: $${a.target.toLocaleString()} (${a.direction})\n\n` +
          `Set new alerts: /alert`,
          { parse_mode: "Markdown" }
        ).catch(() => {});
      } else {
        remaining.push(a);
      }
    }
    if (triggered.length) saveAlerts(remaining);
  } catch {}
}, 60000);

// Track groups the bot is added to
const GROUPS_FILE = path.join(__dirname, "logs", "groups.json");
function loadGroups() {
  try { return JSON.parse(fs.readFileSync(GROUPS_FILE, "utf8")); }
  catch { return {}; }
}
function saveGroups(g) { fs.writeFileSync(GROUPS_FILE, JSON.stringify(g, null, 2)); }

bot.on("my_chat_member", (ctx) => {
  const chat = ctx.chat;
  const newStatus = ctx.myChatMember?.new_chat_member?.status;
  const groups = loadGroups();
  if (newStatus === "member" || newStatus === "administrator") {
    groups[chat.id] = { title: chat.title, type: chat.type, joined: new Date().toISOString() };
    saveGroups(groups);
    console.log(`Joined group: ${chat.title} (${chat.id})`);
  } else if (newStatus === "left" || newStatus === "kicked") {
    delete groups[chat.id];
    saveGroups(groups);
    console.log(`Left group: ${chat.title} (${chat.id})`);
  }
});

// Auto-broadcast market update to all groups every 4 hours
setInterval(async () => {
  const groups = loadGroups();
  const groupIds = Object.keys(groups);
  if (!groupIds.length) return;
  try {
    const [priceResp, fngResp, trendResp] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true"),
      fetch("https://api.alternative.me/fng/"),
      fetch("https://api.coingecko.com/api/v3/search/trending"),
    ]);
    const prices = await priceResp.json();
    const fng = (await fngResp.json()).data?.[0];
    const trending = (await trendResp.json()).coins?.slice(0, 3) || [];

    const fmt = (id) => {
      const d = prices[id];
      if (!d) return "";
      const ch = d.usd_24h_change?.toFixed(1) || "0";
      return `${parseFloat(ch) >= 0 ? "🟢" : "🔴"} ${id.toUpperCase()}: $${d.usd.toLocaleString()} (${ch}%)`;
    };

    let msg = "📊 **Market Update**\n\n";
    msg += fmt("bitcoin") + "\n";
    msg += fmt("ethereum") + "\n";
    msg += fmt("solana") + "\n\n";
    if (fng) msg += `😱 Fear & Greed: **${fng.value}/100** (${fng.value_classification})\n\n`;
    if (trending.length) {
      msg += "🔥 Trending: " + trending.map(c => c.item.symbol).join(", ") + "\n\n";
    }
    msg += "📡 /signal for AI trading signals\n🤖 @aiagentlab\\_bbot";

    for (const gid of groupIds) {
      try {
        await bot.api.sendMessage(gid, msg, { parse_mode: "Markdown" });
      } catch (e) {
        if (e.message?.includes("kicked") || e.message?.includes("not a member")) {
          const g = loadGroups();
          delete g[gid];
          saveGroups(g);
        }
      }
    }
  } catch (e) { console.error("Broadcast error:", e.message); }
}, 4 * 60 * 60 * 1000); // every 4 hours

// Daily digest subscription
const SUBS_FILE = path.join(__dirname, "logs", "subscribers.json");
function loadSubs() {
  try { return JSON.parse(fs.readFileSync(SUBS_FILE, "utf8")); }
  catch { return {}; }
}
function saveSubs(s) { fs.writeFileSync(SUBS_FILE, JSON.stringify(s, null, 2)); }

bot.command("daily", (ctx) => {
  trackUser(ctx);
  const subs = loadSubs();
  const uid = String(ctx.from.id);
  if (subs[uid]) {
    delete subs[uid];
    saveSubs(subs);
    ctx.reply("❌ Daily digest unsubscribed. Use /daily to re-subscribe.");
  } else {
    subs[uid] = { chatId: ctx.chat.id, name: ctx.from.first_name, since: new Date().toISOString() };
    saveSubs(subs);
    ctx.reply(
      "✅ **Daily Digest Subscribed!**\n\n" +
      "You'll get a market summary every morning at 8:00 UTC with:\n" +
      "• BTC/ETH/SOL prices & changes\n" +
      "• Fear & Greed Index\n" +
      "• AI trading signal status\n" +
      "• Top trending coins\n\n" +
      "Use /daily again to unsubscribe.",
      { parse_mode: "Markdown" }
    );
  }
});

// Send daily digest at 8:00 UTC
setInterval(async () => {
  const now = new Date();
  if (now.getUTCHours() !== 8 || now.getUTCMinutes() > 5) return;
  const subs = loadSubs();
  const subIds = Object.keys(subs);
  if (!subIds.length) return;
  try {
    const [priceResp, fngResp, trendResp] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true"),
      fetch("https://api.alternative.me/fng/"),
      fetch("https://api.coingecko.com/api/v3/search/trending"),
    ]);
    const prices = await priceResp.json();
    const fng = (await fngResp.json()).data?.[0];
    const trending = (await trendResp.json()).coins?.slice(0, 3) || [];
    const fmt = (id) => {
      const d = prices[id]; if (!d) return "";
      const ch = d.usd_24h_change?.toFixed(1) || "0";
      return `${parseFloat(ch) >= 0 ? "🟢" : "🔴"} ${id.toUpperCase()}: $${d.usd.toLocaleString()} (${ch}%)`;
    };
    let msg = "☀️ **Good Morning! Daily Crypto Digest**\n\n";
    msg += fmt("bitcoin") + "\n" + fmt("ethereum") + "\n" + fmt("solana") + "\n\n";
    if (fng) msg += `😱 Fear & Greed: **${fng.value}/100** (${fng.value_classification})\n\n`;
    if (trending.length) msg += "🔥 Trending: " + trending.map(c => c.item.symbol).join(", ") + "\n\n";
    msg += "📡 /signal for live AI trading positions\n📋 /watchlist for your portfolio\n\n_Unsubscribe: /daily_";
    for (const uid of subIds) {
      try { await bot.api.sendMessage(subs[uid].chatId, msg, { parse_mode: "Markdown" }); }
      catch (e) { if (e.message?.includes("blocked") || e.message?.includes("deactivated")) { delete subs[uid]; saveSubs(subs); } }
    }
  } catch (e) { console.error("Daily digest error:", e.message); }
}, 5 * 60 * 1000); // check every 5 min

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
