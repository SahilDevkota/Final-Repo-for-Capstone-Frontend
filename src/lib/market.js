import {
  getStocks,
  getCrypto,
  getETF,
  getData,
} from "../api/ViewerAPI";

import privateAPI from "../api/privateAPI";

// Yahoo labels crypto venues "CCC", which means nothing to a reader
const EXCHANGES = {
  CCC: "Crypto",
};

const ASSET_TYPES = {
  EQUITY: "Stock",
  ETF: "ETF",
  MUTUALFUND: "ETF",
  CRYPTOCURRENCY: "Crypto",
};

export function parseQuote(payload, symbol) {
  const result = payload?.chart?.result?.[0];

  if (!result) return null;

  const meta = result.meta || {};
  const exchange =
    meta.fullExchangeName ||
    meta.exchangeName ||
    "";

  const price =
    meta.regularMarketPrice ?? null;

  const previous =
    meta.chartPreviousClose ?? null;

  const timestamps =
    result.timestamp || [];

  const closes =
    result.indicators?.quote?.[0]?.close || [];

  return {
    symbol,

    name:
      meta.longName ||
      meta.shortName ||
      symbol,

    type:
      ASSET_TYPES[meta.instrumentType] ||
      "Stock",

    market:
      EXCHANGES[exchange] ||
      exchange ||
      "—",

    price,

    changePercent:
      price !== null &&
      previous
        ? ((price - previous) / previous) * 100
        : null,

    history: timestamps
      .map((ts, i) => ({
        recordedAt: new Date(
          ts * 1000
        ).toISOString(),

        price: closes[i],
      }))
      .filter(
        (point) =>
          typeof point.price === "number"
      ),
  };
}

export async function fetchQuote(symbol) {
  try {
    return parseQuote(
      await getData(symbol),
      symbol
    );
  } catch {
    return null;
  }
}

// Search stocks, crypto and ETFs
async function searchEveryTable(query) {
  const results = await Promise.allSettled([
    getStocks(query),
    getCrypto(query),
    getETF(query),
  ]);

  const tables = [
    "Stock",
    "Crypto",
    "ETF",
  ];

  const found = [];

  results.forEach((result, i) => {
    if (
      result.status !== "fulfilled" ||
      !Array.isArray(result.value)
    ) {
      return;
    }

    result.value.forEach((row) => {
      const name =
        row.securityName ||
        row.symbol;

      found.push({
        symbol: row.symbol,
        name,
        type: /\bETF\b/i.test(name)
          ? "ETF"
          : tables[i],
      });
    });
  });

  return found;
}

export async function searchAssets(query) {
  const q = query.trim();

  if (!q) return [];

  return (
    await searchEveryTable(q)
  ).slice(0, 8);
}

// Gets comparison data from Spring Boot
// GET /market/asset/{symbol}?range=1mo
export async function fetchCompareAsset(
  symbol,
  range = "1mo"
) {
  const response = await privateAPI.get(
    `/market/asset/${encodeURIComponent(
      symbol
    )}?range=${range}`
  );

  return response.data;
}

export async function suggestByType(
  type,
  query = ""
) {
  try {
    const found =
      await searchEveryTable(
        query.trim()
      );

    return found
      .filter(
        (asset) => asset.type === type
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}