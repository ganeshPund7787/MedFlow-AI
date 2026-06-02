import type { Request, Response } from "express";
import Payment from "../models/payment";
import invoice from "../models/invoice";
import mongoose from "mongoose";
import {
  getCollectedRevenueCents,
  sumPaymentRevenueCents,
  sumPaidInvoiceRevenueCents,
} from "../lib/revenueStats";
import { reconcilePendingPolarCheckouts } from "../lib/polarPayments";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function revenueSinceFromInvoices(since: Date) {
  const agg = await invoice.aggregate([
    {
      $match: {
        status: "paid",
        updatedAt: { $gte: since },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  return agg[0]?.total || 0;
}

/** Admin dashboard + revenue chart — uses payments and paid invoices. */
export const getRevenueOverview = async (_req: Request, res: Response) => {
  try {
    await reconcilePendingPolarCheckouts(15);

    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      dailyPay,
      weeklyPay,
      monthlyPay,
      totalPay,
      dailyInv,
      weeklyInv,
      monthlyInv,
      totalInv,
      monthlyChartPay,
      monthlyChartInv,
    ] = await Promise.all([
      sumPaymentRevenueCents({ paidAt: { $gte: dayStart } }),
      sumPaymentRevenueCents({ paidAt: { $gte: weekStart } }),
      sumPaymentRevenueCents({ paidAt: { $gte: monthStart } }),
      sumPaymentRevenueCents(),
      revenueSinceFromInvoices(dayStart),
      revenueSinceFromInvoices(weekStart),
      revenueSinceFromInvoices(monthStart),
      sumPaidInvoiceRevenueCents(),
      Payment.aggregate([
        {
          $match: {
            status: "succeeded",
            paidAt: { $gte: yearStart },
          },
        },
        {
          $group: {
            _id: { $month: "$paidAt" },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      invoice.aggregate([
        {
          $match: {
            status: "paid",
            updatedAt: { $gte: yearStart },
          },
        },
        {
          $group: {
            _id: { $month: "$updatedAt" },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const chartByMonth = monthNames.map((name, index) => {
      const month = index + 1;
      const payRow = monthlyChartPay.find((r) => r._id === month);
      const invRow = monthlyChartInv.find((r) => r._id === month);
      const cents = Math.max(payRow?.total || 0, invRow?.total || 0);
      return { name, total: cents / 100 };
    });

    res.status(200).json({
      dailyRevenue: Math.max(dailyPay, dailyInv) / 100,
      weeklyRevenue: Math.max(weeklyPay, weeklyInv) / 100,
      monthlyRevenue: Math.max(monthlyPay, monthlyInv) / 100,
      totalRevenue: Math.max(totalPay, totalInv) / 100,
      chartData: chartByMonth,
    });
  } catch (error) {
    console.error("Error fetching revenue overview:", error);
    res.status(500).json({ message: "Failed to fetch revenue overview" });
  }
};

/** Admin: paginated payment transaction list. */
export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter),
    ]);

    const patientIds = [
      ...new Set(payments.map((p) => p.patientId).filter(Boolean)),
    ];
    const userCollection = mongoose.connection.collection("user");
    const validIds = patientIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );
    const users = await userCollection
      .find({
        _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
      })
      .project({ name: 1, email: 1, image: 1, role: 1 })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    res.json({
      res: payments.map((p) => ({
        ...p,
        _id: p._id.toString(),
        user: userMap.get(p.patientId) || null,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalData: total,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};

/** Patient: own payment history. */
export const getMyPayments = async (req: Request, res: Response) => {
  try {
    const patientId = (req as any).user.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = { patientId };
    const [payments, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payment.countDocuments(filter),
    ]);

    res.json({
      res: payments.map((p) => ({ ...p, _id: p._id.toString() })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limit,
        totalData: total,
      },
    });
  } catch (error) {
    console.error("Error fetching patient payments:", error);
    res.status(500).json({ message: "Failed to fetch payment history" });
  }
};
