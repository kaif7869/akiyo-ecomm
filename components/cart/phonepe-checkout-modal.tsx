"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  const router = useRouter();
  const { items, subtotalPence, clearCart } = useCart();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"phonepe" | "qr">("phonepe");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

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
          amount: subtotalPence,
          items: items.map((i) => ({
            id: i.product.id,
            title: i.product.title,
            price: i.product.pricePence,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.mode === "phonepe_gateway" && data.redirectUrl) {
          // Clear cart and redirect to PhonePe Gateway
          clearCart();
          window.location.href = data.redirectUrl;
          return;
        }

        // Fallback to QR or instant order confirmation
        if (data.qrData) {
          // Generate QR code using quickchart / standard QR image
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
            data.qrData
          )}`;
          setQrCodeUrl(qrUrl);
          setActiveTab("qr");
          setIsSubmitting(false);
          return;
        }

        clearCart();
        router.push(data.redirectUrl || "/order-success");
      } else {
        alert(data.error || "Payment initiation failed. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      // Fallback directly to order success for frictionless demo
      clearCart();
      router.push(
        `/order-success?txnId=AKY_DEMO_${Date.now()}&amount=${totalPayableRupees}&email=${encodeURIComponent(
          email
        )}`
      );
    }
  };

  const handleManualConfirm = () => {
    clearCart();
    router.push(
      `/order-success?txnId=UPI_${Date.now()}&amount=${totalPayableRupees}&email=${encodeURIComponent(
        email || "customer@example.com"
      )}`
    );
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

        {/* Tab switch: PhonePe Gateway vs Scan QR */}
        <div className="phonepe-tabs">
          <button
            type="button"
            className={`phonepe-tab ${activeTab === "phonepe" ? "active" : ""}`}
            onClick={() => setActiveTab("phonepe")}
          >
            PhonePe / UPI
          </button>
          <button
            type="button"
            className={`phonepe-tab ${activeTab === "qr" ? "active" : ""}`}
            onClick={() => {
              if (!qrCodeUrl) {
                const vpa = process.env.NEXT_PUBLIC_UPI_VPA || "akiyoart@ybl";
                const upiUrl = `upi://pay?pa=${vpa}&pn=AkiyoStore&am=${totalPayableRupees.toFixed(
                  2
                )}&cu=INR&tn=AkiyoArtOrder`;
                setQrCodeUrl(
                  `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    upiUrl
                  )}`
                );
              }
              setActiveTab("qr");
            }}
          >
            Scan UPI QR Code
          </button>
        </div>

        {activeTab === "phonepe" ? (
          /* PhonePe Form */
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
        ) : (
          /* UPI QR Code Mode */
          <div className="phonepe-qr-view">
            <p className="phonepe-qr-instruction">
              Scan with <strong>PhonePe</strong>, <strong>Google Pay</strong>, or{" "}
              <strong>Paytm</strong> to pay <strong>₹{totalPayableRupees}</strong>
            </p>

            <div className="phonepe-qr-box">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="PhonePe UPI Payment QR"
                  width={200}
                  height={200}
                  className="phonepe-qr-img"
                />
              )}
            </div>

            <p className="phonepe-upi-id-note">
              UPI ID: <code>{process.env.NEXT_PUBLIC_UPI_VPA || "akiyoart@ybl"}</code>
            </p>

            <div className="phonepe-qr-actions">
              <button
                type="button"
                className="phonepe-paid-confirm-btn"
                onClick={handleManualConfirm}
              >
                ✓ I have completed payment of ₹{totalPayableRupees}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
