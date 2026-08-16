import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  getData,
  getPricePrediction,
  getStocks,
} from "../api/ViewerAPI";

import "../styles/compare.css";

function price(item) {
  return item.predicted_price ?? item.predictedPrice;
}

export default function ComparePage() {
  const [searchParams] = useSearchParams();

  const firstSymbol = (
    searchParams.get("a") || ""
  ).toUpperCase();

  const [secondSymbol, setSecondSymbol] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [results, setResults] = useState([]);

  const [firstPrice, setFirstPrice] =
    useState(null);

  const [secondPrice, setSecondPrice] =
    useState(null);

  const [firstPredictions, setFirstPredictions] =
    useState([]);

  const [secondPredictions, setSecondPredictions] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (!firstSymbol) return;

    loadAsset(
      firstSymbol,
      setFirstPrice,
      setFirstPredictions
    );
  }, [firstSymbol]);

  useEffect(() => {
    if (!secondSymbol) return;

    loadAsset(
      secondSymbol,
      setSecondPrice,
      setSecondPredictions
    );
  }, [secondSymbol]);

  async function loadAsset(
    symbol,
    setPrice,
    setPredictions
  ) {
    try {
      setLoading(true);

      const predictionResponse =
        await getPricePrediction(symbol);

      const marketResponse =
        await getData(symbol);

      const marketPrice =
        marketResponse?.chart?.result?.[0]
          ?.meta?.regularMarketPrice;

      setPrice(marketPrice);

      setPredictions(
        Array.isArray(predictionResponse)
          ? predictionResponse.slice(0, 5)
          : []
      );
    } catch (error) {
      console.error(
        `Could not load ${symbol}:`,
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function searchAssets(event) {
    const value = event.target.value;

    setSearchText(value);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    try {
      const response = await getStocks(value);

      setResults(
        Array.isArray(response) ? response : []
      );
    } catch (error) {
      console.error(
        "Search failed:",
        error
      );

      setResults([]);
    }
  }

  function chooseAsset(asset) {
    const symbol = (
      asset.symbol ||
      asset.ticker ||
      ""
    ).toUpperCase();

    if (symbol === firstSymbol) {
      return;
    }

    setSecondSymbol(symbol);
    setSearchText(symbol);
    setResults([]);
  }

  const chartData = [
    {
      day: "Current",
      first: Number(firstPrice),
      second: Number(secondPrice),
    },
    ...Array.from(
      {
        length: Math.max(
          firstPredictions.length,
          secondPredictions.length
        ),
      },
      (_, index) => ({
        day: `Day ${index + 1}`,
        first: Number(
          price(firstPredictions[index])
        ),
        second: Number(
          price(secondPredictions[index])
        ),
      })
    ),
  ];

  return (
    <main className="compare-page">
      <p className="eyebrow">
        SIDE BY SIDE
      </p>

      <h1>Compare</h1>

      <section className="compare-inputs">
        <div>
          <label>First asset</label>

          <input
            value={firstSymbol}
            readOnly
          />
        </div>

        <div className="search-box">
          <label>Second asset</label>

          <input
            value={searchText}
            onChange={searchAssets}
            placeholder="Search symbol..."
          />

          {results.length > 0 && (
            <div className="search-results">
              {results.map((asset) => (
                <button
                  type="button"
                  key={
                    asset.symbol ||
                    asset.ticker
                  }
                  onClick={() =>
                    chooseAsset(asset)
                  }
                >
                  {asset.symbol ||
                    asset.ticker}{" "}
                  {asset.name || ""}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {!secondSymbol && (
        <div className="compare-message">
          Choose another asset to compare.
        </div>
      )}

      {loading && (
        <div className="compare-message">
          Loading...
        </div>
      )}

      {secondSymbol && !loading && (
        <>
          <section className="compare-table-card">
            <h2>Price predictions</h2>

            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>{firstSymbol}</th>
                  <th>{secondSymbol}</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>Current</td>
                  <td>
                    {Number(firstPrice).toFixed(2)}
                  </td>
                  <td>
                    {Number(secondPrice).toFixed(2)}
                  </td>
                </tr>

                {chartData
                  .slice(1)
                  .map((row) => (
                    <tr key={row.day}>
                      <td>{row.day}</td>
                      <td>
                        {Number(row.first).toFixed(2)}
                      </td>
                      <td>
                        {Number(row.second).toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section className="compare-chart-card">
            <h2>Price prediction chart</h2>

            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <LineChart data={chartData}>
                <XAxis dataKey="day" />
                <YAxis />

                <Tooltip />
                <Legend />

                <Line
                  type="monotone"
                  dataKey="first"
                  name={firstSymbol}
                  stroke="#7aa300"
                  strokeWidth={3}
                  dot
                />

                <Line
                  type="monotone"
                  dataKey="second"
                  name={secondSymbol}
                  stroke="#2f6fd0"
                  strokeWidth={3}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </>
      )}
    </main>
  );
}