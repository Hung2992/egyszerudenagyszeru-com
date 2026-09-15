// Egységes AI parancsmező: bárhonnan megnyitja a teljes képernyős AI Studio
// oldalt (/partner/ai-studio) a beírt utasítással, ahol a módosítások a valódi
// webshopra kerülnek.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

interface Props {
  /** Rövid, egysoros változat (pl. előnézet fölé) */
  compact?: boolean;
  title?: string;
  placeholder?: string;
  examples?: string[];
  className?: string;
}

const DEFAULT_EXAMPLES = [
  "Írd át a nyitóképet karácsonyi hangulatúra",
  "Legyen letisztultabb, kevesebb szín",
  "Készíts akciós szekciót a főoldalra",
];

const AiStudioPromptLauncher = ({
  compact = false,
  title = "Mit változtassunk a webshopon?",
  placeholder = "Írd le magyarul, és az AI Studio megépíti…",
  examples = DEFAULT_EXAMPLES,
  className = "",
}: Props) => {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const open = (text?: string) => {
    const q = (text ?? value).trim();
    navigate(q ? `/partner/ai-studio?prompt=${encodeURIComponent(q)}` : "/partner/ai-studio");
  };

  return (
    <div className={`border border-primary/40 bg-background p-3 space-y-2 ${className}`}>
      {!compact && (
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
      )}
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => { e.preventDefault(); open(); }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="AI parancs a webshophoz"
          className="min-w-0 flex-1 h-10 border border-border bg-background px-3 text-sm"
        />
        <Button type="submit" className="rounded-none h-10 shrink-0">
          <Sparkles className="h-4 w-4 mr-2" /> AI Studio
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </form>
      {!compact && examples.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => open(ex)}
              className="text-[11px] border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiStudioPromptLauncher;
