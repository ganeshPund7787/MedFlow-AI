import invoice from "../models/invoice";
import Payment from "../models/payment";

/** Sum succeeded payment ledger rows (cents). */
export async function sumPaymentRevenueCents(
  extraMatch: Record<string, unknown> = {},
): Promise<number> {
  const agg = await Payment.aggregate([
    { $match: { status: "succeeded", ...extraMatch } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return agg[0]?.total || 0;
}

/** Sum paid hospital invoices (cents) — matches Polar-settled bills in MongoDB. */
export async function sumPaidInvoiceRevenueCents(
  extraMatch: Record<string, unknown> = {},
): Promise<number> {
  const agg = await invoice.aggregate([
    { $match: { status: "paid", ...extraMatch } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  return agg[0]?.total || 0;
}

/** Prefer payment records; fall back to paid invoices (webhook/sync may only update invoices). */
export async function getCollectedRevenueCents(
  extraMatch: Record<string, unknown> = {},
): Promise<number> {
  const [fromPayments, fromInvoices] = await Promise.all([
    sumPaymentRevenueCents(extraMatch),
    sumPaidInvoiceRevenueCents(extraMatch),
  ]);
  return Math.max(fromPayments, fromInvoices);
}

export async function countSuccessfulTransactions(): Promise<number> {
  const [payments, invoices] = await Promise.all([
    Payment.countDocuments({ status: "succeeded" }),
    invoice.countDocuments({ status: "paid" }),
  ]);
  return Math.max(payments, invoices);
}
