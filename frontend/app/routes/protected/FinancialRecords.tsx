import { useQuery } from "@tanstack/react-query";
import { getFinancialStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { DollarSign, CheckCircle2, Clock, Landmark, ArrowRight, BarChart3, TrendingUp, ShieldCheck } from "lucide-react";
import Loader from "@/components/global/Loader";

export function meta() {
  return [{ title: "Financial Controls | MedFlow AI" }];
}

const FinancialRecords = () => {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["financial-records-stats"],
    queryFn: getFinancialStats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Financial Controls..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading financial stats. Please refresh.
      </div>
    );
  }

  const revenueVal = (stats?.totalRevenue || 0) / 100;
  const pendingVal = (stats?.totalPending || 0) / 100;
  const draftVal = (stats?.totalDraft || 0) / 100;
  const totalBilledVal = (stats?.totalBilled || 0) / 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Financial Control Panel
          </h1>
          <p className="text-slate-500 font-medium">
            Monitor hospital cash flow, track invoice collections, and audit billing metrics.
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 gap-1.5 text-xs shadow-blue-500/10">
          <Link to="/financial-history">
            View Revenue Ledger <ArrowRight size={14} />
          </Link>
        </Button>
      </div>

      {/* Primary Analytics Summary Card */}
      <Card className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl border-none overflow-hidden relative shadow-lg">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-blue-500/20 to-transparent pointer-events-none" />
        <CardContent className="p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 gap-1 text-xs px-2.5 py-1">
              <Landmark size={12} /> Revenue Summary
            </Badge>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Accumulated Sales Billed</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">${totalBilledVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <p className="text-slate-500 text-xs">
              Calculated across {stats?.totalInvoiceCount || 0} invoice procedures (including draft treatments).
            </p>
          </div>
          <div className="flex gap-8 border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-10">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Settled Cash</span>
              <h4 className="text-xl font-bold text-emerald-400">${revenueVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
              <p className="text-[10px] text-slate-500">{stats?.paidCount || 0} completed invoices</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Unsettled / Pending</span>
              <h4 className="text-xl font-bold text-amber-400">${pendingVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
              <p className="text-[10px] text-slate-500">{stats?.pendingCount || 0} await checkouts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger stats break up */}
        <Card className="shadow-sm rounded-xl border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" /> Invoice Breakdown
            </CardTitle>
            <CardDescription>Status-based hospital invoice aggregates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-emerald-50/30 dark:bg-emerald-950/5 border border-emerald-100/50 dark:border-emerald-900/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  <CheckCircle2 size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Settled (Paid)</p>
                  <p className="text-[10px] text-slate-500">{stats?.paidCount || 0} invoice(s)</p>
                </div>
              </div>
              <h4 className="text-sm font-bold text-emerald-600">${revenueVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
            </div>

            <div className="flex justify-between items-center p-3 bg-amber-50/30 dark:bg-amber-950/5 border border-amber-100/50 dark:border-amber-900/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg">
                  <Clock size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Pending Checkout</p>
                  <p className="text-[10px] text-slate-500">{stats?.pendingCount || 0} invoice(s)</p>
                </div>
              </div>
              <h4 className="text-sm font-bold text-amber-600">${pendingVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 rounded-lg">
                  <DollarSign size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Active Treatment (Draft)</p>
                  <p className="text-[10px] text-slate-500">{stats?.draftCount || 0} invoice(s)</p>
                </div>
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">${draftVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
            </div>
          </CardContent>
        </Card>

        {/* Integration details */}
        <Card className="shadow-sm rounded-xl lg:col-span-2 border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-600" /> Automated Checkout Pipeline
                </CardTitle>
                <CardDescription>Polar Payments webhook checkout pipeline.</CardDescription>
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                Secure SSL
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <TrendingUp size={14} className="text-blue-600 animate-pulse" /> Unified Transaction Processing
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                MedFlow utilizes Polar checkout portals. When diagnostic lab files (X-Rays, MRI) are issued or compound drugs are dispensed, background queues automatically generate itemized ledger fees in cents, updating the patient's draft invoice. Once checked out, unified webhooks safely mark invoices as paid.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button asChild variant="outline" className="flex-1 rounded-lg h-9 text-xs">
                <Link to="/financial-history">
                  Go to Revenue Ledger
                </Link>
              </Button>
              <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs gap-1 shadow-blue-500/10">
                <Link to="/patients">
                  Audit Patient Accounts
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialRecords;
