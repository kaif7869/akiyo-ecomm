"use client";

import { useMemo, useState } from "react";
import type { Product, SortOption } from "@/types/catalog";
import { sortProducts } from "@/lib/catalog";
import { CollectionToolbar } from "@/components/collection/collection-toolbar";
import { ProductCard } from "@/components/collection/product-card";

type CollectionViewProps = {
  products: Product[];
};

export function CollectionView({ products }: CollectionViewProps) {
  const [sort, setSort] = useState<SortOption>("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const highestPricePence = Math.max(...products.map((product) => product.pricePence));
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState(
    String(Math.ceil(highestPricePence / 100))
  );

  const sortedProducts = useMemo(() => {
    const minimumPence = minPrice === "" ? 0 : Number(minPrice) * 100;
    const maximumPence = maxPrice === "" ? Infinity : Number(maxPrice) * 100;
    const filteredProducts = products.filter((product) => {
      const matchesAvailability =
        (!inStockOnly && !outOfStockOnly) ||
        (inStockOnly && product.available) ||
        (outOfStockOnly && !product.available);
      return (
        matchesAvailability &&
        product.pricePence >= minimumPence &&
        product.pricePence <= maximumPence
      );
    });
    return sortProducts(filteredProducts, sort);
  }, [products, sort, inStockOnly, outOfStockOnly, minPrice, maxPrice]);

  return (
    <section className="collection-content" aria-labelledby="collection-title">
      <div className="collection-title-row">
        <h1 id="collection-title">The Collection</h1>
      </div>
      <CollectionToolbar
        itemCount={sortedProducts.length}
        highestPricePence={highestPricePence}
        sort={sort}
        viewMode={viewMode}
        inStockOnly={inStockOnly}
        outOfStockOnly={outOfStockOnly}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onSortChange={setSort}
        onViewModeChange={setViewMode}
        onInStockChange={setInStockOnly}
        onOutOfStockChange={setOutOfStockOnly}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
      />
      <div className={`product-grid ${viewMode === "list" ? "product-grid-list" : ""}`}>
        {sortedProducts.length > 0 ? (
          sortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} viewMode={viewMode} />
          ))
        ) : (
          <p className="collection-empty-state">No products match these filters.</p>
        )}
      </div>
    </section>
  );
}
