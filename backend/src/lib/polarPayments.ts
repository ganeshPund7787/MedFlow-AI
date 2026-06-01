import invoice from "../models/invoice";
import Payment from "../models/payment";
import { getIO } from "./socket";

type PolarWebhookPayload = {
  type: string;
  data: Record<string, any>;
};

function extractEventId(type: string, data: Record<string, any>): string {
  const id =
    data.id ||
    data.checkout_id ||
    data.order_id ||
    `${type}-${data.created_at || Date.now()}`;
  return `${type}:${id}`;
}

function extractAmountCents(data: Record<string, any>): number {
  if (typeof data.amount === "number") return data.amount;
  if (typeof data.total_amount === "number") return data.total_amount;
  if (data.checkout?.total_amount) return Number(data.checkout.total_amount);
  if (data.order?.total_amount) return Number(data.order.total_amount);
  return 0;
}

function extractCurrency(data: Record<string, any>): string {
  return (
    data.currency ||
    data.price_currency ||
    data.checkout?.currency ||
    "inr"
  ).toLowerCase();
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
    paidAt: params.paidAt ?? (params.status === "succeeded" ? new Date() : undefined),
  });

  return { payment, duplicate: false };
}

export async function handlePolarWebhookPayload({
  type,
  data,
}: PolarWebhookPayload): Promise<void> {
  const polarEventId = extractEventId(type, data);
  const hospitalInvoiceId =
    data.metadata?.hospitalInvoiceId ||
    data.checkout?.metadata?.hospitalInvoiceId;
  const patientId =
    data.metadata?.patientId || data.checkout?.metadata?.patientId;
  const amount = extractAmountCents(data);
  const currency = extractCurrency(data);
  const polarCheckoutId = data.checkout_id || data.checkout?.id || data.id;
  const polarOrderId = data.order_id || data.order?.id || data.id;

  switch (type) {
    case "order.paid": {
      if (!data.paid && data.status !== "paid") return;

      let finalAmount = amount;
      if (!finalAmount && hospitalInvoiceId) {
        const invDoc = await invoice
          .findById(hospitalInvoiceId)
          .select("totalAmount");
        finalAmount = invDoc?.totalAmount || 0;
      }

      if (hospitalInvoiceId) {
        await invoice.findByIdAndUpdate(hospitalInvoiceId, {
          status: "paid",
          polarCheckoutId: polarCheckoutId?.toString(),
          polarOrderId: polarOrderId?.toString(),
        });
      }

      await recordPaymentOnce({
        polarEventId,
        patientId: patientId?.toString() || "unknown",
        invoiceId: hospitalInvoiceId?.toString(),
        amount: finalAmount,
        currency,
        status: "succeeded",
        polarPaymentId: polarOrderId?.toString(),
        polarOrderId: polarOrderId?.toString(),
        polarCheckoutId: polarCheckoutId?.toString(),
        invoiceReference: hospitalInvoiceId?.toString(),
        paidAt: new Date(),
      });

      try {
        getIO().emit("payment_received", { invoiceId: hospitalInvoiceId });
        getIO().emit("lab_result_updated");
      } catch {
        /* socket optional */
      }

      console.log(
        `[polar] Invoice ${hospitalInvoiceId || "n/a"} marked paid (${polarEventId})`,
      );
      break;
    }

    case "order.refunded":
    case "order.refund.created": {
      if (hospitalInvoiceId) {
        await invoice.findByIdAndUpdate(hospitalInvoiceId, {
          status: "pending_payment",
        });
      }

      await recordPaymentOnce({
        polarEventId,
        patientId: patientId?.toString() || "unknown",
        invoiceId: hospitalInvoiceId?.toString(),
        amount,
        currency,
        status: "refunded",
        polarOrderId: polarOrderId?.toString(),
        polarCheckoutId: polarCheckoutId?.toString(),
        invoiceReference: hospitalInvoiceId?.toString(),
      });
      break;
    }

    case "checkout.updated": {
      const status = (data.status || data.checkout?.status || "").toLowerCase();
      if (status === "failed" || status === "expired") {
        if (hospitalInvoiceId) {
          await invoice.findByIdAndUpdate(hospitalInvoiceId, {
            status: "pending_payment",
          });
        }

        await recordPaymentOnce({
          polarEventId,
          patientId: patientId?.toString() || "unknown",
          invoiceId: hospitalInvoiceId?.toString(),
          amount,
          currency,
          status: "failed",
          polarCheckoutId: polarCheckoutId?.toString(),
          invoiceReference: hospitalInvoiceId?.toString(),
          failureReason: status,
        });
      }
      break;
    }

    default:
      break;
  }
}
