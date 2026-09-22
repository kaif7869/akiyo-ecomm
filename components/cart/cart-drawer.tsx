"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/catalog";
import { PhonePeCheckoutModal } from "./phonepe-checkout-modal";

export function CartDrawer() {
  const {
    items,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    totalCount,
    subtotalFormatted,
  } = useCart();

  const [isPhonePeOpen, setIsPhonePeOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen, closeCart]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div className="cart-drawer-overlay" onClick={closeCart}>
      <div
        className="cart-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Your Cart"
      >
        {/* Drawer Header */}
        <div className="cart-drawer-header">
          <h2>Cart ({totalCount})</h2>
          <button
            type="button"
            className="cart-drawer-close"
            onClick={closeCart}
            aria-label="Close cart"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Free instant digital delivery banner */}
        <div className="cart-drawer-banner">
          <span>⚡ Instant digital download available immediately after checkout</span>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <h3>Your cart is empty</h3>
            <p>
              Have an account?{" "}
              <Link href="/contact" onClick={closeCart}>
                Log in
              </Link>{" "}
              to check out faster.
            </p>
            <button
              type="button"
              className="cart-drawer-continue-btn"
              onClick={closeCart}
            >
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="cart-drawer-item">
                  <div className="cart-drawer-item__image">
                    <Image
                      src={product.artworkImage}
                      alt={product.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="cart-drawer-item__details">
                    <div className="cart-drawer-item__header">
                      <h4>{product.title}</h4>
                      <button
                        type="button"
                        className="cart-drawer-item__remove"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`Remove ${product.title}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="cart-drawer-item__price">
                      {formatPrice(product.pricePence)}
                    </p>
                    <div className="cart-drawer-item__quantity">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="cart-drawer-footer">
              {/* Promotional Ad Savings Banner */}
              {(() => {
                const totalMrp = items.reduce(
                  (sum, item) =>
                    sum + item.product.compareAtPence * item.quantity,
                  0
                );
                const totalCurrent = items.reduce(
                  (sum, item) => sum + item.product.pricePence * item.quantity,
                  0
                );
                const totalSavings = Math.max(0, totalMrp - totalCurrent);
                return (
                  totalSavings > 0 && (
                    <div className="cart-drawer-savings-alert">
                      <span>🎉 Ad Deal Applied</span>
                      <strong>
                        You save {formatPrice(totalSavings)} (Flat ₹69-₹79 OFF)
                      </strong>
                    </div>
                  )
                );
              })()}

              <div className="cart-drawer-subtotal">
                <span>Total Payable</span>
                <span className="cart-drawer-subtotal-price">
                  {subtotalFormatted}
                </span>
              </div>
              <p className="cart-drawer-tax-note">
                ⚡ Instant 4K Ultra-HD digital download link sent via email after payment.
              </p>
              <button
                type="button"
                className="cart-drawer-checkout-btn phonepe-checkout-trigger"
                onClick={() => setIsPhonePeOpen(true)}
              >
                <span>Pay {subtotalFormatted} with PhonePe / UPI</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* PhonePe Checkout Modal */}
      <PhonePeCheckoutModal
        isOpen={isPhonePeOpen}
        onClose={() => setIsPhonePeOpen(false)}
      />
    </div>
  );
}
