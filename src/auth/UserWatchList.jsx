import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getWatchlist,
  deteleWatchlist,
} from "../api/ViewerAPI";


import AssetPrice from "../features/browse/AssetPrice";
import { useWatchlistTools } from "../features/browse/useWatchlistTools";

export default function UserWatchList({
  limit = 0,
  compact = false,
}) {
  const navigate = useNavigate();

  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadWatchlist();
  }, []);

  async function loadWatchlist() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await getWatchlist();

      setWatchlist(
        Array.isArray(response) ? response : []
      );
    } catch (error) {
      console.error(
        "Could not load watchlist:",
        error
      );

      setErrorMessage(
        "Could not load your watchlist."
      );
    } finally {
      setLoading(false);
    }
  }

  function openAssetDetails(symbol) {
  const returnTo = compact
    ? "/dashboard"
    : "/watchlist";

  navigate(`/stock/${symbol}`, {
    state: {
      returnTo,
    },
  });
}

  async function removeAsset(event, symbol) {
    event.stopPropagation();

    try {
      await deteleWatchlist(symbol);

      setWatchlist((previousAssets) =>
        previousAssets.filter(
          (asset) => asset.symbol !== symbol
        )
      );
    } catch (error) {
      console.error(
        "Could not remove asset:",
        error
      );

      setErrorMessage(
        "Could not remove this asset."
      );
    }
  }


  const { toolbar, visible, prices } = useWatchlistTools(watchlist);

  const displayedAssets =
    limit > 0
      ? watchlist.slice(0, limit)
      : visible;

  if (loading) {
    return (
      <div className="watchlist-message">
        Loading watchlist...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="watchlist-message error-message">
        {errorMessage}
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="watchlist-message">
        Add stocks, ETFs, or crypto assets from Explore Markets.
      </div>
    );
  }

  return (
    <>
    {limit === 0 && toolbar}

    <div
      className={
        compact
          ? "watchlist-list compact"
          : "watchlist-list"
      }
    >
      {displayedAssets.map((asset) => (
        <article
          key={asset.symbol}
          className="watchlist-item"
          onClick={() =>
            openAssetDetails(asset.symbol)
          }
        >
          <div className="watchlist-item-information">
            <strong>
              {asset.symbol}
            </strong>

            <span>
              {asset.securityName || "Asset"}
            </span>

            <small>
              {asset.type || "Asset"}
            </small>
          </div>

          <div className="watchlist-item-side">
           

            <div className="watchlist-item-buttons">
              <button
                type="button"
                className="watchlist-detail-button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/price/${asset.symbol}`);
                }}
              >
                Price details
              </button>

              <button
                type="button"
                className="remove-watchlist-button"
                onClick={(event) =>
                  removeAsset(event, asset.symbol)
                }
              >
                Remove
              </button>
            </div>
          </div>
        </article>
      ))}
      {displayedAssets.length === 0 && (
        <p className="watchlist-no-match">
          No asset in your watchlist matches these filters.
        </p>
      )}
    </div>
    </>
  );
}