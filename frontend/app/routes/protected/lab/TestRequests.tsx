import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllLabResults, createLabResult, getUsers } from "@/lib/api";
import { socket } from "@/lib/socket";
import { UploadDropzone } from "@/lib/uploadthing";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, PlusCircle, AlertCircle, CheckCircle, Image as ImageIcon, Eye } from "lucide-react";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import { format } from "date-fns";

export function meta() {
  return [{ title: "Lab Test Requests | MedFlow AI" }];
}

const TestRequests = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [testType, setTestType] = useState("X-Ray");
  const [bodyPart, setBodyPart] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Hook up to Socket.IO for real-time updates
  useEffect(() => {
    socket.connect();
    
    const handleLabResultSync = () => {
      queryClient.invalidateQueries({ queryKey: ["lab-test-requests"] });
    };

    socket.on("lab_result_added", handleLabResultSync);
    socket.on("lab_result_updated", handleLabResultSync);

    return () => {
      socket.off("lab_result_added", handleLabResultSync);
      socket.off("lab_result_updated", handleLabResultSync);
      socket.disconnect();
    };
  }, [queryClient]);

  // Query: Fetch all global lab results
  const { data: resultsData, isLoading: isLoadingResults, isError } = useQuery({
    queryKey: ["lab-test-requests", page],
    queryFn: () => getAllLabResults({ page, limit: 8 }),
    placeholderData: (previousData) => previousData,
  });

  // Query: Fetch patients list (for selector)
  const { data: patientsData } = useQuery({
    queryKey: ["lab-patients-selector"],
    queryFn: () => getUsers({ role: "patient", page: 1, limit: 100 }),
    enabled: isModalOpen,
  });

  // Mutation: Create lab request
  const createRequestMutation = useMutation({
    mutationFn: createLabResult,
    onSuccess: (res: any) => {
      toast.success("Lab request created successfully. AI Diagnostic & Billing jobs dispatched.");
      setIsModalOpen(false);
      
      // Reset form
      setSelectedPatientId("");
      setTestType("X-Ray");
      setBodyPart("");
      setImageUrl("");

      queryClient.invalidateQueries({ queryKey: ["lab-test-requests"] });
      queryClient.invalidateQueries({ queryKey: ["lab-results-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create lab request.");
    },
  });

  if (isLoadingResults) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Test Requests..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading lab test requests. Please refresh.
      </div>
    );
  }

  const results = resultsData?.res || [];
  const pagination = resultsData?.pagination;
  const patientsList = patientsData?.res || [];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !testType) {
      toast.error("Please fill out all required fields.");
      return;
    }

    if (testType === "X-Ray" && !imageUrl) {
      toast.error("Please upload an X-ray scan image.");
      return;
    }

    createRequestMutation.mutate({
      patientId: selectedPatientId,
      testType,
      bodyPart,
      imageUrl,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reviewed":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1 hover:bg-emerald-100/80">
            <CheckCircle size={10} /> Reviewed
          </Badge>
        );
      case "analyzed":
        return (
          <Badge className="bg-blue-100 text-blue-700 border border-blue-200 gap-1 hover:bg-blue-100/80">
            <FlaskConical size={10} /> AI Analyzed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-1 hover:bg-amber-100/80 animate-pulse">
            <AlertCircle size={10} /> Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Lab Test Requests
          </h1>
          <p className="text-slate-500 font-medium">
            Monitor and issue diagnostic laboratory test orders and review real-time processing statuses.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 gap-1.5 text-xs"
        >
          <PlusCircle size={14} /> New Test Request
        </Button>
      </div>

      {/* Main Datatable */}
      <Card className="shadow-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Laboratory Queue</CardTitle>
          <CardDescription>
            Audit active medical laboratory procedures.
          </CardDescription>
        </CardHeader>
        <CardContent className="">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56 pl-6 font-bold">Patient Details</TableHead>
                  <TableHead className="font-bold text-center">Test Category</TableHead>
                  <TableHead className="font-bold text-center">Anatomical Target</TableHead>
                  <TableHead className="font-bold text-center">Test Scan Image</TableHead>
                  <TableHead className="font-bold text-center">Date Requested</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-40 text-center text-slate-400 italic"
                    >
                      No test requests found in the queue.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((res: any) => (
                    <TableRow
                      key={res._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {res.patient?.name || "Unknown Patient"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {res.patient?.email || "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs text-slate-600 dark:text-slate-400">
                        {res.testType}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500 font-medium">
                        {res.bodyPart || "General"}
                      </TableCell>
                      <TableCell className="text-center">
                        {res.imageUrl ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <ImageIcon size={14} className="text-blue-500" />
                            <a
                              href={res.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                            >
                              Scan Image <Eye size={10} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 italic">No image</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500 font-medium">
                        {res.createdAt ? format(new Date(res.createdAt), "MMM dd, yyyy") : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(res.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <CustomPagination
              loading={isLoadingResults}
              totalPages={pagination?.totalPages || 0}
              currentPage={pagination?.currentPage || 0}
              setPage={setPage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Request Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="text-blue-600" size={20} />
              New Test Request Form
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Patient selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Patient Details</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId} required>
                <SelectTrigger className="rounded-lg text-xs h-9">
                  <SelectValue placeholder="Select Admitted Patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patientsList.map((patient: any) => (
                    <SelectItem key={patient._id} value={patient._id} className="text-xs">
                      {patient.name} ({patient.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Test Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Test Type</Label>
                <Select value={testType} onValueChange={setTestType} required>
                  <SelectTrigger className="rounded-lg text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X-Ray" className="text-xs">X-Ray (AI Enabled)</SelectItem>
                    <SelectItem value="MRI" className="text-xs">MRI Scan</SelectItem>
                    <SelectItem value="Blood Test" className="text-xs">Blood Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Body Part */}
              <div className="space-y-1.5">
                <Label htmlFor="body-part" className="text-xs font-bold">
                  Anatomical Target
                </Label>
                <Input
                  id="body-part"
                  placeholder="e.g. Chest, Brain, Knee"
                  value={bodyPart}
                  onChange={(e) => setBodyPart(e.target.value)}
                  className="rounded-lg h-9 text-xs"
                />
              </div>
            </div>

            {/* Scan Image Upload */}
            {testType === "X-Ray" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Radiology Scan File (.jpg/.png)</Label>
                {imageUrl ? (
                  <div className="relative border rounded-xl overflow-hidden aspect-video group">
                    <img src={imageUrl} alt="Scan preview" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 h-7 text-[10px] rounded-lg"
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-xl p-4 bg-slate-50 dark:bg-slate-900/30 flex flex-col items-center">
                    <UploadDropzone
                      endpoint="imageUploader"
                      onUploadBegin={() => setIsUploading(true)}
                      onClientUploadComplete={(res: any) => {
                        setIsUploading(false);
                        if (res && res[0]) {
                          setImageUrl(res[0].url);
                          toast.success("X-Ray scan file uploaded successfully.");
                        }
                      }}
                      onUploadError={(error: Error) => {
                        setIsUploading(false);
                        toast.error(`Upload error: ${error.message}`);
                      }}
                      className="ut-label:text-xs ut-button:text-xs ut-button:bg-blue-600 ut-button:hover:bg-blue-700 cursor-pointer w-full text-xs"
                    />
                  </div>
                )}
              </div>
            )}

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
                disabled={createRequestMutation.isPending || isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs gap-1"
              >
                {createRequestMutation.isPending ? <Loader label="Fulfilling..." /> : "Issue Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestRequests;
