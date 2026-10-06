import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { isPhonePeConfigured } from "@/lib/phonepe";
import { logoutAdmin } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <Link href="/" className="admin-brand">Akiyo <span>ADMIN</span></Link>
          <Link href="/" className="admin-store-link">Back to store</Link>
        </header>
        <section className="admin-login-wrap" aria-labelledby="admin-title">
          <p className="admin-eyebrow">Restricted area</p>
          <h1 id="admin-title">Sign in to administration</h1>
          <p className="admin-intro">Admin access is separate from customer accounts.</p>
          <AdminLoginForm isConfigured={isAdminConfigured()} />
        </section>
      </main>
    );
  }

  const paymentEnvironment = process.env.PHONEPE_ENV || "Not configured";
  const upiVpa = process.env.NEXT_PUBLIC_UPI_VPA || "Not configured";
  const upiBank = process.env.NEXT_PUBLIC_UPI_BANK_NAME || "Not configured";

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link href="/" className="admin-brand">Akiyo <span>ADMIN</span></Link>
        <div className="admin-topbar-actions">
          <Link href="/" className="admin-store-link">View store</Link>
          <form action={logoutAdmin}>
            <button type="submit" className="admin-logout">Sign out</button>
          </form>
        </div>
      </header>
      <div className="admin-content">
        <div className="admin-heading-row">
          <div>
            <p className="admin-eyebrow">Store operations</p>
            <h1>Administration</h1>
          </div>
          <span className="admin-secure-status">Protected session</span>
        </div>

        <section className="admin-section" aria-labelledby="payments-title">
          <div className="admin-section-heading">
            <h2 id="payments-title">Payment configuration</h2>
            <span>{isPhonePeConfigured() ? "Gateway configured" : "Gateway not configured"}</span>
          </div>
          <dl className="admin-details">
            <div><dt>UPI ID</dt><dd>{upiVpa}</dd></div>
            <div><dt>Bank</dt><dd>{upiBank}</dd></div>
            <div><dt>PhonePe environment</dt><dd>{paymentEnvironment}</dd></div>
          </dl>
        </section>

        <section className="admin-section" aria-labelledby="security-title">
          <div className="admin-section-heading">
            <h2 id="security-title">Security status</h2>
          </div>
          <ul className="admin-security-list">
            <li><span>Admin session</span><strong>Signed, HttpOnly, 12-hour expiry</strong></li>
            <li><span>Payment confirmation</span><strong>Verified gateway callback required</strong></li>
            <li><span>Direct UPI QR</span><strong>Payment remains unverified until provider confirmation</strong></li>
          </ul>
          <p className="admin-footnote">Payment account settings are read from server environment variables and are not editable in this dashboard.</p>
        </section>
      </div>
    </main>
  );
}
