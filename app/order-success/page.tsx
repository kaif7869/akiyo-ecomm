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
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const [downloadStarted, setDownloadStarted] = useState(false);

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
          result.amountPence > 0
        ) {
          return { transactionId: result.transactionId, amountPence: result.amountPence };
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

  const handleDownload = () => {
    setDownloadStarted(true);

    // Create a temporary mock file download for the customer
    const textContent = `AKYIO ARTWORK BUNDLE (4K & 6K Ultra HD)
Order Reference: ${txnId}
Amount Paid: ₹${amount}
Date: ${new Date().toLocaleDateString("en-IN")}

Thank you for your purchase!
Your high-resolution impasto wallpapers are ready for download.

Included Resolutions:
- Mobile (iPhone, Samsung, Pixel): 2160 x 3840 (4K Vertical)
- Desktop & Laptops: 3840 x 2160 (4K UHD)
- Ultrawide Displays: 5120 x 2160 (6K Ultrawide)

License: Personal Use Non-Commercial License.
Support: support@akiyo.co.uk`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Akiyo_Wallpapers_Bundle_${txnId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="order-success-page">
      <SiteHeader activePage="catalog" variant="solid" />

      <main className="order-success-main">
        <div className="order-success-card">
          {/* Success Checkmark */}
          <div className="order-success-icon-wrap">
            <svg
              className="order-success-check"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="order-success-pill">
            <span>PAID VIA PHONEPE UPI</span>
          </div>

          <h1 className="order-success-title">Thank you for your order!</h1>
          <p className="order-success-subtitle">
            Your payment of <strong>₹{amount}</strong> was successful. Your 4K
            wallpapers are ready to download immediately.
          </p>

          {/* Download Action Box */}
          <div className="order-download-box">
            <div className="order-download-info">
              <h3>Akiyo 4K &amp; 6K Ultra-HD Wallpapers</h3>
              <p>Instant ZIP package containing all resolutions</p>
            </div>

            <button
              type="button"
              className="order-download-btn"
              onClick={handleDownload}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>
                {downloadStarted ? "Downloading Pack..." : "Download 4K Art Pack"}
              </span>
            </button>
          </div>

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
              <span className="order-meta-label">Delivery Status</span>
              <span className="order-meta-value status-active">
                ✓ Available Instantly
              </span>
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
