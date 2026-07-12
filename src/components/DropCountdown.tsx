import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  targetDate: string | Date;
  label?: string;
  onExpire?: () => void;
  compact?: boolean;
}

/** Élő countdown drop-okhoz — másodperc pontossággal frissül. */
export default function DropCountdown({ targetDate, label, onExpire, compact }: Props) {
  const target = typeof targetDate === "string" ? new Date(targetDate).getTime() : targetDate.getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, target - now);
  const expired = diff <= 0;

  useEffect(() => { if (expired && onExpire) onExpire(); /* eslint-disable-next-line */ }, [expired]);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  if (compact) {
    return (
      <span className={`font-mono text-sm ${expired ? "text-destructive" : ""}`}>
        {expired ? "LEJÁRT" : `${String(days).padStart(2,"0")}:${String(hours).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`}
      </span>
    );
  }

  const cell = (n: number, l: string) => (
    <div className="flex flex-col items-center min-w-[56px]">
      <div className="text-3xl md:text-5xl font-black tabular-nums leading-none">{String(n).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{l}</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {label}
        </div>
      )}
      {expired ? (
        <div className="text-2xl font-bold text-destructive">🚨 ÉLŐ MOST!</div>
      ) : (
        <div className="flex items-end gap-4">
          {cell(days, "nap")}
          <span className="text-3xl md:text-5xl font-black text-muted-foreground pb-6 md:pb-8">:</span>
          {cell(hours, "óra")}
          <span className="text-3xl md:text-5xl font-black text-muted-foreground pb-6 md:pb-8">:</span>
          {cell(mins, "perc")}
          <span className="text-3xl md:text-5xl font-black text-muted-foreground pb-6 md:pb-8">:</span>
          {cell(secs, "mp")}
        </div>
      )}
    </div>
  );
}
