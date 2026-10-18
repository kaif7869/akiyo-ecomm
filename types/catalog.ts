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
  | "Life"
  | "Playback"
  | "Pursuit"
  | "Resolve"
  | "Riviera"
  | "Sonder"
  | "Surf"
  | "Unwritten"
  | "Velocity";

export type Product = {
  id: string;
  title: string;
  category: ProductCategory;
  pricePence: number;
  compareAtPence: number;
  artworkImage: string;
  available: boolean;
};

export type SortOption = "featured" | "price-asc" | "price-desc" | "title-asc";
