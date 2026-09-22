import type { Metadata } from "next";
import { CollectionView } from "@/components/collection/collection-view";
import { SiteHeader } from "@/components/layout/site-header";
import { products } from "@/data/products";

export const metadata: Metadata = {
  title: "The Collection | Akiyo",
  description: "Browse Akiyo desktop and mobile wallpaper collections.",
};

export default function CollectionPage() {
  return (
    <main className="collection-page">
      <SiteHeader activePage="catalog" variant="solid" />
      <CollectionView products={products} />
    </main>
  );
}
