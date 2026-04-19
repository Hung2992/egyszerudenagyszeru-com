import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  RefreshCw,
  Send,
  AlertTriangle,
} from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { toast } from "@/hooks/use-toast";

type EmailLog = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

type RangePreset = "24h" | "7d" | "30d" | "custom";

function getStartDate(preset: RangePreset, customStart?: string): Date {
  const now = new Date();
  if (preset === "24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (preset === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (preset === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (preset === "custom" && customStart) return new Date(customStart);
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "sent")
    return (
      <Badge className="bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/20">
        Elküldve
      </Badge>
    );
  if (s === "pending")
    return (
      <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">
        Folyamatban
      </Badge>
    );
  if (s === "dlq" || s === "failed")
    return (
      <Badge className="bg-red-500/15 text-red-500 border-red-500/30">
        Hiba
      </Badge>
    );
  if (s === "suppressed")
    return (
      <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30">
        Letiltva
      </Badge>
    );
  if (s === "rate_limited")
    return (
      <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30">
        Korlátozva
      </Badge>
    );
  return <Badge variant="outline">{status}</Badge>;
}

const TEMPLATE_LABELS: Record<string, string> = {
  "auth_emails": "Auth (jelszó/regisztráció)",
  "welcome": "Üdvözlő",
  "order-confirmation": "Rendelés visszaigazolás",
  "payment-confirmation": "Fizetés visszaigazolás",
  "shipping-notification": "Szállítási értesítés",
  "delivery-confirmation": "Kiszállítás visszaigazolás",
  "return-request": "Visszaküldés",
  "profile-update": "Profil frissítés",
  "password-changed": "Jelszó megváltozott",
  "coupon-notification": "Kupon értesítés",
  "contact-confirmation": "Kapcsolat-űrlap",
  "giveaway-thanks": "Nyereményjáték köszönet",
  "giveaway-winner": "Nyereményjáték nyertes",
};

function templateLabel(name: string) {
  return TEMPLATE_LABELS[name] || name;
}

export default function AdminEmailMonitoringTab() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);

  const startDate = useMemo(
    () => getStartDate(rangePreset, customStart),
    [rangePreset, customStart]
  );
  const endDate = useMemo(
    () => (rangePreset === "custom" && customEnd ? new Date(customEnd) : new Date()),
    [rangePreset, customEnd]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const seen = new Set<string>();
      const deduped: EmailLog[] = [];
      for (const row of (data as EmailLog[]) || []) {
        const key = row.message_id || row.id;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(row);
      }

      setLogs(deduped);

      const tplSet = new Set<string>();
      deduped.forEach((r) => tplSet.add(r.template_name));
      setTemplates(Array.from(tplSet).sort());
    } catch (e) {
      console.error(e);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni az e-mail logokat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, rangePreset, customStart, customEnd]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (templateFilter !== "all" && l.template_name !== templateFilter)
        return false;
      if (statusFilter !== "all") {
        if (statusFilter === "failed" && !["dlq", "failed"].includes(l.status))
          return false;
        if (statusFilter !== "failed" && l.status !== statusFilter) return false;
      }
      return true;
    });
  }, [logs, templateFilter, statusFilter]);

  const stats = useMemo(() => {
    let sent = 0,
      failed = 0,
      suppressed = 0,
      pending = 0;
    for (const l of filtered) {
      if (l.status === "sent") sent++;
      else if (l.status === "dlq" || l.status === "failed") failed++;
      else if (l.status === "suppressed") suppressed++;
      else if (l.status === "pending") pending++;
    }
    return { total: filtered.length, sent, failed, suppressed, pending };
  }, [filtered]);

  const paginated = useMemo(() => {
    return filtered.slice(page * 50, (page + 1) * 50);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / 50);

  if (adminLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Betöltés...</div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-8 text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-destructive" />
          <h3 className="font-bold mb-2">Hozzáférés megtagadva</h3>
          <p className="text-muted-foreground text-sm">
            Ez a felület csak admin felhasználók számára érhető el.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            E-mail monitoring
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Valós idejű küldési statisztika és hibanapló
          </p>
        </div>
        <Button onClick={loadData} disabled={loading} variant="outline" size="sm">
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Frissítés
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={rangePreset === "24h" ? "default" : "outline"}
              onClick={() => setRangePreset("24h")}
            >
              24 óra
            </Button>
            <Button
              size="sm"
              variant={rangePreset === "7d" ? "default" : "outline"}
              onClick={() => setRangePreset("7d")}
            >
              7 nap
            </Button>
            <Button
              size="sm"
              variant={rangePreset === "30d" ? "default" : "outline"}
              onClick={() => setRangePreset("30d")}
            >
              30 nap
            </Button>
            <Button
              size="sm"
              variant={rangePreset === "custom" ? "default" : "outline"}
              onClick={() => setRangePreset("custom")}
            >
              Egyéni
            </Button>
          </div>

          {rangePreset === "custom" && (
            <div className="flex gap-2 flex-wrap">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-auto"
              />
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-auto"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sablon szűrő" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes sablon</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t} value={t}>
                    {templateLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Státusz szűrő" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Összes státusz</SelectItem>
                <SelectItem value="sent">Elküldve</SelectItem>
                <SelectItem value="pending">Folyamatban</SelectItem>
                <SelectItem value="failed">Hiba</SelectItem>
                <SelectItem value="suppressed">Letiltva</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Összes</span>
              <Send className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-2">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sikeres</span>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold mt-2 text-green-500">
              {stats.sent}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sikertelen</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold mt-2 text-red-500">
              {stats.failed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Letiltva</span>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold mt-2 text-yellow-500">
              {stats.suppressed}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Küldési napló</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Betöltés...
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nincsenek e-mailek a kiválasztott időszakban.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sablon</TableHead>
                      <TableHead>Címzett</TableHead>
                      <TableHead>Státusz</TableHead>
                      <TableHead>Időpont</TableHead>
                      <TableHead>Hiba</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-xs">
                          {templateLabel(log.template_name)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.recipient_email}
                        </TableCell>
                        <TableCell>{statusBadge(log.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("hu-HU", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs text-red-500 max-w-[200px] truncate">
                          {log.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    Oldal {page + 1} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Előző
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Következő
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
