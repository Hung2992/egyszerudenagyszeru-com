import { ReactNode } from "react";

export const H2 = ({ children, id }: { children: ReactNode; id?: string }) => (
  <h2 id={id} className="text-xl md:text-2xl font-bold text-foreground mt-10 mb-4 pb-2 border-b border-border scroll-mt-24">
    {children}
  </h2>
);

export const H3 = ({ children, id }: { children: ReactNode; id?: string }) => (
  <h3 id={id} className="text-base md:text-lg font-bold text-foreground mt-6 mb-3 scroll-mt-24">{children}</h3>
);

export const P = ({ children }: { children: ReactNode }) => (
  <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-4">{children}</p>
);

export const UL = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-5 space-y-2 text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-4 marker:text-accent">{children}</ul>
);

export const OL = ({ children }: { children: ReactNode }) => (
  <ol className="list-decimal pl-5 space-y-2 text-sm md:text-[15px] leading-relaxed text-muted-foreground mb-4 marker:text-accent marker:font-bold">{children}</ol>
);

export const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="text-foreground font-bold">{children}</strong>
);

export const Box = ({ children, variant = "info" }: { children: ReactNode; variant?: "info" | "warn" | "law" }) => {
  const styles = {
    info: "border-accent/40 bg-accent/5",
    warn: "border-destructive/40 bg-destructive/5",
    law: "border-border bg-secondary/40",
  }[variant];
  return (
    <div className={`border-l-4 ${styles} p-4 my-5 text-sm leading-relaxed`}>
      {children}
    </div>
  );
};

export const Definition = ({ term, children }: { term: string; children: ReactNode }) => (
  <div className="border border-border p-4 mb-3 bg-background">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-1">{term}</p>
    <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
  </div>
);
