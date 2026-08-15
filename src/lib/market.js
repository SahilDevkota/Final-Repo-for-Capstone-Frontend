// Shapes the raw responses from ViewerAPI into what the portfolio,
// compare and assistant screens expect. Kept here so those screens do not
// each repeat the same parsing.

import { getStocks, getCrypto, getETF, getData } from '../api/ViewerAPI'
import serviceAPI from '../api/serviceAPI'

// Yahoo labels crypto venues "CCC", which means nothing to a reader
const EXCHANGES = { CCC: 'Crypto' }

const ASSET_TYPES = {
  EQUITY:         'Stock',
  ETF:            'ETF',
  MUTUALFUND:     'ETF',
  CRYPTOCURRENCY: 'Crypto',
}

export function parseQuote(payload, symbol) {
  const result = payload?.chart?.result?.[0]
  if (!result) return null

  const meta       = result.meta || {}
  const exchange   = meta.fullExchangeName || meta.exchangeName || ''
  const price      = meta.regularMarketPrice ?? null
  const previous   = meta.chartPreviousClose ?? null
  const timestamps = result.timestamp || []
  const closes     = result.indicators?.quote?.[0]?.close || []

  return {
    symbol,
    name:   meta.longName || meta.shortName || symbol,
    type:   ASSET_TYPES[meta.instrumentType] || 'Stock',
    market: EXCHANGES[exchange] || exchange || '—',
    price,
    changePercent: price !== null && previous ? ((price - previous) / previous) * 100 : null,
    history: timestamps
      .map((ts, i) => ({ recordedAt: new Date(ts * 1000).toISOString(), price: closes[i] }))
      .filter(point => typeof point.price === 'number'),
  }
}

export async function fetchQuote(symbol) {
  try {
    return parseQuote(await getData(symbol), symbol)
  } catch {
    return null
  }
}

// The stock table holds ETFs too — the CSV it was imported from had no
// type column — so the table a row came from is not a reliable label.
// The name is: a fund carries "ETF" in its registered name.
function assetType(name, fromTable) {
  return /\bETF\b/i.test(name) ? 'ETF' : fromTable
}

// All three tables at once, since the user does not necessarily know
// which one a symbol belongs to
async function searchEveryTable(query) {
  const results = await Promise.allSettled([
    getStocks(query), getCrypto(query), getETF(query),
  ])

  const tables = ['Stock', 'Crypto', 'ETF']
  const found = []

  results.forEach((result, i) => {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value)) return

    result.value.forEach(row => {
      const name = row.securityName || row.symbol
      found.push({ symbol: row.symbol, name, type: assetType(name, tables[i]) })
    })
  })

  return found
}

export async function searchAssets(query) {
  const q = query.trim()
  if (!q) return []

  return (await searchEveryTable(q)).slice(0, 8)
}

// A month of daily prices for the comparison chart, through our own
// service rather than the backend, which only returns a single day.
export async function fetchCompareAsset(symbol, range = '1mo') {
  const { data } = await serviceAPI.get(
    `/market/asset/${encodeURIComponent(symbol)}?range=${range}`
  )
  return data
}

// Fills the second compare slot. Searching only the matching table would
// miss the ETFs sitting in the stock table, so search all three and keep
// what really is the wanted type.
export async function suggestByType(type, query = '') {
  try {
    const found = await searchEveryTable(query.trim())
    return found.filter(asset => asset.type === type).slice(0, 6)
  } catch {
    return []
  }
}
