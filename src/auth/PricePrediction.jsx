import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getData,
  getPricePrediction,
  getAIresponse,
  getHistoricalData
} from "../api/ViewerAPI";

import "../styles/price-prediction.css";

export default function PricePrediction() {
  const { symbol } = useParams();

  const [predictions, setPredictions] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [AIresponse, setAIResponse] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPredictionPage();
  }, [symbol]);

  async function loadPredictionPage() {
    try {
      setLoading(true);
      setError("");
      setAIResponse("");

      await getHistoricalData(symbol);

      const predictionResult =
        await getPricePrediction(symbol);

      const marketResult =
        await getData(symbol);

      console.log(
        "Prediction response:",
        predictionResult
      );

      const predictionList =
        Array.isArray(predictionResult)
          ? predictionResult.slice(0, 5)
          : [];

      setPredictions(predictionList);

      const chartResult =
        marketResult?.chart?.result?.[0];

      const marketPrice =
        chartResult?.meta?.regularMarketPrice;

      setCurrentPrice(marketPrice);

      if (predictionList.length === 0) {
        setError("No predictions were returned.");
      }

    } catch (err) {
      console.error(
        "Prediction page error:",
        err
      );

      console.error(
        "Backend response:",
        err.response?.data
      );

      setError("Failed to load prediction.");
    } finally {
      setLoading(false);
    }
  }

  async function getResponse(symbol) {
    try {
      setError("");

      const response =
        await getAIresponse(symbol);

      setAIResponse(response);
    } catch (err) {
      console.error(
        "AI response error:",
        err
      );

      setError("AI response error");
    }
  }

  const chartData = [
    {
      day: "Current",
      price: Number(currentPrice),
    },
    ...predictions.map((item, index) => ({
      day: `Day ${index + 1}`,
      price: Number(
        item.predicted_price ??
        item.predictedPrice
      ),
    })),
  ].filter((item) =>
    Number.isFinite(item.price)
  );

  if (loading) {
    return (
      <main className="price-prediction-page">
        <p className="eyebrow">
          PRICE PREDICTION
        </p>

        <h1>
          {symbol?.toUpperCase()}
        </h1>

        <p>Loading prediction...</p>
      </main>
    );
  }

  return (
    <main className="price-prediction-page">
      <p className="eyebrow">
        PRICE PREDICTION
      </p>

      <h1>
        {symbol?.toUpperCase()}
      </h1>

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {predictions.length > 0 && (
        <section className="prediction-card">
          <h2>Five-day prediction</h2>

          <div className="prediction-table-wrapper">
            <table className="prediction-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Prediction date</th>
                  <th>Predicted for</th>
                  <th>Predicted price</th>
                </tr>
              </thead>

              <tbody>
                {predictions.map((item, index) => {
                  const predictedPrice =
                    item.predicted_price ??
                    item.predictedPrice;

                  return (
                    <tr key={index}>
                      <td>
                        Day {index + 1}
                      </td>

                      <td>
                        {item.prediction_date ??
                          item.predictionDate ??
                          "Not available"}
                      </td>

                      <td>
                        {item.predicted_for_date ??
                          item.predictedForDate ??
                          "Not available"}
                      </td>

                      <td>
                        {predictedPrice !==
                          undefined &&
                        predictedPrice !== null
                          ? Number(
                              predictedPrice
                            ).toFixed(2)
                          : "Not available"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {chartData.length > 0 && (
        <section className="prediction-card">
          <h2>Price prediction chart</h2>

          <div className="prediction-chart">
            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <LineChart data={chartData}>
                <XAxis dataKey="day" />
                <YAxis />

                <Tooltip
                  formatter={(value) =>
                    Number(value).toFixed(2)
                  }
                />

                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#7aa300"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="prediction-ai-help">
        <h2>
          Need more AI assistance?
        </h2>

        <p>
          If you want help understanding
          these predictions, ask our AI assistant.
        </p>

        <button
          type="button"
          className="prediction-ai-button"
          onClick={() => getResponse(symbol)}
        >
          Get AI analysis
        </button>

        {AIresponse && (
          <div className="ai-response">
            <h3>AI Analysis</h3>
            <p>{AIresponse}</p>
          </div>
        )}
      </section>
    </main>
  );
}