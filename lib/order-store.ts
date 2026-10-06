import "server-only";
import { neon } from "@neondatabase/serverless";
import type { Product } from "@/types/catalog";

export type OrderItem = {
  id: string;
  title: string;
  quantity: number;
  unitPricePence: number;
  artworkImage: string;
};

export type OrderRecord = {
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amountPence: number;
  items: OrderItem[];
  paymentStatus: "pending" | "paid" | "failed";
  emailStatus: "pending" | "sending" | "sent" | "failed";
};

type DatabaseRow = {
  transaction_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount_pence: number;
  items: OrderItem[] | string;
  payment_status: OrderRecord["paymentStatus"];
  email_status: OrderRecord["emailStatus"];
};

function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Order database is not configured.");
  return neon(connectionString);
}

async function ensureOrdersTable() {
  const sql = getDatabase();
  await sql`
    CREATE TABLE IF NOT EXISTS akiyo_orders (
      transaction_id TEXT PRIMARY KEY,
      customer_name VARCHAR(100) NOT NULL,
      customer_email VARCHAR(254) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      amount_pence INTEGER NOT NULL CHECK (amount_pence > 0),
      items JSONB NOT NULL,
      payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed')),
      email_status TEXT NOT NULL CHECK (email_status IN ('pending', 'sending', 'sent', 'failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return sql;
}

function mapOrder(row: DatabaseRow): OrderRecord {
  return {
    transactionId: row.transaction_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    amountPence: row.amount_pence,
    items: typeof row.items === "string" ? JSON.parse(row.items) as OrderItem[] : row.items,
    paymentStatus: row.payment_status,
    emailStatus: row.email_status,
  };
}

export async function createPendingOrder(order: {
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amountPence: number;
  items: OrderItem[];
}): Promise<void> {
  const sql = await ensureOrdersTable();
  await sql`
    INSERT INTO akiyo_orders (
      transaction_id, customer_name, customer_email, customer_phone,
      amount_pence, items, payment_status, email_status
    ) VALUES (
      ${order.transactionId}, ${order.customerName}, ${order.customerEmail},
      ${order.customerPhone}, ${order.amountPence}, ${JSON.stringify(order.items)}::jsonb,
      'pending', 'pending'
    )
  `;
}

export async function markOrderInitiationFailed(transactionId: string): Promise<void> {
  const sql = await ensureOrdersTable();
  await sql`
    UPDATE akiyo_orders
    SET payment_status = 'failed', updated_at = NOW()
    WHERE transaction_id = ${transactionId} AND payment_status = 'pending'
  `;
}

export async function getOrder(transactionId: string): Promise<OrderRecord | null> {
  const sql = await ensureOrdersTable();
  const rows = await sql`
    SELECT transaction_id, customer_name, customer_email, customer_phone,
           amount_pence, items, payment_status, email_status
    FROM akiyo_orders WHERE transaction_id = ${transactionId} LIMIT 1
  `;
  const row = rows[0] as unknown as DatabaseRow | undefined;
  return row ? mapOrder(row) : null;
}

export async function confirmOrderPayment(
  transactionId: string,
  amountPence: number
): Promise<OrderRecord | null> {
  const sql = await ensureOrdersTable();
  await sql`
    UPDATE akiyo_orders
    SET payment_status = 'paid', updated_at = NOW()
    WHERE transaction_id = ${transactionId}
      AND amount_pence = ${amountPence}
      AND payment_status = 'pending'
  `;
  const order = await getOrder(transactionId);
  return order?.paymentStatus === "paid" && order.amountPence === amountPence ? order : null;
}

export async function claimOrderEmail(transactionId: string): Promise<OrderRecord | null> {
  const sql = await ensureOrdersTable();
  const rows = await sql`
    UPDATE akiyo_orders
    SET email_status = 'sending', updated_at = NOW()
    WHERE transaction_id = ${transactionId}
      AND payment_status = 'paid'
      AND (
        email_status IN ('pending', 'failed')
        OR (email_status = 'sending' AND updated_at < NOW() - INTERVAL '5 minutes')
      )
    RETURNING transaction_id, customer_name, customer_email, customer_phone,
              amount_pence, items, payment_status, email_status
  `;
  const row = rows[0] as unknown as DatabaseRow | undefined;
  return row ? mapOrder(row) : null;
}

export async function setOrderEmailStatus(
  transactionId: string,
  status: "sent" | "failed"
): Promise<void> {
  const sql = await ensureOrdersTable();
  await sql`
    UPDATE akiyo_orders
    SET email_status = ${status}, updated_at = NOW()
    WHERE transaction_id = ${transactionId} AND payment_status = 'paid'
  `;
}

export function getOrderItemsFromCart(
  cartItems: Array<{ id: unknown; quantity: unknown }>,
  products: Product[]
): { items: OrderItem[]; amountPence: number } | null {
  if (cartItems.length < 1 || cartItems.length > 20) return null;

  const items: OrderItem[] = [];
  let amountPence = 0;
  for (const item of cartItems) {
    const product = products.find((entry) => entry.id === item.id);
    if (
      !product ||
      !Number.isSafeInteger(item.quantity) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > 10
    ) {
      return null;
    }
    const quantity = Number(item.quantity);
    items.push({
      id: product.id,
      title: product.title,
      quantity,
      unitPricePence: product.pricePence,
      artworkImage: product.artworkImage,
    });
    amountPence += product.pricePence * quantity;
  }
  return { items, amountPence };
}