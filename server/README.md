# capstone-service

Portfolio tracking and the AI assistant. Runs beside the Spring Boot
backend rather than replacing it.

```
React :5173 ─┬─→ Spring Boot :8081   sign in, search, prices, news, watchlist
             └─→ this service :8082  portfolio, assistant
                        ↓
                 PostgreSQL :5432
```

## What it owns

Two tables, created on start if missing: `portfolio` and `chat_message`.
Nothing else in the database is written to. Watchlists and prices are read
through the backend's API, not by querying its tables, so a change to its
schema cannot break this service quietly.

## Running it

```
npm install
cp .env.example .env
npm start
```

`GET /health` reports whether the database is reachable and which model is
in use.

## Sign in

There are no accounts here. The backend issues the token; this service
verifies the signature with the same secret and reads the username from
`sub`. One sign-in covers both services.

`JWT_SECRET` in `.env` must match `JWTUtil.SecretKey` in the backend. If
that value changes there, change it here too.

## Endpoints

| | |
|---|---|
| `GET /portfolio` | holdings with live prices, plus totals |
| `POST /portfolio` | `{ symbol, quantity, buyPrice, buyDate }` |
| `DELETE /portfolio/:id` | only the caller's own rows |
| `POST /chat` | `{ message, context, history }` → `{ answer, sources }` |
| `GET /chat/history` | last 50 messages |
| `DELETE /chat/history` | clear them |

Cost, value and profit are never stored. Only what the user typed is kept,
and the rest is worked out from the live price on every read, so the numbers
cannot drift.

## The assistant

Every reply is built from facts collected first: the user's holdings, their
watchlist, live prices, and recent headlines for the asset on screen. Those
facts go into the prompt and the model is told to use nothing else.

Without `GROQ_API_KEY` the service still answers — a built-in summariser
writes the reply from the same facts. Add a free key from console.groq.com
to have a language model phrase them instead. The call is made here, so the
key never reaches the browser.

Sentiment scores are not in the answers yet: the analysis service the
backend calls on port 8000 is not running, so there is nothing to report.
When it is, sentiment joins the fact block and the assistant picks it up.

## Notes

- One question at a time per user; a second returns 429 while the first runs
- Messages are capped at 500 characters
- Upstream calls time out after 8 seconds and fail soft — the assistant
  answers with less rather than erroring
- `.env` is gitignored. Never commit a real key.
