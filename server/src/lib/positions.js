// Turns the rows a user typed into the two things the Portfolio screen
// shows: one position per symbol, and the value of the whole portfolio on
// each day of the past month.
//
//   POSITIONS  several buys of one symbol merged into one line
//   HISTORY    portfolio value per day, next to a benchmark

// ── POSITIONS ───────────────────────────────────────────────────────

// Buying the same symbol twice is normal, and two separate lines cannot
// answer "how much do I hold" or "what is my break-even". Merging them
// gives a weighted average cost, which is that break-even price.
export function mergePositions(holdings) {
  const bySymbol = new Map()

  for (const holding of holdings) {
    const position = bySymbol.get(holding.symbol) || {
      symbol:   holding.symbol,
      name:     holding.name,
      type:     holding.type,
      market:   holding.market,
      price:    holding.price,
      quantity: 0,
      cost:     0,
      buys:     [],
    }

    position.quantity += holding.quantity
    position.cost     += holding.cost
    position.buys.push(holding)

    bySymbol.set(holding.symbol, position)
  }

  return [...bySymbol.values()].map(position => {
    const value = position.price === null ? null : position.quantity * position.price

    return {
      ...position,
      // The price that leaves this position break-even
      averageCost: position.quantity === 0 ? null : position.cost / position.quantity,
      value,
      profit:        value === null ? null : value - position.cost,
      profitPercent: value === null || position.cost === 0
        ? null
        : ((value - position.cost) / position.cost) * 100,
    }
  })
}

// ── HISTORY ─────────────────────────────────────────────────────────

// One number on its own cannot say whether a portfolio is recovering or
// sliding. This rebuilds what it was worth on each past day, counting a
// holding only from the day it was bought.
export function valueHistory(holdings, quotes, benchmark) {
  // symbol -> (day -> closing price)
  const pricesBySymbol = new Map()

  for (const quote of quotes) {
    const byDay = new Map()
    for (const point of quote.history || []) {
      byDay.set(dayOf(point.date), point.price)
    }
    pricesBySymbol.set(quote.symbol, byDay)
  }

  const days = [...new Set(quotes.flatMap(q => (q.history || []).map(p => dayOf(p.date))))].sort()
  if (!days.length) return []

  // Markets close at different times and on different days, so a symbol
  // can be missing a day. Carrying the last known price forward avoids a
  // false dip on those days.
  const lastKnown = new Map()
  const benchmarkOnDay = benchmarkReader(benchmark, days)

  // Paying money in is not a gain, but it does raise the total. So the
  // day a purchase is recorded, the value of what was just bought is
  // subtracted before the day's movement is measured, and the daily
  // movements are multiplied together. That is a time-weighted return,
  // and it is the only kind that can fairly be set against an index.
  let growth = 100
  let yesterday = null

  const series = days.map(day => {
    let value = 0
    let counted = 0
    let boughtToday = 0

    for (const holding of holdings) {
      if (holding.buyDate > day) continue

      const price = pricesBySymbol.get(holding.symbol)?.get(day) ?? lastKnown.get(holding.symbol)
      if (price === undefined) continue

      lastKnown.set(holding.symbol, price)
      value += holding.quantity * price
      counted += 1

      if (holding.buyDate === day) boughtToday += holding.quantity * price
    }

    const total = counted ? value : null

    if (total !== null && yesterday) {
      growth *= (total - boughtToday) / yesterday
    }

    if (total !== null) yesterday = total

    return {
      day,
      value: total,
      growth,
      benchmark: benchmarkOnDay(day),
    }
  })

  // Crypto trades at weekends and shares do not, so the run of days can
  // open before anything was owned. Those empty days would otherwise
  // become the baseline the chart measures everything against.
  const firstOwned = series.findIndex(row => row.value !== null)

  return firstOwned === -1 ? [] : series.slice(firstOwned)
}

// ── BENCHMARK ───────────────────────────────────────────────────────

// Comparing a portfolio that is mostly Bitcoin against the S&P 500 says
// nothing useful: the two move for different reasons. So the yardstick is
// mixed in the same proportions as the portfolio itself — 90% crypto and
// 10% shares is measured against 90% Bitcoin and 10% S&P 500.
//
// Each index is turned into its percent change from the first day, those
// are blended by weight, and the result is expressed as a value starting
// at 100 so the chart can rebase it like any other series.
export const BENCHMARK_FOR = { Crypto: 'BTC-USD', ETF: 'SPY', Stock: 'SPY' }
const DEFAULT_BENCHMARK = 'SPY'

// How much of the portfolio sits in each benchmark, by value
export function benchmarkWeights(positions) {
  const priced = positions.filter(position => position.value !== null)
  const total = priced.reduce((sum, position) => sum + position.value, 0)

  if (total === 0) return { [DEFAULT_BENCHMARK]: 1 }

  const weights = {}

  for (const position of priced) {
    const symbol = BENCHMARK_FOR[position.type] || DEFAULT_BENCHMARK
    weights[symbol] = (weights[symbol] || 0) + position.value / total
  }

  return weights
}

// "92% BTC-USD, 8% SPY", or just the symbol when there is only one
export function benchmarkLabel(weights) {
  const parts = Object.entries(weights).sort((a, b) => b[1] - a[1])

  if (parts.length === 1) return parts[0][0]

  return parts.map(([symbol, weight]) => `${Math.round(weight * 100)}% ${symbol}`).join(', ')
}

function benchmarkReader(benchmark, days) {
  const { weights = {}, charts = {} } = benchmark || {}

  // day -> price, per index, with the first known price kept as the base
  const series = Object.keys(weights).map(symbol => {
    const byDay = new Map(
      (charts[symbol]?.history || []).map(point => [dayOf(point.date), point.price])
    )

    const first = days.map(day => byDay.get(day)).find(price => price !== undefined)

    return { weight: weights[symbol], byDay, first, last: first }
  })

  if (series.every(one => one.first === undefined)) return () => null

  return day => {
    let blended = 0

    for (const one of series) {
      if (one.first === undefined) continue

      one.last = one.byDay.get(day) ?? one.last
      blended += one.weight * ((one.last - one.first) / one.first) * 100
    }

    // A value rather than a percentage, so the chart rebases it the same
    // way it rebases the portfolio
    return 100 * (1 + blended / 100)
  }
}

function dayOf(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10)
}
