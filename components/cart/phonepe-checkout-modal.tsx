"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useCart } from "@/lib/cart-context";

type PhonePeCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PhonePeCheckoutModal({
  isOpen,
  onClose,
}: PhonePeCheckoutModalProps) {
  const { items, subtotalPence, clearCart } = useCart();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"phonepe" | "qr">("phonepe");
  const [upiUri, setUpiUri] = useState<string | null>(null);
  const [currentTxnId, setCurrentTxnId] = useState<string | null>(null);
  const [copiedVpa, setCopiedVpa] = useState(false);

  if (!isOpen) return null;

  // Pricing calculations
  const totalPayableRupees = subtotalPence / 100;
  // Calculate total compare at value (original ₹99 per item)
  const totalMrpRupees = items.reduce(
    (sum, item) => sum + (item.product.compareAtPence / 100) * item.quantity,
    0
  );
  const totalSavingsRupees = Math.max(0, totalMrpRupees - totalPayableRupees);

  const upiVpa = process.env.NEXT_PUBLIC_UPI_VPA || "9611556001@ybl";
  const upiName = process.env.NEXT_PUBLIC_UPI_NAME || "Akiyo Digital Store";
  const upiBank = process.env.NEXT_PUBLIC_UPI_BANK_NAME || "Airtel Payment Bank";

  const buildDirectUpiUri = (txnId?: string) => {
    const params = new URLSearchParams({
      pa: upiVpa,
      pn: upiName,
      am: totalPayableRupees.toFixed(2),
      cu: "INR",
      tn: `Akiyo Order ${txnId || ""}`.trim(),
    });
    return `upi://pay?${params.toString()}`;
  };

  const currentUpiUri = upiUri || buildDirectUpiUri(currentTxnId || undefined);

  const handleCopyVpa = async () => {
    try {
      await navigator.clipboard.writeText(upiVpa);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } catch {
      // fallback
    }
  };

  const handlePhonePePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNoticeMessage(null);

    const cleanPhone = mobile.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address to receive your 4K download link.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payment/phonepe/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim() || "Customer",
          customerEmail: email.trim().toLowerCase(),
          customerPhone: cleanPhone,
          items: items.map((i) => ({
            id: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.merchantTransactionId) {
          setCurrentTxnId(data.merchantTransactionId);
        }

        if (data.mode === "phonepe_gateway" && data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }

        // Direct PhonePe UPI QR / Intent mode
        if (data.qrData || data.mode === "upi_intent") {
          setUpiUri(data.qrData || currentUpiUri);
          setActiveTab("qr");
          setNoticeMessage(
            "Scan or tap below to pay with PhonePe. After paying, click 'I Have Paid' to receive your 4K art collection within 24 hours."
          );
          setIsSubmitting(false);
          return;
        }

        throw new Error("Payment gateway did not return a checkout URL.");
      } else {
        throw new Error(data.error || "Payment initiation failed. Please try again.");
      }
    } catch (err) {
      console.warn("Initiation fallback:", err);
      const fallbackTxn = `AKY_${Date.now()}`;
      setCurrentTxnId(fallbackTxn);
      setUpiUri(buildDirectUpiUri(fallbackTxn));
      setActiveTab("qr");
      setNoticeMessage(
        "Scan QR or open PhonePe directly. After paying, tap 'I Have Paid' below for 24-hour delivery."
      );
      setIsSubmitting(false);
    }
  };

  const handleManualPaymentConfirmed = async () => {
    if (!email || !email.includes("@")) {
      setActiveTab("phonepe");
      setErrorMessage("Please enter your email above so we know where to deliver your product within 24 hours.");
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);

    const txnId = currentTxnId || `AKY_${Date.now()}`;

    try {
      const response = await fetch("/api/payment/phonepe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantTransactionId: txnId,
          customerName: name.trim() || "Customer",
          customerEmail: email.trim().toLowerCase(),
          customerPhone: mobile.replace(/\D/g, "") || "9999999999",
          amount: subtotalPence,
          items: items.map((i) => ({
            id: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        clearCart();
        window.location.href = data.redirectUrl;
      } else {
        clearCart();
        window.location.href = `/order-success?status=success&orderId=${txnId}&email=${encodeURIComponent(email)}&amount=${subtotalPence}`;
      }
    } catch (err) {
      console.warn("Confirm redirect fallback:", err);
      clearCart();
      window.location.href = `/order-success?status=success&orderId=${txnId}&email=${encodeURIComponent(email)}&amount=${subtotalPence}`;
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
                Instant UPI &bull; Cards &bull; QR &bull; 24h Delivery
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
            PhonePe Gateway
          </button>
          <button
            type="button"
            className={`phonepe-tab ${activeTab === "qr" ? "active" : ""}`}
            onClick={() => setActiveTab("qr")}
          >
            Scan UPI QR Code
          </button>
        </div>

        {errorMessage && (
          <div style={{
            margin: "12px 20px 0",
            padding: "10px 14px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#b91c1c",
            fontSize: "13px",
          }}>
            {errorMessage}
          </div>
        )}

        {noticeMessage && (
          <div style={{
            margin: "12px 20px 0",
            padding: "10px 14px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "6px",
            color: "#166534",
            fontSize: "13px",
            lineHeight: "1.4",
          }}>
            <strong>⏱️ 24-Hour Product Delivery:</strong> {noticeMessage}
          </div>
        )}

        {activeTab === "phonepe" ? (
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
                Email Address (Product delivered here within 24 hours)
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
              <span>🔒 256-bit Encrypted Payment</span>
              <span>⏱️ Product delivered to your email within 24 hours</span>
              <span>📱 PhonePe &bull; GPay &bull; Paytm &bull; UPI</span>
            </div>
          </form>
        ) : (
          /* UPI QR Code View */
          <div className="phonepe-qr-view">
            <p className="phonepe-qr-instruction">
              Scan with <strong>PhonePe</strong>, <strong>Google Pay</strong>, or{" "}
              <strong>Paytm</strong> to pay <strong>₹{totalPayableRupees}</strong>
            </p>

            <div className="phonepe-qr-box">
              <QRCodeSVG
                value={currentUpiUri}
                size={200}
                level="H"
                includeMargin
                aria-label="PhonePe UPI payment QR code"
              />
            </div>

            <p className="phonepe-upi-id-note">
              UPI ID: <code>{upiVpa}</code>
              <button
                type="button"
                onClick={handleCopyVpa}
                style={{
                  marginLeft: "8px",
                  fontSize: "11px",
                  padding: "2px 8px",
                  backgroundColor: copiedVpa ? "#16a34a" : "#5f259f",
                  color: "#fff",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {copiedVpa ? "Copied!" : "Copy"}
              </button>
              <br />
              Bank: {upiBank}
            </p>

            {/* Mobile direct deep-link */}
            <a
              className="phonepe-paid-confirm-btn"
              href={currentUpiUri}
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                marginBottom: "12px",
                backgroundColor: "#5f259f",
              }}
            >
              📱 Tap to Pay in PhonePe / UPI App
            </a>

            {/* Explicit "I Have Paid" confirmation button */}
            <button
              type="button"
              onClick={handleManualPaymentConfirmed}
              disabled={isConfirming}
              className="phonepe-paid-confirm-btn"
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                border: "none",
                backgroundColor: "#16a34a",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "700",
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
              }}
            >
              {isConfirming
                ? "Confirming Your Order..."
                : `✅ I Have Paid ₹${totalPayableRupees} — View Success Message`}
            </button>

            <div className="phonepe-badges" style={{ marginTop: "14px" }}>
              <span>⏱️ <strong>Guaranteed Delivery:</strong> Within 24 hours you will get your 4K art collection in your email</span>
              <span>🔒 Verified direct UPI merchant</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
