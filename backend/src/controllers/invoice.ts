import type { Request, Response } from "express";
import invoice from "../models/invoice";
import Payment from "../models/payment";
import { fromNodeHeaders } from "better-auth/node";
import mongoose from "mongoose";
import { auth, polarClient } from "../lib/auth";
import { resolvePatientBillingId } from "../lib/invoiceAccess";

export const getMyActiveInvoice = async (req: Request, res: Response) => {
  try {
    const resolved = resolvePatientBillingId(
      req,
      req.query.patientId as string | undefined,
    );
    if ("error" in resolved) {
      return res.status(resolved.status).json({ message: resolved.error });
    }

    const activeInvoice = await invoice.findOne({
      patientId: resolved.patientId,
      status: { $in: ["draft", "pending_payment"] },
    });
    // 3. Return 404 if no bill exists
    if (!activeInvoice) {
      return res.status(404).json({ message: "No active invoice found" });
    }
    // 4. Return the invoice data
    res.status(200).json(activeInvoice);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get billing history(you can remove status if you want to fetch all invoices)
export const getBillingHistory = async (req: Request, res: Response) => {
  try {
    const resolved = resolvePatientBillingId(req, req.params.patientId);
    if ("error" in resolved) {
      return res.status(resolved.status).json({ message: resolved.error });
    }

    const paidInvoices = await invoice
      .find({
        patientId: resolved.patientId,
        status: "paid",
      })
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json(
      paidInvoices.map((inv) => ({
        ...inv,
        _id: inv._id.toString(),
      })),
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const allBilling = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const billings = await invoice
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await invoice.countDocuments();
    const collection = mongoose.connection.collection("user");
    const users = await collection
      .find(
        { role: "patient" },
        { projection: { password: 0, headers: 0, emailVerified: 0 } },
      )
      .toArray();

    // 4. Create a Lookup Map for instant access
    const userMap = new Map<string, any>();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const billingsWithUser = billings.map((billing) => {
      const user = userMap.get(billing.patientId.toString());
      return {
        ...billing,
        user: user || null, // If no user found, set user to null
      };
    });

    res.json({
      res: billingsWithUser,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalData: count,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching billing history:", error);
    res.status(500).json({ message: "Failed to fetch billing history" });
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const sessionUser = (req as any).user;
    if (sessionUser.role !== "patient") {
      return res.status(403).json({
        message: "Only patients can initiate hospital checkout payments",
      });
    }

    const userInvoice = await invoice.findById(id);
    if (!userInvoice || userInvoice.status === "paid") {
      return res
        .status(400)
        .json({ message: "Invalid or already paid invoice" });
    }

    if (userInvoice.patientId.toString() !== sessionUser.id) {
      return res.status(403).json({ message: "Forbidden: invoice mismatch" });
    }

    if (userInvoice.totalAmount <= 0) {
      return res.status(400).json({ message: "Invoice has no payable balance" });
    }

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const checkout = await polarClient.checkouts.create({
      externalCustomerId: session.user.id,
      products: [process.env.POLAR_PRODUCT_ID!],
      prices: {
        [process.env.POLAR_PRODUCT_ID!]: [
          {
            amountType: "fixed",
            priceAmount: userInvoice.totalAmount, // e.g. 15000 = $150.00 (in cents)
            priceCurrency: "inr",
          },
        ],
      },
      metadata: {
        hospitalInvoiceId: userInvoice._id.toString(),
        patientId: userInvoice.patientId.toString(),
      },
      successUrl: `${process.env.FRONTEND_URL}/my-billing?checkout=success&checkout_id={CHECKOUT_ID}`,
      returnUrl: `${process.env.FRONTEND_URL}/my-billing?checkout=cancelled`,
    });

    // Redirect customer to checkout.url
    // 3. Save checkout ID to Mongo
    userInvoice.status = "pending_payment";
    userInvoice.polarCheckoutId = checkout.id;
    await userInvoice.save();

    // 4. Return the checkout URL to the frontend
    res.json({ checkoutUrl: checkout.url });
  } catch (error) {
    console.error("Polar Checkout Error:", error);
    res.status(500).json({ error: "Failed to generate payment link" });
  }
};

// 5. Get Financial Stats summary
export const getFinancialStats = async (req: Request, res: Response) => {
  try {
    const invoices = await invoice.find().lean();

    let totalRevenue = 0;
    let totalPending = 0;
    let totalDraft = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let draftCount = 0;

    invoices.forEach((inv) => {
      const amount = inv.totalAmount || 0;
      if (inv.status === "paid") {
        totalRevenue += amount;
        paidCount++;
      } else if (inv.status === "pending_payment") {
        totalPending += amount;
        pendingCount++;
      } else {
        totalDraft += amount;
        draftCount++;
      }
    });

    const [succeededPayments, failedPayments, totalPayments] =
      await Promise.all([
        Payment.countDocuments({ status: "succeeded" }),
        Payment.countDocuments({ status: "failed" }),
        Payment.countDocuments(),
      ]);

    const paymentRevenueAgg = await Payment.aggregate([
      { $match: { status: "succeeded" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const polarTotalRevenue = paymentRevenueAgg[0]?.total || 0;

    res.status(200).json({
      totalRevenue: polarTotalRevenue || totalRevenue,
      totalPending,
      totalDraft,
      paidCount,
      pendingCount,
      draftCount,
      totalBilled: totalRevenue + totalPending + totalDraft,
      totalInvoiceCount: invoices.length,
      totalPayments,
      successfulPayments: succeededPayments,
      failedPayments,
    });
  } catch (error: any) {
    console.error("Error computing financial stats:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
