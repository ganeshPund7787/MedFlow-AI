import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { searchWithNaturalLanguage } from "@/lib/api";
import { useNavigate } from "react-router";

const routeMap: Record<string, string> = {
  user: "/patients",
  invoice: "/financial-history",
  appointment: "/appointments",
};

export default function NLSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const searchMutation = useMutation({
    mutationFn: searchWithNaturalLanguage,
  });

  const results = searchMutation.data?.data?.results || [];
  const collection = searchMutation.data?.data?.collection;

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Search className="h-4 w-4" />
        AI Search
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="AI Natural Language Search"
        description="Search hospital data using plain language"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Show diabetic patients admitted this month..."
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim().length >= 5) {
                searchMutation.mutate({ query: query.trim(), limit: 20 });
              }
            }}
          />
          <CommandList>
            {searchMutation.isPending && (
              <div className="py-4 px-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running AI query...
              </div>
            )}
            {!searchMutation.isPending && !results.length && (
              <CommandEmpty>
                Press enter to run AI search. Results appear here.
              </CommandEmpty>
            )}
            {!!results.length && (
              <CommandGroup heading={searchMutation.data?.data?.summary || "Results"}>
                {results.map((row: any, index: number) => (
                  <CommandItem
                    key={row._id || index}
                    onSelect={() => {
                      navigate(routeMap[collection || "user"] || "/dashboard");
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">
                      {row.name ||
                        row.email ||
                        row.reason ||
                        row.status ||
                        row._id ||
                        "Open result"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
