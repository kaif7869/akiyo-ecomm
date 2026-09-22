export type ProductCategory =
  | "Custom collection"
  | "Christ"
  | "Construct"
  | "Golf"
  | "Interlude"
  | "Landscape"
  | "Minimal"
  | "Noir"
  | "Wealth"
  | "Passion"
  | "Life";

export type Product = {
  id: string;
  title: string;
  category: ProductCategory;
  pricePence: number;
  compareAtPence: number;
  artworkImage: string;
};

export type SortOption = "featured" | "price-asc" | "price-desc" | "title-asc";
