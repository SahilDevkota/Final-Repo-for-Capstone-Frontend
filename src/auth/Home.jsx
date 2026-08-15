import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="home-page">
      <section className="hero-section">
        <p className="eyebrow">MARKET INTELLIGENCE PLATFORM</p>

        <h1>
          Make smarter moves
          <br />
          in the market.
        </h1>

        <p className="hero-text">
          Track stocks, crypto, ETFs, market sentiment, news, and your
          personal watchlist in one focused workspace.
        </p>

        <div className="hero-actions">
          <Link className="primary-link" to="/login">
            Login
          </Link>

          <Link className="secondary-link" to="/register">
            Create an account
          </Link>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <span className="feature-icon">↗</span>
          <h2>Track markets</h2>
          <p>
            Search stocks, crypto, and ETFs from one simple interface.
          </p>
        </article>

        <article className="feature-card">
          <span className="feature-icon">◉</span>
          <h2>Read sentiment</h2>
          <p>
            Understand market mood and follow the information behind price
            movements.
          </p>
        </article>

        <article className="feature-card">
          <span className="feature-icon">☆</span>
          <h2>Build your watchlist</h2>
          <p>
            Save assets you care about and review them whenever you return.
          </p>
        </article>
      </section>
    </main>
  );
}