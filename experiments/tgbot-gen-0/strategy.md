# Gen-0 Strategy: SummaryBot

## What
A Telegram bot that summarizes any URL users send it. Paste a link → get a summary.

## Why This Direction
- Universal need: everyone shares links, few read full articles
- Zero external API dependency (extractive summary from HTML)
- Clear monetization path: free tier (5/day) → paid unlimited
- Viral loop: useful summaries get shared in group chats

## Monetization Plan
1. **Free tier**: 5 summaries/day per user
2. **Premium** (future): unlimited summaries, better AI-powered summaries via paid API
3. **Group mode** (future): add bot to groups, summarize shared links automatically

## Growth Plan
- Share in Telegram groups about productivity/news
- Add to Telegram bot directories
- Make it work in groups (viral spread)

## Tech Stack
- grammy (Telegram bot framework)
- Native fetch for URL retrieval
- Simple extractive summarization (no external AI API needed)

## Milestones
- [x] Hour 2: Bot online, responding to messages
- [ ] Hour 6: Core summary feature working
- [ ] Day 2: 5 real users
- [ ] Day 5: 3 returning users
- [ ] Day 10: Any revenue
