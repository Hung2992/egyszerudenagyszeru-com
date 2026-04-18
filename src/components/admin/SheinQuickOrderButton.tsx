import { Button } from "@/components/ui/button";
import { ShoppingBag, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  buildSheinDeepLink,
  buildClipboardPayload,
  copyToClipboard,
  type SheinDeepLinkInput,
  type ShippingAddress,
} from "@/lib/shein-deeplink";

interface Props {
  product: SheinDeepLinkInput;
  address: ShippingAddress;
  compact?: boolean;
}

const SheinQuickOrderButton = ({ product, address, compact }: Props) => {
  const handleClick = async () => {
    const link = buildSheinDeepLink(product);
    const payload = buildClipboardPayload(product, address);
    const copied = await copyToClipboard(payload);
    if (copied) {
      toast({
        title: "Adatok vágólapra másolva",
        description: "Megnyitom a Shein-t. Illeszd be a címet checkoutnál.",
      });
    } else {
      toast({
        title: "Shein megnyitva",
        description: "A vágólap másolás nem sikerült – kézzel másold a címet.",
        variant: "destructive",
      });
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      size={compact ? "sm" : "default"}
      variant="outline"
      onClick={handleClick}
      className="rounded-none uppercase tracking-wider text-xs gap-1.5"
      title="1-kattintásos Shein rendelés-előkészítő"
    >
      <ShoppingBag className="h-3.5 w-3.5" />
      {compact ? "Shein" : "Rendelés Shein-en"}
      <Copy className="h-3 w-3 opacity-60" />
    </Button>
  );
};

export default SheinQuickOrderButton;
