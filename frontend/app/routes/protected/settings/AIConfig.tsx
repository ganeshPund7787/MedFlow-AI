import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/global/Loader";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldAlert,
  Cpu,
  Thermometer,
  HelpCircle,
} from "lucide-react";

const AIConfig = () => {
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (res: any) => {
      toast.success(res.message || "AI configurations saved.");
      queryClient.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings.");
    },
  });

  // Local Form State
  const [aiModelName, setAiModelName] = useState("gemini-2.0-flash");
  const [aiTemperature, setAiTemperature] = useState(0.2);
  const [aiTriageInstructions, setAiTriageInstructions] = useState("");

  // Sync state on load
  useEffect(() => {
    if (config) {
      setAiModelName(config.aiModelName || "gemini-2.5-flash");
      setAiTemperature(config.aiTemperature ?? 0.2);
      setAiTriageInstructions(config.aiTriageInstructions || "");
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader label="Loading AI Settings..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-red-500 gap-2">
        <ShieldAlert size={24} />
        <p className="text-sm font-semibold">
          Failed to load AI configurations.
        </p>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiTemperature < 0 || aiTemperature > 2) {
      toast.error("Temperature value must range from 0 to 2.");
      return;
    }
    if (!aiTriageInstructions.trim()) {
      toast.error("Please enter triage reasoning prompt templates.");
      return;
    }

    updateMutation.mutate({
      aiModelName,
      aiTemperature: Number(aiTemperature),
      aiTriageInstructions,
    });
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <Sparkles size={20} className="text-blue-600 animate-pulse" />
          AI Brain & Prompt Configurations
        </CardTitle>
        <CardDescription>
          Customize model templates, triage algorithms, reasoning heat indexes,
          and standard operating prompts.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {/* AI Model Name */}
            <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="text-blue-600" size={16} />
                <Label htmlFor="model-name" className="text-xs font-bold">
                  Standard LLM Model Selection
                </Label>
              </div>
              <Select value={aiModelName} onValueChange={setAiModelName}>
                <SelectTrigger
                  id="model-name"
                  className="rounded-lg text-xs h-9 bg-white dark:bg-slate-950"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.5-flash" className="text-xs">
                    gemini-2.0-flash
                  </SelectItem>
                  <SelectItem value="gemini-2.5-pro" className="text-xs">
                    Gemini 2.5 Pro
                  </SelectItem>
                  <SelectItem value="gemini-1.5-flash" className="text-xs">
                    Gemini 1.5 Flash (Legacy)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-400 mt-1">
                Selects the neural engine powering automated analysis and
                real-time medical triage routing.
              </p>
            </div>

            {/* AI Temperature */}
            <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Thermometer className="text-amber-500" size={16} />
                <Label htmlFor="temp" className="text-xs font-bold">
                  Model Temperature (Creativity Heat)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="temp"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  placeholder="0.2"
                  value={aiTemperature}
                  onChange={(e) => setAiTemperature(Number(e.target.value))}
                  className="rounded-lg h-9 text-xs"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Lower values (0.1 - 0.3) provide highly consistent clinical
                triage. Higher values increase clinical reasoning randomness.
              </p>
            </div>
          </div>

          {/* AI Triage Prompt Template */}
          <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl max-w-2xl">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="text-indigo-600" size={16} />
              <Label htmlFor="prompt-rules" className="text-xs font-bold">
                Triage Reasoning Prompt Instructions & Constraints
              </Label>
            </div>
            <Textarea
              id="prompt-rules"
              placeholder="Inject symptoms, check clinical histories, select doctors..."
              value={aiTriageInstructions}
              onChange={(e) => setAiTriageInstructions(e.target.value)}
              className="rounded-lg min-h-[100px] text-xs leading-relaxed"
              required
            />
            <p className="text-[10px] text-slate-400">
              Defines system-level context injected prior to matching patients
              with attending clinical specialists.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs font-bold shadow-blue-500/10 animate-pulse-slow"
          >
            {updateMutation.isPending ? (
              <Loader label="Saving..." />
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AIConfig;
