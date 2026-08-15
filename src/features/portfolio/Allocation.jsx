// A list of holdings hides how lopsided a portfolio is. Two entries that
// are both US tech shares are one bet made twice, not two bets.
const CONCENTRATED = 40;

export default function Allocation({ positions }) {
  const priced = positions.filter((position) => position.value !== null);
  if (priced.length === 0) return null;

  const total = priced.reduce((sum, position) => sum + position.value, 0);
  if (total === 0) return null;

  const share = (value) => (value / total) * 100;

  // One slice per type, biggest first
  const byType = new Map();

  for (const position of priced) {
    const type = position.type || "Unknown";
    byType.set(type, (byType.get(type) || 0) + position.value);
  }

  const types = [...byType.entries()]
    .map(([type, value]) => ({ type, value, percent: share(value) }))
    .sort((a, b) => b.value - a.value);

  const largest = [...priced].sort((a, b) => b.value - a.value)[0];
  const largestShare = share(largest.value);

  return (
    <section className="dashboard-section allocation">
      <p className="eyebrow">HOW IT IS SPREAD</p>
      <h3>Allocation</h3>

      <div className="allocation-bar">
        {types.map((slice) => (
          <span
            key={slice.type}
            className={`allocation-slice allocation-${slice.type.toLowerCase()}`}
            style={{ width: `${slice.percent}%` }}
            title={`${slice.type} ${slice.percent.toFixed(1)}%`}
          />
        ))}
      </div>

      <ul className="allocation-legend">
        {types.map((slice) => (
          <li key={slice.type}>
            <span className={`allocation-dot allocation-${slice.type.toLowerCase()}`} />
            {slice.type}
            <strong>{slice.percent.toFixed(1)}%</strong>
          </li>
        ))}
      </ul>

      {types.length === 1 && (
        <p className="allocation-note">
          Everything you hold is {types[0].type.toLowerCase()}, so the whole
          portfolio moves with that one market.
        </p>
      )}

      {largestShare > CONCENTRATED && (
        <p className="allocation-note allocation-warn">
          {largest.symbol} alone is {largestShare.toFixed(1)}% of the total.
          A single asset that large decides most of the result.
        </p>
      )}
    </section>
  );
}
