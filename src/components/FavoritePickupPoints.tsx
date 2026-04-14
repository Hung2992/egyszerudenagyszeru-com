import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { MapPin, Plus, Trash2, Star, X } from "lucide-react";

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  is_default: boolean;
}

interface Props {
  userId: string;
  onSelect?: (point: PickupPoint) => void;
  selectable?: boolean;
}

const FavoritePickupPoints = ({ userId, onSelect, selectable }: Props) => {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPoints = async () => {
    const { data } = await (supabase.from("favorite_pickup_points" as any) as any)
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });
    setPoints((data || []) as PickupPoint[]);
    setLoading(false);
  };

  useEffect(() => { fetchPoints(); }, [userId]);

  const addPoint = async () => {
    if (!name.trim() || !address.trim()) return;
    await (supabase.from("favorite_pickup_points" as any) as any).insert({
      user_id: userId,
      name: name.trim(),
      address: address.trim(),
      city: city.trim() || null,
      postal_code: postalCode.trim() || null,
      is_default: points.length === 0,
    });
    toast({ title: "Átvételi pont mentve! 📍" });
    setName(""); setAddress(""); setCity(""); setPostalCode("");
    setShowForm(false);
    fetchPoints();
  };

  const removePoint = async (id: string) => {
    await (supabase.from("favorite_pickup_points" as any) as any).delete().eq("id", id).eq("user_id", userId);
    toast({ title: "Pont törölve" });
    fetchPoints();
  };

  const setDefault = async (id: string) => {
    // Remove all defaults first
    for (const p of points) {
      if (p.is_default) {
        await (supabase.from("favorite_pickup_points" as any) as any).update({ is_default: false }).eq("id", p.id);
      }
    }
    await (supabase.from("favorite_pickup_points" as any) as any).update({ is_default: true }).eq("id", id);
    toast({ title: "Alapértelmezett pont beállítva ✓" });
    fetchPoints();
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Kedvenc átvételi pontok
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] text-accent hover:text-accent/80 uppercase tracking-wider font-medium flex items-center gap-1"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? "Mégse" : "Új pont"}
        </button>
      </div>

      {showForm && (
        <div className="border border-border p-3 space-y-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Pont neve (pl. GLS Csomagpont)" className="rounded-none h-8 text-xs" />
          <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Cím" className="rounded-none h-8 text-xs" />
          <div className="flex gap-2">
            <Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="Irsz." className="rounded-none h-8 text-xs w-24" />
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Város" className="rounded-none h-8 text-xs flex-1" />
          </div>
          <Button size="sm" className="rounded-none uppercase tracking-wider text-[10px] w-full" onClick={addPoint} disabled={!name.trim() || !address.trim()}>
            Mentés
          </Button>
        </div>
      )}

      {points.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Még nincs mentett átvételi pont.</p>
      ) : (
        <div className="space-y-1.5">
          {points.map(point => (
            <div
              key={point.id}
              className={`border p-2.5 flex items-start gap-2 text-xs transition-colors ${
                point.is_default ? "border-accent bg-accent/5" : "border-border"
              } ${selectable ? "cursor-pointer hover:border-accent/50" : ""}`}
              onClick={() => selectable && onSelect?.(point)}
            >
              <MapPin className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${point.is_default ? "text-accent" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{point.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {point.postal_code && `${point.postal_code} `}{point.city && `${point.city}, `}{point.address}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!point.is_default && (
                  <button onClick={(e) => { e.stopPropagation(); setDefault(point.id); }} className="text-muted-foreground hover:text-accent p-1" title="Alapértelmezett">
                    <Star className="h-3 w-3" />
                  </button>
                )}
                {point.is_default && <Star className="h-3 w-3 text-accent fill-accent" />}
                <button onClick={(e) => { e.stopPropagation(); removePoint(point.id); }} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritePickupPoints;
