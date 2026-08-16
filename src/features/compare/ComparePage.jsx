import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { fetchCompareAsset, searchAssets, suggestByType } from "../../lib/market";
import CompareChart from "./CompareChart";

// Two assets side by side.
//
//   TABLE   the comparison rows
//   PICKER  the two search boxes
//   LOADING one asset per side
//   PAGE    what gets rendered

// ── TABLE ───────────────────────────────────────────────────────────

// Always en-US: a Vietnamese browser writes 25.32 as "25,325".
function money(value) {
  if (value == null) return "—";

  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function percent(value) {
  if (value == null) return "—";

  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function text(value) {
  return value || "—";
}

function score(value) {
  return value == null ? "Not available" : value.toFixed(2);
}

// Rows of the side-by-side table. `better` decides which side gets the
// win marker; null means the row is not a contest.
const ROWS = [
  { label: "Price",     get: (a) => a.price,          format: money,   better: "high" },
  { label: "Today",     get: (a) => a.changePercent,  format: percent, better: "high" },
  { label: "Type",      get: (a) => a.type,           format: text,    better: null },
  { label: "Market",    get: (a) => a.market,         format: text,    better: null }
];

// ── PICKER ──────────────────────────────────────────────────────────
// The second slot gets `matchType` once the first is chosen, so it only
// offers assets of the same kind.

function Picker({ side, value, matchType, exclude, onPick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  // Every setState sits inside the timer callback, never in the effect body
  useEffect(() => {
    const q = query.trim();
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        // With a type to match, an empty box still lists that type.
        // Without one, nothing shows until something is typed.
        let found = [];

        if (matchType) {
          found = await suggestByType(matchType, q);
        } else if (q) {
          found = await searchAssets(q);
        }

        // Nothing is gained by comparing an asset with itself
        const usable = found.filter((asset) => asset.symbol !== exclude);

        if (!cancelled) setResults(usable);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, q ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, matchType, exclude]);

  return (
    <div className="compare-picker">
      <p className="eyebrow">{side}</p>

      <input
        value={query}
        placeholder={value || "Search a symbol..."}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {/* A placeholder reads as a hint, not a choice */}
      {value && (
        <p className="compare-picked">
          Selected <strong>{value}</strong>
        </p>
      )}

      {open && results.length > 0 && (
        <ul className="compare-results">
          {results.map((asset) => (
            <li key={`${asset.type}-${asset.symbol}`}>
              <button
                type="button"
                onMouseDown={() => {
                  onPick(asset.symbol);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <strong>{asset.symbol}</strong>
                <span>{asset.name}</span>
                <small>{asset.type}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── LOADING ─────────────────────────────────────────────────────────
// One side at a time. Loading both together meant nothing arrived until
// both were chosen, so the second picker never learnt the first one's type.

function useAsset(symbol) {
  // One piece of state, written only after a request settles, and used
  // only while it still matches the symbol being asked for.
  const [result, setResult] = useState({ symbol: "", asset: null, failed: false });

  useEffect(() => {
    if (!symbol) return undefined;

    let cancelled = false;

    fetchCompareAsset(symbol)
      .then((asset) => !cancelled && setResult({ symbol, asset, failed: false }))
      .catch(() => !cancelled && setResult({ symbol, asset: null, failed: true }));

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const current = result.symbol === symbol;

  return {
    asset:   current ? result.asset : null,
    failed:  current && result.failed,
    loading: Boolean(symbol) && !current,
  };
}

// ── PAGE ────────────────────────────────────────────────────────────

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const symbolA = params.get("a") || "";
  const symbolB = params.get("b") || "";

  const a = useAsset(symbolA);
  const b = useAsset(symbolB);

  const assetA = a.asset;
  const assetB = b.asset;
  const loading = a.loading || b.loading;

  const error =
    a.failed || b.failed
      ? `Could not load ${[a.failed && symbolA, b.failed && symbolB].filter(Boolean).join(" and ")}.`
      : null;

  function pick(side, symbol) {
    const next = new URLSearchParams(params);
    next.set(side, symbol);
    setParams(next, { replace: true });
  }

  const ready = assetA && assetB;

  return (
    <main className="dashboard-page">
      <section className="dashboard-header">
        <div className="dashboard-welcome">
          <p className="eyebrow">Side by side</p>

          <h1>Compare</h1>

          <p className="dashboard-subtitle">
            Two assets next to each other. Prices are rebased to percent
            change so a $200 stock and a $90,000 coin stay comparable.
          </p>
        </div>

        {ready && (
          <div className="dashboard-header-actions">
            <button
              type="button"
              className="outline-button"
              onClick={() => navigate(`/stock/${symbolA}`)}
            >
              Open {symbolA}
            </button>
          </div>
        )}
      </section>

      <section className="compare-pickers">
        <Picker
          side="First asset"
          value={symbolA}
          exclude={symbolB}
          onPick={(s) => pick("a", s)}
        />

        <Picker
          side="Second asset"
          value={symbolB}
          matchType={assetA?.type}
          exclude={symbolA}
          onPick={(s) => pick("b", s)}
        />
      </section>

      {error && <p className="form-error">{error}</p>}

      {!symbolA || !symbolB ? (
        <div className="asset-empty-state portfolio-empty">
          <h3>Pick two assets</h3>
          <p>Search above to choose what to compare.</p>
        </div>
      ) : loading ? (
        <p className="portfolio-message">Loading comparison...</p>
      ) : ready ? (
        <>
          <section className="dashboard-section compare-table">
            <div className="compare-row compare-row-head">
              <span />
              <strong>{assetA.symbol}</strong>
              <strong>{assetB.symbol}</strong>
            </div>

            {ROWS.map((row) => {
              const va = row.get(assetA);
              const vb = row.get(assetB);

              // Only mark a winner when both sides have a number
              let winner = null;
              if (
                row.better === "high" &&
                typeof va === "number" &&
                typeof vb === "number"
              ) {
                winner = va === vb ? null : va > vb ? "a" : "b";
              }

              return (
                <div className="compare-row" key={row.label}>
                  <span className="compare-label">{row.label}</span>

                  <span className={winner === "a" ? "compare-win" : ""}>
                    {row.format(va)}
                  </span>

                  <span className={winner === "b" ? "compare-win" : ""}>
                    {row.format(vb)}
                  </span>
                </div>
              );
            })}
          </section>

          <CompareChart
            title="Price, rebased to % change"
            seriesA={assetA.history}
            seriesB={assetB.history}
            labelA={assetA.symbol}
            labelB={assetB.symbol}
          />
        </>
      ) : null}
    </main>
  );
}
