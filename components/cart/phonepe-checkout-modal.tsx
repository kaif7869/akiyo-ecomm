"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/catalog";

type PhonePeCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PhonePeCheckoutModal({
  isOpen,
  onClose,
}: PhonePeCheckoutModalProps) {
  const { items, subtotalPence } = useCart();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Pricing calculations
  const totalPayableRupees = subtotalPence / 100;
  // Calculate total compare at value (original ₹99 per item)
  const totalMrpRupees = items.reduce(
    (sum, item) => sum + (item.product.compareAtPence / 100) * item.quantity,
    0
  );
  const totalSavingsRupees = Math.max(0, totalMrpRupees - totalPayableRupees);

  const handlePhonePePay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobile || mobile.replace(/\D/g, "").length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address to receive your download link.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payment/phonepe/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name || "Customer",
          customerEmail: email,
          customerPhone: mobile,
          items: items.map((i) => ({
            id: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.mode === "phonepe_gateway" && data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }

        throw new Error("Payment provider did not return a secure checkout URL.");
      } else {
        throw new Error(data.error || "Payment initiation failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Payment initiation failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="phonepe-modal-overlay" onClick={onClose}>
      <div
        className="phonepe-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phonepe-modal-title"
      >
        {/* Header with PhonePe branding */}
        <div className="phonepe-modal-header">
          <div className="phonepe-branding">
            <div className="phonepe-logo-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#5f259f">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" />
              </svg>
            </div>
            <div>
              <h2 id="phonepe-modal-title" className="phonepe-modal-title">
                PhonePe Secure Checkout
              </h2>
              <span className="phonepe-modal-badge">
                Instant UPI &amp; Cards
              </span>
            </div>
          </div>
          <button
            type="button"
            className="phonepe-modal-close"
            onClick={onClose}
            aria-label="Close checkout"
          >
            &times;
          </button>
        </div>

        {/* Promotional Ad Savings Alert */}
        <div className="phonepe-ad-alert">
          <div className="phonepe-ad-alert__badge">SPECIAL AD DEAL APPLIED</div>
          <p>
            Original MRP: <s>₹{totalMrpRupees}</s> &bull; Ad Discount:{" "}
            <strong>-₹{totalSavingsRupees}</strong> &bull; You Pay:{" "}
            <span className="phonepe-ad-alert__amount">
              ₹{totalPayableRupees}
            </span>
          </p>
        </div>

        <form onSubmit={handlePhonePePay} className="phonepe-form">
            <div className="phonepe-field">
              <label htmlFor="customer-name">Full Name</label>
              <input
                id="customer-name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="phonepe-field">
              <label htmlFor="customer-phone">
                Phone Number (for PhonePe / UPI)
              </label>
              <div className="phonepe-phone-wrapper">
                <span className="phonepe-prefix">+91</span>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
            </div>

            <div className="phonepe-field">
              <label htmlFor="customer-email">
                Email Address (Instant 4K Download sent here)
              </label>
              <input
                id="customer-email"
                type="email"
                placeholder="rahul@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Price breakdown pill */}
            <div className="phonepe-breakdown">
              <div className="phonepe-breakdown-row">
                <span>Total Items ({items.length})</span>
                <span>₹{totalMrpRupees}</span>
              </div>
              <div className="phonepe-breakdown-row discount">
                <span>Special Ad Promo Discount</span>
                <span>-₹{totalSavingsRupees}</span>
              </div>
              <div className="phonepe-breakdown-divider" />
              <div className="phonepe-breakdown-row total">
                <span>Net Payable Amount</span>
                <span>₹{totalPayableRupees}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="phonepe-submit-btn"
            >
              {isSubmitting ? (
                "Connecting to PhonePe..."
              ) : (
                <>
                  <span>Pay ₹{totalPayableRupees} with PhonePe</span>
                  <svg
                    viewBox="0 0 20 20"
                    width="18"
                    height="18"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </>
              )}
            </button>

            <div className="phonepe-badges">
              <span>🔒 256-bit Encrypted</span>
              <span>⚡ Instant 4K Download</span>
              <span>📱 PhonePe &bull; GPay &bull; Paytm &bull; UPI</span>
            </div>
          </form>
      </div>
    </div>
  );
}
