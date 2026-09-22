"use client";

import type { SortOption } from "@/types/catalog";

type CollectionToolbarProps = {
  itemCount: number;
  sort: SortOption;
  viewMode: "grid" | "list";
  onSortChange: (sort: SortOption) => void;
  onViewModeChange: (viewMode: "grid" | "list") => void;
};

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="12" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="12" width="5" height="5" rx="1" />
      <rect x="12" y="12" width="5" height="5" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="4" cy="5" r="1.2" />
      <circle cx="4" cy="10" r="1.2" />
      <circle cx="4" cy="15" r="1.2" />
      <path d="M8 5h8M8 10h8M8 15h8" />
    </svg>
  );
}

export function CollectionToolbar({
  itemCount,
  sort,
  viewMode,
  onSortChange,
  onViewModeChange,
}: CollectionToolbarProps) {
  return (
    <div className="collection-toolbar">
      <div className="filter-group" aria-label="Collection filters">
        <button type="button">
          Availability <ChevronIcon />
        </button>
        <button type="button">
          Price <ChevronIcon />
        </button>
      </div>

      <div className="toolbar-actions">
        <span>{itemCount} items</span>
        <label className="sort-select">
          Sort
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
            <option value="title-asc">Alphabetically, A-Z</option>
          </select>
        </label>
        <div className="view-toggle" aria-label="Product view">
          <button
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            className={viewMode === "grid" ? "selected" : ""}
            type="button"
            onClick={() => onViewModeChange("grid")}
          >
            <GridIcon />
          </button>
          <button
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            className={viewMode === "list" ? "selected" : ""}
            type="button"
            onClick={() => onViewModeChange("list")}
          >
            <ListIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
