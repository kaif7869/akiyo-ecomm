"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/types/catalog";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";

type ProductCardProps = {
  product: Product;
  viewMode?: "grid" | "list";
  priority?: boolean;
};

function BagAddIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      width="18"
      height="18"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
        d="M16.608 9.421V6.906H3.392v8.016c0 .567.224 1.112.624 1.513.4.402.941.627 1.506.627H8.63M8.818 3h2.333c.618 0 1.212.247 1.649.686a2.35 2.35 0 0 1 .683 1.658v1.562H6.486V5.344c0-.622.246-1.218.683-1.658A2.33 2.33 0 0 1 8.82 3"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
        d="M14.608 12.563v5m2.5-2.5h-5"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      width="18"
      height="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="8" stroke="#16a34a" strokeWidth="1.5" />
      <path
        d="M7 10.5l2 2 4.5-4.5"
        stroke="#16a34a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProductCard({
  product,
  viewMode = "grid",
  priority = false,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article
      className={`akiyo-product-card ${
        viewMode === "list" ? "akiyo-product-card--list" : ""
      }`}
    >
      <div className="akiyo-product-card__media-wrapper">
        <Link
          href="/collection"
          className="akiyo-product-card__image-link"
          aria-label={product.title}
        >
          <span className="akiyo-product-card__sale-badge">
            ₹{Math.round((product.compareAtPence - product.pricePence) / 100)} OFF
          </span>
          <div className="akiyo-product-card__image-container">
            <Image
              src={product.artworkImage}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={priority}
              className="akiyo-product-card__image"
            />
          </div>
        </Link>

        {/* Floating Quick Add Button (appears on card hover) */}
        <button
          type="button"
          className={`akiyo-product-card__quick-add ${
            justAdded ? "is-added" : ""
          }`}
          onClick={handleQuickAdd}
          aria-label={`Add ${product.title} to cart`}
          title={`Add ${product.title} to cart`}
        >
          {justAdded ? <CheckIcon /> : <BagAddIcon />}
        </button>
      </div>

      <div className="akiyo-product-card__info">
        <h3 className="akiyo-product-card__title">
          <Link href="/collection">{product.title.toUpperCase()}</Link>
        </h3>
        <p className="akiyo-product-card__prices">
          <span className="akiyo-product-card__sale-price">
            {formatPrice(product.pricePence)}
          </span>
          <span className="akiyo-product-card__compare-price">
            {formatPrice(product.compareAtPence)}
          </span>
          <span className="akiyo-product-card__discount-pill">
            SAVE ₹{Math.round((product.compareAtPence - product.pricePence) / 100)}
          </span>
        </p>
      </div>
    </article>
  );
}
