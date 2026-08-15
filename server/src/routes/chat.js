import { Router } from 'express'
import { pool } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { fetchWatchlist, fetchQuotes, fetchNews, symbolsInQuestion } from '../lib/upstream.js'
import { loadPortfolio } from './portfolio.js'
import { answer, citations } from '../lib/assistant.js'

export const chatRouter = Router()
chatRouter.use(requireAuth)

const MAX_LENGTH = 500

// One question at a time per user, so a stuck request cannot be piled onto
const inFlight = new Set()

// Everything the answer may draw on, gathered before the model is asked
async function gatherFacts(username, token, symbol, message) {
  const [portfolio, watchlist, asked] = await Promise.all([
    loadPortfolio(username),
    fetchWatchlist(token),
    // Anything the question named by symbol, looked up in the asset tables
    symbolsInQuestion(message, token),
  ])

  // What the question asked about comes first, then the asset on screen,
  // then holdings, then the watchlist
  const symbols = [...new Set([
    ...asked,
    ...(symbol ? [symbol] : []),
    ...portfolio.holdings.map(h => h.symbol),
    ...watchlist.map(w => w.symbol),
  ])].slice(0, 8)

  // News follows the question when it names an asset, the screen otherwise
  const newsFor = asked[0] || symbol

  const [quotes, news] = await Promise.all([
    fetchQuotes(symbols),
    newsFor ? fetchNews(newsFor, token) : Promise.resolve([]),
  ])

  return { symbol: symbol || null, asked, newsFor: newsFor || null, portfolio, watchlist, quotes, news }
}

chatRouter.get('/history', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT role, text FROM chat_message
        WHERE username = $1
        ORDER BY created_at ASC, id ASC
        LIMIT 50`,
      [req.username]
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

chatRouter.delete('/history', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM chat_message WHERE username = $1', [req.username])
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

chatRouter.post('/', async (req, res, next) => {
  const message = String(req.body?.message || '').trim()
  const symbol  = req.body?.context?.symbol ? String(req.body.context.symbol).trim() : null
  const history = Array.isArray(req.body?.history) ? req.body.history : []

  if (!message) return res.status(400).json({ error: 'Message cannot be empty' })
  if (message.length > MAX_LENGTH) {
    return res.status(400).json({ error: `Keep it under ${MAX_LENGTH} characters` })
  }
  if (inFlight.has(req.username)) {
    return res.status(429).json({ error: 'Still answering your last question' })
  }

  inFlight.add(req.username)
  try {
    const facts = await gatherFacts(req.username, req.token, symbol, message)
    const { text, model } = await answer(message, facts, history)

    // Stored after the answer, so a failure leaves no half-conversation
    await pool.query(
      `INSERT INTO chat_message (username, role, text)
       VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
      [req.username, message, text]
    )

    res.json({ answer: text, sources: citations(facts), model })
  } catch (error) {
    next(error)
  } finally {
    inFlight.delete(req.username)
  }
})
