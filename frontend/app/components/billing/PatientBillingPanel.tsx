import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyActiveInvoice,
  createCheckoutSession,
  confirmPolarCheckout,
  getBillingHistory,
  getMyPaymentHistory,
} from "@/lib/api";
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
  CreditCard,
  Receipt,
  History,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import Loader from "@/components/global/Loader";
import { socket } from "@/lib/socket";

type PatientBillingPanelProps = {
  patientId: string;
  /** Logged-in user is the patient viewing their own bill */
  canPay: boolean;
  patientStatus?: string;
};

export default function PatientBillingPanel({
  patientId,
  canPay,
  patientStatus,
}: PatientBillingPanelProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: invoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
    refetch: refetchInvoice,
  } = useQuery({
    queryKey: ["my-invoice", patientId],
    queryFn: () =>
      getMyActiveInvoice(canPay ? undefined : patientId),
    enabled: !!patientId,
  });

  const { data: billingHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["billing-history", patientId],
    queryFn: () => getBillingHistory(patientId),
    enabled: !!patientId,
  });

  const { data: polarPayments } = useQuery({
    queryKey: ["my-payments", patientId],
    queryFn: () => getMyPaymentHistory({ page: 1, limit: 20 }),
    enabled: !!canPay,
  });

  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      toast.error("No checkout URL returned. Check Polar configuration.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to start secure checkout");
    },
  });

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    const checkoutId = searchParams.get("checkout_id");

    const syncAfterReturn = async () => {
      if (checkoutId) {
        try {
          await confirmPolarCheckout(checkoutId);
        } catch {
          /* webhook may have already synced */
        }
      }
      queryClient.invalidateQueries({ queryKey: ["my-invoice", patientId] });
      queryClient.invalidateQueries({ queryKey: ["billing-history", patientId] });
      queryClient.invalidateQueries({ queryKey: ["my-payments", patientId] });
      queryClient.invalidateQueries({ queryKey: ["financial-records-stats"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-overview"] });
    };

    if (checkoutStatus === "success") {
      void syncAfterReturn().then(() => {
        toast.success("Payment received. Your bill has been updated.");
      });
      searchParams.delete("checkout");
      searchParams.delete("checkout_id");
      setSearchParams(searchParams, { replace: true });
    } else if (checkoutStatus === "cancelled") {
      toast.message("Payment was cancelled. You can try again when ready.");
      searchParams.delete("checkout");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient, patientId]);

  useEffect(() => {
    if (!canPay) return;
    if (!socket.connected) socket.connect();
    const refresh = () => {
      refetchInvoice();
      queryClient.invalidateQueries({ queryKey: ["billing-history", patientId] });
      queryClient.invalidateQueries({ queryKey: ["my-payments", patientId] });
    };
    socket.on("payment_received", refresh);
    return () => {
      socket.off("payment_received", refresh);
    };
  }, [canPay, patientId, queryClient, refetchInvoice]);

  const isDischarged = patientStatus === "discharged";
  const hasPayableInvoice =
    !!invoice && invoice.status !== "paid" && (invoice.totalAmount || 0) > 0;
  const canCheckout = canPay && hasPayableInvoice && !checkoutMutation.isPending;

  if (invoiceLoading) {
    return <Loader label="Loading hospital bill..." />;
  }

  return (
    <div className="space-y-6">
      <Card className="card shadow-sm overflow-hidden border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Hospital Bill</CardTitle>
                <CardDescription>
                  Review itemized charges and pay securely via Polar
                </CardDescription>
              </div>
            </div>
            {invoice && (
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Amount due
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  ${((invoice.totalAmount || 0) / 100).toFixed(2)}
                </p>
                <Badge variant="outline" className="mt-1 capitalize text-[10px]">
                  {invoice.status.replace("_", " ")}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoiceError && canPay && (
            <p className="text-sm text-red-500 text-center py-4">
              Could not load your bill. Please refresh the page.
            </p>
          )}

          {!invoice && !invoiceLoading && !invoiceError && (
            <div className="text-center py-8 space-y-2">
              <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500 font-medium">No active bill</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Charges from pharmacy, lab, or other services will appear here as
                they are added to your account.
              </p>
            </div>
          )}

          {invoice && (
            <>
              <div className="rounded-lg border divide-y text-sm">
                {(invoice.items?.length ? invoice.items : []).map(
                  (item: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between gap-4 px-4 py-3"
                    >
                      <span className="text-slate-700 dark:text-slate-300">
                        {item.description}
                        {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      </span>
                      <span className="font-semibold shrink-0">
                        ${((item.totalPrice || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  ),
                )}
                {(!invoice.items || invoice.items.length === 0) && (
                  <p className="px-4 py-3 text-slate-400 italic text-xs">
                    No line items yet.
                  </p>
                )}
              </div>

              {invoice.status === "paid" ? (
                <Badge className="w-full justify-center py-2.5 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  This bill is paid in full
                </Badge>
              ) : canPay ? (
                <div className="space-y-3">
                  {!isDischarged && (
                    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-200">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        You can pay your current balance online. If you are still
                        admitted, additional charges may be added until discharge.
                      </p>
                    </div>
                  )}
                  <Button
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base font-semibold"
                    disabled={!canCheckout}
                    onClick={() => checkoutMutation.mutate(invoice._id)}
                  >
                    {checkoutMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        Opening secure checkout…
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Pay ${((invoice.totalAmount || 0) / 100).toFixed(2)} with Polar
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-slate-400">
                    You will be redirected to Polar&apos;s secure payment page. Only
                    patients can complete checkout.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-center text-slate-500 py-2">
                  Sign in as this patient to pay this bill.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-slate-400" />
            Payment History
          </CardTitle>
          <CardDescription>Previous settled bills and Polar transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin h-6 w-6 text-slate-300" />
            </div>
          ) : (!billingHistory || billingHistory.length === 0) &&
            (!polarPayments?.res || polarPayments.res.length === 0) ? (
            <p className="text-center text-slate-400 text-sm py-6 italic border border-dashed rounded-lg">
              No payment history yet.
            </p>
          ) : (
            <div className="space-y-3">
              {polarPayments?.res?.map((payment: any) => (
                <div
                  key={payment._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20"
                >
                  <div>
                    <p className="text-sm font-bold">
                      ${(payment.amount / 100).toFixed(2)}{" "}
                      <span className="text-[10px] uppercase text-slate-400">
                        {payment.currency}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {payment.status} •{" "}
                      {new Date(
                        payment.paidAt || payment.createdAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      payment.status === "succeeded"
                        ? "bg-green-100 text-green-700"
                        : ""
                    }
                  >
                    Polar
                  </Badge>
                </div>
              ))}
              {billingHistory?.map((pastInv: any) => (
                <div
                  key={pastInv._id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-900/30"
                >
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      ${(pastInv.totalAmount / 100).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Invoice paid •{" "}
                      {new Date(pastInv.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
