"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

const dismissedKey = "akiyo-first-order-promo-dismissed";
const promoArtworkUrl =
  "https://cdn.shopify.com/s/files/1/0960/3439/0396/files/556183d1-2bf5-4f36-9989-d73a53197659_878ff4c2-075c-4737-b450-e7ed0ce191c9.png?v=1787071522&width=640&height=860&crop=center";

export function FirstOrderPromo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setIsDismissed(sessionStorage.getItem(dismissedKey) === "true");
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const dismissBadge = () => {
    sessionStorage.setItem(dismissedKey, "true");
    setIsDismissed(true);
    setIsOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      {!isDismissed && (
        <aside className="first-order-badge" aria-label="First order discount">
          <button
            type="button"
            className="first-order-badge__offer"
            onClick={() => setIsOpen(true)}
          >
            15% Off Your First Order
          </button>
          <button
            type="button"
            className="first-order-badge__dismiss"
            aria-label="Dismiss discount offer"
            onClick={dismissBadge}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </aside>
      )}

      {isOpen && (
        <div
          className="first-order-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            className="first-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="first-order-title"
          >
            <div className="first-order-modal__content">
              <button
                type="button"
                className="first-order-modal__close"
                aria-label="Close discount offer"
                onClick={() => setIsOpen(false)}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
              </button>

              {submitted ? (
                <div className="first-order-modal__success" role="status">
                  <p className="first-order-modal__eyebrow">Akiyo first order offer</p>
                  <h2 id="first-order-title">Thanks for your interest.</h2>
                  <p>
                    The 15% signup offer is ready to connect. Newsletter delivery and discount redemption need to be
                    connected to a mailing or commerce service before this form can issue a working code.
                  </p>
                </div>
              ) : (
                <>
                  <p className="first-order-modal__eyebrow">Akiyo first order offer</p>
                  <h2 id="first-order-title">Akiyo Sale - 15% Off!</h2>
                  <p className="first-order-modal__intro">
                    Sign up to the Akiyo newsletter and get 15% off your first order.
                  </p>

                  <form className="first-order-form" onSubmit={handleSubmit}>
                    <label className="sr-only" htmlFor="promo-first-name">First name</label>
                    <input
                      id="promo-first-name"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="First name"
                      maxLength={80}
                      required
                    />
                    <label className="sr-only" htmlFor="promo-last-name">Last name</label>
                    <input
                      id="promo-last-name"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Last name"
                      maxLength={80}
                      required
                    />
                    <label className="sr-only" htmlFor="promo-email">Email</label>
                    <input
                      id="promo-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Email"
                      maxLength={254}
                      required
                    />
                    <button type="submit">Submit</button>
                  </form>
                  <p className="first-order-modal__legal">
                    By signing up, you agree to receive marketing emails. View our privacy policy and terms of service
                    for more information.
                  </p>
                </>
              )}
            </div>

            <div className="first-order-modal__artwork">
              <Image
                src={promoArtworkUrl}
                alt="Akiyo impasto wallpaper artwork"
                fill
                sizes="(max-width: 680px) 100vw, 42vw"
                className="object-cover"
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
