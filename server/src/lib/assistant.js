// Builds the answer from facts gathered first: the model only phrases
// them. Without an API key a plain summariser does the phrasing instead.
//
//   PROMPT    the rules the model follows
//   FORMAT    money and percentages
//   FACTS     everything the model is allowed to draw on
//   FALLBACK  the answer when no model is configured
//   MODEL     the call to Groq, and who answers
//   SOURCES   what the answer was based on

// ── PROMPT ──────────────────────────────────────────────────────────
// Behaviour lives here, not in code: to change how the assistant
// answers, edit this text.

const SYSTEM_PROMPT = `You are the assistant inside a market sentiment dashboard.

Rules:
- Answer only from the DATA block. Never use outside knowledge about prices,
  companies or markets.
- If the data does not cover the question, say so plainly and name what is
  missing. Do not guess.
- Never recommend buying, selling or holding, and never hint at one. When
  asked for that, say in one short sentence that you do not give buy or sell
  advice, then describe what the numbers do show. Never explain that refusal
  as missing data — it is a rule, and the data is not the reason.
- If the user greets you, greet them back in a few words, then explain you are 
  and what you can do in one sentence what you can help with: their portfolio 
  and watchlist, live prices, and recent headlines. If they ask about anything 
  other than markets and their own account, do not answer it — say that is outside
  what you cover and name those same things instead. Either way, do not list their 
  holdings unless they ask.
- If the user asks how to use the site, where to find a screen or a feature,
  or seems lost, tell them to click the Help button in the navigation bar,
  between the Light/Dark switch and Assistant buttons, which replays the guided tour.
 Do not try to describe the screens yourself.
- Two or three sentences. Plain sentences, no bullet points, no markdown.`

// ── FORMAT ──────────────────────────────────────────────────────────
// 'unknown' rather than a blank, so a missing number reads as missing

const money = n =>
  n === null || n === undefined ? 'unknown' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

const percent = n =>
  n === null || n === undefined ? 'unknown' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`

// ── FACTS ───────────────────────────────────────────────────────────
// Flattened into plain text. Nothing outside this block reaches the model.

export function renderFacts(facts) {
  const lines = []

  if (facts.symbol) lines.push(`The user is looking at ${facts.symbol}.`)

  if (facts.asked?.length) {
    lines.push(`The question names ${facts.asked.join(', ')}, so answer about those.`)

    // "Not in the database" and "price feed is down" are different
    // answers, and a missing price line looks the same for both.
    const unpriced = facts.asked.filter(s => !facts.quotes.some(q => q.symbol === s))

    if (unpriced.length) {
      lines.push(
        `${unpriced.join(', ')} ${unpriced.length > 1 ? 'are' : 'is'} listed in the database, ` +
        `but no live price could be fetched just now. Say the price is temporarily unavailable — ` +
        `do not say the asset is unknown.`
      )
    }
  }

  if (facts.quotes.length) {
    lines.push('Live prices:')
    facts.quotes.forEach(q =>
      lines.push(`- ${q.symbol} (${q.name}) ${money(q.price)}, ${percent(q.changePercent)} today, trades on ${q.market || 'unknown'}`)
    )
  }

  if (facts.portfolio.holdings.length) {
    const s = facts.portfolio.summary
    lines.push(`Portfolio: ${s.holdings} holdings, invested ${money(s.cost)}, now worth ${money(s.value)}, profit ${money(s.profit)} (${percent(s.profitPercent)}).`)
    facts.portfolio.holdings.forEach(h =>
      lines.push(`- ${h.quantity} ${h.symbol} bought ${h.buyDate} at ${money(h.buyPrice)}, now ${money(h.price)}, profit ${money(h.profit)} (${percent(h.profitPercent)})`)
    )
  } else {
    lines.push('Portfolio: empty, the user has not added any holdings.')
  }

  if (facts.watchlist.length) {
    lines.push(`Watchlist: ${facts.watchlist.map(w => w.symbol).join(', ')}.`)
  } else {
    lines.push('Watchlist: empty.')
  }

  if (facts.news.length) {
    lines.push('Recent headlines:')
    facts.news.forEach(n => lines.push(`- ${n.source}: ${n.headline}`))
  }

  lines.push('Sentiment scores and predictions: not available yet, the analysis service is not connected.')

  return lines.join('\n')
}

// ── FALLBACK ────────────────────────────────────────────────────────
// Used when no GROQ_API_KEY is set, and if the call fails. Same facts,
// assembled by hand rather than by a model.

// Declining advice is a rule, so it holds with or without a model.
// "should i" alone is too loose — it also catches "what should i know
// about my portfolio" — so a buying or selling word has to follow it.
const ADVICE = [
  /(should|shall) i (buy|sell|hold|invest|get|keep|add|dump)/,
  /worth (buying|selling|holding)/,
  /good (buy|sell|investment|time to (buy|sell))/,
  /buy or sell/,
  /(do|what do) you recommend/,
]

// Each branch builds its sentences in a list, then joins them. Reading a
// list of whole sentences is easier than following `+` down the margin.
function summarise(message, facts) {
  const q = message.toLowerCase()
  const { holdings, summary } = facts.portfolio

  // What the question named wins over what happens to be on screen
  const focus = facts.asked?.[0] || facts.symbol
  const quote = focus ? facts.quotes.find(x => x.symbol === focus) : null

  if (ADVICE.some(pattern => pattern.test(q))) {
    const instead = quote
      ? `What I can tell you is that ${quote.symbol} is at ${money(quote.price)}, ${percent(quote.changePercent)} on the day.`
      : 'I can show you prices, your holdings and recent headlines instead.'

    return [
      'I do not give buy or sell advice.',
      instead,
      'Any decision is yours to make.',
    ].join(' ')
  }

  if (/profit|loss|lose|gain|perform|doing/.test(q) && holdings.length) {
    const ranked = [...holdings].sort(
      (a, b) => (b.profitPercent ?? -Infinity) - (a.profitPercent ?? -Infinity)
    )

    const best = ranked[0]
    const worst = ranked[ranked.length - 1]

    return [
      `Your portfolio cost ${money(summary.cost)} and is worth ${money(summary.value)} now, a profit of ${money(summary.profit)} (${percent(summary.profitPercent)}).`,
      `${best.symbol} is your strongest at ${percent(best.profitPercent)}, ${worst.symbol} the weakest at ${percent(worst.profitPercent)}.`,
      'These are price movements only — no sentiment analysis is connected yet.',
    ].join(' ')
  }

  if (/sentiment|mood|bullish|bearish|predict/.test(q)) {
    return [
      'Sentiment scores and predictions are not available yet — the analysis service that produces them is not connected.',
      'What the dashboard can show right now is live prices, news headlines and your own holdings.',
    ].join(' ')
  }

  if (quote) {
    const held = holdings.filter(h => h.symbol === focus)
    const owned = held.reduce((total, h) => total + h.quantity, 0)

    const ownership = held.length
      ? `You hold ${owned} of it, currently ${percent(held[0].profitPercent)} against what you paid.`
      : 'It is not in your portfolio.'

    return [
      `${quote.name} (${quote.symbol}) is at ${money(quote.price)}, ${percent(quote.changePercent)} on the day, trading on ${quote.market || 'an unlisted venue'}.`,
      ownership,
      'No sentiment score is available for it yet.',
    ].join(' ')
  }

  if (holdings.length) {
    return [
      `You are tracking ${summary.holdings} holdings worth ${money(summary.value)} against ${money(summary.cost)} invested, so ${percent(summary.profitPercent)} overall.`,
      `Your watchlist has ${facts.watchlist.length} assets.`,
      'Ask about any of them, or open one to see its price history.',
    ].join(' ')
  }

  return [
    `There is nothing in your portfolio yet, and your watchlist has ${facts.watchlist.length} assets.`,
    'Add a holding on the Portfolio page and I can tell you how it is doing.',
  ].join(' ')
}


// ── MODEL ───────────────────────────────────────────────────────────
// Returns null on any failure, so the caller falls back to summarise().

async function callGroq(message, factBlock, history) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.text || '').slice(0, 1000),
    })),
    { role: 'user', content: `DATA:\n${factBlock}\n\nQUESTION: ${message}` },
  ]

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.2,
        max_tokens: 300,
      }),
      signal: controller.signal,
    })

    if (!response.ok) return null
    const body = await response.json()
    return body.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function answer(message, facts, history) {
  const factBlock = renderFacts(facts)

  if (process.env.GROQ_API_KEY) {
    const text = await callGroq(message, factBlock, history)
    // Falls through to the summariser if the model is unreachable
    if (text) return { text, model: process.env.GROQ_MODEL || 'groq' }
  }

  return { text: summarise(message, facts), model: 'built-in' }
}

// ── SOURCES ─────────────────────────────────────────────────────────
// Shown under each reply.

export function citations(facts) {
  const sources = []

  facts.news.forEach(n =>
    sources.push({ platform: n.source || 'News', text: n.headline, symbol: facts.newsFor || facts.symbol || null })
  )
  facts.quotes.slice(0, 2).forEach(q =>
    sources.push({ platform: q.market || 'Market', text: `${q.symbol} at ${money(q.price)}`, symbol: q.symbol })
  )
  if (facts.portfolio.holdings.length) {
    sources.push({
      platform: 'Your portfolio',
      text: `${facts.portfolio.summary.holdings} holdings, ${percent(facts.portfolio.summary.profitPercent)} overall`,
      symbol: null,
    })
  }

  return sources.slice(0, 4)
}
