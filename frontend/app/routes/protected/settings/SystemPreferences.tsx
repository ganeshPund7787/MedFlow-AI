import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sliders, Sun, Moon, Sparkles } from "lucide-react";

const SystemPreferences = () => {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Load preferences from local storage or document body
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    const savedDensity = localStorage.getItem("ui-density") as "comfortable" | "compact";
    if (savedDensity) {
      setDensity(savedDensity);
    }
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    toast.success(`Theme switched to ${newTheme} mode.`);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("ui-density", density);
    toast.success("Preferences updated locally.");
  };

  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
          <Sliders size={20} className="text-blue-600 animate-spin-slow" />
          System Preferences
        </CardTitle>
        <CardDescription>
          Customize your local workspace interface, toggle dark modes, and adjust typography details.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSavePreferences} className="space-y-6 max-w-lg">
        {/* Dark/Light mode toggle */}
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
          <Label className="text-xs font-bold block mb-1">Color Theme Overrides</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => toggleTheme("light")}
              className="flex items-center gap-2 h-9 rounded-lg text-xs font-semibold px-4"
            >
              <Sun size={14} /> Light Mode
            </Button>
            <Button
              type="button"
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => toggleTheme("dark")}
              className="flex items-center gap-2 h-9 rounded-lg text-xs font-semibold px-4"
            >
              <Moon size={14} /> Dark Mode
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Toggle between premium light and elegant system dark styling overrides.
          </p>
        </div>

        {/* Dense / Compact view toggles */}
        <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
          <div className="flex items-start gap-3">
            <Sparkles className="text-blue-600 mt-0.5" size={18} />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="density-select" className="text-xs font-bold">Workspace Density</Label>
              <Select value={density} onValueChange={(val: any) => setDensity(val)}>
                <SelectTrigger id="density-select" className="rounded-lg text-xs h-9 max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable" className="text-xs">Comfortable (Default)</SelectItem>
                  <SelectItem value="compact" className="text-xs">Compact Layout</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-400">
                Adjusts standard spacing in clinical dashboards for high-resolution displays.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 text-xs font-bold shadow-blue-500/10"
          >
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SystemPreferences;
