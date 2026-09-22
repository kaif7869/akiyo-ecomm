"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { ProductCard } from "@/components/collection/product-card";
import { ComparisonSlider } from "@/components/home/comparison-slider";
import { ReviewsMarquee } from "@/components/home/reviews-marquee";
import { BundleSlider } from "@/components/home/bundle-slider";
import { products } from "@/data/products";

const popularProducts = [
  products[0], // Build Your Own Collection
  products[1], // Christ · Vol. 1
  products[2], // Wealth · Vol. 1
  products[3], // Noir · Vol. 1
];

const faqs = [
  {
    q: "What devices are the wallpapers compatible with?",
    a: "Every wallpaper is designed to look beautiful across phones, tablets, laptops, desktop monitors and ultrawide displays. No awkward cropping required.",
  },
  {
    q: "What if I don't receive my download email?",
    a: "Your download email should arrive within a few minutes. If you can't see it, check your spam or junk folder. If it's still missing, contact us and we'll be happy to help.",
  },
  {
    q: "What do I get with my purchase?",
    a: "You'll receive an instant download containing a ZIP file with your wallpaper collection in ultra-high resolution (4K and above, with many wallpapers in 6K+). Simply download, extract and enjoy across all your devices.",
  },
  {
    q: "Are these wallpapers exclusive to Akiyo?",
    a: "Every wallpaper is created exclusively for Akiyo and is only available through our website.",
  },
  {
    q: "Will there be new collections?",
    a: "Yes. New wallpaper collections are released regularly. Join our mailing list to get early access and be the first to discover new designs.",
  },
  {
    q: "How do I pay using PhonePe or UPI?",
    a: "We support instant payment through PhonePe, Google Pay, Paytm, BHIM, UPI QR, and all Indian debit/credit cards. Just enter your mobile number and email at checkout to pay ₹20 and download your 4K art collection instantly.",
  },
  {
    q: "Why is the price ₹20 instead of ₹99?",
    a: "For our limited-time special ad campaign, all our premium ₹99 single collections are discounted with a flat ₹79 off to just ₹20 each!",
  },
  {
    q: "Do you offer refunds?",
    a: "Depending on the situation, you may be entitled to a refund. We review every request personally and always do our best to make it right. If you're ever not fully happy with your purchase, just reach out.",
  },
];

export default function Home() {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setNewsletterSubmitted(true);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="akiyo-storefront">
      <SiteHeader activePage="home" variant="transparent" />

      <main id="MainContent">
        {/* 1. HERO SECTION */}
        <section className="akiyo-hero">
          <div className="akiyo-hero__bg">
            <Image
              src="https://akiyo.co.uk/cdn/shop/files/7_4d997340-f6a2-46be-8e1f-c214adaf1788.jpg?v=1784251086&width=3840"
              alt="Akiyo Impasto Wallpapers"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="akiyo-hero__gradient" />
          </div>

          <div className="akiyo-hero__content">
            <div className="akiyo-hero__promo-pill">
              LIMITED TIME AD DEAL: ₹99 ONLY FOR ₹20 (SAVE ₹79)
            </div>
            <h1 className="akiyo-hero__title">Museum-quality wallpapers.</h1>
            <p className="akiyo-hero__subtitle">
              Exclusive 4K–6K impasto artworks for desktop &amp; mobile. Pay with PhonePe &amp; get instant access.
            </p>
            <div className="akiyo-hero__cta-group">
              <Link href="/collection" className="akiyo-btn-hero">
                Get All Packs @ ₹20 Only
              </Link>
            </div>
          </div>
        </section>

        {/* 2. FEATURE: PERFECTLY FRAMED */}
        <section className="akiyo-section akiyo-framed-section">
          <div className="akiyo-container akiyo-framed-grid">
            <div className="akiyo-framed-media">
              <Image
                src="https://akiyo.co.uk/cdn/shop/files/2_W.png?height=2000&v=1785213635"
                alt="Perfect framed mockups"
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
                className="object-cover"
              />
            </div>
            <div className="akiyo-framed-copy">
              <h2>Perfectly framed on every device.</h2>
              <p>
                Designed to display beautifully across desktop, laptop and
                mobile—with no awkward cropping.
              </p>
            </div>
          </div>
        </section>

        {/* 3. RED MARQUEE TICKER */}
        <div className="akiyo-red-marquee" aria-hidden="true">
          <div className="akiyo-red-marquee__inner">
            <span>WORTH ₹99 NOW AT ₹20 · FLAT ₹69-₹79 OFF · INSTANT PHONEPE UPI DOWNLOAD · 4K ULTRA HD ARTWORKS</span>
            <span>WORTH ₹99 NOW AT ₹20 · FLAT ₹69-₹79 OFF · INSTANT PHONEPE UPI DOWNLOAD · 4K ULTRA HD ARTWORKS</span>
            <span>WORTH ₹99 NOW AT ₹20 · FLAT ₹69-₹79 OFF · INSTANT PHONEPE UPI DOWNLOAD · 4K ULTRA HD ARTWORKS</span>
          </div>
        </div>

        {/* 4. FEATURE: BUILD YOUR OWN COLLECTION */}
        <section className="akiyo-section akiyo-bundle-feature">
          <div className="akiyo-container akiyo-bundle-feature-grid">
            <div className="akiyo-bundle-feature-media">
              <Image
                src="https://akiyo.co.uk/cdn/shop/files/build_your_own_collection_cover.png?v=1784995574&width=3840"
                alt="Build Your Own Collection Bundle"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="akiyo-bundle-feature-copy">
              <h2>Build Your Own Collection</h2>
              <p>
                The ultimate Akiyo collection, curated by you. Choose any 8
                wallpapers from across our releases and create a personalised
                bundle that reflects your own style.
              </p>
              <Link href="/collection" className="akiyo-btn-solid">
                Build Your Bundle
              </Link>
            </div>
          </div>
        </section>

        {/* 5. TRUST SHOWCASE: TRUSTED BY 2,400+ CUSTOMERS */}
        <ReviewsMarquee />

        {/* 6. POPULAR COLLECTIONS (With Hover Quick Add Buttons) */}
        <section className="akiyo-section akiyo-popular-section">
          <div className="akiyo-container">
            <div className="akiyo-section-header">
              <h2>Popular Collections</h2>
            </div>
            <div className="akiyo-product-grid">
              {popularProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={i < 2}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 7. FEATURE: UNMATCHED QUALITY */}
        <section className="akiyo-section akiyo-quality-section">
          <div className="akiyo-container akiyo-quality-grid">
            <div className="akiyo-quality-media">
              <Image
                src="https://akiyo.co.uk/cdn/shop/files/main.png?height=2000&v=1784234621"
                alt="Unmatched impasto quality"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="akiyo-quality-copy">
              <h2>Unmatched Quality</h2>
              <p>
                Created in exceptional 4K–6K+ resolution to preserve every
                brushstroke.
              </p>
            </div>
          </div>
        </section>

        {/* 8. DIVIDER */}
        <div className="akiyo-divider" />

        {/* 9. COLLECTION BUNDLES CAROUSEL */}
        <BundleSlider />

        {/* 10. INTERACTIVE COMPARISON SLIDER: SEE THE DIFFERENCE */}
        <ComparisonSlider />

        {/* 11. DIVIDER */}
        <div className="akiyo-divider" />

        {/* 12. FREQUENTLY ASKED QUESTIONS */}
        <section className="akiyo-section akiyo-faq-section">
          <div className="akiyo-container akiyo-faq-container">
            <h2>Frequently asked questions</h2>
            <div className="akiyo-faq-list">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={faq.q}
                    className={`akiyo-faq-item ${isOpen ? "is-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="akiyo-faq-question"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      <span className="akiyo-faq-icon">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="akiyo-faq-answer">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 13. NEWSLETTER */}
        <section className="akiyo-newsletter-section">
          <div className="akiyo-container akiyo-newsletter-container">
            <h3>New designs. First look. Exclusive offers.</h3>
            <p>Join the list for early access to every new wallpaper collection.</p>
            {newsletterSubmitted ? (
              <p className="akiyo-newsletter-success">
                Thank you for subscribing! Check your inbox soon.
              </p>
            ) : (
              <form
                className="akiyo-newsletter-form"
                onSubmit={handleNewsletterSubmit}
              >
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="akiyo-newsletter-input"
                />
                <button
                  type="submit"
                  className="akiyo-newsletter-btn"
                  aria-label="Subscribe"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 10h12m0 0l-5-5m5 5l-5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="akiyo-footer">
        <div className="akiyo-container akiyo-footer-inner">
          <div className="akiyo-footer-top">
            <div className="akiyo-footer-brand">
              <span className="akiyo-footer-logo">Akiyo</span>
              <p>
                Museum-quality impasto wallpapers created for high-resolution
                displays. Formatted perfectly for mobile and desktop.
              </p>
            </div>

            <div className="akiyo-footer-links">
              <div className="akiyo-footer-col">
                <h4>Navigation</h4>
                <ul>
                  <li>
                    <Link href="/">Home</Link>
                  </li>
                  <li>
                    <Link href="/collection">Catalog</Link>
                  </li>
                  <li>
                    <Link href="/contact">Contact</Link>
                  </li>
                </ul>
              </div>

              <div className="akiyo-footer-col">
                <h4>Support</h4>
                <ul>
                  <li>
                    <Link href="/contact">Order Help</Link>
                  </li>
                  <li>
                    <Link href="/contact">Refund Policy</Link>
                  </li>
                  <li>
                    <Link href="/contact">Terms of Service</Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="akiyo-footer-bottom">
            <p>© 2026 Akiyo. All rights reserved.</p>
            <div className="akiyo-footer-currency">
              <span>India (INR ₹) • PhonePe &amp; UPI Accepted</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
