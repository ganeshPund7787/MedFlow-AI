import { useQuery } from "@tanstack/react-query";
import { getPharmacyInventory, getPrescriptions } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { Pill, ClipboardList, PackageCheck, AlertCircle, ShoppingBag, PlusCircle, ArrowUpRight } from "lucide-react";
import Loader from "@/components/global/Loader";

export function meta() {
  return [{ title: "Pharmacy Dashboard | MedFlow AI" }];
}

const PharmacyDashboard = () => {
  // Query inventory to see total and low-stock meds
  const { data: inventoryData, isLoading: isLoadingInv } = useQuery({
    queryKey: ["pharmacy-inventory-stats"],
    queryFn: () => getPharmacyInventory({ page: 1, limit: 100 }),
  });

  // Query prescriptions to see pending ones
  const { data: prescriptionData, isLoading: isLoadingPres } = useQuery({
    queryKey: ["pharmacy-prescription-stats"],
    queryFn: () => getPrescriptions({ page: 1, limit: 100 }),
  });

  if (isLoadingInv || isLoadingPres) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Pharmacy Dashboard..." />
      </div>
    );
  }

  const meds = inventoryData?.res || [];
  const prescriptions = prescriptionData?.res || [];

  const totalMedsCount = meds.length;
  const lowStockMeds = meds.filter((m: any) => m.stock < 15);
  const totalStockItems = meds.reduce((sum: number, m: any) => sum + (m.stock || 0), 0);

  const pendingPres = prescriptions.filter((p: any) => p.status === "pending");
  const dispensedPres = prescriptions.filter((p: any) => p.status === "dispensed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Pharmacy Control Center
          </h1>
          <p className="text-slate-500 font-medium">
            Manage medical formulas, track inventory stock levels, and dispense doctor prescriptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 gap-1.5 text-xs">
            <Link to="/pharmacy/prescriptions">
              <PlusCircle size={14} /> Create Prescription
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Formula Types</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalMedsCount}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-xl">
              <Pill size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Stock</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalStockItems} <span className="text-xs text-slate-400 font-normal">units</span></h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
              <ShoppingBag size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending Orders</p>
              <h3 className="text-2xl font-black text-amber-600">{pendingPres.length}</h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
              <ClipboardList size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Dispensed Today</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{dispensedPres.length}</h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 rounded-xl">
              <PackageCheck size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation & Shortcuts */}
        <Card className="shadow-sm rounded-xl lg:col-span-1 border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">Quick Operations</CardTitle>
            <CardDescription>Shortcut portals for pharmacy staff.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/pharmacy/dispense" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border rounded-xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <ClipboardList size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Dispense Drugs</p>
                  <p className="text-[10px] text-slate-500">Fulfill physician prescriptions</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>

            <Link to="/pharmacy/inventory" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 border rounded-xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <ShoppingBag size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Manage Stock</p>
                  <p className="text-[10px] text-slate-500">Track medication inventory list</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </Link>

            <Link to="/pharmacy/prescriptions" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 border rounded-xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Pill size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">All Prescriptions</p>
                  <p className="text-[10px] text-slate-500">Review historical files catalog</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="shadow-sm rounded-xl lg:col-span-2 border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-500 animate-pulse" /> Critical Stock Levels
                </CardTitle>
                <CardDescription>Medications requiring immediate replenishment order.</CardDescription>
              </div>
              <Badge className="bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30">
                {lowStockMeds.length} Warning(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto pr-1">
            {lowStockMeds.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic text-xs">
                All medications are adequately stocked.
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockMeds.map((med: any) => (
                  <div key={med._id} className="flex justify-between items-center p-3 bg-red-50/20 dark:bg-red-950/5 border border-red-100/50 dark:border-red-900/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                        <Pill size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{med.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono">SKU: {med.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-600">{med.stock} units</p>
                        <p className="text-[9px] text-slate-400">Restock recommended</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 text-[10px] rounded-lg">
                        <Link to="/pharmacy/inventory">Restock</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
