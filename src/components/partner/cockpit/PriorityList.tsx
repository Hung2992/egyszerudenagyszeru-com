import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PriorityItem, { type Priority } from "./PriorityItem";

const PriorityList = ({ items, onOpen }: { items: Priority[]; onOpen: (tab: string) => void }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 5);

  return (
    <Card className="rounded-none border-foreground/15 p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Mai prioritások</p>
        {items.length > 5 && (
          <Button variant="ghost" size="sm" className="rounded-none h-7 text-[11px]" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Kevesebb" : `Összes (${items.length})`}
          </Button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Jelenleg nincs beavatkozást igénylő terület.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => <PriorityItem key={p.id} item={p} onOpen={onOpen} />)}
        </div>
      )}
    </Card>
  );
};

export default PriorityList;
