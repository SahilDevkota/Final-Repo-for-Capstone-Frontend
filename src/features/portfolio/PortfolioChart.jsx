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

// "Up 40%" means nothing on its own — the whole market may have risen
// more. Both lines are rebased to percent change from the first day, so
// the portfolio can be read against the index it could have been bought
// instead of.
//
// The portfolio line follows `growth`, not the raw value: money paid in
// partway through raises the value without being a gain, and the server
// has already stripped that out.
function rebase(rows, pick) {
  const first = rows.map(pick).find((value) => value !== null && value !== undefined);
  if (!first) return () => null;

  return (row) => {
    const value = pick(row);
    if (value === null || value === undefined) return null;
    return ((value - first) / first) * 100;
  };
}

function Tip({ active, payload, label, benchmark }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{label}</span>

      {payload.map((entry) => (
        <span key={entry.dataKey} style={{ color: entry.stroke }}>
          {entry.dataKey === "mine" ? "Your portfolio" : benchmark}:{" "}
          {entry.value.toFixed(2)}%
        </span>
      ))}
    </div>
  );
}

export default function PortfolioChart({ history, benchmark }) {
  const colors = useChartColors();

  if (history.length < 2) return null;

  const asMine = rebase(history, (row) => row.growth);
  const asIndex = rebase(history, (row) => row.benchmark);

  const data = history.map((row) => ({
    // Fixed en-GB, so the day and month do not swap around by locale
    day: new Date(row.day).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    mine: asMine(row),
    index: asIndex(row),
  }));

  // Room around both lines, so neither is drawn along an edge
  let low = 0;
  let high = 0;

  for (const point of data) {
    for (const value of [point.mine, point.index]) {
      if (value !== null) {
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
  }

  const padding = Math.max((high - low) * 0.15, 0.3);
  const mine = data[data.length - 1].mine;
  const index = data[data.length - 1].index;

  return (
    <section className="stock-chart-card compare-chart">
      <header className="compare-chart-header">
        <h3>Your portfolio against {benchmark}</h3>

        <div className="compare-legend">
          <span style={{ color: colors.up }}>● Your portfolio</span>
          <span style={{ color: colors.accent }}>● {benchmark}</span>
        </div>
      </header>

      {mine !== null && index !== null && (
        <p className="compare-thin">
          Over this month your holdings moved {mine.toFixed(2)}% and{" "}
          {benchmark} moved {index.toFixed(2)}%, so you are{" "}
          {mine >= index ? "ahead of" : "behind"} the index by{" "}
          {Math.abs(mine - index).toFixed(2)} points. Money paid in during
          the month is left out, so this is price movement only.
        </p>
      )}

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />

          <XAxis
            dataKey="day"
            stroke={colors.axis}
            tick={{ fill: colors.tick, fontSize: 11 }}
            minTickGap={28}
          />

          <YAxis
            stroke={colors.axis}
            tick={{ fill: colors.tick, fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(high - low < 5 ? 1 : 0)}%`}
            domain={[low - padding, high + padding]}
            width={58}
          />

          <Tooltip content={<Tip benchmark={benchmark} />} />

          <Line
            type="monotone"
            dataKey="mine"
            stroke={colors.up}
            strokeWidth={2}
            dot={false}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="index"
            stroke={colors.accent}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
