"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/site-header";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const receipt = searchParams.get("receipt");
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
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    setIsChecking(true);
    setVerifiedOrder(null);
    if (!receipt) {
      setIsChecking(false);
      return;
    }

    let active = true;
    fetch(`/api/order/verify?receipt=${encodeURIComponent(receipt)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = await response.json();
        if (
          result.verified === true &&
          typeof result.transactionId === "string" &&
          Number.isSafeInteger(result.amountPence) &&
          result.amountPence > 0 &&
          typeof result.customerEmail === "string" &&
          Array.isArray(result.items) &&
          ["pending", "sending", "sent", "failed"].includes(result.emailStatus)
        ) {
          return {
            transactionId: result.transactionId,
            amountPence: result.amountPence,
            customerEmail: result.customerEmail,
            items: result.items,
            emailStatus: result.emailStatus,
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
  }, [receipt]);

  const txnId = verifiedOrder?.transactionId ?? "";
  const amount = verifiedOrder ? (verifiedOrder.amountPence / 100).toFixed(2) : "0.00";

  if (isChecking && receipt) {
    return <main className="order-success-main" aria-live="polite">Verifying payment...</main>;
  }

  if (!verifiedOrder) {
    return (
      <div className="order-success-page">
        <SiteHeader activePage="catalog" variant="solid" />
        <main className="order-success-main">
          <section className="order-success-card" aria-labelledby="payment-pending-title">
            <h1 id="payment-pending-title" className="order-success-title">Payment awaiting verification</h1>
            <p className="order-success-subtitle">
              We only confirm an order after PhonePe verifies the payment. Direct UPI QR transfers are not automatically verified by this site.
            </p>
            <div className="order-success-actions">
              <Link href="/collection" className="order-return-btn">Return to collection</Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="order-success-page">
      <SiteHeader activePage="catalog" variant="solid" />

      <main className="order-success-main">
        <div className="order-success-card">
          <div className="order-success-icon-wrap">
            <svg
              className="order-success-check"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="order-success-pill">
            <span>PAID VIA PHONEPE UPI</span>
          </div>

          <h1 className="order-success-title">Thank you for your order!</h1>
          <p className="order-success-subtitle">
            Your payment of <strong>₹{amount}</strong> was verified successfully.
            {verifiedOrder.emailStatus === "sent"
              ? ` Your order details were emailed to ${verifiedOrder.customerEmail}.`
              : verifiedOrder.emailStatus === "failed"
                ? ` Payment is confirmed, but email delivery failed for ${verifiedOrder.customerEmail}. Please contact support@akiyo.co.uk.`
                : ` Your order email is being sent to ${verifiedOrder.customerEmail}.`}
          </p>

          <section className="order-download-box" aria-labelledby="purchased-items-title">
            <div className="order-download-info">
              <h3 id="purchased-items-title">Your purchased items</h3>
              <p>These artwork links are also included in your order email.</p>
            </div>
            <ul className="order-confirmed-items">
              {verifiedOrder.items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>Qty {item.quantity} · ₹{((item.unitPricePence * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                  <a href={item.artworkImage} target="_blank" rel="noreferrer">View artwork</a>
                </li>
              ))}
            </ul>
          </section>

          {/* Order Details Grid */}
          <div className="order-meta-grid">
            <div className="order-meta-item">
              <span className="order-meta-label">Transaction ID</span>
              <span className="order-meta-value">{txnId}</span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Total Amount Paid</span>
              <span className="order-meta-value highlight">₹{amount}</span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Verification</span>
              <span className="order-meta-value">PhonePe confirmed</span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Email status</span>
              <span className="order-meta-value">
                {verifiedOrder.emailStatus === "sent"
                  ? "Sent"
                  : verifiedOrder.emailStatus === "failed"
                    ? "Failed"
                    : "Sending"}
              </span>
            </div>
            <div className="order-meta-item">
              <span className="order-meta-label">Order items</span>
              <span className="order-meta-value">{verifiedOrder.items.length} shown above</span>
            </div>
          </div>

          <div className="order-success-actions">
            <Link href="/collection" className="order-return-btn">
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
