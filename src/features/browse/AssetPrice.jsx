// undefined means the price is still on its way, null means it could not
// be read; the two should not look the same.
export default function AssetPrice({ value }) {
  if (value === undefined) {
    return <span className="asset-price asset-price-waiting">···</span>;
  }

  if (value === null) {
    return <span className="asset-price asset-price-waiting">—</span>;
  }

  return <span className="asset-price">${Number(value).toFixed(2)}</span>;
}
