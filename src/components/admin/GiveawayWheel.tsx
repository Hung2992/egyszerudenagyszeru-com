import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RotateCcw, Trophy } from "lucide-react";
import { sendAppEmail } from "@/lib/app-email";

const COLORS = [
  "#c9a84c", "#1a1a1a", "#333333", "#b8860b",
  "#2d2d2d", "#d4a84c", "#444444", "#8b7355",
];

const GiveawayWheel = () => {
  const [emails, setEmails] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    const { data } = await supabase
      .from("giveaway_entries")
      .select("email")
      .order("created_at", { ascending: true });
    if (data) {
      setEmails(data.map((d: any) => d.email));
    }
  };

  useEffect(() => {
    drawWheel();
  }, [emails, rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || emails.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const sliceAngle = (2 * Math.PI) / emails.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-center, -center);

    emails.forEach((email, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(8, Math.min(12, 300 / emails.length))}px 'Space Grotesk', sans-serif`;
      const label = email.length > 18 ? email.substring(0, 16) + "…" : email;
      ctx.fillText(label, radius - 15, 4);
      ctx.restore();
    });

    ctx.restore();

    // Draw pointer (triangle at top)
    ctx.beginPath();
    ctx.moveTo(center - 15, 5);
    ctx.lineTo(center + 15, 5);
    ctx.lineTo(center, 30);
    ctx.closePath();
    ctx.fillStyle = "#c9a84c";
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.strokeStyle = "#c9a84c";
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const spin = () => {
    if (emails.length === 0) {
      toast.error("Nincsenek feliratkozók!");
      return;
    }
    if (spinning) return;

    setSpinning(true);
    setWinner(null);

    const winnerIndex = Math.floor(Math.random() * emails.length);
    const sliceAngle = 360 / emails.length;
    // Calculate target: we want the winner slice to land at the top (pointer)
    // The pointer is at 0° (top). Slices start from 3 o'clock (0°) going clockwise.
    // Canvas 0° is at 3 o'clock, pointer is at 270° in canvas terms.
    const targetAngle = 360 - (winnerIndex * sliceAngle + sliceAngle / 2) + 270;
    const totalRotation = 360 * 8 + targetAngle; // 8 full spins + target

    const startRotation = rotation % 360;
    const endRotation = startRotation + totalRotation;
    const duration = 5000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (endRotation - startRotation) * eased;
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(endRotation);
        setSpinning(false);
        setWinner(emails[winnerIndex]);
        toast.success(`🎉 A nyertes: ${emails[winnerIndex]}`);
      }
    };

    requestAnimationFrame(animate);
  };

  const markWinner = async () => {
    if (!winner) return;
    await supabase
      .from("giveaway_entries")
      .update({ is_winner: true })
      .eq("email", winner);

    // Send winner email
    try {
      await sendAppEmail({
        templateName: "giveaway-winner",
        recipientEmail: winner,
        idempotencyKey: `giveaway-winner-${winner}`,
      });
      toast.success(`${winner} megjelölve nyertesként és e-mail elküldve!`);
    } catch (emailError) {
      console.error("Giveaway winner email error:", emailError);
      toast.error("A nyertes mentve lett, de az e-mail küldése nem sikerült.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <h2 className="text-2xl font-bold text-foreground tracking-tight">
        Nyereményjáték Sorsolókerék
      </h2>
      <p className="text-sm text-muted-foreground">
        {emails.length} feliratkozott e-mail
      </p>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="max-w-full"
          style={{ maxWidth: "400px", maxHeight: "400px" }}
        />
      </div>

      <div className="flex gap-3">
        <Button
          onClick={spin}
          disabled={spinning || emails.length === 0}
          className="rounded-none uppercase tracking-[0.15em] text-xs bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8 h-12"
        >
          <RotateCcw className={`h-4 w-4 mr-2 ${spinning ? "animate-spin" : ""}`} />
          {spinning ? "Pörgetés..." : "Pörgetés!"}
        </Button>
        <Button
          onClick={fetchEmails}
          variant="outline"
          className="rounded-none h-12"
        >
          Frissítés
        </Button>
      </div>

      {winner && (
        <div className="bg-accent/10 border-2 border-accent p-6 text-center w-full max-w-md animate-fade-in">
          <Trophy className="h-10 w-10 text-accent mx-auto mb-3" />
          <p className="text-lg font-bold text-foreground mb-1">🎉 A nyertes:</p>
          <p className="text-accent font-bold text-xl mb-4">{winner}</p>
          <Button
            onClick={markWinner}
            className="rounded-none uppercase tracking-[0.15em] text-xs bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
          >
            Nyertesnek jelölés + E-mail küldés
          </Button>
        </div>
      )}

      {emails.length > 0 && (
        <div className="w-full max-w-md">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">
            Összes résztvevő ({emails.length})
          </p>
          <div className="max-h-48 overflow-y-auto bg-secondary border border-border p-3 space-y-1">
            {emails.map((e, i) => (
              <p key={i} className="text-xs text-muted-foreground font-mono">{e}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GiveawayWheel;
