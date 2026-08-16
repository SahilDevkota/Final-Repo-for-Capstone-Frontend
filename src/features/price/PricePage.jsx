import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCompareAsset } from "../../lib/market";
import AssetActions from "../browse/AssetActions";
import {getTheIntradayData} from "../../api/ViewerAPI"

function formatPrice(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(2);
}

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-US").format(
    Number(value)
  );
}

export default function PricePage() {
  const { symbol } = useParams();

  const [marketData, setMarketData] =
    useState(null);

    const [intradayData,setIntradayData] = useState([])


  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");


 

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    const show = (asset) => {
      if (cancelled) return;

      setMarketData(asset);
      setLoading(false);
    };

    fetchCompareAsset(symbol)
      .then(show)
      .catch(() => show(null));

    return () => {
      cancelled = true;
    };
  }, [symbol]);


  useEffect(()=>{
    if (!symbol) return;

    async function loadMarketData(){
      try{
        const data = await getTheIntradayData(symbol);
        setIntradayData(data)
      }catch(error){
        setErrorMessage("Failed to load the market data")
      }
    }

    loadMarketData();
  },[symbol])
  if (loading) {
    return (
      <main className="stock-detail-page price-page">
        <p className="eyebrow">
          MARKET DETAILS
        </p>

        <h1>
          Loading {symbol?.toUpperCase()}...
        </h1>
      </main>
    );
  }

  const candles = marketData?.history || [];
  const today = candles[candles.length - 1];

  const currentPrice = marketData?.price ?? today?.price;
  const previousClose = marketData?.previousClose;

  const dayOpen = today?.open;
  const dayHigh = marketData?.dayHigh;
  const dayLow = marketData?.dayLow;
  const dayVolume = marketData?.dayVolume;

  const priceChange =
    currentPrice !== undefined &&
    previousClose !== undefined
      ? currentPrice - previousClose
      : null;

  const latest = intradayData[intradayData.length - 1];

  const open = latest?.open;
  const close = latest?.close;
  const high = latest?.high;
  const low = latest?.low;
  const volume = latest?.volume;

  const priceChangePercent =
    priceChange !== null &&
    previousClose
      ? (priceChange / previousClose) * 100
      : null;

  const isPositive =
    priceChange === null ||
    priceChange >= 0;

  const companyName = marketData?.name || symbol?.toUpperCase();

  return (
    <main className="stock-detail-page price-page">
      <Link
        to="/watchlist"
        className="secondary-link"
      >
        ← Back to watchlist
      </Link>

      <section className="stock-detail-header">
        <p className="eyebrow">
          MARKET DETAILS
        </p>

        <div className="stock-title-row">
          <div>
            <p className="stock-symbol">
              {symbol?.toUpperCase()}
            </p>

            <h1>{companyName}</h1>
          </div>

          <div className="market-price-card">
            <span className="profile-label">
              Current price
            </span>

            <strong>
              {formatPrice(close)}
            </strong>

            {priceChange !== null && (
              <span
                className={
                  isPositive
                    ? "positive-change"
                    : "negative-change"
                }
              >
                {isPositive ? "+" : ""}
                {formatPrice(priceChange)}

                {priceChangePercent !== null &&
                  ` (${isPositive ? "+" : ""}${formatPrice(
                    priceChangePercent
                  )}%)`}
              </span>
            )}
          </div>
        </div>

        {/* ── Bao ── */}
        <AssetActions
          symbol={symbol?.toUpperCase()}
          name={companyName}
          type={marketData?.type}
        />
      </section>

      {errorMessage && (
        <p className="error-message">
          {errorMessage}
        </p>
      )}

     
      <section className="stock-stats-grid">
        {/* ── Bao ── day figures, not the last minute's */}
        <div className="stock-stat-card">
          <span>Open</span>
          <strong>
            {formatPrice(open)}
          </strong>
        </div>

        <div className="stock-stat-card">
          <span>Day high</span>
          <strong>
            {formatPrice(high)}
          </strong>
        </div>

        <div className="stock-stat-card">
          <span>Day low</span>
          <strong>
            {formatPrice(low)}
          </strong>
        </div>

        <div className="stock-stat-card">
          <span>Previous close</span>
          <strong>
            {formatPrice(close)}
          </strong>
        </div>

        <div className="stock-stat-card">
          <span>Volume</span>
          <strong>
            {formatNumber(volume)}
          </strong>
        </div>

        <div className="stock-stat-card">
          <span>Currency</span>
          <strong>
            {marketData?.currency || "USD"}
          </strong>
        </div>
      </section>

    </main>
  );
}