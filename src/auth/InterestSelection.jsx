import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getStocks,
  getCrypto,
  getETF,
  addStockToWatchlist,
} from "../api/ViewerAPI";

const assetTypes = [
  {
    value: "Stock",
    title: "Stocks",
    description: "Companies and equity markets",
    icon: "↗",
  },
  {
    value: "Crypto",
    title: "Crypto",
    description: "Digital assets and blockchain",
    icon: "₿",
  },
  {
    value: "ETF",
    title: "ETFs",
    description: "Diversified market funds",
    icon: "▦",
  },
];

export default function InterestSelection() {
  const navigate = useNavigate();

  const [interestType, setInterestType] = useState("Stock");
  const [searchTerm, setSearchTerm] = useState("");
  const [assets, setAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const trimmedSearch = searchTerm.trim();

    if (!trimmedSearch) {
      setAssets([]);
      setErrorMessage("");
      return;
    }

    const timeoutId = setTimeout(() => {
      searchAssets(trimmedSearch);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, interestType]);

  async function searchAssets(query) {
    try {
      setLoading(true);
      setErrorMessage("");

      let response;

      if (interestType === "Stock") {
        response = await getStocks(query);
      } else if (interestType === "Crypto") {
        response = await getCrypto(query);
      } else if (interestType === "ETF") {
        response = await getETF(query);
      }

      const responseData = response?.data || response;

      if (Array.isArray(responseData)) {
        setAssets(responseData);
      } else {
        setAssets([]);
      }
    } catch (error) {
      console.error("Could not search assets:", error);
      setAssets([]);
      setErrorMessage("Could not search for assets.");
    } finally {
      setLoading(false);
    }
  }

  function getSymbol(asset) {
    return (
      asset?.symbol ||
      asset?.Symbol ||
      asset?.ticker ||
      asset?.Ticker ||
      ""
    ).toUpperCase();
  }

  function getAssetName(asset) {
    return (
      asset?.securityName ||
      asset?.name ||
      asset?.Name ||
      asset?.companyName ||
      asset?.longName ||
      getSymbol(asset) ||
      "Asset"
    );
  }

  function selectAsset(asset) {
    const symbol = getSymbol(asset);
    const name = getAssetName(asset);

    if (!symbol) {
      return;
    }

    const alreadySelected = selectedAssets.some(
      (selectedAsset) => selectedAsset.symbol === symbol
    );

    if (alreadySelected) {
      setSelectedAssets((previousAssets) =>
        previousAssets.filter(
          (selectedAsset) => selectedAsset.symbol !== symbol
        )
      );

      return;
    }

    setSelectedAssets((previousAssets) => [
      ...previousAssets,
      {
        symbol,
        securityName: name,
        type: interestType,
      },
    ]);
  }

  function isSelected(asset) {
    const symbol = getSymbol(asset);

    return selectedAssets.some(
      (selectedAsset) => selectedAsset.symbol === symbol
    );
  }

  function removeSelectedAsset(symbol) {
    setSelectedAssets((previousAssets) =>
      previousAssets.filter((asset) => asset.symbol !== symbol)
    );
  }

  function changeInterestType(type) {
    setInterestType(type);
    setSearchTerm("");
    setAssets([]);
    setErrorMessage("");
  }

  async function saveSelectedAssets() {
    if (selectedAssets.length === 0) {
      navigateToTutorial();
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      for (const asset of selectedAssets) {
        await addStockToWatchlist(asset);
      }

      navigateToTutorial();
    } catch (error) {
      console.error("Could not save selected assets:", error);

      setErrorMessage(
        "Some assets could not be added to your watchlist."
      );
    } finally {
      setSaving(false);
    }
  }

  function navigateToTutorial() {
    localStorage.setItem("showTutorial", "true");
    navigate("/dashboard");
  }

  const progress = Math.min(selectedAssets.length * 33.33, 100);

  return (
    <main className="interests-page">
      <section className="interests-hero">
        <div className="interests-hero-content">
          <p className="eyebrow">Personalise your markets</p>

          <h1>Choose what you want to follow.</h1>

          <p>
            Search for stocks, crypto, or ETFs that interest you. We will
            use your choices to personalise your dashboard.
          </p>
        </div>

        <div className="interests-hero-mark" aria-hidden="true">
          ◎
        </div>
      </section>

      <section className="interests-progress-card">
        <div className="interests-progress-copy">
          <span>Your selections</span>

          <strong>
            {selectedAssets.length}{" "}
            {selectedAssets.length === 1 ? "asset" : "assets"} selected
          </strong>
        </div>

        <div className="interests-progress">
          <div
            className="interests-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="interests-progress-help">
          Select at least three assets for a more useful dashboard.
        </p>
      </section>

      <section className="interests-section">
        <div className="interests-section-header">
          <div>
            <p className="eyebrow">Step one</p>
            <h2>Choose an asset type</h2>
            <p>
              Start by choosing the type of asset you want to explore.
            </p>
          </div>

          <span className="interests-section-count">
            {selectedAssets.length} selected
          </span>
        </div>

        <div className="interest-type-buttons">
          {assetTypes.map((type) => {
            const isActive = interestType === type.value;

            return (
              <button
                key={type.value}
                type="button"
                className={`interest-type-button ${
                  isActive ? "interest-type-button-active" : ""
                }`}
                onClick={() => changeInterestType(type.value)}
              >
                <span className="interest-type-icon">
                  {type.icon}
                </span>

                <span className="interest-type-content">
                  <strong>{type.title}</strong>
                  <small>{type.description}</small>
                </span>

                {isActive && (
                  <span className="interest-type-selected">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="interest-search-area">
          <p className="eyebrow">Step two</p>

          <h2>Search for an asset</h2>

          <p className="interest-search-description">
            Type a company name or symbol below. For example, try
            searching for Apple or AAPL.
          </p>

          <div className="interest-search-box">
            <span className="interest-search-icon">⌕</span>

            <input
              type="search"
              value={searchTerm}
              placeholder={`Search ${interestType.toLowerCase()}...`}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
            />

            {searchTerm && (
              <button
                type="button"
                className="interest-search-clear"
                onClick={() => {
                  setSearchTerm("");
                  setAssets([]);
                }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="interest-status">
            <span className="interest-spinner" />
            Searching for assets...
          </div>
        )}

        {errorMessage && (
          <div className="error-message">{errorMessage}</div>
        )}

        {!loading &&
          !errorMessage &&
          searchTerm.trim() &&
          assets.length === 0 && (
            <div className="interest-status">
              No assets found. Try another search term.
            </div>
          )}

        {assets.length > 0 && (
          <div className="interest-search-results">
            <div className="interest-results-heading">
              <div>
                <h3>Search results</h3>
                <p>Click an asset to add or remove it.</p>
              </div>

              <span>{assets.length} found</span>
            </div>

            <div className="interest-results-list">
              {assets.map((asset, index) => {
                const symbol = getSymbol(asset);
                const name = getAssetName(asset);
                const selected = isSelected(asset);

                return (
                  <button
                    key={`${symbol}-${index}`}
                    type="button"
                    className={`interest-result ${
                      selected ? "interest-result-selected" : ""
                    }`}
                    onClick={() => selectAsset(asset)}
                  >
                    <span className="interest-result-symbol">
                      {symbol || "N/A"}
                    </span>

                    <span className="interest-result-name">
                      {name}
                    </span>

                    <span className="interest-result-action">
                      {selected ? "Added ✓" : "Add"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedAssets.length > 0 && (
          <div className="selected-assets-section">
            <div className="selected-assets-heading">
              <div>
                <p className="eyebrow">Step three</p>
                <h2>Your selected assets</h2>
                <p>
                  These assets will be added to your watchlist.
                </p>
              </div>

              <span>{selectedAssets.length}</span>
            </div>

            <div className="selected-assets-list">
              {selectedAssets.map((asset) => (
                <div
                  key={`${asset.type}-${asset.symbol}`}
                  className="selected-asset"
                >
                  <div className="selected-asset-info">
                    <strong>{asset.symbol}</strong>
                    <span>{asset.securityName}</span>
                  </div>

                  <div className="selected-asset-actions">
                    <small>{asset.type}</small>

                    <button
                      type="button"
                      onClick={() =>
                        removeSelectedAsset(asset.symbol)
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="interests-actions">
          <button
            type="button"
            className="interests-skip-button"
            onClick={navigateToTutorial}
          >
            Skip for now
          </button>

          <button
            type="button"
            className="interests-save-button"
            onClick={saveSelectedAssets}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save interests"}
          </button>
        </div>
      </section>
    </main>
  );
}