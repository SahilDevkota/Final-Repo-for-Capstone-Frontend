// The one place that talks to Yahoo. The portfolio and the comparison
// chart both read prices from here, so neither depends on the Spring Boot
// /data endpoint, which keeps failing to resolve Yahoo's hostname.

const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/'
const TIMEOUT_MS = 8000

const ASSET_TYPES = {
  EQUITY:         'Stock',
  ETF:            'ETF',
  MUTUALFUND:     'ETF',
  CRYPTOCURRENCY: 'Crypto',
}

function shape(payload, symbol) {
  const result = payload?.chart?.result?.[0]
  if (!result) return null

  const meta = result.meta || {}
  const candles = result.indicators?.quote?.[0] || {}
  const price = meta.regularMarketPrice ?? null
  const previous = meta.chartPreviousClose ?? null
  const exchange = meta.fullExchangeName || meta.exchangeName || ''

  // One point per interval, skipping the gaps Yahoo leaves on closed days.
  // `price` is the close, which is what the charts draw; the rest is there
  // for the detail page's figures.
  const history = (result.timestamp || [])
    .map((seconds, i) => ({
      date:   seconds * 1000,
      price:  candles.close?.[i],
      open:   candles.open?.[i] ?? null,
      high:   candles.high?.[i] ?? null,
      low:    candles.low?.[i] ?? null,
      volume: candles.volume?.[i] ?? null,
    }))
    .filter(point => typeof point.price === 'number')

  // meta.chartPreviousClose is the close before the *range* starts, not
  // before today. Asking for a month of data made it a month old, which
  // turned "today's change" into the whole month's change. The candle
  // before the last one is the real previous close.
  const previousClose = history.length > 1 ? history[history.length - 2].price : previous

  return {
    symbol,
    name:   meta.longName || meta.shortName || symbol,
    type:   ASSET_TYPES[meta.instrumentType] || 'Stock',
    // Yahoo labels crypto venues "CCC", which means nothing to a reader
    market: exchange === 'CCC' ? 'Crypto' : exchange || null,
    price,
    changePercent: price !== null && previousClose
      ? ((price - previousClose) / previousClose) * 100
      : null,
    history,

    // Session figures, straight from Yahoo rather than derived from the
    // candles, which describe an interval and not the whole day
    previousClose,
    dayHigh:  meta.regularMarketDayHigh ?? null,
    dayLow:   meta.regularMarketDayLow ?? null,
    dayVolume: meta.regularMarketVolume ?? null,
    currency: meta.currency || 'USD',
    exchange: meta.exchangeName || null,
    timezone: meta.exchangeTimezoneName || null,
  }
}

// Returns null rather than throwing, so a missing price thins the answer
// instead of failing the request.
export async function fetchChart(symbol, range = '1mo', interval = '1d') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url = `${BASE}${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) return null
    return shape(await response.json(), symbol)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
