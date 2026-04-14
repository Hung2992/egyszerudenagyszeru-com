import { useState } from "react";
import { supabase } from "@/integrations/supabase/untyped-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";

const CONTACT_INFO = [
  { icon: Mail, label: "Email", value: "info@egyszerudenagyszeru.hu" },
  { icon: Phone, label: "Telefon", value: "+36 30 123 4567" },
  { icon: MapPin, label: "Cím", value: "1052 Budapest, Váci utca 10." },
  { icon: Clock, label: "Nyitvatartás", value: "H-P: 9:00 - 17:00" },
];

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Töltsd ki a kötelező mezőket!", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const id = crypto.randomUUID();
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-confirmation",
          recipientEmail: email,
          idempotencyKey: `contact-confirm-${id}`,
          templateData: { name },
        },
      });
      toast({ title: "Üzenet elküldve! ✉️", description: "Hamarosan válaszolunk." });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      toast({ title: "Hiba történt", description: "Próbáld meg később.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-1">Írj nekünk</p>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground">
            Kapcsolat
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
            Kérdésed van a rendeléseddel, méretezéssel vagy bármi mással kapcsolatban? Szívesen segítünk!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Elérhetőségeink
            </h2>
            <div className="space-y-3">
              {CONTACT_INFO.map((item) => (
                <div key={item.label} className="flex items-start gap-3 border border-border bg-card p-4">
                  <item.icon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</p>
                    <p className="text-sm text-foreground mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-4">
              Üzenet küldése
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Név *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Neved" className="rounded-none h-11 text-sm" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@cimed.hu" className="rounded-none h-11 text-sm" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Tárgy</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Miben segíthetünk?" className="rounded-none h-11 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Üzenet *</Label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Írd le a kérdésedet vagy problémádat..."
                  className="flex min-h-[120px] w-full border border-input bg-background px-3 py-2 text-sm resize-none"
                  required
                />
              </div>
              <Button type="submit" className="w-full rounded-none h-12 uppercase tracking-wider text-xs" disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Küldés..." : "Üzenet küldése"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
