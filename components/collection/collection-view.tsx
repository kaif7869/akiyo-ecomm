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

  const sortedProducts = useMemo(() => sortProducts(products, sort), [products, sort]);

  return (
    <section className="collection-content" aria-labelledby="collection-title">
      <div className="collection-title-row">
        <h1 id="collection-title">The Collection</h1>
      </div>
      <CollectionToolbar
        itemCount={sortedProducts.length}
        sort={sort}
        viewMode={viewMode}
        onSortChange={setSort}
        onViewModeChange={setViewMode}
      />
      <div className={`product-grid ${viewMode === "list" ? "product-grid-list" : ""}`}>
        {sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} viewMode={viewMode} />
        ))}
      </div>
    </section>
  );
}
