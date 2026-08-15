import { getNews as getNewsList } from "../api/ViewerAPI";
import { useEffect, useState } from "react";

export default function News() {
  const [newsArticles, setNewsArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNews() {
      try {
        setLoading(true);
        setError("");

        const response = await getNewsList();

        console.log("News response:", response);
        console.log("News data:", response.data);

        setNewsArticles(response.data);

      } catch (error) {
        console.error("Could not load news:", error);
        setError("Could not load news.");

      } finally {
        setLoading(false);
      }
    }

    loadNews();
  }, []);

  return (
    <main className="news-page">

      <p className="eyebrow">MARKET NEWS</p>

      <h1>Latest News</h1>

      <p className="news-page-intro">
        Follow the latest market updates, financial
        developments, and investor sentiment.
      </p>

      {loading && <p>Loading news...</p>}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loading && !error && newsArticles.length === 0 && (
        <p>No news available.</p>
      )}

      {!loading && !error && newsArticles.length > 0 && (
        <section className="news-page-list">

          {newsArticles.map((article, index) => (
            <article
              className="news-page-card"
              key={index}
            >

              <div className="news-page-card-top">

                <span className="news-category">
                  MARKET NEWS
                </span>

                <span className="news-time">
                  {article.date
                    ? new Date(article.date).toLocaleString()
                    : "Today"}
                </span>

              </div>

              <h2>
                {article.title}
              </h2>

              <p>
                {article.content}
              </p>

              {article.link && (
                <button
                  type="button"
                  className="read-news-button"
                  onClick={() =>
                    window.open(
                      article.link,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  Read article
                </button>
              )}

            </article>
          ))}

        </section>
      )}

    </main>
  );
}