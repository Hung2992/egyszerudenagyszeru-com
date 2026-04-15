import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/untyped-client";
import { useCart } from "@/contexts/CartContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Package, Clock, Truck, CheckCircle2, XCircle, ChevronDown, ChevronUp, RefreshCw, MapPin, Calendar, FileText, RotateCcw, ExternalLink, ArrowLeftRight } from "lucide-react";
import { sendAppEmail } from "@/lib/app-email";

interface Order {
  id: string;
  status: string;
  total_amount: number;
  shipping_name: string | null;
  shipping_city: string | null;
  payment_method: string | null;
  coupon_code: string | null;
  discount_amount: number | null;
  items: any[];
  created_at: string;
}

interface PackageTracking {
  carrier: string;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  last_update: string | null;
}

interface OrderTrackingEntry {
  id: string;
  status: string;
  location: string | null;
  description: string | null;
  carrier: string | null;
  tracking_number: string | null;
  created_at: string;
}

interface ReturnRequest {
  id: string;
  order_id: string;
  reason: string;
  request_type: string;
  status: string;
  refund_amount: number;
  admin_notes: string | null;
  description: string | null;
  preferred_refund_method: string | null;
  created_at: string;
}

interface ReturnSettings {
  return_deadline_days: number | null;
  return_reasons: string[] | null;
  return_refund_method: string | null;
  return_policy: string | null;
}

interface ReturnEligibility {
  canRequest: boolean;
  daysRemaining: number | null;
}

const STATUS_MAP: Record<string, { label: string; icon: any; color: string }> = {
  awaiting_payment: { label: "Fizetésre vár", icon: Clock, color: "text-amber-500" },
  pending: { label: "Feldolgozás alatt", icon: Clock, color: "text-yellow-500" },
  confirmed: { label: "Fizetés rendben", icon: CheckCircle2, color: "text-emerald-500" },
  processing: { label: "Előkészítés", icon: Package, color: "text-blue-400" },
  shipped: { label: "Szállítás alatt", icon: Truck, color: "text-accent" },
  delivered: { label: "Kézbesítve", icon: CheckCircle2, color: "text-green-500" },
  cancelled: { label: "Törölve", icon: XCircle, color: "text-destructive" },
};

const TRACKING_STATUS_MAP: Record<string, string> = {
  preparing: "Előkészítés alatt",
  picked_up: "Átvéve a futár által",
  in_transit: "Szállítás alatt",
  out_for_delivery: "Kiszállítás alatt",
  delivered: "Kézbesítve",
};

const RETURN_REASONS = [
  "Méretprobléma",
  "Nem felel meg a leírásnak",
  "Sérült termék",
  "Rossz terméket kaptam",
  "Meggondoltam magam",
  "Egyéb",
];

const RETURN_TYPE_OPTIONS = [
  { value: "return", label: "Visszaküldés", icon: RotateCcw },
  { value: "exchange", label: "Csere", icon: ArrowLeftRight },
];

const REFUND_METHOD_OPTIONS = [
  { value: "bank_card", label: "Bankkártyára" },
  { value: "cash", label: "Készpénz" },
];

const STEPS = ["awaiting_payment", "pending", "confirmed", "processing", "shipped", "delivered"];

const isMissingRelationError = (error: { code?: string; message?: string } | null | undefined) => {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "PGRST205" || error?.code === "42P01" || message.includes("could not find the table") || message.includes("does not exist");
};

const getSanitizedText = (value: string) => value.trim();

const getReturnEligibility = (orderCreatedAt: string, deadlineDays: number | null | undefined): ReturnEligibility => {
  if (typeof deadlineDays !== "number" || deadlineDays <= 0) {
    return { canRequest: true, daysRemaining: null };
  }

  const orderDate = new Date(orderCreatedAt);
  const today = new Date();
  const diffMs = today.getTime() - orderDate.getTime();
  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, deadlineDays - elapsedDays);

  return {
    canRequest: elapsedDays <= deadlineDays,
    daysRemaining,
  };
};

const Orders = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<Record<string, PackageTracking>>({});
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [showReturnForm, setShowReturnForm] = useState<string | null>(null);
  const [returnType, setReturnType] = useState<"return" | "exchange">("return");
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"bank_card" | "cash">("bank_card");
  const [userId, setUserId] = useState<string | null>(null);
  const [orderTrackingMap, setOrderTrackingMap] = useState<Record<string, OrderTrackingEntry[]>>({});
  const [returnSettings, setReturnSettings] = useState<ReturnSettings | null>(null);

  const fetchOrders = useCallback(async (showErrorToast = true) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    const userEmail = session.user.email?.trim().toLowerCase() || "";

    const orderQueries = [
      supabase.from("orders").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
    ];

    if (userEmail) {
      orderQueries.push(
        supabase.from("orders").select("*").eq("customer_email", userEmail).order("created_at", { ascending: false }) as any
      );
    }

    const [orderResults, trackingRes, returnsRes, orderTrackingRes, settingsRes] = await Promise.all([
      Promise.all(orderQueries),
      (supabase.from("package_tracking" as any) as any).select("*"),
      (supabase.from("return_requests" as any) as any).select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }),
      (supabase.from("order_tracking" as any) as any).select("*").order("created_at", { ascending: true }),
      (supabase.rpc("get_public_store_settings") as any),
    ]);

    const orderErrors = orderResults.map((result: any) => result.error).filter(Boolean);
    if (orderErrors.length > 0) {
      console.error("Orders load failed:", orderErrors);
      if (showErrorToast) {
        toast({ title: "Nem sikerült betölteni a rendeléseket", variant: "destructive" });
      }
      setOrders([]);
    } else {
      const mergedOrders = orderResults
        .flatMap((result: any) => result.data || [])
        .reduce((acc: Order[], current: Order) => {
          if (!acc.some((order) => order.id === current.id)) {
            acc.push(current);
          }
          return acc;
        }, [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(mergedOrders);
    }

    const tMap: Record<string, PackageTracking> = {};
    if (trackingRes.data) {
      trackingRes.data.forEach((t: any) => { tMap[t.order_id] = t; });
    } else if (trackingRes.error && !isMissingRelationError(trackingRes.error)) {
      console.error("Package tracking load failed:", trackingRes.error);
    }
    setTrackingData(tMap);

    if (returnsRes.data) {
      setReturnRequests((returnsRes.data || []) as ReturnRequest[]);
    } else if (returnsRes.error) {
      console.error("Return requests load failed:", returnsRes.error);
      setReturnRequests([]);
    }

    const otMap: Record<string, OrderTrackingEntry[]> = {};
    if (orderTrackingRes.data) {
      orderTrackingRes.data.forEach((t: any) => {
        if (!otMap[t.order_id]) otMap[t.order_id] = [];
        otMap[t.order_id].push(t as OrderTrackingEntry);
      });
    } else if (orderTrackingRes.error && !isMissingRelationError(orderTrackingRes.error)) {
      console.error("Order tracking load failed:", orderTrackingRes.error);
    }
    setOrderTrackingMap(otMap);

    if (settingsRes?.error) {
      console.error("Return settings load failed:", settingsRes.error);
    } else if (settingsRes?.data) {
      const publicSettings = Array.isArray(settingsRes.data) ? settingsRes.data[0] : settingsRes.data;
      setReturnSettings(publicSettings as ReturnSettings);
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const refreshOrders = () => {
      fetchOrders(false);
    };

    const intervalId = window.setInterval(refreshOrders, 10000);
    window.addEventListener("focus", refreshOrders);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOrders);
    };
  }, [fetchOrders]);

  const getStepIndex = (status: string) => STEPS.indexOf(status);

  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      toast({ title: "Nincs újrarendelhető tétel", variant: "destructive" });
      return;
    }
    order.items.forEach((item: any) => {
      addItem({
        productId: item.productId || item.product_id || "unknown",
        name: item.name,
        price: item.price,
        image_url: item.image_url || null,
        size: item.size || "",
        color: item.color || "",
      });
    });
    toast({ title: "Tételek kosárba téve! 🛒", description: `${order.items.length} tétel újra a kosárban.` });
  };

  const submitReturn = async (orderId: string) => {
    const selectedOrder = orders.find((order) => order.id === orderId);
    const sanitizedReason = getSanitizedText(returnReason);
    const sanitizedNotes = getSanitizedText(returnNotes);
    const existingReturn = getReturnForOrder(orderId);

    if (!userId || !sanitizedReason || !selectedOrder) return;

    if (returnSubmitting) return;

    if (selectedOrder.status !== "delivered") {
      toast({ title: "Csak kézbesített rendelésre nyitható kérelem", variant: "destructive" });
      return;
    }

    if (!getReturnEligibility(selectedOrder.created_at, returnSettings?.return_deadline_days).canRequest) {
      toast({ title: "Lejárt a visszaküldési határidő", variant: "destructive" });
      return;
    }

    if (existingReturn) {
      toast({ title: "Ehhez a rendeléshez már tartozik kérelem", variant: "destructive" });
      return;
    }

    if (returnType === "exchange" && !sanitizedNotes) {
      toast({ title: "Cseréhez add meg, mire szeretnéd cserélni", variant: "destructive" });
      return;
    }

    setReturnSubmitting(true);
    const { data: createdReturn, error } = await (supabase.from("return_requests" as any) as any)
      .insert({
        user_id: userId,
        order_id: orderId,
        reason: sanitizedReason,
        request_type: returnType,
        description: sanitizedNotes || null,
        preferred_refund_method: returnType === "return" ? refundMethod : null,
        refund_amount: returnType === "return" ? selectedOrder.total_amount : 0,
      })
      .select("id")
      .single();
    if (error) {
      console.error("Return request error:", error);
      toast({
        title: "Hiba történt",
        description: error.message?.includes("row-level security")
          ? "A visszaküldési jogosultság most hibásan van beállítva a háttérben. Ezt külön javítom."
          : "A visszaküldési kérelem nem sikerült. Kérjük próbáld újra.",
        variant: "destructive"
      });
      setReturnSubmitting(false);
      return;
    }
    toast({
      title: returnType === "exchange" ? "Csere kérelem elküldve! 🔁" : "Visszaküldési kérelem elküldve! 📦",
      description: "Hamarosan feldolgozzuk.",
    });
    // Send return request confirmation email
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await sendAppEmail({
          templateName: "return-request",
          recipientEmail: user.email,
          idempotencyKey: `return-${createdReturn?.id ?? orderId}`,
          templateData: { orderId, reason: sanitizedReason, requestType: returnType },
        });
      }
    } catch (e) {
      console.error("Return request email error:", e);
    }
    setShowReturnForm(null);
    setReturnType("return");
    setReturnReason("");
    setReturnNotes("");
    setRefundMethod("bank_card");
    setReturnSubmitting(false);
    const { data } = await (supabase.from("return_requests" as any) as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setReturnRequests((data || []) as ReturnRequest[]);
  };

  const getReturnForOrder = (orderId: string) => {
    const matchingRequests = returnRequests.filter((request) => request.order_id === orderId);

    if (matchingRequests.length === 0) return undefined;

    return matchingRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };
  const activeReturnReasons = (returnSettings?.return_reasons || []).filter(Boolean);
  const returnReasonOptions = activeReturnReasons.length > 0 ? activeReturnReasons : RETURN_REASONS;
  
  const isReturnFormValid = Boolean(returnReason) && (returnType === "return" || Boolean(getSanitizedText(returnNotes)));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Fiókom</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">Rendeléseim</h1>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 border border-border bg-card">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Még nincsenek rendeléseid</p>
            <Button variant="outline" className="rounded-none uppercase tracking-wider text-xs" onClick={() => navigate("/shop")}>
              Vásárlás
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
              const StatusIcon = status.icon;
              const stepIdx = getStepIndex(order.status);
              const isExpanded = expandedId === order.id;
              const isCancelled = order.status === "cancelled";
              const tracking = trackingData[order.id];
              const existingReturn = getReturnForOrder(order.id);
              const returnEligibility = getReturnEligibility(order.created_at, returnSettings?.return_deadline_days);

              return (
                <div key={order.id} className="border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusIcon className={`h-5 w-5 shrink-0 ${status.color}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          {new Date(order.created_at).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`text-xs font-bold uppercase tracking-wider ${status.color}`}>{status.label}</p>
                        <p className="text-sm font-bold text-accent mt-0.5">{order.total_amount.toLocaleString()} Ft</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-5">
                      {!isCancelled && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            Rendelés nyomkövetés
                          </p>

                          {/* Visual timeline */}
                          <div className="relative mb-4">
                            <div className="flex items-start justify-between relative">
                              {STEPS.map((step, i) => {
                                const s = STATUS_MAP[step];
                                const StepIcon = s.icon;
                                const active = i <= stepIdx;
                                const current = i === stepIdx;
                                return (
                                  <div key={step} className="flex flex-col items-center flex-1 relative z-10">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                      current ? "border-accent bg-accent/10 scale-110" :
                                      active ? "border-accent bg-accent text-accent-foreground" :
                                      "border-border bg-card"
                                    }`}>
                                      <StepIcon className={`h-3.5 w-3.5 ${
                                        current ? "text-accent" :
                                        active ? "text-accent-foreground" :
                                        "text-muted-foreground"
                                      }`} />
                                    </div>
                                    <span className={`text-[8px] uppercase tracking-wider mt-1.5 text-center leading-tight ${
                                      current ? "text-accent font-bold" :
                                      active ? "text-foreground font-medium" :
                                      "text-muted-foreground"
                                    }`}>
                                      {s.label}
                                    </span>
                                    {current && (
                                      <span className="absolute -bottom-4 text-[7px] text-accent font-bold animate-pulse">●</span>
                                    )}
                                  </div>
                                );
                              })}
                              {/* Connecting line */}
                              <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-border -z-0">
                                <div className="h-full bg-accent transition-all" style={{ width: `${Math.max(0, (stepIdx / (STEPS.length - 1)) * 100)}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Tracking details */}
                          <div className="border border-border p-3 space-y-2 text-xs mt-6">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Rendelés dátuma:</span>
                              <span className="text-foreground font-medium">
                                {new Date(order.created_at).toLocaleString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {stepIdx >= 1 && (
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-blue-400" />
                                <span className="text-muted-foreground">Előkészítés:</span>
                                <span className="text-foreground font-medium">Csomagolás alatt</span>
                              </div>
                            )}
                            {stepIdx >= 2 && (
                              <div className="flex items-center gap-2">
                                <Truck className="h-3 w-3 text-accent" />
                                <span className="text-muted-foreground">Szállítás:</span>
                                <span className="text-foreground font-medium">
                                  Útban {order.shipping_city ? `— ${order.shipping_city}` : ""}
                                </span>
                              </div>
                            )}
                            {stepIdx >= 3 && (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span className="text-muted-foreground">Kézbesítve:</span>
                                <span className="text-foreground font-medium">Sikeresen átvéve ✓</span>
                              </div>
                            )}
                            {stepIdx < 3 && (
                              <div className="flex items-center gap-2 border-t border-border pt-2 mt-2">
                                <Clock className="h-3 w-3 text-accent" />
                                <span className="text-accent font-medium">Várható kézbesítés: {
                                  new Date(new Date(order.created_at).getTime() + (3 + (2 - stepIdx)) * 86400000)
                                    .toLocaleDateString("hu-HU", { weekday: "long", month: "long", day: "numeric" })
                                }</span>
                              </div>
                            )}
                          </div>

                          {/* Package tracking (GLS/MPL) */}
                          {tracking && (
                            <div className="border border-accent/20 bg-accent/5 p-3 mt-2 space-y-2 text-xs">
                              <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                                📦 {tracking.carrier} nyomkövetés
                              </p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Állapot:</span>
                                  <span className="font-medium text-foreground">{TRACKING_STATUS_MAP[tracking.status] || tracking.status}</span>
                                </div>
                                {tracking.tracking_number && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Csomagszám:</span>
                                    <span className="font-mono font-bold text-accent">{tracking.tracking_number}</span>
                                  </div>
                                )}
                                {tracking.last_update && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Utolsó frissítés:</span>
                                    <span className="text-foreground">{tracking.last_update}</span>
                                  </div>
                                )}
                              </div>
                              {tracking.tracking_url && (
                                <a
                                  href={tracking.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-accent hover:underline font-medium mt-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Nyomkövetés a {tracking.carrier} oldalán
                                </a>
                              )}
                            </div>
                          )}

                          {/* Detailed order tracking timeline */}
                          {orderTrackingMap[order.id] && orderTrackingMap[order.id].length > 0 && (
                            <div className="border border-border p-3 mt-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                                📍 Részletes nyomkövetés
                              </p>
                              <div className="space-y-0">
                                {orderTrackingMap[order.id].map((entry, idx) => (
                                  <div key={entry.id} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                        idx === orderTrackingMap[order.id].length - 1 ? "bg-accent" : "bg-border"
                                      }`} />
                                      {idx < orderTrackingMap[order.id].length - 1 && (
                                        <div className="w-px h-full min-h-[24px] bg-border" />
                                      )}
                                    </div>
                                    <div className="pb-3 -mt-0.5">
                                      <p className="text-xs font-medium text-foreground">{entry.status}</p>
                                      {entry.location && (
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          <MapPin className="h-2.5 w-2.5" />{entry.location}
                                        </p>
                                      )}
                                      {entry.description && (
                                        <p className="text-[10px] text-muted-foreground">{entry.description}</p>
                                      )}
                                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                                        {new Date(entry.created_at).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tételek</p>
                        <div className="space-y-2">
                          {(order.items || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                              <span className="text-foreground">
                                {item.name} {item.size && `(${item.size})`} {item.color && `/ ${item.color}`} × {item.quantity}
                              </span>
                              <span className="font-semibold text-accent">{(item.price * item.quantity).toLocaleString()} Ft</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {order.shipping_name && (
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Szállítási név</p>
                            <p className="text-foreground font-medium mt-0.5">{order.shipping_name}</p>
                          </div>
                        )}
                        {order.shipping_city && (
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Város</p>
                            <p className="text-foreground font-medium mt-0.5">{order.shipping_city}</p>
                          </div>
                        )}
                        {order.payment_method && (
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Fizetés</p>
                            <p className="text-foreground font-medium mt-0.5 capitalize">{order.payment_method}</p>
                          </div>
                        )}
                        {order.coupon_code && (
                          <div>
                            <p className="text-muted-foreground uppercase tracking-wider text-[10px]">Kupon</p>
                            <p className="text-accent font-bold mt-0.5">{order.coupon_code} (-{order.discount_amount?.toLocaleString()} Ft)</p>
                          </div>
                        )}
                      </div>

                      {/* Return request section */}
                      {order.status === "delivered" && (
                        <div className="border-t border-border pt-4">
                          {existingReturn ? (
                            <div className="border border-border p-3 space-y-2 text-xs">
                              <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                                {existingReturn.request_type === "exchange" ? <ArrowLeftRight className="h-3 w-3 inline mr-1" /> : <RotateCcw className="h-3 w-3 inline mr-1" />}
                                {existingReturn.request_type === "exchange" ? "Csere kérelem" : "Visszaküldési kérelem"}
                                <span className="ml-2 text-accent">#{order.id.slice(0, 8).toUpperCase()}</span>
                              </p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Típus:</span>
                                  <span className="text-foreground">{existingReturn.request_type === "exchange" ? "Csere" : "Visszaküldés"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Ok:</span>
                                  <span className="text-foreground">{existingReturn.reason}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Állapot:</span>
                                  <span className={`font-bold ${
                                    existingReturn.status === "approved" ? "text-green-500" :
                                    existingReturn.status === "completed" ? "text-accent" :
                                    existingReturn.status === "processing" ? "text-blue-400" :
                                    existingReturn.status === "rejected" ? "text-destructive" :
                                    "text-yellow-500"
                                  }`}>
                                    {existingReturn.status === "pending" ? "Elbírálás alatt" :
                                     existingReturn.status === "approved" ? "Jóváhagyva ✓" :
                                     existingReturn.status === "processing" ? "Feldolgozás alatt" :
                                     existingReturn.status === "completed" ? "Befejezve" :
                                     existingReturn.status === "rejected" ? "Elutasítva" : existingReturn.status}
                                  </span>
                                </div>
                                {existingReturn.refund_amount > 0 && (
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Visszatérítés:</span>
                                    <span className="font-bold text-accent">{existingReturn.refund_amount.toLocaleString()} Ft</span>
                                  </div>
                                )}
                                {(existingReturn as any).preferred_refund_method && (
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Visszatérítés módja:</span>
                                    <span className="text-foreground">{(existingReturn as any).preferred_refund_method === "bank_card" ? "Bankkártyára" : "Készpénz"}</span>
                                  </div>
                                )}
                                {existingReturn.description && (
                                  <div>
                                    <span className="text-muted-foreground">Megjegyzés:</span>
                                    <p className="text-foreground mt-0.5">{existingReturn.description}</p>
                                  </div>
                                )}
                                {existingReturn.admin_notes && (
                                  <div>
                                    <span className="text-muted-foreground">Admin megjegyzés:</span>
                                    <p className="text-foreground mt-0.5">{existingReturn.admin_notes}</p>
                                  </div>
                                )}
                              </div>
                              {existingReturn.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-none uppercase tracking-wider text-[10px] mt-2 text-destructive border-destructive/30"
                                  onClick={async () => {
                                    const { error } = await (supabase.from("return_requests" as any) as any).delete().eq("id", existingReturn.id);
                                    if (error) {
                                      toast({ title: "Törlés sikertelen", description: error.message, variant: "destructive" });
                                      return;
                                    }
                                    toast({ title: "Kérelem törölve ✓" });
                                    setReturnRequests(prev => prev.filter(r => r.id !== existingReturn.id));
                                  }}
                                >
                                  <XCircle className="h-3 w-3 mr-1" /> Kérelem visszavonása
                                </Button>
                              )}
                            </div>
                          ) : showReturnForm === order.id ? (
                            <div className="space-y-3">
                              <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                                {returnType === "exchange" ? <ArrowLeftRight className="h-3 w-3 inline mr-1" /> : <RotateCcw className="h-3 w-3 inline mr-1" />}
                                {returnType === "exchange" ? "Csere kérelem" : "Visszaküldési kérelem"}
                                <span className="ml-2 text-accent">#{order.id.slice(0, 8).toUpperCase()}</span>
                              </p>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Kérelem típusa *</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {RETURN_TYPE_OPTIONS.map((option) => {
                                    const OptionIcon = option.icon;
                                    const active = returnType === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        onClick={() => setReturnType(option.value as "return" | "exchange")}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 border text-[10px] uppercase tracking-wider transition-colors ${
                                          active ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                                        }`}
                                      >
                                        <OptionIcon className="h-3 w-3" />
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Kérelem oka *</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {returnReasonOptions.map(r => (
                                    <button
                                      key={r}
                                      onClick={() => setReturnReason(r)}
                                      className={`text-[10px] uppercase tracking-wider px-3 py-1.5 border transition-colors ${
                                        returnReason === r
                                          ? "bg-accent text-accent-foreground font-bold"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="border border-border bg-secondary/30 p-3 text-[10px] uppercase tracking-wider text-muted-foreground space-y-1">
                                {typeof returnSettings?.return_deadline_days === "number" && returnSettings.return_deadline_days > 0 && (
                                  <p>
                                    Visszaküldési időablak: {returnSettings.return_deadline_days} nap
                                    {returnEligibility.daysRemaining !== null ? ` • hátralévő idő: ${returnEligibility.daysRemaining} nap` : ""}
                                  </p>
                                )}
                                <p>
                                  {returnType === "exchange"
                                    ? "Csere kérésnél írd le pontosan, mire szeretnéd cserélni a terméket."
                                    : "Válaszd ki a visszatérítés módját alább."}
                                </p>
                                {returnType === "exchange" && <p>A csere kéréshez a megjegyzés mező kitöltése kötelező.</p>}
                              </div>
                              {returnType === "return" && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Visszatérítés módja *</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {REFUND_METHOD_OPTIONS.map((option) => {
                                      const active = refundMethod === option.value;
                                      return (
                                        <button
                                          key={option.value}
                                          onClick={() => setRefundMethod(option.value as "bank_card" | "cash")}
                                          className={`flex items-center justify-center gap-2 px-3 py-2 border text-[10px] uppercase tracking-wider transition-colors ${
                                            active ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                                          }`}
                                        >
                                          {option.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Megjegyzés (opcionális)</p>
                                <textarea
                                  value={returnNotes}
                                  onChange={e => setReturnNotes(e.target.value)}
                                  className="flex min-h-[50px] w-full border border-input bg-background px-3 py-2 text-xs resize-none"
                                  placeholder={returnType === "exchange" ? "Pl. másik méret / szín / modell..." : "Részletek..."}
                                />
                              </div>
                              {returnSettings?.return_policy && (
                                <div className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
                                  <span className="font-bold uppercase tracking-wider text-[10px] text-foreground">Visszaküldési szabályzat</span>
                                  <p className="mt-1">{returnSettings.return_policy}</p>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="rounded-none uppercase tracking-wider text-[10px] flex-1"
                                  onClick={() => submitReturn(order.id)}
                                  disabled={!isReturnFormValid || returnSubmitting}
                                >
                                  {returnSubmitting ? "Küldés..." : returnType === "exchange" ? "Csere kérelem beküldése" : "Visszaküldés beküldése"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-none uppercase tracking-wider text-[10px]"
                                  onClick={() => { setShowReturnForm(null); setReturnType("return"); setReturnReason(""); setReturnNotes(""); setRefundMethod("bank_card"); }}
                                >
                                  Mégse
                                </Button>
                              </div>
                            </div>
                          ) : !returnEligibility.canRequest ? (
                            <div className="border border-border bg-secondary/30 p-3 text-xs text-muted-foreground space-y-1">
                              <p className="font-bold uppercase tracking-wider text-[10px] text-foreground">Visszaküldési időablak lejárt</p>
                              <p>
                                Ehhez a rendeléshez a {returnSettings?.return_deadline_days ?? 0} napos visszaküldési / csere határidő már lejárt.
                              </p>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-none uppercase tracking-wider text-[10px]"
                              onClick={() => {
                                setShowReturnForm(order.id);
                                setReturnType("return");
                                setReturnReason("");
                                setReturnNotes("");
                                setRefundMethod("bank_card");
                              }}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Visszaküldés / csere
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Reorder & Invoice buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-none uppercase tracking-wider text-xs h-10"
                          onClick={() => handleReorder(order)}
                        >
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Újrarendelés
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 rounded-none uppercase tracking-wider text-xs h-10"
                          onClick={() => {
                            const invoiceContent = [
                              "SZÁMLA",
                              "═".repeat(40),
                              `Rendelés: #${order.id.slice(0, 8).toUpperCase()}`,
                              `Dátum: ${new Date(order.created_at).toLocaleDateString("hu-HU")}`,
                              "",
                              "Tételek:",
                              ...((order.items || []).map((item: any) =>
                                `  ${item.name} ${item.size ? `(${item.size})` : ""} × ${item.quantity} — ${(item.price * item.quantity).toLocaleString()} Ft`
                              )),
                              "",
                              order.coupon_code ? `Kupon: ${order.coupon_code} (-${order.discount_amount?.toLocaleString()} Ft)` : "",
                              `Szállítás: ${order.shipping_name || ""}, ${order.shipping_city || ""}`,
                              `Fizetés: ${order.payment_method || ""}`,
                              "─".repeat(40),
                              `ÖSSZESEN: ${order.total_amount.toLocaleString()} Ft`,
                              "",
                              "Egyszerű de Nagyszerű Webshop",
                            ].filter(Boolean).join("\n");

                            const blob = new Blob([invoiceContent], { type: "text/plain;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `szamla_${order.id.slice(0, 8).toUpperCase()}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast({ title: "Számla letöltve! 📄" });
                          }}
                        >
                          <FileText className="h-3 w-3 mr-2" />
                          Számla
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders;
