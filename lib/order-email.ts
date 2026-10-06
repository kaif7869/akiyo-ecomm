import "server-only";
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

export async function sendOrderEmail(order: OrderRecord): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Order email delivery is not configured.");
  }

  const textItems = order.items.map((item) =>
    `${item.title} x ${item.quantity} - ${formatPrice(item.unitPricePence * item.quantity)}\nView artwork: ${item.artworkImage}`
  ).join("\n\n");
  const htmlItems = order.items.map((item) => `
    <li style="padding:16px 0;border-bottom:1px solid #e5e5e5;">
      <strong>${escapeHtml(item.title)}</strong><br>
      <span>Quantity: ${item.quantity} · ${formatPrice(item.unitPricePence * item.quantity)}</span><br>
      <a href="${escapeHtml(item.artworkImage)}">View artwork</a>
    </li>
  `).join("");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `akiyo-order-${order.transactionId}`,
    },
    body: JSON.stringify({
      from,
      to: [order.customerEmail],
      subject: `Your Akiyo order ${order.transactionId}`,
      text: `Hi ${order.customerName},\n\nYour PhonePe payment is confirmed.\nOrder: ${order.transactionId}\n\n${textItems}\n\nTotal: ${formatPrice(order.amountPence)}\n\nThese links open the catalog artwork currently associated with each item.`,
      html: `
        <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#171717;line-height:1.6;">
          <h1 style="font-size:26px;">Payment confirmed</h1>
          <p>Hi ${escapeHtml(order.customerName)}, your Akiyo order is confirmed.</p>
          <p><strong>Order reference:</strong> ${escapeHtml(order.transactionId)}</p>
          <h2 style="font-size:18px;">Your items</h2>
          <ul style="list-style:none;padding:0;">${htmlItems}</ul>
          <p style="font-size:18px;"><strong>Total paid: ${formatPrice(order.amountPence)}</strong></p>
          <p style="font-size:12px;color:#666;">Artwork links open the catalog image currently associated with each item.</p>
        </div>
      `,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Email provider returned HTTP ${response.status}.`);
  }
}