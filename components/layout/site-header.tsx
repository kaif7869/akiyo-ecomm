"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { SearchModal } from "@/components/search/search-modal";
import { CartDrawer } from "@/components/cart/cart-drawer";

type SiteHeaderProps = {
  activePage?: "home" | "catalog" | "contact";
  variant?: "transparent" | "solid";
};

export function SiteHeader({
  activePage = "home",
  variant = "transparent",
}: SiteHeaderProps) {
  const { totalCount, openCart } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isSolid = variant === "solid" || isScrolled;

  return (
    <>
      <header
        className={`akiyo-header ${
          isSolid ? "akiyo-header--solid" : "akiyo-header--transparent"
        }`}
      >
        {/* Promotional Ad Top Banner */}
        <aside className="akiyo-ad-banner" aria-label="Special promotion">
          <div className="akiyo-ad-banner__inner">
            <span className="akiyo-ad-badge">⚡ LIMITED AD OFFER</span>
            <p className="akiyo-ad-text">
              All 4K Art Collections worth <s>₹99</s> now for just <strong>₹20</strong> (Save ₹79 / Flat ₹69 OFF) • Instant PhonePe &amp; UPI
            </p>
            <Link href="/collection" className="akiyo-ad-btn">
              Claim for ₹20 &rarr;
            </Link>
          </div>
        </aside>

        <div className="akiyo-header__inner">
          {/* Left: Desktop Nav / Mobile Hamburger */}
          <div className="akiyo-header__left">
            <button
              type="button"
              className="akiyo-header__hamburger"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <line
                  y1="2"
                  x2="18"
                  y2="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  y1="12"
                  x2="18"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>

            <nav className="akiyo-header__nav" aria-label="Main Navigation">
              <Link
                href="/"
                className={`akiyo-header__nav-link ${
                  activePage === "home" ? "is-active" : ""
                }`}
              >
                Home
              </Link>
              <Link
                href="/collection"
                className={`akiyo-header__nav-link ${
                  activePage === "catalog" ? "is-active" : ""
                }`}
              >
                Catalog
              </Link>
              <Link
                href="/contact"
                className={`akiyo-header__nav-link ${
                  activePage === "contact" ? "is-active" : ""
                }`}
              >
                Contact
              </Link>
            </nav>
          </div>

          {/* Center: Brand Logo */}
          <div className="akiyo-header__center">
            <Link href="/" className="akiyo-header__logo" aria-label="Akiyo">
              Akiyo
            </Link>
          </div>

          {/* Right: Actions (Search, Account, Cart) */}
          <div className="akiyo-header__right">
            {/* Search */}
            <button
              type="button"
              className="akiyo-header__action-btn"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="9"
                  cy="9"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M13 13L17 17"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Account */}
            <button
              type="button"
              className="akiyo-header__action-btn"
              onClick={() => setIsAccountOpen(true)}
              aria-label="Account"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="6.5"
                  r="3.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Cart Drawer Trigger */}
            <button
              type="button"
              className="akiyo-header__action-btn akiyo-header__cart-btn"
              onClick={openCart}
              aria-label={`Cart with ${totalCount} items`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.4"
                  d="M3.5 6.8h13v8.2c0 1.1-.9 2-2 2H5.5c-1.1 0-2-.9-2-2V6.8zM8.8 3h2.4c1.3 0 2.3 1 2.3 2.3v1.5H6.5V5.3C6.5 4 7.5 3 8.8 3z"
                />
              </svg>
              {totalCount > 0 && (
                <span className="akiyo-header__cart-badge">{totalCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          className="akiyo-mobile-drawer-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="akiyo-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="akiyo-mobile-drawer-header">
              <span className="akiyo-mobile-drawer-logo">Akiyo</span>
              <button
                type="button"
                className="akiyo-mobile-drawer-close"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <nav className="akiyo-mobile-drawer-nav">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={activePage === "home" ? "is-active" : ""}
              >
                Home
              </Link>
              <Link
                href="/collection"
                onClick={() => setIsMobileMenuOpen(false)}
                className={activePage === "catalog" ? "is-active" : ""}
              >
                Catalog
              </Link>
              <Link
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className={activePage === "contact" ? "is-active" : ""}
              >
                Contact
              </Link>
            </nav>
            <div className="akiyo-mobile-drawer-footer">
              <p>Exclusive impasto wallpapers</p>
              <p className="akiyo-mobile-drawer-meta">© 2026 Akiyo</p>
            </div>
          </div>
        </div>
      )}

      {/* Account Popover / Modal */}
      {isAccountOpen && (
        <div
          className="akiyo-account-overlay"
          onClick={() => setIsAccountOpen(false)}
        >
          <div
            className="akiyo-account-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="akiyo-account-modal-header">
              <h3>Sign in or create account</h3>
              <button
                type="button"
                onClick={() => setIsAccountOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="akiyo-shop-pay-btn">
              <span>Sign in with</span>
              <strong className="shop-pay-brand">shop</strong>
            </div>

            <div className="akiyo-account-divider">
              <span>OR</span>
            </div>

            <form
              className="akiyo-account-email-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Sign in link sent to your email!");
                setIsAccountOpen(false);
              }}
            >
              <input
                type="email"
                placeholder="Email address"
                required
                className="akiyo-account-input"
              />
              <button type="submit" className="akiyo-account-submit">
                Continue →
              </button>
            </form>

            <div className="akiyo-account-modal-links">
              <Link href="/contact" onClick={() => setIsAccountOpen(false)}>
                Orders
              </Link>
              <Link href="/contact" onClick={() => setIsAccountOpen(false)}>
                Help &amp; FAQs
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Cart Drawer */}
      <CartDrawer />
    </>
  );
}
