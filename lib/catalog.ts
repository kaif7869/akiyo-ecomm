import type { Product, SortOption } from "@/types/catalog";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  style: "currency",
  maximumFractionDigits: 0,
});

export function formatPrice(pricePence: number) {
  return currencyFormatter.format(pricePence / 100);
}

export function getSavingsAmount(product: Product) {
  return formatPrice(product.compareAtPence - product.pricePence);
}

export function getSalePercent(product: Product) {
  return Math.round(
    ((product.compareAtPence - product.pricePence) / product.compareAtPence) * 100,
  );
}

export function sortProducts(products: Product[], sort: SortOption) {
  return [...products].sort((first, second) => {
    if (sort === "price-asc") {
      return first.pricePence - second.pricePence;
    }

    if (sort === "price-desc") {
      return second.pricePence - first.pricePence;
    }

    if (sort === "title-asc") {
      return first.title.localeCompare(second.title);
    }

    return 0;
  });
}
