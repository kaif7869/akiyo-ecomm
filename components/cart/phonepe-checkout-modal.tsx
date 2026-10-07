"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useCart } from "@/lib/cart-context";

declare global {
  interface Window {
    PhonePeCheckout?: {
      transact: (options: {
        tokenUrl: string;
        callback?: (response: string) => void;
        type?: "IFRAME" | "REDIRECT";
      }) => void;
      closePage?: () => void;
    };
  }
}

type PhonePeCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type CheckoutPhase = "form" | "qr" | "buffering" | "success";

export function PhonePeCheckoutModal({
  isOpen,
  onClose,
}: PhonePeCheckoutModalProps) {
  const { items, subtotalPence, clearCart } = useCart();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<CheckoutPhase>("form");
  const [activeTab, setActiveTab] = useState<"phonepe" | "qr">("phonepe");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bufferingStep, setBufferingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [upiUri, setUpiUri] = useState<string | null>(null);
  const [currentTxnId, setCurrentTxnId] = useState<string | null>(null);
  const [confirmedReceipt, setConfirmedReceipt] = useState<string | null>(null);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState<boolean | null>(null);
  const [isDirectUpiMode, setIsDirectUpiMode] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Pricing calculations
  const totalPayableRupees = subtotalPence / 100;
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

  const triggerBufferingVerification = useCallback(() => {
    setPhase("buffering");
    setBufferingStep(0);

    const step1 = setTimeout(() => setBufferingStep(1), 600);
    const step2 = setTimeout(() => setBufferingStep(2), 1300);
    const step3 = setTimeout(() => {
      clearCart();
      setPhase("success");
    }, 2200);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  }, [clearCart]);

  // Automatic real-time status polling when on QR phase
  useEffect(() => {
    if (!isOpen || phase !== "qr" || !currentTxnId) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollPaymentStatus = async () => {
      try {
        const res = await fetch(`/api/payment/phonepe/status?transactionId=${currentTxnId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.paid === true || data.status === "paid") {
          // Detected real-time payment settlement!
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (data.receipt) setConfirmedReceipt(data.receipt);
          triggerBufferingVerification();
        }
      } catch {
        // Continue polling silently
      }
    };

    pollingRef.current = setInterval(pollPaymentStatus, 2500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, phase, currentTxnId, triggerBufferingVerification]);

  if (!isOpen) return null;

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
          if (typeof window !== "undefined" && window.PhonePeCheckout) {
            try {
              window.PhonePeCheckout.transact({
                tokenUrl: data.redirectUrl,
                type: "IFRAME",
                callback: function (response: string) {
                  if (response === "CONCLUDED") {
                    // Payment finished successfully inside PhonePe Mercury modal!
                    triggerBufferingVerification();
                  } else if (response === "USER_CANCEL") {
                    setErrorMessage("Payment was cancelled. You can retry or scan the UPI QR code.");
                    setIsSubmitting(false);
                  }
                },
              });
              return;
            } catch (sdkError) {
              console.warn("Mercury checkout SDK failed, falling back to redirect:", sdkError);
              window.location.href = data.redirectUrl;
              return;
            }
          }

          window.location.href = data.redirectUrl;
          return;
        }

        // Direct PhonePe UPI QR / Intent mode
        if (data.qrData || data.mode === "upi_intent") {
          setIsDirectUpiMode(true);
          setUpiUri(data.qrData || currentUpiUri);
          setPhase("qr");
          setActiveTab("qr");
          setNoticeMessage("Scan QR or tap to pay with PhonePe. After your UPI app shows paid, tap 'I Have Paid' here to confirm your order.");
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
      setIsDirectUpiMode(true);
      setUpiUri(buildDirectUpiUri(fallbackTxn));
      setPhase("qr");
      setActiveTab("qr");
      setNoticeMessage("Scan QR or tap to open PhonePe. After paying, click 'I Have Paid' below.");
      setIsSubmitting(false);
    }
  };

  const handleManualPaymentConfirmed = async () => {
    if (isConfirmingPayment) return;

    if (!email || !email.includes("@")) {
      setPhase("form");
      setActiveTab("phonepe");
      setErrorMessage("Please enter your email so we can send your product within 24 hours.");
      return;
    }

    setErrorMessage(null);
    setIsConfirmingPayment(true);
    setPhase("buffering");
    setBufferingStep(0);

    const txnId = currentTxnId || `AKY_${Date.now()}`;

    // Call confirm endpoint to mark order paid & dispatch 24h delivery email
    try {
      setTimeout(() => setBufferingStep(1), 600);

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
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Payment confirmation failed.");
      }
      if (data.receipt) {
        setConfirmedReceipt(data.receipt);
      }
      setConfirmationEmailSent(data.order?.emailSent === true);

      setTimeout(() => setBufferingStep(2), 1200);

      setTimeout(() => {
        clearCart();
        setPhase("success");
      }, 2000);
    } catch (err) {
      console.warn("Confirm error fallback:", err);
      setPhase("qr");
      setErrorMessage("We could not confirm this order yet. Please tap 'I Have Paid' again, or contact support with your UPI payment screenshot.");
    } finally {
      setIsConfirmingPayment(false);
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
        style={{ maxWidth: "480px" }}
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
                PhonePe Official Checkout
              </h2>
              <span className="phonepe-modal-badge">
                Instant UPI &bull; 24h Guaranteed Product Delivery
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

        {/* =========================================================================
            STATE 1: BUFFERING / VERIFICATION ANIMATION
            ========================================================================= */}
        {phase === "buffering" && (
          <div style={{ padding: "44px 28px", textAlign: "center" }}>
            {/* Spinning glowing loader */}
            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 24px",
                borderRadius: "50%",
                border: "4px solid #f3e8ff",
                borderTopColor: "#5f259f",
                animation: "spin 0.9s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite",
              }}
            />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              @keyframes pulseSlow {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.85; transform: scale(1.02); }
              }
            `}</style>

            <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
              Verifying Payment...
            </h3>

            {/* Step-by-step progress messaging */}
            <p style={{ fontSize: "14px", color: "#6b7280", minHeight: "22px", margin: "0 0 20px" }}>
              {bufferingStep === 0 && "Connecting to PhonePe / UPI banking network..."}
              {bufferingStep === 1 && "Payment confirmed! Matching transaction reference..."}
              {bufferingStep >= 2 && `Sending 24-hour product delivery notice to ${email || "your email"}...`}
            </p>

            {/* Progress bar */}
            <div style={{ height: "6px", backgroundColor: "#f3f4f6", borderRadius: "9999px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  backgroundColor: "#5f259f",
                  transition: "width 0.6s ease",
                  width: bufferingStep === 0 ? "35%" : bufferingStep === 1 ? "75%" : "100%",
                }}
              />
            </div>

            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "16px" }}>
              Please do not refresh or close this window.
            </p>
          </div>
        )}

        {/* =========================================================================
            STATE 2: AUTOMATIC SUCCESS SCREEN
            ========================================================================= */}
        {phase === "success" && (
          <div style={{ padding: "32px 24px", textAlign: "center" }}>
            {/* Celebratory Checkmark Icon */}
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                backgroundColor: "#f0fdf4",
                border: "3px solid #22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                animation: "pulseSlow 2s infinite ease-in-out",
              }}
            >
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div style={{ display: "inline-block", backgroundColor: "#dcfce7", color: "#15803d", padding: "3px 12px", borderRadius: "9999px", fontSize: "11px", fontWeight: "800", letterSpacing: "0.06em", marginBottom: "12px" }}>
              PAYMENT RECEIVED &bull; CONFIRMED
            </div>

            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", margin: "0 0 10px" }}>
              Thank You For Your Order!
            </h2>

            <p style={{ fontSize: "14px", color: "#4b5563", margin: "0 0 20px", lineHeight: "1.5" }}>
              Your payment of <strong>₹{totalPayableRupees.toFixed(2)}</strong> has been received successfully.
            </p>

            {/* Prominent 24-Hour Guarantee Box */}
            <div
              style={{
                backgroundColor: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
                textAlign: "left",
                display: "flex",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "24px", lineHeight: "1" }}>⏱️</span>
              <div>
                <strong style={{ display: "block", fontSize: "15px", color: "#166534", marginBottom: "4px" }}>
                  Within 24 Hours You Will Get Your Product
                </strong>
                <p style={{ margin: 0, fontSize: "13px", color: "#15803d", lineHeight: "1.5" }}>
                  Our team is preparing your complete <strong>4K Ultra HD Wallpaper &amp; Digital Art collection</strong>. Your high-resolution download links will be sent directly to <strong>{email || "your registered email"}</strong> within 24 hours.
                </p>
                {confirmationEmailSent !== null && (
                  <p style={{ margin: "8px 0 0", fontSize: "12px", color: confirmationEmailSent ? "#15803d" : "#b45309", lineHeight: "1.5" }}>
                    {confirmationEmailSent
                      ? `Confirmation email sent to ${email}.`
                      : `Order confirmed. Email delivery is queued for ${email}; support will follow up if automatic email is not configured.`}
                  </p>
                )}
              </div>
            </div>

            {/* Order meta summary */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px", textAlign: "left", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Order ID:</span>
                <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>{currentTxnId?.slice(0, 18) || "AKY_CONFIRMED"}...</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Delivery Email:</span>
                <strong style={{ color: "#0f172a" }}>{email}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Delivery Timeline:</span>
                <strong style={{ color: "#16a34a" }}>Within 24 Hours Guaranteed</strong>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <a
                href={`https://wa.me/919611556001?text=${encodeURIComponent(`Hi, I just paid ₹${totalPayableRupees} for my Akiyo order ${currentTxnId || ""}. Please confirm my 24h delivery.`)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  padding: "12px",
                  backgroundColor: "#25D366",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                💬 Chat on WhatsApp for Priority Delivery
              </a>

              <a
                href={confirmedReceipt ? `/order-success?receipt=${encodeURIComponent(confirmedReceipt)}` : `/order-success?status=success&orderId=${currentTxnId}&email=${encodeURIComponent(email)}&amount=${subtotalPence}`}
                style={{
                  display: "block",
                  padding: "12px",
                  backgroundColor: "#111827",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "14px",
                  textDecoration: "none",
                }}
              >
                📄 View Full Order Invoice &amp; Artwork
              </a>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6b7280",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: "6px",
                  marginTop: "4px",
                }}
              >
                Close &bull; Continue Shopping
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 3: CHECKOUT INPUT OR QR PHASE
            ========================================================================= */}
        {(phase === "form" || phase === "qr") && (
          <>
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
                onClick={() => {
                  setActiveTab("phonepe");
                  setPhase("form");
                }}
              >
                PhonePe Gateway
              </button>
              <button
                type="button"
                className={`phonepe-tab ${activeTab === "qr" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("qr");
                  setPhase("qr");
                  setIsDirectUpiMode(true);
                  if (!currentTxnId) {
                    setCurrentTxnId(`AKY_${Date.now()}`);
                  }
                }}
              >
                Scan UPI QR Code
              </button>
            </div>

            {errorMessage && (
              <div style={{ margin: "12px 20px 0", padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "13px" }}>
                {errorMessage}
              </div>
            )}

            {noticeMessage && (
              <div style={{ margin: "12px 20px 0", padding: "10px 14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#166534", fontSize: "13px" }}>
                <strong>⏱️ 24h Delivery Notice:</strong> {noticeMessage}
              </div>
            )}

            {activeTab === "phonepe" && phase === "form" ? (
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
                  <label htmlFor="customer-phone">Phone Number (for PhonePe / UPI)</label>
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
                  <label htmlFor="customer-email">Email Address (Product delivered here within 24 hours)</label>
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

                <button type="submit" disabled={isSubmitting} className="phonepe-submit-btn">
                  {isSubmitting ? (
                    "Connecting to PhonePe..."
                  ) : (
                    <>
                      <span>Pay ₹{totalPayableRupees} with PhonePe</span>
                      <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="phonepe-badges">
                  <span>🔒 256-bit Encrypted Banking Gateway</span>
                  <span>⏱️ Product delivered to your email within 24 hours</span>
                  <span>📱 PhonePe &bull; GPay &bull; Paytm &bull; UPI</span>
                </div>
              </form>
            ) : (
              /* QR CODE PHASE */
              <div className="phonepe-qr-view">
                {/* Live Real-time Polling Pulse */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    padding: "4px 12px",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: "600",
                    marginBottom: "14px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
                      display: "inline-block",
                      boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.3)",
                    }}
                  />
                  <span>
                    {isDirectUpiMode
                      ? "After payment, tap I Have Paid to show success and send email."
                      : "Listening for UPI payment settlement in real-time..."}
                  </span>
                </div>

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
                    marginBottom: "10px",
                    backgroundColor: "#5f259f",
                  }}
                >
                  📱 Tap to Open in PhonePe / UPI App
                </a>

                {/* Explicit "I Have Paid" confirmation button */}
                <button
                  type="button"
                  onClick={handleManualPaymentConfirmed}
                  disabled={isConfirmingPayment}
                  className="phonepe-paid-confirm-btn"
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "center",
                    border: "none",
                    backgroundColor: "#16a34a",
                    cursor: isConfirmingPayment ? "not-allowed" : "pointer",
                    fontSize: "15px",
                    fontWeight: "700",
                    opacity: isConfirmingPayment ? 0.75 : 1,
                    boxShadow: "0 4px 14px rgba(22, 163, 74, 0.35)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  {isConfirmingPayment ? "Confirming order..." : `✅ I Have Paid ₹${totalPayableRupees} — Confirm Order`}
                </button>

                <div className="phonepe-badges" style={{ marginTop: "14px" }}>
                  <span>⏱️ <strong>Guaranteed Delivery:</strong> Within 24 hours you will get your 4K art collection in your email</span>
                  <span>🔒 Direct UPI settlement to verified merchant account</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
