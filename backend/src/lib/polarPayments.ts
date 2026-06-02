import invoice from "../models/invoice";
import Payment from "../models/payment";
import { getIO } from "./socket";
import { polarClient } from "./polarClient";

type PolarWebhookPayload = {
  type: string;
  data: Record<string, any>;
};

function normalizeMetadata(
  raw: Record<string, unknown> | undefined | null,
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null && value !== undefined) {
      out[key] = String(value);
    }
  }
  return out;
}

function extractEventId(type: string, data: Record<string, any>): string {
  const id =
    data.id ||
    data.checkout_id ||
    data.checkoutId ||
    data.order_id ||
    `${type}-${data.created_at || data.createdAt || Date.now()}`;
  return `${type}:${id}`;
}

export function extractAmountCents(data: Record<string, any>): number {
  const candidates = [
    data.totalAmount,
    data.total_amount,
    data.amount,
    data.netAmount,
    data.net_amount,
    data.dueAmount,
    data.subtotal_amount,
    data.checkout?.totalAmount,
    data.checkout?.total_amount,
    data.checkout?.amount,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 0;
}

function extractCurrency(data: Record<string, any>): string {
  return String(
    data.currency ||
      data.checkout?.currency ||
      "inr",
  ).toLowerCase();
}

function extractInvoiceContext(data: Record<string, any>) {
  const meta = normalizeMetadata(data.metadata);
  const checkoutMeta = normalizeMetadata(data.checkout?.metadata);
  const hospitalInvoiceId =
    meta.hospitalInvoiceId ||
    checkoutMeta.hospitalInvoiceId ||
    data.hospitalInvoiceId;
  const patientId =
    meta.patientId || checkoutMeta.patientId || data.patientId;
  const polarCheckoutId =
    data.checkoutId ||
    data.checkout_id ||
    data.checkout?.id ||
    undefined;
  const polarOrderId = data.id || data.order_id || data.order?.id;

  return {
    hospitalInvoiceId: hospitalInvoiceId?.toString(),
    patientId: patientId?.toString(),
    polarCheckoutId: polarCheckoutId?.toString(),
    polarOrderId: polarOrderId?.toString(),
  };
}

async function resolveInvoiceId(
  hospitalInvoiceId: string | undefined,
  polarCheckoutId: string | undefined,
) {
  if (hospitalInvoiceId) return hospitalInvoiceId;
  if (!polarCheckoutId) return undefined;
  const inv = await invoice.findOne({ polarCheckoutId }).select("_id patientId");
  return inv ? inv._id.toString() : undefined;
}

/** Load checkout metadata/amount when order webhooks omit hospital invoice id. */
async function enrichFromPolarCheckout(
  polarCheckoutId: string,
  ctx: ReturnType<typeof extractInvoiceContext>,
  amount: number,
) {
  try {
    const checkout = await polarClient.checkouts.get({ id: polarCheckoutId });
    const meta = normalizeMetadata(
      checkout.metadata as Record<string, unknown>,
    );
    return {
      hospitalInvoiceId:
        ctx.hospitalInvoiceId || meta.hospitalInvoiceId || undefined,
      patientId: ctx.patientId || meta.patientId || undefined,
      polarCheckoutId: ctx.polarCheckoutId || checkout.id,
      amount: amount || extractAmountCents(checkout as Record<string, any>),
    };
  } catch (error) {
    console.warn("[polar] Could not load checkout for enrichment:", error);
    return { ...ctx, amount };
  }
}

async function recordPaymentOnce(params: {
  polarEventId: string;
  patientId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  polarPaymentId?: string;
  polarOrderId?: string;
  polarCheckoutId?: string;
  invoiceReference?: string;
  failureReason?: string;
  paidAt?: Date;
}) {
  const existing = await Payment.findOne({
    polarEventId: params.polarEventId,
  }).lean();
  if (existing) {
    return { payment: existing, duplicate: true };
  }

  const payment = await Payment.create({
    ...params,
    paidAt:
      params.paidAt ??
      (params.status === "succeeded" ? new Date() : undefined),
  });

  return { payment, duplicate: false };
}

/** Apply a successful Polar payment to invoice + payment ledger. */
export async function applySuccessfulPayment(params: {
  hospitalInvoiceId?: string;
  patientId?: string;
  amount: number;
  currency: string;
  polarCheckoutId?: string;
  polarOrderId?: string;
  polarEventId: string;
}) {
  let { hospitalInvoiceId, patientId, amount } = params;
  const { currency, polarCheckoutId, polarOrderId, polarEventId } = params;

  hospitalInvoiceId = await resolveInvoiceId(
    hospitalInvoiceId,
    polarCheckoutId,
  );

  let invDoc = hospitalInvoiceId
    ? await invoice.findById(hospitalInvoiceId)
    : null;

  if (!patientId && invDoc) {
    patientId = invDoc.patientId?.toString();
  }

  if (!amount && invDoc) {
    amount = invDoc.totalAmount || 0;
  }

  if (hospitalInvoiceId && invDoc) {
    await invoice.findByIdAndUpdate(hospitalInvoiceId, {
      status: "paid",
      polarCheckoutId: polarCheckoutId || invDoc.polarCheckoutId,
      polarOrderId: polarOrderId || invDoc.polarOrderId,
    });
  }

  await recordPaymentOnce({
    polarEventId,
    patientId: patientId || "unknown",
    invoiceId: hospitalInvoiceId,
    amount,
    currency,
    status: "succeeded",
    polarPaymentId: polarOrderId,
    polarOrderId,
    polarCheckoutId,
    invoiceReference: hospitalInvoiceId,
    paidAt: new Date(),
  });

  try {
    getIO().emit("payment_received", { invoiceId: hospitalInvoiceId });
  } catch {
    /* optional */
  }

  return { hospitalInvoiceId, amount, patientId };
}

export async function handlePolarWebhookPayload({
  type,
  data,
}: PolarWebhookPayload): Promise<void> {
  const polarEventId = extractEventId(type, data);
  const ctx = extractInvoiceContext(data);
  const amount = extractAmountCents(data);
  const currency = extractCurrency(data);

  switch (type) {
    case "order.paid": {
      const isPaid =
        data.paid === true ||
        data.status === "paid" ||
        String(data.status).toLowerCase() === "paid";
      if (!isPaid) return;

      let invoiceId = ctx.hospitalInvoiceId;
      let patientId = ctx.patientId;
      let checkoutId = ctx.polarCheckoutId;
      let paidAmount = amount;

      if (!invoiceId && checkoutId) {
        const enriched = await enrichFromPolarCheckout(checkoutId, ctx, amount);
        invoiceId = enriched.hospitalInvoiceId;
        patientId = enriched.patientId;
        checkoutId = enriched.polarCheckoutId;
        paidAmount = enriched.amount;
      }

      const result = await applySuccessfulPayment({
        hospitalInvoiceId: invoiceId,
        patientId,
        amount: paidAmount,
        currency,
        polarCheckoutId: checkoutId,
        polarOrderId: ctx.polarOrderId,
        polarEventId,
      });

      console.log(
        `[polar] order.paid synced invoice=${result.hospitalInvoiceId || "n/a"} amount=${result.amount}`,
      );
      break;
    }

    case "checkout.updated": {
      const status = String(
        data.status || data.checkout?.status || "",
      ).toLowerCase();
      if (status === "succeeded" || status === "confirmed") {
        await applySuccessfulPayment({
          hospitalInvoiceId: ctx.hospitalInvoiceId,
          patientId: ctx.patientId,
          amount,
          currency,
          polarCheckoutId: ctx.polarCheckoutId || data.id,
          polarOrderId: ctx.polarOrderId,
          polarEventId,
        });
      } else if (status === "failed" || status === "expired") {
        const invoiceId = await resolveInvoiceId(
          ctx.hospitalInvoiceId,
          ctx.polarCheckoutId || data.id,
        );
        if (invoiceId) {
          await invoice.findByIdAndUpdate(invoiceId, {
            status: "pending_payment",
          });
        }
        await recordPaymentOnce({
          polarEventId,
          patientId: ctx.patientId || "unknown",
          invoiceId,
          amount,
          currency,
          status: "failed",
          polarCheckoutId: ctx.polarCheckoutId || data.id,
          invoiceReference: invoiceId,
          failureReason: status,
        });
      }
      break;
    }

    case "order.refunded":
    case "order.refund.created": {
      const invoiceId = await resolveInvoiceId(
        ctx.hospitalInvoiceId,
        ctx.polarCheckoutId,
      );
      if (invoiceId) {
        await invoice.findByIdAndUpdate(invoiceId, {
          status: "pending_payment",
        });
      }
      await recordPaymentOnce({
        polarEventId,
        patientId: ctx.patientId || "unknown",
        invoiceId,
        amount,
        currency,
        status: "refunded",
        polarOrderId: ctx.polarOrderId,
        polarCheckoutId: ctx.polarCheckoutId,
        invoiceReference: invoiceId,
      });
      break;
    }

    default:
      break;
  }
}

/** Fallback when customer returns from Polar but webhooks did not reach localhost. */
export async function syncCheckoutFromPolar(checkoutId: string) {
  const checkout = await polarClient.checkouts.get({ id: checkoutId });
  const status = String(checkout.status).toLowerCase();
  const meta = normalizeMetadata(
    checkout.metadata as Record<string, unknown>,
  );
  const paidAmount = extractAmountCents(checkout as Record<string, any>);

  if (status === "succeeded" || status === "confirmed" || status === "paid") {
    return applySuccessfulPayment({
      hospitalInvoiceId: meta.hospitalInvoiceId,
      patientId: meta.patientId,
      amount: paidAmount,
      currency: String(checkout.currency || "inr").toLowerCase(),
      polarCheckoutId: checkout.id,
      polarEventId: `checkout.sync:${checkout.id}`,
    });
  }

  return null;
}

/**
 * Sync invoices that have a Polar checkout id but are still unpaid in MongoDB
 * (common when webhooks never reach local dev).
 */
export async function reconcilePendingPolarCheckouts(limit = 10) {
  const pending = await invoice
    .find({
      polarCheckoutId: { $exists: true, $nin: [null, ""] },
      status: { $ne: "paid" },
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select("_id polarCheckoutId");

  const synced: Array<{ invoiceId: string; amount: number }> = [];

  for (const inv of pending) {
    if (!inv.polarCheckoutId) continue;
    try {
      const result = await syncCheckoutFromPolar(inv.polarCheckoutId);
      if (result?.hospitalInvoiceId) {
        synced.push({
          invoiceId: result.hospitalInvoiceId,
          amount: result.amount,
        });
      }
    } catch (error) {
      console.warn(
        `[polar] reconcile skipped checkout=${inv.polarCheckoutId}:`,
        error,
      );
    }
  }

  return synced;
}
