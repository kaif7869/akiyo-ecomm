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

declare global {
  var __akiyoFallbackOrders: Map<string, OrderRecord> | undefined;
}

const memoryOrders: Map<string, OrderRecord> =
  globalThis.__akiyoFallbackOrders || (globalThis.__akiyoFallbackOrders = new Map());

function getDatabase() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;
  return neon(connectionString);
}

let tableEnsured = false;
async function ensureOrdersTable() {
  const sql = getDatabase();
  if (!sql) return null;
  if (tableEnsured) return sql;

  try {
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
    tableEnsured = true;
    return sql;
  } catch (err) {
    console.warn("Neon orders table setup failed, continuing with in-memory store:", err);
    return null;
  }
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
  const record: OrderRecord = {
    ...order,
    paymentStatus: "pending",
    emailStatus: "pending",
  };
  memoryOrders.set(order.transactionId, record);

  try {
    const sql = await ensureOrdersTable();
    if (sql) {
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
  } catch (err) {
    console.warn("Neon createPendingOrder failed, saved in memory:", err);
  }
}

export async function markOrderInitiationFailed(transactionId: string): Promise<void> {
  const mem = memoryOrders.get(transactionId);
  if (mem && mem.paymentStatus === "pending") {
    mem.paymentStatus = "failed";
  }

  try {
    const sql = await ensureOrdersTable();
    if (sql) {
      await sql`
        UPDATE akiyo_orders
        SET payment_status = 'failed', updated_at = NOW()
        WHERE transaction_id = ${transactionId} AND payment_status = 'pending'
      `;
    }
  } catch (err) {
    console.warn("Neon markOrderInitiationFailed failed:", err);
  }
}

export async function getOrder(transactionId: string): Promise<OrderRecord | null> {
  try {
    const sql = await ensureOrdersTable();
    if (sql) {
      const rows = await sql`
        SELECT transaction_id, customer_name, customer_email, customer_phone,
               amount_pence, items, payment_status, email_status
        FROM akiyo_orders WHERE transaction_id = ${transactionId} LIMIT 1
      `;
      const row = rows[0] as unknown as DatabaseRow | undefined;
      if (row) return mapOrder(row);
    }
  } catch (err) {
    console.warn("Neon getOrder failed, checking memory store:", err);
  }

  return memoryOrders.get(transactionId) || null;
}

export async function confirmOrderPayment(
  transactionId: string,
  amountPence: number
): Promise<OrderRecord | null> {
  const mem = memoryOrders.get(transactionId);
  if (mem && mem.amountPence === amountPence) {
    mem.paymentStatus = "paid";
  }

  try {
    const sql = await ensureOrdersTable();
    if (sql) {
      await sql`
        UPDATE akiyo_orders
        SET payment_status = 'paid', updated_at = NOW()
        WHERE transaction_id = ${transactionId}
          AND amount_pence = ${amountPence}
          AND payment_status = 'pending'
      `;
      const order = await getOrder(transactionId);
      if (order?.paymentStatus === "paid" && order.amountPence === amountPence) {
        return order;
      }
    }
  } catch (err) {
    console.warn("Neon confirmOrderPayment failed, using memory:", err);
  }

  return mem && mem.paymentStatus === "paid" ? mem : null;
}

export async function claimOrderEmail(transactionId: string): Promise<OrderRecord | null> {
  const mem = memoryOrders.get(transactionId);
  if (mem && mem.paymentStatus === "paid" && (mem.emailStatus === "pending" || mem.emailStatus === "failed")) {
    mem.emailStatus = "sending";
  }

  try {
    const sql = await ensureOrdersTable();
    if (sql) {
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
      if (row) return mapOrder(row);
    }
  } catch (err) {
    console.warn("Neon claimOrderEmail failed:", err);
  }

  return mem && mem.emailStatus === "sending" ? mem : null;
}

export async function setOrderEmailStatus(
  transactionId: string,
  status: "sent" | "failed"
): Promise<void> {
  const mem = memoryOrders.get(transactionId);
  if (mem && mem.paymentStatus === "paid") {
    mem.emailStatus = status;
  }

  try {
    const sql = await ensureOrdersTable();
    if (sql) {
      await sql`
        UPDATE akiyo_orders
        SET email_status = ${status}, updated_at = NOW()
        WHERE transaction_id = ${transactionId} AND payment_status = 'paid'
      `;
    }
  } catch (err) {
    console.warn("Neon setOrderEmailStatus failed:", err);
  }
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