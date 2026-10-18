"use client";

import { useState } from "react";
import type { SortOption } from "@/types/catalog";

type CollectionToolbarProps = {
  itemCount: number;
  highestPricePence: number;
  sort: SortOption;
  viewMode: "grid" | "list";
  inStockOnly: boolean;
  outOfStockOnly: boolean;
  minPrice: string;
  maxPrice: string;
  onSortChange: (sort: SortOption) => void;
  onViewModeChange: (viewMode: "grid" | "list") => void;
  onInStockChange: (checked: boolean) => void;
  onOutOfStockChange: (checked: boolean) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
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
  highestPricePence,
  sort,
  viewMode,
  inStockOnly,
  outOfStockOnly,
  minPrice,
  maxPrice,
  onSortChange,
  onViewModeChange,
  onInStockChange,
  onOutOfStockChange,
  onMinPriceChange,
  onMaxPriceChange,
}: CollectionToolbarProps) {
  const [openFilter, setOpenFilter] = useState<"availability" | "price" | null>(null);

  return (
    <div className="collection-toolbar">
      <div className="filter-group" aria-label="Collection filters">
        <div className="collection-filter">
          <button
            type="button"
            aria-expanded={openFilter === "availability"}
            onClick={() => setOpenFilter(openFilter === "availability" ? null : "availability")}
          >
            Availability <ChevronIcon />
          </button>
          {openFilter === "availability" && (
            <div className="collection-filter-menu collection-filter-menu--availability">
              <label>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => onInStockChange(event.target.checked)}
                />
                In stock
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={outOfStockOnly}
                  onChange={(event) => onOutOfStockChange(event.target.checked)}
                />
                Out of stock
              </label>
            </div>
          )}
        </div>
        <div className="collection-filter">
          <button
            type="button"
            aria-expanded={openFilter === "price"}
            onClick={() => setOpenFilter(openFilter === "price" ? null : "price")}
          >
            Price <ChevronIcon />
          </button>
          {openFilter === "price" && (
            <div className="collection-filter-menu collection-filter-menu--price">
              <div className="collection-price-inputs">
                <label>
                  <span>₹</span>
                  <input
                    aria-label="Minimum price"
                    type="number"
                    min="0"
                    step="1"
                    value={minPrice}
                    onChange={(event) => onMinPriceChange(event.target.value)}
                  />
                </label>
                <span>to</span>
                <label>
                  <span>₹</span>
                  <input
                    aria-label="Maximum price"
                    type="number"
                    min="0"
                    step="1"
                    value={maxPrice}
                    onChange={(event) => onMaxPriceChange(event.target.value)}
                  />
                </label>
              </div>
              <p>The highest price is ₹{(highestPricePence / 100).toFixed(2)}</p>
            </div>
          )}
        </div>
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
