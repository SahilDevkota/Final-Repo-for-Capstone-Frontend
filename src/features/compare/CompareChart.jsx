import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useChartColors } from "../../lib/chartTheme";

// Two series on one axis. Prices are rebased to percent change from each
// series' own first point, so $227 and $96,000 stay comparable.
function rebase(points) {
  if (!points.length) return new Map();

  const first = Number(points[0].value);
  if (!first) return new Map();

  return new Map(
    points.map((point) => [
      point.t,
      ((Number(point.value) - first) / first) * 100,
    ])
  );
}

function Tip({ active, payload, label, labelA, labelB }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>

      {payload.map((entry) => (
        <span key={entry.dataKey} style={{ color: entry.stroke }}>
          {entry.dataKey === "a" ? labelA : labelB}:{" "}
          {entry.value.toFixed(2)}%
        </span>
      ))}
    </div>
  );
}

export default function CompareChart({ title, seriesA, seriesB, labelA, labelB }) {
  const colors = useChartColors();

  // `date` already arrives as a timestamp from our service
  const toPoints = (series = []) =>
    series.map((item) => ({ t: item.date, value: item.price }));

  const a = rebase(toPoints(seriesA));
  const b = rebase(toPoints(seriesB));

  // Union of both timelines so neither series is cut short
  const times = [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => x - y);

  // The series is a month of daily closes, so the axis needs the date. A
  // fixed en-GB format rather than the browser's, which reorders the day
  // and month depending on where the reader happens to be.
  const data = times.map((t) => ({
    time: new Date(t).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    a: a.get(t) ?? null,
    b: b.get(t) ?? null,
  }));

  // The range both lines have to fit in. It starts at zero because every
  // series is rebased from there, so zero is always meaningful.
  let low = 0;
  let high = 0;

  for (const point of data) {
    for (const value of [point.a, point.b]) {
      if (value !== null) {
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
  }

  // Padding on both sides, so a line that never moves is drawn inside the
  // plot rather than along its top or bottom edge. The floor of 0.3 covers
  // the case where both series are flat and the range would be zero.
  const padding = Math.max((high - low) * 0.15, 0.3);
  const domain = [low - padding, high + padding];

  // Percent changes are often under 1%, where whole-number ticks collapse
  // into a column of "0%". One decimal keeps them apart.
  const decimals = high - low < 5 ? 1 : 0;

  // A thinly traded asset returns only a handful of points. One point on
  // its own draws no line at all, so those series get dots instead.
  const sparse = (series) => series.size > 0 && series.size < 5;

  const thin = [
    sparse(a) ? labelA : null,
    sparse(b) ? labelB : null,
  ].filter(Boolean);

  return (
    <section className="stock-chart-card compare-chart">
      <header className="compare-chart-header">
        <h3>{title}</h3>

        <div className="compare-legend">
          <span style={{ color: colors.up }}>● {labelA}</span>
          <span style={{ color: colors.accent }}>● {labelB}</span>
        </div>
      </header>

      {thin.length > 0 && (
        <p className="compare-thin">
          {thin.join(" and ")} {thin.length > 1 ? "have" : "has"} very few
          trades today, so{" "}
          {thin.length > 1 ? "those lines sit" : "that line sits"} flat rather
          than showing a trend.
        </p>
      )}

      {data.length === 0 ? (
        <p className="portfolio-message">No price history to compare yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />

            <XAxis
              dataKey="time"
              stroke={colors.axis}
              tick={{ fill: colors.tick, fontSize: 11 }}
              minTickGap={28}
            />

            <YAxis
              stroke={colors.axis}
              tick={{ fill: colors.tick, fontSize: 11 }}
              tickFormatter={(v) => `${v.toFixed(decimals)}%`}
              domain={domain}
              width={58}
            />

            <Tooltip content={<Tip labelA={labelA} labelB={labelB} />} />

            <Line
              type="monotone"
              dataKey="a"
              stroke={colors.up}
              strokeWidth={2}
              dot={sparse(a) ? { r: 4, fill: colors.up, stroke: colors.up } : false}
              connectNulls
            />

            <Line
              type="monotone"
              dataKey="b"
              stroke={colors.accent}
              strokeWidth={2}
              dot={sparse(b) ? { r: 4, fill: colors.accent, stroke: colors.accent } : false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
