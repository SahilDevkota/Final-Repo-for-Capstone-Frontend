import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import {
  fetchPortfolio,
  addHolding,
  removeHolding,
  fetchCloseOnDate,
} from "../../lib/portfolio";
import PortfolioChart from "./PortfolioChart";
import Allocation from "./Allocation";

const EMPTY_ENTRY = {
  symbol: "",
  quantity: "",
  buyPrice: "",
  buyDate: "",
};

const money = (value) =>
  value === null || value === undefined
    ? "—"
    : `$${Number(value).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}`;

const percent = (value) =>
  value === null || value === undefined
    ? "—"
    : `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`;

const shortDate = (iso) => {
  const [y, m, d] = String(iso || "").split("-");
  return y ? `${d}/${m}/${y}` : "—";
};

const toneOf = (value) =>
  value === null || value === undefined
    ? ""
    : value > 0
    ? "value-up"
    : value < 0
    ? "value-down"
    : "";

export default function PortfolioPage() {
  const navigate = useNavigate();

  const [holdings, setHoldings] = useState([]);
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [benchmark, setBenchmark] = useState("SPY");
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [entry, setEntry] = useState(EMPTY_ENTRY);

  // The last price we filled in ourselves. Anything else in the box was
  // typed by the user, and is left alone.
  const [suggested, setSuggested] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Nothing before the first await calls setState, to avoid a cascading
  // render when this is called from useEffect.
  const loadData = useCallback(async () => {
    try {
      const data = await fetchPortfolio();
      setHoldings(data.holdings);
      setPositions(data.positions || []);
      setHistory(data.history || []);
      setBenchmark(data.benchmark || "SPY");
      setSummary(data.summary);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Disabled because the rule follows the call graph and flags loadData
  // even though its setState calls all happen after an await.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  async function handleAdd(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError(null);
      await addHolding(entry);
      setEntry(EMPTY_ENTRY);
      await loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    try {
      setBusyId(id);
      await removeHolding(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  // Nobody remembers what they paid to the cent, so the closing price on
  // the day of the purchase is offered as a starting point.
  useEffect(() => {
    const { symbol, buyDate } = entry;
    if (!symbol.trim() || !buyDate) return undefined;

    let cancelled = false;

    fetchCloseOnDate(symbol.trim().toUpperCase(), buyDate).then((close) => {
      if (cancelled || close === null) return;

      const price = close.toFixed(2);

      setEntry((current) => {
        // Only replace an empty box, or one still holding our own guess
        const untouched =
          current.buyPrice === "" || current.buyPrice === suggested;

        return untouched ? { ...current, buyPrice: price } : current;
      });

      setSuggested(price);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.symbol, entry.buyDate]);

  const update = (field, value) =>
    setEntry((previous) => ({
      ...previous,
      [field]: value,
    }));

  return (
    <main className="dashboard-page">
      <section className="dashboard-header">
        <div className="dashboard-welcome">
          <p className="eyebrow">Your holdings</p>

          <h1>Portfolio</h1>

          <p className="dashboard-subtitle">
            What you bought, what it is worth now, and the difference.
            Prices update every time this page loads.
          </p>
        </div>
      </section>

      <section className="portfolio-summary">
        <article className="side-card portfolio-stat">
          <p className="eyebrow">Total value</p>
          <strong>{money(summary.value)}</strong>
          <span>
            {summary.holdings || 0} holding
            {summary.holdings === 1 ? "" : "s"}
          </span>
        </article>

        <article className="side-card portfolio-stat">
          <p className="eyebrow">Total cost</p>
          <strong>{money(summary.cost)}</strong>
          <span>Amount invested</span>
        </article>

        <article className="side-card portfolio-stat">
          <p className="eyebrow">Profit / loss</p>
          <strong className={toneOf(summary.profit)}>
            {money(summary.profit)}
          </strong>
          <span className={toneOf(summary.profit)}>
            {percent(summary.profitPercent)}
          </span>
        </article>
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="dashboard-section portfolio-form-card">
        <h2>Add a purchase</h2>

        <form className="portfolio-form" onSubmit={handleAdd}>
          <label>
            Symbol
            <input
              value={entry.symbol}
              onChange={(e) => update("symbol", e.target.value)}
              placeholder="AAPL"
            />
          </label>

          <label>
            Quantity
            <input
              type="number"
              step="any"
              min="0"
              value={entry.quantity}
              onChange={(e) => update("quantity", e.target.value)}
              placeholder="10"
            />
          </label>

          <label>
            Buy price

            {/* Above the box, not below it: the form aligns its inputs on
                their bottom edge, so a note underneath would lift this
                one out of line with the others. */}
            {suggested && entry.buyPrice === suggested && (
              <small className="field-hint">
                Closing price that day — change it if you paid something
                else.
              </small>
            )}

            <input
              type="number"
              step="any"
              min="0"
              value={entry.buyPrice}
              onChange={(e) => update("buyPrice", e.target.value)}
              placeholder="198.40"
            />
          </label>

          <label>
            Buy date
            <input
              type="date"
              value={entry.buyDate}
              onChange={(e) => update("buyDate", e.target.value)}
            />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? "Adding..." : "Add"}
          </button>
        </form>

        {formError && <p className="form-error">{formError}</p>}
      </section>

      {loading ? (
        <p className="portfolio-message">Loading portfolio...</p>
      ) : holdings.length === 0 ? (
        <div className="asset-empty-state portfolio-empty">
          <h3>Nothing here yet</h3>
          <p>
            Add a purchase above and this page will track what it is
            worth.
          </p>
        </div>
      ) : (
        <>
          <PortfolioChart history={history} benchmark={benchmark} />

          <Allocation positions={positions} />

          <section className="portfolio-list">
            {positions.map((position) => (
              <article className="side-card portfolio-row" key={position.symbol}>
                <div
                  className="portfolio-asset clickable-asset"
                  onClick={() => navigate(`/stock/${position.symbol}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      navigate(`/stock/${position.symbol}`);
                    }
                  }}
                >
                  <strong>{position.symbol}</strong>
                  <span>{position.name}</span>
                  {position.type && <small>{position.type}</small>}
                </div>

                <dl className="portfolio-figures">
                  <div>
                    <dt>Quantity</dt>
                    <dd>{position.quantity}</dd>
                  </div>

                  <div>
                    <dt>Average cost</dt>
                    <dd>{money(position.averageCost)}</dd>
                  </div>

                  <div>
                    <dt>Now</dt>
                    <dd>{money(position.price)}</dd>
                  </div>

                  <div>
                    <dt>Value</dt>
                    <dd>{money(position.value)}</dd>
                  </div>

                  <div>
                    <dt>Profit / loss</dt>
                    <dd className={toneOf(position.profit)}>
                      {money(position.profit)}{" "}
                      <small>{percent(position.profitPercent)}</small>
                    </dd>
                  </div>
                </dl>

                {/* One buy keeps a plain button. Several are listed, so each
                    can still be removed on its own. */}
                {position.buys.length === 1 ? (
                  <button
                    type="button"
                    className="portfolio-remove-button"
                    onClick={() => handleRemove(position.buys[0].id)}
                    disabled={busyId === position.buys[0].id}
                  >
                    {busyId === position.buys[0].id ? "..." : "Remove"}
                  </button>
                ) : (
                  <details className="portfolio-buys">
                    <summary>{position.buys.length} purchases</summary>

                    {position.buys.map((buy) => (
                      <div className="portfolio-buy" key={buy.id}>
                        <span>
                          {buy.quantity} at {money(buy.buyPrice)} on{" "}
                          {shortDate(buy.buyDate)}
                        </span>

                        <button
                          type="button"
                          className="portfolio-remove-button"
                          onClick={() => handleRemove(buy.id)}
                          disabled={busyId === buy.id}
                        >
                          {busyId === buy.id ? "..." : "Remove"}
                        </button>
                      </div>
                    ))}
                  </details>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
