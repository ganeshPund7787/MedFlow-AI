import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPharmacyInventory, addPharmacyMedication } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pill, PlusCircle, AlertCircle, ShoppingCart } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import GlobalSearch from "@/components/global/GlobalSearch";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Medication Inventory | MedFlow AI" }];
}

const Inventory = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [priceInCents, setPriceInCents] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pharmacy-inventory", page, search],
    queryFn: () => getPharmacyInventory({ page, limit: 8, search }),
    placeholderData: (previousData) => previousData,
  });

  const updateInventoryMutation = useMutation({
    mutationFn: addPharmacyMedication,
    onSuccess: (res: any) => {
      toast.success(res.message || "Inventory updated successfully.");
      setIsModalOpen(false);
      
      // Reset form
      setName("");
      setCode("");
      setDescription("");
      setStock("");
      setPriceInCents("");

      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy-inventory-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update inventory.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Inventory..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading Pharmacy inventory. Please refresh.
      </div>
    );
  }

  const medications = data?.res || [];
  const pagination = data?.pagination;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !priceInCents) {
      toast.error("Please fill out all required fields.");
      return;
    }

    updateInventoryMutation.mutate({
      name,
      code,
      description,
      stock: Number(stock || 0),
      priceInCents: Math.round(Number(priceInCents) * 100), // Convert to cents
    });
  };

  const getStockBadge = (count: number) => {
    if (count === 0) {
      return (
        <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1 hover:bg-red-100/80">
          <AlertCircle size={10} /> Out of Stock
        </Badge>
      );
    }
    if (count < 15) {
      return (
        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-1 hover:bg-amber-100/80">
          <AlertCircle size={10} /> Low Stock
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 hover:bg-emerald-100/80">
        Active
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Medication Inventory
          </h1>
          <p className="text-slate-500 font-medium">
            Manage your formulas list, barcode catalog codes, available stock units, and retail pricing.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 gap-1.5 text-xs"
        >
          <PlusCircle size={14} /> Add Stock Item
        </Button>
      </div>

      {/* Main Catalog Cards/Table */}
      <Card className="shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Medication Catalog</CardTitle>
            <CardDescription>
              Fulfill, restock, and audit real-time inventory counts.
            </CardDescription>
          </div>
          <GlobalSearch
            search={search}
            setSearch={setSearch}
            title="Search medication..."
          />
        </CardHeader>
        <CardContent className="">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56 pl-6 font-bold">Medication Name</TableHead>
                  <TableHead className="font-bold text-center">SKU / Code</TableHead>
                  <TableHead className="font-bold text-center">Stock units</TableHead>
                  <TableHead className="font-bold text-center">Unit Price</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="text-right pr-6 font-bold">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-40 text-center text-slate-400 italic"
                    >
                      No medications found in the catalog.
                    </TableCell>
                  </TableRow>
                ) : (
                  medications.map((med: any) => (
                    <TableRow
                      key={med._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-lg">
                            <Pill size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {med.name}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                              {med.description || "No description provided"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-slate-500 font-semibold">
                        {med.code}
                      </TableCell>
                      <TableCell className="text-center text-sm font-black text-slate-700 dark:text-slate-300">
                        {med.stock} <span className="text-[10px] text-slate-400 font-normal">unit(s)</span>
                      </TableCell>
                      <TableCell className="text-center text-sm font-black text-slate-900 dark:text-white">
                        ${(med.priceInCents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStockBadge(med.stock)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setName(med.name);
                            setCode(med.code);
                            setDescription(med.description || "");
                            setPriceInCents((med.priceInCents / 100).toString());
                            setStock("");
                            setIsModalOpen(true);
                          }}
                          className="h-8 gap-1 rounded-lg"
                        >
                          <ShoppingCart size={12} /> Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <CustomPagination
              loading={isLoading}
              totalPages={pagination?.totalPages || 0}
              currentPage={pagination?.currentPage || 0}
              setPage={setPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Medication Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="text-blue-600 animate-bounce" size={20} />
              Manage Inventory Stock
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="med-name" className="text-xs font-bold">
                Medication Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="med-name"
                placeholder="e.g., Amoxicillin 500mg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg h-9 text-xs"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="med-code" className="text-xs font-bold">
                  SKU / Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="med-code"
                  placeholder="e.g., SKU-AMOX-500"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="med-price" className="text-xs font-bold">
                  Unit Retail Price ($) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="med-price"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 12.50"
                  value={priceInCents}
                  onChange={(e) => setPriceInCents(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-stock" className="text-xs font-bold">
                Add Units to Stock <span className="text-red-500">*</span>
              </Label>
              <Input
                id="med-stock"
                type="number"
                placeholder="e.g., 50"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="rounded-lg h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-desc" className="text-xs font-bold">
                Description / Clinical details
              </Label>
              <Textarea
                id="med-desc"
                placeholder="Enter drug instructions, storage conditions or classifications..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg min-h-[70px] text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg h-9 text-xs"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateInventoryMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs gap-1"
              >
                {updateInventoryMutation.isPending ? <Loader label="Saving..." /> : "Save Medication"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
