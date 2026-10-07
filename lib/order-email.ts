import "server-only";
import nodemailer from "nodemailer";
import type { OrderRecord } from "@/lib/order-store";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function formatPrice(pricePence: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(pricePence / 100);
}

export async function sendOrderEmail(order: OrderRecord): Promise<boolean> {
  const textItems = order.items.map((item) =>
    `• ${item.title} (Qty: ${item.quantity}) - ${formatPrice(item.unitPricePence * item.quantity)}\nPreview: ${item.artworkImage}`
  ).join("\n\n");

  const htmlItems = order.items.map((item) => `
    <li style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
      <strong style="color:#111827;font-size:15px;">${escapeHtml(item.title)}</strong><br>
      <span style="color:#6b7280;font-size:13px;">Quantity: ${item.quantity} · ${formatPrice(item.unitPricePence * item.quantity)}</span><br>
      <a href="${escapeHtml(item.artworkImage)}" target="_blank" style="color:#5f259f;font-size:13px;font-weight:600;text-decoration:underline;">Preview Artwork</a>
    </li>
  `).join("");

  const emailSubject = `Order Confirmed: You will get this product within 24 hrs (Order #${order.transactionId})`;

  const emailText = `Hi ${order.customerName},\n\n` +
    `Thank you for your order! Your payment of ${formatPrice(order.amountPence)} has been successfully received.\n\n` +
    `📦 DELIVERY NOTICE:\n` +
    `You will get this product within 24 hrs.\n` +
    `Your full 4K digital wallpaper collection will be delivered to your email (${order.customerEmail}).\n\n` +
    `Order Reference: ${order.transactionId}\n` +
    `Amount Paid: ${formatPrice(order.amountPence)}\n\n` +
    `Purchased Items:\n${textItems}\n\n` +
    `If you have any questions or need assistance, reply to this email or contact support@akiyo.co.uk.\n\n` +
    `Thank you,\nAkiyo Digital Store`;

  const emailHtml = `
    <div style="max-width:600px;margin:20px auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg,#5f259f 0%,#431a70 100%);padding:28px 24px;text-align:center;color:#ffffff;">
        <span style="display:inline-block;background:rgba(255,255,255,0.2);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.05em;margin-bottom:8px;">PAYMENT CONFIRMED</span>
        <h1 style="margin:0;font-size:24px;font-weight:700;">Thank You For Your Order!</h1>
        <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Order #${escapeHtml(order.transactionId)}</p>
      </div>

      <div style="padding:28px 24px;">
        <p style="font-size:16px;line-height:1.5;margin-top:0;">Hi <strong>${escapeHtml(order.customerName)}</strong>,</p>
        <p style="font-size:15px;line-height:1.6;color:#374151;">
          Your payment of <strong>${formatPrice(order.amountPence)}</strong> has been successfully received.
        </p>

        <!-- 24-HOUR DELIVERY NOTICE -->
        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:16px 20px;margin:24px 0;">
          <div style="margin-bottom:6px;">
            <strong style="font-size:16px;color:#166534;">You will get this product within 24 hrs</strong>
          </div>
          <p style="margin:0;font-size:14px;color:#15803d;line-height:1.5;">
            Our team is preparing your complete 4K Ultra HD digital art collection. Your download links and high-resolution files will be delivered to <strong>${escapeHtml(order.customerEmail)}</strong> within 24 hours.
          </p>
        </div>

        <h3 style="font-size:16px;font-weight:700;color:#111827;border-bottom:2px solid #f3f4f6;padding-bottom:8px;margin-top:24px;">Your Purchased Collection</h3>
        <ul style="list-style:none;padding:0;margin:0;">${htmlItems}</ul>

        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-top:24px;border:1px solid #e5e7eb;">
          <div style="margin-bottom:6px;font-size:14px;">
            <span style="color:#6b7280;">Order ID: </span>
            <strong style="color:#111827;">${escapeHtml(order.transactionId)}</strong>
          </div>
          <div style="margin-bottom:6px;font-size:14px;">
            <span style="color:#6b7280;">Delivery Timeline: </span>
            <strong style="color:#16a34a;">Within 24 Hours Guaranteed</strong>
          </div>
          <div style="font-size:16px;font-weight:700;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:8px;">
            <span style="color:#111827;">Total Paid: </span>
            <span style="color:#5f259f;">${formatPrice(order.amountPence)}</span>
          </div>
        </div>

        <div style="text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">
          <p style="margin:0;">Questions about your order? Reply directly to this email or contact support@akiyo.co.uk.</p>
        </div>
      </div>
    </div>
  `;

  // Method 1: Nodemailer SMTP (Gmail, Zoho, Hostinger, Brevo, or custom SMTP)
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? "smtp.gmail.com" : undefined);
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  if (smtpUser && smtpPass && smtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `Akiyo Orders <${smtpUser}>`,
        to: order.customerEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });

      console.log(`Order email sent via SMTP to ${order.customerEmail}`);
      return true;
    } catch (smtpErr) {
      console.warn("SMTP email dispatch failed:", smtpErr);
    }
  }

  // Method 2: Resend API
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;

  if (resendApiKey && resendFrom) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `akiyo-order-${order.transactionId}`,
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [order.customerEmail],
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        console.log(`Order email sent via Resend to ${order.customerEmail}`);
        return true;
      }
      const errText = await response.text().catch(() => "");
      console.warn("Resend email dispatch error:", errText);
    } catch (resendErr) {
      console.warn("Resend email request failed:", resendErr);
    }
  }

  console.warn(
    `Order email ready for ${order.customerEmail}, but email service credentials (RESEND_API_KEY or SMTP_USER/SMTP_PASS) are not yet configured on Vercel.`
  );
  return false;
}
