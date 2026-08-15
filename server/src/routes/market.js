import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { fetchChart } from '../lib/yahoo.js'

export const marketRouter = Router()
marketRouter.use(requireAuth)

// Daily closes over the asked-for range. The Spring Boot /data endpoint
// only ever returns one day of one-minute candles, which is too short for
// a comparison and makes a week's chart show a single date repeated.
const RANGES = { '1w': '5d', '1mo': '1mo' }

marketRouter.get('/asset/:symbol', async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase()
  const range = RANGES[req.query.range] || '1mo'
  const asset = await fetchChart(symbol, range, '1d')

  if (!asset) {
    return res.status(502).json({ error: `No market data for ${symbol}` })
  }

  res.json(asset)
})

// Yahoo only takes fixed windows, so ask for the smallest one that still
// reaches back to the wanted day.
function rangeReaching(day) {
  const days = (Date.now() - Date.parse(day)) / 86400000

  if (days <= 5) return '5d'
  if (days <= 30) return '1mo'
  if (days <= 90) return '3mo'
  if (days <= 180) return '6mo'
  if (days <= 365) return '1y'
  if (days <= 730) return '2y'
  return '5y'
}

// The closing price on a given day, used to fill in the buy price when
// someone adds a holding. Weekends and holidays have no close, so the
// last trading day before it is used instead.
marketRouter.get('/close', async (req, res) => {
  const symbol = String(req.query.symbol || '').toUpperCase()
  const day = String(req.query.date || '')

  if (!symbol || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return res.status(400).json({ error: 'Need a symbol and a date' })
  }

  const asset = await fetchChart(symbol, rangeReaching(day), '1d')
  if (!asset) return res.status(502).json({ error: `No market data for ${symbol}` })

  let close = null

  for (const point of asset.history) {
    if (new Date(point.date).toISOString().slice(0, 10) <= day) {
      close = point.price
    }
  }

  res.json({ symbol, date: day, close })
})
