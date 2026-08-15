import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initSchema, ping } from './lib/db.js'
import { portfolioRouter } from './routes/portfolio.js'
import { chatRouter } from './routes/chat.js'
import { marketRouter } from './routes/market.js'

const PORT = Number(process.env.PORT) || 8082

const app = express()

app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '64kb' }))

// Says whether the database is reachable and whether a model key is set,
// so a failing setup is obvious without reading logs
app.get('/health', async (_req, res) => {
  let database = false
  try { database = await ping() } catch { database = false }

  res.status(database ? 200 : 503).json({
    service:  'capstone-service',
    database,
    upstream: process.env.UPSTREAM_URL,
    model:    process.env.GROQ_API_KEY ? (process.env.GROQ_MODEL || 'groq') : 'built-in summariser',
  })
})

app.use('/portfolio', portfolioRouter)
app.use('/chat', chatRouter)
app.use('/market', marketRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// Nothing internal reaches the browser; the detail goes to the log
app.use((error, _req, res, _next) => {
  console.error('[error]', error)
  res.status(500).json({ error: 'Something went wrong on the server' })
})

async function start() {
  try {
    await initSchema()
    console.log('[db] portfolio and chat_message ready')
  } catch (error) {
    console.error('[db] could not prepare tables:', error.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`[service] http://localhost:${PORT}`)
    console.log(`[service] upstream ${process.env.UPSTREAM_URL}`)
    console.log(`[service] model    ${process.env.GROQ_API_KEY ? process.env.GROQ_MODEL : 'built-in summariser'}`)
  })
}

start()
