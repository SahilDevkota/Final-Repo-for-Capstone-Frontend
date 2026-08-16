import { useState } from "react";
import { getMarketNews } from "../api/ViewerAPI";
import "../styles/news.css";

export default function News() {
  const [symbol, setSymbol] =
    useState("");

  const [articles, setArticles] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadNews(event) {
    event.preventDefault();

    const selectedSymbol =
      symbol.trim().toUpperCase();

    if (!selectedSymbol) {
      setError("Enter a stock symbol.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setArticles([]);

      const data = await getMarketNews(
        selectedSymbol
      );

      setArticles(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Company news error:",
        err
      );

      console.error(
        "Backend response:",
        err.response?.data
      );

      setError(
        `Could not load news for ${selectedSymbol}.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="news-page">
      <p className="eyebrow">
        STOCK NEWS
      </p>

      <h1>Company news</h1>

      <p className="news-page-intro">
        Enter a symbol to view its latest
        financial news.
      </p>

      <form
        className="news-search-form"
        onSubmit={loadNews}
      >
        <input
          value={symbol}
          onChange={(event) =>
            setSymbol(event.target.value)
          }
          placeholder="Enter symbol, e.g. AAPL"
        />

        <button type="submit">
          Search news
        </button>
      </form>

      {loading && (
        <p className="news-status">
          Loading news...
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        symbol &&
        articles.length === 0 && (
          <p className="news-status">
            No news found for{" "}
            {symbol.toUpperCase()}.
          </p>
        )}

      {articles.length > 0 && (
        <section className="news-page-list">
          {articles.map((article, index) => (
            <article
              className="news-page-card"
              key={
                article.url ||
                article.headline ||
                index
              }
            >
              <div className="news-page-card-top">
                <span className="news-category">
                  {article.symbol ||
                    symbol.toUpperCase()}
                </span>

                <span className="news-time">
                  {article.date || ""}
                </span>
              </div>

              <h2>
                {article.headline ||
                  "Company update"}
              </h2>

              <p>
                {article.summary ||
                  "No summary available."}
              </p>

              <div className="news-card-footer">
                <span className="news-source">
                  {article.source ||
                    "Financial news"}
                </span>

                {article.url && (
                  <a
                    className="read-news-button"
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read article →
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}