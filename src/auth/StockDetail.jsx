import { useEffect, useState } from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getTitle,
  getNews,
  getData,
  getWatchlist,
  addStockToWatchlist,
  deteleWatchlist,
  getSentiment,
} from "../api/ViewerAPI";

export default function StockDetail() {
  const { symbol } = useParams();

  const location = useLocation();
  const navigate = useNavigate();

  const [sentiment, setSentiment] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  const [description, setDescription] = useState("");
  const [news, setNews] = useState([]);
  const [assetName, setAssetName] = useState("");
  const [marketData, setMarketData] = useState({});
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [changingWatchlist, setChangingWatchlist] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (symbol) {
      loadAssetData();
      checkWatchlist();
    }
  }, [symbol]);

  async function loadAssetData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const results = await Promise.allSettled([
        getTitle(symbol),
        getNews(symbol),
        getData(symbol),
      ]);

      const titleResult = results[0];
      const newsResult = results[1];
      const dataResult = results[2];

      let loadedSomething = false;

      if (titleResult.status === "fulfilled") {
        const titleResponse = titleResult.value;
        const titleData = titleResponse?.data;

        if (
          titleData &&
          typeof titleData === "object"
        ) {
          setDescription(
            titleData.extract ||
              titleData.description ||
              titleData.summary ||
              ""
          );

          setAssetName(
            titleData.title ||
              titleData.name ||
              titleData.securityName ||
              ""
          );
        } else {
          setDescription(titleData || "");
        }

        loadedSomething = true;
      } else {
        console.error(
          "Could not load asset description:",
          titleResult.reason
        );
      }

      if (newsResult.status === "fulfilled") {
        const newsResponse = newsResult.value;
        const newsData =
          newsResponse?.data || newsResponse;

        if (Array.isArray(newsData)) {
          setNews(newsData);
        } else if (
          Array.isArray(newsData?.articles)
        ) {
          setNews(newsData.articles);
        } else if (
          Array.isArray(newsData?.news)
        ) {
          setNews(newsData.news);
        } else {
          setNews([]);
        }

        loadedSomething = true;
      } else {
        console.error(
          "Could not load asset news:",
          newsResult.reason
        );
      }

      if (dataResult.status === "fulfilled") {
        const marketResponse = dataResult.value;
        const result =
          marketResponse?.chart?.result?.[0];

        setMarketData(result?.meta || {});
        loadedSomething = true;
      } else {
        console.error(
          "Could not load market data:",
          dataResult.reason
        );
      }

      if (!loadedSomething) {
        setErrorMessage(
          "Could not load asset details."
        );
      }
    } catch (error) {
      console.error(
        "Could not load asset details:",
        error
      );

      setErrorMessage(
        "Could not load asset details."
      );
    } finally {
      setLoading(false);
    }
  }

async function handleSentiment() {
  try {
    setSentimentLoading(true);
    setSentiment(null);

    await getNews(symbol);

    const sentimentData = await getSentiment(symbol);

    console.log("Sentiment data:", sentimentData);

    if (Array.isArray(sentimentData)) {
      setSentiment(sentimentData[0] || null);
    } else {
      setSentiment(sentimentData || null);
    }
  } catch (error) {
    console.error("Could not get sentiment:", error);
    setSentiment(null);
  } finally {
    setSentimentLoading(false);
  }
}

  async function checkWatchlist() {
    try {
      const response = await getWatchlist();

      const responseData =
        response?.data || response;

      const assets = Array.isArray(responseData)
        ? responseData
        : responseData?.watchlist || [];

      const exists = assets.some(
        (asset) =>
          asset.symbol?.toUpperCase() ===
          symbol?.toUpperCase()
      );

      setIsInWatchlist(exists);
    } catch (error) {
      console.error(
        "Could not check watchlist:",
        error
      );
    }
  }

  async function handleWatchlistChange() {
    try {
      setChangingWatchlist(true);
      setWatchlistMessage("");

      if (isInWatchlist) {
        await deteleWatchlist(symbol);

        setIsInWatchlist(false);
        setWatchlistMessage(
          "Removed from watchlist."
        );
      } else {
        await addStockToWatchlist({
          symbol: symbol.toUpperCase(),
          securityName:
            assetName || symbol.toUpperCase(),
          type: "Stock",
        });

        setIsInWatchlist(true);
        setWatchlistMessage(
          "Added to watchlist."
        );
      }
    } catch (error) {
      console.error(
        "Could not update watchlist:",
        error
      );

      setWatchlistMessage(
        "Could not update watchlist."
      );
    } finally {
      setChangingWatchlist(false);
    }
  }

  function handlePricePrediction() {
    navigate(
      `/price-prediction/${symbol.toUpperCase()}`
    );
  }

  function handleBack() {
    const returnTo = location.state?.returnTo;

    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate("/watchlist");
    }
  }

  function formatPrice(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return "—";
    }

    return Number(value).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  function getNewsHeadline(article) {
    return (
      article?.headline ||
      article?.title ||
      article?.headlineText ||
      "Recent market update"
    );
  }

  function getNewsSource(article) {
    return (
      article?.source ||
      article?.publisher ||
      article?.provider ||
      "Market source"
    );
  }

  function getNewsSummary(article) {
    return (
      article?.summary ||
      article?.description ||
      article?.text ||
      "No summary available."
    );
  }

  function getNewsImage(article) {
    return (
      article?.image ||
      article?.imageUrl ||
      article?.thumbnail ||
      article?.thumbnailUrl ||
      ""
    );
  }

  const currentPrice =
    marketData?.regularMarketPrice;

  const previousClose =
    marketData?.chartPreviousClose;

  const change =
    currentPrice !== undefined &&
    previousClose !== undefined
      ? currentPrice - previousClose
      : null;

  const changePercent =
    change !== null && previousClose
      ? (change / previousClose) * 100
      : null;

  const isPositive = change >= 0;

  if (loading) {
    return (
      <main className="stock-detail-page">
        <p>Loading asset details...</p>
      </main>
    );
  }

  return (
    <main className="stock-detail-page">
      {errorMessage && (
        <p className="error-message">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        className="back-button"
        onClick={handleBack}
      >
        ← Back
      </button>

      <section className="stock-detail-header">
        <div className="stock-detail-heading">
          <p className="eyebrow">
            MARKET DETAILS
          </p>

          <h1>
            {assetName ||
              symbol?.toUpperCase()}
          </h1>

          <p className="stock-detail-symbol">
            {symbol?.toUpperCase()}
          </p>

          <div className="stock-detail-actions">
            <button
              type="button"
              className="watchlist-button"
              onClick={handleWatchlistChange}
              disabled={changingWatchlist}
            >
              {changingWatchlist
                ? "Updating..."
                : isInWatchlist
                  ? "Remove from watchlist"
                  : "Add to watchlist"}
            </button>

            <button
              type="button"
              className="compare-button"
              onClick={() =>
                navigate(
                  `/price/${symbol.toUpperCase()}`
                )
              }
            >
              Price details
            </button>

            <button
              type="button"
              className="compare-button"
              onClick={handlePricePrediction}
            >
              Price Prediction
            </button>

            <button
              type="button"
              className="compare-button"
              onClick={handleSentiment}
              disabled={sentimentLoading}
            >
              {sentimentLoading
                ? "Getting sentiment..."
                : "Get sentiment"}
            </button>
          </div>
        </div>

        {sentiment && (
          <section className="sentiment-section">
            <p className="eyebrow">
              MARKET SENTIMENT
            </p>

            <h2>
              {sentiment.sentimentLabel ||
                "Unknown"}
            </h2>

            <p>
              Score:{" "}
              {sentiment.sentimentScore ??
                "—"}
            </p>

            <p>
              {sentiment.text ||
                "No sentiment text available."}
            </p>

            <p>
              Date:{" "}
              {sentiment.created_at ||
                "—"}
            </p>
          </section>
        )}

        <div className="stock-price-card">
          <span className="stock-current-price">
            {formatPrice(currentPrice)}
          </span>

          {change !== null && (
            <span
              className={
                isPositive
                  ? "stock-change positive"
                  : "stock-change negative"
              }
            >
              {isPositive ? "+" : ""}
              {formatPrice(change)} (
              {isPositive ? "+" : ""}
              {changePercent?.toFixed(2)}%)
            </span>
          )}
        </div>
      </section>

      {watchlistMessage && (
        <p className="watchlist-message">
          {watchlistMessage}
        </p>
      )}

      <section className="stock-description-section">
        <p className="eyebrow">
          ABOUT THIS ASSET
        </p>

        <p>
          {description ||
            "No description available for this asset."}
        </p>
      </section>

      <section className="stock-news-section">
        <p className="eyebrow">
          RECENT NEWS
        </p>

        {news.length === 0 ? (
          <p>
            No recent news is available for
            this asset.
          </p>
        ) : (
          news.map((article, index) => {
            const image =
              getNewsImage(article);

            return (
              <article
                className="stock-news-item"
                key={article.id || index}
              >
                {image && (
                  <img
                    className="stock-news-image"
                    src={image}
                    alt=""
                  />
                )}

                <div>
                  <h2>
                    {getNewsHeadline(article)}
                  </h2>

                  <p className="stock-news-source">
                    Source:{" "}
                    {getNewsSource(article)}
                  </p>

                  <p>
                    {getNewsSummary(article)}
                  </p>

                  {article?.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read article →
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}