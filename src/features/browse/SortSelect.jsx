import { NAME_SORTS } from "./assetFilters";

// Sits next to the asset-type filter and borrows its styling, so the two
// dropdowns read as one control group.
export default function SortSelect({ value, onChange, options = NAME_SORTS }) {
  return (
    <select
      className="asset-type-select asset-sort-select"
      aria-label="Sort assets"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
