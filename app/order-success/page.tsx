"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const receipt = searchParams.get("receipt");
  const urlOrderId = searchParams.get("orderId");
  const urlEmail = searchParams.get("email");
  const urlAmount = searchParams.get("amount");
  const statusParam = searchParams.get("status");

  const [verifiedOrder, setVerifiedOrder] = useState<{
    transactionId: string;
    amountPence: number;
    customerEmail: string;
    items: Array<{
      id: string;
      title: string;
      quantity: number;
      unitPricePence: number;
      artworkImage: string;
    }>;
    emailStatus: "pending" | "sending" | "sent" | "failed";
  } | null>(null);
  const [isChecking, setIsChecking] = useState(Boolean(receipt));

  useEffect(() => {
    if (!receipt) {
      setIsChecking(false);
      return;
    }

    let active = true;
    setIsChecking(true);

    fetch(`/api/order/verify?receipt=${encodeURIComponent(receipt)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        if (
          result.verified === true &&
          typeof result.transactionId === "string" &&
          Number.isSafeInteger(result.amountPence) &&
          result.amountPence > 0
        ) {
          return {
            transactionId: result.transactionId,
            amountPence: result.amountPence,
            customerEmail: result.customerEmail || urlEmail || "your email",
            items: Array.isArray(result.items) ? result.items : [],
            emailStatus: result.emailStatus || "sent",
          };
        }
        return null;
      })
      .then((order) => {
        if (active) setVerifiedOrder(order);
      })
      .catch(() => {
        if (active) setVerifiedOrder(null);
      })
      .finally(() => {
        if (active) setIsChecking(false);
      });

    return () => {
      active = false;
    };
  }, [receipt, urlEmail]);

  const displayTxnId = verifiedOrder?.transactionId || urlOrderId || "AKY_PENDING_CONFIRMATION";
  const displayAmount = verifiedOrder
    ? (verifiedOrder.amountPence / 100).toFixed(2)
    : urlAmount
      ? (Number(urlAmount) / 100).toFixed(2)
      : "20.00";
  const displayEmail = verifiedOrder?.customerEmail || urlEmail || "your registered email";

  if (isChecking) {
    return (
      <div className="order-success-page">
        <SiteHeader activePage="catalog" variant="solid" />
        <main className="order-success-main" aria-live="polite">
          <div className="order-success-card">
            <h2 className="order-success-title" style={{ fontSize: "22px" }}>Verifying your payment...</h2>
            <p className="order-success-subtitle">Please wait a moment while we confirm your transaction.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="order-success-page">
      <SiteHeader activePage="catalog" variant="solid" />

      <main className="order-success-main">
        <div className="order-success-card">
          {/* Animated Success Checkmark */}
          <div className="order-success-icon-wrap" style={{ backgroundColor: "#f0fdf4", border: "2px solid #22c55e" }}>
            <svg
              className="order-success-check"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="order-success-pill" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>
            <span>✅ PAYMENT RECEIVED &bull; PHONEPE UPI</span>
          </div>

          <h1 className="order-success-title" style={{ fontWeight: "700", color: "#111827" }}>
            Thank You For Your Order!
          </h1>

          <p className="order-success-subtitle" style={{ fontSize: "16px", marginBottom: "20px" }}>
            Your payment of <strong>₹{displayAmount}</strong> has been received successfully.
          </p>

          {/* Prominent 24-Hour Delivery Guarantee Banner */}
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "2px solid #86efac",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "28px",
              textAlign: "left",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px",
            }}
          >
            <div style={{ fontSize: "28px", lineHeight: "1" }}>⏱️</div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: "700", color: "#166534" }}>
                Within 24 Hours You Will Get Your Product
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: "#15803d", lineHeight: "1.6" }}>
                Our team is processing your order. Your full <strong>4K Ultra HD Wallpaper &amp; Digital Art Collection</strong> download link will be delivered directly to your email address (<strong>{displayEmail}</strong>) within <strong>24 hours</strong>.
              </p>
            </div>
          </div>

          {/* Purchased Items List if available */}
          {verifiedOrder && verifiedOrder.items.length > 0 && (
            <section className="order-download-box" aria-labelledby="purchased-items-title">
              <div className="order-download-info">
                <h3 id="purchased-items-title">Your Ordered Artwork Pack</h3>
                <p>You can preview your collection artworks below while your high-res 4K deliverables are prepared:</p>
              </div>
              <ul className="order-confirmed-items">
                {verifiedOrder.items.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>Qty {item.quantity} · ₹{((item.unitPricePence * item.quantity) / 100).toFixed(2)}</span>
                    </div>
                    <a href={item.artworkImage} target="_blank" rel="noreferrer" style={{ color: "#5f259f", fontWeight: "700" }}>
                      Preview 4K Art &rarr;
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Order Details Meta Grid */}
          <div className="order-meta-grid">
            <div className="order-meta-item">
              <span className="order-meta-label">Order Reference</span>
              <span className="order-meta-value" style={{ fontFamily: "monospace", fontSize: "13px" }}>
                {displayTxnId}
              </span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Amount Paid</span>
              <span className="order-meta-value highlight" style={{ color: "#16a34a", fontSize: "16px" }}>
                ₹{displayAmount}
              </span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Delivery Timeline</span>
              <span className="order-meta-value" style={{ color: "#166534", fontWeight: "700" }}>
                Within 24 Hours Guaranteed
              </span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Delivery Email</span>
              <span className="order-meta-value">
                {displayEmail}
              </span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Status</span>
              <span className="order-meta-value" style={{ color: "#16a34a", fontWeight: "600" }}>
                Payment Received · Processing
              </span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Support</span>
              <span className="order-meta-value">
                WhatsApp: +91 9611556001
              </span>
            </div>
          </div>

          {/* WhatsApp Support Box */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "14px 18px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              textAlign: "left",
            }}
          >
            <div>
              <strong style={{ color: "#0f172a" }}>Need instant help or early access?</strong>
              <div style={{ color: "#64748b", marginTop: "2px" }}>
                Send your order ID ({displayTxnId.slice(0, 14)}...) on WhatsApp.
              </div>
            </div>
            <a
              href={`https://wa.me/919611556001?text=${encodeURIComponent(`Hi, I just paid ₹${displayAmount} for my Akiyo order ${displayTxnId}. Please confirm my 24h delivery.`)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "8px 14px",
                backgroundColor: "#25D366",
                color: "#ffffff",
                borderRadius: "6px",
                fontWeight: "700",
                fontSize: "12px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              💬 WhatsApp Us
            </a>
          </div>

          <div className="order-success-actions">
            <Link
              href="/collection"
              className="order-return-btn"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                backgroundColor: "#111827",
                color: "#ffffff",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Explore More Collections &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading order confirmation...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
