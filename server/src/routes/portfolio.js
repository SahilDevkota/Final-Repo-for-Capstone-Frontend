import { Router } from 'express'
import { pool } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { fetchQuotes } from '../lib/upstream.js'
import { fetchChart } from '../lib/yahoo.js'
import {
  mergePositions,
  valueHistory,
  benchmarkWeights,
  benchmarkLabel,
} from '../lib/positions.js'

export const portfolioRouter = Router()
portfolioRouter.use(requireAuth)

// Only what the user typed is stored. Cost, value and profit are worked
// out from the live price on every read, so they can never go stale.
function priceHolding(row, quote) {
  const quantity = Number(row.quantity)
  const buyPrice = Number(row.buy_price)
  const cost     = quantity * buyPrice
  const price    = quote?.price ?? null
  const value    = price === null ? null : quantity * price

  return {
    id:       row.id,
    symbol:   row.symbol,
    name:     quote?.name || row.symbol,
    type:     quote?.type || null,
    market:   quote?.market || null,
    quantity,
    buyPrice,
    buyDate:  row.buy_date,
    price,
    cost,
    value,
    profit:        value === null ? null : value - cost,
    profitPercent: value === null || cost === 0 ? null : ((value - cost) / cost) * 100,
  }
}

function summarise(holdings) {
  const priced = holdings.filter(h => h.value !== null)

  // Cost never depends on a live price, so it covers every holding. Profit
  // can only weigh the priced ones against what those same ones cost —
  // measuring them against the full cost would invent a loss. And with
  // nothing priced the value is unknown, not zero.
  const cost       = holdings.reduce((sum, h) => sum + h.cost, 0)
  const pricedCost = priced.reduce((sum, h) => sum + h.cost, 0)
  const value      = priced.length ? priced.reduce((sum, h) => sum + h.value, 0) : null

  return {
    holdings: holdings.length,
    priced:   priced.length,
    cost,
    value,
    profit:        value === null ? null : value - pricedCost,
    profitPercent: value === null || pricedCost === 0
      ? null
      : ((value - pricedCost) / pricedCost) * 100,
  }
}

export async function loadPortfolio(username) {
  const { rows } = await pool.query(
    `SELECT id, symbol, quantity, buy_price,
            to_char(buy_date, 'YYYY-MM-DD') AS buy_date
       FROM portfolio
      WHERE username = $1
      ORDER BY buy_date DESC, id DESC`,
    [username]
  )
  if (rows.length === 0) {
    return { holdings: [], positions: [], summary: summarise([]), history: [] }
  }

  const symbols = [...new Set(rows.map(r => r.symbol))]
  const quotes = await fetchQuotes(symbols)

  const bySymbol = new Map(quotes.map(q => [q.symbol, q]))
  const holdings = rows.map(row => priceHolding(row, bySymbol.get(row.symbol)))
  const positions = mergePositions(holdings)

  // The yardstick is mixed to match what the portfolio actually holds
  const weights = benchmarkWeights(positions)

  const charts = {}
  await Promise.all(
    Object.keys(weights).map(async symbol => {
      charts[symbol] = await fetchChart(symbol, '1mo', '1d')
    })
  )

  return {
    holdings,
    positions,
    summary:   summarise(holdings),
    history:   valueHistory(holdings, quotes, { weights, charts }),
    benchmark: benchmarkLabel(weights),
  }
}

portfolioRouter.get('/', async (req, res, next) => {
  try {
    res.json(await loadPortfolio(req.username))
  } catch (error) {
    next(error)
  }
})

// Rejected here as well as in the browser, since the API is reachable
// without going through the form
function validate(body) {
  const symbol   = String(body.symbol || '').trim().toUpperCase()
  const quantity = Number(body.quantity)
  const buyPrice = Number(body.buyPrice)
  const buyDate  = String(body.buyDate || '').slice(0, 10)

  if (!symbol) return { error: 'Choose an asset' }
  if (symbol.length > 64) return { error: 'That symbol is too long' }
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'Quantity must be greater than 0' }
  if (!Number.isFinite(buyPrice) || buyPrice <= 0) return { error: 'Buy price must be greater than 0' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(buyDate)) return { error: 'Choose a purchase date' }
  if (new Date(buyDate) > new Date()) return { error: 'Purchase date cannot be in the future' }

  return { value: { symbol, quantity, buyPrice, buyDate } }
}

portfolioRouter.post('/', async (req, res, next) => {
  try {
    const { error, value } = validate(req.body || {})
    if (error) return res.status(400).json({ error })

    // A symbol with no quote is almost always a typo
    const [quote] = await fetchQuotes([value.symbol])
    if (!quote) {
      return res.status(400).json({ error: `No market data found for ${value.symbol}` })
    }

    const { rows } = await pool.query(
      `INSERT INTO portfolio (username, symbol, quantity, buy_price, buy_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, symbol, quantity, buy_price,
                 to_char(buy_date, 'YYYY-MM-DD') AS buy_date`,
      [req.username, value.symbol, value.quantity, value.buyPrice, value.buyDate]
    )

    res.status(201).json(priceHolding(rows[0], quote))
  } catch (error) {
    next(error)
  }
})

portfolioRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad id' })

    // username in the WHERE clause, so one user cannot delete another's row
    const { rowCount } = await pool.query(
      'DELETE FROM portfolio WHERE id = $1 AND username = $2',
      [id, req.username]
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Holding not found' })

    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
