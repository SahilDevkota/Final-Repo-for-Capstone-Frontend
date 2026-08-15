// Reads the Spring Boot backend with the caller's token, so its tables are
// never queried directly. Every call returns null on failure.
//
//   BACKEND  watchlist, news, prices
//   LOOKUP   finding asset symbols written inside a question

// ── BACKEND ─────────────────────────────────────────────────────────

import { fetchChart } from './yahoo.js'

const TIMEOUT_MS = 8000

async function call(path, token, method = 'GET') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${process.env.UPSTREAM_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchWatchlist(token) {
  const data = await call('/watchlist/all', token)
  return Array.isArray(data) ? data : []
}

// Straight to Yahoo: the backend's /data endpoint keeps failing to resolve
// Yahoo's hostname. A month of daily closes, because the portfolio chart
// needs the history and the current price comes with it either way.
export function fetchQuote(symbol) {
  return fetchChart(symbol, '1mo', '1d')
}

// Five at a time, to stay under Yahoo's rate limit
export async function fetchQuotes(symbols) {
  const out = []
  for (let i = 0; i < symbols.length; i += 5) {
    const batch = symbols.slice(i, i + 5)
    const quotes = await Promise.all(batch.map(fetchQuote))
    out.push(...quotes.filter(Boolean))
  }
  return out
}

export async function fetchNews(symbol, token) {
  const data = await call(`/news/${encodeURIComponent(symbol)}`, token, 'POST')
  return Array.isArray(data) ? data.slice(0, 3) : []
}

// ── LOOKUP ──────────────────────────────────────────────────────────
// So the assistant can answer about anything in the database, not only
// what the user already tracks.

// English words that also look like tickers. Without this, "how is my
// portfolio" would send IS, MY and HOW to the asset tables.
const STOPWORDS = new Set(`
A AM AN AND ANY ARE ABOUT ALL AT BAD BE BEST BUT BY CAN COULD COME DID DO DOES
DOING DOWN FOR FROM GET GIVE GO GOOD GOT HAD HAS HAVE HELLO HERE HEY HI HOLD
HOW I IF IN IS IT ITS KNOW LEAST LESS LET LIKE LOOK MAKE MANY MAY ME MIGHT MORE
MOST MUCH MUST MY NEED NO NOT NOW OF OK ON OR OUT OVER PLEASE SAY SEE SHALL
SHOULD SHOW SO SOME TAKE TELL THAN THAT THE THEN THERE THESE THINK THIS THOSE TO
TODAY TOMORROW UP US VERY WANT WAS WERE WHAT WHEN WHERE WHICH WHO WHY WILL WITH
WOULD YES YESTERDAY YOU
AKA COMPARE EG ETC IE PLS THX VERSUS VS
ASSET ASSETS BUY CHART COIN COINS COST CRYPTO DATA ETF ETFS GAIN HOLDING
HOLDINGS INVEST INVESTMENT LOSS MARKET MARKETS MOOD NEWS PERCENT PERFORM
PERFORMANCE PORTFOLIO PREDICTION PREDICTIONS PRICE PRICES PROFIT SELL SENTIMENT
SHARE SHARES STOCK STOCKS TOTAL TREND VALUE WATCHLIST WORTH
`.trim().split(/\s+/))

// Capped so one question cannot fan out into dozens of lookups
const MAX_LOOKUPS = 4

function candidates(message) {
  // Whole words: a fixed width cut PERFORMANCE down to PERFORMANC, which
  // the stopword list then missed
  const words = String(message).toUpperCase().match(/[A-Z][A-Z0-9.-]*/g) || []

  const cleaned = words
    // Trailing punctuation only, so BTC-USD keeps its dash
    .map(word => word.replace(/^[.-]+|[.-]+$/g, ''))
    // Longer than any real ticker means it is an English word
    .filter(word => word.length >= 2 && word.length <= 10 && !STOPWORDS.has(word))

  return [...new Set(cleaned)].slice(0, MAX_LOOKUPS)
}

// Search is by prefix, so "IS" returns ISBA. Only exact hits count, plus
// the -USD form, since crypto is stored as BTC-USD but typed as BTC.
const ASSET_TABLES = ['/Stock/stocks', '/Crypto/crypto', '/ETF/etf']

async function resolveSymbol(word, token) {
  const query = encodeURIComponent(word)
  const lists = await Promise.all(
    ASSET_TABLES.map(path => call(`${path}?query=${query}`, token))
  )

  for (const list of lists) {
    if (!Array.isArray(list)) continue

    const hit = list.find(row => {
      const symbol = String(row?.symbol || '').toUpperCase()
      return symbol === word || symbol === `${word}-USD`
    })

    if (hit) return String(hit.symbol).toUpperCase()
  }

  return null
}

// Symbols named in the question, so the assistant is not limited to what
// the user already tracks.
export async function symbolsInQuestion(message, token) {
  const found = await Promise.all(
    candidates(message).map(word => resolveSymbol(word, token))
  )

  return [...new Set(found.filter(Boolean))]
}
