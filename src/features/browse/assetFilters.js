// Filtering and sorting shared by the markets list and the watchlist, so
// both screens behave the same way.

export const TYPES = [
  { value: "all",    label: "All assets" },
  { value: "stocks", label: "Stocks" },
  { value: "etfs",   label: "ETFs" },
  { value: "crypto", label: "Crypto" },
];

// The markets list holds a few hundred assets and there is no endpoint
// that prices them in one call, so it only offers the name sorts.
export const NAME_SORTS = [
  { value: "az", label: "Symbol A–Z" },
  { value: "za", label: "Symbol Z–A" },
];

export const PRICE_SORTS = [
  { value: "price-asc",  label: "Price low to high" },
  { value: "price-desc", label: "Price high to low" },
];

export const ALL_SORTS = [...NAME_SORTS, ...PRICE_SORTS];

// The backend labels types inconsistently between tables, so match on
// words rather than on an exact value.
const TYPE_WORDS = {
  stocks: ["stock", "equity", "share"],
  etfs:   ["etf", "exchange"],
  crypto: ["crypto", "coin", "digital"],
};

export function matchesType(assetType, selected) {
  if (selected === "all") return true;

  const type = String(assetType || "").toLowerCase();
  return (TYPE_WORDS[selected] || []).some((word) => type.includes(word));
}

export function matchesSearch(symbol, name, search) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return (
    String(symbol || "").toLowerCase().includes(query) ||
    String(name   || "").toLowerCase().includes(query)
  );
}

// priceOf is only consulted by the price sorts. An asset whose price has
// not arrived goes to the end rather than being treated as worth nothing.
export function sortAssets(list, mode, priceOf = () => null) {
  const sorted = [...list];

  if (mode === "price-asc" || mode === "price-desc") {
    const direction = mode === "price-asc" ? 1 : -1;

    return sorted.sort((first, second) => {
      const a = priceOf(first);
      const b = priceOf(second);

      if (a == null && b == null) return 0;
      if (a == null) return 1;
      if (b == null) return -1;

      return (a - b) * direction;
    });
  }

  const direction = mode === "za" ? -1 : 1;

  return sorted.sort(
    (first, second) =>
      String(first.symbol).localeCompare(String(second.symbol), undefined, {
        sensitivity: "base",
      }) * direction
  );
}
