import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  addStockToWatchlist,
  getStocks,
  getCrypto,
  getETF,
} from "../api/ViewerAPI";


function getResponseData(response) {
  return response?.data ?? response;
}


function getAssetList(response) {
  const data = getResponseData(response);

  if (Array.isArray(data)) {
    return data;
  }

  const possibleLists = [
    data?.assets,
    data?.data,
    data?.results,
    data?.items,
    data?.stocks,
    data?.crypto,
    data?.etfs,
    data?.content,
  ];

  return (
    possibleLists.find((list) => Array.isArray(list)) || []
  );
}


function getSymbol(asset) {
  return (
    asset?.symbol ||
    asset?.Symbol ||
    asset?.ticker ||
    asset?.Ticker ||
    asset?.code ||
    ""
  );
}


function getName(asset) {
  return (
    asset?.name ||
    asset?.Name ||
    asset?.companyName ||
    asset?.company_name ||
    asset?.securityName ||
    asset?.longName ||
    asset?.shortName ||
    asset?.displayName ||
    asset?.description ||
    getSymbol(asset) ||
    "Asset"
  );
}


function getAssetType(asset, defaultType) {
  return (
    asset?.type ||
    asset?.assetType ||
    asset?.asset_type ||
    asset?.category ||
    defaultType
  );
}


function formatAsset(asset, defaultType) {
  return {
    ...asset,
    symbol: getSymbol(asset).toUpperCase(),
    name: getName(asset),
    type: getAssetType(asset, defaultType),
  };
}


function removeDuplicates(assetList) {
  const uniqueAssets = new Map();

  assetList.forEach((asset) => {
    if (asset.symbol) {
      uniqueAssets.set(
        asset.symbol.toUpperCase(),
        asset
      );
    }
  });

  return Array.from(uniqueAssets.values());
}


export default function Stocks() {

  const [assets, setAssets] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedType, setSelectedType] =
    useState("Stock");

  const [sortOrder, setSortOrder] =
    useState("az");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [watchlistMessage, setWatchlistMessage] =
    useState("");

  const [addingSymbol, setAddingSymbol] =
    useState("");

  const [addedSymbols, setAddedSymbols] =
    useState(new Set());


  useEffect(() => {

    if (searchTerm.trim() === "") {
      setAssets([]);
      setLoading(false);
      return;
    }

    loadAssets();

  }, [searchTerm, selectedType]);


  async function loadAssets() {

    try {

      setLoading(true);
      setErrorMessage("");

      let response;
      let assetType;

      if (selectedType === "Stock") {

        response = await getStocks(
          searchTerm.trim()
        );

        assetType = "Stock";

      } else if (selectedType === "Crypto") {

        response = await getCrypto(
          searchTerm.trim()
        );

        assetType = "Crypto";

      } else if (selectedType === "ETF") {

        response = await getETF(
          searchTerm.trim()
        );

        assetType = "ETF";
      }


      const assetList = getAssetList(response);

      const formattedAssets = assetList.map(
        (asset) =>
          formatAsset(asset, assetType)
      );


      setAssets(
        removeDuplicates(formattedAssets)
      );

    } catch (error) {

      console.error(
        "Could not load assets:",
        error
      );

      setAssets([]);

      setErrorMessage(
        "Could not load the available assets."
      );

    } finally {

      setLoading(false);

    }
  }


  async function addToWatchlist(event, asset) {

    event.preventDefault();
    event.stopPropagation();

    const symbol =
      asset.symbol.toUpperCase();


    if (addedSymbols.has(symbol)) {
      return;
    }


    try {

      setAddingSymbol(symbol);

      setErrorMessage("");
      setWatchlistMessage("");


      await addStockToWatchlist({

        symbol,

        securityName:
          asset.name,

        type:
          asset.type,

      });


      setAddedSymbols(
        (previousSymbols) => {

          const updatedSymbols =
            new Set(previousSymbols);

          updatedSymbols.add(symbol);

          return updatedSymbols;
        }
      );


      setWatchlistMessage(
        `${symbol} was added to your watchlist.`
      );


    } catch (error) {

      console.error(
        "Could not add asset to watchlist:",
        error
      );


      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data;


      if (
        typeof backendMessage === "string"
      ) {

        setErrorMessage(
          backendMessage
        );

      } else {

        setErrorMessage(
          `Could not add ${symbol} to your watchlist.`
        );

      }

    } finally {

      setAddingSymbol("");

    }
  }


  const visibleAssets = [...assets].sort(
    (firstAsset, secondAsset) => {

      const firstValue =
        firstAsset.symbol.toLowerCase();

      const secondValue =
        secondAsset.symbol.toLowerCase();


      if (sortOrder === "za") {

        return secondValue.localeCompare(
          firstValue
        );

      }

      return firstValue.localeCompare(
        secondValue
      );
    }
  );


  return (

    <main className="stocks-page">

      <p className="eyebrow">
        EXPLORE MARKETS
      </p>


      <h1>
        Explore assets
      </h1>


      <p className="stocks-intro">
        Browse stocks, ETFs, and crypto assets.
      </p>


      <section className="asset-search-panel">

        <div className="asset-search-wrapper">

          <span className="asset-search-icon">
            ⌕
          </span>


          <input
            className="asset-search-input"
            type="search"
            placeholder="Search by symbol or name..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
          />

        </div>


        <select
          className="asset-type-select"
          value={selectedType}
          onChange={(event) =>
            setSelectedType(
              event.target.value
            )
          }
        >

          <option value="Stock">
            Stocks
          </option>

          <option value="ETF">
            ETFs
          </option>

          <option value="Crypto">
            Crypto
          </option>

        </select>


        <select
          className="asset-type-select"
          value={sortOrder}
          onChange={(event) =>
            setSortOrder(
              event.target.value
            )
          }
        >

          <option value="az">
            A to Z
          </option>

          <option value="za">
            Z to A
          </option>

        </select>

      </section>


      {watchlistMessage && (

        <p className="success-message">
          {watchlistMessage}
        </p>

      )}


      {errorMessage && (

        <p className="error-message">
          {errorMessage}
        </p>

      )}


      {loading ? (

        <section className="asset-empty-state">

          <div className="asset-loading-spinner" />

          <p>
            Searching...
          </p>

        </section>

      ) : visibleAssets.length === 0 ? (

        <section className="asset-empty-state">

          <h2>
            {searchTerm.trim()
              ? "No assets found"
              : "Search for an asset"}
          </h2>

          <p>
            {searchTerm.trim()
              ? "Try another search or select a different category."
              : "Enter a symbol or asset name above."}
          </p>

        </section>

      ) : (

        <section className="asset-list">

          {visibleAssets.map((asset) => {

            const symbol =
              asset.symbol.toUpperCase();

            const isAdding =
              addingSymbol === symbol;

            const isAdded =
              addedSymbols.has(symbol);


            return (

              <article
                key={`${symbol}-${asset.name}`}
                className="asset-list-item"
              >

                <Link
                  to={`/stock/${encodeURIComponent(
                    symbol
                  )}`}
                  className="asset-list-main"
                >

                  <strong className="asset-list-symbol">
                    {symbol}
                  </strong>


                  <div className="asset-list-details">

                    <h3>
                      {asset.name}
                    </h3>

                    <span>
                      {asset.type}
                    </span>

                  </div>

                </Link>


                <button
                  type="button"
                  className={
                    isAdded
                      ? "watchlist-add-button added"
                      : "watchlist-add-button"
                  }
                  disabled={
                    isAdding ||
                    isAdded
                  }
                  onClick={(event) =>
                    addToWatchlist(
                      event,
                      asset
                    )
                  }
                >

                  {isAdding
                    ? "Adding..."
                    : isAdded
                    ? "Added"
                    : "Add to watchlist"}

                </button>

              </article>

            );
          })}

        </section>

      )}

    </main>

  );
}