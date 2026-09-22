"use client";

import { useRef } from "react";
import Link from "next/link";
import { products } from "@/data/products";
import { ProductCard } from "@/components/collection/product-card";

export function BundleSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const distance = 360;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  return (
    <section className="akiyo-bundles-section">
      <div className="akiyo-bundles-header">
        <div className="akiyo-bundles-title-row">
          <h2>Collection Bundles</h2>
          <Link href="/collection" className="akiyo-bundles-view-all">
            View all
          </Link>
        </div>

        <div className="akiyo-bundles-arrows">
          <button
            type="button"
            className="akiyo-arrow-btn"
            onClick={() => scroll("left")}
            aria-label="Previous products"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M15.75 10H4.25m0 0l5-5m-5 5l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="akiyo-arrow-btn"
            onClick={() => scroll("right")}
            aria-label="Next products"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M4.25 10h11.5m0 0l-5-5m5 5l-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="akiyo-bundles-track">
        {products.map((product) => (
          <div key={product.id} className="akiyo-bundle-card-wrap">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
