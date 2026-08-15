import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  addStockToWatchlist,
  deteleWatchlist,
  getWatchlist,
} from "../../api/ViewerAPI";

// The detail page has Yahoo's raw label; the watchlist stores the readable
// one the markets list writes, so match those.
const ASSET_TYPES = {
  EQUITY:         "Stock",
  ETF:            "ETF",
  MUTUALFUND:     "ETF",
  CRYPTOCURRENCY: "Crypto",
};

// The watchlist and compare buttons on an asset's detail page. There is no
// "is this one saved" endpoint, so the watchlist is read once and searched.
export default function AssetActions({ symbol, name, type }) {
  const [saved, setSaved] = useState(null); // null until the check finishes
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    getWatchlist()
      .then((list) => {
        if (cancelled) return;

        setSaved(
          Array.isArray(list) &&
            list.some(
              (item) =>
                String(item.symbol).toUpperCase() === symbol.toUpperCase()
            )
        );
      })
      .catch(() => {
        if (!cancelled) setSaved(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const toggle = async () => {
    setBusy(true);
    setErrorMessage("");

    try {
      if (saved) {
        await deteleWatchlist(symbol);
        setSaved(false);
      } else {
        await addStockToWatchlist({
          symbol,
          securityName: name || symbol,
          type: ASSET_TYPES[type] || type || "Stock",
        });

        setSaved(true);
      }
    } catch (error) {
      console.error("Could not update the watchlist:", error);

      setErrorMessage(
        saved
          ? "Could not remove this asset."
          : "Could not add this asset."
      );
    } finally {
      setBusy(false);
    }
  };

  const label = () => {
    if (saved === null) return "Checking...";
    if (busy) return "Saving...";
    return saved ? "★ Remove from watchlist" : "☆ Add to watchlist";
  };

  return (
    <div className="asset-actions">
      <button
        type="button"
        className={saved ? "outline-button" : "asset-action-save"}
        disabled={busy || saved === null}
        onClick={toggle}
      >
        {label()}
      </button>

      {/* Lands on the compare screen with this asset already in slot A */}
      <Link
        className="outline-button"
        to={`/compare?a=${encodeURIComponent(symbol)}`}
      >
        Compare
      </Link>

      {errorMessage && (
        <span className="error-message">{errorMessage}</span>
      )}
    </div>
  );
}
