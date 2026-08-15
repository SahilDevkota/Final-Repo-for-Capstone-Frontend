import pg from 'pg'

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// This service owns these two tables and nothing else. The Spring Boot
// backend's tables are read through its API, never touched here.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS portfolio (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(255) NOT NULL,
    symbol     VARCHAR(64)  NOT NULL,
    quantity   NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
    buy_price  NUMERIC(20, 8) NOT NULL CHECK (buy_price > 0),
    buy_date   DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS portfolio_username_idx ON portfolio (username);

  CREATE TABLE IF NOT EXISTS chat_message (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(255) NOT NULL,
    role       VARCHAR(16)  NOT NULL,
    text       TEXT         NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS chat_message_username_idx ON chat_message (username, created_at);
`

export async function initSchema() {
  await pool.query(SCHEMA)
}

export async function ping() {
  const { rows } = await pool.query('SELECT 1 AS ok')
  return rows[0].ok === 1
}
