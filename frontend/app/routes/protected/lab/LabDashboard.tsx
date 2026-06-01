import { useQuery } from "@tanstack/react-query";
import { getAllLabResults } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { FlaskConical, FileCheck2, Clock, CheckCircle2, PlusCircle, ArrowUpRight, ShieldCheck } from "lucide-react";
import Loader from "@/components/global/Loader";

export function meta() {
  return [{ title: "Laboratory Dashboard | MedFlow AI" }];
}

const LabDashboard = () => {
  // Query all results to calculate statistics
  const { data, isLoading } = useQuery({
    queryKey: ["lab-results-stats"],
    queryFn: () => getAllLabResults({ page: 1, limit: 100 }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Laboratory Dashboard..." />
      </div>
    );
  }

  const results = data?.res || [];

  const totalTests = results.length;
  const pendingTests = results.filter((r: any) => r.status === "pending").length;
  const analyzedTests = results.filter((r: any) => r.status === "analyzed").length;
  const reviewedTests = results.filter((r: any) => r.status === "reviewed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Laboratory Analytics
          </h1>
          <p className="text-slate-500 font-medium">
            Track diagnostic pipelines, evaluate AI-assisted radiological reviews, and sign off results.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 gap-1.5 text-xs">
            <Link to="/lab/requests">
              <PlusCircle size={14} /> Request New Test
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Procedures</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalTests}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-xl">
              <FlaskConical size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending Analysis</p>
              <h3 className="text-2xl font-black text-amber-600">{pendingTests}</h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">AI Evaluated</p>
              <h3 className="text-2xl font-black text-blue-600">{analyzedTests}</h3>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 rounded-xl">
              <FileCheck2 size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Doctor Reviewed</p>
              <h3 className="text-2xl font-black text-emerald-600">{reviewedTests}</h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operations */}
        <Card className="shadow-sm rounded-xl lg:col-span-1 border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">Lab Operations</CardTitle>
            <CardDescription>Shortcut portals for diagnostic reviews.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/lab/requests" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 border rounded-xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <FlaskConical size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Test Requests</p>
                  <p className="text-[10px] text-slate-500">Order, upload, and queue tests</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>

            <Link to="/lab/results" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 border rounded-xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <FileCheck2 size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Results Entry</p>
                  <p className="text-[10px] text-slate-500">Verify AI reviews & sign off</p>
                </div>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </Link>
          </CardContent>
        </Card>

        {/* AI Turnaround Panel */}
        <Card className="shadow-sm rounded-xl lg:col-span-2 border border-slate-100 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-600" /> AI Diagnostic Assistant
                </CardTitle>
                <CardDescription>Real-time machine learning multimodal radiology stats.</CardDescription>
              </div>
              <Badge className="bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                Active preview
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50/30 dark:bg-blue-950/5 border border-blue-100/50 dark:border-blue-900/10 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400">Gemini-3 Multimodal Engine</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Once a radiographic JPEG is uploaded via MedFlow uploadthing portals, the system automatically registers a background worker that fetches the file, parses pixels using the multimodal Vision neural net, and returns detailed diagnostic suggestions alongside itemized patient ledger fees within seconds.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Queue Size</span>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">{pendingTests} tests</p>
              </div>
              <div className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase">AI Load</span>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">0% delay</p>
              </div>
              <div className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Rate</span>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">$150 / test</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LabDashboard;
