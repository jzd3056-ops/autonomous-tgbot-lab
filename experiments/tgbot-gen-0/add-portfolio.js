// This script patches bot.js to add portfolio tracking
const fs = require('fs');
const botCode = fs.readFileSync('bot.js', 'utf8');

// Add portfolio feature before the bot.catch line
const portfolioCode = `
// Portfolio P&L Tracker
const PORTFOLIO_FILE = path.join(__dirname, "logs", "portfolios.json");
function loadPortfolios() {
  try { return JSON.parse(fs.readFileSync(PORTFOLIO_FILE, "utf8")); }
  catch { return {}; }
}
function savePortfolios(p) { fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(p, null, 2)); }

bot.command("buy", async (ctx) => {
  trackUser(ctx);
  const args = ctx.message.text.split(" ").slice(1);
  if (args.length < 2) return ctx.reply("📦 Track your buys!\\n\\n\\\`/buy btc 1000\\\` — record buying $1000 of BTC at current price\\n\\\`/buy eth 500 3200\\\` — record buying $500 of ETH at $3200\\n\\\`/portfolio\\\` — see your P&L\\n\\\`/sell btc\\\` — clear a position", { parse_mode: "Markdown" });
  const coin = args[0].toLowerCase();
  const amount = parseFloat(args[1]);
  if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid amount. Example: /buy btc 1000");
  
  let buyPrice = parseFloat(args[2]);
  if (!buyPrice || isNaN(buyPrice)) {
    // Fetch current price
    const coinId = COIN_MAP[coin] || coin;
    try {
      const resp = await fetch(\\\`https://api.coingecko.com/api/v3/simple/price?ids=\\\${coinId}&vs_currencies=usd\\\`);
      const data = await resp.json();
      buyPrice = data[coinId]?.usd;
      if (!buyPrice) return ctx.reply("❌ Coin not found. Use ticker like btc, eth, sol");
    } catch { return ctx.reply("❌ Failed to fetch price. Try again."); }
  }
  
  const portfolios = loadPortfolios();
  const uid = String(ctx.from.id);
  if (!portfolios[uid]) portfolios[uid] = {};
  if (!portfolios[uid][coin]) portfolios[uid][coin] = [];
  portfolios[uid][coin].push({ amount, price: buyPrice, date: new Date().toISOString() });
  savePortfolios(portfolios);
  
  const qty = amount / buyPrice;
  ctx.reply(
    \\\`✅ Recorded: Bought $\\\${amount} of **\\\${coin.toUpperCase()}** at $\\\${buyPrice.toLocaleString()}\\n\\\` +
    \\\`📦 Quantity: \\\${qty.toFixed(6)} \\\${coin.toUpperCase()}\\n\\n\\\` +
    \\\`Use /portfolio to track your P&L!\\\`,
    { parse_mode: "Markdown" }
  );
});

bot.command("sell", (ctx) => {
  trackUser(ctx);
  const coin = (ctx.message.text.split(" ")[1] || "").toLowerCase();
  if (!coin) return ctx.reply("Usage: /sell btc — removes your BTC position");
  const portfolios = loadPortfolios();
  const uid = String(ctx.from.id);
  if (portfolios[uid]?.[coin]) {
    delete portfolios[uid][coin];
    savePortfolios(portfolios);
    ctx.reply(\\\`✅ Cleared \\\${coin.toUpperCase()} position.\\\`);
  } else {
    ctx.reply("No position found for " + coin.toUpperCase());
  }
});

bot.command("portfolio", async (ctx) => {
  trackUser(ctx);
  const portfolios = loadPortfolios();
  const uid = String(ctx.from.id);
  const positions = portfolios[uid];
  if (!positions || !Object.keys(positions).length) {
    return ctx.reply("📦 No positions yet!\\n\\n\\\`/buy btc 1000\\\` — record a $1000 BTC buy\\n\\\`/buy eth 500 3200\\\` — buy at specific price\\n\\nTrack your crypto P&L in real-time! 📈", { parse_mode: "Markdown" });
  }
  
  const coinIds = Object.keys(positions).map(c => COIN_MAP[c] || c).join(",");
  try {
    const resp = await fetch(\\\`https://api.coingecko.com/api/v3/simple/price?ids=\\\${coinIds}&vs_currencies=usd\\\`);
    const prices = await resp.json();
    
    let msg = "📦 **Your Portfolio**\\n\\n";
    let totalInvested = 0, totalValue = 0;
    
    for (const [coin, buys] of Object.entries(positions)) {
      const coinId = COIN_MAP[coin] || coin;
      const currentPrice = prices[coinId]?.usd;
      if (!currentPrice) { msg += \\\`❓ \\\${coin.toUpperCase()} — price unavailable\\n\\\`; continue; }
      
      let invested = 0, qty = 0;
      for (const b of buys) { invested += b.amount; qty += b.amount / b.price; }
      const value = qty * currentPrice;
      const pnl = value - invested;
      const pnlPct = ((pnl / invested) * 100).toFixed(1);
      const emoji = pnl >= 0 ? "🟢" : "🔴";
      
      totalInvested += invested;
      totalValue += value;
      
      msg += \\\`\\\${emoji} **\\\${coin.toUpperCase()}**: $\\\${value.toFixed(0)} (\\\${pnl >= 0 ? "+" : ""}\\\${pnlPct}%)\\n\\\`;
      msg += \\\`   Cost: $\\\${invested.toFixed(0)} → Now: $\\\${value.toFixed(0)} (\\\${pnl >= 0 ? "+" : ""}$\\\${pnl.toFixed(0)})\\n\\\`;
    }
    
    const totalPnl = totalValue - totalInvested;
    const totalPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(1) : "0";
    const totalEmoji = totalPnl >= 0 ? "🟢" : "🔴";
    
    msg += \\\`\\n\\\${totalEmoji} **Total: $\\\${totalValue.toFixed(0)}** (\\\${totalPnl >= 0 ? "+" : ""}$\\\${totalPnl.toFixed(0)} / \\\${totalPnl >= 0 ? "+" : ""}\\\${totalPct}%)\\n\\\`;
    msg += \\\`💰 Invested: $\\\${totalInvested.toFixed(0)}\\n\\n\\\`;
    msg += "📡 /signal for AI trading ideas\\n🔗 https://t.me/aiagentlab\\\\_bbot";
    
    ctx.reply(msg, { parse_mode: "Markdown" });
  } catch { ctx.reply("❌ Failed to fetch prices. Try again."); }
});
`;

// Insert before bot.catch
const insertPoint = 'bot.catch((err) => {';
if (botCode.includes(insertPoint)) {
  const newCode = botCode.replace(insertPoint, portfolioCode + '\n' + insertPoint);
  fs.writeFileSync('bot.js', newCode);
  console.log('✅ Portfolio feature added to bot.js');
} else {
  console.log('❌ Could not find insertion point');
}
