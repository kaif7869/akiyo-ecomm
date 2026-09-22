"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/data/products";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const { addToCart } = useCart();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return products.slice(0, 4);
    }
    const clean = query.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(clean) ||
        p.category.toLowerCase().includes(clean)
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div
        className="search-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search store"
      >
        <div className="search-modal-header">
          <svg
            className="search-modal-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M13.5 13.5L18 18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            className="search-modal-input"
            placeholder="Search wallpapers, collections..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query ? (
            <button
              type="button"
              className="search-modal-clear"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            className="search-modal-close"
            onClick={onClose}
            aria-label="Close search"
          >
            ×
          </button>
        </div>

        <div className="search-modal-body">
          <div className="search-modal-heading">
            <span>{query.trim() ? "Search Results" : "Popular Collections"}</span>
            <span className="search-modal-count">({results.length})</span>
          </div>

          {results.length === 0 ? (
            <div className="search-modal-empty">
              <p>No collections found for &ldquo;{query}&rdquo;.</p>
            </div>
          ) : (
            <div className="search-modal-grid">
              {results.map((product) => (
                <div key={product.id} className="search-modal-card">
                  <Link
                    href="/collection"
                    className="search-modal-card-media"
                    onClick={onClose}
                  >
                    <Image
                      src={product.artworkImage}
                      alt={product.title}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="search-modal-card-info">
                    <h4>
                      <Link href="/collection" onClick={onClose}>
                        {product.title}
                      </Link>
                    </h4>
                    <p className="search-modal-card-price">
                      <span>{formatPrice(product.pricePence)}</span>
                      <em>{formatPrice(product.compareAtPence)}</em>
                      <span className="akiyo-product-card__discount-pill">
                        ₹{Math.round((product.compareAtPence - product.pricePence) / 100)} OFF
                      </span>
                    </p>
                    <button
                      type="button"
                      className="search-modal-card-add"
                      onClick={() => {
                        addToCart(product);
                        onClose();
                      }}
                    >
                      + Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
